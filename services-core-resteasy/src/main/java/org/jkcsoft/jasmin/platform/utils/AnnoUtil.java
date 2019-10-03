package org.jkcsoft.jasmin.platform.utils;

import javax.ws.rs.Path;
import java.lang.annotation.Annotation;
import java.lang.reflect.AccessibleObject;
import java.lang.reflect.Method;

/**
 * @author Jim Coles
 */
public class AnnoUtil {

    public static boolean hasAnno(AccessibleObject clazz, Class<? extends Annotation> annoClass) {
        return clazz.isAnnotationPresent(annoClass);
    }

}
