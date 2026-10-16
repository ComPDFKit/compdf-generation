# Email conversion sample

Use a newly built Java SDK and native library containing Email API V1.

From the SDK project directory:

    bash samples/EmailConvertTest/RunTest.sh
    bash samples/EmailConvertTest/RunContractTests.sh

The example reads fixed EML/MSG files directly from samples/TestFiles/email. It writes a new samples/out/email-example-* directory each time because the API does not overwrite existing output files. The example uses the same evaluation-license initialization as the existing samples; configure your own license for production.

EmailConvertTest.java demonstrates HTML parsing/export, metadata and attachments, PDF page margins/header/footer, MSG conversion, and caller-owned streams. See docs/email_to_pdf_java_api.md for overloads, lifecycle, limits, status codes and thread constraints.

RunContractTests.sh starts separate unlicensed and licensed JVMs and enables -Xcheck:jni. It covers input/metadata ownership, errors, cancellation/reentry, cross-thread use, repeated close, output retries and unchanged caller properties. On Linux it uses a UTF-8 locale (C.UTF-8 by default; EMAIL_TEST_LOCALE can select another installed UTF-8 locale).

EmailCorpusTest.java is an optional external-corpus harness. Compile it with EmailConvertTest.java and run it with two arguments: a UTF-8 TSV manifest and a new output directory. The five TSV columns are ID, format, expected HTML status, reference page count, and an absolute input file path. Reference page counts are retained for independent PDF inspection; they are not asserted by Java. Each email is checked through file, byte-array and stream inputs. Keep downloaded private fixtures and generated reports outside tracked sample data.
