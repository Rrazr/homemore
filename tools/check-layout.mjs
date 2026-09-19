// Run with: node tools/check-layout.mjs   (no dependencies)
import assert from 'node:assert/strict';
import {SPEC,DESIGNS,computeLayout,makeProjector,summarize,resolveStories,routeUtilities,canPlace,withUnits,findSpot} from '../dist/layout.js';

const preset=[[33.9037443,-118.0165491],[33.9036163,-118.0163137],[33.9033157,-118.0165509],[33.9034437,-118.0167863]];

// Independent geometry, deliberately not imported from layout.js.
function inside([x,y],poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c}
function segmentDistance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)}
const edgeDistance=(p,poly)=>Math.min(...poly.map((a,i)=>segmentDistance(p,a,poly[(i+1)%poly.length])));

function checkGeometry(points,layout,label){
 const {toLocal}=makeProjector(layout.center),poly=points.map(toLocal),home=layout.design;
 layout.units.forEach((unit,k)=>{
  const c=Math.cos(unit.rotY),s=Math.sin(unit.rotY);
  for(const [i,j] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
   const corner=[unit.x+i*home.slabLength/2*c+j*home.slabWidth/2*s,unit.z-i*home.slabLength/2*s+j*home.slabWidth/2*c];
   assert(inside(corner,poly),`${label}: unit ${k} slab corner outside boundary`);
   assert(edgeDistance(corner,poly)>=layout.setbackM-1e-4,`${label}: unit ${k} closer than the setback`);
  }
  // The clear aisle in front of the door must also be inside the boundary.
  const reach=home.slabLength/2+home.front+layout.aisleM-.01;
  assert(inside([unit.x+reach*c,unit.z-reach*s],poly),`${label}: unit ${k} aisle leaves the boundary`);
 });
 // No two slabs overlap (separating-axis test on each unit's own axes).
 for(let a=0;a<layout.units.length;a++)for(let b=a+1;b<layout.units.length;b++){
  const A=layout.units[a],B=layout.units[b],c=Math.cos(A.rotY),s=Math.sin(A.rotY);
  const du=Math.abs((B.x-A.x)*c-(B.z-A.z)*s),dv=Math.abs((B.x-A.x)*s+(B.z-A.z)*c);
  assert(du>=home.slabLength-1e-6||dv>=home.slabWidth-1e-6,`${label}: units ${a} and ${b} overlap`);
 }
 // Mirror guard: homes across an aisle face each other.
 const across=layout.aisleM+2*home.front+home.slabLength;
 for(const A of layout.units){
  const door=[Math.cos(A.rotY),-Math.sin(A.rotY)];
  const partner=layout.units.find(B=>B!==A&&Math.abs(Math.cos(A.rotY-B.rotY)+1)<1e-9&&Math.abs((B.x-A.x)*door[1]-(B.z-A.z)*door[0])<.01&&Math.abs(Math.hypot(B.x-A.x,B.z-A.z)-across)<.01);
  if(partner)assert((partner.x-A.x)*door[0]+(partner.z-A.z)*door[1]>0,`${label}: door faces away from its aisle`);
 }
}

// Projection round trip.
const projector=makeProjector(preset[0]);
for(const p of preset){const q=projector.toLatLng(projector.toLocal(p));assert(Math.abs(q[0]-p[0])<1e-9&&Math.abs(q[1]-p[1])<1e-9,'projection round trip')}

// Preset boundary.
const base=computeLayout(preset);
assert.equal(base.status,'ok');assert(base.count>0,'preset fits at least one home');
checkGeometry(preset,base,'preset');
assert.equal(base.footprintsLatLng.length,base.units.length);assert.equal(base.stories,1);
assert.equal(summarize(base).homes,base.count);

// Count never rises as the setback grows.
let last=Infinity;
for(let setbackM=0;setbackM<=9;setbackM+=.5){
 const layout=computeLayout(preset,{setbackM});checkGeometry(preset,layout,`setback ${setbackM}`);
 assert(layout.count<=last,`count rose at setback ${setbackM}`);last=layout.count;
}

