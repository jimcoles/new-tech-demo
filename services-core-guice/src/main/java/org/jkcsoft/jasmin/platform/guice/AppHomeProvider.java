package org.jkcsoft.jasmin.platform.guice;

import com.google.inject.Inject;
import com.google.inject.Injector;
import com.google.inject.Provider;
import org.jkcsoft.jasmin.platform.model.AppHome;

import javax.enterprise.inject.Instance;

/**
 * @author Jim Coles
 */
public class AppHomeProvider implements Provider<AppHome> {

    @Inject
    Instance<AppHome> appHomeSource;

    @Inject
    private Injector appInjector;

    @Override
    public AppHome get() {
//        return AppHome.getInstance();
        //    The get() method of Instance produces a contextual instance of the bean.
        return appHomeSource.get();
    }
}
