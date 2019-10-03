package org.jkcsoft.jasmin.platform.model;

import com.google.inject.Inject;
import com.google.inject.Injector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Singleton;

/**
 * @author Jim Coles
 */
@Singleton
public class AppHome {

    private static final Logger log = LoggerFactory.getLogger(AppHome.class);

//    private static AppHome instance;
//
//    public static AppHome getInstance() {
//        if (instance == null)
//            instance = new AppHome();
//
//        return instance;
//    }

    private Injector injector;
    private AppConfig appConfig;

    @Inject
    public AppHome(Injector injector, AppConfig appConfig) {
        this.injector = injector;
        this.appConfig = appConfig;
        log.info("init {} {}", injector, appConfig);
    }

    public AppConfig getAppConfig() {
        return appConfig;
    }

    public Injector getInjector() {
        return injector;
    }
}
