package org.jkcsoft.jasmin.platform.ws;

import java.net.URI;
import java.net.URL;

/**
 * @author Jim Coles
 */
public class Endpoint {

    public static final Endpoint ENDPOINT_LOCALHOST = new Endpoint("http", "localhost", 8080);

    public static Endpoint local() {
        return ENDPOINT_LOCALHOST;
    }

    private String protocol;
    private String host;
    private int port;

    public Endpoint(String protocol, String host, int port) {
        this.protocol = protocol;
        this.host = host;
        this.port = port;
    }

    public String getProtocol() {
        return protocol;
    }

    public String getHost() {
        return host;
    }

    public int getPort() {
        return port;
    }

    public String toUriTemplate() {
        return protocol + "://" + host + ":" + port;
    }
}
