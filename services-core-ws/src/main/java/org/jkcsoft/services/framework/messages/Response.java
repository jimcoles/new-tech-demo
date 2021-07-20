package org.jkcsoft.services.framework.messages;

import java.util.List;

/**
 * @author Jim Coles
 */
public interface Response extends Message {

    List<Error> getErrors();
    Stream getErrorAsStream();
}
