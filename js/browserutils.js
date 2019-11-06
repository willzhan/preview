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
