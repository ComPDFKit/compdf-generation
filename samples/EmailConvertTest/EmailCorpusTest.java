import CPDFGeneration.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/** Optional external-corpus check. Manifest columns: id, kind, HTML status, pages, local file. */
public class EmailCorpusTest {
    public static void main(String[] args) throws Exception {
        EmailConvertTest.initializeSdk();
        Path manifest=Paths.get(args[0]), output=Paths.get(args[1]);
        Files.createDirectories(output);
        int accepted=0, rejected=0, mismatches=0;
        try(BufferedWriter report=Files.newBufferedWriter(output.resolve("results.tsv"),StandardCharsets.UTF_8)) {
            report.write("id\texpected_html\tactual_pdf\tresources\tattachments\thtml_bytes\tseconds\tconsistent_inputs\tdiagnostics\n");
            for(String line:Files.readAllLines(manifest,StandardCharsets.UTF_8)) {
                if(line.trim().isEmpty()) continue;
                String[] row=line.split("\t",5); String id=row[0];
                if(!id.matches("(eml|msg)-[a-zA-Z0-9_-]+")) throw new IllegalArgumentException("Invalid corpus ID");
                int expected=Integer.parseInt(row[2]); Path input=Paths.get(row[4]); Path pdf=output.resolve(id+".pdf");
                byte[] data=Files.readAllBytes(input); long start=System.nanoTime();
                try(CEmailResult file=CEmailConverter.ConvertToPdf(input.toFile(),pdf.toFile());
                    CEmailResult memory=CEmailConverter.ConvertToHtml(data);
                    CEmailResult stream=CEmailConverter.ConvertToHtml(new ByteArrayInputStream(data),data.length)) {
                    boolean ok=file.isSuccess();
                    boolean consistent=memory.GetStatus()==stream.GetStatus() && memory.GetHtml().equals(stream.GetHtml())
                            && memory.GetHtml().equals(file.GetHtml()) && ok==memory.isSuccess();
                    if(ok) accepted++; else rejected++;
                    boolean expectation=ok==(expected>=0) && (ok || !Files.exists(pdf));
                    if(!expectation || !consistent) mismatches++;
                    List<String> codes=new ArrayList<>();
                    for(int i=0;i<file.GetDiagnosticCount();i++) codes.add(file.GetDiagnostic(i).code);
                    int status=file.GetStatus().id,resources=file.GetResourceCount(),attachments=file.GetAttachmentCount();
                    int htmlBytes=file.GetHtml().getBytes(StandardCharsets.UTF_8).length;
                    double elapsed=(System.nanoTime()-start)/1e9;
                    report.write(String.format(Locale.ROOT,"%s\t%d\t%d\t%d\t%d\t%d\t%.6f\t%b\t%s\n",
                            id,expected,status,resources,attachments,htmlBytes,elapsed,consistent,String.join(",",codes)));
                    report.flush();
                    if(ok && !file.ExportHtml(output.resolve(id+"-html").toString()).isSuccess())
                        throw new AssertionError("HTML export failed: "+id);
                    System.out.println("CORPUS "+id+" status="+status+" consistent="+consistent+" expectation="+expectation);
                }
            }
        }
        System.out.println("EMAIL_CORPUS accepted="+accepted+" rejected="+rejected+" mismatches="+mismatches);
        if(mismatches!=0) throw new AssertionError("Corpus discrepancies; inspect results.tsv");
    }
}