// Every design: geometry holds on the preset and summaries name the design.
for(const id of Object.keys(DESIGNS)){
 for(const setbackM of [0,1.524,3.048]){const layout=computeLayout(preset,{design:id,setbackM});checkGeometry(preset,layout,`${id} @${setbackM}`)}
 const layout=computeLayout(preset,{design:id});
 assert(layout.count>0,`${id} fits the preset`);assert.equal(summarize(layout).people,layout.count*DESIGNS[id].peoplePerHome);
 assert.equal(summarize(layout).design,id);
}
assert.equal(computeLayout(preset,{design:'nope'}).design.id,'box','unknown design falls back to the box');
assert.equal(computeLayout(preset,{design:'cabin',lock:true},base).design.id,'cabin','a held arrangement never pins the old design');

// A home limit places exactly that many, and the people estimate follows the design's assumption.
for(const limit of [1,5,9,16,40]){const layout=computeLayout(preset,{limit});assert.equal(layout.count,Math.min(limit,base.count),`limit ${limit}`);checkGeometry(preset,layout,`limit ${limit}`)}
assert.equal(summarize(computeLayout(preset,{design:'double'})).people,computeLayout(preset,{design:'double'}).count*2);
assert.equal(summarize(computeLayout(preset,{limit:5})).limited,true);assert.equal(summarize(base).limited,false);

// An existing building inside the boundary is kept clear, slab and aisle alike.
{
 const c=base.center,ring=[[c[0]+.00004,c[1]-.00005],[c[0]+.00004,c[1]+.00005],[c[0]-.00004,c[1]+.00005],[c[0]-.00004,c[1]-.00005]];
 const blocked=computeLayout(preset,{obstacles:[ring]});checkGeometry(preset,blocked,'obstacle');
 assert(blocked.count<base.count,'a building inside the boundary removes homes');
 const {toLocal}=makeProjector(blocked.center),block=ring.map(toLocal);
 for(const unit of blocked.units)for(const [i,j] of [[-1,-1],[1,-1],[1,1],[-1,1],[0,0]]){const k=Math.cos(unit.rotY),n=Math.sin(unit.rotY),h=blocked.design;assert(!inside([unit.x+i*h.slabLength/2*k+j*h.slabWidth/2*n,unit.z-i*h.slabLength/2*n+j*h.slabWidth/2*k],block),'home overlaps the building')}
 assert.equal(computeLayout(preset,{obstacles:[[[10,10],[10,10.001],[10.001,10.001]]]}).count,base.count,'far-away buildings are ignored');
}

// Stories: only with a stackable style AND a local limit the user typed in; never assumed.
{
 const casita=DESIGNS.casita,box=DESIGNS.box;
 assert.deepEqual([resolveStories(casita,{stories:3}).stories,resolveStories(casita,{stories:3}).unchecked],[3,true],'no limit entered: drawn, and flagged unchecked');
 assert.equal(resolveStories(casita,{stories:3,heightLimitFt:60}).unchecked,false);
 assert.deepEqual([resolveStories(box,{stories:2,heightLimitFt:60}).stories,resolveStories(box,{stories:2,heightLimitFt:60}).heldBy],[1,'style']);
 assert.deepEqual([resolveStories(casita,{stories:3,heightLimitFt:25}).stories,resolveStories(casita,{stories:3,heightLimitFt:25}).heldBy],[2,'height']);
 assert.deepEqual([resolveStories(casita,{stories:3,heightLimitFt:60,storyLimit:2}).stories,resolveStories(casita,{stories:3,heightLimitFt:60,storyLimit:2}).heldBy],[2,'story-limit']);
 assert.equal(resolveStories(casita,{stories:3,heightLimitFt:60}).stories,3);assert.equal(resolveStories(casita,{stories:1}).heldBy,null);
 const flat=computeLayout(preset,{design:'casita'}),stacked=computeLayout(preset,{design:'casita',stories:2,heightLimitFt:35});
 checkGeometry(preset,stacked,'stacked casita');
 assert.equal(stacked.stories,2);assert.equal(stacked.count,stacked.units.length*2);
 assert(stacked.units.length<=flat.units.length,'the access gallery and stair never add footprints');
 assert.equal(summarize(stacked).people,stacked.count*casita.peoplePerHome);
 assert.equal(computeLayout(preset,{design:'casita',stories:2,heightLimitFt:35,limit:5}).count,6,'a home limit rounds up to whole stacks');
}

