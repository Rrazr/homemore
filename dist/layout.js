// Geometric fit of published small-home footprints inside a user-drawn boundary.
// Pure module: no DOM, no three. The result is an illustrative estimate, never verified site feasibility.
const M_PER_DEG=111320,SQFT_PER_M2=10.7639,FT_PER_M=3.28084,EPS=1e-6;

const FT=.3048;
// Housing styles. Every footprint comes from the maker's or builder's published figures unless 'derived' says otherwise.
// depthFt runs from the back wall to the door face (toward the aisle); frontFt runs along the aisle.
// porchFt = covered porch in front of the door; doors = entries along the front face (one per private room).
// people = planning assumption (bedrooms, or the published capacity where one exists), never an occupancy rating.
const design=({id,name,plural,maker,url,depthFt,frontFt,footprint,sqFt,people,peopleNote,source,derived=false,heightM=2.65,porchFt=0,doors=1,joined=false,blurb,utilities='water sewer power',utilityNote='',foldedFt=0,foldSource='',maxStories=1,stackSource='The maker does not publish stacking'})=>({
 id,name,plural,maker,url,footprint,sqFt,utilities:utilities.split(' ').filter(Boolean),utilityNote,foldRatio:foldedFt?foldedFt/frontFt:0,foldedFt,foldSource,maxStories,stackSource,storyHeight:heightM+.4,peoplePerHome:people,peopleNote,footprintSource:source,derived,blurb,doors,joined,
 height:heightM,porch:porchFt*FT,unitLength:depthFt*FT,unitWidth:frontFt*FT,slabLength:depthFt*FT+.3088,slabWidth:frontFt*FT+.3616,
 front:porchFt?porchFt*FT+.1:.75,rowPitch:frontFt*FT+.3616+1.8
});
const OOTB='Out of the Box Housing',OOTB_URL='https://outoftheboxhousing.com/modular-info-pricing/';
export const DESIGNS=Object.fromEntries([
 {id:'box',name:'Fast-Set Box',plural:'Fast-Set Boxes',maker:OOTB,url:OOTB_URL,depthFt:19,frontFt:8,footprint:'19 × 8 ft',sqFt:152,people:1,peopleNote:'Singles Pad layout: one person',source:'Manufacturer-published footprint',blurb:'Studio with bathroom. The 205 “Singles Pad” layout.'},
 {id:'box2',name:'Fast-Set Box two-bedroom',plural:'two-bedroom Fast-Set Boxes',maker:OOTB,url:OOTB_URL,depthFt:19,frontFt:8,footprint:'19 × 8 ft',sqFt:152,people:2,peopleNote:'Two bedrooms: one person each',source:'Manufacturer-published footprint; 305 layout has two bedrooms divided by a bathroom',blurb:'Same box, two small bedrooms divided by a bathroom.'},
 {id:'double',name:'Double-wide two-bedroom',plural:'double-wide homes',maker:OOTB,url:'https://outoftheboxhousing.com/the-fast-set-box/',depthFt:19,frontFt:16,footprint:'19 × 16 ft',sqFt:304,people:2,peopleNote:'Two bedrooms: one person each',source:'Two published 19 × 8 ft boxes joined side by side; the combination is described by the manufacturer, the joined footprint is derived',derived:true,joined:true,blurb:'Two boxes joined into one two-bedroom home.'},
 {id:'cabin',name:'Fast-Set Pop-Up Cabin',plural:'Pop-Up Cabins',maker:OOTB,url:OOTB_URL,depthFt:19,frontFt:19,footprint:'19 × 19 ft + porch',sqFt:360,people:2,peopleNote:'Two-bedroom plan: one person each',source:'Manufacturer-published 19 × 19 ft footprint and 360 sq ft interior; 7 ft porch depth derived from the published 134 sq ft porch',porchFt:7,blurb:'Two-bedroom cabin with a covered porch.'},
 {id:'hut',name:'Conestoga Hut',plural:'Conestoga Huts',maker:'Community Supported Shelters',url:'https://www.communitysupportedshelters.org/conestoga-huts',depthFt:10,frontFt:6,footprint:'6 × 14 ft with porch',sqFt:60,people:1,peopleNote:'One person; capacity is not published',source:'Builder-published 6 × 10 ft interior, 6 × 14 ft overall with covered porch',heightM:2,porchFt:4,utilities:'',utilityNote:'No plumbing or wiring: a solar light only. Residents rely on shared hygiene facilities.',blurb:'Volunteer-built micro-shelter with a bed and covered porch.'},
 {id:'lihi',name:'LIHI Tiny House',plural:'LIHI Tiny Houses',maker:'Low Income Housing Institute',url:'https://www.lihihousing.org/tinyhouses',depthFt:12,frontFt:8,footprint:'8 × 12 ft',sqFt:96,people:1,peopleNote:'One person; capacity is not published',source:'Builder-published size, “approximately 8 × 12 ft”',heightM:2.5,utilities:'power',utilityNote:'Electricity, light and a heater only. Kitchens, bathrooms and laundry are shared village buildings.',blurb:'Insulated, heated tiny house used in Seattle villages.'},
 {id:'rhu',name:'Better Shelter RHU',plural:'Relief Housing Units',maker:'Better Shelter',url:'https://bettershelter.org/rhu-structure/',depthFt:18.6,frontFt:10.9,footprint:'18.6 × 10.9 ft',sqFt:188,people:4,peopleNote:'Published for a family of four to five; four used',source:'Maker-published 5.68 × 3.32 m footprint, 17.5 m² floor',heightM:2.4,utilities:'',utilityNote:'No plumbing or wiring: a solar lamp kit only. Water and sanitation are provided on site separately.',blurb:'Flat-pack emergency shelter; about a three-year lifespan.'},
 {id:'casita',name:'Boxabl Casita',plural:'Boxabl Casitas',maker:'Boxabl',url:'https://www.boxabl.com/learn-more/casita-studio',depthFt:19,frontFt:19,footprint:'19 × 19 ft',sqFt:361,people:2,peopleNote:'Studio: two people assumed',source:'Maker-published 19 × 19 ft, 361 sq ft studio with one bathroom',heightM:3.1,foldedFt:8.5,foldSource:'Ships folded at 19 × 8.5 ft and unfolds on site to 19 × 19 ft, as widely published for the Casita',maxStories:3,stackSource:'Maker publishes “Stack to add stories”; third-party coverage cites up to three',blurb:'Fold-out studio with full kitchen and bathroom. Stackable.'},
 {id:'connect',name:'Connect Shelter 4',plural:'Connect Shelter modules',maker:'Connect Homes',url:'https://connectshelters.com/',depthFt:8,frontFt:40,footprint:'8 × 40 ft',sqFt:320,people:4,peopleNote:'Four private rooms: one person each',source:'Maker-published 320 sq ft module, 8 × 40 ft, with one to four private rooms',heightM:2.9,doors:4,maxStories:2,stackSource:'Vertical stacking is reported for these modules but was not confirmed on the maker’s page',blurb:'Steel-frame module with four private rooms. Reported stackable.'},
 {id:'boss',name:'BOSS Cubez',plural:'BOSS Cubez modules',maker:'BOSS Homes',url:'https://housinginnovation.co/rapidshelter/boss-cubez/',depthFt:8.5,frontFt:40,footprint:'8.5 × 40 ft',sqFt:340,people:4,peopleNote:'Four rooms: one person each (catalogue lists up to two beds per room)',source:'Catalogue-published 340 sq ft, 8.5 × 40 ft, four rooms',heightM:2.9,doors:4,utilities:'power',utilityNote:'Sleeping rooms are wired; bathrooms are separate modules that are not drawn here.',blurb:'Four-room module; rooms can take two beds each.'}
].map(d=>[d.id,design(d)]));

