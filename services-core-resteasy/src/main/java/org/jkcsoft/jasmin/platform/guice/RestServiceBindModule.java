package org.jkcsoft.jasmin.platform.guice;

import com.google.inject.AbstractModule;
import org.jkcsoft.jasmin.platform.AppInfoProvider;
import org.jkcsoft.jasmin.platform.model.GenericBootstrapConstants;
import org.jkcsoft.jasmin.platform.ws.ServiceRegistryImpl;
import org.jkcsoft.jasmin.platform.ws.ServiceRegistryProvider;
import org.jkcsoft.jasmin.platform.ws.ServiceRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ws.rs.Path;
import java.io.File;
import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.net.URL;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;

public class RestServiceBindModule extends AbstractModule {

    private static final Logger log = LoggerFactory.getLogger(RestServiceBindModule.class);

    private BootConfig bootConfig;

    public RestServiceBindModule(BootConfig bootConfig) {
        this.bootConfig = bootConfig;
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    @Override
    protected void configure() {
//        bindServicesByPackage();
        bindAppFrameworkObjects();
        bindReServicesByDirectList();
    }


    private void bindAppFrameworkObjects() {
        bind(ServiceRegistry.class).to(ServiceRegistryImpl.class);
    }

    public void bindReServicesByDirectList() {

        String[] serviceClassNames = bootConfig.getServiceClasses();
//        String[] serviceClassNames = new String[] {
//            "org.jkcsoft.jasmin.services.user.UserService",
//            "org.jkcsoft.jasmin.services.userdb.UserMongoDbService"
//        };
        for (String className : serviceClassNames) {
            try {
                Class clazz = Class.forName(className);
                if (AppInfoProvider.class.isAssignableFrom(clazz)) {
                    log.info("configured class [{}] is an AppInfo", clazz.getName());
                    try {
                        Class<AppInfoProvider> classAip = (Class<AppInfoProvider>) clazz;
                        AppInfoProvider aip = classAip.getDeclaredConstructor().newInstance();
                        for (Class serviceClass : aip.getServiceClasses()) {
                            bindAndRegister(serviceClass);
                        }
                    }
                    catch (NoSuchMethodException | InstantiationException |
                        IllegalAccessException | InvocationTargetException e) {
                        log.error("AppInfo class [{}] instantiation threw an exception", className, e);
                    }
                }
                if (clazz.isAnnotationPresent(Path.class)) {
                    bindAndRegister(clazz);
                }
                else
                    log.warn("configured RestEasy class [{}] is neither an AppInfo nor has Path annotation", className);
            }
            catch (ClassNotFoundException e) {
                log.error("could not find configured RestEasy service class [{}]", className);
            }
        }
    }

    private void bindAndRegister(Class<Object> clazz) {
        log.info("found RestEasy resource class [{}]", clazz.getName());
        bind(clazz);
        log.info("call guice bind on [{}]", clazz.getName());
        ServiceRegistryProvider.getInstance().getImpl().registerLocalRsWsMethods(clazz);
    }

    /**
     * Couldn't figure easy way to do that without building list at compile-time.
     */
    private void bindAnnotatedClasses() {

    }

    /**
     * This method only works if the package is exploded into the file system ./classes
     * directory.
     */
    private void bindServicesByPackage() {
        String[] pkgs = GenericBootstrapConstants.REST_EASY_REST_PACKAGES.split(",");

        for (String pkg : pkgs) {
//			if(pkg.trim().endsWith(GenericBootstrapConstants.REST_EASY_REST_PACKAGES_SUFFIX)){
            log.info("found RESTful package: {}", pkg.trim());
            Class[] lst = null;
            try {
                lst = getClasses(pkg.trim());
            }
            catch (ClassNotFoundException | IOException e) {
                log.error("{}, {}", e.getClass().getName(), e.getMessage());
                e.printStackTrace();
            }
            for (Class c : lst) {
                if (c.isAnnotationPresent(Path.class)) {
                    log.info("found RestEasy Resource: {}", c.getName());
                    bind(c);
                }
            }
//			}
        }
    }

    /**
     * Scans all classes accessible from the context class loader which belong
     * to the given package and subpackages.
     * @param packageName The base package
     * @return The classes
     * @throws ClassNotFoundException
     * @throws IOException
     */
    @SuppressWarnings({"rawtypes"})
    private Class[] getClasses(String packageName) throws ClassNotFoundException, IOException {
        ClassLoader classLoader = Thread.currentThread().getContextClassLoader();
        assert classLoader != null;
        String path = packageName.replace('.', '/');
        Enumeration<URL> resources = classLoader.getResources(path);
        List<File> dirs = new ArrayList<File>();
        while (resources.hasMoreElements()) {
            URL resource = resources.nextElement();
            dirs.add(new File(resource.getFile()));
        }
        ArrayList<Class> classes = new ArrayList<Class>();
        for (File directory : dirs) {
            classes.addAll(findClasses(directory, packageName));
        }
        return classes.toArray(new Class[classes.size()]);
    }

    /**
     *
     * Recursive method used to find all classes in a given directory and subdirs.
     * @param directory The base directory
     * @param packageName The package name for classes found inside the base directory
     * @return The classes
     * @throws ClassNotFoundException
     */
    @SuppressWarnings("rawtypes")
    private List<Class> findClasses(File directory, String packageName)
        throws ClassNotFoundException
    {
        List<Class> classes = new ArrayList<Class>();
        if (!directory.exists()) {
            return classes;
        }
        File[] files = directory.listFiles();
        for (File file : files) {
            if (file.isDirectory()) {
                assert !file.getName().contains(".");
                classes.addAll(findClasses(file, packageName + "." + file.getName()));
            }
            else if (file.getName().endsWith(".class")) {
                classes.add(Class.forName(
                    packageName + '.' + file.getName().substring(0, file.getName().length() - 6))
                );
            }
        }
        return classes;
    }

}
