import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {siteContext} from './site-context.js';
import {makeProjector,summarize,routeUtilities,canPlace,ACCESS,SERVICE_OFFSET} from './layout.js?v=fit-14';

// Architectural concept geometry. Footprint is published; height and exterior are illustrative.
// Home positions come from layout.js, the same geometric fit drawn on the map.
// options: view = camera pose to keep across rebuilds; instant = skip the build animation; onEdit(units) = a home moved.
export async function createScene(container,boundary,layout,options={}){
 const {toLocal}=makeProjector(layout.center),summary=summarize(layout);
 const outline=boundary.map(toLocal); const span=Math.max(65,...outline.flatMap(p=>p.map(v=>Math.abs(v)*2+15)));
 const focus=new THREE.Vector3(layout.focus[0],0,layout.focus[1]);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#f1f2f4');scene.fog=new THREE.Fog('#f1f2f4',span*2,span*4);
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;container.replaceChildren(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(36,1,.1,2000);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.055;controls.maxPolarAngle=Math.PI*.47;controls.minDistance=12;controls.maxDistance=span*2.5;controls.target.copy(focus);controls.autoRotate=!matchMedia('(prefers-reduced-motion: reduce)').matches;controls.autoRotateSpeed=.32;
 const hemi=new THREE.HemisphereLight('#e9f5ff','#abb3bd',2.1);scene.add(hemi);
 const sun=new THREE.DirectionalLight('#ffffff',2.6),reach=Math.max(60,span*.6);sun.position.set(focus.x-35,65,focus.z+30);sun.target.position.copy(focus);scene.add(sun.target);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-reach,right:reach,top:reach,bottom:-reach,near:1,far:Math.max(180,reach*3)});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.0004;scene.add(sun);
 const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});
 // Standalone architectural study with traced map context; no satellite texture.
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(600,span*4),Math.max(600,span*4)),mat('#f1f2f4'));
 ground.rotation.x=-Math.PI/2;ground.position.y=-.16;ground.receiveShadow=true;scene.add(ground);
 // Context is georeferenced to the map, independent of the proposed housing rotation.
 const contextMaterials={building:mat('#cbd0d7'),land:mat('#cbd8c9'),pavement:mat('#e0e2e5'),path:mat('#e8e8e5'),court:mat('#d2d8d5')};
 for(const feature of siteContext){
  const points=feature.coordinates.map(toLocal);
  const footprint=new THREE.Shape();points.forEach(([x,z],i)=>i?footprint.lineTo(x,-z):footprint.moveTo(x,-z));footprint.closePath();
  const building=feature.kind==='building';
  const geometry=building?new THREE.ExtrudeGeometry(footprint,{depth:feature.height,bevelEnabled:false}):new THREE.ShapeGeometry(footprint);
  const mesh=new THREE.Mesh(geometry,contextMaterials[feature.kind]);mesh.name=feature.name;
  mesh.rotation.x=-Math.PI/2;mesh.position.y=building?-.08:feature.kind==='path'?-.07:-.1;
  mesh.castShadow=building;mesh.receiveShadow=true;scene.add(mesh);
  if(building){const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:'#b9c0c8',transparent:true,opacity:.55}));mesh.add(edges)}
 }
 const shape=new THREE.Shape();outline.forEach((p,i)=>i?shape.lineTo(p[0],-p[1]):shape.moveTo(p[0],-p[1]));shape.closePath();const tint=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:'#dce9df',transparent:true,opacity:.65,side:THREE.DoubleSide}));tint.rotation.x=-Math.PI/2;tint.position.y=.01;scene.add(tint);
 const edges=outline.map(p=>new THREE.Vector3(p[0],.12,p[1]));edges.push(edges[0]);scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(edges),new THREE.LineBasicMaterial({color:'#729d86'})));

 // One prototype home: every box is baked into place, then merged per material so all homes share a few geometries.
 const parts={};
 const part=(key,w,h,d,x,y,z)=>{const geometry=new THREE.BoxGeometry(w,h,d);geometry.translate(x,y,z);(parts[key]??=[]).push(geometry)};
 // The prototype adapts to any footprint: L runs back-to-door (toward the aisle), W runs along the aisle, H is wall height.
 const stories=layout.stories,home=layout.design,L=home.unitLength,W=home.unitWidth,H=home.height,hx=L/2,hz=W/2,base=.12;
 const doorHeight=Math.min(2.13,H-.15),windowY=base+H*.62,windowHeight=Math.min(.86,H*.33);
 const doorZs=home.doors>1?Array.from({length:home.doors},(_,k)=>-hz+W*(k+.5)/home.doors+.45):[home.joined||(W<3&&!home.porch)?hz-.78:0];
 part('concrete',home.slabLength,base,home.slabWidth,0,base/2,0);
 part('wall',L,H,W,0,base+H/2,0);
 part('roof',L+.16,.16,W+.1416,0,base+H+.08,0);
 // Vertical panel seams on the side and back walls, and structural corner trims.
 for(let x=-hx+.2;x<hx;x+=.36){part('seam',.025,H-.1,.024,x,base+H/2-.015,hz+.0108);part('seam',.025,H-.1,.024,x,base+H/2-.015,-hz-.0108)}
 if(W>L)for(let z=-hz+.2;z<hz;z+=.36)part('seam',.024,H-.1,.025,-hx-.0108,base+H/2-.015,z);
 for(const x of [-hx+.025,hx-.025])for(const zz of [-hz-.0108,hz+.0108])part('trim',.07,H+.08,.07,x,base+H/2+.005,zz);
 part('trim',L+.07,.1,.08,0,.23,hz+.0308);part('trim',L+.07,.1,.08,0,base+H-.01,hz+.0308);
 // Entrances face the access aisle: a glazed door per private room, each with a small window where there is room.
 const endWindows=home.doors>1?doorZs.map(z=>z-1.05):W>5?[-1.9,1.9]:home.joined?[doorZs[0]-1.08,-hz+.78]:W>=3?[-1.1,1.1]:W>2.2?[doorZs[0]-1.08]:[];
 for(const doorZ of doorZs){
  part('trim',.08,doorHeight,.87,hx+.0144,.155+doorHeight/2,doorZ);part('glass',.025,doorHeight-.37,.65,hx+.0614,.225+doorHeight/2,doorZ);part('wood',.04,.08,.12,hx+.0924,1.12,doorZ-.32);
  if(stories>1&&doorZ===doorZs[0])part('concrete',ACCESS.gallery,.06,W,hx+ACCESS.gallery/2,.03,0);
  if(!home.porch&&stories===1){part('concrete',.95,.1,Math.min(2.1,W/home.doors-.3),hx+.4244,.15,home.doors>1?doorZ:0);part('trim',.8,.08,1.2,hx+.2544,base+H-.07,doorZ)}
 }
 for(const zz of endWindows){part('trim',.1,windowHeight,.85,hx+.0144,windowY,zz);part('glass',.025,windowHeight-.16,.69,hx+.0714,windowY,zz)}
 for(const xx of L>=4.5?[-L*.19,L*.216]:L>=2.2?[0]:[]){part('trim',1.14,windowHeight+.16,.08,xx,windowY,hz+.0388);part('glass',.96,windowHeight,.025,xx,windowY,hz+.0908);part('trim',.04,windowHeight+.01,.035,xx,windowY,hz+.1138)}
 // Two joined boxes read as one home with a visible module joint.
 if(home.joined){part('trim',.03,H-.05,.05,hx+.005,base+H/2,0);part('trim',.03,H-.05,.05,-hx-.005,base+H/2,0);part('trim',L+.16,.03,.06,0,base+H+.175,0)}
 if(home.porch){
  const px=hx+home.porch/2,porchRoofY=base+H-.2;
  part('wood',home.porch,.14,W,px,.07,0);part('roof',home.porch+.25,.1,W+.1416,px+.05,porchRoofY,0);
  for(const zz of W>3?[-hz+.12,0,hz-.12]:[-hz+.12,hz-.12])part('trim',.1,porchRoofY-.14,.1,hx+home.porch-.12,(porchRoofY+.14)/2,zz);
 }
 part('meter',.45,.45,.5,-hx-.0544,.4,-hz+Math.min(.57,hz));
 // Door number: above the door when the wall is tall enough, beside it otherwise.
 const plateAbove=base+H-(home.porch?.49:.24)>.155+doorHeight+.12;
 const platePosition=[hx+.0804,plateAbove?base+H-(home.porch?.49:.24):1.6,doorZs[0]+(plateAbove?(home.porch?.75:.01):.62)];
 const unitMaterials={concrete:mat('#d1d3c9'),wall:mat('#e5ece7'),roof:mat('#c4cec9'),seam:mat('#c6d1ca'),trim:mat('#314d48'),glass:mat('#79a5af',{roughness:.15,metalness:.35}),wood:mat('#bb9467'),meter:mat('#a3aaa4'),metal:mat('#93a19c',{roughness:.45,metalness:.5})};
 const castsShadow=new Set(['concrete','wall','roof','meter']);
 const prototype=Object.entries(parts).flatMap(([key,list])=>{
  const merged=mergeGeometries(list);if(merged)list.forEach(g=>g.dispose());
  return (merged?[merged]:list).map(geometry=>({geometry,material:unitMaterials[key],cast:castsShadow.has(key)}));
 });
 // Access for stacked homes: a gallery on columns along the door face, and a stair flight with a landing beside it.
 // Railings are posts and rails, so the homes behind them stay visible.
 const accessParts={};
 if(stories>1){
  const add=(key,w,h,d,x,y,z)=>{const geometry=new THREE.BoxGeometry(w,h,d);geometry.translate(x,y,z);(accessParts[key]??=[]).push(geometry)};
  const rise=home.storyHeight,run=Math.min(W-ACCESS.stair-.2,rise/Math.tan(33*Math.PI/180)),steps=17,edge=hx+ACCESS.gallery,sx=edge+ACCESS.stair/2,landing=-hz+run;
  // Guard rail along z from a to b at x, on a deck whose top is at y = 0.
  const guard=(x,a,b)=>{const length=b-a;if(length<.3)return;for(const y of [1.05,.55,.12])add('metal',.04,.04,length,x,y,(a+b)/2);const posts=Math.max(2,Math.round(length/1.1)+1);for(let k=0;k<posts;k++)add('metal',.045,1.05,.045,x,.525,a+length*k/(posts-1))};
  add('concrete',ACCESS.gallery,.14,W,hx+ACCESS.gallery/2,-.07,0);
  add('concrete',ACCESS.stair,.14,ACCESS.stair,sx,-.07,landing+ACCESS.stair/2);
  for(const zz of [-hz+.1,0,hz-.1])add('metal',.09,rise-.14,.09,edge-.06,-rise/2-.07,zz); // columns down to the floor below
  guard(edge,-hz,landing);guard(edge,landing+ACCESS.stair,hz);guard(edge+ACCESS.stair,landing,landing+ACCESS.stair);
  for(let k=0;k<2;k++)add('metal',.04,.04,ACCESS.stair,sx,[1.05,.55][k],landing+ACCESS.stair);
  for(let k=0;k<steps;k++)add('concrete',ACCESS.stair-.1,.05,run/steps+.02,sx,-rise+(k+1)*rise/steps-.025,-hz+(k+.5)*run/steps);
  const slope=Math.hypot(run,rise),angle=-Math.atan2(rise,run);
  for(const [x,y,h,key] of [[edge+.03,-rise/2-.12,.22,'metal'],[edge+ACCESS.stair-.03,-rise/2-.12,.22,'metal'],[edge+ACCESS.stair-.03,-rise/2+.95,.04,'metal'],[edge+ACCESS.stair-.03,-rise/2+.5,.04,'metal']]){
   const beam=new THREE.BoxGeometry(.05,h,slope);beam.rotateX(angle);beam.translate(x,y,-hz+run/2);(accessParts[key]??=[]).push(beam);
  }
  for(let k=0;k<=4;k++)add('metal',.045,1,.045,edge+ACCESS.stair-.03,-rise+rise*k/4+.5,-hz+run*k/4);
 }
 const access=Object.entries(accessParts).flatMap(([key,list])=>{const merged=mergeGeometries(list);if(merged)list.forEach(g=>g.dispose());return (merged?[merged]:list).map(geometry=>({geometry,material:unitMaterials[key],cast:true}))});
 // Utilities view. Inside each home: a wet core and risers at the back, a panel and ceiling conduit, and the runs from the
 // door face that meet the branches outside. All of it is schematic.
 const serviceColors={water:'#2f80ed',sewer:'#2f9e6b',power:'#f2a93b'};let routes=routeUtilities(layout);const services=Object.keys(routes.services);
 const glow=color=>new THREE.MeshBasicMaterial({color});
 const serviceMaterials={water:glow(serviceColors.water),sewer:glow(serviceColors.sewer),power:glow(serviceColors.power),wet:new THREE.MeshBasicMaterial({color:'#8fc1ff',transparent:true,opacity:.35,depthWrite:false})};
 const insideParts={};
 {
  const add=(key,w,h,d,x,y,z)=>{const geometry=new THREE.BoxGeometry(w,h,d);geometry.translate(x,y,z);(insideParts[key]??=[]).push(geometry)};
  const coreDepth=Math.min(1.7,W*.45),riserX=-hx+.3;
  if(services.includes('water'))add('wet',1.5,H-.35,coreDepth,-hx+.8,base+(H-.35)/2,-hz+coreDepth/2+.05);
  for(const service of services){
   const o=SERVICE_OFFSET[service],size=service==='sewer'?.11:.07,riserZ=service==='power'?hz-.35:-hz+.3+(service==='sewer'?.25:0);
   add(service,L-.3,.05,size,.15-.0,base+.03,o);                                  // run from the door face to the back
   add(service,size,.05,Math.abs(riserZ-o)+size,riserX,base+.03,(riserZ+o)/2);    // across to the riser
   add(service,size,H+.3,size,riserX,base+H/2,riserZ);                           // riser, continuous through stacked floors
   if(service==='power'){add('power',.12,.55,.4,-hx+.09,1.5,hz-.35);add('power',L-.5,.05,.05,0,base+H-.12,hz-.35);for(const x of [-L*.2,L*.25])add('power',.05,.9,.05,x,base+H-.55,hz-.35)}
  }
 }
 const inside=Object.entries(insideParts).flatMap(([key,list])=>{const merged=mergeGeometries(list);if(merged)list.forEach(g=>g.dispose());return (merged?[merged]:list).map(geometry=>({geometry,material:serviceMaterials[key],cast:false}))});
 // Outside: mains and branches as flat ribbons just above the ground, and a pin at the assumed connection point.
 const utilityGroup=new THREE.Group();utilityGroup.visible=false;scene.add(utilityGroup);
 const ribbon=([x1,z1,x2,z2],width,lift)=>{const length=Math.hypot(x2-x1,z2-z1),geometry=new THREE.BoxGeometry(length+width,.05,width);geometry.rotateY(-Math.atan2(z2-z1,x2-x1));geometry.translate((x1+x2)/2,lift,(z1+z2)/2);return geometry};
 function drawRoutes(){
  for(const child of [...utilityGroup.children]){utilityGroup.remove(child);child.geometry.dispose()}
  routes=routeUtilities(layout);
  services.forEach((service,k)=>{
  const route=routes.services[service];if(!route)return;const list=[...route.mains.map(seg=>ribbon(seg,.3,.06+k*.012)),...route.branches.map(seg=>ribbon(seg,.14,.05+k*.012))];
  const merged=mergeGeometries(list);if(merged){list.forEach(g=>g.dispose());utilityGroup.add(new THREE.Mesh(merged,serviceMaterials[service]))}
  });
  if(routes.poc&&services.length){
  const pin=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,.12,28),glow('#173c3a'));pin.position.set(routes.poc[0],.1,routes.poc[1]);utilityGroup.add(pin);
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,3,10),glow('#173c3a'));post.position.set(routes.poc[0],1.5,routes.poc[1]);utilityGroup.add(post);
  }
 }
 drawRoutes();
 // Homes are GPU instances of the prototype, so hundreds cost a handful of draw calls.
 const homes=new THREE.Group();scene.add(homes);
 const count=layout.units.length,delays=layout.units.map((_,index)=>index/count*Math.min(1400,300+count*12));
 const instance=(list,total)=>list.map(({geometry,material,cast})=>{const mesh=new THREE.InstancedMesh(geometry,material,Math.max(1,total));mesh.count=total;mesh.castShadow=cast;mesh.userData.cast=cast;mesh.receiveShadow=true;mesh.frustumCulled=false;homes.add(mesh);return mesh});
 const instanced=instance(prototype,count*stories),accessMeshes=instance(access,count*(stories-1)),insideMeshes=instance(inside,count*stories);
 for(const mesh of insideMeshes){mesh.visible=false;mesh.receiveShadow=false}
 const pose=new THREE.Object3D();
 // fold = 1 when fully open; fold-out homes arrive at their published folded width and open along the aisle.
 const place=(index,y,shown,fold)=>{
  const unit=layout.units[index];pose.rotation.set(0,unit.rotY,0);
  for(let story=0;story<stories;story++){
   pose.position.set(unit.x,y+story*home.storyHeight,unit.z);pose.scale.set(shown?1:0,shown?1:0,shown?fold:0);pose.updateMatrix();
   for(const mesh of instanced)mesh.setMatrixAt(index*stories+story,pose.matrix);
   for(const mesh of insideMeshes)mesh.setMatrixAt(index*stories+story,pose.matrix);
   if(story){pose.scale.setScalar(shown&&fold===1?1:0);pose.updateMatrix();for(const mesh of accessMeshes)mesh.setMatrixAt(index*(stories-1)+story-1,pose.matrix)}
  }
 };
 // Door numbers stay legible only on smaller concepts.
 const plate=new THREE.PlaneGeometry(.4,.2),plates=count<=120?layout.units.map((unit,index)=>{
  const g=new THREE.Group();g.position.set(unit.x,0,unit.z);g.rotation.y=unit.rotY;g.visible=false;homes.add(g);
  const numberCanvas=document.createElement('canvas');numberCanvas.width=128;numberCanvas.height=64;const nc=numberCanvas.getContext('2d');nc.fillStyle='#304e43';nc.fillRect(0,0,128,64);nc.fillStyle='#fff';nc.font='32px Arial';nc.textAlign='center';nc.fillText(String(index+1).padStart(2,'0'),64,44);const number=new THREE.Mesh(plate,new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(numberCanvas)}));number.rotation.y=Math.PI/2;number.position.set(...platePosition);g.add(number);
  return g;
 }):[];
 const radius=Math.max(42,Math.min(span*.78,160));let dead=false,raf;function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}function perspective(){camera.position.set(focus.x+radius*.8,radius*.85,focus.z+radius);controls.target.copy(focus);controls.update()}perspective();if(options.view){camera.position.fromArray(options.view.position);controls.target.fromArray(options.view.target);controls.autoRotate=false;controls.update()}resize();const observer=new ResizeObserver(resize);observer.observe(container);
 // Homes drop in one after another, then fold-out styles open to full width; rendering pauses while the view is hidden.
 const folded=home.foldRatio||1,unfoldMs=folded<1?1300:0;let start=performance.now()-(options.instant?60000:0),settled=false;
 function tick(){
  if(dead)return;raf=requestAnimationFrame(tick);
  if(container.hidden||!container.clientWidth)return;
  if(!settled){
   const elapsed=performance.now()-start;settled=true;
   for(let index=0;index<count;index++){
    const since=elapsed-delays[index],t=Math.min(1,Math.max(0,since/900)),y=(1-t)**3*5,shown=since>=0;
    const open=unfoldMs?Math.min(1,Math.max(0,(since-1000)/unfoldMs)):1,ease=open*open*(3-2*open),fold=folded+(1-folded)*ease;
    place(index,y,shown,fold);
    if(plates[index]){plates[index].visible=shown&&fold===1;plates[index].position.y=y}
    if(t<1||fold<1)settled=false;
   }
   for(const mesh of [...instanced,...accessMeshes,...insideMeshes])mesh.instanceMatrix.needsUpdate=true;
  }
  controls.update();renderer.render(scene,camera);
 }
 tick();
 function capture(){if(!settled){for(let index=0;index<count;index++){place(index,0,true,1);if(plates[index]){plates[index].visible=true;plates[index].position.y=0}}for(const mesh of [...instanced,...accessMeshes,...insideMeshes])mesh.instanceMatrix.needsUpdate=true;settled=true}renderer.render(scene,camera);const out=document.createElement('canvas');out.width=renderer.domElement.width;out.height=renderer.domElement.height;const cx=out.getContext('2d');cx.drawImage(renderer.domElement,0,0);const scale=out.width/1200;cx.fillStyle='#173e35e8';cx.fillRect(0,out.height-65*scale,out.width,65*scale);cx.fillStyle='white';cx.font=`${13*scale}px Arial`;cx.fillText(`ILLUSTRATIVE CONCEPT · ${summary.homes} ${summary.designPlural.toUpperCase()} · GEOMETRIC ESTIMATE · NOT VERIFIED SITE FEASIBILITY`,20*scale,out.height-39*scale);cx.font=`${10*scale}px Arial`;cx.fillText('Requires licensed professional review. Model details illustrative. Imagery © Esri, Maxar, Earthstar Geographics.',20*scale,out.height-18*scale);return out.toDataURL('image/png')}
 const wallMesh=instanced[prototype.findIndex(p=>p.material===unitMaterials.wall)],tints={plain:new THREE.Color('#ffffff'),selected:new THREE.Color('#aee6bd'),invalid:new THREE.Color('#f3a3a3')};
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3(),dom=renderer.domElement;
 let arranging=false,selected=-1,drag=null;
 const paint=(index,color)=>{if(index<0)return;for(let story=0;story<stories;story++)wallMesh.setColorAt(index*stories+story,color);wallMesh.instanceColor.needsUpdate=true};
 const refresh=index=>{place(index,0,true,1);if(plates[index]){plates[index].position.set(layout.units[index].x,0,layout.units[index].z);plates[index].rotation.y=layout.units[index].rotY}for(const mesh of [...instanced,...accessMeshes,...insideMeshes])mesh.instanceMatrix.needsUpdate=true};
 const aim=event=>{const box=dom.getBoundingClientRect();pointer.set((event.clientX-box.left)/box.width*2-1,-(event.clientY-box.top)/box.height*2+1);ray.setFromCamera(pointer,camera)};
 function select(index){paint(selected,tints.plain);selected=index;paint(selected,tints.selected);options.onSelect?.(selected)}
 dom.addEventListener('pointerdown',event=>{
  if(!arranging||event.button!==0||!settled)return;
  aim(event);const found=ray.intersectObject(wallMesh,false)[0];
  select(found?Math.floor(found.instanceId/stories):-1);
  if(!found||!ray.ray.intersectPlane(groundPlane,hit))return;
  const unit=layout.units[selected];drag={index:selected,dx:unit.x-hit.x,dz:unit.z-hit.z,from:{x:unit.x,z:unit.z},valid:true};
  controls.enabled=false;dom.setPointerCapture(event.pointerId);dom.style.cursor='grabbing';
 });
 dom.addEventListener('pointermove',event=>{
  if(!drag)return;aim(event);if(!ray.ray.intersectPlane(groundPlane,hit))return;
  const unit=layout.units[drag.index];unit.x=hit.x+drag.dx;unit.z=hit.z+drag.dz;
  drag.valid=canPlace(layout,drag.index,unit);paint(drag.index,drag.valid?tints.selected:tints.invalid);refresh(drag.index);
 });
 const drop=()=>{
  if(!drag)return;const unit=layout.units[drag.index],moved=drag.valid&&(unit.x!==drag.from.x||unit.z!==drag.from.z);
  if(!drag.valid){unit.x=drag.from.x;unit.z=drag.from.z}
  paint(drag.index,tints.selected);refresh(drag.index);wallMesh.computeBoundingSphere();
  controls.enabled=true;dom.style.cursor=arranging?'grab':'';drag=null;
  if(moved){drawRoutes();options.onEdit?.(layout.units)}
 };
 dom.addEventListener('pointerup',drop);dom.addEventListener('pointercancel',drop);
 function setArranging(on){
  arranging=!!on;dom.style.cursor=arranging?'grab':'';
  if(arranging){controls.autoRotate=false;for(let k=0;k<count*stories;k++)wallMesh.setColorAt(k,tints.plain);wallMesh.instanceColor.needsUpdate=true;wallMesh.computeBoundingSphere()}
  else select(-1);
  return arranging;
 }
 // Quarter turn in place; refused if the turned home would not fit.
 function rotateSelected(){
  if(selected<0)return 'none';const unit=layout.units[selected],before=unit.rotY;unit.rotY+=Math.PI/2;
  if(!canPlace(layout,selected,unit)){unit.rotY=before;return 'blocked'}
  refresh(selected);wallMesh.computeBoundingSphere();drawRoutes();options.onEdit?.(layout.units);return 'ok';
 }
 // See-through shells while the utilities are on.
 const shell=['wall','roof','seam','concrete'].map(key=>unitMaterials[key]);let utilitiesOn=false;
 function showUtilities(on){
  utilitiesOn=!!on;utilityGroup.visible=utilitiesOn;for(const mesh of insideMeshes)mesh.visible=utilitiesOn;
  for(const material of shell){material.transparent=utilitiesOn;material.opacity=utilitiesOn?.22:1;material.depthWrite=!utilitiesOn;material.needsUpdate=true}
  for(const mesh of instanced)if(shell.includes(mesh.material))mesh.castShadow=!utilitiesOn&&mesh.userData.cast;
  return utilitiesOn;
 }
 return {resize,capture,perspective,showUtilities,get utilities(){return routes},setArranging,rotateSelected,get selected(){return selected},select,getView:()=>({position:camera.position.toArray(),target:controls.target.toArray()}),foldsOut:folded<1,replay(){start=performance.now();settled=false},drawCalls:()=>renderer.info.render.calls,toggleOrbit(){controls.autoRotate=!controls.autoRotate;return controls.autoRotate},top(){controls.autoRotate=false;camera.position.set(focus.x,radius*1.4,focus.z+.1);controls.target.copy(focus);controls.update()},dispose(){dead=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose()}}});renderer.dispose();renderer.domElement.remove()}};
}
