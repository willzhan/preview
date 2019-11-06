(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
SOFTWARE.                       */

(function (mediaPlayer) {
    "use strict";

    amp.plugin("preview", function (options) {

        //retrieve input parameters
        previewType    = !!options && !!options.previewType    ? options.previewType    : "image";         //image or video
        previewWidth   = !!options && !!options.previewWidth   ? options.previewWidth   : 200;             //width of preview
        previewQuality = !!options && !!options.previewQuality ? options.previewQuality : 0;               //bitrate/quality layer index of profile - 0 the lowest
        test_mode      = !!options && !!options.testMode       ? options.testMode       : false;           //test_mode toggle
        previewLength = 1;                                                                                 //# of segments if previewType = "video", currently always 1
        //hovering div style depends on input
        hover_vertical_offset = parseInt(previewWidth) / 2 - 10;   //90 default;

        //AMP variables
        player = this;
        progressControl = player.controlBar.progressControl;

        //******************** ELEMENTS & POSITIONS  ************************//
        var getComputedStyle = function (el, pseudo) {
            return function (prop) {
                if (window.getComputedStyle) {
                    return window.getComputedStyle(el, pseudo)[prop];
                } else {
                    return el.currentStyle[prop];
                }
            };
        };

        var offsetParent = function (el) {
            if (el.nodeName !== 'HTML' && getComputedStyle(el)('position') === 'static') {
                return offsetParent(el.offsetParent);
            }
            return el;
        };

        var getScrollOffset = function () {
            if (window.pageXOffset) {
                return {
                    x: window.pageXOffset,
                    y: window.pageYOffset
                };
            }
            return {
                x: document.documentElement.scrollLeft,
                y: document.documentElement.scrollTop
            };
        };

        //add the div hosting thumbnail
        hover = document.createElement("div");
        hover.id = "hover";
        hover.style.top = -1 * (player.controlBar.el().offsetHeight + hover_vertical_offset) + "px";
        hover.style.visibility = "hidden";
        hover.style.display = "block";
        hover.style.width = previewWidth + "px";
        hover.style.position = "absolute";
        hover.style.fontSize = "x-small";

        //create a video element
        videoElement = document.createElement("video");
        videoElement.id = "thumbnailvideo";
        videoElement.style.width = previewWidth + "px";
        hover.appendChild(videoElement);

        //status display (test mode)
        if (test_mode === true) {
            status = document.createElement("div");
            status.id = "status";
            hover.appendChild(status);
        }

        player.controlBar.progressControl.seekBar.el().appendChild(hover);


        /******************** EVENTS **********************/
        progressControl.on("mousemove", mousemove);

        //determine which segment mouseTime falls within (and subsequent segments for viewo preview), for the purpose of determining $Time$
        function getSelectedSegments(mouseTime) {
            var selectedSegments = [];
            if (!!segments && segments.length > 0) {
                for (var i = 0; i < segments.length; i++) {
                    if (mouseTime >= segments[i].start && mouseTime < segments[i].end) {
                        selectedSegments.push(segments[i]);
                        break;
                    }
                }

                if (selectedSegments.length === 0) {
                    selectedSegments.push(segments[0]);
                }
            } else {
                selectedSegments.push({
                    start: 0,
                    end: 20000000
                });
            }

            //var end = performance.now();
            //console.log("Compute time in determining mouse segment: " + (end - start) + "ms");

            return selectedSegments;
        }

        function mousemove(event) {
            //determine mousetime
            var pageX = event.pageX;
            var clientX = event.clientX;
            var pageXOffset = getScrollOffset().x;
            var clientRect = offsetParent(progressControl.el()).getBoundingClientRect();
            var duration = player.duration();
            // find the page offset of the mouse
            var left = event.pageX || (event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft);
            // subtract the page offset of the positioned offset parent
            left -= clientRect.left + pageXOffset;
            var mouseTime = (left - progressControl.el().offsetLeft) / progressControl.width() * duration;


            //get $Time$ in media
            var selectedSegments = getSelectedSegments(mouseTime * timescale);
            var time = selectedSegments[0].start;
            var segmentVirtualUrl = media.replace("$Bandwidth$", bandwidth).replace("$Time$", time);
            kfvSegmentUrl = segmentBaseUrl + segmentVirtualUrl;
            if (previewType !== "video") {
                kfvSegmentUrl = kfvSegmentUrl.replace("/Fragments(", "/Keyframes(");
            }

            if (test_mode === true) {
                displayStatus("<span style='color:red'>Starting keyframe download ......</span>");
                console.log("Starting to download DASH segment from: " + kfvSegmentUrl);
            }

            BrowserUtils.xhrRequest(kfvSegmentUrl, "GET", "arraybuffer", "", "", function (data) {
                if (!!data) {

                    videoElement = document.getElementById("thumbnailvideo");

                    if (videoElement.currentTime === 0) {
                        kfvSegments = [];
                        kfvSegments.push(data);
                        setupPreview(0);
                    }

                    if (test_mode === true) {
                        displayStatus("Download complete. Segment size: " + data.byteLength + ".");
                        console.log("DOWNLOAD COMPLETED: $Bandwidth$=" + bandwidth + " | $Time$=" + time + " | downloaded DASH keyframe size = " + data.byteLength);
                        console.log("initializationSegment.byteLength: " + initializationSegment.byteLength);
                        console.log("Attempt to display preview");
                    }
                }
            });


            //hover positioning
            hover.style.display = "block";
            hover.style.visibility = "visible";

            if (left < hover.offsetWidth / 2) {
                hover.style.left = 0;
            } else if (left + hover.offsetWidth / 2 < progressControl.width() && left > hover.offsetWidth / 2) {
                hover.style.left = left - progressControl.el().offsetLeft - hover.offsetWidth / 2 + "px";
            } else {
                hover.style.left = progressControl.width() - hover.offsetWidth + "px";
            }
        }

        //hide when mouseout
        player.controlBar.progressControl.el().addEventListener("mouseout", function () {

            //hover.style.left = "-1000px";
            hover.style.display = "none";
            //hover.style.visibility = "hidden";

            //reset videoElement
            videoElement = document.getElementById("thumbnailvideo");
            videoElement.pause();
            videoElement.currentTime = 0;
            videoElement.removeAttribute("src"); // empty source
            videoElement.load();
            //sourceBuffer = null;
        });

        player.ready(function () {  //main function
            registerPreviewEvents();
        });

        //register events to handle
        function registerPreviewEvents() {
            var events = [
                amp.eventName.ended,
                amp.eventName.canplaythrough,
            ];

            for (var i = 0; i < events.length; i++) {
                player.addEventListener(events[i], previewEventHandler);
            }
        }

        function previewEventHandler(evt) {
            switch (evt.type) {
                case amp.eventName.canplaythrough:
                    var url = getDashUrl();
                    getMPD(url);
                    break;
                case amp.eventName.ended:
                    //player.poster("Content/images/HoloLens.jpg");
                    player.currentTime(0);
                    player.exitFullscreen();
                    break;
                default:
                    break;
            }
        }
    });
})();

},{}],2:[function(require,module,exports){
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

AmpPlayer.prototype.play = function() {
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
}

AmpPlayer.prototype.getPlugins = function() {
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


},{}],3:[function(require,module,exports){
//****************************************
// BROWSER UTILS
//****************************************

function BrowserUtils() { }

//Utility function for making XMLHttpRequest
//httpMethod: GET, or POST
//responseType: arraybuffer, "" (default: text), blob, stream
//msCaching: auto, enabled, disabled
BrowserUtils.xhrRequest = function (url, httpMethod, responseType, msCaching, context, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open(httpMethod, url);
    xhr.responseType = responseType;
    xhr.msCaching = msCaching;
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                if (context === "useResponseXML") {        //MPD request
                    callback(xhr.responseXML, context);
                }
                else {                                    //fragment/LA request
                    callback(xhr.response, context);
                }
            } else {
                console.log("XHR: failed. URL = " + url + ". Status = " + xhr.status + ". " + xhr.statusText);
                callback(null, context);
            }
        }
    };
    xhr.send();
    //console.log("XHR: method=" + httpMethod + ", ResponseType=" + responseType + ", URL=" + url);

    return xhr;
};

