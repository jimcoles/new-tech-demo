package org.jkcsoft.services.framework.messages;

import java.net.URL;
import java.util.UUID;

/**
 * An Enterprise Address analogous to a IP Address but at an enterprise
 * application level. All services and consumers register with a central
 * directory to obtain an Enterprise Address.
 *
 * @author Jim Coles
 */
public interface EnterpriseAddress {

    /** Like a domain name */
    URL getDirectoryName();

    /** Like an IP address. Semi-permanent? */
    UUID getDirectoryId();

}
