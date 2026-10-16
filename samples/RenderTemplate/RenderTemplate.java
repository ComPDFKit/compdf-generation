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

public class RenderTemplate {
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
        html2pdfRenderTemplate(rootDir);
        html2pdfRenderTemplateToPath(rootDir);
        html2pdfRenderTemplateFileToFile(rootDir);
        html2pdfRenderTemplateStreamToStream(rootDir);
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

    private static void html2pdfRenderTemplate(String rootPath) {
        printDividingLine();
        System.out.println("Sample 1 : html2pdfRenderTemplate");

        String templatePath = rootPath + "/TestFiles/template_1.html";
        String jsonPath = rootPath + "/TestFiles/json/data1.json";

        String htmlContent = CHtmlConverter.HtmlStrRenderTemplate(getFileContent(templatePath), getFileContent(jsonPath));

        System.out.println("RenderTemplate generete html:");
        System.out.println(htmlContent);
        printDividingLine();
    }

    private static void html2pdfRenderTemplateToPath(String rootPath) {
        printDividingLine();
        System.out.println("Sample 2 : html2pdfRenderTemplateToPath");

        String templatePath = rootPath + "/TestFiles/template_1.html";
        String jsonPath = rootPath + "/TestFiles/json/data1.json";
        String outHtmlPath = rootPath + "/out/html2pdfRenderTemplateToPath.html";

        CHtmlConverter.CErrorCode id = CHtmlConverter.HtmlRenderTemplate(templatePath, jsonPath, outHtmlPath);
        System.out.println("Done. errorcode="+id);
        printDividingLine();
    }

    private static void html2pdfRenderTemplateFileToFile(String rootPath) {
        printDividingLine();
        System.out.println("Sample 3 : html2pdfRenderTemplateFileToFile");

        String templatePath = rootPath + "/TestFiles/template_1.html";
        String jsonPath = rootPath + "/TestFiles/json/data1.json";
        String outHtmlPath = rootPath + "/out/html2pdfRenderTemplateFileToFile.html";
        try {
            File htmlIn = new File(templatePath);
            File jsonIn = new File(jsonPath);
            File out = new File(outHtmlPath);
            CHtmlConverter.CErrorCode id = CHtmlConverter.HtmlRenderTemplate(htmlIn, jsonIn, out);
            System.out.println("Done. errorcode="+id);
        } catch (Exception e) {

        }
        printDividingLine();
    }

    private static void html2pdfRenderTemplateStreamToStream(String rootPath) {
        printDividingLine();
        System.out.println("Sample 4 : html2pdfRenderTemplateStreamToStream");

        String templatePath = rootPath + "/TestFiles/template_1.html";
        String jsonPath = rootPath + "/TestFiles/json/data1.json";
        String outHtmlPath = rootPath + "/out/html2pdfRenderTemplateStreamToStream.html";
        try {
            InputStream htmlIn = new FileInputStream(templatePath);
            InputStream jsonIn = new FileInputStream(jsonPath);
            OutputStream out = new FileOutputStream(outHtmlPath);
            CHtmlConverter.CErrorCode id = CHtmlConverter.HtmlRenderTemplate(htmlIn, jsonIn, out);
            System.out.println("Done. errorcode="+id);
        } catch (Exception e) {

        }
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