// Stacked homes need a way up: an access gallery along the door face plus a stair run beside it.
export const ACCESS={gallery:1.2,stair:1};

// How many stories may be drawn. Extra stories need a style whose maker publishes stacking. This app cannot look up
// zoning or building codes, so it never assumes a limit: limits the user types in cap the number, and 'unchecked'
// flags stories drawn with no limit entered at all.
export function resolveStories(home,{stories=1,heightLimitFt,storyLimit}={}){
 const wanted=Math.min(3,Math.max(1,Math.floor(stories)||1)),storyHeightFt=home.storyHeight*FT_PER_M;
 const hasHeight=Number.isFinite(heightLimitFt)&&heightLimitFt>0,hasStories=Number.isFinite(storyLimit)&&storyLimit>0;
 let allowed=wanted,heldBy=null;
 const hold=(limit,reason)=>{if(limit<allowed){allowed=Math.max(1,limit);heldBy=reason}};
 if(wanted>1){
  hold(home.maxStories,'style');
  if(hasHeight)hold(Math.floor(heightLimitFt/storyHeightFt),'height');
  if(hasStories)hold(Math.floor(storyLimit),'story-limit');
 }
 return {stories:allowed,wanted,heldBy,unchecked:allowed>1&&!hasHeight&&!hasStories,storyHeightFt:Math.round(storyHeightFt*10)/10};
}

