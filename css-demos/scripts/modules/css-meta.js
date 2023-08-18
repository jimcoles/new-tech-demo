const css = require('@webref/css');
const { definitionSyntax } = require('css-tree');

const parsedFiles =  css.listAll();
for (const [shortname, data] of Object.entries(parsedFiles)) {
  // do something with the json object

}

for (const [shortname, data] of Object.entries(parsedFiles)) {
  for (const property of data.properties) {
    if (property.value) {
      try {
        const ast = definitionSyntax.parse(property.value);
        // do something with the ast
      }
      catch {
        // one of the few value definitions that cannot yet be parsed by CSSTree
      }
    }
  }
}

function getLengthUnits() {
  let allCssJson = Object.entries(parsedFiles);
  allCssJson[""];
}

// export {getLengthUnits};
module.exports = {getLengthUnits};
