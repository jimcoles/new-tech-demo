package org.jkcsoft.jasmin.platform.guice;

import org.jkcsoft.services.framework.ws.GenericBootstrapConstants;

import java.util.Properties;

/**
 * This config object is used to create the Guice graph but is not available within the
 * graph.
 *
 * @author Jim Coles
 */
public class BootConfig {

    private String[] serviceClasses;

    public BootConfig(Properties bootstrapProperties) {
        String[] classNames = bootstrapProperties.getProperty(GenericBootstrapConstants.REST_EASY_CLASSES).split(",");
        for (int i = 0; i < classNames.length; i++) {
            classNames[i] = classNames[i].trim();
        }
        this.setRestServiceClasses(classNames);
    }

    void setRestServiceClasses(String[] classes) {
        this.serviceClasses = classes;
    }

    public String[] getServiceClasses() {
        return serviceClasses;
    }
}
