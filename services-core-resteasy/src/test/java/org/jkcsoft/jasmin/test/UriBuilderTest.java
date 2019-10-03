package org.jkcsoft.jasmin.test;

import org.jkcsoft.java.util.Strings;
import org.junit.Test;

import javax.ws.rs.core.UriBuilder;
import java.net.URI;
import java.text.Format;
import java.text.MessageFormat;
import java.util.Formatter;
import java.util.Map;

/**
 * @author Jim Coles
 */
public class UriBuilderTest {

    @Test
    public void testUriBuilder() {
        UriBuilder uriBuilder = UriBuilder.fromUri("http://localhost:8080/user?userNoom={userName}");
        logUri(uriBuilder.build("jcoles"));
        logUri(uriBuilder.buildFromMap(Map.of("userName", "jcoles")));
        //
        uriBuilder = UriBuilder.fromUri("http://localhost:8080/user");
        uriBuilder.queryParam("userName", "jcoles");
        uriBuilder.queryParam("userId", "ABC123");
        logUri(uriBuilder.build());
    }

    private void logUri(URI uri) {
        System.out.println(
            MessageFormat.format("scheme: {0} host: {1} path: {2} query: {3}",
                                 uri.getScheme(), uri.getHost(), uri.getPath(), uri.getQuery())
        );
    }
}
