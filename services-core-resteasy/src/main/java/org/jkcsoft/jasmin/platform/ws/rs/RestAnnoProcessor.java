package org.jkcsoft.jasmin.platform.ws.rs;

import org.jkcsoft.java.util.JavaHelper;
import org.jkcsoft.java.util.Strings;

import javax.annotation.processing.AbstractProcessor;
import javax.annotation.processing.RoundEnvironment;
import javax.annotation.processing.SupportedAnnotationTypes;
import javax.annotation.processing.SupportedSourceVersion;
import javax.lang.model.SourceVersion;
import javax.lang.model.element.Element;
import javax.lang.model.element.TypeElement;
import java.util.Set;

/**
 * Annotation processor for my XPack set of annotations.
 *
 * @author Jim Coles
 */
@SupportedAnnotationTypes("javax.ws.rs.Path")
@SupportedSourceVersion(SourceVersion.RELEASE_8)
public class RestAnnoProcessor extends AbstractProcessor {

    public RestAnnoProcessor() {
        logMsg("init " + this);
    }

    private void logMsg(String msg) {
        System.out.println(msg);
    }

    /**
     * Compile-time processing of found tags.
     * @param annotations
     * @param roundEnv
     * @return
     */
    @Override
    public boolean process(Set<? extends TypeElement> annotations, RoundEnvironment roundEnv) {
        logMsg("process called ");
        for (TypeElement anno : annotations) {
            Set<? extends Element> taggedElems = roundEnv.getElementsAnnotatedWith(anno);
            logMsg("tagged: " + JavaHelper.EOL + Strings.buildNewlineList(taggedElems));
            for (Element taggedElem : taggedElems) {
                logMsg("handling: " + taggedElem);
            }
        }
        return true;
    }

}
