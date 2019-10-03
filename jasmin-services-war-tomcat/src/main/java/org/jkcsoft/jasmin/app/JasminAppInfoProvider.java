package org.jkcsoft.jasmin.app;

import org.jkcsoft.jasmin.platform.AppInfoProvider;
import org.jkcsoft.jasmin.services.user.UserService;
import org.jkcsoft.jasmin.services.userdb.UserMongoDbService;

/**
 * @author Jim Coles
 */
public class JasminAppInfoProvider implements AppInfoProvider {

    @Override
    public Class[] getServiceClasses() {
        return new Class[] {
            UserService.class,
            UserMongoDbService.class
        };
    }
}
