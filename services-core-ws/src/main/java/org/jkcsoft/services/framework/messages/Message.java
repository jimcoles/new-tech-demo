package org.jkcsoft.services.framework.messages;

import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;

/**
 * @author Jim Coles
 */
public interface Message {

    EnterpriseAddress getFromResource();

    EnterpriseAddress getToResource();

    ObjectInputStream getInputStream();

    ObjectOutputStream getOutputStream();

    boolean hasEvent();

    boolean isRequest();

    boolean isResponse();

}
