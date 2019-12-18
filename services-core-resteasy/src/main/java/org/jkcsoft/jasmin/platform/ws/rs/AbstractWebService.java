package org.jkcsoft.jasmin.platform.ws.rs;

import org.jkcsoft.jasmin.platform.ws.Endpoint;
import org.jkcsoft.jasmin.platform.ws.ServiceRegistry;

import javax.annotation.PostConstruct;
import javax.enterprise.context.RequestScoped;
import javax.enterprise.inject.Instance;
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

    private Instance<ServiceRegistry> registrySource;
    private ServiceRegistry serviceRegistry;
    private HttpServletRequest request;
    private HttpServletResponse response;

    public AbstractWebService() {

    }

    public AbstractWebService(HttpServletRequest request, HttpServletResponse response)
    {
        this.request = request;
        this.response = response;
    }

    @PostConstruct
    public void postConstruct() {

    }
    @Inject
    void setRegistrySource(Instance<ServiceRegistry> registrySource) {
        this.registrySource = registrySource;
    }

    public ServiceRegistry getServiceRegistry() {
        if (serviceRegistry == null)
            serviceRegistry = registrySource.get();
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
