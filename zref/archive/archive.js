function resetCanvas() {

    console.log(`enter resetCanvas - window size ${window.innerWidth} w ${window.innerHeight} h`);

    let wasResized = false;

    let canvas = document.querySelector("#omni-canvas");
    let canvasInfo = canvasInfoMap[canvas.id];
    let ctx = canvasInfo.graphicsContext;
    //
//    let newWidth = canvas.width;
    let canvasCurrentInnerWidth = innerWidth(canvas);
    let canvasCurrentInnerHeight = innerHeight(canvas);
    let newHeight = -1;
    let newWidth = -1;
    let container = canvas.parentElement;
    let containerAvailableHeight = 0;
    if ( container.tagName === "DIV" ) {
        newWidth = innerWidth(container);
        containerAvailableHeight = innerHeight(container);
    }
    else if ( container === window ) {
        newWidth = window.innerWidth;
        containerAvailableHeight = window.innerHeight;
    }

    let canvasExtraHeight = outerHeight(canvas) - innerHeight(canvas);

    newHeight = containerAvailableHeight - canvasExtraHeight;
    newWidth = newWidth - canvasExtraHeight;

    if (canvasCurrentInnerHeight !== newHeight) {

        console.log(`computed canvas new size ${newWidth} w ${newHeight} h`);

        // NOTE Canvas 'width' and 'height' define the viewbox scale for the canvas
        canvas.width = newWidth;
        canvas.height = newHeight;
//        canvas.style.flexBasis = `${newHeight}px`;

        ctx.clearRect(0,0, canvasCurrentInnerWidth, newHeight);
        ctx.fillStyle = "blue";
        ctx.fillRect(0, 0, canvasCurrentInnerWidth, newHeight);
        //
        wasResized = true;
    }
    console.log(`exit resetCanvas - window size ${window.innerWidth} w ${window.innerHeight} h`);

    return wasResized;
}

/* The goal here is to dynamically set the height of the div to use as much
* vertical as possibly w/o generating scrollbars in the window .*/
function resizeCenterDiv() {
    console.log(`enter resizeCenterDiv - window size ${window.innerWidth} w ${window.innerHeight} h`);

    let centerDiv = document.querySelector("#omni-canvas-div");

    if ( ! centerDiv ) return;

    let body = document.body;
    /*
      Prior to re-sizing, compute otherElementHeight = how much of the current
      <body> height is being used by elements other than the center div.
      Then compute, maxBodyHeight, the max body height w/o creating scroll bars.
    */
    let totalBodyHeight = outerHeight(body);
    let totalCenterDivHeight = outerHeight(centerDiv);
    //
    let currentBodyFixedElementHeight = totalBodyHeight - totalCenterDivHeight;

    let newCenterDivHeightPx = window.innerHeight - currentBodyFixedElementHeight;
    console.log(`computed h + f height ${currentBodyFixedElementHeight}`);
    centerDiv.style.flexBasis = `${newCenterDivHeightPx}px`;

    console.log(`exit resizeCenterDiv - window size ${window.innerWidth} w ${window.innerHeight} h`);
}
