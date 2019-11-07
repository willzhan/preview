/*              The MIT License (MIT)

Copyright (c) 2015 Microsoft Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/* Default constructor */
function AmpPlayer() {

}

AmpPlayer.prototype.play = function () {
    var VIDEO_ID = "video_tag";
    var divVideo = document.getElementById("divVideo");
    //clean up both existing, if any, video tag and its corresponding AMP player
    var videoElement = document.getElementById(VIDEO_ID);
    if (videoElement !== null) {
        divVideo.removeChild(videoElement);
        //so that plugins are updated
        if (!!amPlayer) {
            amPlayer.dispose();
        }
    }
    //create new video tag with same video ID
    videoElement = document.createElement("VIDEO");
    videoElement.setAttribute("id", VIDEO_ID);
    videoElement.setAttribute("controls", "controls");
    videoElement.setAttribute("class", "azuremediaplayer amp-default-skin");
    videoElement.setAttribute("tabindex", "0");
    divVideo.appendChild(videoElement);
    var src = document.getElementById("sourceUrl");
    var url = src.value;
    amPlayer = amp(VIDEO_ID, {
        "nativeControlsForTouch": false,
        autoplay: true,
        controls: true,
        width: 992,
        height: 560,
        plugins: this.getPlugins(),
        logo: { enabled: false }
    });
    amPlayer.src([{
        src: url,
        type: "application/vnd.ms-sstr+xml"
    }]);

    // videoElement.addEventListener("playing", () => {
    //     console.log("videoElement.addEventListener");
    //     // Prefetch thumbnails
    //     prefetchThumbnails(segmentBaseUrl, bandwidth, segments, initializationSegment,
    //         initializationSegmentUrl, completeMimeType, memoryCache);
    // });

    setTimeout(() => {
        // Prefetch thumbnails
        prefetchThumbnails(segmentBaseUrl, bandwidth, segments, initializationSegment,
            initializationSegmentUrl, completeMimeType, memoryCache);
    }, 3000);
}

AmpPlayer.prototype.getPlugins = function () {
    //get user inputs for plugin input parameters
    var previewTypeElement = document.getElementById("previewType");
    var value = previewTypeElement.options[previewTypeElement.selectedIndex].value;
    var previewTypeValue = parseInt(value, 10);

    var previewWidthElement = document.getElementById("previewWidth");
    var previewWidth = parseInt(previewWidthElement.value);
    if (isNaN(previewWidth)) {
        previewWidth = "200";
    }

    var previewQualityElement = document.getElementById("previewQuality");
    var previewQuality = parseInt(previewQualityElement.value);
    if (isNaN(previewQuality)) {
        previewQuality = "0";
    }

    var testModeElement = document.getElementById("testMode");
    value = testModeElement.options[testModeElement.selectedIndex].value;
    var testModeValue = parseInt(value, 10);

    //create plugin
    var plugins = {
        preview: {
            previewType: previewTypeValue === 1 ? "video" : "image",
            previewWidth: previewWidth,
            previewQuality: previewQuality,
            testMode: testModeValue === 1,
        }
    };

    return plugins;
}

