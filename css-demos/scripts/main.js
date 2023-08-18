// import "../assets/jsonpath.js";
document.addEventListener("DOMContentLoaded", init);

let cssValuesEnum;
let cssLengthUnits;

async function init() {
  // upfront async due to use of fetch()
  cssValuesEnum = await asyncLoadCssValues();
  //
  cssLengthUnits = queryLengthUnits();
  const inputDiv = document.querySelector(".inner");
  const widthEntry = document.querySelector("input");
  const unitsSelector = document.querySelector("#units-selector");
  const resultsDiv = document.querySelector(".results");

  document.querySelector("#show")
      .addEventListener("click", () => {
        addOneResult(widthEntry.value, getUnitInfo(unitsSelector.value), resultsDiv);
        // inputElem.value = "";
        widthEntry.focus();
      });

  document.querySelector("#show-all")
      .addEventListener("click", () => {
        resultsDiv.childNodes.forEach(child => resultsDiv.removeChild(child));
        cssLengthUnits.forEach(
          unitInfo => addOneResult(widthEntry.value, unitInfo, resultsDiv)
        )
        widthEntry.focus();
      });

  loadLengthUnitsOptions();

}

async function asyncLoadCssValues() {
  try {
    let fetchBody = await fetch("./assets/css-values.json");
    let json = await fetchBody.json();
    return json;
  }
  catch (error) {
    console.log(`fetch error`, error);
  }
}

function loadLengthUnitsOptions() {
  fillLengthOption();
}

function getUnitInfo(unitName) {
  let query = `$[?(@.name=='${unitName}')]`;
  let qr = jsonpath.query(cssLengthUnits, query);
  return qr ? qr[0] : undefined;
}

function queryLengthUnits() {
  let query = "$['values'][?(@.name=='<length>')]['values']";
  // let query = "$['values']";
  console.log(`json query: ${query}`);
  let units;
  try {
    units = jsonpath.query(cssValuesEnum, query);
  } catch (e) {
    console.log(`jsonpath error`, e);
  }
  return units[0];
}

const fillLengthOption = function () {

  let select = document.querySelector("#units-selector");

  // json query result has an outer array wrapping the results which are themselves
  // an array of target objects
  cssLengthUnits.forEach(
      (unitInfo, idx, all) =>
          select.appendChild(newOption(unitInfo.name))
  );

};

function newOption(unit) {
  let option = document.createElement("option");
  option.value = unit;
  option.appendChild(document.createTextNode(unit));
  return option;
}

function addOneResult(widthAsString, unitInfo, resultsDiv) {
  // inputDiv.style.width = inputElem.value;
  const result = document.createElement("div");
  result.className = "result";
  let widthText = widthAsString + unitInfo.name;
  result.style.width = widthText;
  result.innerHTML = `<code>width: ${widthText}</code>`;
  result.addEventListener("mouseover", evt => {
    let infoDiv = document.createElement("div");
    infoDiv.appendChild(document.createTextNode(
        `${unitInfo.name}: ${unitInfo.prose ? unitInfo.prose : '(not specified)'}`
    ));
    infoDiv.style= `position:offset; left: ${evt.offsetX + 10}px; top: ${evt.offsetY}px; background: white`;
    infoDiv.id = "info-div";
    //
    result.appendChild(infoDiv);
  })
  result.addEventListener("mouseout", evt => {
    result.childNodes.forEach(
        node => {
          if (node.id === "info-div") result.removeChild(node);
        }
    );
  })
  //
  resultsDiv.appendChild(result);
}
