package org.jkcsoft.jasmin.app;

import org.jkcsoft.jasmin.JasminApp;
import org.jkcsoft.services.framework.ws.AppInfoProvider;
import org.jkcsoft.jasmin.services.user.UserService;
import org.jkcsoft.jasmin.services.userdb.UserMongoDbService;

import javax.ws.rs.core.Application;

/**
 * @author Jim Coles
 */
public class DemoAppInfoProvider implements AppInfoProvider {

    @Override
    public Class<? extends Application> getApplicationClass() {
        return JasminApp.class;
    }

    @Override
    public Class[] getServiceClasses() {
        return new Class[] {
            UserService.class,
            UserMongoDbService.class
        };
    }
}