export const SPEC={
 aisle:6.096, // 20 ft access aisle assumption, for the engineer to verify
 backGap:3, // separation between back-to-back modules
 setback:1.524, // 5 ft default clearance to the drawn boundary
 maxSetback:9.144,
 maxUnits:400, // display cap; the 3D view instances homes, so this is about legibility, not speed
 maxCandidates:60000
};

export const feetToMetres=ft=>ft/FT_PER_M;
export const metresToFeet=m=>m*FT_PER_M;

// Local metres around a shared centre: x = east, z = south (matches the three.js ground plane).
export function makeProjector(center){
 const cos=Math.cos(center[0]*Math.PI/180);
 return {
  toLocal:p=>[(p[1]-center[1])*M_PER_DEG*cos,-(p[0]-center[0])*M_PER_DEG],
  toLatLng:([x,z])=>[center[0]-z/M_PER_DEG,center[1]+x/(M_PER_DEG*cos)]
 };
}

export function polygonAreaM2(poly){
 let sum=0;
 poly.forEach((p,i)=>{const q=poly[(i+1)%poly.length];sum+=p[0]*q[1]-q[0]*p[1]});
 return Math.abs(sum/2);
}

const orient=(a,b,c)=>Math.sign((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]));
const properlyCross=(a,b,c,d)=>orient(a,b,c)*orient(a,b,d)<0&&orient(c,d,a)*orient(c,d,b)<0;

export function isSelfIntersecting(poly){
 const n=poly.length;
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
  if(j===i+1||(i===0&&j===n-1))continue;
  if(properlyCross(poly[i],poly[(i+1)%n],poly[j],poly[(j+1)%n]))return true;
 }
 return false;
}

// Even-odd rule, so winding direction never matters.
export function pointInPolygon([x,y],poly){
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const [xi,yi]=poly[i],[xj,yj]=poly[j];
  if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
 }
 return inside;
}

export function rectInsidePolygon(rect,poly){
 if(!rect.every(c=>pointInPolygon(c,poly)))return false;
 for(let i=0;i<4;i++)for(let j=0;j<poly.length;j++){
  if(properlyCross(rect[i],rect[(i+1)%4],poly[j],poly[(j+1)%poly.length]))return false;
 }
 return true;
}

