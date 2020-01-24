package org.jkcsoft.services.framework.ws;

import javax.ws.rs.core.Application;

/**
 * @author Jim Coles
 */
public interface AppInfoProvider {

    /**
     * Used by service init logic to bind all service classes within Guice and
     * register the {@link javax.ws.rs.Path}'s with HTTP request dispatcher.
     * @return All Resteasy providers.
     */
    Class<? extends Application> getApplicationClass();

    Class[] getServiceClasses();

}
