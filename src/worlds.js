import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { createSwarm, orbitalPosition } from './swarm.js';
import { heartSurface, crystalHeart, pineBranches, petalTexture, orbitLines } from './sculptures.js';
import { jellyModel as detailedJelly } from './jelly.js';

const TAU = Math.PI * 2;
export const WORLD_INFO = [
  { id:'saturn', name:'星际引力', en:'CELESTIAL ORBIT', label:'星环', title:'把宇宙，\n握在掌间。', description:'张开手掌，让一颗星球化作漫游的星系。', color:'#ddc298', bg:'#060a13', number:'01' },
  { id:'heart', name:'心动星团', en:'A LITTLE INFINITY', label:'爱心', title:'让心动，\n有迹可循。', description:'握紧是一颗心，松开是漫天的小小心动。', color:'#f0a5c0', bg:'#100914', number:'02' },
  { id:'tree', name:'记忆之树', en:'THE MEMORY TREE', label:'圣诞树', title:'每个瞬间，\n都在发光。', description:'星光、照片与金色雪花，聚成你的记忆。', color:'#d5c38a', bg:'#050e0d', number:'03' },
  { id:'flower', name:'光之花园', en:'THE ART OF BLOOM', label:'花朵', title:'指尖松开，\n万物盛放。', description:'一朵柔光花，随手舒展，也能化作漫天花瓣。', color:'#e4add3', bg:'#100b18', number:'04' },
  { id:'ocean', name:'微光深海', en:'BENEATH THE SILENCE', label:'水母', title:'潜入一片，\n发光的宁静。', description:'让水母与微光，跟随你的手缓缓游动。', color:'#a0e5df', bg:'#040e18', number:'05' },
];

export function randomFactory(seed=18) { return () => { seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }; }
function color(value) { return new THREE.Color(value); }
function glowTexture() {
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.13,'rgba(255,255,255,.7)');g.addColorStop(.4,'rgba(255,255,255,.13)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
const pointVertex = `
uniform float uTime; uniform float uScatter; uniform float uSize;
attribute vec3 aChaos; attribute vec3 aColor; attribute float aSize; attribute float aPhase;
varying vec3 vColor; varying float vAlpha;
void main(){
 float t=uScatter*uScatter*(3.0-2.0*uScatter);
 vec3 p=mix(position,aChaos,t);
 p+=vec3(sin(uTime*.35+aPhase),cos(uTime*.28+aPhase*1.7),sin(uTime*.31+aPhase*.7))*(.02+t*.36);
 vec4 mv=modelViewMatrix*vec4(p,1.0);
 gl_Position=projectionMatrix*mv; gl_PointSize=clamp(uSize*aSize*700.0/-mv.z,.35,10.0);
 vColor=aColor;vAlpha=.65+.35*sin(aPhase+uTime*.65);
}`;
const pointFragment = `
uniform float uOpacity;varying vec3 vColor; varying float vAlpha;
void main(){vec2 q=gl_PointCoord*2.0-1.0;float d=dot(q,q);if(d>1.0)discard;float a=exp(-d*4.8)*vAlpha*uOpacity;gl_FragColor=vec4(vColor*(1.0+exp(-d*30.0)*.45),a);}`;

export class ParticleField {
  constructor(count, shape, palette, {size=.065,brightness=1,seed=48}={}) {
    const rng=randomFactory(seed),positions=new Float32Array(count*3),chaos=new Float32Array(count*3),colors=new Float32Array(count*3),sizes=new Float32Array(count),phases=new Float32Array(count);
    const hues=palette.map(color);
    for(let i=0;i<count;i++){
      const p=shape(rng,i,count);positions.set(p,i*3);
      const theta=rng()*TAU,v=rng()*2-1,r=3+Math.pow(rng(),.5)*5,ring=Math.sqrt(1-v*v);
      chaos.set([Math.cos(theta)*ring*r,v*r*.55,Math.sin(theta)*ring*r*.45],i*3);
      const c=hues[Math.floor(rng()*hues.length)].clone().multiplyScalar(brightness*(.55+rng()*.9));colors.set([c.r,c.g,c.b],i*3);
      sizes[i]=.45+rng()*1.35;phases[i]=rng()*100;
    }
    this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));this.geometry.setAttribute('aChaos',new THREE.BufferAttribute(chaos,3));this.geometry.setAttribute('aColor',new THREE.BufferAttribute(colors,3));this.geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));this.geometry.setAttribute('aPhase',new THREE.BufferAttribute(phases,1));
    this.material=new THREE.ShaderMaterial({vertexShader:pointVertex,fragmentShader:pointFragment,uniforms:{uTime:{value:0},uScatter:{value:0},uSize:{value:size},uOpacity:{value:1}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
    this.object=new THREE.Points(this.geometry,this.material);this.object.frustumCulled=false;this.count=count;
  }
  update(time,scatter){this.material.uniforms.uTime.value=time;this.material.uniforms.uScatter.value=scatter;}
  quality(factor){this.geometry.setDrawRange(0,Math.min(this.count,Math.max(40,Math.round(this.count*factor))));}
}

function atmosphere(radius, tint, intensity=.55) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius,64,32),new THREE.ShaderMaterial({
    uniforms:{uColor:{value:color(tint)},uIntensity:{value:intensity}},side:THREE.BackSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`varying vec3 vNormal;varying vec3 vPosition;void main(){vNormal=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vPosition=mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform vec3 uColor;uniform float uIntensity;varying vec3 vNormal;varying vec3 vPosition;void main(){float f=pow(1.-abs(dot(normalize(vNormal),normalize(-vPosition))),3.);gl_FragColor=vec4(uColor,f*uIntensity);}`,
  }));
}
function nebula(root, tint, texture, position, scale, opacity=.1) {const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:tint,opacity,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));sprite.position.set(...position);sprite.scale.set(scale,scale,1);root.add(sprite);return sprite;}
function baseWorld(info, texture) {
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);
  return { ...info,root,body,fields:[],objects:[],animated:[],texture,phase:0,scale:1,photoTarget:(i,n)=>{const a=i/n*TAU;return new THREE.Vector3(Math.cos(a)*5.6,Math.sin(a)*3.1,Math.sin(a*2)*1.8);}, update:null };
}
function addField(world, field, parent=world.body) {world.fields.push(field);parent.add(field.object);return field;}
function remember(world, mesh) {world.objects.push({mesh,position:mesh.position.clone(),scale:mesh.scale.clone(),rotation:mesh.rotation.clone()});return mesh;}