// True when an axis-aligned rectangle [uLo,vLo,uHi,vHi] touches a polygon (existing buildings to keep clear of).
function rectHitsPolygon([uLo,vLo,uHi,vHi],rect,poly){
 if(rect.some(c=>pointInPolygon(c,poly)))return true;
 if(poly.some(([u,v])=>u>uLo&&u<uHi&&v>vLo&&v<vHi))return true;
 for(let i=0;i<4;i++)for(let j=0;j<poly.length;j++)if(properlyCross(rect[i],rect[(i+1)%4],poly[j],poly[(j+1)%poly.length]))return true;
 return false;
}

function dedupe(points){
 if(!points.length)return [];
 const {toLocal}=makeProjector(points[0]);
 const far=(a,b)=>{const p=toLocal(a),q=toLocal(b);return Math.hypot(p[0]-q[0],p[1]-q[1])>.05};
 const kept=points.filter((p,i)=>i===0||far(p,points[i-1]));
 while(kept.length>1&&!far(kept[0],kept[kept.length-1]))kept.pop();
 return kept;
}

// Double-loaded modules: two columns of homes facing a shared aisle that runs along the frame's v axis.
// Each home must keep its setback-inflated slab and the full aisle width in front of its door inside the boundary.
function pack(local,theta,pu,rowPhases,setback,aisle,home,obstacles){
 const c=Math.cos(theta),s=Math.sin(theta);
 const frame=local.map(([x,z])=>[x*c-z*s,x*s+z*c]);
 const us=frame.map(p=>p[0]),vs=frame.map(p=>p[1]);
 const minU=Math.min(...us),maxU=Math.max(...us),minV=Math.min(...vs),maxV=Math.max(...vs);
 const blocks=obstacles.map(poly=>poly.map(([x,z])=>[x*c-z*s,x*s+z*c]));
 const off=aisle/2+home.front+home.slabLength/2;
 const pitchU=2*off+home.slabLength+SPEC.backGap;
 // pu, pv are fractions of one pitch: the lattice is centred on the boundary, then shifted by that phase.
 const u0=(minU+maxU)/2+pu*pitchU,vMid=(minV+maxV)/2;
 const iMin=Math.floor((minU-u0)/pitchU)-1,iMax=Math.ceil((maxU-u0)/pitchU)+1;
 const jMin=Math.floor((minV-vMid)/home.rowPitch)-2,jMax=Math.ceil((maxV-vMid)/home.rowPitch)+2;
 if((iMax-iMin+1)*(jMax-jMin+1)*2>SPEC.maxCandidates)return null;
 const clear=Math.max(0,setback-EPS),units=[];
 // Each column of homes slides along its aisle independently, so irregular boundaries fill as fully as they can.
 for(let i=iMin;i<=iMax;i++)for(const side of [-1,1]){
  const mu=u0+i*pitchU,u=mu+side*off;
  // Behind the home: the setback. In front of the door: the stoop and the whole aisle, or the setback if larger.
  const back=home.slabLength/2+clear,front=home.slabLength/2+Math.max(home.front+aisle,clear);
  const uLo=side<0?u-back:u-front,uHi=side<0?u+front:u+back;
  let column=[];
  for(const pv of rowPhases){
   const candidate=[];
   for(let j=jMin;j<=jMax;j++){
    const v=vMid+(j+pv)*home.rowPitch,vLo=v-home.slabWidth/2-clear,vHi=v+home.slabWidth/2+clear;
    const rect=[[uLo,vLo],[uHi,vLo],[uHi,vHi],[uLo,vHi]];
    if(rectInsidePolygon(rect,frame)&&!blocks.some(block=>rectHitsPolygon([uLo,vLo,uHi,vHi],rect,block)))candidate.push({x:u*c+v*s,z:-u*s+v*c,rotY:theta+(side>0?Math.PI:0),row:j,centreDistance:Math.abs(v-vMid),module:i,side,u,v,mu});
   }
   if(candidate.length>column.length)column=candidate;
  }
  units.push(...column);
 }
 return units;
}

