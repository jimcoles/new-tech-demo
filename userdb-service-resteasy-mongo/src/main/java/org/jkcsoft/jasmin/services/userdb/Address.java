package org.jkcsoft.jasmin.services.userdb;

/**
 * @author Jim Coles
 */
public class Address {

    private String addrStreet;
    private String addrCityRegion;
    private String regionCode;

    public Address() {
    }

    public String getAddrStreet() {
        return addrStreet;
    }

    public void setAddrStreet(String addrStreet) {
        this.addrStreet = addrStreet;
    }

    public String getAddrCityRegion() {
        return addrCityRegion;
    }

    public void setAddrCityRegion(String addrCityRegion) {
        this.addrCityRegion = addrCityRegion;
    }

    public String getRegionCode() {
        return regionCode;
    }

    public void setRegionCode(String regionCode) {
        this.regionCode = regionCode;
    }
}