//get smooth URL
function getSmoothUrl() {
    var url = player.currentSrc();
    url = url.substr(0, url.toLowerCase().indexOf("/manifest") + 9);
    return url;
}

function getDashUrl() {
    var url = getSmoothUrl() + "(format=mpd-time-csf)";
    return url;
}

},{}],4:[function(require,module,exports){
//retrieve input parameters
var previewType;                       //image or video
var previewWidth;                      //width of preview
var previewQuality;                    //bitrate/quality layer index of profile - 0 the lowest
var test_mode;                         //test_mode toggle
var previewLength;                     //# of segments if previewType = "video", currently always 1

//hovering div style depends on input
var hover_vertical_offset;             //90 default;

//AMP variables
var player;
var progressControl;

//MPD parameters
var completeMimeType;                  //to be determined by parsing MPD
var initialization, media, timescale;  //exactly as MPD attributes
var bandwidth;                         //$Bandwidth$
var segmentBaseUrl;                    //base portion of segment URL before QualityLevels($Bandwidth$)/Fragments(video=$Time$,format=mpd-time-csf)
var initializationSegment;             //initialization segment
var initializationSegmentUrl;          //initialization segment URL
var kfvSegments;                        //keyframe or video segment
var kfvSegmentUrl;                     //keyframe or video segment URL
var segments;                          //array holding time segments {start: m, end: n}, in timescale

//video preview
var hover;                             //<div> element containing videoElement and other UI elements
var videoElement;                      //<video> element for displaying preview segment: either keyframe or video segment
var status;                            //for testing only, when test_mode=true

},{}],5:[function(require,module,exports){
//*********************MPD Parser *********************
/* global variables used:
 * initialization
 * timescale
 * media
 * bandwidth
 * completeMimeType
 * segments
 * segmentBaseUrl
 */

function getMPD(url) {

    //*****use DashParser to get DASH manifest parameters
    var dashManifestRequest = new XMLHttpRequest();
    dashManifestRequest.open("GET", url, true);
    dashManifestRequest.responseType = "text";
    dashManifestRequest.onerror = function (error) {
        console.error("There was an error downloading the manifest from " + url, error);
        //player.trigger(mediaPlayer.eventName.framerateerror);
    };
    dashManifestRequest.onload = function () {

        var dashParser = Dash.dependencies.DashParser();
        dashParser.debug = new DebugLog;
        dashParser.errHandler = new ErrorLog;
        var manifest = dashParser.parse(dashManifestRequest.response, url);
        console.log("manifest: " + manifest);

        var videoAdaptationSet = manifest.Period.AdaptationSet.filter(function (adaptationSet) {
            return (!!adaptationSet.contentType && adaptationSet.contentType.toLowerCase() === 'video') ||
                (!!adaptationSet.mimeType && adaptationSet.mimeType.toLowerCase() === 'video/mp4');
        })[0];

        completeMimeType = getCompleteMimeType(videoAdaptationSet);

        var videoSegmentTemplate = videoAdaptationSet.SegmentTemplate;
        //timescale
        timescale = videoSegmentTemplate.timescale;              //10000000
        console.log("timescale: " + timescale);
        //media
        media = videoSegmentTemplate.media;                      //QualityLevels($Bandwidth$)/Fragments(video=$Time$,format=mpd-time-csf)
        console.log("media: " + media);
        //initialization
        initialization = videoSegmentTemplate.initialization;    //QualityLevels($Bandwidth$)/Fragments(video=i,format=mpd-time-csf)
        console.log("initialization: " + initialization);

        var segmentTimeline = videoSegmentTemplate.SegmentTimeline;

        //collect all video segments info (start, end)
        segments = getSegments(segmentTimeline);

        //get the specified $Bandwidth$ (both $Bandwidth$ and initialization are required to build the URL for requesting video initialization
        bandwidth = getSelectedBitrate(player, previewQuality);
        console.log("Selected bitrate/bandwidth: " + bandwidth);

        //get segmentBaseUrl
        segmentBaseUrl = getSmoothUrl().replace("Manifest", "").replace("manifest", "");

        //get URL for video initialization
        if (!!initialization && !!bandwidth) {
            initializationSegmentUrl = segmentBaseUrl + initialization.replace("$Bandwidth$", bandwidth);

            //request initializationSegment
            BrowserUtils.xhrRequest(initializationSegmentUrl, "GET", "arraybuffer", "", "", function (data) {
                if (!!data) {
                    initializationSegment = data;
                    if (test_mode === true) {
                        console.log("initializationSegmentUrl: " + initializationSegmentUrl);
                        console.log("initializationSegment.byteLength from initial download: " + initializationSegment.byteLength);
                    }
                }
            });
        }

    };
    dashManifestRequest.send();
}  //getMPD

//index = 0 for lowest bitrate and incrementing
function getSelectedBitrate(player, index) {
    var selectedBitrate;

    var videoTrackArray = getVideoTrackArray(player);
    var bitrates = [];
    for (var i = 0; i < videoTrackArray.length; i++) {
        bitrates.push(videoTrackArray[i].bitrate);
    }

    //var uint32Array = bitrates.sort((a, b) => a - b);   //ES2015
    var uint32Array = new Uint32Array(bitrates);   //this is much faster than the above way
    uint32Array = uint32Array.sort();
    if (index < 0) {
        selectedBitrate = uint32Array[0];
    } else if (index >= uint32Array.length) {
        selectedBitrate = uint32Array[uint32Array.length - 1];
    }
    else {
        selectedBitrate = uint32Array[index];
    }

    return selectedBitrate;
}

function getVideoTrackArray(amPlayer) {
    var videoTrackArray = [];

    if (amPlayer.currentVideoStreamList() !== undefined) {
        var videoStreamList = amPlayer.currentVideoStreamList();
        var videoTracks;

        for (var i = 0; i < videoStreamList.streams.length; i++) {
            videoTracks = videoStreamList.streams[i].tracks;
            if (videoTracks !== undefined) {
                for (var j = 0; j < videoTracks.length; j++)
                    videoTrackArray.push({
                        bitrate: videoTracks[j].bitrate,
                        width: videoTracks[j].width,
                        height: videoTracks[j].height,
                        selectable: videoTracks[j].selectable
                    });
            }
        }
    }

    return videoTrackArray;
}

//get the completeMimeType ('video/mp4; codecs="avc1.4D4020"') which is required by all Chromium-based browsers.
function getCompleteMimeType(videoAdaptationSet) {
    var completeMimeType;

    var mimeType = videoAdaptationSet.mimeType;
    var codecs = videoAdaptationSet.codecs;
    if (mimeType.indexOf("codecs") === -1) {
        completeMimeType = mimeType + "; codecs=\"" + codecs + "\"";
    } else {
        completeMimeType = mimeType;
    }

    return completeMimeType;
}

function getSegments(segmentTimeline) {
    var segment;
    var segmentStart = 0;
    var repeat;
    segments = [];
    if (!!segmentTimeline.S_asArray && segmentTimeline.S_asArray.length > 0) {
        console.log("segmentTimeline.S_asArray.length = " + segmentTimeline.S_asArray.length);

        for (var i = 0; i < segmentTimeline.S_asArray.length; i++) {
            repeat = segmentTimeline.S_asArray[i].r;
            console.log("repeat = " + repeat);
            if (!!repeat && repeat > 1) {
                segmentStart = segmentTimeline.S_asArray[i].t || segmentStart;
                for (var j = 0; j < repeat; j++) {
                    segment = {
                        start: segmentStart,
                        end: segmentStart + segmentTimeline.S_asArray[i].d
                    };
                    segments.push(segment);
                    segmentStart += segmentTimeline.S_asArray[i].d;
                }

            } else {
                segmentStart = segmentTimeline.S_asArray[i].t || segmentStart;
                segment = {
                    start: segmentStart,
                    end: segmentStart + segmentTimeline.S_asArray[i].d
                };
                segments.push(segment);
            }
        }
    }

    //print segments array
    if (test_mode === true) {
        for (var k = 0; k < segments.length; k++) {
            console.log("segment_" + k + ": [" + segments[k].start + ", " + segments[k].end + "]");
        }
    }

    return segments;
}

var DebugLog = (function () {
    function DebugLog() {
        this.log = function (message) {
            console.log(message);
        };
    }
    return DebugLog;
})();

var ErrorLog = (function () {
    function ErrorLog() {
        this.manifestError = function (message, id, manifest) {
            console.error(message);
        };
    }
    return ErrorLog;
})();

function displayStatus(msg) {
    status.innerHTML = msg;
}

},{}],6:[function(require,module,exports){
//************************* MSE code
/*global variables involved:
 * videoElement,
 * initializationSegment,
 * initializationSegmentUrl,
 * kfvSegments,
 * completeMimeType
 */

function setupPreview(index) {

    // Create MSE object (the following 2 variables were moved into function scope from global)
    var vidSourceBuffer;
    var mediaSource = new MediaSource();

    // Register sourceopen event handler in order to add source buffers to MSE after it has been attached to the video element.
    mediaSource.addEventListener("sourceopen", function () {
        // Register timeupdate event handler to monitor buffer level
        videoElement.addEventListener("ended", saveThumbnail, false);
        if (mediaSource.sourceBuffers.length === 0) {
            // Add video source buffers
            vidSourceBuffer = createSourceBuffer(mediaSource, completeMimeType, index);

            // add segments
            appendInitSegment(vidSourceBuffer);  //moved here from line 648
            updateSourceBuffers(mediaSource, vidSourceBuffer, index);
        }
    }, false);

    // Attach the MSE object to the video element
    videoElement.src = URL.createObjectURL(mediaSource, { oneTimeOnly: true });
    if (previewType === "video") {
        var playPromise = videoElement.play();
        if (playPromise !== undefined) {
            playPromise.then(_ => {
                // Automatic playback started!
                // Show playing UI.
                // We can now safely pause video...
                //video.pause();
            })
                .catch(error => {
                    // Auto-play was prevented
                    console.log("Promise for video.play() is rejected.");
                });
        }
    } else {
        videoElement.load();  //https://developers.google.com/web/updates/2017/06/play-request-was-interrupted
    }
}

// helper to add a source buffer and initialize some state
function createSourceBuffer(mediaSource, mimeType, index) {

    if (mediaSource.readyState !== "open") { return; }   //if mediaSource.readyState !== "open", mediaSource.addSourceBuffer will fail

    var sourceBuffer = mediaSource.addSourceBuffer(mimeType);

    // Store additional state as custom properties on the source buffers
    sourceBuffer.needsInitSegment = true;
    sourceBuffer.lastInitSegmentUrl = "";
    sourceBuffer.nextSegment = 0;
    sourceBuffer.eos = false;
    sourceBuffer.isVideo = true;
    sourceBuffer.appendingData = false;

    // Register updateend event handler to know when the append or remove operation has completed
    sourceBuffer.addEventListener("updateend", function () {
        sourceBuffer.appendingData = false;
        updateSourceBuffers(mediaSource, sourceBuffer, index);
    });

    return sourceBuffer;
}

// function called periodically to update the source buffers by appending more segments
function updateSourceBuffers(mediaSource, vidSourceBuffer, index) {
    //to avoid the error: Uncaught DOMException: Failed to execute 'endOfStream' on 'MediaSource': The 'updating' attribute is true on one or more of this MediaSource's SourceBuffers.
    //https://developer.mozilla.org/en-US/docs/Web/API/MediaSource/endOfStream
    if (!!vidSourceBuffer) {
        vidSourceBuffer.addEventListener("updateend", function () {
            appendNextMediaSegment(vidSourceBuffer, index);   //this line was moved from above into here
            if (!vidSourceBuffer.updating && mediaSource.readyState === "open") {
                mediaSource.endOfStream();
                getBufferLevel(vidSourceBuffer);
            }
        });
    }
}

// appends an INIT segment if necessary
function appendInitSegment(sourceBuffer) {
    // no-op if already appended an INIT segment or
    // if we are still processing an append operation
    if (!sourceBuffer || !sourceBuffer.needsInitSegment || sourceBuffer.appendingData) {
        return;
    }

    // Download and append segment
    sourceBuffer.appendingData = true;
    sourceBuffer.appendBuffer(initializationSegment);
    sourceBuffer.needsInitSegment = false;
    sourceBuffer.lastInitSegmentUrl = initializationSegmentUrl;
}

// appends the next MEDIA segment if necessary
function appendNextMediaSegment(sourceBuffer, index) {
    // no-op if we are still processing an append operation
    // or if we have more than 4 seconds of data already buffered up
    if (!sourceBuffer || sourceBuffer.appendingData) {
        return;
    }

    // Check if there are no more segments to download
    if (sourceBuffer.eos === true) {
        return;
    }

    sourceBuffer.appendingData = true;
    sourceBuffer.appendBuffer(kfvSegments[0]);
    sourceBuffer.eos = true;
}

// returns the amount of time buffered also set the video position to buffer start time
function getBufferLevel(sourceBuffer) {
    var frameStart; //moved to function scope
    var end;
    var bufferLevel = 0;

    for (var i = 0; i < sourceBuffer.buffered.length; i++) {
        frameStart = sourceBuffer.buffered.start(i);
        end = sourceBuffer.buffered.end(i);

        videoElement.currentTime = frameStart;

        bufferLevel = end - frameStart;
    }

    return bufferLevel;
}

//**********************************


//**********************************IMAGE
function saveThumbnail() {
    //playbackEnd = performance.now();
    //document.getElementById("result").events_textarea.value += "PlaybackTime:" + (playbackEnd - playbackStart) + "\n";
    //convert to image via canvas and put into image element
    //var tmpCanvas = document.createElement("canvas");
    //tmpCanvas.width = 200;
    //tmpCanvas.height = 150;
    //tmpCanvas.getContext("2d").drawImage(videoElement, 0, 0, 200, 90);

    ////m_frameTime[currentIndex] = frameStart;
    //thumbnailObject = new Image();
    //thumbnailObject.src = tmpCanvas.toDataURL();
    //thumbnailImage.src = thumbnailObject.src;
    //thumbnailImage.style.visibility = "visible";
    //canvasDownloaded[currentIndex] = true;
    //document.getElementById("result").events_textarea.value += "save canvas: " + currentIndex + " frame time: " + frameStart + "\n";
    /* display each frame thumbnail
    var container = document.getElementById ("container");
    container.appendChild (m_images[currentIndex]);
    */
    //if ((fDraw) && (currentIndex == thumbnailRequest)) {
    //    //thumbnail.drawImage(m_canvas[currentIndex], 0, 0, 400, 300);
    //    //thumbnailImg.src = m_images[currentIndex].src;
    //    //m_canvas[currentIndex].style.display = true;
    //    fDraw = false;
    //    displayThumbnail(currentIndex);
    //}
    //if (!fFinished) {
    //    checkAndDownloadThumbnails();
    //}
}

},{}]},{},[2,1,3,4,5,6]);
