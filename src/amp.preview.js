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

        // Create previewElement for thumbnails stored in memory cache
        previewElement = document.createElement("img");
        previewElement.style.width = previewWidth + "px";
        previewElement.hidden = true;
        hover.appendChild(previewElement);

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
            if (currentSegmentUrl == undefined ||
                currentSegmentUrl !== kfvSegmentUrl) {
                    currentSegmentUrl = kfvSegmentUrl;
                    kfvSegments = [];
            }
            if (test_mode === true) {
                displayStatus("<span style='color:red'>Starting keyframe download ......</span>");
                console.log("Starting to download DASH segment from: " + kfvSegmentUrl);
            }
            // avoid to request the same url from previous event.
            if (kfvSegments.length === 0) {
                BrowserUtils.xhrRequest(kfvSegmentUrl, "GET", "arraybuffer", "", "", function (data) {
                    if (!!data) {

                        videoElement = document.getElementById("thumbnailvideo");

                        if (videoElement.currentTime === 0) {
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
            }


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
