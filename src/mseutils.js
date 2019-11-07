//************************* MSE code
/*global variables involved:
 * videoElement,
 * initializationSegment,
 * initializationSegmentUrl,
 * kfvSegments,
 * completeMimeType
 */

function setupPreview(index) {
    if (cacheThumbnails[kfvSegmentUrl]) {
        // Already cache
        videoElement.hidden = true;
        videoPreviewElement.src = cacheThumbnails[kfvSegmentUrl];
        videoPreviewElement.hidden = false;
    } else {
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

        // Play the video
        // https://developers.google.com/web/updates/2017/06/play-request-was-interrupted
        videoElement.play().then(_ => {
            // Save thumbnail if preview type is image
            if (previewType === "image") {
                saveThumbnail();
            }
        }).catch(_ => {
            // Auto-play was prevented
            console.log("Promise for video.play() is rejected.");
        });
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

// Save thumbnail to cache folder
function saveThumbnail() {
    canvasContext.drawImage(videoElement, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const data = canvas.toDataURL();
    cacheThumbnails[kfvSegmentUrl] = data;
}
