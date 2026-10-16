import CPDFGeneration.CHtmlConverter;
import CPDFGeneration.CHtmlHeaderFooterOptions;
import CPDFGeneration.CConverterProperties;
import CPDFGeneration.internal.Constants;
import CPDFGeneration.internal.NativeComPDF;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

/** Converts the fixed family HTML fixture with the documented settings. */
public class FamilyHeaderFooterTest {
    static {
        try {
            NativeComPDF.initialize("1A06FBD4FD404960AC3D374B9BD18B75", "", "ComPDFKit", Constants.LIB_DIR_NAME);
        } catch (FileNotFoundException e) {
            throw new RuntimeException(e);
        }
    }

    public static void main(String[] args) throws Exception {
        File htmlDirectory = new File("TestFiles/family_html").getAbsoluteFile();
        File input = new File(htmlDirectory, "family_all_pages.html");
        File output = new File("out/family-example-header-footer.pdf").getAbsoluteFile();
        System.out.println("Converting " + input.getAbsolutePath() + " to " + output.getAbsolutePath());
        CConverterProperties properties = new CConverterProperties();
        properties.setPageMargins(35, 0, 42, 0);
        CHtmlHeaderFooterOptions options = new CHtmlHeaderFooterOptions(
                true,
                "<div style='width:100%;height:28px;'>"
                        + "<div style='border-top:3px solid #2878d7;width:100%;height:100%;'></div></div>",
                "<div style='width:100%;font-family:DroidSansFallback;font-size:8pt;color:#333;'>"
                        + "<div style='width:100%;text-align:center;white-space:nowrap;'>"
                        + "For reference only. Please refer to the insurer's policy terms. "
                        + "Report date: <span class='date'></span></div>"
                        + "<div style='width:100%;text-align:left;font-size:7.5pt;margin-top:2px;'>"
                        + "Page <span class='pageNumber'></span> of <span class='totalPages'></span></div></div>",
                input.getParentFile().getAbsolutePath(),
                "Family Insurance Policy Review",
                input.toURI().toString(),
                "2026/9/23",
                1,
                1);
        properties.setHeaderFooterOptions(options);

        try {
            output.getParentFile().mkdirs();
            String html = new String(Files.readAllBytes(input.toPath()), StandardCharsets.UTF_8);
            try (FileOutputStream stream = new FileOutputStream(output)) {
                CHtmlConverter.CErrorCode result = CHtmlConverter.ConvertToPdf(html, stream, properties);
                if (result != CHtmlConverter.CErrorCode.HTML_CONVERTER_SUCCESS) {
                    throw new IllegalStateException("HTML to PDF failed: " + result);
                }
            }
            System.out.println("FAMILY_HEADER_FOOTER_SUCCESS " + output.getAbsolutePath());
        } finally {
            properties.release();
        }
    }
}
