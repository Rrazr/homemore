# Homemore — pitch demo

A static prototype for a 90-second pitch video. Outline a surface lot anywhere, see how many small homes geometrically fit (ten housing styles from six makers and builders), set a target for people housed, and leave with a board presentation and an expert discussion brief. The fit is an illustration, never verified site feasibility.

## Run

Open PowerShell and navigate to the project folder.

Run this command:

```powershell
python -m http.server 5173 --bind 127.0.0.1 --directory dist
```

Then open [http://localhost:5173](http://localhost:5173) in your browser. Keep PowerShell open while using the demo; press **Ctrl+C** to stop the server.

If port 5173 is already occupied by the running demo, simply open the localhost link. If another application uses that port, replace `5173` with `5174` in both the command and browser URL.

No project dependency installation, API key, or build step is needed. Internet access is required for Leaflet, Three.js, fonts, Esri satellite tiles and address search. Refresh the browser after editing the files in `dist/`.

## Hosting locally and on ChatGPT

Both environments serve the same `dist/` files. No code changes, API keys, or build step are required to switch between them.

- **Local:** run the command above from the `homemore` folder, then open http://localhost:5173.
- **ChatGPT-hosted:** open https://sacred-spaces-safe-homes-demo.rrazr.chatgpt.site. The existing URL keeps its original name; the app is branded Homemore. Access follows the Site's sharing settings.

Local edits appear after refreshing your browser. The hosted version is a separately published snapshot: ask Codex to publish this project's latest changes to its existing Site to update it. Uploading source to GitHub alone does not update the ChatGPT-hosted version.

The local `.openai/hosting.json` links this checkout to the existing Site and specifies `dist` as the static directory. It is gitignored, so a fresh clone will not have it; recover it with `git show 586dd45:.openai/hosting.json` before publishing, otherwise a duplicate Site is created. It is not needed to run locally. Both versions need internet access for external libraries and satellite imagery.

## Demo flow

1. Search an address or place, or stay on the default Biola Lot C view. **Use sample boundary** in the hint loads a ready-made outline.
2. Outline a surface lot using map clicks. Three or more points make a boundary; home footprints, study area and the estimated home count appear immediately and update while you drag a corner or move the setback slider. Use Undo or Clear as needed.
3. Select Generate housing plan. The same layout appears in an interactive 3D scene. Rotate it or use Top view and Perspective.
4. In step 02, open the **Specifications** tab and **Choose a housing style** (a gallery of ten, each showing its footprint to scale and how many would fit on this boundary), set a minimum number of people to house, optionally place only the homes that target needs, and adjust the setback. The 3D concept rebuilds as you change them, and each style shows how many homes and people it would fit on this boundary.
5. Select Prepare your next steps. Download the browser slide presentation and the expert discussion brief. The presentation can be printed to PDF.

Editing the boundary in step 01 after generating marks the concept out of date; generate again to reopen steps 02 and 03. Hold the right mouse button to pan the map without placing points.

For filming, hide the hint with its × button, the **H** key, or by opening the page with `?clean=1`.

## What is real and what is illustrative

- Map clicks, address search, boundary area, the geometric fit, interactive 3D, image capture and downloads work.
- The home count is computed, not scripted: `dist/layout.js` packs the chosen design's footprint into the drawn boundary in columns facing a shared access aisle, trying every boundary edge direction and keeping the arrangement that fits the most homes. By default it places as many as fit. Defaults are a 5 ft clearance to the boundary (adjustable 0–30 ft), a 20 ft aisle in front of every door and 10 ft between back-to-back rows. These are illustration defaults, not code-compliant dimensions. Around Biola, homes, setbacks and aisles also keep clear of the traced campus buildings. The display is capped at 400 homes; larger sites report the geometric fit alongside.
- That count is a geometric estimate only. It ignores zoning, fire access and turning geometry, accessibility, utilities, grading, existing structures and parking replacement.
- Housing styles: ten, defined in `dist/layout.js` with their sources listed in `SOURCES.md`. Footprints are the makers' or builders' published figures, except the double-wide two-bedroom (19 x 16 ft, derived from two published 19 x 8 ft boxes) and the Pop-Up Cabin's 7 ft porch depth (derived from its published 134 sq ft porch). Products that publish a floor area but no exterior dimensions (Pallet, QuickHaven) were left out. Wall heights and every exterior detail in the 3D view are illustrative; none of the models is a likeness of the real product.
- Stories: the app cannot look up zoning or building codes for an address, and never assumes one. Extra stories are drawn only for styles whose maker publishes stacking (Boxabl Casita, up to three; Connect Shelter, two, reported but not confirmed on the maker's page); for any other style the tab offers a one-click switch to one that stacks. A height or story limit you type in from the zoning code caps the number. With no limit entered the stories are still drawn, and the tab, the tools and the brief all say the count has not been checked against any limit. Stacked layouts reserve room for an access gallery and stair, which are drawn as placeholders. Stair, accessibility, fire-separation, structural and seismic requirements are not evaluated, and the brief labels the entered limits as unverified. Biola is governed by its own master-plan zone (La Mirada PUD 50), so no limit is pre-filled for it.
- Fold-out homes: the Boxabl Casita arrives at its published folded width (19 x 8.5 ft) and unfolds to 19 x 19 ft in the 3D view; **Unfold again** replays it. The motion is a simple widening of the model, not the real folding mechanism.
- People housed is a per-style planning assumption: one person per bedroom or private room, two for the Boxabl studio, and four for the Better Shelter RHU, whose maker publishes a family of four to five. It is not an occupancy rating.
- Including a style is not an endorsement, and no maker is a partner. Several are emergency or interim shelters rather than permanent housing (the RHU has about a three-year lifespan; the Conestoga Hut has no plumbing).
- The 3D canvas shows simplified surrounding footprints traced from map imagery around Biola Lot C only, with approximate heights. At any other address it shows the boundary and homes on a plain ground. It does not display satellite imagery.
- No zoning eligibility, parking counts, project budget or utility capacity is established.
- Expert links are official contact or verification resources, not endorsements or committed partners. Away from Biola the local contacts are generic, and the licensing directories remain California's.
- Address search sends the typed query to OpenStreetMap's Nominatim service, only when Search is pressed.

## Utilities view

**⚡ Utilities** in the 3D toolbar turns the homes see-through and draws schematic water (blue), sewer (green) and power (amber): a main under each aisle, a branch to every home, a collector joining the mains, and a run to an **assumed** connection point on the boundary (dark pin). Inside each home it shows a wet core, risers that continue through stacked floors, a panel and ceiling conduit. Only the services a style really has are drawn: the Conestoga Hut and Better Shelter RHU have none, and the LIHI Tiny House and BOSS Cubez are power-only. The legend gives approximate run lengths. Nothing here is engineering: real mains, capacity, pipe sizes and sewer slopes are unknown to the app, and the legend and brief say so.

## Arrange by hand

**✥ Arrange** lets you drag homes across the site, Finch3D-style. A home turns green when selected and red where it will not fit (inside the setback, over another home, over a traced building, or outside the boundary); dropping it on red puts it back. **⟳ Turn** (or R) rotates a quarter turn, **Remove** (or Delete) takes it out, **+ Add home** drops one in the nearest free spot, and **Reset to auto-fit** discards the edits. Counts, people, the map footprints, utilities, slides and brief all follow. Access aisles are not checked for hand-placed homes, and the brief states that the arrangement was made by hand. Changing the boundary or a specification runs the automatic fit again and replaces hand edits.

## Model tools

Inside a host that exposes WebMCP (`navigator.modelContext`), the page registers `load_sample_boundary`, `search_address`, `set_boundary`, `set_layout_options` (design, minimum people, only-homes-needed, stories, entered height and story limits, setback), `get_site_summary` and `generate_concept`. Every result carries the same numbers, assumptions and disclaimer as the UI. The same functions are available in any browser console as `window.homemore`. Tool registration has not yet been verified inside the ChatGPT-hosted Site.

## Checks

```powershell
node tools/check-layout.mjs
```

Asserts, without dependencies, that every placed home and its aisle stay inside the boundary at the chosen setback, homes never overlap, doors face their aisle, the count never rises as the setback grows, winding and start point do not matter, and crossed, tiny or oversized boundaries are handled. The browser flow (draw, drag, search, generate, export, tool input validation) was checked by hand.

## Walkthrough

On the first visit in a browser session, a ghost cursor zooms to the sample lot, clicks four corners and shows homes filling the outline. It only draws preview layers: the real boundary and the numbers are untouched, and any click, drag or zoom on the map ends it. **▶ Show me how** in the hint replays it. It does not autoplay with `?clean=1` or when the visitor prefers reduced motion.

## Hosting on Vercel

Connect this repository with the project root set to the repository root. The checked-in `vercel.json` sets the framework to Other, skips the build step, and serves `dist/` as the output directory. Deployments from GitHub will use those settings automatically. The `dist/` folder must remain committed because it is the website itself, not generated build output.
