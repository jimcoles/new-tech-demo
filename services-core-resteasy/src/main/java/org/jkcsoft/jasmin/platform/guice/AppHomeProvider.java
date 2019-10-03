package org.jkcsoft.jasmin.platform.guice;

import com.google.inject.Inject;
import com.google.inject.Injector;
import com.google.inject.Provider;
import org.jkcsoft.jasmin.platform.model.AppHome;

/**
 * @author Jim Coles
 */
public class AppHomeProvider implements Provider<AppHome> {

    @Inject
    private Injector appInjector;

    @Override
    public AppHome get() {
//        return AppHome.getInstance();
        return null;
    }
}
