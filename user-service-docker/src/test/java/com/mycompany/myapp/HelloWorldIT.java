package com.mycompany.myapp;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.File;

import org.junit.Test;

/**
 * Tests the dockerized hello world application. 
 */
public class HelloWorldIT {

    @Test
    public final void testData() {
        
        File dataDir = new File("target");
        final File logFile = new File(dataDir, "hello-world.log");
        final File txtFile = new File(dataDir, "hello-world.txt");
        final File logXml = new File(dataDir, "logback.xml");
        
        assertThat(logFile).exists();
        assertThat(txtFile).exists();
        assertThat(logXml).exists();
        
    }
    
    
}
