package org.jkcsoft.jasmin.test;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jkcsoft.jasmin.services.userdb.UserMongoDbService;
import org.junit.Before;
import org.junit.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @author Jim Coles
 */

public class UserTests {

    private static Logger log = LoggerFactory.getLogger(UserTests.class);

    @Test
    public void testMongoDb() {
        ObjectMapper mapper = new ObjectMapper();
        UserMongoDbService service = new UserMongoDbService(null, null, null);
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
