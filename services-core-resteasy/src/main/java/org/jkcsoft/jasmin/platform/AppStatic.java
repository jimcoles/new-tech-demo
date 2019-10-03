package org.jkcsoft.jasmin.platform;

import com.google.inject.Inject;
import com.google.inject.Injector;

/**
 * @author Jim Coles
 */
public class AppStatic {

    private static Injector injector;

    public static Injector getInjector() {
        return injector;
    }

    public static void setInjector(Injector injector) {
        AppStatic.injector = injector;
    }
}
