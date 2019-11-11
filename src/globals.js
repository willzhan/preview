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
var currentSegmentUrl;                 // Current segment url
var segments;                          //array holding time segments {start: m, end: n}, in timescale

//video preview
var hover;                             //<div> element containing videoElement and other UI elements
var videoElement;                      //<video> element for displaying preview segment: either keyframe or video segment
var status;                            //for testing only, when test_mode=true
var previewElement;                    // for thumbnails stored in memory cache

// Memory cache
var memoryCache = {};
var prefetched = false;
