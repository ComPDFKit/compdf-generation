import CPDFGeneration.internal.Constants;
import CPDFGeneration.internal.NativeComPDF;
import CPDFGeneration.CHtmlConverter;
import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.util.Base64;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.FileOutputStream;
import java.io.OutputStream;
import CPDFGeneration.CConverterProperties;
import CPDFGeneration.CFontProvider;
import CPDFGeneration.common.CSize;
public class RenderAndConvert {
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
        RenderAndConvertToPdf1(rootDir);
        RenderAndConvertToPdf2(rootDir);
        RenderAndConvertToPdf3(rootDir);
        RenderAndConvertToPdf4(rootDir);
        printFooter();
     }


    private static void RenderAndConvertToPdf1(String rootPath) {
        printDividingLine();
        System.out.println("Sample 1 : RenderAndConvertToPdf1");

        String templatePath = rootPath + "/TestFiles/template_2.html";
        String jsonPath = rootPath + "/TestFiles/json/data1_2.json";
        String outPdfPath1 = rootPath + "/out/RenderAndConvertToPdf1.pdf";
        String outPdfPath2 = rootPath + "/out/RenderAndConvertToPdf2.pdf";
        String baseUri = rootPath + "/TestFiles";

        CConverterProperties properties = new CConverterProperties();
        CSize size = new CSize(400, 600);
        properties.setPageSize(size);
        properties.setBaseUri(baseUri);

        try {
            OutputStream out1 = new FileOutputStream(outPdfPath1);
            OutputStream out2 = new FileOutputStream(outPdfPath2);
            CHtmlConverter.CErrorCode error1 = CHtmlConverter.RenderAndConvertToPdf(getFileContent(templatePath), getFileContent(jsonPath), out1);
            CHtmlConverter.CErrorCode error2 = CHtmlConverter.RenderAndConvertToPdf(getFileContent(templatePath), getFileContent(jsonPath), out2, properties);
            System.out.println("error1="+error1 + " error2="+error2);
        } catch (Exception e) {

        }
        printDividingLine();
    }

    private static void RenderAndConvertToPdf2(String rootPath) {
        printDividingLine();
        System.out.println("Sample 2 : RenderAndConvertToPdf2");

        String templatePath = rootPath + "/TestFiles/template_2.html";
        String jsonPath = rootPath + "/TestFiles/json/data1_2.json";
        String outPdfPath1 = rootPath + "/out/RenderAndConvertToPdf2_1.pdf";
        String outPdfPath2 = rootPath + "/out/RenderAndConvertToPdf2_2.pdf";
        String baseUri = rootPath + "/TestFiles";

        CConverterProperties properties = new CConverterProperties();
        CSize size = new CSize(400, 600);
        properties.setPageSize(size);
        properties.setBaseUri(baseUri);

        try {
            CHtmlConverter.CErrorCode error1 = CHtmlConverter.RenderAndConvertToPdf(new File(templatePath), new File(jsonPath), new File(outPdfPath1));
            CHtmlConverter.CErrorCode error2 = CHtmlConverter.RenderAndConvertToPdf(new File(templatePath), new File(jsonPath), new File(outPdfPath2), properties);
            System.out.println("error1:"+error1 + " error2:"+error2);
        } catch (Exception e) {

        }
        printDividingLine();
    }

    private static void RenderAndConvertToPdf3(String rootPath) {
        printDividingLine();
        System.out.println("Sample 3 : RenderAndConvertToPdf3");

        String templatePath = rootPath + "/TestFiles/template_2.html";
        String jsonPath = rootPath + "/TestFiles/json/data1_2.json";
        String outPdfPath1 = rootPath + "/out/RenderAndConvertToPdf3_1.pdf";
        String outPdfPath2 = rootPath + "/out/RenderAndConvertToPdf3_2.pdf";
        String baseUri = rootPath + "/TestFiles";

        CConverterProperties properties = new CConverterProperties();
        CSize size = new CSize(400, 600);
        properties.setPageSize(size);
        properties.setBaseUri(baseUri);

        try {
            CHtmlConverter.CErrorCode error1 = CHtmlConverter.RenderAndConvertToPdf(new FileInputStream(templatePath), new FileInputStream(jsonPath), new FileOutputStream(outPdfPath1));
            CHtmlConverter.CErrorCode error2 = CHtmlConverter.RenderAndConvertToPdf(new FileInputStream(templatePath), new FileInputStream(jsonPath), new FileOutputStream(outPdfPath2), properties);
            System.out.println("error1:"+error1 + " error2:"+error2);
        } catch (Exception e) {

        }
        printDividingLine();
    }

    private static void RenderAndConvertToPdf4(String rootPath) {
        printDividingLine();
        System.out.println("Sample 4 : RenderAndConvertToPdf4");

        String templatePath = rootPath + "/TestFiles/template_1.html";
        String jsonPath = rootPath + "/TestFiles/json/data1.json";
        String baseUri = rootPath + "/TestFiles";

//        String templatePath = rootPath + "/TestFiles/cer_geccia/templates/cert2565.html";
//        String jsonPath = rootPath + "/TestFiles/cer_geccia/data/data.json";
//        String baseUri = rootPath + "/TestFiles/cer_geccia";

        String outPdfPath1 = rootPath + "/out/RenderAndConvertToPdf4_1.pdf";
        String outPdfPath2 = rootPath + "/out/RenderAndConvertToPdf4_2.pdf";

        CConverterProperties properties = new CConverterProperties();
        CSize size = new CSize(600, 800);
        properties.setPageSize(size);
        properties.setBaseUri(baseUri);
        CFontProvider fontProvider = new CFontProvider();
        //fontProvider.AddDirectory(rootPath + "/TestFiles/cer_geccia/resources/fonts");
        properties.setFontProvider(fontProvider);
        try {
            CHtmlConverter.CErrorCode error1 = CHtmlConverter.RenderAndConvertToPdf(templatePath, jsonPath, outPdfPath1);
            CHtmlConverter.CErrorCode error2 = CHtmlConverter.RenderAndConvertToPdf(templatePath, jsonPath, outPdfPath2, properties);
            System.out.println( "error1:"+error1 + " error2:"+error2);
        } catch (Exception e) {

        }
        printDividingLine();
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
