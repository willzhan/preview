//************************* MSE code
/*global variables involved:
 * videoElement,
 * initializationSegment,
 * initializationSegmentUrl,
 * kfvSegments,
 * completeMimeType
 */

function setupPreview(index) {
    if (memoryCache[kfvSegmentUrl]) {
        console.log("Found in cache: " + kfvSegmentUrl);

        // Already cache
        videoElement.hidden = true;
        previewElement.src = memoryCache[kfvSegmentUrl];
        previewElement.hidden = false;
    } else {
        videoElement.hidden = false;
        previewElement.hidden = true;

        // Create MSE object (the following 2 variables were moved into function scope from global)
        var vidSourceBuffer;
        var mediaSource = new MediaSource();

        // Register sourceopen event handler in order to add source buffers to MSE after it has been attached to the video element.
        mediaSource.addEventListener("sourceopen", function () {
            // Register timeupdate event handler to monitor buffer level
            videoElement.addEventListener("ended", saveThumbnail, false);
            if (mediaSource.sourceBuffers.length === 0) {
                // Add video source buffers
                vidSourceBuffer = createSourceBuffer(mediaSource, completeMimeType, index, videoElement);

                // add segments
                appendInitSegment(vidSourceBuffer, initializationSegment, initializationSegmentUrl);  //moved here from line 648
                updateSourceBuffers(mediaSource, vidSourceBuffer, kfvSegments[0], videoElement);
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
}

// helper to add a source buffer and initialize some state
function createSourceBuffer(mediaSource, mimeType, index, videoElement) {

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
        if (kfvSegments) {
            updateSourceBuffers(mediaSource, sourceBuffer, kfvSegments[0], videoElement);
        }
    });

    return sourceBuffer;
}

// function called periodically to update the source buffers by appending more segments
function updateSourceBuffers(mediaSource, vidSourceBuffer, nextSegment, videoElement) {
    //to avoid the error: Uncaught DOMException: Failed to execute 'endOfStream' on 'MediaSource': The 'updating' attribute is true on one or more of this MediaSource's SourceBuffers.
    //https://developer.mozilla.org/en-US/docs/Web/API/MediaSource/endOfStream
    if (!!vidSourceBuffer) {
        vidSourceBuffer.addEventListener("updateend", function () {
            appendNextMediaSegment(vidSourceBuffer, nextSegment);   //this line was moved from above into here
            if (!vidSourceBuffer.updating && mediaSource.readyState === "open") {
                mediaSource.endOfStream();
                getBufferLevel(vidSourceBuffer, videoElement);
            }
        });
    }
}

// appends an INIT segment if necessary
function appendInitSegment(sourceBuffer, initializationSegment, initializationSegmentUrl) {
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
function appendNextMediaSegment(sourceBuffer, nextSegment) {
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
    sourceBuffer.appendBuffer(nextSegment);
    sourceBuffer.eos = true;
}

// returns the amount of time buffered also set the video position to buffer start time
function getBufferLevel(sourceBuffer, videoElement) {
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
