import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

// Architectural concept geometry. Footprint is published; height and exterior are illustrative.
export async function createScene(container,boundary){
 const center=[boundary.reduce((s,p)=>s+p[0],0)/boundary.length,boundary.reduce((s,p)=>s+p[1],0)/boundary.length];
 const cos=Math.cos(center[0]*Math.PI/180),toLocal=p=>[(p[1]-center[1])*111320*cos,-(p[0]-center[0])*111320];
 const outline=boundary.map(toLocal); const span=Math.max(65,...outline.flatMap(p=>p.map(v=>Math.abs(v)*2+15)));
 const scene=new THREE.Scene();scene.background=new THREE.Color('#e4ece8');scene.fog=new THREE.Fog('#e4ece8',span*1.5,span*3.2);
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;container.replaceChildren(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(36,1,.1,2000);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.055;controls.maxPolarAngle=Math.PI*.47;controls.minDistance=12;controls.maxDistance=span*2.5;controls.target.set(0,0,0);controls.autoRotate=!matchMedia('(prefers-reduced-motion: reduce)').matches;controls.autoRotateSpeed=.32;
 const hemi=new THREE.HemisphereLight('#e9f5ff','#8c957c',2.8);scene.add(hemi);const sun=new THREE.DirectionalLight('#fff1d4',4);sun.position.set(-35,65,30);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-60,right:60,top:60,bottom:-60,near:1,far:180});sun.shadow.bias=-.0004;scene.add(sun);
 const concept=new THREE.Group();scene.add(concept);let longest=0;outline.forEach((p,i)=>{const q=outline[(i+1)%outline.length],dx=q[0]-p[0],dz=q[1]-p[1],length=dx*dx+dz*dz;if(length>longest){longest=length;concept.rotation.y=Math.atan2(dx,dz)}});
 const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});const concrete=mat('#d1d3c9'),wall=mat('#e5ece7'),trim=mat('#314d48'),glass=mat('#79a5af',{roughness:.15,metalness:.35}),wood=mat('#bb9467'),roof=mat('#c4cec9'),dark=mat('#48594e');
 const box=(w,h,d,x,y,z,m,parent=concept)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o};
 // Image tiles are drawn with real geographic alignment beneath the conceptual scene.
 const z=19,n=2**z;const tx=(center[1]+180)/360*n,ty=(1-Math.asinh(Math.tan(center[0]*Math.PI/180))/Math.PI)/2*n;
 const minX=Math.floor(tx)-2,minY=Math.floor(ty)-2,tileCount=5,canvas=document.createElement('canvas');canvas.width=canvas.height=tileCount*256;const ctx=canvas.getContext('2d');ctx.fillStyle='#bfcac0';ctx.fillRect(0,0,canvas.width,canvas.height);
 let goodTiles=0;await Promise.all(Array.from({length:tileCount*tileCount},(_,i)=>new Promise(resolve=>{const x=i%tileCount,y=Math.floor(i/tileCount),img=new Image();img.crossOrigin='anonymous';const timer=setTimeout(resolve,5000);img.onload=()=>{clearTimeout(timer);ctx.drawImage(img,x*256,y*256);goodTiles++;resolve()};img.onerror=()=>{clearTimeout(timer);resolve()};img.src=`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${minY+y}/${minX+x}`})));
 const metersTile=40075016.686*cos/n;const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();const ground=new THREE.Mesh(new THREE.PlaneGeometry(tileCount*metersTile,tileCount*metersTile),new THREE.MeshStandardMaterial({map:texture,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set((minX+tileCount/2-tx)*metersTile,-.12,(minY+tileCount/2-ty)*metersTile);ground.receiveShadow=true;scene.add(ground);
 const shape=new THREE.Shape();outline.forEach((p,i)=>i?shape.lineTo(p[0],-p[1]):shape.moveTo(p[0],-p[1]));shape.closePath();const tint=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:'#9cbcb0',transparent:true,opacity:.2,side:THREE.DoubleSide}));tint.rotation.x=-Math.PI/2;tint.position.y=.01;scene.add(tint);
 const edges=outline.map(p=>new THREE.Vector3(p[0],.12,p[1]));edges.push(edges[0]);scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(edges),new THREE.LineBasicMaterial({color:'#dcffb8'})));
 // The same prepared twelve-unit composition is revealed for every study boundary.
 // Its dimensions are not stretched to fit and it is never represented as computed feasibility.
 box(6.096,.045,37,0,.04,0,mat('#c4bb91',{transparent:true,opacity:.78}));
 for(let j=-16;j<17;j+=4)box(.11,.02,1.5,0,.075,j,mat('#f1e8cb'));
 const homes=new THREE.Group();concept.add(homes);let index=0;
 for(const side of [-1,1]) for(let row=0;row<6;row++){
  const g=new THREE.Group();g.position.set(side*7.25,0,(row-2.5)*4.6);if(side===1)g.rotation.y=Math.PI;homes.add(g);
  box(6.1,.12,2.8,0,.06,0,concrete,g);
  box(5.7912,2.65,2.4384,0,1.445,0,wall,g);
  box(5.95,.16,2.58,0,2.85,0,roof,g);
  // Vertical panel seams and structural corner trims.
  for(let x=-2.7;x<2.9;x+=.36){box(.025,2.55,.024,x,1.43,1.23,mat('#c6d1ca'),g);box(.025,2.55,.024,x,1.43,-1.23,mat('#c6d1ca'),g)}
  for(const x of [-2.87,2.87])for(const zz of [-1.23,1.23])box(.07,2.73,.07,x,1.45,zz,trim,g);
  box(5.86,.1,.08,0,.23,1.25,trim,g);box(5.86,.1,.08,0,2.76,1.25,trim,g);
  // Entrance faces the central aisle, with a glazed door and small window.
  box(.08,2.13,.87,2.91,1.22,.44,trim,g);box(.025,1.76,.65,2.957,1.29,.44,glass,g);box(.04,.08,.12,2.988,1.12,.12,wood,g);
  box(.1,.86,.85,2.91,1.77,-.64,trim,g);box(.025,.7,.69,2.967,1.77,-.64,glass,g);
  for(const xx of [-1.1,1.25]){box(1.14,1.02,.08,xx,1.77,1.258,trim,g);box(.96,.86,.025,xx,1.77,1.31,glass,g);box(.04,.87,.035,xx,1.77,1.333,trim,g)}
  box(.95,.1,2.1,3.32,.15,0,concrete,g);box(.8,.08,1.2,3.15,2.7,.44,trim,g);
  box(.45,.45,.5,-2.95,.4,-.65,mat('#a3aaa4'),g);
  const numberCanvas=document.createElement('canvas');numberCanvas.width=128;numberCanvas.height=64;const nc=numberCanvas.getContext('2d');nc.fillStyle='#304e43';nc.fillRect(0,0,128,64);nc.fillStyle='#fff';nc.font='32px Arial';nc.textAlign='center';nc.fillText(String(++index).padStart(2,'0'),64,44);const number=new THREE.Mesh(new THREE.PlaneGeometry(.4,.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(numberCanvas)}));number.rotation.y=Math.PI/2;number.position.set(2.976,2.53,.45);g.add(number);
 }
 function shrub(x,z){box(.8,.55,.8,x,.28,z,wood);const plant=new THREE.Mesh(new THREE.IcosahedronGeometry(.5,1),mat('#668463'));plant.position.set(x,.88,z);plant.castShadow=true;concept.add(plant)}
 for(const side of [-1,1])for(let k=0;k<5;k++)shrub(side*10.9,(k-2)*5.5);
 const utility=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-12,.14,-15),new THREE.Vector3(-12,.14,17),new THREE.Vector3(-18,.14,17)]),new THREE.LineDashedMaterial({color:'#5caaca',dashSize:1,gapSize:.55}));utility.computeLineDistances();scene.add(utility);
 const radius=Math.max(42,Math.min(span*.9,85));let dead=false,raf;function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}function perspective(){camera.position.set(radius*.8,radius*.85,radius);controls.target.set(0,0,0);controls.update()}perspective();resize();const observer=new ResizeObserver(resize);observer.observe(container);
 const start=performance.now();function tick(){if(dead)return;raf=requestAnimationFrame(tick);const t=Math.min(1,(performance.now()-start)/1400);homes.position.y=(1-t)**3*5;controls.update();renderer.render(scene,camera)}tick();
 function capture(){renderer.render(scene,camera);const out=document.createElement('canvas');out.width=renderer.domElement.width;out.height=renderer.domElement.height;const cx=out.getContext('2d');cx.drawImage(renderer.domElement,0,0);const scale=out.width/1200;cx.fillStyle='#173e35e8';cx.fillRect(0,out.height-65*scale,out.width,65*scale);cx.fillStyle='white';cx.font=`${13*scale}px Arial`;cx.fillText('ILLUSTRATIVE CONCEPT · 12 FAST-SET BOXES · NOT VERIFIED SITE FEASIBILITY',20*scale,out.height-39*scale);cx.font=`${10*scale}px Arial`;cx.fillText('Requires licensed professional review. Model details illustrative. Imagery © Esri, Maxar, Earthstar Geographics.',20*scale,out.height-18*scale);return out.toDataURL('image/png')}
 return {resize,capture,perspective,toggleOrbit(){controls.autoRotate=!controls.autoRotate;return controls.autoRotate},top(){controls.autoRotate=false;camera.position.set(0,radius*1.4,.1);controls.target.set(0,0,0);controls.update()},dispose(){dead=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose()}}});renderer.dispose();renderer.domElement.remove()},imageryLoaded:goodTiles>0};
}
