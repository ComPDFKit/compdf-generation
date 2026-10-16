import CPDFGeneration.internal.Constants;
import CPDFGeneration.internal.NativeComPDF;
import CPDFGeneration.CHtmlConverter;
import CPDFGeneration.CConverterProperties;
import CPDFGeneration.CFontProvider;
import CPDFGeneration.common.CSize;
import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.util.Base64;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class ConvertToPdf {
    static{
        try {
            NativeComPDF.initialize("1A06FBD4FD404960AC3D374B9BD18B75","" ,"ComPDFKit",Constants.LIB_DIR_NAME);
        } catch (FileNotFoundException e) {
            throw new RuntimeException(e);
        }
    }

    public static void main(String[] args)  {
        printHead(" html2pdf");
        String rootDir = getRootDir(args);
        html2pdfConvertToStream(rootDir);
        html2pdfConvertToStreamWithProperties(rootDir);
        html2pdfConvertStreamHtmlToStream(rootDir);
        html2pdfConvertFileHtmlToFile(rootDir);
        html2pdfConvertPathToPath(rootDir);
        html2pdfConvertPathToPathProperties(rootDir);
        printFooter();
     }

     private static void  testFile(String rootPath, String content) {
         String filePath =  rootPath + "/out/html2pdfResult.txt";

         try (BufferedWriter writer = new BufferedWriter(new FileWriter(filePath))) {
             writer.write(content);
             System.out.println("write ok " + filePath);
         } catch (IOException e) {
             System.err.println("write fail: " + e.getMessage());
         }
     }

    private static String getFileContent(String path) {
        StringBuilder content = new StringBuilder();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(new FileInputStream(path)))) {
            String line;
            while ((line = br.readLine()) != null) {
                content.append(line).append(System.lineSeparator());
            }
            return content.toString();
        } catch (IOException e) {
            return "";
        }
    }

    private static void html2pdfConvertToStream(String rootPath) {
        printDividingLine();
        System.out.println("Sample 1 : html2pdfConvertToStream");

        String htmlPath = rootPath + "/TestFiles/convert_2.html";
        String outputPdf = rootPath + "/out/html2pdfConvertToStream.pdf";

        System.out.println("htmlPath ="+htmlPath);
        System.out.println("Output path="+outputPdf);

        try {
            OutputStream out = new FileOutputStream(new File(outputPdf));
            CHtmlConverter.CErrorCode id = CHtmlConverter.ConvertToPdf(getFileContent(htmlPath), out);
            System.out.println("Done. errorcode=" + id);
        } catch (Exception e) {

        }
        printDividingLine();
    }

    private static void html2pdfConvertToStreamWithProperties(String rootPath) {
        printDividingLine();
        System.out.println("Sample 1 : html2pdfConvertToStream");

        String htmlPath = rootPath + "/TestFiles/convert_2.html";
        String outputPdf = rootPath + "/out/html2pdfConvertToStreamWithProperties.pdf";
        String baseUrl = rootPath + "/TestFiles/";

        System.out.println("htmlPath ="+htmlPath);
        System.out.println("Output path="+outputPdf);

        CConverterProperties properties = new CConverterProperties();
        CSize size = new CSize(400, 600);
        properties.setPageSize(size);
        properties.setBaseUri(baseUrl);
        CFontProvider fontProvider = new CFontProvider();
        fontProvider.AddSystemFonts();

        try {
            OutputStream out = new FileOutputStream(new File(outputPdf));
            CHtmlConverter.CErrorCode id = CHtmlConverter.ConvertToPdf(getFileContent(htmlPath), out, properties);
            System.out.println("Done. errorcode=" + id);
        } catch (Exception e) {

        }
        printDividingLine();
    }

    private static void html2pdfConvertStreamHtmlToStream(String rootPath) {
        printDividingLine();
        System.out.println("Sample 1 : html2pdfConvertStreamHtmlToStream");

        String htmlPath = rootPath + "/TestFiles/convert_2.html";
        String outputPdf = rootPath + "/out/html2pdfConvertStreamHtmlToStream.pdf";

        System.out.println("htmlPath ="+htmlPath);
        System.out.println("Output path="+outputPdf);

        CConverterProperties properties = new CConverterProperties();
        CSize size = new CSize(400, 400);
        properties.setPageSize(size);
        properties.setBaseUri("dddkkk base uri");

        CFontProvider fontProvider = new CFontProvider();
        properties.setFontProvider(fontProvider);

        try {
            InputStream in = new FileInputStream(htmlPath);
            OutputStream out = new FileOutputStream(new File(outputPdf));
            CHtmlConverter.CErrorCode id = CHtmlConverter.ConvertToPdf(in, out);
            //CHtmlConverter.CErrorCode id = CHtmlConverter.ConvertToPdf(in, out, properties);
            System.out.println("Done. errorcode=" + id);
        } catch (Exception e) {

        }
        printDividingLine();
    }

    private static void html2pdfConvertFileHtmlToFile(String rootPath) {
        printDividingLine();
        System.out.println("Sample 1 : html2pdfConvertFileHtmlToFile");

        String htmlPath = rootPath + "/TestFiles/convert_2.html";
        String outputPdf = rootPath + "/out/html2pdfConvertFileHtmlToFile.pdf";

        System.out.println("htmlPath ="+htmlPath);
        System.out.println("Output path="+outputPdf);

        CConverterProperties properties = new CConverterProperties();
        CSize size = new CSize(400, 400);
        properties.setPageSize(size);
        properties.setBaseUri("dddkkk base uri");

        CFontProvider fontProvider = new CFontProvider();
        properties.setFontProvider(fontProvider);

        try {
            File in = new File(htmlPath);
            File out = new File(outputPdf);
            //CHtmlConverter.CErrorCode id = CHtmlConverter.ConvertToPdf(in, out);
            CHtmlConverter.CErrorCode id = CHtmlConverter.ConvertToPdf(in, out, properties);
            System.out.println("Done. errorcode=" + id);
        } catch (Exception e) {

        }
        printDividingLine();
    }

     private static void html2pdfConvertPathToPath(String rootPath) {
         printDividingLine();
         System.out.println("Sample 1 : html2pdfConvert");

         String htmlPath = rootPath + "/TestFiles/convert_1.html";
         String baseUrl = rootPath + "/TestFiles/";
         String outputPdf = rootPath + "/out/html2pdfConvert.pdf";
         int pageWidth = 842;
         int pageHeight = 596;

         System.out.println("htmlPath ="+htmlPath);
         System.out.println("baseUrl ="+baseUrl);
         System.out.println("Output path="+outputPdf);

         CHtmlConverter.CErrorCode id = CHtmlConverter.ConvertToPdf(htmlPath, outputPdf);
         System.out.println("Done. errorcode="+id);

         printDividingLine();
     }

    private static void html2pdfConvertPathToPathProperties(String rootPath) {
        printDividingLine();
        System.out.println("Sample 2 : html2pdfConvertProperties");

        String htmlPath = rootPath + "/TestFiles/convert_1.html";
        String baseUrl = rootPath + "/TestFiles/";
//        String htmlPath = rootPath + "/TestFiles/cer_geccia/convert_1.html";
//        String baseUrl = rootPath + "/TestFiles/cer_geccia/";
        String outputPdf = rootPath + "/out/html2pdfConvertProperties.pdf";
        int pageWidth = 842;
        int pageHeight = 596;

        System.out.println("htmlPath ="+htmlPath);
        System.out.println("baseUrl ="+baseUrl);
        System.out.println("Output path="+outputPdf);

        CConverterProperties properties = new CConverterProperties();
        CSize size = new CSize(pageWidth, pageHeight);
        properties.setPageSize(size);
        properties.setBaseUri(baseUrl);

        CFontProvider fontProvider = new CFontProvider();
        properties.setFontProvider(fontProvider);

        CHtmlConverter.CErrorCode id = CHtmlConverter.ConvertToPdf(htmlPath, outputPdf, properties);
        System.out.println("Done. errorcode="+id);

        printDividingLine();
    }

    private static void printHead(String name) {
        String head = "Running %s sample";
        String formattedHead = String.format(head, name);
        System.out.println(formattedHead);
    }

    private static void printFooter() {
        String footer = "Done!";
        System.out.println(footer);
        printDividingLine();
    }

    private static void printDividingLine() {
        System.out.println("--------------------------------------------");
    }

    private static String getRootDir(String[] args) {
        String dir;
        if ((args == null) || args.length == 0) {
            dir = System.getProperty("user.dir");
            if (!dir.endsWith("samples")) {
                dir += "/samples";
            }
        } else {
            dir = args[0];
        }
        File file = new File(dir);
        if(!file.exists()){
            throw new RuntimeException("home directory does not exist");
        }
        return file.getAbsolutePath();
    }
}