// Keep whole rows nearest the centre when the fit exceeds the limit, then fill the last row from its middle.
function capUnits(units,limit){
 if(units.length<=limit)return units;
 const rows=new Map();
 for(const unit of units){if(!rows.has(unit.row))rows.set(unit.row,[]);rows.get(unit.row).push(unit)}
 const ordered=[...rows.values()].sort((a,b)=>a[0].centreDistance-b[0].centreDistance);
 const kept=new Set();let total=0;
 for(const row of ordered){
  if(total+row.length>limit){const mid=row.reduce((t,u)=>t+u.x,0)/row.length,midZ=row.reduce((t,u)=>t+u.z,0)/row.length;[...row].sort((a,b)=>Math.hypot(a.x-mid,a.z-midZ)-Math.hypot(b.x-mid,b.z-midZ)).slice(0,limit-total).forEach(u=>kept.add(u));break}
  row.forEach(u=>kept.add(u));total+=row.length;
 }
 return units.filter(u=>kept.has(u));
}

// Lattice phases tried per grid angle; huge sites fall back to the coarse set to stay fast.
const phases=(steps,heldPhase=0)=>Array.from({length:steps},(_,i)=>i/steps)
 .sort((p,q)=>{const d=x=>{const g=Math.abs(x-heldPhase)%1;return Math.min(g,1-g)};return d(p)-d(q)});

