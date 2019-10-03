package org.jkcsoft.jasmin.platform.ws;

import com.google.inject.Provider;

/**
 * This first-class factory enables access to the central object from both inside
 * the Guice graph and from outside.
 *
 * @author Jim Coles
 */
public class ServiceRegistryProvider implements Provider<ServiceRegistry> {

    private static ServiceRegistryProvider instance;

    public static ServiceRegistryProvider getInstance() {
        if (instance == null) {
            instance = new ServiceRegistryProvider();
        }
        return instance;
    }

    // =========================================================================

    private ServiceRegistryImpl serviceRegistry = new ServiceRegistryImpl();

    @Override
    public ServiceRegistry get() {
        return serviceRegistry;
    }

    public ServiceRegistryImpl getImpl() {
        return serviceRegistry;
    }

}
