package org.jkcsoft.jasmin.platform.model;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Inject;
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

    private AppConfig appConfig;

    @Inject
    public AppHome(AppConfig appConfig) {
        this.appConfig = appConfig;
        log.info("init {}", appConfig);
    }

    public AppConfig getAppConfig() {
        return appConfig;
    }

}
