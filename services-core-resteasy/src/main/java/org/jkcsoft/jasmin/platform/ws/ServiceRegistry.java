package org.jkcsoft.jasmin.platform.ws;

import javax.ws.rs.core.UriBuilder;

/**
 * @author Jim Coles
 */
public interface ServiceRegistry {

    UriBuilder getServiceUri(Object key);

    RsServiceInfo getResourceInfo(Object key);

    MethodInfo getMethodInfo(String httpMethod, String ... resourcePath);
}
