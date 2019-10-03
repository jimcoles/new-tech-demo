package org.jkcsoft.jasmin.json.bson;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.jsonFormatVisitors.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Uses Jackson mapping to create BSON objects.
 * @author Jim Coles
 */
public class JacksonBsonTrans implements JsonFormatVisitorWrapper {

    public LinkedHashMap toJacksonMap(Object pojo) {
        ObjectMapper mapper = new ObjectMapper();
        try {
            mapper.writeValueAsString(pojo);
            mapper.acceptJsonFormatVisitor(pojo.getClass(), this);
        }
        catch (JsonProcessingException e) {
            e.printStackTrace();
        }
        return null;
    }

    @Override
    public JsonObjectFormatVisitor expectObjectFormat(JavaType javaType) throws JsonMappingException {
        return null;
    }

    @Override
    public JsonArrayFormatVisitor expectArrayFormat(JavaType javaType) throws JsonMappingException {
        return null;
    }

    @Override
    public JsonStringFormatVisitor expectStringFormat(JavaType javaType) throws JsonMappingException {
        return null;
    }

    @Override
    public JsonNumberFormatVisitor expectNumberFormat(JavaType javaType) throws JsonMappingException {
        return null;
    }

    @Override
    public JsonIntegerFormatVisitor expectIntegerFormat(JavaType javaType) throws JsonMappingException {
        return null;
    }

    @Override
    public JsonBooleanFormatVisitor expectBooleanFormat(JavaType javaType) throws JsonMappingException {
        return null;
    }

    @Override
    public JsonNullFormatVisitor expectNullFormat(JavaType javaType) throws JsonMappingException {
        return null;
    }

    @Override
    public JsonAnyFormatVisitor expectAnyFormat(JavaType javaType) throws JsonMappingException {
        return null;
    }

    @Override
    public JsonMapFormatVisitor expectMapFormat(JavaType javaType) throws JsonMappingException {
        return null;
    }

    @Override
    public SerializerProvider getProvider() {
        return null;
    }

    @Override
    public void setProvider(SerializerProvider serializerProvider) {

    }
}
