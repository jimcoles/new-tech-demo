package org.jkcsoft.services.common.logging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.inject.Produces;
import javax.enterprise.inject.spi.InjectionPoint;

/**
 * @author Jim Coles
 */
public class LoggingCdiProducer {
    /**
     * @param injectionPoint
     * @return logger
     */
    @Produces
    public Logger produceLogger(InjectionPoint injectionPoint) {
//        return LoggerFactory.getLogger(injectionPoint.getMember().getDeclaringClass().getName());
        return LoggerFactory.getLogger(injectionPoint.getMember().getDeclaringClass().getDeclaringClass().getName());
    }
}
