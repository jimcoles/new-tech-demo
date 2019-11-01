package org.jkcsoft.jasmin.api;

import com.google.inject.Inject;
import org.jkcsoft.jasmin.platform.ws.MethodInfo;
import org.jkcsoft.jasmin.platform.ws.ServiceRegistry;

import javax.ws.rs.HttpMethod;

/**
 * Various enumerations used by service providers and consumers.
 *
 * @author Jim Coles
 */
public class Services {

    @Inject
    private ServiceRegistry serviceRegistry;

    public final MethodInfo userDbPut;
    public final MethodInfo userDbPost;
    public MethodInfo userDbGet;

    {
        userDbPut = serviceRegistry.getMethodInfo("jasmin", "userdb", HttpMethod.PUT);
        userDbPost = serviceRegistry.getMethodInfo("jasmin", "userdb", HttpMethod.POST);
        userDbGet = serviceRegistry.getMethodInfo("jasmin", "userdb", HttpMethod.GET);
    }
}
