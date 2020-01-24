package org.jkcsoft.jasmin.platform.guice;

import com.google.inject.Inject;
import com.google.inject.Injector;
import org.jkcsoft.services.framework.ws.AppConfig;
import org.jkcsoft.services.framework.ws.AppHome;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Singleton;

/**
 * @author Jim Coles
 */
@Singleton
public class GuiceAppHome extends AppHome {

    private static final Logger log = LoggerFactory.getLogger(GuiceAppHome.class);

//    private static AppHome instance;
//
//    public static AppHome getInstance() {
//        if (instance == null)
//            instance = new AppHome();
//
//        return instance;
//    }

    private Injector injector;

    @Inject
    public GuiceAppHome(Injector injector, AppConfig appConfig) {
        super(appConfig);
        this.injector = injector;
        log.info("init {} {}", injector, appConfig);
    }

    public Injector getInjector() {
        return injector;
    }
}
