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

        var player = this;
        var hover;
        var progressControl = player.controlBar.progressControl;

        //MPD parameters
        var initialization, media, timescale;  //exactly as MPD attributes
        var bandwidth;                         //$Bandwidth$
        var segmentBaseUrl;                    //base portion of segment URL before QualityLevels($Bandwidth$)/Fragments(video=$Time$,format=mpd-time-csf)
        var videoInitialization;               //MP4 data
        var videoSegment;                      //a segment of video downloaded
        var segments;                          //array holding time segments {start: m, end: n}, in timescale

        //video preview
        var videoElement;
        var mediaSource;
        var sourceBuffer;
        var MIME_TYPE = "video/mp4";
        var SHOW_VIDEO_PREVIEW = true;
         
        /******************** ELEMENTS & POSITIONS  ************************/
        var getComputedStyle = function (el, pseudo) {
            return function (prop) {
                if (window.getComputedStyle) {
                    return window.getComputedStyle(el, pseudo)[prop];
                } else {
                    return el.currentStyle[prop];
                }
            };
        }

        var offsetParent = function (el) {
            if (el.nodeName !== 'HTML' && getComputedStyle(el)('position') === 'static') {
                return offsetParent(el.offsetParent);
            }
            return el;
        }

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
        }

        //hovering div style depends on input
        var hover_vertical_offset = 90;
        var hover_width = "200px";

        //add the div hosting thumbnail
        hover = document.createElement("div");
        hover.id = "hover";
        hover.style.top = -1 * (/*player.controlBar.el().offsetHeight + */hover_vertical_offset) + "px";
        hover.style.visibility = "hidden";
        hover.style.display = "block";
        hover.style.width = hover_width;
        hover.style.position = "absolute";
        hover.style.fontSize = "x-small";

        if (SHOW_VIDEO_PREVIEW) {
            //create a video element
            videoElement = document.createElement("video");
            videoElement.id = "thumbnailvideo";
            videoElement.style.visibility = "visible";
            hover.appendChild(videoElement);
        }

        //player.controlBar.el().appendChild(hover);
        player.controlBar.progressControl.seekBar.el().appendChild(hover);



        /******************** THUMBNAIL VIDEO **********************/

        function startPlay(mouseTime) {
            var myOptions = {
                autoplay: true,
                controls: true,
                width: "64",
                height: "40",
                poster: ""
            };
            var thumbnailvideo = amp("thumbnailvideo", myOptions);
            thumbnailvideo.src([{ src: player.currentSrc, type: "application/vnd.ms-sstr+xml" }, ]);
            thumbnailvideo.currentTime(mouseTime);
            thumbnailvideo.play();
        }

        function playSegment(videoSegment) {
            //bootstrap a video element
            if (window.MediaSource) {
                mediaSource = new window.MediaSource();
                videoElement.pause();
                //videoElement.width = width;
                //videoElement.height = height;
                videoElement.src = URL.createObjectURL(mediaSource);
            } else {
                console.log("window.MediaSource not supported");
                return;
            }

            //Wait for event that tells us that our media source object is ready for a buffer to be added.
            mediaSource.addEventListener("sourceopen", function (e) {

                console.log(mediaSource.readyState);

                try {
                    sourceBuffer = mediaSource.addSourceBuffer(MIME_TYPE);
                    sourceBuffer.appendBuffer(new Uint8Array(videoInitialization));

                    //Wait for the update complete event before continuing
                    sourceBuffer.addEventListener("updateend", updateHandler, false);
                } catch (e) {
                    console.log('Exception calling addSourceBuffer for video', e);
                    return;
                }
            }, false);
        }

        function updateHandler(e) {
            console.log(mediaSource.readyState);

            sourceBuffer.appendBuffer(new Uint8Array(videoSegment));

            // Now that video has started, remove the event listener
            sourceBuffer.removeEventListener("updateend", updateHandler);
            videoElement.play();
        }

        /******************** EVENTS **********************/
        progressControl.on("mousemove", moveListener);

        //determine which segment mouseTime falls within, for the purpose of determining $Time$
        function getMouseSegment(mouseTime) {
            var segment;
            if (!!segments && segments.length > 0) {
                for (var i = 0; i < segments.length; i++) {
                    if (mouseTime >= segments[i].start && mouseTime < segments[i].end) {
                        segment = segments[i];
                        break;
                    }
                }
            } else {
                segment = { start: 0, end: 20000000 };
            }
            return segment;
        }

        function moveListener(event) {
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
            //var time = Math.floor(mouseTime * timescale / d) * d;
            var time = getMouseSegment(mouseTime * timescale).start;
            var segmentVirtualUrl = media.replace("$Bandwidth$", bandwidth).replace("$Time$", time);
            var segmentUrl = segmentBaseUrl + segmentVirtualUrl;
            //hover.innerText = segmentUrl;
            hover.innerText = "$Bandwidth$=" + bandwidth + "\n$Time$=" + time;

            //request video segment
            BrowserUtils.xhrRequest(segmentUrl, "GET", "arraybuffer", "", "", function (data) {
                if (!!data) {
                    videoSegment = data;
                    if (SHOW_VIDEO_PREVIEW) {
                        hover.innerText = "$Bandwidth$=" + bandwidth + "\n$Time$=" + time + "\nDOWNLOAD COMPLETED (" + data.byteLength + ")";
                        playSegment(videoSegment);
                        //startPlay(mouseTime);
                    } else {
                        hover.innerText = "$Bandwidth$=" + bandwidth + "\n$Time$=" + time + "\nDOWNLOAD COMPLETED (" + data.byteLength + ")";
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
            hover.style.visibility = "hidden";
            hover.style.left = "-1000px";
            //hover.style.display = "none";
        });

        player.ready(function () {  //main function
            registerPreviewEvents();
        });

        //register events to handle 
        function registerPreviewEvents() {
            var events = [amp.eventName.ended,
                          amp.eventName.canplaythrough,
            ];

            for (var i = 0; i < events.length; i++) {
                player.addEventListener(events[i], previewEventHandler);
            }
        }

        function previewEventHandler(evt) {
            switch (evt.type) {
                case amp.eventName.canplaythrough:
                    getMPD();
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



        //****************************************
        // BROWSER UTILS
        //****************************************

        function BrowserUtils() { };

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
                        if (context == "useResponseXML") {        //MPD request
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
            }
            xhr.send();
            console.log("XHR: method=" + httpMethod + ", ResponseType=" + responseType + ", URL=" + url);

            return xhr;
        }

        function getVideoTrackArray(amPlayer) {
            var videoTrackArray = [];

            if (amPlayer.currentVideoStreamList() != undefined) {
                var videoStreamList = amPlayer.currentVideoStreamList();
                var videoTracks;

                for (var i = 0; i < videoStreamList.streams.length; i++) {
                    videoTracks = videoStreamList.streams[i].tracks;
                    if (videoTracks != undefined) {
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

        function getLowestBitrate() {
            var videoTrackArray = getVideoTrackArray(player);
            var bitrates = [];
            for (var i = 0; i < videoTrackArray.length; i++) {
                bitrates.push(videoTrackArray[i].bitrate);
            }
            return Math.min.apply(null, bitrates);
        }

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


        function getMPD() {
            var url = getDashUrl();

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
                                }
                                segments.push(segment);
                                segmentStart += segmentTimeline.S_asArray[i].d;
                            }

                        } else {
                            segmentStart = segmentTimeline.S_asArray[i].t || segmentStart;
                            segment = {
                                start: segmentStart,
                                end: segmentStart + segmentTimeline.S_asArray[i].d
                            }
                            segments.push(segment);
                        }
                    }
                }

                //print segments array
                for (var i = 0; i < segments.length; i++) {
                    console.log("segment-" + i + ": [" + segments[i].start + ", " + segments[i].end + "]");
                }

                //get $Bandwidth$ - the lowest bitrate (both $Bandwidth$ and initialization are required to build the URL for requesting video initialization
                bandwidth = getLowestBitrate();

                //get segmentBaseUrl
                segmentBaseUrl = getSmoothUrl().replace("Manifest", "").replace("manifest", "");

                //get URL for video initialization
                if (!!initialization && !!bandwidth) {
                    var videoInitializationUrl = segmentBaseUrl + initialization.replace("$Bandwidth$", bandwidth);
                    console.log(videoInitializationUrl);

                    //request videoInitialization
                    BrowserUtils.xhrRequest(videoInitializationUrl, "GET", "arraybuffer", "", "", function (data) {
                        if (!!data) {
                            videoInitialization = data;
                            console.log(videoInitialization);
                        }
                    });
                }

            };
            dashManifestRequest.send();


            //BrowserUtils.xhrRequest(url, "GET", "", "", "useResponseXML", function (xml) {
            //    if (!!xml) {
            //        //get initialization, media, timescale paramters
            //        var segmentTemplates = xml.getElementsByTagName("SegmentTemplate");
            //        if (!!segmentTemplates && segmentTemplates.length > 0) {
            //            for (var j = 0; j < segmentTemplates.length; j++) {
            //                initialization = segmentTemplates[j].getAttribute("initialization");
            //                if (initialization == "QualityLevels($Bandwidth$)/Fragments(video=i,format=mpd-time-csf)") {
            //                    media = segmentTemplates[j].getAttribute("media");
            //                    timescale = segmentTemplates[j].getAttribute("timescale");
            //                    break;
            //                }
            //            }
            //        }

            //        //get d for video representations. This is not the best way. We should use DashParser
            //        var segmentTimelines = xml.getElementsByTagName("SegmentTimeline");
            //        if (!!segmentTimelines && segmentTimelines.length > 0) {
            //            for (var i = 0; i < segmentTimelines.length; i++) {
            //                if (segmentTimelines[i].parentNode.getAttribute("initialization") == "QualityLevels($Bandwidth$)/Fragments(video=i,format=mpd-time-csf)") {
            //                    d = segmentTimelines[i].firstChild.getAttribute("d");
            //                    //more detailed processing required here. What if it includes non-repeating segments
            //                    break;
            //                }
            //            }
            //        }


            //        //get $Bandwidth$ - the lowest bitrate (both $Bandwidth$ and initialization are required to build the URL for requesting video initialization
            //        bandwidth = getLowestBitrate();

            //        //get segmentBaseUrl
            //        segmentBaseUrl = getSmoothUrl().replace("Manifest", "").replace("manifest", "");

            //        //get URL for video initialization
            //        if (!!initialization && !!bandwidth) {
            //            var videoInitializationUrl = segmentBaseUrl + initialization.replace("$Bandwidth$", bandwidth);
            //            console.log(videoInitializationUrl);

            //            //request videoInitialization
            //            BrowserUtils.xhrRequest(videoInitializationUrl, "GET", "arraybuffer", "", "", function (data) {
            //                if (!!data) {
            //                    videoInitialization = data;
            //                    console.log(videoInitialization);
            //                }
            //            });
            //        }


                //}  //if (!!xml)
            //}

            

        }  //getMPD

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



    });
})();