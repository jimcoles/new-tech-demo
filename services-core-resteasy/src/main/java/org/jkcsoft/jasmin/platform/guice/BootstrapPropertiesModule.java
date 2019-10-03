package org.jkcsoft.jasmin.platform.guice;

import com.google.inject.AbstractModule;
import com.google.inject.name.Names;
import org.jkcsoft.jasmin.platform.model.AppConfig;
import org.jkcsoft.jasmin.platform.model.GenericBootstrapConstants;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

/**
 * Guice Module to load Properties file and bind it to Guice Injector.<br>
 * Properties can later be used in constructor or field injection by using: <br> 
 * <code>@Inject @Named("name.of.the.key") private String propValue;</code>
 *
 * NOTE: Not used currently.
 *
 * @author pablo.biagioli
 * @author jcoles
 */
public class BootstrapPropertiesModule extends AbstractModule {

    @Override
    protected void configure() {
        Properties bootstrapProperties = new Properties();
        try {
            InputStream is = getClass().getResourceAsStream("/" + GenericBootstrapConstants.BOOTSTRAP_PROPERTIES_FILE);
            bootstrapProperties.load(is);
            // binds individual properties values to their name/keys for use of @Named injection ...
            Names.bindProperties(binder(), bootstrapProperties);
            //
            binder().bind(AppConfig.class).toInstance(new AppConfig());
        } catch (FileNotFoundException e) {
            System.out.println(
                "The configuration file " + GenericBootstrapConstants.BOOTSTRAP_PROPERTIES_FILE + " can not be found");
        } catch (IOException e) {
            System.out.println("I/O Exception during loading configuration");
        }
    }

}