function createSaturn(info, texture) {
  const world=baseWorld(info,texture),planet=new THREE.Group();planet.rotation.set(.22,0,.34);world.body.add(planet);
  const rng=randomFactory(104),canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const ctx=canvas.getContext('2d');
  const image=ctx.createImageData(1024,512);
  for(let y=0;y<512;y++)for(let x=0;x<1024;x++){const longitude=x/1024*TAU,latitude=y+Math.sin(longitude*4+y*.025)*2.4+Math.sin(longitude*13+y*.06)*.7,stripe=.5+.22*Math.sin(latitude*.15)+.1*Math.sin(latitude*.63)+.08*Math.sin(latitude*.049),n=(rng()-.5)*5,i=(y*1024+x)*4;image.data.set([146+stripe*68+n,120+stripe*55+n,91+stripe*40+n,255],i);}ctx.putImageData(image,0,0);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const sphere=new THREE.Mesh(new THREE.SphereGeometry(2.13,96,64),new THREE.MeshStandardMaterial({map,roughness:.96,metalness:.015,envMapIntensity:.055}));planet.add(sphere);remember(world,sphere);
  const halo=atmosphere(2.2,'#d9b881',.55);planet.add(halo);remember(world,halo);
  const ring=new THREE.Mesh(new THREE.RingGeometry(2.78,5.35,256,10),new THREE.ShaderMaterial({
    side:THREE.DoubleSide,transparent:true,depthWrite:false,
    uniforms:{uOpacity:{value:1}},
    vertexShader:`varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float uOpacity;varying vec3 vPos;void main(){float r=length(vPos.xy);float t=(r-2.78)/2.57;float bands=.5+.13*sin(r*78.)+.07*sin(r*181.);float gap=1.-smoothstep(.012,.045,abs(r-4.15));float edge=smoothstep(0.,.04,t)*(1.-smoothstep(.91,1.,t));vec3 c=mix(vec3(.22,.17,.12),vec3(.66,.55,.39),bands);float shade=mix(.25,1.,smoothstep(-3.,2.,vPos.x+vPos.y*.7));gl_FragColor=vec4(c*shade,(bands*.65+.18)*edge*(1.-gap*.8)*uOpacity);}`,
  }));ring.rotation.x=-Math.PI/2;planet.add(ring);remember(world,ring);world.ring=ring;
  const field=addField(world,new ParticleField(13000,(r)=>{const a=r()*TAU,rad=2.83+r()*2.6;return [Math.cos(a)*rad,(r()-.5)*.025,Math.sin(a)*rad];},['#bda47c','#bcb4a0','#8a7961'],{size:.016,brightness:.45}),planet);
  field.object.rotation.x=0;
  const orbitDust=addField(world,new ParticleField(2800,(r)=>{const rad=6+Math.pow(r(),.5)*5,a=r()*TAU;return [Math.cos(a)*rad,(r()-.5)*.8,Math.sin(a)*rad];},['#99a8ba','#6c76a0','#a58d70'],{size:.025,brightness:.32,seed:26}));orbitDust.object.rotation.set(.14,.2,.2);
  const moon=new THREE.Mesh(new THREE.SphereGeometry(.26,32,20),new THREE.MeshStandardMaterial({color:'#6e7784',roughness:.95,envMapIntensity:.08}));moon.position.set(5.9,1.3,-5.4);world.body.add(moon);remember(world,moon);
  const littlePlanets=createSwarm({geometry:new THREE.SphereGeometry(1,24,16),material:new THREE.MeshStandardMaterial({map,roughness:.72,metalness:.08,envMapIntensity:.2}),count:76,random:randomFactory(818),target:r=>{const a=r()*TAU,rad=r()<.55?1.3+r()*1.1:3+r()*2.2;return[Math.cos(a)*rad,(r()-.5)*1.8,Math.sin(a)*rad];},palette:['#d1b18c','#929eac','#b89d9e'],size:.21,spin:.14,destination:(r,i,n)=>orbitalPosition(r,i,n,{radius:6.5,bands:3,height:3.8,depth:2.9})});
  const littleRings=new THREE.InstancedMesh(new THREE.RingGeometry(1.38,2.2,48).rotateX(-1.12).rotateZ(.28),new THREE.MeshStandardMaterial({color:'#b19b77',roughness:.65,metalness:.2,side:THREE.DoubleSide}),76);littleRings.frustumCulled=false;littleRings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);world.body.add(littlePlanets.mesh,littleRings);
  const orbits=orbitLines();world.body.add(orbits.group);
  sphere.material.transparent=true;
  nebula(world.root,'#334a8c',texture,[-4,1,-7],22,.14);nebula(world.root,'#855d91',texture,[9,-2,-13],24,.1);
  world.photoTarget=(i,n)=>{const a=i/n*TAU+.15;return new THREE.Vector3(Math.cos(a)*6.2,Math.sin(a)*2.6,Math.sin(a)*3.1);};
  world.update=(time,scatter,openness,quality,framing)=>{
    const dissolve=THREE.MathUtils.smoothstep(scatter,.13,.7);
    planet.rotation.y=Math.sin(time*.12)*.13;sphere.rotation.y=time*.04;moon.position.set(4.6+Math.cos(time*.025)*.8,1.8,-5.8+Math.sin(time*.025)*.8);
    sphere.material.opacity=1-dissolve;sphere.visible=dissolve<.995;halo.material.uniforms.uIntensity.value=.55*(1-dissolve);
    ring.material.uniforms.uOpacity.value=1-dissolve;planet.scale.setScalar(1-dissolve*.12);field.material.uniforms.uOpacity.value=1-scatter*.94;
    littlePlanets.update(time,scatter,quality,THREE.MathUtils.smoothstep(scatter,.12,.85),framing);littleRings.visible=littlePlanets.mesh.visible;littleRings.count=littlePlanets.mesh.count;littleRings.instanceMatrix.array.set(littlePlanets.mesh.instanceMatrix.array);littleRings.instanceMatrix.needsUpdate=true;orbits.group.scale.x=framing;orbits.update(scatter,time);
  };
  return world;
}