// prev = an earlier result. With opts.lock (mid-drag) its grid angle is held so homes shift in small steps
// instead of turning; otherwise a new arrangement must gain at least two homes to replace it.
// Ties always go to the phase nearest the held one, so homes move as little as possible.
export function computeLayout(pointsLatLng,opts={},prev=null){
 const setbackM=Math.min(SPEC.maxSetback,Math.max(0,Number.isFinite(opts.setbackM)?opts.setbackM:SPEC.setback));
 const aisleM=Number.isFinite(opts.aisleM)?opts.aisleM:SPEC.aisle;
 const style=DESIGNS[opts.design]??DESIGNS.box,stacking=resolveStories(style,opts),stories=stacking.stories;
 // Stacked homes reserve room in front of the door for the gallery and stair.
 const home=stories>1?{...style,front:ACCESS.gallery+ACCESS.stair+.1}:style;
 const points=dedupe(pointsLatLng||[]);
 const result={design:home,stories,stacking,custom:false,theta:0,outline:[],obstacles:[],mains:[],limit:null,status:'ok',count:0,fitCount:0,units:[],footprintsLatLng:[],areaSqFt:0,setbackM,aisleM,center:null,choice:null,focus:[0,0]};
 if(points.length<3)return {...result,status:'incomplete'};
 const n=points.length;
 result.center=[points.reduce((a,p)=>a+p[0],0)/n,points.reduce((a,p)=>a+p[1],0)/n];
 const {toLocal,toLatLng}=makeProjector(result.center),local=points.map(toLocal);
 if(isSelfIntersecting(local))return {...result,status:'self-intersecting'};
 result.areaSqFt=polygonAreaM2(local)*SQFT_PER_M2;

 // Candidate grid angles: along and across every boundary edge, longest edge first so ties favour it.
 const sameAngle=(p,q)=>{const d=Math.abs(p-q)%Math.PI;return Math.min(d,Math.PI-d)<1e-3};
 const thetas=[];
 local.map((p,i)=>{const q=local[(i+1)%n];return {length:Math.hypot(q[0]-p[0],q[1]-p[1]),angle:Math.atan2(q[0]-p[0],q[1]-p[1])}})
  .sort((p,q)=>q.length-p.length)
  .forEach(({angle})=>{for(const quarter of [0,1]){const theta=((angle+quarter*Math.PI/2)%Math.PI+Math.PI)%Math.PI;if(!thetas.some(t=>sameAngle(t,theta)))thetas.push(theta)}});
 const held=prev?.choice?.n===n&&prev.choice.design===home.id&&prev.choice.stories===stories?prev.choice:null;
 // Existing buildings (lat/lng rings) near the boundary; homes, setbacks and aisles keep clear of them.
 const reach=Math.max(...local.map(p=>Math.hypot(p[0],p[1])));
 const obstacles=(opts.obstacles||[]).map(ring=>ring.map(toLocal)).filter(ring=>ring.length>2&&ring.some(p=>Math.hypot(p[0],p[1])<reach+5));
 const fine=polygonAreaM2(local)<20000,us=phases(fine?8:2,held?.pu),vs=phases(fine?4:2);
 const search=theta=>{
  let top=null;
  for(const pu of us){
   const units=pack(local,theta,pu,vs,setbackM,aisleM,home,obstacles);
   if(!units)return null;
   if(!top||units.length>top.units.length)top={theta,pu,units};
  }
  return top;
 };
 let kept=null,best=null;
 if(held){kept=search(held.theta);if(!kept)return {...result,status:'too-large'}}
 if(opts.lock&&kept?.units.length)best=kept;
 else{
  for(const theta of thetas){
   const candidate=search(theta);
   if(!candidate)return {...result,status:'too-large'};
   if(!best||candidate.units.length>best.units.length)best=candidate;
  }
  // Off a drag, keep the held grid angle while it is still edge-aligned and within one home of the best.
  if(kept?.units.length&&thetas.some(t=>sameAngle(t,kept.theta))&&kept.units.length>=best.units.length-1)best=kept;
 }

 // opts.limit counts homes; each footprint carries one home per story.
 const wanted=Number.isFinite(opts.limit)&&opts.limit>0?Math.ceil(opts.limit/stories):Infinity;
 const units=capUnits(best.units,Math.min(SPEC.maxUnits,wanted)),half=[home.unitLength/2,home.unitWidth/2];
 result.choice={n,design:home.id,stories,theta:best.theta,pu:best.pu};
 result.limit=Number.isFinite(wanted)?wanted:null;result.fitCount=best.units.length*stories;result.count=units.length*stories;
 result.units=units.map(({x,z,rotY,module,side,u,v,mu})=>({x,z,rotY,module,side,u,v,mu}));result.theta=best.theta;result.outline=local;result.obstacles=obstacles;
 result.mains=[...new Set(units.map(unit=>Math.round(unit.mu*1000)/1000))].sort((a,b)=>a-b);
 result.footprintsLatLng=units.map(({x,z,rotY})=>{
  const c=Math.cos(rotY),s=Math.sin(rotY);
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([i,j])=>toLatLng([x+i*half[0]*c+j*half[1]*s,z-i*half[0]*s+j*half[1]*c]));
 });
 if(units.length)result.focus=[units.reduce((t,u)=>t+u.x,0)/units.length,units.reduce((t,u)=>t+u.z,0)/units.length];
 if(!units.length)result.status='no-fit';
 return result;
}

