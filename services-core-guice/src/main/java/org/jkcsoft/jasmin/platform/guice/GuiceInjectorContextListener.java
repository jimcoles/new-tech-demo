package org.jkcsoft.jasmin.platform.guice;

import com.google.inject.Guice;
import com.google.inject.Injector;
import com.google.inject.servlet.GuiceServletContextListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.ServletContextEvent;

/**
 * This class is mapped in web.xml and is used to inject Google Guice's Injector into the
 * Web Application Context.
 *
 * @author pablo.biagioli
 *
 */
public class GuiceInjectorContextListener extends GuiceServletContextListener {

    private static final Logger log = LoggerFactory.getLogger(GuiceInjectorContextListener.class);

//    private Injector injector;
    private GuiceModuleRegistrar seedModule;

    @Override
    protected Injector getInjector() {
        seedModule = new GuiceModuleRegistrar();
        return Guice.createInjector(seedModule);
    }

    @Override
    public void contextInitialized(ServletContextEvent servletContextEvent) {
        super.contextInitialized(servletContextEvent);
        log.info("servlet context initialized.");
//        seedModule.configureServlets();
//        seedModule.installRestServices(injector);
    }

    @Override
    public void contextDestroyed(ServletContextEvent servletContextEvent) {
        super.contextDestroyed(servletContextEvent);
        seedModule.destroy();
    }
}