// Utilities: only the services a style really has, one branch per home, mains that stay with the homes.
{
 const routes=routeUtilities(base);
 assert.deepEqual(Object.keys(routes.services).sort(),['power','sewer','water']);
 for(const service of Object.values(routes.services)){assert.equal(service.branches.length,base.units.length);assert(service.mainFt>0&&service.branchFt>0)}
 assert(routes.poc,'an assumed point of connection is given');
 const {toLocal}=makeProjector(base.center),poly=preset.map(toLocal);
 assert(edgeDistance(routes.poc,poly)<.01,'the connection point sits on the boundary');
 assert.deepEqual(Object.keys(routeUtilities(computeLayout(preset,{design:'lihi'})).services),['power']);
 assert.deepEqual(Object.keys(routeUtilities(computeLayout(preset,{design:'hut'})).services),[]);
 assert.deepEqual(routeUtilities(computeLayout([])).services,{});
}

// Hand placement: valid where it stands, invalid on a neighbour, outside the boundary or inside the setback.
{
 const unit=base.units[0],other=base.units[1];
 assert(canPlace(base,0,unit),'a home is valid where the fit put it');
 assert(!canPlace(base,0,{...unit,x:other.x,z:other.z}),'cannot sit on a neighbour');
 assert(!canPlace(base,0,{...unit,x:unit.x+500}),'cannot leave the boundary');
 const moved=base.units.map((u,k)=>k?u:{...u,rotY:u.rotY+Math.PI});
 const edited=withUnits(base,moved);
 assert.equal(edited.custom,true);assert.equal(edited.count,base.count);assert.equal(summarize(edited).custom,true);
 assert.equal(routeUtilities(edited).services.water.branches.length,base.units.length,'moved homes are still served');
 const fewer=withUnits(base,base.units.slice(1));assert.equal(fewer.count,base.count-1);
 const spot=findSpot(fewer);assert(spot&&canPlace(fewer,-1,spot),'a free spot is found after removing a home');
}

// Winding and start index do not change the count.
assert.equal(computeLayout([...preset].reverse()).count,base.count,'reversed winding');
assert.equal(computeLayout([...preset.slice(2),...preset.slice(0,2)]).count,base.count,'rotated start index');

// Duplicate clicks are ignored.
assert.equal(computeLayout([preset[0],preset[0],...preset.slice(1)]).count,base.count,'duplicate point');

// Concave L-shaped lot.
const at=(east,south)=>makeProjector(preset[0]).toLatLng([east,south]);
const lot=[at(0,0),at(60,0),at(60,25),at(28,25),at(28,60),at(0,60)];
for(const id of Object.keys(DESIGNS)){const concave=computeLayout(lot,{design:id});assert(concave.count>0,`${id} fits the L-shape`);checkGeometry(lot,concave,`L-shape ${id}`)}

// Degenerate input.
assert.equal(computeLayout([at(0,0),at(30,30),at(30,0),at(0,30)]).status,'self-intersecting');
assert.equal(computeLayout(preset.slice(0,2)).status,'incomplete');
assert.equal(computeLayout([at(0,0),at(80,0),at(80,3),at(0,3)]).count,0,'3 m sliver');
assert.equal(computeLayout([]).count,0);

// Large sites are capped and stay fast.
const big=computeLayout([at(0,0),at(300,0),at(300,300),at(0,300)]);
assert(big.count<=SPEC.maxUnits&&big.fitCount>big.count,'large site capped');
assert.equal(computeLayout([at(0,0),at(5000,0),at(5000,5000),at(0,5000)]).status,'too-large');

// Drag lock: nudging a corner while locked keeps the arrangement.
const nudged=preset.map((p,i)=>i?p:[p[0]+.00001,p[1]]);
assert.deepEqual(computeLayout(nudged,{lock:true},base).choice,base.choice,'locked drag keeps the arrangement');

const start=performance.now();
for(let i=0;i<1000;i++)computeLayout(preset,{lock:true},base);
const average=(performance.now()-start)/1000;
assert(average<4,`layout too slow: ${average.toFixed(2)} ms`);

console.log(`designs on the preset: ${Object.keys(DESIGNS).map(id=>`${id} ${computeLayout(preset,{design:id}).count}`).join(' · ')}`);
console.log(`layout checks passed · preset: ${base.count} homes at ${summarize(base).setbackFt} ft, ${computeLayout(preset,{setbackM:3.048}).count} at 10 ft · ${Math.round(base.areaSqFt).toLocaleString()} sq ft · ${average.toFixed(2)} ms/layout`);
