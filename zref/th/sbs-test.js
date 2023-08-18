/*
 * Copyright (c) Jim Coles (jameskcoles@gmail.com) 2023 through present.
 *
 * Licensed under the following license agreement:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Also see the LICENSE file in the repository root directory.
 */

/**
    Evolution of this JS:

    Phase 1. Hard-code to subscribe to server-side Space state, receive
        events, update graphic objects and arrows.

    Phase 2. Make server aware of the JS graphics API so that behavior
        may be coded in Space on server. Browser needs only a basic UM machine
        coded in JS.

*/

main();

//
// start here
//
function main() {
    svgDynamic();
    canvasDynamic();
}


function svgKeyDown() {

}
{

}
/**
 * SVG JS
 */
function svgDynamic() {
//    const svg = document.createElement("svg");
//    let svg = document.getElementById("omni-svg");

    const svgUri = "http://www.w3.org/2000/svg";
    const svgQn = "svg";

    var svgDiv = document.getElementById("svg-dynamic-div");
    var svg = document.createElementNS(svgUri, svgQn);
    svgDiv.appendChild(svg);

    svg.setAttributeNS(svgUri, "viewBox", "0 0 100 100");

    svg.createSVGTransform();



}

function anyClick(evt) {
    alert("click " + evt.target.id);
}

function draw2d(omniCanvas) {
    const gc = omniCanvas.getContext("2d");
    gc.fillRect(25, 25, 100, 100);
    gc.clearRect(45, 45, 60, 60);

    gc.strokeRect(50, 50, 50, 50);
    gc.font = "14pt sans-serif";

    gc.fillText("Doogie", 100, 200, 100);
}

function drawGL2(omniCanvas) {
    const gc = omniCanvas.getContext("webgl2");

}

/**
 Canvas JS.
*/
function canvasDynamic() {
    // create objects
//    const topDiv = document.createElement("div");
    var topDiv = document.getElementById("canvas-dynamic-div");
//    let omniCanvas = new HTMLCanvasElement;
    var omniCanvas = document.createElement("canvas");

    // nest objects
//    document.body.appendChild(topDiv);
    topDiv.appendChild(omniCanvas);

    //
    omniCanvas.height = 300;
    omniCanvas.width = 300;
    //
//    const canvas = document.querySelector("#omniCanvas");

    // Initialize graphics contexts.
    // NOTE: A given canvas may only have one active context ?
    // "webgl2" - most recent
    // "bitmaprenderer" - might be what we want if we model the screen device /pixels
    // "2d" -
    //      in space and do a full mapping to that 2D device.
    // "webgl"

    // gl
//    const gc = omniCanvas.getContext("webgl");
    drawGL2(omniCanvas);
//    const gc = omniCanvas.getContext("bitmaprenderer");

//    draw2d(omniCanvas);


}
