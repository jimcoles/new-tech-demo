package org.jkcsoft.jasmin.services.userdb;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.bson.Document;

/**
 * @author Jim Coles
 */
public class UserPojoBsonTrans {
    private ObjectMapper jacksonMapper;

    public Document pojoToBson(User user) {
        Document bsonDoc = null;
        try {
            // TODO Avoid cost of converting to string and parse by going
            // directly from Pojo to java.util.Map or jackson doc
            bsonDoc = Document.parse(jacksonMapper.writeValueAsString(user));
        }
        catch (JsonProcessingException e) {
            e.printStackTrace();
        }
        return bsonDoc;
    }

}
