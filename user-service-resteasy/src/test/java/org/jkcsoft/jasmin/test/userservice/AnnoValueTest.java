package org.jkcsoft.jasmin.test.userservice;

import org.jkcsoft.jasmin.services.user.UserService;
import org.junit.Test;

import javax.ws.rs.Path;
import java.lang.annotation.Annotation;
import java.text.Format;
import java.util.Formatter;

/**
 * @author Jim Coles
 */
public class AnnoValueTest {

    @Test
    public void getAnnoValue() {
        Class<UserService> userServiceClass = UserService.class;
        Path pathAnno = userServiceClass.getAnnotation(Path.class);
        System.out.println(String.format("here is the anno we got [%s] with value [%s]", pathAnno, pathAnno.value()));
        Class myClass = String.class;
        Path otherPath = (Path) myClass.getAnnotation(Path.class);
    }
}