function roundedHeartGeometry(segments=144,rings=36,depth=1.8){
  const positions=[],indices=[],height=rings*2;
  // Solve the implicit heart surface along rays. This gives rounded lobes
  // on every side, rather than adding depth to a flat heart outline.
  for(let j=0;j<=height;j++)for(let i=0;i<=segments;i++){
    positions.push(...heartSurface(j/height*Math.PI,i/segments*TAU,depth));
  }
  const stride=segments+1;
  for(let j=0;j<height;j++)for(let i=0;i<segments;i++){const a=j*stride+i,b=a+stride;indices.push(a,a+1,b,b,a+1,b+1);}
  let geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);const welded=mergeVertices(geometry);geometry.dispose();geometry=welded;geometry.computeVertexNormals();return geometry;
}
function createHeart(info,texture) {
  const world=baseWorld(info,texture);
  const geometry=roundedHeartGeometry();
  const sculpture=crystalHeart(geometry),heart=sculpture.root;heart.rotation.y=-.18;world.body.add(heart);
  const heartVolume=r=>{const p=heartSurface(Math.acos(r()*2-1),r()*TAU),k=Math.pow(r(),1/3);return p.map((v,i)=>i===1?(v+.35)*k-.35:v*k);};
  const hearts=createSwarm({geometry:roundedHeartGeometry(32,12),material:new THREE.MeshPhysicalMaterial({color:'#ffffff',metalness:.28,roughness:.28,clearcoat:.5,envMapIntensity:.7}),count:320,random:randomFactory(735),target:heartVolume,palette:['#c96c8b','#9f3d60','#e1a5ac','#b58272'],size:.064,spin:.13,destination:(r,i,n)=>orbitalPosition(r,i,n,{radius:6.5,bands:3,height:4.2,depth:2.6})});
  world.body.add(hearts.mesh);
  const sparkles=addField(world,new ParticleField(15000,r=>{const p=heartSurface(Math.acos(r()*2-1),r()*TAU),scale=.998+r()*.006;return p.map(v=>v*scale);},['#e5b2bf','#b982a8','#c8b196'],{size:.023,brightness:.6}),heart);
  const halo=nebula(world.body,'#bc417b',texture,[0,.2,-1],10,.1);remember(world,halo);
  nebula(world.root,'#713468',texture,[5,0,-9],24,.13);nebula(world.root,'#50357a',texture,[-8,-4,-12],22,.1);
  world.photoTarget=(i,n)=>{const a=i/n*TAU;return new THREE.Vector3(Math.cos(a)*5.1,Math.sin(a)*3.8+.3,Math.sin(a*2)*1.5+1);};
  world.update=(time,scatter,openness,quality,framing)=>{
    const dissolve=THREE.MathUtils.smoothstep(scatter,.16,.7),beat=1+Math.sin(time*1.8)*.009;
    heart.rotation.y=-.2+Math.sin(time*.19)*.11;heart.scale.setScalar(beat*(1-dissolve*.06));
    sculpture.update(time,1-dissolve);heart.visible=dissolve<.998;
    hearts.update(time,scatter,quality,THREE.MathUtils.smoothstep(scatter,.15,.85),framing);
    sparkles.material.uniforms.uOpacity.value=.7*(1-dissolve);halo.material.opacity=.065*(1-scatter*.35);
  };
  return world;
}

