package org.jkcsoft.jasmin.platform.guice;

import com.google.inject.Provider;
import org.jkcsoft.jasmin.platform.ws.ServiceRegistry;
import org.jkcsoft.jasmin.platform.ws.ServiceRegistryImpl;

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
