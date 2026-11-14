import * as THREE from 'three';

const TAU=Math.PI*2;

export function heartSurface(phi,theta,depth=1.8) {
  const sin=Math.sin(phi);
  return heartSurfaceAlong(sin*Math.cos(theta),Math.cos(phi),sin*Math.sin(theta),depth);
}

function heartSurfaceAlong(dx,dy,dz,depth=1.8) {
  const x2=dx*dx,y2=dy*dy,z2=dz*dz;
  const quadratic=x2+2.25*z2+y2;
  const fifth=(x2+.1125*z2)*y2*dy;
  let low=0,high=1.8;
  for(let k=0;k<20;k++){
    const r=(low+high)/2,r2=r*r,a=quadratic*r2-1;
    if(a*a*a-fifth*r2*r2*r>0)high=r;else low=r;
  }
  const r=(low+high)/2;return [dx*r*3.25,dy*r*3.25-.35,dz*r*depth*1.6];
}

export function roundedHeartGeometry(segments=144,rings=36,depth=1.8) {
  const height=rings*2, vertexCount=(height-1)*segments+2;
  const positions=new Float32Array(vertexCount*3);
  const IndexArray=vertexCount<=65536?Uint16Array:Uint32Array;
  const indices=new IndexArray((height-1)*segments*6);
  const meridians=Array.from({length:segments},(_,i)=>[Math.cos(i/segments*TAU),Math.sin(i/segments*TAU)]);
  const south=vertexCount-1;
  positions.set(heartSurfaceAlong(0,1,0,depth),0);
  positions.set(heartSurfaceAlong(0,-1,0,depth),3*south);
  let vertex=1;
  for(let j=1;j<height;j++){
    const phi=j/height*Math.PI,sin=Math.sin(phi),cos=Math.cos(phi);
    for(const [x,z] of meridians)positions.set(heartSurfaceAlong(sin*x,cos,sin*z,depth),3*vertex++);
  }

  // The two poles and the wrapped seam share vertices. Building this
  // topology directly avoids welding thousands of duplicates at runtime.
  let index=0;
  for(let i=0;i<segments;i++){
    indices[index++]=0;
    indices[index++]=1+(i+1)%segments;
    indices[index++]=1+i;
  }
  for(let j=0;j<height-2;j++){
    for(let i=0;i<segments;i++){
      const next=(i+1)%segments;
      const a=1+j*segments+i,b=1+j*segments+next,c=a+segments,d=b+segments;
      indices[index++]=a;indices[index++]=b;indices[index++]=c;
      indices[index++]=c;indices[index++]=b;indices[index++]=d;
    }
  }
  for(let i=0;i<segments;i++){
    indices[index++]=south-segments+i;
    indices[index++]=south-segments+(i+1)%segments;
    indices[index++]=south;
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setIndex(new THREE.BufferAttribute(indices,1));
  geometry.computeVertexNormals();
  return geometry;
}

export function crystalHeart(geometry) {
  const root=new THREE.Group();
  const motion={time:{value:0},response:{value:0}};
  const material=new THREE.MeshPhysicalMaterial({color:'#c3537e',roughness:.25,metalness:.24,clearcoat:.85,clearcoatRoughness:.21,ior:1.48,iridescence:.4,iridescenceIOR:1.38,iridescenceThicknessRange:[225,430],envMapIntensity:.93,emissive:'#3b142b',emissiveIntensity:.14,transparent:true,opacity:1});
  material.onBeforeCompile=shader=>{
    shader.uniforms.uArtTime=motion.time;shader.uniforms.uResponse=motion.response;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vStone;').replace('#include <begin_vertex>','#include <begin_vertex>\nvStone=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vStone;uniform float uArtTime;uniform float uResponse;').replace('#include <color_fragment>',`#include <color_fragment>
      float gradient=smoothstep(-3.7,3.15,vStone.y-vStone.x*.27);
      float contour=vStone.y*10.2+vStone.x*2.1+sin(vStone.x*.9+vStone.z*1.5)*1.5+sin(vStone.z*2.-uArtTime*.09)*.22;
      float etch=(1.-smoothstep(.045,.19+fwidth(contour)*.28,abs(sin(contour))))*(1.-smoothstep(.5,2.1,fwidth(contour)));
      float silk=.5+.5*sin(vStone.x*.84+vStone.y*.7+vStone.z*1.45);
      float pool=exp(-dot(vStone.xy*vec2(.28,.23)+vec2(.38,-.13),vStone.xy*vec2(.28,.23)+vec2(.38,-.13)));
      diffuseColor.rgb*=mix(vec3(.26,.31,.72),vec3(1.18,.91,.90),gradient);
      diffuseColor.rgb+=vec3(.014,.019,.04)*etch+vec3(.048,.012,.028)*silk*pool;`).replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      totalEmissiveRadiance+=vec3(.25,.075,.20)*etch*(.055+uResponse*.5)+vec3(.033,.011,.037)*pool;`);
  };
  material.customProgramCacheKey=()=> 'palm-silk-pearl-42';
  const core=new THREE.Mesh(geometry,material);root.add(core);
  const rimMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uOpacity:{value:1}},
    vertexShader:`varying vec3 vN;varying vec3 vP;varying vec3 vLocal;void main(){vLocal=position;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position*1.003,1.);vP=mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform float uTime;uniform float uOpacity;varying vec3 vN;varying vec3 vP;varying vec3 vLocal;
    void main(){
      float eye=1.-abs(dot(normalize(vN),normalize(-vP)));
      float ridge=pow(eye,4.1),lace=pow(eye,1.8)*.06;
      float tint=smoothstep(-3.5,3.5,vLocal.y-vLocal.x*.36);
      vec3 c=mix(vec3(.39,.38,.88),vec3(1.,.64,.54),tint);
      float travel=.84+.16*sin(vLocal.x*.85+vLocal.y*.48-uTime*.32);
      gl_FragColor=vec4(c*1.23,(ridge*.28+lace)*travel*uOpacity);
    }`});
  root.add(new THREE.Mesh(geometry,rimMaterial));
  return {root,material,update(time,opacity,response=0){motion.time.value=time;motion.response.value=response;core.visible=opacity>.005;material.opacity=opacity;rimMaterial.uniforms.uTime.value=time;rimMaterial.uniforms.uOpacity.value=opacity;}};
}

