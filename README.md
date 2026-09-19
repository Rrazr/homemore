# Homemore — pitch demo

This is a deliberately scripted prototype for a 90-second pitch video. The full MVP plan in the conversation remains unchanged.

## Run

Open PowerShell and navigate to the project folder.

Run this command:

```powershell
python -m http.server 5173 --bind 127.0.0.1 --directory dist
```

Then open [http://localhost:5173](http://localhost:5173) in your browser. Keep PowerShell open while using the demo; press **Ctrl+C** to stop the server.

If port 5173 is already occupied by the running demo, simply open the localhost link. If another application uses that port, replace `5173` with `5174` in both the command and browser URL.

No project dependency installation, API key, or build step is needed. Internet access is required for Leaflet, Three.js, fonts and Esri satellite tiles. Refresh the browser after editing the files in `dist/`.

## Hosting locally and on ChatGPT

Both environments serve the same `dist/` files. No code changes, API keys, or build step are required to switch between them.

- **Local:** run the command above from the `homemore` folder, then open http://localhost:5173.
- **ChatGPT-hosted:** open https://sacred-spaces-safe-homes-demo.rrazr.chatgpt.site. The existing URL keeps its original name; the app is branded Homemore. Access follows the Site's sharing settings.

Local edits appear after refreshing your browser. The hosted version is a separately published snapshot: ask Codex to publish this project's latest changes to its existing Site to update it. Uploading source to GitHub alone does not update the ChatGPT-hosted version.

The local `.openai/hosting.json` links this checkout to the existing Site and specifies `dist` as the static directory. Preserve that file for future publication; it is not needed to run a GitHub clone locally. Both versions need internet access for external libraries and satellite imagery.

## Demo flow

1. Outline a surface lot using map clicks. Three or more points automatically highlight the area and enable generation. Drag corners to resize the boundary; use Undo or Clear as needed.
2. Select Generate housing plan. The prepared twelve-unit scenario appears in an interactive 3D scene.
3. Rotate the scene or use Top view and Perspective.
4. Select Prepare your next steps. Download the browser slide presentation and the expert discussion brief. The presentation can be printed to PDF.

## What is real and what is illustrative

- Map clicks, boundary area, interactive 3D, image capture and downloads work.
- The twelve-unit concept is prepared, not calculated feasibility. It is centered on the drawn area but does not validate fit.
- The Fast-Set Box footprint is 19 x 8 feet, as published by the manufacturer. Model height (2.65 m) and exterior details are illustrative assumptions.
- The separate 3D canvas uses simplified surrounding footprints traced from the map imagery. Surrounding building heights are approximate; the scene does not display satellite imagery or a proposed access aisle.
- No zoning eligibility, parking counts, project budget or utility capacity is established.
- Expert links are official contact or verification resources, not endorsements or committed partners.

## Current requested location

The default is a study area within Lot C, beside the Grove and South Field, based on the user's Grove/McNally description and Biola's official campus map. Lot G is an alternative east of Hope/Stewart/Hart. The map can be moved and a different study boundary drawn.

## Implementation checkpoint

The static interface, model, satellite alignment, image capture, browser-slide export and expert discussion brief are implemented. Browser checks verified boundary prerequisites, sample-boundary loading, the concept reveal and presentation-download confirmation. JavaScript syntax checks pass. Deployment is managed by the existing project identity in `.openai/hosting.json`; do not create a replacement Site. See `RECORDING_GUIDE.md` for the pitch sequence.

## Hosting on Vercel

Connect this repository with the project root set to the repository root. The checked-in `vercel.json` sets the framework to Other, skips the build step, and serves `dist/` as the output directory. Deployments from GitHub will use those settings automatically. The `dist/` folder must remain committed because it is the website itself, not generated build output.

