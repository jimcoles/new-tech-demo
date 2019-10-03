package org.jkcsoft.jasmin.services.userjboss;

import javax.json.Json;
import javax.json.JsonObject;
import javax.json.JsonReader;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import java.io.StringReader;
import java.util.List;

/**
 * @author Jim Coles
 */
// @Stateless
@Path("/user")
public class UserJbService {

    @PersistenceContext
    EntityManager em;

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public List<Person> savePerson(Person jsonPerson) {
//        JsonReader reader = Json.createReader(new StringReader(json));
//        JsonObject obj = reader.readObject();
//        String name = obj.getString("name");
//        String surname = obj.getString("surname");
//
//        em.persist(new Person(name, surname));
        em.persist(jsonPerson);
        return getPersonList();
    }

    @POST
    @Path("/users")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public List<Person> getPersonList() {
        Query query = em.createQuery("FROM Person");
        List<Person> customerList = query.getResultList();
        return customerList;
    }

    @GET
//    @Path("/json/{name}")
    @Produces(MediaType.APPLICATION_JSON)
    public List<Person> getPersonByName(@PathParam("name") String name) {
        Query query = em.createQuery("FROM Person where name = :name");
        query.setParameter("name", name);
        List<Person> customerList = query.getResultList();
        return customerList;
    }
}
