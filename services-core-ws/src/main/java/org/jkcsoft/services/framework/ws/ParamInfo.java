package org.jkcsoft.services.framework.ws;

/**
 * @author Jim Coles
 */
public class ParamInfo {

    private MethodInfo methodInfo; // parent notion
    private String name;

    public ParamInfo(MethodInfo methodInfo, String name) {
        this.methodInfo = methodInfo;
        this.name = name;
    }

    public MethodInfo getMethodInfo() {
        return methodInfo;
    }

    public String getName() {
        return name;
    }
}
