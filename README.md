# Video Scrubbing Preview Without Image Generation
MSE-based video preview whilst scrubbing without generating images in advance.

## Rationale
For most online streaming products such as Netflix, Amazon Prime, YouTube, etc., thumbnail preview while mouseover timeline is a popular feature. Traditionally, such feature requires the following 5 steps:
 - Server side transcoding job to generate thumbnail images;
 - Store images
 - Host images thru an HTTP endpoint
 - Manage image URLs thru CMS
 - Client code to download and display images

## Idea
Can we skip the above steps and solely rely on client javascript code to dynamically generate thumbnail images and display? If MSE can decode and play a DASH or HLS segment, why cannot we use MSE to decode and display a keyframe of a DASH or HLS segment? Even if for DRM or clear key protected content, if EME can decrypt a DASH or HLS segment, why cannot it decrypt a DASH or HLS keyframe? 

All modern browsers support MSE and EME: Edge, Chrome, Safari, Firefox, Opera. If we can make this approach work, it would work for all modern browsers.

Since we can choose to either download the corresponding keyframe or DASH/HLS segment, we have the choice to either just show a static thumbnail image (decoded from keyframe) or a short video clip (decoded from the downloaded segment). 

## Demo
Please see the [demo](https://openidconnectweb.azurewebsites.net/Plugin/Preview.html).