function createTree(info,texture) {
  const world=baseWorld(info,texture);
  world.scale=.76;
  const branches=pineBranches(randomFactory(519));world.body.add(branches.mesh);
  const treePosition=(r)=>{const y=r()*8.5-4.1,radius=(1-(y+4.1)/8.5)*3.9,a=r()*TAU;return [Math.cos(a)*radius*(.75+r()*.25),y,Math.sin(a)*radius*(.75+r()*.25)];};
  const needles=addField(world,new ParticleField(10000,treePosition,['#154735','#2b5d44','#698263'],{size:.04,brightness:.5}));
  const spiral=addField(world,new ParticleField(1600,(r)=>{const y=r()*8.5-4.1,a=(y+4.1)/8.5*TAU*6.8,radius=(1-(y+4.1)/8.5)*4+.05;return [Math.cos(a)*radius+(r()-.5)*.08,y,Math.sin(a)*radius+(r()-.5)*.08];},['#d7bd79','#cbb486','#e9cd8c'],{size:.068,brightness:.85,seed:32}));
  const starShape=new THREE.Shape();for(let j=0;j<10;j++){const a=j/10*TAU+Math.PI/2,r=j%2===0?.56:.25,x=Math.cos(a)*r,y=Math.sin(a)*r;if(j===0)starShape.moveTo(x,y);else starShape.lineTo(x,y);}starShape.closePath();
  const star=new THREE.Mesh(new THREE.ExtrudeGeometry(starShape,{depth:.1,bevelEnabled:true,bevelThickness:.06,bevelSize:.04,bevelSegments:3}),new THREE.MeshStandardMaterial({color:'#d9b56e',metalness:.75,roughness:.28,emissive:'#95703a',emissiveIntensity:.3}));star.position.y=4.65;world.body.add(star);remember(world,star);
  nebula(world.body,'#cda559',texture,[0,4.65,-.1],3,.15);
  const ornaments=createSwarm({geometry:star.geometry.clone(),material:new THREE.MeshStandardMaterial({color:'#ffffff',metalness:.65,roughness:.3,emissive:'#4f3417',emissiveIntensity:.12}),count:180,random:randomFactory(552),target:treePosition,palette:['#c8a363','#b99252','#dfc494','#a67e55'],size:.39,spin:.25,destination:(r,i)=>{const level=(i*.61803398875)%1,a=level*TAU*3.3,rad=3.2+r()*2.4;return[Math.cos(a)*rad,level*8-4,Math.sin(a)*2.5];}});world.body.add(ornaments.mesh);
  const geometry=new THREE.SphereGeometry(.085,12,8),mat=new THREE.MeshPhysicalMaterial({color:'#ffffff',metalness:.48,roughness:.23,clearcoat:.8,envMapIntensity:.8});
  const gems=new THREE.InstancedMesh(geometry,mat,200),dummy=new THREE.Object3D(),r=randomFactory(124),gemPalette=['#b18b52','#526a55','#a47167'].map(v=>new THREE.Color(v));for(let i=0;i<200;i++){dummy.position.set(...treePosition(r));dummy.rotation.set(r()*TAU,r()*TAU,r()*TAU);dummy.scale.setScalar(.65+r()*1.5);dummy.updateMatrix();gems.setMatrixAt(i,dummy.matrix);gems.setColorAt(i,gemPalette[i%3]);}world.body.add(gems);remember(world,gems);
  const bulbs=new THREE.InstancedMesh(new THREE.SphereGeometry(.035,8,6),new THREE.MeshBasicMaterial({color:new THREE.Color('#e7c18a').multiplyScalar(2.6),transparent:true}),180);
  for(let i=0;i<180;i++){const level=(i*.75487766625)%1,y=level*8.5-4.1,a=level*TAU*6.8,rad=(1-level)*4+.05;dummy.position.set(Math.cos(a)*rad,y,Math.sin(a)*rad);dummy.scale.setScalar(.7+(i%5)*.13);dummy.updateMatrix();bulbs.setMatrixAt(i,dummy.matrix);}world.body.add(bulbs);
  nebula(world.root,'#1a5540',texture,[1,-1,-7],21,.12);
  world.photoTarget=(i,n)=>{const level=i/n,y=3.2-level*6.5,a=level*TAU*3.4,rad=(1-(y+4.1)/8.5)*4.4+.35;return new THREE.Vector3(Math.cos(a)*rad,y,Math.sin(a)*rad);};
  world.update=(time,scatter,openness,quality,framing)=>{branches.update(scatter,quality);star.rotation.y=Math.sin(time*.3)*.25;star.scale.setScalar(1-scatter*.75);gems.count=Math.round(200*Math.max(.4,quality));gems.material.transparent=true;gems.material.opacity=1-scatter;bulbs.material.opacity=1-scatter;bulbs.count=Math.round(180*Math.max(.4,quality));spiral.object.rotation.y=time*.012;needles.material.uniforms.uOpacity.value=.4*(1-scatter);spiral.material.uniforms.uOpacity.value=1-scatter*.65;ornaments.update(time,scatter,quality,scatter,framing);};
  return world;
}