// Schematic service routing: a main under each aisle, a branch to every home, a collector joining the mains, and a run
// to an ASSUMED point of connection on the boundary. Real mains, capacity, pipe sizes and sewer slopes are unknown here.
// Returns segments in local metres as [x1,z1,x2,z2], per service the style actually has.
export const SERVICE_OFFSET={water:-.5,sewer:0,power:.5};
export function routeUtilities(layout){
 const home=layout.design,routes={services:{},poc:null,connections:layout.units.length,note:home.utilityNote};
 if(!layout.units.length||!home.utilities.length||!layout.mains.length)return routes;
 const c=Math.cos(layout.theta),s=Math.sin(layout.theta),toLocal=(u,v)=>[u*c+v*s,-u*s+v*c],toFrame=(x,z)=>[x*c-z*s,x*s+z*c];
 // Each home is served from the nearest aisle main, from the middle of its door face.
 const served=layout.units.map(unit=>{
  const door=[Math.cos(unit.rotY),-Math.sin(unit.rotY)],along=[Math.sin(unit.rotY),Math.cos(unit.rotY)];
  const face=[unit.x+door[0]*home.unitLength/2,unit.z+door[1]*home.unitLength/2],[fu]=toFrame(...face);
  const mu=layout.mains.reduce((best,m)=>Math.abs(m-fu)<Math.abs(best-fu)?m:best,layout.mains[0]);
  return {face,along,mu,v:toFrame(unit.x,unit.z)[1]};
 });
 const used=[...new Set(served.map(h=>h.mu))].sort((a,b)=>a-b);
 const collectorV=Math.min(...served.map(h=>h.v))-home.slabWidth/2-1.2;
 // Assumed connection: the boundary point nearest either end of the collector.
 const frame=layout.outline.map(([x,z])=>toFrame(x,z));
 const nearest=p=>{let best=null;frame.forEach((a,k)=>{const b=frame[(k+1)%frame.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1))),q=[a[0]+t*dx,a[1]+t*dy],d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(!best||d<best.d)best={q,d}});return best};
 const ends=[[used[0],collectorV],[used[used.length-1],collectorV]].map(p=>({p,...nearest(p)})).sort((a,b)=>a.d-b.d)[0];
 routes.poc=toLocal(...ends.q);
 for(const service of home.utilities){
  const o=SERVICE_OFFSET[service],mains=[],branches=[];
  for(const mu of used)mains.push([...toLocal(mu+o,collectorV+o),...toLocal(mu+o,Math.max(...served.filter(h=>h.mu===mu).map(h=>h.v)))]);
  if(used.length>1)mains.push([...toLocal(used[0]+o,collectorV+o),...toLocal(used[used.length-1]+o,collectorV+o)]);
  mains.push([...toLocal(ends.p[0]+o,collectorV+o),...toLocal(...ends.q)]);
  // A branch leaves the door face at the same offset as the run drawn inside the home, then heads for its main.
  for(const h of served){const start=[h.face[0]+h.along[0]*o,h.face[1]+h.along[1]*o],[,sv]=toFrame(...start);branches.push([...start,...toLocal(h.mu+o,sv)])}
  const length=list=>list.reduce((t,[x1,z1,x2,z2])=>t+Math.hypot(x2-x1,z2-z1),0);
  routes.services[service]={mains,branches,mainFt:Math.round(metresToFeet(length(mains))),branchFt:Math.round(metresToFeet(length(branches)))};
 }
 return routes;
}

