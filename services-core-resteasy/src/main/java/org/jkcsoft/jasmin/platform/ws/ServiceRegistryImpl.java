package org.jkcsoft.jasmin.platform.ws;

import org.jkcsoft.jasmin.platform.utils.AnnoUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.inject.Default;
import javax.ws.rs.Path;
import javax.ws.rs.core.UriBuilder;
import java.lang.reflect.Method;
import java.net.MalformedURLException;
import java.util.HashMap;
import java.util.Map;

/**
 * @author Jim Coles
 */
@Default
public class ServiceRegistryImpl implements ServiceRegistry {

    private static final Logger log = LoggerFactory.getLogger(ServiceRegistryImpl.class);

    public static String getPathValue(Method jMethod) {
        return jMethod.getAnnotation(Path.class).value();
    }

    private Map<String, Endpoint> endpointMap = new HashMap<>(1);
    private Map<String, RsServiceInfo> serviceInfoMap = new HashMap<>();
    private Map<String, MethodInfo> methodInfoMap = new HashMap<>();

    public ServiceRegistryImpl() {
    }

    public void registerLocalRsWsMethods(Class rsWsClazz) {
        registerLocalRsWsMethods(Endpoint.ENDPOINT_LOCALHOST, rsWsClazz);
    }

    public void registerLocalRsWsMethods(Endpoint endpoint, Class rsWsClazz) {
        RsServiceInfo si = buildRsWsServiceInfo(endpoint, rsWsClazz);
        try {
            String classPath = getPathValue(rsWsClazz);
            for (Method jMethod : rsWsClazz.getMethods()) {
                if (AnnoUtil.hasAnno(jMethod, Path.class)) {
                    String methodPath = getPathValue(jMethod);
                }
            }
            serviceInfoMap.put(si.getUri().toURL().toString(), si);
        }
        catch (MalformedURLException e) {
            log.error("very surprised at this exception", e);
        }
    }

    public RsServiceInfo buildRsWsServiceInfo(Endpoint endpoint, Class wsAnnotatedClass) {
        RsServiceInfo rsServiceInfo = new RsServiceInfo(endpoint);
        String resPath = getPathValue(wsAnnotatedClass);
        return rsServiceInfo;
    }

    private String getPathValue(Class wsAnnotatedClass) {
        Path pathAnno = (Path) wsAnnotatedClass.getAnnotation(Path.class);
        return pathAnno.value();
    }

    private RsServiceInfo buildServiceInfo(Class clazz) {
        return null;
    }

    @Override
    public UriBuilder getServiceUri(Object key) {
        RsServiceInfo resourceInfo = serviceInfoMap.get(key);
        return resourceInfo != null ? resourceInfo.getUriBuilder() : null;
    }

    @Override
    public RsServiceInfo getResourceInfo(Object key) {
        return null;
    }

    @Override
    public MethodInfo getMethodInfo(String httpMethod, String ... resourcePath) {
        return null;
    }

}
