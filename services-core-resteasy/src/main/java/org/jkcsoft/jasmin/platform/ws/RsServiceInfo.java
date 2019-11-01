package org.jkcsoft.jasmin.platform.ws;

import javax.ws.rs.core.UriBuilder;
import java.net.URI;

/**
 * @author Jim Coles
 */
public class RsServiceInfo {

    private Endpoint endpoint; // parent notion
    private String resourcePath;
    // lazy init
    private UriBuilder uriBuilder;
    private URI uri;

    RsServiceInfo(Endpoint endpoint) {
        this.endpoint = endpoint;
    }

    public UriBuilder getUriBuilder() {
        // lazy ...
        if (uriBuilder == null)
            uriBuilder = buildUriBuilder();

        return uriBuilder;
    }

    public URI getUri() {
        // lazy ...
        if (uri == null)
            uri = getUriBuilder().build();

        return uri;
    }

    public Endpoint getEndpoint() {
        return endpoint;
    }

    protected UriBuilder buildUriBuilder() {
        return UriBuilder.fromUri(endpoint.toUriTemplate());
    }

}