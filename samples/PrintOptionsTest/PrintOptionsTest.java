import CPDFGeneration.CHtmlConverter;
import CPDFGeneration.CHtmlHeaderFooterOptions;
import CPDFGeneration.CConverterProperties;
import CPDFGeneration.internal.Constants;
import CPDFGeneration.internal.NativeComPDF;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.Arrays;

/** Exercises HtmlConverterProperties page margins and header/footer options. */
public class PrintOptionsTest {
    static {
        try {
            NativeComPDF.initialize("1A06FBD4FD404960AC3D374B9BD18B75", "", "ComPDFKit", Constants.LIB_DIR_NAME);
        } catch (FileNotFoundException e) {
            throw new RuntimeException(e);
        }
    }

    public static void main(String[] args) throws Exception {
        String samplesRoot = args.length == 0 ? new File(".").getAbsolutePath() : args[0];
        File output = new File(samplesRoot, "out/print-options.pdf");
        output.getParentFile().mkdirs();

        CConverterProperties properties = new CConverterProperties();
        properties.setPageMargins(36, 48, 54, 60);
        int[] margins = properties.getPageMargins();
        if (!Arrays.equals(margins, new int[] {36, 48, 54, 60})) {
            throw new AssertionError("Unexpected page margins: " + Arrays.toString(margins));
        }

        CHtmlHeaderFooterOptions options = new CHtmlHeaderFooterOptions(
                true,
                "<div style='font-size:10px'>Header {{pageNumber}}</div>",
                "<div style='font-size:10px'>{{title}} - {{date}}</div>",
                samplesRoot,
                "Print options sample",
                "https://example.com/print-options",
                "2026-09-22",
                0,
                0);
        properties.setHeaderFooterOptions(options);
        CHtmlHeaderFooterOptions actual = properties.getHeaderFooterOptions();
        if (!actual.displayHeaderFooter || !options.headerTemplate.equals(actual.headerTemplate)
                || !options.footerTemplate.equals(actual.footerTemplate)
                || !options.title.equals(actual.title)) {
            throw new AssertionError("Header/footer options did not round-trip");
        }

        String html = "<html><head><title>Print options sample</title></head>"
                + "<body><h1>Print options sample</h1><p>Margins and header/footer are enabled.</p>"
                + "<p style='height:900px'>Second page content.</p></body></html>";
        try (OutputStream stream = new FileOutputStream(output)) {
            CHtmlConverter.CErrorCode result = CHtmlConverter.ConvertToPdf(html, stream, properties);
            if (result != CHtmlConverter.CErrorCode.HTML_CONVERTER_SUCCESS) {
                throw new AssertionError("Conversion failed: " + result);
            }
        } finally {
            properties.release();
        }
        System.out.println("PRINT_OPTIONS_SUCCESS " + output.getAbsolutePath());
    }
}