function petalGeometry(length,width,lift,base) {
  const nx=18,ny=32,positions=[],closed=[],uvs=[],indices=[];
  for(let j=0;j<=ny;j++){const t=j/ny;for(let i=0;i<=nx;i++){const u=i/nx*2-1,sw=Math.pow(Math.sin(Math.PI*t),.72),x=u*width*sw,y=lift*Math.pow(t,2)+u*u*sw*t*.48+Math.sin(u*6+t*8)*Math.sin(Math.PI*t)*.02,z=base+t*length-u*u*Math.sin(Math.PI*t)*.1;positions.push(x,y,z);closed.push(x*.29,t*length*1.18+u*u*sw*.08,base*.38+Math.sin(t*Math.PI*.6)*.5);uvs.push(i/nx,t);}}
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+nx+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();const folded=geometry.clone();folded.setAttribute('position',new THREE.Float32BufferAttribute(closed,3));folded.computeVertexNormals();geometry.morphAttributes.position=[folded.attributes.position];geometry.morphAttributes.normal=[folded.attributes.normal];return geometry;
}
function createFlower(info,texture) {
  const world=baseWorld(info,texture),flower=new THREE.Group();flower.rotation.set(.85,0,.05);world.body.add(flower);
  world.scale=1.1;
  const petals=[];
  for(let layer=0;layer<4;layer++){const count=9-layer;const geometry=petalGeometry(3.5-layer*.57,1.18-layer*.16,.42+layer*.24,.08+layer*.035);
    const material=new THREE.MeshPhysicalMaterial({map:petalTexture(layer),color:'#ffffff',roughness:.52,metalness:0,clearcoat:.08,clearcoatRoughness:.5,transmission:.04,thickness:.08,ior:1.35,sheen:.7,sheenColor:'#d6a5bd',sheenRoughness:.55,side:THREE.DoubleSide,envMapIntensity:.24});
    for(let i=0;i<count;i++){
    const petal=new THREE.Mesh(geometry,material);petal.rotation.y=i/count*TAU+layer*.46;petal.position.y=layer*.12;petal.userData={angle:petal.rotation.y,layer,baseY:petal.position.y};flower.add(petal);petals.push(petal);
  }}
  const stamen=new THREE.InstancedMesh(new THREE.SphereGeometry(.035,8,6),new THREE.MeshStandardMaterial({color:'#e7c789',emissive:'#b18a49',emissiveIntensity:.5,roughness:.4}),160),rng=randomFactory(36),dummy=new THREE.Object3D();for(let i=0;i<160;i++){const a=rng()*TAU,r=rng()*.48;dummy.position.set(Math.cos(a)*r,.24+rng()*.45,Math.sin(a)*r);dummy.updateMatrix();stamen.setMatrixAt(i,dummy.matrix);}flower.add(stamen);
  const pollen=addField(world,new ParticleField(2200,(r)=>{const a=r()*TAU,rad=1+r()*4.4;return [Math.cos(a)*rad,(r()-.5)*2.8,Math.sin(a)*rad];},['#b8859f','#9d90b9','#ceb698'],{size:.025,brightness:.4}));
  const stems=[];for(let i=0;i<52;i++){const a=i/52*TAU,r=.18+(i%7)*.05;stems.push(0,.12,0,Math.cos(a)*r,.3+(i%5)*.045,Math.sin(a)*r);}const stemGeometry=new THREE.BufferGeometry();stemGeometry.setAttribute('position',new THREE.Float32BufferAttribute(stems,3));flower.add(new THREE.LineSegments(stemGeometry,new THREE.LineBasicMaterial({color:'#bba16d',transparent:true,opacity:.58})));
  nebula(world.root,'#57366f',texture,[2,0,-7],22,.13);nebula(world.root,'#875773',texture,[-6,3,-11],18,.11);
  world.photoTarget=(i,n)=>{const a=i/n*TAU;return new THREE.Vector3(Math.cos(a)*5,Math.sin(a)*3.4,Math.sin(a)*1.5);};
  world.update=(time,scatter,openness,quality,framing)=>{
    const fold=1-THREE.MathUtils.clamp(openness,0,1),flight=THREE.MathUtils.smoothstep(scatter,.28,.94);
    petals.forEach((petal,i)=>{const {angle,layer,baseY}=petal.userData;petal.morphTargetInfluences[0]=(1-THREE.MathUtils.smoothstep(openness,layer*.08,.68+layer*.1))*.88;petal.position.set(Math.sin(angle)*(3.2+layer*.5)*flight*framing,baseY+Math.sin(i*2.1)*2.8*flight,Math.cos(angle)*(3.2+layer*.5)*flight);petal.rotation.y=angle+flight*Math.sin(time*.14+i)*.65;petal.rotation.x=flight*Math.sin(time*.23+i)*.5;petal.rotation.z=Math.sin(time*.38+i)*(.012+flight*.35);petal.scale.setScalar(1-flight*.3);});
    flower.rotation.y=Math.sin(time*.12)*.1;flower.scale.setScalar(1);stamen.material.transparent=true;stamen.material.opacity=(1-fold*.9)*(1-flight);pollen.material.uniforms.uOpacity.value=.6;
  };
  return world;
}

