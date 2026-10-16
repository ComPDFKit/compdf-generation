import CPDFGeneration.*;
import CPDFGeneration.common.CSize;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

/** Deterministic JNI contract checks; no external test framework required. */
public class EmailApiContractTest {
    private static int checks;
    private static Path fixtures, output;
    private static byte[] eml;
    private interface Checked { void run() throws Exception; }
    private static void check(boolean value, String message) {
        checks++; if (!value) throw new AssertionError(message);
    }
    private static void status(CEmailResult result, CEmailStatus expected) {
        check(result.GetStatus() == expected, "Expected " + expected + ", got " + result.GetStatus());
    }
    private static void success(CEmailResult result) {
        check(result.isSuccess(), "Expected success, got " + result.GetStatus());
    }
    private static void throwsType(Class<? extends Throwable> type, Checked fn) throws Exception {
        try { fn.run(); } catch (Throwable e) {
            check(type.isInstance(e), "Expected " + type + ", got " + e); return;
        }
        throw new AssertionError("Expected exception: " + type);
    }
    private static byte[] utf8(String s) { return s.getBytes(StandardCharsets.UTF_8); }
    private static void pdf(byte[] bytes) {
        check(bytes.length > 100 && new String(bytes, 0, 5, StandardCharsets.US_ASCII).equals("%PDF-"),
                "Expected PDF bytes");
    }
    private static class ReadProbe extends ByteArrayInputStream {
        boolean closed, returnZero = true;
        ReadProbe(byte[] bytes) { super(bytes); }
        @Override public synchronized int read(byte[] b, int off, int len) {
            if (returnZero) { returnZero = false; return 0; }
            return super.read(b, off, Math.min(len, 7));
        }
        @Override public void close() { closed = true; }
    }
    private static class WriteProbe extends ByteArrayOutputStream {
        boolean closed, flushed;
        @Override public void close() { closed = true; }
        @Override public void flush() { flushed = true; }
    }
    private static CEmailAttachment binary(CEmailResult result) {
        for (int i = 0; i < result.GetAttachmentCount(); i++) {
            CEmailAttachment a = result.GetAttachment(i);
            if (a.originalName.endsWith(".bin")) return a;
        }
        throw new AssertionError("Binary attachment missing");
    }
    private static void parsing() throws Exception {
        CEmailOptions defaults = new CEmailOptions();
        check(defaults.flags == 7 && defaults.maxInputBytes == 100L*1024*1024 &&
                defaults.maxDecodedBytes == 256L*1024*1024 && defaults.maxHtmlBytes == 64L*1024*1024, "Defaults");
        CEmailAttachment snapshot; CEmailResource resource; String html;
        CEmailResult result = CEmailConverter.ConvertToHtml(eml);
        try {
            success(result); check(result.GetFormat() == CEmailFormat.EMAIL_FORMAT_EML, "AUTO EML");
            html = result.GetHtml();
            check(html.contains("Email API example") && html.contains("Email conversion test — UTF-8"), "HTML UTF-8");
            check(!html.contains("hidden@example.test"), "Bcc hidden by default");
            snapshot = binary(result);
            check(snapshot.originalName.equals("report-test-😀.bin"), "Metadata standard UTF-8 including emoji");
            check(snapshot.hasData && snapshot.size == 6, "Binary attachment metadata");
            check(Arrays.equals(snapshot.getData(), new byte[]{0,1,2,3,-1,-2}), "Binary data including NUL");
            byte[] copy = snapshot.getData(); copy[0] = 99;
            check(snapshot.getData()[0] == 0, "Attachment defensive copy");
            check(result.GetResourceCount() > 0, "CID resource"); resource = result.GetResource(0);
            check(resource.size > 0 && !resource.mediaType.isEmpty(), "Resource metadata");
            CEmailBodySource body = result.GetSelectedBodySource();
            check(body.status.isSuccess() && body.mediaType.equals("text/html") && !body.sourceId.isEmpty(), "Body provenance");
            throwsType(IndexOutOfBoundsException.class, () -> result.GetResource(-1));
            throwsType(IndexOutOfBoundsException.class, () -> result.GetAttachment(result.GetAttachmentCount()));
            throwsType(IndexOutOfBoundsException.class, () -> result.GetDiagnostic(result.GetDiagnosticCount()));
            CEmailStatus baseline = result.GetStatus();
            Path dir = output.resolve("export-email-😀");
            check(result.ExportHtml(dir.toFile()).isSuccess(), "Export unicode path");
            byte[] index = Files.readAllBytes(dir.resolve("index.html"));
            check(result.ExportHtml(dir.toString()) == CEmailStatus.EMAIL_ERROR_WRITE, "Export refuses existing files");
            check(Arrays.equals(index, Files.readAllBytes(dir.resolve("index.html"))), "Existing export preserved");
            CEmailDiagnostic diagnostic = result.GetDiagnostic(result.GetDiagnosticCount()-1);
            check(diagnostic.isError && !diagnostic.code.isEmpty(), "Write failure diagnostic");
            CEmailStatus error = result.GetStatus(); result.GetSelectedBodySource();
            check(result.GetStatus() == error, "Body query does not change last status");
            check(result.ExportHtml(output.resolve("export-retry").toString()) == baseline, "Export retry resets operation status");
            check(diagnostic.isError && !diagnostic.code.isEmpty(), "Owned diagnostic survives next operation");
        } finally { result.close(); }
        check(result.isClosed(), "Closed state"); result.close(); result.release();
        throwsType(IllegalStateException.class, result::GetHtml);
        throwsType(IllegalStateException.class, result::GetStatus);
        check(snapshot.getData().length == 6 && resource.getData().length > 0 && !html.isEmpty(), "Owned snapshots survive close");
        CEmailOptions flags = new CEmailOptions();
        flags.flags |= CEmailFlags.EMAIL_INCLUDE_BCC | CEmailFlags.EMAIL_INLINE_RESOURCES;
        try (CEmailResult r = CEmailConverter.ConvertToHtml(eml, CEmailFormat.EMAIL_FORMAT_EML, flags)) {
            success(r); check(r.GetHtml().contains("hidden@example.test") && r.GetHtml().contains("data:image/"), "Bcc and inline flags");
        }
        Path unicode = output.resolve("email-😀.msg"); Files.write(unicode, eml);
        try (CEmailResult r = CEmailConverter.ConvertToHtml(unicode.toString())) { success(r); check(r.GetFormat()==CEmailFormat.EMAIL_FORMAT_EML, "AUTO ignores extension"); }
        for (String name : new String[]{"synthetic_ansi.msg","synthetic_nested.msg","synthetic_native_rtf.msg"}) {
            try (CEmailResult r = CEmailConverter.ConvertToHtml(fixtures.resolve(name).toFile())) {
                success(r); check(r.GetFormat()==CEmailFormat.EMAIL_FORMAT_MSG, "AUTO MSG");
                check(r.GetSelectedBodySource().status.isSuccess(), "MSG selected body");
                if (name.contains("nested")) {
                    CEmailAttachment a = r.GetAttachment(0);
                    check(a.nestedMessage && a.hasData, "Embedded MSG snapshot");
                    try (CEmailResult nested = CEmailConverter.ConvertToHtml(a.getData())) { success(nested); }
                }
            }
        }
        ReadProbe source = new ReadProbe(eml);
        try (CEmailResult r = CEmailConverter.ConvertToHtml(source, eml.length)) { success(r); check(!source.closed, "Input borrowed"); }
        try (CEmailResult r = CEmailConverter.ConvertToHtml(new ByteArrayInputStream(eml), eml.length+1)) {
            status(r, CEmailStatus.EMAIL_ERROR_READ); check(r.GetLastCallbackException() instanceof EOFException, "EOF cause retained");
        }
        IOException io = new IOException("read sentinel");
        InputStream broken = new InputStream() { public int read() throws IOException { throw io; } };
        try (CEmailResult r = CEmailConverter.ConvertToHtml(broken, 1)) {
            status(r,CEmailStatus.EMAIL_ERROR_READ); check(r.GetLastCallbackException()==io, "Read exception identity");
        }
        InputStream invalid = new InputStream() { public int read() { return 0; } public int read(byte[] b,int o,int n) { return n+1; } };
        try (CEmailResult r = CEmailConverter.ConvertToHtml(invalid, 1)) {
            status(r,CEmailStatus.EMAIL_ERROR_READ); check(r.GetLastCallbackException() instanceof IOException, "Invalid read count");
        }
    }
    private static void errorsAndCancellation() throws Exception {
        try (CEmailResult r = CEmailConverter.ConvertToHtml((byte[])null)) { status(r,CEmailStatus.EMAIL_ERROR_INVALID_PARAMETER); }
        try (CEmailResult r = CEmailConverter.ConvertToHtml(new byte[0])) { status(r,CEmailStatus.EMAIL_ERROR_INVALID_PARAMETER); }
        try (CEmailResult r = CEmailConverter.ConvertToHtml((String)null)) { status(r,CEmailStatus.EMAIL_ERROR_INVALID_PARAMETER); }
        try (CEmailResult r = CEmailConverter.ConvertToHtml(output.resolve("missing.eml").toString())) { status(r,CEmailStatus.EMAIL_ERROR_READ); }
        try (CEmailResult r = CEmailConverter.ConvertToHtml(new ByteArrayInputStream(eml), -1)) { status(r,CEmailStatus.EMAIL_ERROR_INVALID_PARAMETER); }
        try (CEmailResult r = CEmailConverter.ConvertToHtml((InputStream)null, 1)) { status(r,CEmailStatus.EMAIL_ERROR_INVALID_PARAMETER); }
        try (CEmailResult r = CEmailConverter.ConvertToHtml(eml, null, null)) { status(r,CEmailStatus.EMAIL_ERROR_INVALID_PARAMETER); }
        try (CEmailResult r = CEmailConverter.ConvertToHtml(eml, CEmailFormat.EMAIL_FORMAT_MSG, null)) {
            status(r,CEmailStatus.EMAIL_ERROR_PARSE);
            check(!r.GetSelectedBodySource().status.isSuccess(), "Provenance unavailable after parse failure");
        }
        CEmailOptions unknown = new CEmailOptions(); unknown.flags |= 1<<20;
        try (CEmailResult r = CEmailConverter.ConvertToHtml(eml,CEmailFormat.EMAIL_FORMAT_AUTO,unknown)) { status(r,CEmailStatus.EMAIL_ERROR_INVALID_PARAMETER); }
        for (int limit = 0; limit < 3; limit++) {
            CEmailOptions zero = new CEmailOptions();
            if (limit==0) zero.maxInputBytes=0; else if (limit==1) zero.maxDecodedBytes=0; else zero.maxHtmlBytes=0;
            try (CEmailResult r = CEmailConverter.ConvertToHtml(eml,CEmailFormat.EMAIL_FORMAT_AUTO,zero)) { status(r,CEmailStatus.EMAIL_ERROR_LIMIT); }
        }
        CEmailOptions negative = new CEmailOptions(); negative.maxInputBytes=-1;
        throwsType(IllegalArgumentException.class, () -> CEmailConverter.ConvertToHtml(eml,CEmailFormat.EMAIL_FORMAT_AUTO,negative));
        throwsType(IllegalArgumentException.class, () -> CEmailConverter.ConvertToHtml("bad\0path"));
        CEmailOptions cancel = new CEmailOptions(); cancel.cancellationCallback = () -> true;
        try (CEmailResult r = CEmailConverter.ConvertToHtml(eml,CEmailFormat.EMAIL_FORMAT_AUTO,cancel)) { status(r,CEmailStatus.EMAIL_ERROR_CANCELLED); }
        IllegalStateException exception = new IllegalStateException("cancel sentinel");
        cancel.cancellationCallback = () -> { throw exception; };
        try (CEmailResult r = CEmailConverter.ConvertToHtml(eml,CEmailFormat.EMAIL_FORMAT_AUTO,cancel)) {
            status(r,CEmailStatus.EMAIL_ERROR_CANCELLED); check(r.GetLastCallbackException()==exception, "Cancel cause retained");
        }
        AtomicBoolean stop = new AtomicBoolean(); CEmailOptions snapshot = new CEmailOptions(); snapshot.cancellationCallback=stop::get;
        try (CEmailResult r = CEmailConverter.ConvertToHtml(eml,CEmailFormat.EMAIL_FORMAT_AUTO,snapshot)) {
            success(r); snapshot.cancellationCallback=()->false; snapshot.maxHtmlBytes=0; stop.set(true);
            ExecutorService worker = Executors.newSingleThreadExecutor();
            try {
                check(worker.submit(() -> r.ExportHtml(output.resolve("cancel-cross-thread").toString())).get(30,TimeUnit.SECONDS)==CEmailStatus.EMAIL_ERROR_CANCELLED, "Callback survives option mutation and thread change");
            } finally { worker.shutdown(); }
            stop.set(false); check(r.ExportHtml(output.resolve("after-cancel").toString()).isSuccess(), "Retry after cancellation");
            check(r.GetLastCallbackException()==null, "Cause reset");
        }
        CEmailResult[] holder = new CEmailResult[1]; CEmailOptions reenter = new CEmailOptions();
        reenter.cancellationCallback = () -> { if (holder[0]!=null) holder[0].close(); return false; };
        try (CEmailResult r = CEmailConverter.ConvertToHtml(eml,CEmailFormat.EMAIL_FORMAT_AUTO,reenter)) {
            holder[0]=r;
            check(r.ExportHtml(output.resolve("reentrant-close").toString())==CEmailStatus.EMAIL_ERROR_CANCELLED, "Reentrant close rejected");
            check(r.GetLastCallbackException() instanceof IllegalStateException && !r.isClosed(), "No use after free from callback");
        }
        byte[] malformed = utf8("MIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=x\r\n\r\n--x\r\nContent-Type: text/plain\r\n\r\nRecovered body\r\n");
        try (CEmailResult r = CEmailConverter.ConvertToHtml(malformed)) { status(r,CEmailStatus.EMAIL_ERROR_PARSE); }
        CEmailOptions recover = new CEmailOptions(); recover.flags |= CEmailFlags.EMAIL_RECOVER_EML;
        try (CEmailResult r = CEmailConverter.ConvertToHtml(malformed,CEmailFormat.EMAIL_FORMAT_EML,recover)) {
            status(r,CEmailStatus.EMAIL_SUCCESS_WITH_WARNINGS);
            check(r.GetHtml().contains("Recovered body") && r.GetDiagnosticCount()>0, "Opt-in recovery with diagnostics");
        }
        byte[] damagedAttachment = utf8("MIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=x\r\n\r\n"
                + "--x\r\nContent-Type: text/plain\r\n\r\nIntact body\r\n"
                + "--x\r\nContent-Type: application/octet-stream\r\nContent-Disposition: attachment; filename=broken.bin\r\n"
                + "Content-Transfer-Encoding: base64\r\n\r\n***invalid-base64***\r\n--x--\r\n");
        try (CEmailResult r = CEmailConverter.ConvertToHtml(damagedAttachment)) {
            status(r,CEmailStatus.EMAIL_SUCCESS_WITH_WARNINGS);
            check(r.GetHtml().contains("Intact body") && r.GetAttachmentCount()==1, "Preserve good body and damaged attachment metadata");
            CEmailAttachment a=r.GetAttachment(0);
            check(!a.hasData && a.getData()==null && a.size==0, "Metadata-only attachment snapshot");
        }
    }
    private static void concurrentParse() throws Exception {
        ExecutorService workers=Executors.newFixedThreadPool(4);
        try {
            List<Future<Boolean>> jobs=new ArrayList<>();
            for(int i=0;i<40;i++) jobs.add(workers.submit(() -> {
                try(CEmailResult r=CEmailConverter.ConvertToHtml(eml)) {
                    return r.isSuccess() && r.GetHtml().contains("Email API example") && binary(r).size==6;
                }
            }));
            for(Future<Boolean> job:jobs) check(job.get(30,TimeUnit.SECONDS),"Concurrent independent parse");
        } finally { workers.shutdown(); }
    }
    private static void noLicense() throws Exception {
        WriteProbe sink=new WriteProbe();
        try(CEmailResult r=CEmailConverter.ConvertToPdf(eml,sink)) {
            status(r,CEmailStatus.EMAIL_ERROR_LICENSE);
            check(!r.GetHtml().isEmpty() && binary(r).hasData,"HTML and attachments retained after license failure");
            check(r.GetSelectedBodySource().status.isSuccess(),"Body query succeeds independently of PDF error");
            check(r.ExportHtml(output.resolve("unlicensed-export").toString()).isSuccess(),"Export needs no license");
            Path path=output.resolve("unlicensed.pdf");
            check(r.WritePdf(path.toString())==CEmailStatus.EMAIL_ERROR_LICENSE && !Files.exists(path),"No partial path after license failure");
        }
        check(!sink.closed && !sink.flushed,"No-license stream stays caller owned");
    }
    private static void licensedPdf() throws Exception {
        for(String name:new String[]{"example.eml","synthetic_ansi.msg","synthetic_nested.msg","synthetic_native_rtf.msg"}) {
            Path path=output.resolve(name+".pdf");
            try(CEmailResult r=CEmailConverter.ConvertToPdf(fixtures.resolve(name).toString(),path.toString())) {
                success(r); pdf(Files.readAllBytes(path));
                check(r.GetPdfError().id==0,"Underlying PDF success code");
            }
        }
        try(CEmailResult r=CEmailConverter.ConvertToHtml(eml)) {
            Path existing=output.resolve("existing.pdf"); byte[] sentinel=utf8("preserve me"); Files.write(existing,sentinel);
            check(r.WritePdf(existing.toFile())==CEmailStatus.EMAIL_ERROR_WRITE,"Refuse existing PDF");
            check(Arrays.equals(Files.readAllBytes(existing),sentinel),"Preserve existing PDF bytes");
            check(!r.GetHtml().isEmpty(),"HTML survives PDF path failure");
            IOException expected=new IOException("write sentinel");
            OutputStream broken=new OutputStream(){public void write(int b)throws IOException{throw expected;}};
            check(r.WritePdf(broken)==CEmailStatus.EMAIL_ERROR_WRITE,"Map stream write failure");
            check(r.GetLastCallbackException()==expected,"Write cause identity");
            WriteProbe retry=new WriteProbe(); check(r.WritePdf(retry).isSuccess(),"Retry successful stream PDF");
            pdf(retry.toByteArray()); check(r.GetLastCallbackException()==null,"Write cause reset");
            check(!retry.closed && !retry.flushed,"Output stream borrowed");
            Files.write(output.resolve("retry.pdf"),retry.toByteArray());
            check(r.WritePdf((OutputStream)null)==CEmailStatus.EMAIL_ERROR_INVALID_PARAMETER,"Null output status");
            CConverterProperties p=new CConverterProperties();
            try {
                p.setPageSize(new CSize(612,792)); p.setPageMargins(60,40,50,30); p.setBaseUri("caller-base");
                CHtmlHeaderFooterOptions hf=new CHtmlHeaderFooterOptions(); hf.title="Email properties"; hf.displayHeaderFooter=true;
                hf.headerTemplate="<div style='font-size:10px'>Email custom header</div>"; p.setHeaderFooterOptions(hf);
                check(r.WritePdf(output.resolve("custom.pdf").toFile(),p).isSuccess(),"Borrow properties");
                check(Arrays.equals(p.getPageMargins(),new int[]{60,40,50,30}) && p.getPageSize().Width==612 && p.getPageSize().Height==792,"Dimensions unchanged");
                check(p.getBaseUri().equals("caller-base") && p.getHeaderFooterOptions().title.equals("Email properties"),"Properties remain unchanged");
            } finally { p.release(); p.release(); }
            throwsType(IllegalStateException.class,()->r.WritePdf(new WriteProbe(),p));
            byte[] simple=utf8("Subject: Margin check\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<p style='margin:0'>Margin marker</p>");
            try(CEmailResult margin=CEmailConverter.ConvertToHtml(simple)) {
                check(margin.WritePdf(output.resolve("margin-default.pdf").toString()).isSuccess(),"Default margins");
                CConverterProperties zero=new CConverterProperties();
                try {
                    zero.setPageMargins(0,0,0,0);
                    check(margin.WritePdf(output.resolve("margin-zero.pdf").toString(),zero).isSuccess(),"Explicit zero margins");
                } finally { zero.release(); }
            }
        }
        ReadProbe input=new ReadProbe(eml); WriteProbe sink=new WriteProbe();
        try(CEmailResult r=CEmailConverter.ConvertToPdf(input,eml.length,sink)) {success(r);pdf(sink.toByteArray());}
        check(!input.closed && !sink.closed && !sink.flushed,"One-step stream ownership");
        WriteProbe bytes=new WriteProbe();
        try(CEmailResult r=CEmailConverter.ConvertToPdf(eml,bytes)) {success(r);pdf(bytes.toByteArray());}
    }
    public static void main(String[] args) throws Exception {
        boolean licensed=args[0].equals("licensed");
        Path samples=Paths.get(args[1]).toAbsolutePath(); fixtures=samples.resolve("TestFiles/email");
        Files.createDirectories(samples.resolve("out"));
        output=Files.createTempDirectory(samples.resolve("out"),"email-contract-"+args[0]+"-");
        eml=Files.readAllBytes(fixtures.resolve("example.eml"));
        if(licensed) EmailConvertTest.initializeSdk(); else System.load(Paths.get(args[2]).toAbsolutePath().toString());
        parsing(); errorsAndCancellation(); concurrentParse();
        if(licensed) licensedPdf(); else noLicense();
        System.out.println("EMAIL_CONTRACT_PASS mode="+args[0]+" checks="+checks+" output="+output);
    }
}
