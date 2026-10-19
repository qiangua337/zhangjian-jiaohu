import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createWorlds, makeStarfield, updateWorld, WORLD_INFO, randomFactory } from './worlds.js';
import { studioEnvironment, createAtmosphere } from './atmosphere.js';
import { orbitalPosition } from './swarm.js';

export class Experience {
  constructor(container, { onReady=()=>{}, onWorld=()=>{}, onPhotoFocus=()=>{}, onQuality=()=>{}, onPreviews=()=>{}, onMotion=()=>{} }={}) {
    Object.assign(this,{container,onReady,onWorld,onPhotoFocus,onQuality,onPreviews,onMotion});
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#060a13');
    this.camera=new THREE.PerspectiveCamera(42,1,.1,150);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
    this.renderer.domElement.setAttribute('aria-label','可拖动、缩放的三维互动场景');this.renderer.domElement.setAttribute('role','img');container.appendChild(this.renderer.domElement);
    this.mobile=matchMedia('(pointer:coarse)').matches||innerWidth<760;
    this.qualityMode='auto';this.quality=this.mobile?.58:1;this.pixelRatio=Math.min(devicePixelRatio||1,this.mobile?1.3:1.8);
    this.environmentTarget=studioEnvironment(this.renderer);this.environment=this.environmentTarget.texture;this.scene.environment=this.environment;
    this.scene.add(new THREE.AmbientLight('#b5bdd5',.15));
    const sun=new THREE.DirectionalLight('#f2dfcf',2.15);sun.position.set(-8,6,7);this.scene.add(sun);
    const blue=new THREE.DirectionalLight('#9db2d9',.32);blue.position.set(6,-1,-5);this.scene.add(blue);
    const rim=new THREE.PointLight('#dfb1c6',14,30);rim.position.set(2,5,-4);this.scene.add(rim);
    this.atmosphere=createAtmosphere();this.scene.add(this.atmosphere.mesh);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enablePan=false;this.controls.enableDamping=true;this.controls.dampingFactor=.055;this.controls.minDistance=10;this.controls.maxDistance=52;this.controls.rotateSpeed=.55;this.controls.zoomSpeed=.7;this.controls.autoRotate=false;this.controls.maxPolarAngle=Math.PI*.85;
    this.controls.addEventListener('start',()=>{this.lastUserInput=performance.now();this.controls.autoRotate=false;});
    this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));this.bloom=new UnrealBloomPass(new THREE.Vector2(512,512),.4,.72,1.3);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
    this.worlds=createWorlds();this.worlds.forEach(world=>{world.root.visible=false;this.scene.add(world.root);});this.current=this.worlds[0];this.current.root.visible=true;
    this.stars=makeStarfield();this.scene.add(this.stars.object);
    this.scatter=0;this.targetScatter=0;this.open=1;this.targetOpen=1;this.yaw=0;this.pitch=0;this.targetYaw=0;this.targetPitch=0;this.elapsed=0;this.frozen=false;this.lastTime=performance.now();this.lastUserInput=0;this.hasHands=false;this.photoLayer=new THREE.Group();this.scene.add(this.photoLayer);this.photos=[];this.photoFaces=[];this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.lastPinch=false;this.grabbed=null;this.focused=null;this.lastDoubleHandDistance=null;
    this.makeTrail();
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();
    this.reveal=1;
    this.renderer.domElement.addEventListener('dblclick',()=>this.toggleSpread());
    this.activePointers=new Set();
    this.renderer.domElement.addEventListener('pointerdown',event=>{this.activePointers.add(event.pointerId);this.tapStart=this.activePointers.size===1?{id:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now()}:null;});
    this.renderer.domElement.addEventListener('pointerup',event=>{const start=this.tapStart;this.activePointers.delete(event.pointerId);if(start?.id===event.pointerId&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<8&&performance.now()-start.time<500)this.pickPhoto(event.clientX/innerWidth,event.clientY/innerHeight,false);this.tapStart=null;});
    this.renderer.domElement.addEventListener('pointercancel',event=>{this.activePointers.delete(event.pointerId);this.tapStart=null;});
    this.slowTime=0;this.performanceFrames=0;this.performanceTime=0;this.performanceAdjusted=false;
    this.ready=this.preparePreviews().then(()=>{if(this.disposed)return;this.lastTime=performance.now();this.frame=requestAnimationFrame(time=>this.render(time));this.onReady();});
  }
  async preparePreviews() {
    this.worlds.forEach(world=>{world.root.visible=true;world.root.scale.setScalar(world.scale);updateWorld(world,1,0,1,.55,1);});
    if(this.renderer.compileAsync)await this.renderer.compileAsync(this.scene,this.camera);
    if(this.disposed)return;
    const previews={},previewCamera=new THREE.PerspectiveCamera(36,180/112,.1,100);previewCamera.position.set(0,2,20);previewCamera.lookAt(0,0,0);
    this.stars.object.visible=false;this.atmosphere.mesh.visible=false;this.trail.object.visible=false;this.photoLayer.visible=false;
    this.renderer.setPixelRatio(1);this.renderer.setSize(180,112,false);
    for(const world of this.worlds){
      this.worlds.forEach(item=>item.root.visible=item===world);this.scene.background.set(world.bg);this.renderer.render(this.scene,previewCamera);previews[world.id]=this.renderer.domElement.toDataURL('image/webp',.85);
    }
    this.worlds.forEach(world=>world.root.visible=world===this.current);this.scene.background.set(this.current.bg);this.stars.object.visible=true;this.atmosphere.mesh.visible=true;this.trail.object.visible=true;this.photoLayer.visible=true;this.atmosphere.setWorld(this.current);this.resize();this.onPreviews(previews);
  }
  resize() {
    const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;
    this.width=w;this.height=h;const portrait=w<=900&&h>w,shortLandscape=h<560&&w>h,compact=portrait&&h<730;
    this.camera.aspect=w/h;
    this.homeDistance=portrait?(compact?40:33):shortLandscape?22:18.4;
    if(!this.wasSized||portrait!==this.wasPortrait||compact!==this.wasCompact||shortLandscape!==this.wasShortLandscape){this.camera.position.set(0,portrait?3.1:2.3,this.homeDistance);this.controls.target.set(0,0,0);this.controls.update();this.wasSized=true;this.wasPortrait=portrait;this.wasCompact=compact;this.wasShortLandscape=shortLandscape;}
    const yOffset=this.immersive?0:portrait?(h<730?h*.115:h*.09):h*.07;
    this.camera.setViewOffset(w,h,portrait||this.immersive?0:-w*.075,yOffset,w,h);this.camera.updateProjectionMatrix();this.renderer.setPixelRatio(this.pixelRatio);this.renderer.setSize(w,h);this.composer.setPixelRatio(this.pixelRatio);this.composer.setSize(w,h);
  }
  setWorld(id) {
    const next=this.worlds.find(world=>world.id===id);if(!next||next===this.current)return;
    this.current.root.visible=false;this.current=next;this.current.root.visible=true;this.reveal=0;this.scene.background.set(next.bg);this.atmosphere.setWorld(next);this.bloom.strength=next.id==='flower'?.28:next.id==='tree'?.52:next.id==='ocean'?.48:.4;this.bloom.threshold=next.id==='flower'?1.45:1.3;this.targetScatter=0;this.targetOpen=1;this.targetYaw=0;this.targetPitch=0;this.grabbed=null;this.focused=null;this.lastPinch=false;this.onPhotoFocus(null);this.onWorld(next);this.lastUserInput=performance.now();
    this.camera.position.set(0,this.wasPortrait?3.1:2.3,this.homeDistance);this.controls.target.set(0,0,0);this.controls.update();
  }
  nextWorld(){const index=this.worlds.indexOf(this.current);this.setWorld(this.worlds[(index+1)%this.worlds.length].id);}
  toggleSpread(){const expanded=this.targetScatter<.5;this.targetScatter=expanded?.94:0;this.targetOpen=expanded?1:.15;return expanded;}
  setMorph(value){const amount=THREE.MathUtils.clamp(value,0,1);if(this.current.id==='flower'){this.targetOpen=THREE.MathUtils.smoothstep(amount,0,.55);this.targetScatter=THREE.MathUtils.smoothstep(amount,.55,1)*.94;}else{this.targetScatter=amount*.94;this.targetOpen=.15+amount*.85;}}
  toggleFreeze(){this.frozen=!this.frozen;return this.frozen;}
  setQuality(mode){this.qualityMode=mode;this.quality=mode==='high'?1:mode==='low'?.38:(this.mobile?.58:1);this.pixelRatio=Math.min(devicePixelRatio||1,mode==='high'?1.9:mode==='low'?1:(this.mobile?1.3:1.8));this.resize();this.onQuality(mode);}
  resetView(){this.targetScatter=0;this.targetOpen=1;this.targetYaw=0;this.targetPitch=0;this.frozen=false;this.grabbed=null;this.focused=null;this.onPhotoFocus(null);this.wasSized=false;this.resize();}
  processHands(hands,time) {
    this.hasHands=hands.length>0;
    if(!hands.length){if(this.grabbed)this.releaseGrab();this.lastPinch=false;this.lastDoubleHandDistance=null;return;}
    const hand=hands[0];this.lastUserInput=time;
    if(hands.length>1){const distance=Math.hypot(hands[0].x-hands[1].x,hands[0].y-hands[1].y);if(this.lastDoubleHandDistance!==null){const ratio=THREE.MathUtils.clamp(this.lastDoubleHandDistance/Math.max(distance,.1),.92,1.08);this.camera.position.multiplyScalar(ratio);const length=THREE.MathUtils.clamp(this.camera.position.length(),this.controls.minDistance,this.controls.maxDistance);this.camera.position.setLength(length);}this.lastDoubleHandDistance=distance;if(this.grabbed)this.releaseGrab();this.lastPinch=false;return;}else this.lastDoubleHandDistance=null;
    if(hand.pose==='palm'||hand.pose==='fist'){
      this.targetOpen=hand.openness;
      this.targetScatter=this.current.id==='flower'?THREE.MathUtils.smoothstep(hand.openness,.72,1)*.94:THREE.MathUtils.smoothstep(hand.openness,.25,.9)*.94;
      this.targetYaw=(hand.x-.5)*1.9;this.targetPitch=(hand.y-.5)*.7;
    }
    if(hand.pose==='point')this.emitTrail(hand.pointer.x,hand.pointer.y);
    if(hand.pinch){
      if(!this.lastPinch){const picked=this.pickPhoto(hand.grab.x,hand.grab.y,true);this.draggingWorld=!picked;this.dragStart={x:hand.grab.x,y:hand.grab.y,yaw:this.targetYaw,pitch:this.targetPitch};}
      if(this.grabbed){this.grabPosition=this.unproject(hand.grab.x,hand.grab.y,4);this.grabRoll=THREE.MathUtils.clamp(hand.roll,-.6,.6);}
      else if(this.draggingWorld&&this.dragStart){this.targetYaw=this.dragStart.yaw+(hand.grab.x-this.dragStart.x)*3;this.targetPitch=this.dragStart.pitch+(hand.grab.y-this.dragStart.y)*1.6;}
    }else if(this.lastPinch){this.releaseGrab();this.draggingWorld=false;}
    this.lastPinch=hand.pinch;
  }
  unproject(x,y,z=0) {
    this.pointer.set(x*2-1,1-y*2);this.raycaster.setFromCamera(this.pointer,this.camera);
    const direction=this.camera.getWorldDirection(new THREE.Vector3()),distance=this.camera.position.distanceTo(this.controls.target),center=this.controls.target.clone().addScaledVector(direction,-Math.min(z,distance*.4));
    const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(direction,center),point=new THREE.Vector3();return this.raycaster.ray.intersectPlane(plane,point)||point;
  }
  pickPhoto(x,y,grab=false) {
    if(!this.photoFaces.length)return null;
    this.pointer.set(x*2-1,1-y*2);this.raycaster.setFromCamera(this.pointer,this.camera);
    const hit=this.raycaster.intersectObjects(this.photoFaces,false)[0];if(!hit)return null;
    const photo=hit.object.userData.photo;
    if(grab){this.grabbed=photo;this.grabPosition=this.unproject(x,y,4);this.grabRoll=0;}else{this.focused=photo;this.onPhotoFocus(photo);}
    return photo;
  }
  releaseGrab(){if(this.grabbed){this.focused=this.grabbed;this.onPhotoFocus(this.focused);}this.grabbed=null;}
  clearFocus(){this.focused=null;this.grabbed=null;this.onPhotoFocus(null);}
  photoScale(z,coverage){const distance=this.camera.position.distanceTo(this.controls.target),depth=distance-Math.min(z,distance*.4),height=Math.min(coverage,this.camera.aspect*.72/(1.16/1.4));return 2*Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2))*depth*height/1.4;}
  addPhoto({texture,name,id,thumbnail}) {
    const group=new THREE.Group(),frame=new THREE.Mesh(new THREE.BoxGeometry(1.16,1.4,.055),new THREE.MeshBasicMaterial({color:'#d9d2c6'}));group.add(frame);
    const face=new THREE.Mesh(new THREE.PlaneGeometry(1.02,1.02),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false}));face.position.set(0,.09,.032);group.add(face);
    const rng=randomFactory(this.photos.length*97+30),data={group,face,texture,name,id,thumbnail,chaos:new THREE.Vector3(...orbitalPosition(rng,this.photos.length,24,{radius:5.8,height:3.2,depth:2.3})),seed:rng()*100};face.userData.photo=data;
    this.photoLayer.add(group);this.photos.push(data);this.photoFaces.push(face);group.position.copy(data.chaos);return data;
  }
  removePhoto(id){const data=this.photos.find(photo=>photo.id===id);if(!data)return;if(this.focused===data||this.grabbed===data)this.clearFocus();this.photoLayer.remove(data.group);data.group.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});data.texture.dispose();this.photos=this.photos.filter(p=>p!==data);this.photoFaces=this.photoFaces.filter(face=>face!==data.face);}
  makeTrail(){
    const count=700,positions=new Float32Array(count*3),ages=new Float32Array(count),colors=new Float32Array(count*3);positions.fill(1000);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aAge',new THREE.BufferAttribute(ages,1));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0}},vertexShader:`uniform float uTime;attribute float aAge;attribute vec3 color;varying float vAlpha;varying vec3 vColor;void main(){float age=uTime-aAge;vec3 p=position;p.y+=age*.15;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((1.-age/2.)*65./-mv.z,0.,12.);vAlpha=max(0.,1.-age/2.);vColor=color;}`,fragmentShader:`varying float vAlpha;varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vColor*1.7,exp(-d*d*4.)*vAlpha);}`});
    this.trail={object:new THREE.Points(geometry,material),geometry,material,positions,ages,colors,index:0,count};this.trail.object.frustumCulled=false;this.scene.add(this.trail.object);
  }
  emitTrail(x,y){const p=this.unproject(x,y,3),trail=this.trail,c=new THREE.Color(this.current.color);for(let j=0;j<7;j++){const i=trail.index++%trail.count;trail.positions.set([p.x+(Math.random()-.5)*.16,p.y+(Math.random()-.5)*.16,p.z+(Math.random()-.5)*.2],i*3);trail.ages[i]=this.elapsed;trail.colors.set([c.r,c.g,c.b],i*3);}trail.geometry.attributes.position.needsUpdate=true;trail.geometry.attributes.aAge.needsUpdate=true;trail.geometry.attributes.color.needsUpdate=true;}
  render(time){
    this.frame=requestAnimationFrame(t=>this.render(t));if(this.mobile&&time-(this.lastRenderedAt||0)<32)return;this.lastRenderedAt=time;const delta=Math.min((time-this.lastTime)/1000,.08);this.lastTime=time;
    if(document.hidden)return;
    if(!this.frozen)this.elapsed+=delta;
    this.scatter=THREE.MathUtils.damp(this.scatter,this.targetScatter,2.2,delta);this.open=THREE.MathUtils.damp(this.open,this.targetOpen,3,delta);this.yaw=THREE.MathUtils.damp(this.yaw,this.targetYaw,3,delta);this.pitch=THREE.MathUtils.damp(this.pitch,this.targetPitch,3,delta);
    this.reveal=THREE.MathUtils.damp(this.reveal,1,4,delta);this.current.root.scale.setScalar(this.current.scale*(.84+this.reveal*.16));
    this.current.root.rotation.y=this.yaw+(!this.hasHands?Math.sin(this.elapsed*.11)*.07:0);this.current.root.rotation.x=this.pitch;
    this.controls.autoRotate=false;this.controls.update();
    const framing=this.wasPortrait?.62:1;
    updateWorld(this.current,this.elapsed,this.scatter,this.open,this.quality,framing);this.stars.update(this.elapsed,0);this.stars.quality(this.quality);this.stars.object.rotation.y=this.elapsed*.001;this.atmosphere.update(this.elapsed);
    const fraction=this.current.id==='flower'?(this.open<.99?this.open*.55:.55+this.scatter/.94*.45):this.scatter/.94;this.onMotion({fraction,expanded:this.targetScatter>.5,world:this.current.id});
    this.trail.material.uniforms.uTime.value=this.elapsed;
    this.current.root.updateMatrixWorld(true);
    this.photos.forEach((photo,index)=>{
      const target=this.current.photoTarget(index,this.photos.length),loose=photo.chaos.clone();if(this.wasPortrait)target.x*=.8;loose.x*=framing;target.lerp(loose,this.scatter*.9);this.current.root.localToWorld(target);target.y+=Math.sin(this.elapsed*.4+photo.seed)*.06;
      const isGrab=photo===this.grabbed,isFocused=photo===this.focused;
      if(isGrab)target.copy(this.grabPosition);else if(isFocused)target.copy(this.unproject(.5,.48,8));
      photo.group.position.lerp(target,1-Math.exp(-delta*(isGrab?7:2.8)));photo.group.lookAt(this.camera.position);
      const scale=isGrab?this.photoScale(4,.37):isFocused?this.photoScale(8,.58):(this.photos.length>12?.8:1.05);photo.group.scale.lerp(new THREE.Vector3(scale,scale,scale),1-Math.exp(-delta*4));if(isGrab)photo.group.rotation.z=this.grabRoll||0;
    });
    this.composer.render();
    if(this.qualityMode==='auto'&&!this.performanceAdjusted&&this.elapsed>5){this.performanceFrames++;this.performanceTime+=delta;if(this.performanceTime>4){if(this.performanceFrames/this.performanceTime<27){this.performanceAdjusted=true;this.quality=Math.max(.32,this.quality*.7);this.pixelRatio=Math.max(.85,this.pixelRatio*.8);this.resize();this.onQuality('adaptive');}this.performanceTime=0;this.performanceFrames=0;}}
  }
  capture(){this.composer.render();return this.renderer.domElement.toDataURL('image/png');}
  dispose(){this.disposed=true;cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.controls.dispose();this.scene.traverse(o=>{o.geometry?.dispose();if(o.material){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(material=>material.dispose());}});this.environmentTarget.dispose();this.composer.dispose();this.renderer.dispose();}
}
