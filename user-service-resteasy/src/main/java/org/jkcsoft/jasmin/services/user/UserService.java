package org.jkcsoft.jasmin.services.user;

import com.google.inject.Inject;
import com.google.inject.servlet.RequestScoped;
import org.jkcsoft.jasmin.platform.ws.MethodInfo;
import org.jkcsoft.jasmin.platform.ws.ServiceRegistry;
import org.jkcsoft.jasmin.platform.ws.rs.AbstractWebService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriBuilder;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

/**
 * Sample Secured RESTful Web Service<br>
 *
 * The constructor has Guice injections to enable also Shiro AOP annotations
 *
 * @author pablo.biagioli
 *
 */
@RequestScoped
@Path("/user")
public class UserService extends AbstractWebService {

    private static Logger log = LoggerFactory.getLogger(UserService.class);

    //

    public static final String PARAM_USERNAME = "userName";
    public static final String PATH_USER_DB = "/userdb";
    public static final String ENDPOINT_LOCALHOST = "http://localhost:8080";
//    private UriBuilder userDbUri;
    private MethodInfo userDbPut;
    private MethodInfo userDbPost;
    private MethodInfo userDbGet;

    @Inject
    public UserService(ServiceRegistry serviceRegistry, HttpServletRequest request, HttpServletResponse response) {
        super(serviceRegistry, request, response);
        userDbPut = serviceRegistry.getMethodInfo("jasmin", "userdb", HttpMethod.PUT);
        userDbPost = serviceRegistry.getMethodInfo("jasmin", "userdb", HttpMethod.POST);
        userDbGet = serviceRegistry.getMethodInfo("jasmin", "userdb", HttpMethod.GET);
    }

    @GET
//    @RequiresPermissions("lightsaber:allowed")
//    @RequiresAuthentication
    @Produces(MediaType.APPLICATION_JSON)
    public Response getUser(@QueryParam(PARAM_USERNAME) String userName) {
        log.debug("in getUser with [{}={}]", PARAM_USERNAME, userName);

        // call to UserMondgoDb
        HttpClient client = getHttpClient();

        HttpRequest request = buildUserDbGetRequest(userName);

        client.sendAsync(request, HttpResponse.BodyHandlers.ofString())
              .thenApply(HttpResponse::body)
              .thenAccept(System.out::println)
              .join();

//        client.sendAsync(request, Bod)

        log.debug("returning: ");
        return Response.ok().build();
    }

    private HttpRequest buildUserDbGetRequest(String userName) {
        return getBaseRequestBuilder()
                          .uri(getUserDbUri(userName))
                          .GET()
                          .build();
    }

    private URI getUserDbUri(String userName) {
        UriBuilder uriBuilder = getUserDbUriBuilder();
        uriBuilder.queryParam(PARAM_USERNAME, userName);
        return uriBuilder.build();
    }

    private UriBuilder getUserDbUriBuilder() {
        return getEndpointUriBuilder().path(PATH_USER_DB);
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Path("/user/reference")
    public Response getUserFixed() {
        log.debug("in getUserFixed");
        User user = new User();
        user.setFirstName("Jim");
        user.setLastName("Cocogoopwang");
        {
            Address homeAddress = new Address();
            homeAddress.setAddrStreet("1 Pecos St");
            homeAddress.setAddrCityRegion("Austin");
            homeAddress.setRegionCode("TX");
            user.setHomeAddress(homeAddress);
        }

//        ObjectMapper mapper = new ObjectMapper();
//        Map<String, Object> returnDataMap = new HashMap<String, Object>();

        log.debug("returning: " + user);
        return Response.ok(user).build();
    }

}
