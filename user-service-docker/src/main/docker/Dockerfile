FROM openjdk:8-jre
MAINTAINER mycomp
COPY maven /usr/src/${appname}
VOLUME ["/usr/src/${appname}/data"]
WORKDIR /usr/src/${appname}
CMD ["java","-cp","${project.build.finalName}.${project.packaging}:lib/*","com.mycompany.myapp.HelloWorld"]
