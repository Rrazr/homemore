# Sacred Spaces, Safe Homes — pitch demo

This is a deliberately scripted prototype for a 90-second pitch video. The full MVP plan in the conversation remains unchanged.

## Run

Serve `dist/` with any static HTTP server. Internet access is required for Leaflet, Three.js, fonts and Esri satellite tiles. No API key or build step is needed.

## Demo flow

1. Outline a surface lot using map clicks, then select Finish. A sample boundary is also available.
2. Select Generate housing concept. The prepared twelve-unit scenario appears in an interactive 3D scene.
3. Rotate the scene or use Top view and Perspective.
4. Select Prepare your next steps. Download the browser slide presentation and the expert discussion brief. The presentation can be printed to PDF.

## What is real and what is illustrative

- Map clicks, boundary area, interactive 3D, image capture and downloads work.
- The twelve-unit concept is prepared, not calculated feasibility. It is centered on the drawn area but does not validate fit.
- The Fast-Set Box footprint is 19 x 8 feet, as published by the manufacturer. Model height (2.65 m), exterior details and the 20-foot access aisle are illustrative assumptions.
- No zoning eligibility, parking counts, project budget or utility capacity is established.
- Expert links are official contact or verification resources, not endorsements or committed partners.

## Current requested location

The default is a study area within Lot C, beside the Grove and South Field, based on the user's Grove/McNally description and Biola's official campus map. Lot G is an alternative east of Hope/Stewart/Hart. The map can be moved and a different study boundary drawn.

## Implementation checkpoint

The static interface, model, satellite alignment, image capture, browser-slide export and expert discussion brief are implemented. Browser checks verified boundary prerequisites, sample-boundary loading, the concept reveal and presentation-download confirmation. JavaScript syntax checks pass. Deployment is managed by the existing project identity in `.openai/hosting.json`; do not create a replacement Site. See `RECORDING_GUIDE.md` for the pitch sequence.
