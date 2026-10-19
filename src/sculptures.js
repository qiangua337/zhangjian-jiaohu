import * as THREE from 'three';

const TAU=Math.PI*2;

export function heartSurface(phi,theta,depth=1.8) {
  const dx=Math.sin(phi)*Math.cos(theta),dy=Math.cos(phi),dz=Math.sin(phi)*Math.sin(theta);
  let low=0,high=1.8;
  for(let k=0;k<20;k++){
    const r=(low+high)/2,x=dx*r,y=dy*r,z=dz*r,a=x*x+2.25*z*z+y*y-1;
    if(a*a*a-x*x*y*y*y-.1125*z*z*y*y*y>0)high=r;else low=r;
  }
  const r=(low+high)/2;return [dx*r*3.25,dy*r*3.25-.35,dz*r*depth*1.6];
}

export function crystalHeart(geometry) {
  const root=new THREE.Group();
  const material=new THREE.MeshPhysicalMaterial({color:'#a44869',roughness:.3,metalness:.28,transmission:.22,thickness:2.1,clearcoat:.55,clearcoatRoughness:.22,ior:1.46,envMapIntensity:.72,transparent:true,opacity:.94});
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vStone;').replace('#include <begin_vertex>','#include <begin_vertex>\nvStone=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vStone;').replace('#include <color_fragment>',`#include <color_fragment>
      float marble=sin(vStone.y*2.8+sin(vStone.x*1.7+vStone.z)*.5);
      float gradient=smoothstep(-3.5,3.3,vStone.y);
      diffuseColor.rgb*=mix(vec3(.48,.4,.49),vec3(1.18,1.02,.92),gradient)*(.96+marble*.04);`);
  };
  material.customProgramCacheKey=()=> 'palm-rose-quartz-2';
  const core=new THREE.Mesh(geometry,material);root.add(core);
  const rimMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uOpacity:{value:1}},
    vertexShader:`varying vec3 vN;varying vec3 vP;varying vec3 vLocal;void main(){vLocal=position;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position*1.002,1.);vP=mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform float uTime;uniform float uOpacity;varying vec3 vN;varying vec3 vP;varying vec3 vLocal;void main(){float fresnel=pow(1.-abs(dot(normalize(vN),normalize(-vP))),2.8);vec3 c=mix(vec3(.65,.21,.34),vec3(.83,.63,.51),clamp(vLocal.y*.1+.55,0.,1.));float vein=pow(.5+.5*sin(vLocal.y*15.+sin(vLocal.x*2.)*.8-uTime*.2),20.);gl_FragColor=vec4(c*1.3,(fresnel*.52+vein*.014)*uOpacity);}`});
  const rim=new THREE.Mesh(geometry,rimMaterial);root.add(rim);
  const lines=[];
  const segment=(a,b)=>lines.push(...a.map(v=>v*1.004),...b.map(v=>v*1.004));
  for(let strand=0;strand<54;strand++)for(let j=1;j<80;j++){
    const base=strand/54*TAU;
    const point=step=>{const phi=step/80*Math.PI,theta=base+Math.sin(phi*2.7+base*1.5)*.22+Math.sin(phi*6+base)*.045;return heartSurface(phi,theta);};
    segment(point(j),point(j+1));
  }
  const lineGeometry=new THREE.BufferGeometry();lineGeometry.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));
  const lineMaterial=new THREE.LineBasicMaterial({color:'#ca8ca3',transparent:true,opacity:.095,depthWrite:false,blending:THREE.AdditiveBlending});
  root.add(new THREE.LineSegments(lineGeometry,lineMaterial));
  return {root,material,update(time,opacity){core.visible=opacity>.005;material.opacity=.94*opacity;rimMaterial.uniforms.uTime.value=time;rimMaterial.uniforms.uOpacity.value=opacity;lineMaterial.opacity=.095*opacity;}};
}

export function pineBranches(random,count=1800) {
  const positions=[],colors=[];
  const shades=['#173e32','#244c3c','#365b43','#517057'].map(v=>new THREE.Color(v));
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
    const level=random(),y=level*8.4-4.15,angle=i*2.3999632297,outer=(1-level)*3.75;
    const radius=outer*(.24+random()*.63);dummy.position.set(Math.cos(angle)*radius,y,Math.sin(angle)*radius);
    dummy.rotation.set(.15+random()*.2,Math.PI/2-angle,(random()-.5)*.17);dummy.scale.setScalar(.28+(1-level)*.9);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  }
  return {mesh,update(scatter,quality){mesh.count=Math.round(count*Math.max(.35,quality));material.opacity=1-THREE.MathUtils.smoothstep(scatter,.12,.6);mesh.visible=material.opacity>.005;}};
}

export function petalTexture(layer) {
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;
  const context=canvas.getContext('2d');
  const gradient=context.createLinearGradient(0,512,0,0);
  gradient.addColorStop(0,layer<2?'#a55275':'#945077');gradient.addColorStop(.4,'#d99bb1');gradient.addColorStop(1,'#f2d9d1');context.fillStyle=gradient;context.fillRect(0,0,256,512);
  for(let i=0;i<35;i++){
    const x=i/34*256;context.beginPath();context.moveTo(128,512);context.bezierCurveTo(128+(x-128)*.3,340,x,170,x,0);context.strokeStyle=i%3?'rgba(112,46,80,.07)':'rgba(255,237,224,.23)';context.lineWidth=i%3?.7:1.1;context.stroke();
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
