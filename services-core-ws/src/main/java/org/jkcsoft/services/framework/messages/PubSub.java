package org.jkcsoft.services.framework.messages;

/**
 * Central internal mechanism for pub/sub of messages of all kinds.
 * May also determine that an message should be published to an
 * remote consumer.
 *
 * @author Jim Coles
 */
public interface PubSub {

    void registerEndpoint(EnterpriseAddress endpoint);

    void subscribe(EnterpriseAddress recipient, Object selector);

    void publishMessage(Message message);

}