function createOcean(info,texture) {
  const world=baseWorld(info,texture),jellies=[detailedJelly(1,[0,1.4,0]),detailedJelly(.28,[-4.3,2.3,-4],{detail:.5}),detailedJelly(.38,[4.1,.4,-5],{detail:.5})];jellies.forEach(j=>world.body.add(j.root));
  const nursery=detailedJelly(1,[0,0,0],{detail:.5}),babyCount=26;
  const babies=createSwarm({geometry:nursery.bellGeometry,material:nursery.material,count:babyCount,random:randomFactory(644),target:r=>{const a=r()*TAU,rad=r()*1.6;return[Math.cos(a)*rad,1+r()*1.5,Math.sin(a)*rad];},palette:['#9deae7','#c5aceb'],size:.23,spin:.04,destination:(r,i,n)=>orbitalPosition(r,i,n,{radius:6,bands:3,height:4.4,depth:3})});
  const parts=[[nursery.tendrilGeometry,nursery.tendrilMaterial],[nursery.armGeometry,nursery.armMaterial],[nursery.ring.geometry,nursery.ring.material],[nursery.organGeometry,nursery.organMaterial]].map(([geometry,material])=>{const mesh=new THREE.InstancedMesh(geometry,material,babyCount);mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);return mesh;});world.body.add(babies.mesh,...parts);
  addField(world,new ParticleField(2000,r=>[(r()-.5)*18,(r()-.5)*15,-2-r()*10],['#547f91','#747a9c','#6eaaa9'],{size:.035,brightness:.35}));
  nebula(world.root,'#1b627b',texture,[0,7,-10],27,.16);nebula(world.root,'#263955',texture,[-6,-5,-10],23,.13);
  world.photoTarget=(i,n)=>{const a=i/n*TAU;return new THREE.Vector3(Math.cos(a)*4.5,Math.sin(a)*3.2-.6,Math.sin(a*2)*1.8);};
  world.update=(time,scatter,openness,quality,framing)=>{
    const dissolve=THREE.MathUtils.smoothstep(scatter,.2,.8);
    jellies.forEach((j,i)=>{j.root.position.y=j.baseY+Math.sin(time*.4+i)*.22;j.animate(time+i,1-dissolve);j.root.visible=dissolve<.995;j.root.scale.set(j.scale*(.84+openness*.16),j.scale*(1.06-openness*.06),j.scale*(.84+openness*.16));});
    babies.update(time,scatter,quality,THREE.MathUtils.smoothstep(scatter,.1,.8),framing);nursery.animate(time);
    for(const mesh of parts){mesh.visible=babies.mesh.visible;mesh.count=babies.mesh.count;mesh.instanceMatrix.array.set(babies.mesh.instanceMatrix.array);mesh.instanceMatrix.needsUpdate=true;}
  };
  return world;
}

export function createWorlds() {
  const texture=glowTexture();
  return [createSaturn(WORLD_INFO[0],texture),createHeart(WORLD_INFO[1],texture),createTree(WORLD_INFO[2],texture),createFlower(WORLD_INFO[3],texture),createOcean(WORLD_INFO[4],texture)];
}
export function makeStarfield() {
  const rng=randomFactory(2026),field=new ParticleField(1600,()=>{const a=rng()*TAU,z=rng()*2-1,r=35+rng()*32,s=Math.sqrt(1-z*z);return[Math.cos(a)*s*r,z*r,Math.sin(a)*s*r];},['#b5bacb','#91a3bf','#a99a9b'],{size:.085,brightness:.48});return field;
}

export function updateWorld(world,time,scatter,openness,quality,framing=1) {
  world.fields.forEach(field=>{field.update(time,scatter);field.quality(quality);});
  world.update?.(time,scatter,openness,quality,framing);
}
