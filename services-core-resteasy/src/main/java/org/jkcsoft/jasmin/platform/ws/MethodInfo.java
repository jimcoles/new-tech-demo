package org.jkcsoft.jasmin.platform.ws;

import java.util.List;

/**
 * @author Jim Coles
 */
public class MethodInfo {

    private RsServiceInfo rsServiceInfo; // the parent object
    private String httpMethod; // e.g., "GET"
//    private String paramTemplate;
    private List<ParamInfo> params;

    public MethodInfo(RsServiceInfo rsServiceInfo, String httpMethod, String paramTemplate) {
        this.rsServiceInfo = rsServiceInfo;
        this.httpMethod = httpMethod;
    }

    public RsServiceInfo getRsServiceInfo() {
        return rsServiceInfo;
    }

    public String getHttpMethod() {
        return httpMethod;
    }

    public String getParamTemplate() {
        return null;
    }

}
