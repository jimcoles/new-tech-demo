package org.jkcsoft.jasmin.services.userdb;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.MongoClient;
import com.mongodb.MongoCredential;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Updates;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.jkcsoft.jasmin.platform.ws.ServiceRegistry;
import org.jkcsoft.jasmin.platform.ws.rs.AbstractWebService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.RequestScoped;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.Map;

/**
 * Sample Secured RESTful Web Service<br>
 *
 * The constructor has Guice injections to enable also Shiro AOP annotations
 *
 * @author pablo.biagioli
 *
 */
//@RequestScoped
@Path("/userdb")
public class UserMongoDbService extends AbstractWebService {

    private static Logger log = LoggerFactory.getLogger(UserMongoDbService.class);

    private MongoClient mongoClient;
    private MongoDatabase mongoDb;
    private UserPojoBsonTrans bsonTrans;

//    /** JBoss wants a no-arg constructor */
//    public UserMongoDbService() {
//        super(null, null, null);
//    }

    /**
     * NOTE: This form of constructor optional.
     */
    @Inject
    public UserMongoDbService(ServiceRegistry serviceRegistry
//        , HttpServletRequest request, HttpServletResponse response
    )
    {
        super(serviceRegistry, null, null);
        this.bsonTrans = new UserPojoBsonTrans();
    }

    @POST
    @Produces(MediaType.APPLICATION_JSON)
    public Response createUser(User user) {
        log.debug("creating: " + user);

        // Retrieving a collection
        MongoCollection<Document> collection = getUserCollection();

//        // Insert a document
//        Document document = new Document("title", "MongoDB")
//            .append("id", 1)
//            .append("description", "database")
//            .append("likes", 100)
//            .append("url", "http://www.tutorialspoint.com/mongodb/")
//            .append("by", "tutorials point");
//        collection.insertOne(document);

        ObjectMapper mapper = new ObjectMapper();
//        Map<String, Object> jsonMap = new HashMap<>();
        Document bsonUserDoc = bsonTrans.pojoToBson(user);
        collection.insertOne(bsonUserDoc);
        System.out.println("Document inserted successfully");
        return Response.ok(user).build();
    }

    @GET
//    @RequiresPermissions("lightsaber:allowed")
//    @RequiresAuthentication
    @Produces(MediaType.APPLICATION_JSON)
    public Response getUser(String userName) {
        log.debug("in getUser");
        User user = new User();
        ObjectMapper mapper = new ObjectMapper();
        Map<String, Object> returnDataMap = new HashMap<String, Object>();
        Bson filter = userKeyFilter(userName);
        Document mongoUserDoc = getUserCollection().find(filter).iterator().next();
        log.debug("returning: " + user);
        return Response.ok(mongoUserDoc).build();
    }

    @PUT
    @Produces(MediaType.APPLICATION_JSON)
    public Response updateUser(User user) {
        log.debug("putting: " + user);

        // Retrieving a collection
        MongoCollection<Document> collection = getUserCollection();


        ObjectMapper mapper = new ObjectMapper();;
        Map<String, Object> jsonMap = new HashMap<>();
        Document bsonUserDoc = bsonTrans.pojoToBson(user);
        collection.updateOne(userKeyFilter(user.getUserName()), bsonUserDoc);
        System.out.println("Document inserted successfully");
        return Response.ok(user).build();
    }

    private Bson userKeyFilter(String userName) {
        return Filters.eq("userName", userName);
    }

    public void getStatus() {
        getDbConnection();
    }

    private MongoDatabase getDbConnection() {
        if (mongoClient == null) {
            // TODO add credentials to client connection for security
            MongoCredential credential = MongoCredential.createCredential("sampleUser", "myDb",
                                                                          "password".toCharArray());
            mongoClient = new MongoClient("localhost", 27017);

            log.info("Connected to the database server successfully");
        }

        if (mongoDb == null) {
            mongoDb = mongoClient.getDatabase("myDb");
            log.info("connected to User database");
        }

        return mongoDb;
    }

    private MongoCollection<Document> getUserCollection() {
        return getDbConnection().getCollection("User");
    }

    public void updateUser() {
        getUserCollection().updateOne(Filters.eq("id", 1), Updates.set("likes", 150));
        System.out.println("Document update successfully...");

    }

    public static void main(String[] args) {
        UserMongoDbService service = new UserMongoDbService(null);
        service.getDbConnection();
        testLog("successful DB connection test");
    }

    private static void testLog(String s) {
        System.out.println(s);
    }
}