// Hand placement. A home may go anywhere its slab keeps the setback, stays clear of traced buildings and does not
// overlap another home. The access aisle is NOT checked for hand-placed homes; that is the arranger's call.
const slabCorners=(home,{x,z,rotY},grow=0)=>{const c=Math.cos(rotY),s=Math.sin(rotY),a=home.slabLength/2+grow,b=home.slabWidth/2+grow;return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([i,j])=>[x+i*a*c+j*b*s,z-i*a*s+j*b*c])};
const polygonsOverlap=(p,q)=>p.some(corner=>pointInPolygon(corner,q))||q.some(corner=>pointInPolygon(corner,p))||p.some((a,i)=>q.some((b,j)=>properlyCross(a,p[(i+1)%p.length],b,q[(j+1)%q.length])));
export function canPlace(layout,index,pose){
 const home=layout.design,clear=Math.max(0,layout.setbackM-EPS);
 if(!rectInsidePolygon(slabCorners(home,pose,clear),layout.outline))return false;
 const slab=slabCorners(home,pose);
 if(layout.obstacles.some(ring=>polygonsOverlap(slab,ring)))return false;
 return !layout.units.some((other,k)=>k!==index&&Math.hypot(other.x-pose.x,other.z-pose.z)<home.slabLength+home.slabWidth&&polygonsOverlap(slab,slabCorners(home,other)));
}
// The same layout with hand-edited homes: counts, map footprints and camera focus follow.
export function withUnits(layout,units){
 const home=layout.design,{toLatLng}=makeProjector(layout.center),half=[home.unitLength/2,home.unitWidth/2];
 return {...layout,custom:true,units,count:units.length*layout.stories,fitCount:Math.max(layout.fitCount,units.length*layout.stories),status:units.length?'ok':'no-fit',
  footprintsLatLng:units.map(({x,z,rotY})=>{const c=Math.cos(rotY),s=Math.sin(rotY);return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([i,j])=>toLatLng([x+i*half[0]*c+j*half[1]*s,z-i*half[0]*s+j*half[1]*c]))}),
  focus:units.length?[units.reduce((t,u)=>t+u.x,0)/units.length,units.reduce((t,u)=>t+u.z,0)/units.length]:layout.focus};
}
// A free spot for one more home: tries the automatic grid's angle on a widening spiral from the middle of the homes.
export function findSpot(layout){
 const rotY=layout.units[0]?.rotY??layout.theta,[cx,cz]=layout.focus;
 for(let radius=0;radius<150;radius+=1.5)for(let k=0,n=Math.max(1,Math.round(radius*2));k<n;k++){
  const angle=k/n*Math.PI*2,pose={x:cx+Math.cos(angle)*radius,z:cz+Math.sin(angle)*radius,rotY};
  if(canPlace(layout,-1,pose))return pose;
 }
 return null;
}

// One set of numbers and wording shared by the sidebar, results, slides, brief, watermark and model tools.
export function summarize(layout){
 const setbackFt=Math.round(metresToFeet(layout.setbackM)),aisleFt=Math.round(metresToFeet(layout.aisleM)),home=layout.design;
 return {
  status:layout.status,homes:layout.count,geometricFit:layout.fitCount,
  // capped = the 60-home display cap cut the fit; limited = the user asked for only the homes a target needs.
  capped:layout.fitCount>layout.count&&layout.units.length>=SPEC.maxUnits,limited:layout.limit!==null&&layout.fitCount>layout.count&&layout.units.length<SPEC.maxUnits,
  stories:layout.stories,footprints:layout.units.length,storiesWanted:layout.stacking.wanted,storiesHeldBy:layout.stacking.heldBy,storiesUnchecked:layout.stacking.unchecked,storyHeightFt:layout.stacking.storyHeightFt,maxStoriesForStyle:home.maxStories,stackSource:home.stackSource,
  peoplePerHome:home.peoplePerHome,people:layout.count*home.peoplePerHome,peopleIfAllFit:Math.min(layout.fitCount,SPEC.maxUnits*layout.stories)*home.peoplePerHome,
  maker:home.maker,sourceUrl:home.url,derived:home.derived,peopleNote:home.peopleNote,
  occupancyBasis:`People per home is a planning assumption (${home.peopleNote.toLowerCase()}), not an occupancy rating.`,
  areaSqFt:Math.round(layout.areaSqFt),setbackFt,aisleFt,
  design:home.id,designName:home.name,designPlural:home.plural,unitFootprint:home.footprint,unitSqFt:home.sqFt,footprintSource:home.footprintSource,
  custom:!!layout.custom,
  basis:layout.custom?`${layout.units.length} ${home.footprint} ${home.name} footprints arranged by hand from the automatic fit${layout.stories>1?`, stacked ${layout.stories} stories`:''}. Setback, overlap and traced buildings were checked; access aisles were NOT. Not verified site feasibility.`:`Geometric fit of ${home.footprint} ${home.name} footprints${layout.stories>1?`, stacked ${layout.stories} stories with an access gallery and stair,`:''} at a ${setbackFt} ft boundary setback with a ${aisleFt} ft access aisle. Not verified site feasibility.`,
  illustrative:true
 };
}
