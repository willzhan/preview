/**
 * This module provides functionality to prefetch keyframes and store them in memory.
 */

// Canvas
const CANVAS_WIDTH = 200;                               // canvas width
const CANVAS_HEIGHT = 90;                               // canvas height

let canvas;                                             // canvas used for offscreen rendering
let canvasContext;                                      // canvas context
let offscreenVideoElement;                                       // used to decode video segment

// Download video segment at the given time
function downloadSegment(baseUrl, bandwidth, time, type) {
    const segmentVirtualUrl = media.replace("$Bandwidth$", bandwidth).replace("$Time$", time);
    let url = baseUrl + segmentVirtualUrl;
    if (type === "image") {
        url = url.replace("/Fragments(", "/Keyframes(");
    }

    return new Promise((resolve, reject) => {
        BrowserUtils.xhrRequest(url, "GET", "arraybuffer", "", "", function (data) {
            if (!!data) {
                resolve(data);
            } else {
                reject("Failed to download segment!");
            }
        });
    });
}

// Convert video segment to base64 PNG image
function segmentToImage(initializationSegment, initializationSegmentUrl, completeMimeType, segmentData) {
    return new Promise((resolve, reject) => {
        // Lazy initialization
        if (!canvas) {
            // Init canvas
            canvas = document.createElement("canvas");
            canvasContext = canvas.getContext("2d");
            canvas.width = CANVAS_WIDTH;
            canvas.height = CANVAS_HEIGHT;

            // Init video element
            offscreenVideoElement = document.createElement("video");
            offscreenVideoElement.style.width = CANVAS_WIDTH + "px";
        }

        // Create MSE object
        let mediaSource = new MediaSource();
        let sourceBuffer;

        // Register sourceopen event handler in order to add source buffers to MSE after it has been attached to the video element.
        mediaSource.addEventListener("sourceopen", function () {
            // Create video source buffer
            sourceBuffer = createSourceBuffer(mediaSource, completeMimeType, 0);

            // Append INIT segment
            sourceBuffer.appendingData = true;
            sourceBuffer.appendBuffer(initializationSegment);
            sourceBuffer.needsInitSegment = false;
            sourceBuffer.lastInitSegmentUrl = initializationSegmentUrl;

            // Update source buffer
            sourceBuffer.addEventListener("updateend", function () {
                console.log("updateend");
                sourceBuffer.appendBuffer(segmentData);
                sourceBuffer.appendingData = false;
                sourceBuffer.eos = true;
                //if (!sourceBuffer.updating && mediaSource.readyState === "open") {
                    mediaSource.endOfStream();
                //}
            });
        }, false);

        // Attach the MSE object to the video element
        offscreenVideoElement.src = URL.createObjectURL(mediaSource, { oneTimeOnly: true });
        offscreenVideoElement.play().then(_ => {
            canvasContext.drawImage(offscreenVideoElement, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            const data = canvas.toDataURL();
            console.log(data)
            resolve(data)
        }).catch(error => {
            reject(error);
        });
    });
}
