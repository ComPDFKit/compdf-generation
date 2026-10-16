import CPDFGeneration.*;
import CPDFGeneration.internal.NativeComPDF;
import java.io.*;
import java.nio.file.*;

/** Fixed local EML/MSG examples. Run from the samples directory using RunTest.sh. */
public class EmailConvertTest {
    static void initializeSdk() throws Exception {
        // Same evaluation license and application ID as the existing SDK samples.
        NativeComPDF.initialize("1A06FBD4FD404960AC3D374B9BD18B75", "", "ComPDFKit", "pdfgeneration");
    }
    static void requireSuccess(CEmailStatus status, CEmailResult result) {
        for (int i = 0; i < result.GetDiagnosticCount(); i++) {
            CEmailDiagnostic d = result.GetDiagnostic(i);
            System.out.println("  diagnostic: " + d.code + " / " + d.detail);
        }
        if (!status.isSuccess()) throw new IllegalStateException("Email conversion failed: " + status,
                result.GetLastCallbackException());
    }
    public static void main(String[] args) throws Exception {
        initializeSdk();
        Path input = Paths.get("TestFiles", "email").toAbsolutePath();
        Path outputRoot = Paths.get("out").toAbsolutePath();
        Files.createDirectories(outputRoot);
        // Path outputs are exclusive: use a fresh output directory on each run.
        Path output = Files.createTempDirectory(outputRoot, "email-example-");
        CEmailOptions options = new CEmailOptions();
        CConverterProperties properties = new CConverterProperties();
        try {
            properties.setPageMargins(48, 40, 48, 40);
            CHtmlHeaderFooterOptions hf = new CHtmlHeaderFooterOptions();
            hf.displayHeaderFooter = true;
            hf.headerTemplate = "<div style='font-size:10px;text-align:center;width:100%'>Email conversion example</div>";
            hf.footerTemplate = "<div style='font-size:10px;text-align:center;width:100%'><span class='pageNumber'></span> / <span class='totalPages'></span></div>";
            properties.setHeaderFooterOptions(hf);
            try (CEmailResult result = CEmailConverter.ConvertToHtml(input.resolve("example.eml").toFile(),
                    CEmailFormat.EMAIL_FORMAT_AUTO, options)) {
                requireSuccess(result.GetStatus(), result);
                CEmailBodySource source = result.GetSelectedBodySource();
                System.out.println("EML selected body: " + source.mediaType + " / " + source.origin);
                for (int i = 0; i < result.GetAttachmentCount(); i++) {
                    CEmailAttachment attachment = result.GetAttachment(i);
                    System.out.println("  attachment: " + attachment.displayName + ", bytes=" + attachment.size);
                }
                requireSuccess(result.ExportHtml(output.resolve("html").toFile()), result);
                requireSuccess(result.WritePdf(output.resolve("example.pdf").toFile(), properties), result);
            }
            try (CEmailResult result = CEmailConverter.ConvertToPdf(
                    input.resolve("synthetic_nested.msg").toFile(), output.resolve("nested-message.pdf").toFile())) {
                requireSuccess(result.GetStatus(), result);
                System.out.println("MSG format: " + result.GetFormat() + ", attachments=" + result.GetAttachmentCount());
            }
            byte[] bytes = Files.readAllBytes(input.resolve("example.eml"));
            try (InputStream source = new ByteArrayInputStream(bytes);
                 OutputStream sink = Files.newOutputStream(output.resolve("stream.pdf"));
                 CEmailResult result = CEmailConverter.ConvertToPdf(source, bytes.length, sink)) {
                requireSuccess(result.GetStatus(), result);
                // Streams belong to the caller; this try block closes them.
            }
        } finally { properties.release(); }
        System.out.println("EMAIL_SAMPLE_OUTPUT=" + output);
    }
}
