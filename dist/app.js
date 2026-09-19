import {SPEC,DESIGNS,computeLayout,summarize,makeProjector,feetToMetres,withUnits,findSpot} from './layout.js?v=fit-14';
import {siteContext} from './site-context.js';
const $=s=>document.querySelector(s);
// Traced campus buildings: the fit keeps homes, setbacks and aisles clear of them.
const obstacles=siteContext.filter(f=>f.kind==='building').map(f=>f.coordinates);
let map,polygon,line,footprints,searchPin,markers=[],points=[],closed=false,step=0,busy=false,threeModule,sceneController;
// layout = live geometric fit for the boundary on the map; snapshot = the fit the 3D scene and documents were built from.
let layout=computeLayout([]),snapshot=null,stale=false,setbackFt=5,searched=null,warnedFar=false;
// Specifications chosen in step 02. minPeople 0 = no target; onlyNeeded places just the homes the target needs.
// stories is a request; layout.js grants it for stackable styles, capped by any local limit the user types in.
const specs={design:'box',minPeople:0,onlyNeeded:false,stories:1,heightLimitFt:null,storyLimit:null};
let sideTab='concept',rebuildTimer,rebuildQueued=false,utilitiesOn=false,arranging=false;
const layoutOptions=(design=specs.design)=>({design,obstacles,stories:specs.stories,heightLimitFt:specs.heightLimitFt??undefined,storyLimit:specs.storyLimit??undefined,setbackM:feetToMetres(setbackFt),limit:specs.onlyNeeded&&specs.minPeople>0?Math.ceil(specs.minPeople/DESIGNS[design].peoplePerHome):undefined});
let hintDismissed=new URLSearchParams(location.search).has('clean');
const preset=[[33.9037443,-118.0165491],[33.9036163,-118.0163137],[33.9033157,-118.0165509],[33.9034437,-118.0167863]];
const biola={center:[33.90353,-118.01655],label:'Biola University, 13800 Biola Avenue, La Mirada, CA'};
const sourceLinks={manufacturer:'https://outoftheboxhousing.com/modular-info-pricing/',planning:'https://www.cityoflamirada.org/departments/community-development',facilities:'https://www.biola.edu/facilities-management',lawyer:'https://www.calbar.ca.gov/public/find-legal-professionals/find-lawyer-referral-service',engineer:'https://www.bpelsg.ca.gov/consumers/lic_lookup',architect:'https://www.cab.ca.gov/cons/archs/lic_search.shtml'};
const disclaimer='PRELIMINARY FEASIBILITY STUDY — NOT FINAL LEGAL, ARCHITECTURAL, OR FINANCIAL ADVICE. REQUIRES LICENSED PROFESSIONAL REVIEW.';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const metresBetween=(a,b)=>{const p=makeProjector(a).toLocal(b);return Math.hypot(p[0],p[1])};
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),3500)}

// Where the study area is: the traced Biola campus, a searched address, or plain coordinates.
function describeSite(center){
 if(metresBetween(biola.center,center)<600)return {label:biola.label,nearBiola:true};
 if(searched&&metresBetween([searched.lat,searched.lng],center)<500)return {label:searched.label,nearBiola:false};
 return {label:`Study area near ${center[0].toFixed(5)}, ${center[1].toFixed(5)}`,nearBiola:false};
}

