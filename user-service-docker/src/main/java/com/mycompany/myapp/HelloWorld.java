package com.mycompany.myapp;

import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.util.Map;

import org.apache.commons.io.FileUtils;
import org.fuin.ext4logback.LogbackStandalone;
import org.fuin.ext4logback.NewLogConfigFileParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Example program that initializes logging, creates a Logback configuration (if necessary) 
 * and writes the environment variables to a file.
 */
public class HelloWorld {

    private static final Logger LOG = LoggerFactory.getLogger(HelloWorld.class);

    private static void execute(final File resultDir) {
        try {
            final File resultFile = new File(resultDir, "hello-world.txt");

            // Print all environment variables
            final StringBuilder sb = new StringBuilder();
            final Map<String, String> env = System.getenv();
            for (String envName : env.keySet()) {
                sb.append(envName + "=" + env.get(envName) + "\n");
            }

            // Write result to disk
            FileUtils.write(resultFile, sb, Charset.forName("utf-8"));

        } catch (final IOException ex) {
            throw new RuntimeException("Failed to write to result directory", ex);
        }
    }

    public static void main(final String[] args) {

        try {
            final File dataDir = new File("data");
            String[] initArgs = args;
            if (initArgs == null || initArgs.length == 0) {
                initArgs = new String[] { new File(dataDir, "logback.xml").toString() };
            }
            new LogbackStandalone().init(initArgs, new NewLogConfigFileParams(HelloWorld.class.getPackage().getName(), "hello-world"));
            LOG.info("Application running...");
            execute(dataDir);
            System.exit(0);
        } catch (final RuntimeException ex) {
            ex.printStackTrace(System.err);
            System.exit(1);
        }

    }

}