export function pineRadius(level, azimuth) {
  const tiers=.89+.10*Math.cos(level*TAU*6.3)+.038*Math.sin(azimuth*5+level*11);
  return Math.max(0,(1-level)*4.05*tiers);
}

export function pineBranches(random,count=1800) {
  const positions=[],colors=[];
  const shades=['#194538','#305b45','#467451','#678968','#395c4c'].map(v=>new THREE.Color(v));
  function triangle(a,b,c,color){positions.push(...a,...b,...c);for(let j=0;j<3;j++)colors.push(color.r,color.g,color.b);}
  for(let j=0;j<15;j++)for(const side of [-1,1]){
    const t=j/15,z=t*1.15,length=(1-t*.72)*.42,c=shades[j%shades.length];
    triangle([0,0,z],[length*side,.065+Math.sin(j)*.025,z-.25],[.018*side,.018,z+.1],c);
    triangle([0,0,z],[length*side*.7,-.08,z-.16],[.016*side,0,z+.08],c);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color:'#e1ebd9',vertexColors:true,roughness:.87,metalness:.04,envMapIntensity:.24,side:THREE.DoubleSide,transparent:true});
  const mesh=new THREE.InstancedMesh(geometry,material,count),dummy=new THREE.Object3D();mesh.frustumCulled=false;
  for(let i=0;i<count;i++){
    const level=random(),y=level*8.4-4.15,angle=i*2.3999632297,outer=pineRadius(level,angle);
    const radius=outer*(.27+random()*.66);dummy.position.set(Math.cos(angle)*radius,y,Math.sin(angle)*radius);
    dummy.rotation.set(.19+random()*.24,Math.PI/2-angle,(random()-.5)*.22);dummy.scale.setScalar(.24+(1-level)*.99);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  }
  return {mesh,update(scatter,quality){mesh.count=Math.round(count*Math.max(.35,quality));material.opacity=1-THREE.MathUtils.smoothstep(scatter,.12,.6);mesh.visible=material.opacity>.005;}};
}

export function petalTexture(layer) {
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;
  const context=canvas.getContext('2d');
  const gradient=context.createLinearGradient(0,512,0,0);
  gradient.addColorStop(0,layer<2?'#8f3e72':'#91437b');
  gradient.addColorStop(.34,layer<2?'#d27ca2':'#dd8fa8');
  gradient.addColorStop(.69,layer<2?'#efb0bf':'#f5c4be');
  gradient.addColorStop(1,layer<2?'#fce1d9':'#ffead2');
  context.fillStyle=gradient;context.fillRect(0,0,256,512);
  const edge=context.createLinearGradient(0,0,256,0);
  edge.addColorStop(0,'#d273a069');edge.addColorStop(.2,'#d273a000');edge.addColorStop(.73,'#d273a000');edge.addColorStop(1,'#faacb07e');
  context.fillStyle=edge;context.fillRect(0,0,256,512);
  for(let i=0;i<31;i++){
    const x=i/30*256,y=20+Math.abs(x-128)*.26;
    context.beginPath();context.moveTo(128,509);context.bezierCurveTo(128+(x-128)*.30,322,x+(i%2?13:-11),170,x,y);
    context.strokeStyle=i%3?'#7c295020':'#fff0dd5e';context.lineWidth=i%3?.85:1.55;context.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

export function orbitLines({radii=[3.7,5.1,6.4],height=.55,color='#89765c'}={}) {
  const group=new THREE.Group(),materials=[];
  radii.forEach((radius,index)=>{
    const positions=[];for(let i=0;i<200;i++){const a=i/200*TAU;positions.push(Math.cos(a)*radius,Math.sin(a)*height+index*.25-.3,Math.sin(a)*radius*.6);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    const material=new THREE.LineBasicMaterial({color,transparent:true,opacity:0,depthWrite:false});materials.push(material);group.add(new THREE.LineLoop(geometry,material));
  });
  return {group,update(scatter,time){group.rotation.y=Math.sin(time*.07)*.15;materials.forEach(m=>m.opacity=THREE.MathUtils.smoothstep(scatter,.2,.85)*.2);}};
}
