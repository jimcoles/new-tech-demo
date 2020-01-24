package org.jkcsoft.services.framework.messages;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 *
 * @author Jim Coles
 */
public class PubSubImpl implements PubSub {

    private Set<Subscription> subscriptions = Collections.synchronizedSet(new HashSet<>());

    @Override
    public void registerEndpoint(EnterpriseAddress endpoint) {
//        subscriptions.add(new )
    }

    @Override
    public void subscribe(EnterpriseAddress recipient, Object selector) {

    }

    @Override
    public void publishMessage(Message message) {

    }

}