const fitNotes={
 incomplete:'Click at least three points around a surface lot.',
 'self-intersecting':'Boundary lines cross. Drag a corner or undo the last point.',
 'no-fit':'Too small for a home at this setback. Widen the boundary or reduce the setback.',
 'too-large':'This study area is too large. Outline a single lot.'
};
function updateFit(){
 if(step!==0||!$('#fit-homes'))return;
 const s=summarize(layout),drawn=layout.status==='ok'||layout.status==='no-fit';
 $('#fit-area').textContent=drawn?`${s.areaSqFt.toLocaleString()} sq ft`:'—';
 $('#fit-homes').textContent=drawn?s.homes:'—';
 $('#fit-style').textContent=s.designName;
 $('#fit-note').textContent=fitNotes[layout.status]??(s.capped?`Showing a first phase of ${s.homes} homes; the area fits about ${s.geometricFit}. A geometric estimate, not site feasibility.`:s.limited?`Placing the ${s.homes} homes your target needs; the area fits about ${s.geometricFit}. A geometric estimate, not site feasibility.`:`Fits ${s.designName} footprints (${s.unitFootprint}) around a ${s.aisleFt} ft access aisle. A geometric estimate, not site feasibility.`);
 $('#generate').disabled=!layout.count||busy;
}
// lock = a corner is being dragged: hold the current arrangement so the homes slide instead of flipping.
function recompute(lock=false){
 if(layout.custom)toast('The automatic fit replaced your hand-placed homes.');
 layout=computeLayout(points,{...layoutOptions(),lock},layout);
 if(map){
  if(!footprints)footprints=L.polygon([],{color:'#ffffff',weight:1.5,fillColor:'#eaf7e4',fillOpacity:.85,interactive:false}).addTo(map);
  footprints.setLatLngs(layout.footprintsLatLng.map(ring=>[ring])); // one multipolygon, not one polygon with holes
 }
 if(snapshot&&!stale){stale=true;refreshSteps()}
 if(layout.status==='ok'&&!warnedFar&&!describeSite(layout.center).nearBiola){warnedFar=true;toast('Surrounding buildings are only traced around Biola Lot C. Elsewhere the 3D view shows your boundary and homes.')}
 updateFit();updateHint();
}
function side(){
 if(step===0){
  $('#side-content').innerHTML=`<button id="pick-style" class="metric-line style-pick" aria-haspopup="dialog"><span>Housing style</span><strong id="fit-style" class="style-name"></strong><em>Change</em></button><div class="metric-line"><span>Study area</span><strong id="fit-area">—</strong></div><div class="metric-line"><span>Estimated homes</span><strong id="fit-homes">—</strong></div><label class="setback"><span>Boundary setback <strong id="setback-value">${setbackFt} ft</strong></span><input id="setback" type="range" min="0" max="30" step="1" value="${setbackFt}"></label><p id="fit-note" class="side-note"></p><button id="generate" class="primary" disabled>Generate housing plan <span>↗</span></button>`;
  $('#generate').onclick=generate;
  $('#pick-style').onclick=openGallery;
  $('#setback').oninput=e=>setSetback(Number(e.target.value));
  updateFit();
 }else if(step===1){
  $('#side-content').innerHTML=`<div class="tabs" role="tablist">${[['concept','Concept'],['specs','Specifications']].map(([id,label])=>`<button role="tab" data-tab="${id}" aria-selected="${sideTab===id}">${label}</button>`).join('')}</div>${sideTab==='specs'?specsPanel():conceptPanel()}<button id="next" class="primary">Prepare your next steps <span>↗</span></button>`;
  document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{sideTab=b.dataset.tab;side()});
  $('#next').onclick=()=>setStep(2);
  if(sideTab==='specs')bindSpecs();
  updateSpecs();
 }else{
  $('#side-content').innerHTML=`<div class="side-label">READY FOR A CONVERSATION</div><div class="address">A vision you can share.<small>A scope experts can review.</small></div><p class="side-note">Download the concept presentation and an expert discussion brief. Every document keeps assumptions and open questions visible.</p><div class="readiness"><strong>Human review comes next</strong>Drafts require leadership review and board sign-off before external release.</div><button id="back-concept" class="primary">Return to your concept <span>↗</span></button>`;
  $('#back-concept').onclick=()=>setStep(1);
 }
}
function conceptPanel(){
 const s=snapshot.summary;
 return `<div class="side-profile"><div class="profile-swatch">⌂</div><div><strong>${s.designName}</strong><small>${s.maker}</small></div></div><a class="source-link" href="${s.sourceUrl}" target="_blank" rel="noopener">View published specifications ↗</a><div class="metric-line"><span>Footprint</span><strong>${s.unitFootprint}</strong></div><div class="metric-line"><span>Estimated fit</span><strong>${s.homes} homes</strong></div>${s.stories>1?`<div class="metric-line"><span>Stories</span><strong>${s.stories} · ${s.footprints} stacks</strong></div>`:''}<div class="metric-line"><span>People housed</span><strong>about ${s.people}</strong></div><div class="metric-line"><span>Setback · aisle</span><strong>${s.setbackFt} ft · ${s.aisleFt} ft</strong></div><div class="readiness"><strong>A concept to explore</strong>Placement and access are illustrative. Zoning, fire access and utility capacity need professional review.</div><p class="side-note">Model height and exterior details are illustrative. Home and people counts are estimates, not site feasibility or an occupancy rating.</p>`;
}
function specsPanel(){
 return `<div class="side-label">HOUSING STYLE</div><div id="style-current" class="design current"></div><button id="choose-style" class="secondary">Choose a housing style <span>${Object.keys(DESIGNS).length} options</span></button><div class="side-label">STORIES</div><div class="segmented" role="radiogroup" aria-label="Stories wanted">${[1,2,3].map(n=>`<button role="radio" data-stories="${n}" aria-checked="false">${n}</button>`).join('')}</div><label class="spec-field"><span>Local height limit (ft)</span><input id="height-limit" type="number" min="0" max="200" step="1" inputmode="numeric" placeholder="Zoning code" value="${specs.heightLimitFt??''}"></label><label class="spec-field"><span>Local story limit</span><input id="story-limit" type="number" min="0" max="10" step="1" inputmode="numeric" placeholder="If any" value="${specs.storyLimit??''}"></label><p id="story-status" class="spec-status"></p><div id="story-switch" class="story-switch" hidden></div><div class="side-label">PEOPLE AND SPACING</div><label class="spec-field"><span>Minimum people housed</span><input id="min-people" type="number" min="0" max="500" step="1" inputmode="numeric" placeholder="No target" value="${specs.minPeople||''}"></label><label class="spec-check"><input id="only-needed" type="checkbox" ${specs.onlyNeeded?'checked':''}> Place only the homes this target needs</label><label class="setback"><span>Boundary setback <strong id="setback-value">${setbackFt} ft</strong></span><input id="setback" type="range" min="0" max="30" step="1" value="${setbackFt}"></label><p id="spec-status" class="spec-status" role="status"></p><p class="side-note">People housed is a planning assumption per style, not an occupancy rating.</p>`;
}
// Top-view footprint drawn to one shared scale, so the styles can be compared at a glance.
function footprintIcon(d){
 const scale=3.4,w=d.unitWidth*scale,h=d.unitLength*scale,porch=d.porch*scale,x=(52-w)/2,y=(52-h-porch)/2+porch;
 return `<svg viewBox="0 0 52 52" width="52" height="52" aria-hidden="true">${porch?`<rect x="${x}" y="${y-porch}" width="${w}" height="${porch}" fill="#e7d9c0"/>`:''}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="#cfe3d6" stroke="#2f6a58" stroke-width="1"/></svg>`;
}
const fitFor=id=>summarize(computeLayout(points,{...layoutOptions(id),limit:undefined}));
function openGallery(){
 const dialog=$('#style-gallery');
 $('#style-grid').innerHTML=Object.values(DESIGNS).map(d=>{
  const fit=fitFor(d.id);
  return `<button class="style-card" data-design="${d.id}" aria-pressed="${d.id===specs.design}">${footprintIcon(d)}<span class="style-body"><strong>${d.name}</strong><small>${d.maker}</small><span class="style-blurb">${d.blurb}</span><span class="style-facts">${d.footprint} · ${d.sqFt} sq ft · ${d.peoplePerHome} ${d.peoplePerHome>1?'people':'person'} each</span><span class="style-fit">${fit.homes?`Fits ${fit.homes} here · about ${fit.people} people`:fit.status==='incomplete'?'Draw a boundary to see how many fit':'Does not fit this boundary'}</span><span class="style-tag${d.derived?' derived':''}">${d.derived?'Footprint derived from published parts':'Published footprint'}</span>${d.foldRatio?'<span class="style-tag feature">Folds out on site</span>':''}${d.maxStories>1?`<span class="style-tag feature">Stackable to ${d.maxStories}</span>`:''}</span></button>`;
 }).join('');
 document.querySelectorAll('.style-card').forEach(b=>b.onclick=()=>{specs.design=b.dataset.design;dialog.close();specsChanged()});
 dialog.showModal();
}
$('#gallery-close').onclick=()=>$('#style-gallery').close();
$('#style-gallery').onclick=e=>{if(e.target===e.currentTarget)e.currentTarget.close()}; // click on the backdrop
function bindSpecs(){
 $('#choose-style').onclick=openGallery;
 document.querySelectorAll('[data-stories]').forEach(b=>b.onclick=()=>{specs.stories=Number(b.dataset.stories);specsChanged()});
 const limit=(key,max)=>e=>{const value=Math.min(max,Math.floor(Number(e.target.value)||0));specs[key]=value>0?value:null;specsChanged(350)};
 $('#height-limit').oninput=limit('heightLimitFt',200);$('#story-limit').oninput=limit('storyLimit',10);
 $('#min-people').oninput=e=>{specs.minPeople=Math.min(500,Math.max(0,Math.floor(Number(e.target.value)||0)));specsChanged(350)};
 $('#min-people').onchange=e=>{e.target.value=specs.minPeople||''}; // show the clamped value
 $('#only-needed').onchange=e=>{specs.onlyNeeded=e.target.checked;specsChanged()};
 $('#setback').oninput=e=>setSetback(Number(e.target.value));
}
// Says how many stories are drawn and exactly what held the number down. Limits are the user's own entries.
function storyNote(s){
 const entered=[specs.heightLimitFt?`${specs.heightLimitFt} ft height limit`:'',specs.storyLimit?`${specs.storyLimit}-story limit`:''].filter(Boolean).join(' and ');
 if(s.storiesWanted===1)return 'Single story. Pick 2 or 3 to stack a style whose maker publishes stacking.';
 if(s.storiesHeldBy==='style')return s.maxStoriesForStyle>1?`Held to ${s.stories}: ${s.designName} stacks to ${s.maxStoriesForStyle} at most.`:`${s.designName} is single-story: its maker does not publish stacking. Switch to a style that stacks:`;
 if(s.storiesHeldBy==='height')return `Held to ${s.stories}: a ${specs.heightLimitFt} ft limit allows ${s.stories} ${s.stories>1?'stories':'story'} of about ${s.storyHeightFt} ft.`;
 if(s.storiesHeldBy==='story-limit')return `Held to ${s.stories} by the story limit you entered.`;
 if(s.storiesUnchecked)return `${s.stories} stories drawn, about ${s.storyHeightFt} ft each. No local limit entered, so this has not been checked against any height limit. Add one below to cap it.`;
 return `${s.stories} stories, within the ${entered} you entered (about ${s.storyHeightFt} ft per story). Unverified: stacked homes add stair, accessibility, fire and structural requirements.`;
}
// Refreshes the Specifications tab in place, so inputs keep focus while the numbers change.
function updateSpecs(){
 if(step!==1)return;
 if($('#next'))$('#next').disabled=stale||busy;
 if(!$('#spec-status'))return;
 const s=summarize(layout),d=layout.design;
 $('#style-current').innerHTML=`${footprintIcon(d)}<span><strong>${d.name}</strong><small>${d.maker} · ${d.footprint} · ${d.peoplePerHome} ${d.peoplePerHome>1?'people':'person'} each</small></span>`;
 document.querySelectorAll('[data-stories]').forEach(b=>b.setAttribute('aria-checked',Number(b.dataset.stories)===specs.stories));
 $('#story-status').textContent=storyNote(s);$('#story-status').classList.toggle('short',!!s.storiesHeldBy||s.storiesUnchecked);
 const offer=s.storiesHeldBy==='style'&&s.maxStoriesForStyle===1;$('#story-switch').hidden=!offer;
 if(offer){$('#story-switch').innerHTML=Object.values(DESIGNS).filter(d=>d.maxStories>1).map(d=>`<button data-switch="${d.id}">Use ${d.name}</button>`).join('');document.querySelectorAll('[data-switch]').forEach(b=>b.onclick=()=>{specs.design=b.dataset.switch;specsChanged()})}
 const status=$('#spec-status'),target=specs.minPeople;let short=false,text;
 if(!layout.count){short=true;text=`No ${s.designPlural} fit this boundary at a ${s.setbackFt} ft setback. The 3D view still shows the previous concept.`}
 else if(!target)text=`About ${s.people} people in ${s.homes} homes.`;
 else if(s.peopleIfAllFit>=target)text=`Meets the target: about ${s.people} people in ${s.homes} homes.${s.limited?` The area fits up to ${s.geometricFit} homes.`:''}`;
 else{
  short=true;
  // Only worked out when the target is missed: fitting every style is the slow part on big lots.
  const better=Object.keys(DESIGNS).map(fitFor).filter(f=>f.people>=target).sort((a,b)=>b.people-a.people)[0];
  text=`Short of the target: this style houses about ${s.peopleIfAllFit} here. ${better?`${better.designName} would house about ${better.people}.`:'No style reaches it on this boundary; widen the study area in step 01.'}`;
 }
 status.textContent=text;status.classList.toggle('short',short);
}
// A specification changed: refit now, and rebuild the 3D concept when it is the one on screen.
function specsChanged(delay=0){
 recompute();updateSpecs();
 if(step!==1)return;
 clearTimeout(rebuildTimer);rebuildTimer=setTimeout(rebuild,delay);
}
function setSetback(feet){
 setbackFt=Math.min(30,Math.max(0,Math.round(feet)));
 if($('#setback')){$('#setback').value=setbackFt;$('#setback-value').textContent=`${setbackFt} ft`}
 specsChanged(250);
}
function updateBoundary(lock=false){
 closed=points.length>=3;
 if(polygon){map.removeLayer(polygon);polygon=null}if(line){map.removeLayer(line);line=null}
 if(closed)polygon=L.polygon(points,{color:'#d8ffc4',weight:3,fillColor:'#b9efac',fillOpacity:.2,interactive:false}).addTo(map);
 else if(points.length>1)line=L.polyline(points,{color:'#d8ffc4',weight:3,interactive:false}).addTo(map);
 $('#undo').disabled=$('#clear').disabled=points.length===0;
 recompute(lock);
 if(footprints)footprints.bringToFront();
}
function redraw(){
 if(!map)return;
 stopTutorial();
 markers.forEach(m=>map.removeLayer(m));
 // Points were added or removed, so edge indices changed: drop the held arrangement.
 layout=computeLayout([]);
 markers=points.map((p,i)=>{
  const marker=L.marker(p,{draggable:true,bubblingMouseEvents:false,title:`Drag boundary point ${i+1}`,icon:L.divIcon({className:'boundary-point',html:'',iconSize:[18,18],iconAnchor:[9,9]})}).addTo(map);
  marker.on('drag',()=>{const p=marker.getLatLng();points[i]=[p.lat,p.lng];updateBoundary(true)});
  marker.on('dragend',()=>updateBoundary());
  marker.on('click',e=>L.DomEvent.stopPropagation(e.originalEvent));
  return marker;
 });
 updateBoundary();
}
function initMap(){
 if(!window.L){$('#map-error').hidden=false;toast('Map library could not load. Reconnect and refresh.');return}
 map=L.map('map',{zoomControl:false,doubleClickZoom:false}).setView(biola.center,18);L.control.zoom({position:'topright'}).addTo(map);
 const tiles=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'Tiles © Esri · Maxar · Earthstar Geographics',maxZoom:20,crossOrigin:true}).addTo(map);
 map.attributionControl.addAttribution('Search © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>');
 let loaded=false;tiles.on('tileload',()=>{loaded=true;$('#map-error').hidden=true});tiles.on('tileerror',()=>{if(!loaded)$('#map-error').hidden=false});
 map.on('click',e=>{$('#search-results').hidden=true;if(step||busy)return;points.push([e.latlng.lat,e.latlng.lng]);redraw()});
 map.on('mousedown zoomstart',stopTutorial);
 map.getContainer().style.cursor='crosshair';
 // Holding the right button pans the map, so looking around never places a boundary point.
 const surface=map.getContainer();let grip=null;
 surface.addEventListener('contextmenu',e=>e.preventDefault());
 surface.addEventListener('mousedown',e=>{if(e.button!==2)return;e.preventDefault();grip=[e.clientX,e.clientY];surface.style.cursor='grabbing'});
 addEventListener('mousemove',e=>{if(!grip)return;map.panBy([grip[0]-e.clientX,grip[1]-e.clientY],{animate:false});grip=[e.clientX,e.clientY]});
 addEventListener('mouseup',e=>{if(!grip||e.button!==2)return;grip=null;surface.style.cursor='crosshair'});
 addEventListener('blur',()=>{if(grip){grip=null;surface.style.cursor='crosshair'}});
 const mapResizeObserver=new ResizeObserver(()=>{if(!$('#map').hidden)map.invalidateSize()});mapResizeObserver.observe($('#map'));
}
$('#undo').onclick=()=>{points.pop();redraw()};$('#clear').onclick=()=>{points=[];redraw()};
function loadSampleBoundary(){
 if(!map)throw new Error('The map is not available');
 if(step)setStep(0);
 points=preset.map(p=>[...p]);redraw();map.fitBounds(points,{padding:[100,100],maxZoom:19});
 toast('Sample boundary loaded. Drag a corner to see the homes re-fit.');
}

