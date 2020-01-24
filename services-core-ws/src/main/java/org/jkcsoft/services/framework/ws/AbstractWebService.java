package org.jkcsoft.services.framework.ws;

import org.jkcsoft.services.framework.ws.Endpoint;
import org.jkcsoft.services.framework.ws.ServiceRegistry;
import org.slf4j.Logger;

import javax.annotation.PostConstruct;
import javax.enterprise.context.RequestScoped;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.ws.rs.core.UriBuilder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.time.Duration;

/**
 * @author Jim Coles
 */
public class AbstractWebService {

    @Inject private transient Logger log;

//    private Instance<ServiceRegistry> registrySource;
    @Inject private ServiceRegistry serviceRegistry;
    @Inject @RequestScoped private HttpServletRequest request;
    @Inject @RequestScoped private HttpServletResponse response;

    public AbstractWebService() {
        this.getClass();
    }

    public AbstractWebService(HttpServletRequest request, HttpServletResponse response)
    {
        this.request = request;
        this.response = response;
    }

    @PostConstruct
    public void postConstruct() {
        log.info("Service Registry? [{}]", serviceRegistry);
    }
//    @Inject
//    void setRegistrySource(Instance<ServiceRegistry> registrySource) {
//        this.registrySource = registrySource;
//    }

    public ServiceRegistry getServiceRegistry() {
//        if (serviceRegistry == null)
//            serviceRegistry = registrySource.get();
        return serviceRegistry;
    }

    public HttpServletRequest getRequest() {
        return request;
    }

    public HttpServletResponse getResponse() {
        return response;
    }

    protected HttpRequest.Builder getBaseRequestBuilder() {
        return HttpRequest.newBuilder()
                          .timeout(Duration.ofMillis(10000L))
                          .header("Content-Type", "application/json");
    }

    protected UriBuilder getLocalEndpointUriBuilder() {
        return UriBuilder.fromUri(Endpoint.ENDPOINT_LOCALHOST.toUriTemplate());
    }

    protected HttpClient getHttpClient() {
        return HttpClient.newBuilder()
                         .version(HttpClient.Version.HTTP_2)
//                                      .authenticator(Authenticator.requestPasswordAuthentication())
                         .build();
    }
}
