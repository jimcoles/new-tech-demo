package org.jkcsoft.jasmin.test;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jkcsoft.jasmin.services.userdb.UserMongoDbService;
import org.junit.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * @author Jim Coles
 */

public class UserTests {

    private static Logger log = LoggerFactory.getLogger(UserTests.class);

    @Test
    public void testMongoDb() {
        ObjectMapper mapper = new ObjectMapper();
        HttpServletRequest request = null;
        HttpServletResponse response = null;
        UserMongoDbService service = new UserMongoDbService(null);
        service.getStatus();;
        Object retObject = service.getUser("jcoles").getEntity();
        log.info("user: " + retObject);
        try {
            log.info("user JSON: " + mapper.writeValueAsString(retObject));
        }
        catch (JsonProcessingException e) {
            log.error("error writing JSON", e);
        }
        log.info("test complete");
    }
}