// Address search (OpenStreetMap Nominatim). Runs only on submit, never per keystroke, per its usage policy.
async function searchAddress(query){
 const response=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`,{headers:{Accept:'application/json'}});
 if(!response.ok)throw new Error(`Address search failed (${response.status})`);
 return (await response.json()).map(r=>({label:r.display_name,lat:Number(r.lat),lng:Number(r.lon)})).filter(r=>Number.isFinite(r.lat)&&Number.isFinite(r.lng));
}
function goTo(place){
 if(!map)throw new Error('The map is not available');
 if(step)setStep(0);
 stopTutorial();searched=place;$('#search-results').hidden=true;$('#address').value=place.label;
 // A boundary left behind at the previous location would sit off-screen and still drive the numbers.
 if(points.length&&metresBetween(points[0],[place.lat,place.lng])>1000){points=[];redraw()}
 if(searchPin)map.removeLayer(searchPin);
 searchPin=L.circleMarker([place.lat,place.lng],{radius:7,color:'#ffffff',weight:2,fillColor:'#1d6654',fillOpacity:1,interactive:false}).addTo(map);
 map.setView([place.lat,place.lng],18);
}
$('#map-search').onsubmit=async e=>{
 e.preventDefault();
 const query=$('#address').value.trim(),list=$('#search-results');if(!query)return;
 $('#search-go').disabled=true;
 try{
  const places=await searchAddress(query);
  list.replaceChildren(...places.map(place=>{const li=document.createElement('li'),button=document.createElement('button');button.type='button';button.textContent=place.label;button.onclick=()=>goTo(place);li.append(button);return li}));
  if(!places.length){const li=document.createElement('li');li.className='empty';li.textContent='No matching address found.';list.append(li)}
  list.hidden=false;
  if(places.length===1)goTo(places[0]);
 }catch(error){console.error(error);toast('Address search is unavailable. Check your connection and try again.')}
 finally{$('#search-go').disabled=false}
};

async function buildScene(keep=false){
 const pending={layout,summary:summarize(layout),site:describeSite(layout.center),target:specs.minPeople,limits:{heightLimitFt:specs.heightLimitFt,storyLimit:specs.storyLimit}};
 threeModule??=import('./scene.js?v=fit-14');
 const mod=await threeModule;
 const view=keep?sceneController?.getView():null;
 if(sceneController){sceneController.dispose();sceneController=null}
 $('#three-view').hidden=false;
 sceneController=await mod.createScene($('#three-view'),points,pending.layout,{view,instant:keep,onEdit:applyEdit,onSelect:renderArrangeBar});
 snapshot=pending;stale=false;$('#orbit').classList.add('selected');
 snapshot.utilities=sceneController.utilities;sceneController.showUtilities(utilitiesOn);renderUtilityLegend();
 if(!keep)arranging=false;sceneController.setArranging(arranging);renderArrangeBar();if(keep)$('#orbit').classList.remove('selected');
 renderResults();
}
async function generate(){
 if(!layout.count||busy)return;
 busy=true;$('#loading').hidden=false;$('#generate').disabled=true;
 const s=summarize(layout);
 $('#loading-copy').textContent='Fitting homes to your boundary';
 try{
  await pause(350);
  $('#loading-copy').textContent=`Placing ${s.homes} ${s.designPlural} inside your boundary`;
  await buildScene();await pause(250);
  setStep(1);
 }catch(e){
  console.error(e);threeModule=null; // a failed import must not be cached, or every retry fails
  if(!sceneController)snapshot=null;
  toast('The 3D view could not load. Check your connection and try again.');$('#three-view').hidden=true;
 }finally{$('#loading').hidden=true;busy=false;updateFit();updateSpecs()}
}
// Rebuilds the concept on screen after a specification change; a no-fit keeps the previous concept visible.
async function rebuild(){
 if(busy){rebuildQueued=true;return}
 if(step!==1||!stale||!layout.count)return;
 busy=true;updateSpecs();
 try{await buildScene();refreshSteps();if(sideTab==='concept')side()}
 catch(e){console.error(e);threeModule=null;toast('The 3D view could not update. Check your connection and try again.')}
 finally{busy=false;updateSpecs();if(rebuildQueued){rebuildQueued=false;rebuild()}}
}
const canOpen=n=>n===0||(!!sceneController&&!!snapshot&&!stale);
function refreshSteps(){document.querySelectorAll('.step').forEach((b,i)=>{b.classList.toggle('active',i===step);b.disabled=!canOpen(i);b.onclick=()=>setStep(i)})}
function updateHint(){$('#map-hint').hidden=step!==0||hintDismissed||closed}
function setStep(n){
 if(!canOpen(n))return;stopTutorial();step=n;
 $('.workspace').classList.toggle('delivery',n===2);$('#map').hidden=n!==0;$('#three-view').hidden=n===0;$('#map-toolbar').hidden=n!==0;$('#map-search').hidden=n!==0;$('#scene-toolbar').hidden=n!==1;$('#scene-label').hidden=n===0;$('#legend').hidden=n!==1;$('#results').hidden=n!==1;$('#deliverables').hidden=n!==2;
 refreshSteps();side();updateHint();renderUtilityLegend();renderArrangeBar();
 if(n===0&&map)requestAnimationFrame(()=>map.invalidateSize());
 if(n===2)renderDeliverables();
 setTimeout(()=>sceneController?.resize(),40);
}
$('#orbit').onclick=()=>{const active=sceneController?.toggleOrbit();$('#orbit').classList.toggle('selected',active)};$('#top').onclick=()=>{sceneController?.top();$('#orbit').classList.remove('selected')};$('#perspective').onclick=()=>sceneController?.perspective();$('#replay').onclick=()=>sceneController?.replay();$('#capture').onclick=()=>{const a=document.createElement('a');a.download='homemore-concept.png';a.href=sceneController.capture();a.click();toast('Concept image downloaded')};
// Arrange mode (step 02): drag homes by hand, turn, add or remove them. Edits live in the layout until the next
// automatic fit (a boundary or specification change) replaces them.
function commitLayout(next){
 layout=next;if(footprints)footprints.setLatLngs(layout.footprintsLatLng.map(ring=>[ring]));
 snapshot={...snapshot,layout,summary:summarize(layout),utilities:sceneController.utilities};stale=false;
 renderResults();renderUtilityLegend();if(sideTab==='concept')side();else updateSpecs();renderArrangeBar();
}
function applyEdit(units){commitLayout(withUnits(layout,units.map(unit=>({...unit}))))}
async function editUnits(units,selectIndex=-1){
 if(busy)return;busy=true;
 try{layout=withUnits(layout,units);await buildScene(true);if(selectIndex>=0)sceneController.select(selectIndex);commitLayout(layout)}
 catch(e){console.error(e);toast('The 3D view could not update. Try again.')}
 finally{busy=false;updateSpecs()}
}
function renderArrangeBar(){
 const bar=$('#arrange-bar');bar.hidden=!arranging||step!==1;$('#arrange').classList.toggle('selected',arranging);
 if(bar.hidden)return;
 const picked=sceneController?.selected??-1;
 $('#arrange-status').textContent=picked>=0?`Home ${String(picked+1).padStart(2,'0')} selected. Drag it, or use the buttons.`:'Drag a home to move it. Red means it will not fit there.';
 $('#arrange-rotate').disabled=$('#arrange-remove').disabled=picked<0;$('#arrange-reset').disabled=!layout.custom;
}
const arrangeActions={
 toggle(){if(!sceneController||stale)return;arranging=sceneController.setArranging(!arranging);if(arranging)$('#orbit').classList.remove('selected');renderArrangeBar()},
 rotate(){const result=sceneController?.rotateSelected();if(result==='blocked')toast('It will not fit turned that way here.')},
 remove(){const picked=sceneController?.selected??-1;if(picked<0)return;if(layout.units.length===1){toast('Keep at least one home.');return}editUnits(layout.units.filter((_,k)=>k!==picked))},
 add(){const spot=findSpot(layout);if(!spot){toast('No free spot is left inside the boundary.');return}editUnits([...layout.units.map(unit=>({...unit})),spot],layout.units.length)},
 reset(){if(!layout.custom)return;layout={...layout,custom:false};recompute();rebuild()}
};
$('#arrange').onclick=arrangeActions.toggle;$('#arrange-rotate').onclick=arrangeActions.rotate;$('#arrange-remove').onclick=arrangeActions.remove;$('#arrange-add').onclick=arrangeActions.add;$('#arrange-reset').onclick=arrangeActions.reset;
document.addEventListener('keydown',e=>{
 if(!arranging||step!==1||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)||$('#style-gallery').open)return;
 if(e.key.toLowerCase()==='r'){e.preventDefault();arrangeActions.rotate()}
 else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();arrangeActions.remove()}
 else if(e.key==='Escape')sceneController?.select(-1);
});
const serviceNames={water:['Water','#2f80ed'],sewer:['Sewer','#2f9e6b'],power:['Power','#f2a93b']};
function renderUtilityLegend(){
 const legend=$('#utility-legend');legend.hidden=!utilitiesOn||step!==1||!snapshot;$('#utilities').classList.toggle('selected',utilitiesOn);
 if(legend.hidden)return;
 const routes=snapshot.utilities,s=snapshot.summary;
 const rows=Object.entries(serviceNames).map(([key,[name,color]])=>{const r=routes.services[key];return `<div class="utility-row${r?'':' none'}"><i style="background:${color}"></i><strong>${name}</strong><span>${r?`≈ ${(r.mainFt+r.branchFt).toLocaleString()} ft of run · ${routes.connections} connections`:'not part of this style'}</span></div>`}).join('');
 legend.innerHTML=`<div class="eyebrow">UTILITIES · SCHEMATIC</div>${rows}${routes.note?`<p>${routes.note}</p>`:''}<p>Routes run to an <strong>assumed</strong> connection point (dark pin)${s.stories>1?'; risers continue through stacked floors':''}. Real mains, capacity, pipe sizes and sewer slopes need a civil and MEP engineer.</p>`;
}
$('#utilities').onclick=()=>{utilitiesOn=!utilitiesOn;sceneController?.showUtilities(utilitiesOn);renderUtilityLegend()};
function renderResults(){
 const s=snapshot.summary;
 $('#scene-label p').textContent=`${s.homes} ${s.designPlural}${s.stories>1?` on ${s.stories} stories`:''} · geometric estimate for your boundary`;
 $('#replay').textContent=sceneController?.foldsOut?'▶ Unfold again':'▶ Replay build';
 $('#results').innerHTML=`<div class="result"><label>Estimated fit</label><strong>${s.homes} <span style="font-size:15px;letter-spacing:0">homes</span></strong><small>${s.stories>1?`${s.footprints} stacks × ${s.stories} stories · `:''}Geometric estimate, not site yield</small></div><div class="result"><label>People housed</label><strong>~${s.people}</strong><small>Planning assumption · not an occupancy rating</small></div><div class="result"><label>Professional review</label><strong>Required</strong><small>Zoning · utilities · life safety</small></div>`;
}
function contactRows(){
 const local=snapshot.site.nearBiola
  ?[['Campus coordination','Biola Facilities Management','Site access, campus operations and utility records.',sourceLinks.facilities,'Contact facilities'],['Planning review','City of La Mirada','Ask about the proposed use, campus approvals and application pathway.',sourceLinks.planning,'Planning department']]
  :[['Site coordination','Your property and facilities team','Site access, operations and utility records.'],['Planning review','Your city or county planning department','Ask about the proposed use, approvals and the application pathway.']];
 return [...local,['Land-use counsel','California certified referral services','Request an attorney experienced in land use and affordable housing.',sourceLinks.lawyer,'Find a referral'],['Civil engineering','California professional license lookup','Verify a prospective civil engineer before engagement.',sourceLinks.engineer,'Verify an engineer'],['Architectural review','California Architects Board','Verify an architect for accessibility and building-code review.',sourceLinks.architect,'Verify an architect']];
}
function renderDeliverables(){
 $('#deliverables').innerHTML=`<div class="delivery-head"><div><h3>Turn a possibility into a conversation.</h3><p>Prepared drafts for your board and your professional team.</p></div></div><div class="delivery-grid"><article class="delivery-card"><span class="file-icon">PRESENTATION</span><h4>The board conversation</h4><p>A concise slide presentation with the site concept, housing profile, planning assumptions and next steps.</p><button id="export-slides">↓ Export slide presentation</button></article><article class="delivery-card"><span class="file-icon">EXPERT BRIEF</span><h4>The professional starting point</h4><p>A discussion brief for land-use counsel, civil engineering and architectural review.</p><button id="export-brief">↓ Download discussion brief</button></article></div><section class="contacts"><h3>People who help make it real.</h3><p>Verified starting points and professional directories. No partnership or project approval is implied.${snapshot.site.nearBiola?'':' Licensing directories shown are for California; elsewhere, use your state’s equivalents.'}</p>${contactRows().map(c=>`<div class="contact"><div><span class="eyebrow">${c[0]}</span><p><strong>${c[1]}</strong></p><p>${c[2]}</p></div>${c[3]?`<a target="_blank" rel="noopener" href="${c[3]}">${c[4]} ↗</a>`:''}</div>`).join('')}</section>`;
 $('#export-slides').onclick=exportSlides;$('#export-brief').onclick=exportBrief;
}
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function exportSlides(){
 const picture=sceneController.capture(),s=snapshot.summary,site=snapshot.site;
 const local=site.nearBiola?'campus facilities and La Mirada planning staff':'the property owner and local planning staff';
 const slides=[['Homemore',`An illustrative housing concept for ${esc(site.label)}.<br>A starting point for a leadership conversation.`],['A place to begin',`${s.homes} ${s.designPlural} for about ${s.people} people, placed inside the selected ${s.areaSqFt.toLocaleString()} sq ft study area.<br>${esc(s.basis)}`],[s.designName,`Footprint: ${s.unitFootprint}, ${s.unitSqFt} square feet. ${esc(s.footprintSource)}.<br>${esc(s.maker)}. Configuration and specifications require confirmation. ${esc(s.occupancyBasis)}`],['Questions before commitments','Confirm the permitted use and required approvals.<br>Review fire access, accessibility and foundations.<br>Assess utilities, parking and an operating partner.'],['A professional next step',`Share the concept with ${local}.<br>Engage land-use counsel, a civil engineer and an architect.<br>Seek leadership review before external release.`]];
 download('homemore-presentation.html',`<!doctype html><html><head><meta charset="utf-8"><title>Homemore — Board Presentation</title><style>body{margin:0;background:#f1f5ef;font-family:Arial,sans-serif;color:#173e35}section{box-sizing:border-box;min-height:100vh;padding:7vw;display:flex;flex-direction:column;justify-content:center;position:relative;page-break-after:always}h1{font-size:5vw;line-height:1.1;margin:0 0 3vw;max-width:900px}p{font-size:2vw;line-height:1.7;max-width:1000px}small{font-size:11px;position:absolute;bottom:30px;left:7vw;right:7vw;line-height:1.5}img{max-height:58vh;max-width:85vw;object-fit:contain;border-radius:8px}a{color:inherit}nav{position:fixed;right:20px;top:15px;z-index:2;font-size:12px;background:white;padding:10px;border-radius:5px}@media print{nav{display:none}section{height:190mm;min-height:0}h1{font-size:40pt}p{font-size:20pt}img{max-height:130mm}@page{size:A4 landscape;margin:0}}</style></head><body><nav>Use ↓ / ↑ to navigate · Print to save PDF</nav>${slides.map((slide,i)=>`<section><div style="font-size:12px;letter-spacing:3px;margin-bottom:30px">HOMEMORE · ${String(i+1).padStart(2,'0')}</div><h1>${slide[0]}</h1>${i===1?`<img src="${picture}" alt="Illustrative housing concept">`:''}<p>${slide[1]}</p>${i===2?`<a href="${s.sourceUrl}">Published source</a>`:''}<small>ILLUSTRATIVE DEMO. DRAFT — HUMAN REVIEW AND BOARD SIGN-OFF REQUIRED.<br>${disclaimer}</small></section>`).join('')}<script>document.addEventListener('keydown',e=>{if(['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();window.scrollBy({top:innerHeight,behavior:'smooth'})}if(['ArrowLeft','ArrowUp','PageUp'].includes(e.key)){e.preventDefault();window.scrollBy({top:-innerHeight,behavior:'smooth'})}})<\/script></body></html>`,'text/html');
 toast('Slide presentation downloaded. Open in a browser to present or save as PDF.');
}
function exportBrief(){
 const s=snapshot.summary,site=snapshot.site;
 const local=site.nearBiola?`Biola facilities: ${sourceLinks.facilities}\nLa Mirada planning: ${sourceLinks.planning}\n`:'Property owner / facilities team and the local city or county planning department.\n';
 download('homemore-expert-discussion-brief.txt',`HOMEMORE\nEXPERT DISCUSSION BRIEF\n\nILLUSTRATIVE DEMO — DRAFT FOR HUMAN REVIEW\n${disclaimer}\n\nSITE\n${site.label}\nUser-drawn study area: approximately ${s.areaSqFt.toLocaleString()} square feet. Not a surveyed parcel.\n\nCONCEPT ESTIMATE\n${s.homes} ${s.designPlural}. Unit footprint: ${s.unitFootprint.replace('×','x')} / ${s.unitSqFt} square feet. ${s.footprintSource.replace(/×/g,'x')}.\nPeople housed: about ${s.people}. ${s.occupancyBasis}${snapshot.target?` Stated target: at least ${snapshot.target} people${s.peopleIfAllFit>=snapshot.target?' (met)':` (not met; this style fits about ${s.peopleIfAllFit} here)`}.`:''}\n${s.basis.replace(/×/g,'x')}\nAssumptions: ${s.setbackFt} ft clearance to the drawn boundary, ${s.aisleFt} ft access aisle in front of every door, ${Math.round(SPEC.backGap*3.28084)} ft between back-to-back rows.${s.capped?` Shown as a first phase; the same geometry fits about ${s.geometricFit}.`:''}\nUtilities (schematic only): ${Object.keys(snapshot.utilities.services).length?Object.entries(snapshot.utilities.services).map(([k,r])=>`${k} about ${(r.mainFt+r.branchFt).toLocaleString()} ft of run`).join(', ')+`, ${snapshot.utilities.connections} connections, routed to an ASSUMED point of connection. Real mains, capacity, sizes and sewer slopes are unknown.`:'none drawn.'}${snapshot.utilities.note?' '+snapshot.utilities.note:''}\nStories: ${s.stories}.${s.stories>1?` ${s.storiesUnchecked?'NO local height or story limit was entered, so the story count has not been checked against anything.':`Local limits were typed in by the user and are NOT verified: ${[snapshot.limits.heightLimitFt?`height ${snapshot.limits.heightLimitFt} ft`:'',snapshot.limits.storyLimit?`${snapshot.limits.storyLimit} stories`:''].filter(Boolean).join(', ')}.`} ${s.stackSource.replace(/[“”]/g,'"')}. Stacked homes trigger stair, accessibility, fire-separation, structural and seismic requirements that this demo does not evaluate; the drawn gallery and stair are placeholders.`:''}\nThese are illustration defaults, not code-compliant dimensions. Model height and appearance are illustrative.\nParking displaced, utility capacity, occupancy and project cost: not established.\n\nLAND-USE COUNSEL\nConfirm ownership, proposed-use classification, required approvals, local zoning, and applicable state pathways. Do not assume SB 4 authorizes this concept.\n\nCIVIL ENGINEER\nReview survey, grading, drainage, foundations, water and sewer capacity, electrical service, hydrant coverage and emergency access including turning geometry.\n\nARCHITECT\nReview unit configuration, building classification, accessibility, accessible routes, separation and life safety.\n\nOPERATIONS\nIdentify a qualified housing operator, service model, resident eligibility, staffing and a sustainable operating budget. No operating partner is committed.\n\nSTARTING POINTS\n${local}Land-use attorney referral (California): ${sourceLinks.lawyer}\nCivil engineer license verification (California): ${sourceLinks.engineer}\nArchitect license verification (California): ${sourceLinks.architect}\nPublished footprint (${s.maker}): ${s.sourceUrl}\n\nLeadership review and board sign-off are required before external release.\n`,'text/plain');
 toast('Expert discussion brief downloaded');
}

// Tutorial: a ghost cursor outlines a lot so a first-time visitor sees what to do. It only draws its own
// preview layers and never touches the real boundary; any interaction with the map ends it.
let tutorial=null;
function stopTutorial(){
 if(!tutorial||tutorial.moving)return; // moving = the walkthrough's own zoom, not the visitor's
 tutorial.cancelled=true;tutorial.layers.forEach(layer=>map.removeLayer(layer));tutorial.cursor.remove();tutorial=null;
}
async function playTutorial(){
 if(!map||step!==0||busy)return;
 if(points.length){toast('Clear the boundary to watch the walkthrough.');return}
 stopTutorial();
 // On the opening view the cursor traces the sample lot; anywhere else it traces a lot-sized shape mid-screen.
 const size=map.getSize(),onSample=preset.every(p=>map.getBounds().pad(-.12).contains(p));
 const corners=onSample?preset:[[-.16,-.2],[.17,-.17],[.18,.19],[-.15,.17]].map(([dx,dy])=>{const at=map.containerPointToLatLng([size.x*(.5+dx),size.y*(.5+dy)]);return [at.lat,at.lng]});
 const cursor=document.createElement('div');cursor.className='tutorial-cursor';
 cursor.innerHTML='<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M5 3l14 8.5-6.2 1.4 3.7 6.9-2.7 1.4-3.7-6.9L5 19z" fill="#fff" stroke="#173c3a" stroke-width="1.5" stroke-linejoin="round"/></svg><i></i><span></span>';
 $('.scene-wrap').append(cursor);
 const tip=text=>{cursor.querySelector('span').textContent=text};
 const ghost={color:'#ffffff',weight:2.5,dashArray:'7 7',fillColor:'#d8ffc4',fillOpacity:.18,interactive:false};
 const outline=L.polyline([],ghost).addTo(map),area=L.polygon([],ghost).addTo(map);
 const run=tutorial={cancelled:false,moving:false,layers:[outline,area],cursor};
 // Zoom in until the lot is big enough to read, then let the visitor's own map moves cancel as usual.
 if(onSample&&map.getZoom()<19){
  run.moving=true;
  await new Promise(done=>{map.once('moveend',done);setTimeout(done,1600);map.flyToBounds(preset,{padding:[150,150],maxZoom:19,duration:.9})});
  run.moving=false;if(points.length)stopTutorial(); // the visitor started drawing during the zoom
  if(run.cancelled)return;
 }
 const moveTo=async(latlng,ms)=>{const p=map.latLngToContainerPoint(latlng);cursor.classList.toggle('flip',p.x>map.getSize().x*.55);cursor.style.transitionDuration=`${ms}ms`;cursor.style.transform=`translate(${p.x}px,${p.y}px)`;await pause(ms+60)};
 const view=map.getSize();cursor.style.transform=`translate(${view.x*.5}px,${view.y*.82}px)`;
 tip('Click around a lot to place its corners');
 await pause(500);if(run.cancelled)return;cursor.classList.add('shown');
 const placed=[];
 for(const corner of corners){
  await moveTo(corner,placed.length?700:900);if(run.cancelled)return;
  cursor.classList.add('click');await pause(260);if(run.cancelled)return;cursor.classList.remove('click');
  placed.push(corner);
  run.layers.push(L.circleMarker(corner,{radius:6,color:'#ffffff',weight:2.5,fillColor:'#1d6654',fillOpacity:1,interactive:false}).addTo(map));
  if(placed.length>=3){outline.setLatLngs([]);area.setLatLngs(placed);tip('Three or more corners make a boundary')}else outline.setLatLngs(placed);
 }
 await pause(450);if(run.cancelled)return;
 const fit=computeLayout(corners,layoutOptions());
 run.layers.push(L.polygon(fit.footprintsLatLng.map(ring=>[ring]),{color:'#ffffff',weight:1.5,fillColor:'#eaf7e4',fillOpacity:.8,interactive:false,className:'tutorial-homes'}).addTo(map));
 tip(fit.count?`${fit.count} homes fit themselves inside. Your turn.`:'Homes fit themselves inside. Your turn.');
 await pause(2600);if(run.cancelled)return;
 cursor.classList.remove('shown');await pause(350);
 if(!run.cancelled)stopTutorial();
}
$('#tutorial').onclick=playTutorial;

// Hint overlay: dismissible, and hidden for filming with ?clean=1 or the H key.
$('#preset').onclick=()=>{try{loadSampleBoundary()}catch(e){toast(e.message)}};
$('#hint-close').onclick=()=>{hintDismissed=true;updateHint()};
document.addEventListener('keydown',e=>{if(e.key.toLowerCase()!=='h'||e.ctrlKey||e.metaKey||e.altKey||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;hintDismissed=!hintDismissed;updateHint()});

initMap();refreshSteps();side();updateHint();if(map)updateBoundary();
// Play the walkthrough once per browser session, unless the page was opened clean for filming or motion is reduced.
try{
 if(map&&!hintDismissed&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&!sessionStorage.getItem('homemore-tutorial')){
  sessionStorage.setItem('homemore-tutorial','1');setTimeout(()=>{if(!points.length&&step===0)playTutorial()},1200);
 }
}catch{}

// Copilot surface: the same actions the UI offers, callable by a model (WebMCP) or from the console.
const siteSummary=()=>{const s=summarize(layout);return {...s,minimumPeople:specs.minPeople||null,enteredHeightLimitFeet:specs.heightLimitFt,enteredStoryLimit:specs.storyLimit,meetsMinimumPeople:specs.minPeople?s.peopleIfAllFit>=specs.minPeople:null,onlyHomesNeeded:specs.onlyNeeded,designs:Object.values(DESIGNS).map(d=>({id:d.id,name:d.name,footprint:d.footprint,sqFt:d.sqFt,peoplePerHome:d.peoplePerHome,maker:d.maker,footprintDerived:d.derived,maxStories:d.maxStories,foldsOut:!!d.foldRatio})),boundaryPoints:points.length,site:layout.center?describeSite(layout.center).label:null,stage:step,conceptIsCurrent:!!snapshot&&!stale,disclaimer}};
function parsePoints(input){
 if(!Array.isArray(input)||input.length<3||input.length>12)throw new Error('points must be 3 to 12 [lat, lng] pairs');
 return input.map(p=>{const lat=Number(Array.isArray(p)?p[0]:p?.lat),lng=Number(Array.isArray(p)?p[1]:p?.lng);if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)throw new Error('each point needs a valid lat and lng');return [lat,lng]});
}
const idle=()=>{if(busy)throw new Error('A concept is being generated. Try again in a moment.')};
const api={
 loadSampleBoundary(){idle();loadSampleBoundary();return siteSummary()},
 async searchAddress({query}={}){idle();if(typeof query!=='string'||!query.trim())throw new Error('query is required');const places=await searchAddress(query.trim());if(places.length)goTo(places[0]);return {moved:places.length>0,places}},
 setBoundary({points:input}={}){idle();const next=parsePoints(input);if(!map)throw new Error('The map is not available');if(step)setStep(0);points=next;redraw();map.fitBounds(points,{padding:[100,100],maxZoom:19});return siteSummary()},
 async setLayoutOptions({setbackFeet,design,minimumPeople,onlyHomesNeeded,stories,heightLimitFeet,storyLimit}={}){
  idle();
  if([setbackFeet,design,minimumPeople,onlyHomesNeeded,stories,heightLimitFeet,storyLimit].every(v=>v===undefined))throw new Error('give at least one of setbackFeet, design, minimumPeople, onlyHomesNeeded, stories, heightLimitFeet, storyLimit');
  if(stories!==undefined&&![1,2,3].includes(stories))throw new Error('stories must be 1, 2 or 3');
  if(heightLimitFeet!==undefined&&(!Number.isFinite(heightLimitFeet)||heightLimitFeet<0||heightLimitFeet>200))throw new Error('heightLimitFeet must be between 0 and 200 (0 clears it)');
  if(storyLimit!==undefined&&(!Number.isInteger(storyLimit)||storyLimit<0||storyLimit>10))throw new Error('storyLimit must be a whole number from 0 to 10 (0 clears it)');
  if(setbackFeet!==undefined&&(!Number.isFinite(setbackFeet)||setbackFeet<0||setbackFeet>30))throw new Error('setbackFeet must be between 0 and 30');
  if(design!==undefined&&!DESIGNS[design])throw new Error(`design must be one of: ${Object.keys(DESIGNS).join(', ')}`);
  if(minimumPeople!==undefined&&(!Number.isInteger(minimumPeople)||minimumPeople<0||minimumPeople>500))throw new Error('minimumPeople must be a whole number from 0 to 500');
  if(onlyHomesNeeded!==undefined&&typeof onlyHomesNeeded!=='boolean')throw new Error('onlyHomesNeeded must be true or false');
  if(setbackFeet!==undefined)setbackFt=Math.round(setbackFeet);
  if(design!==undefined)specs.design=design;
  if(minimumPeople!==undefined)specs.minPeople=minimumPeople;
  if(onlyHomesNeeded!==undefined)specs.onlyNeeded=onlyHomesNeeded;
  if(stories!==undefined)specs.stories=stories;
  if(heightLimitFeet!==undefined)specs.heightLimitFt=heightLimitFeet>0?Math.floor(heightLimitFeet):null;
  if(storyLimit!==undefined)specs.storyLimit=storyLimit>0?storyLimit:null;
  recompute();side();clearTimeout(rebuildTimer);await rebuild();
  return siteSummary();
 },
 getSiteSummary:siteSummary,
 async generateConcept(){idle();if(!layout.count)throw new Error(fitNotes[layout.status]??'No homes fit the current boundary');await generate();return siteSummary()}
};
window.homemore=api;
const modelContext=navigator.modelContext??document.modelContext;
if(modelContext?.registerTool){
 const schema=(properties={},required=[])=>({type:'object',properties,required,additionalProperties:false});
 const pointsSchema={type:'array',minItems:3,maxItems:12,description:'Boundary corners in order, as [latitude, longitude] pairs.',items:{type:'array',items:{type:'number'},minItems:2,maxItems:2}};
 const tools=[
  {name:'load_sample_boundary',description:'Load the illustrative sample boundary (Biola Lot C) and return the site summary.',inputSchema:schema(),execute:()=>api.loadSampleBoundary()},
  {name:'search_address',description:'Search for an address or place and move the map to the best match.',inputSchema:schema({query:{type:'string',description:'Address or place name.'}},['query']),execute:input=>api.searchAddress(input)},
  {name:'set_boundary',description:'Set the study boundary from map coordinates and return the estimated home count.',inputSchema:schema({points:pointsSchema},['points']),execute:input=>api.setBoundary(input)},
  {name:'set_layout_options',description:'Change the specifications: housing design, a minimum number of people to house, whether to place only the homes that target needs, and the clearance kept from the boundary in feet. Give any subset. People per home is a per-design planning assumption; get_site_summary lists the designs.',inputSchema:schema({design:{type:'string',enum:Object.keys(DESIGNS)},minimumPeople:{type:'integer',minimum:0,maximum:500},onlyHomesNeeded:{type:'boolean'},stories:{type:'integer',enum:[1,2,3],description:'Stories wanted. Granted only for stackable designs; capped by any local limit supplied. With no limit the summary reports storiesUnchecked.'},heightLimitFeet:{type:'number',minimum:0,maximum:200,description:'Local zoning height limit, supplied by the user. Never guess it.'},storyLimit:{type:'integer',minimum:0,maximum:10,description:'Local zoning story limit, supplied by the user. Never guess it.'},setbackFeet:{type:'number',minimum:0,maximum:30}}),execute:input=>api.setLayoutOptions(input)},
  {name:'get_site_summary',description:'Read the current study area, estimated home count and assumptions. Illustrative, not verified feasibility.',inputSchema:schema(),readOnly:true,execute:()=>api.getSiteSummary()},
  {name:'generate_concept',description:'Build the 3D concept for the current boundary. Requires at least one home to fit.',inputSchema:schema(),execute:()=>api.generateConcept()}
 ];
 for(const {readOnly,...tool} of tools){try{Promise.resolve(modelContext.registerTool({...tool,annotations:{readOnlyHint:!!readOnly}})).catch(()=>{})}catch{}}
}
