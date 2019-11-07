# Video Scrubbing Preview Without Image Generation
MSE-based video frame preview whilst scrubbing without generating keyframe images in advance.

## Rationale
To create UI that supports seeing frame previews while moving the playhead (scrubbing). Traditional on-demand video image preview requires the creation of thumbnail images generated from the source video at regular intervals. That image generation has both compute and permanent storage costs that compound as video content libraries grow larger and larger. This approach uses the Media Source Extensions API in all modern browsers (Edge, Firefox, Chrome, Safari) to dynamically request video segments and display them as images or video clips from standard MPEG-DASH and HLS segmented MP4 video content.
