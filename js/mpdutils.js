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
