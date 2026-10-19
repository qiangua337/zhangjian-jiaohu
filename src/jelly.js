import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const TAU=Math.PI*2;

const bellVertex=`uniform float uTime;varying vec3 vNormal;varying vec3 vPosition;varying vec3 vLocal;
void main(){vLocal=position;vec3 p=position,n=normal;float a=atan(p.z,p.x),edge=pow(clamp(1.-p.y/1.8,0.,1.),7.);p.xz*=1.+sin(uTime*1.15)*.036+cos(a*24.)*edge*.025;p.y+=sin(a*24.)*edge*.035;
#ifdef USE_INSTANCING
p=(instanceMatrix*vec4(p,1.)).xyz;n=mat3(instanceMatrix)*n;
#endif
vNormal=normalize(normalMatrix*n);vec4 mv=modelViewMatrix*vec4(p,1.);vPosition=mv.xyz;gl_Position=projectionMatrix*mv;}`;
const bellFragment=`uniform float uTime;uniform float uOpacity;varying vec3 vNormal;varying vec3 vPosition;varying vec3 vLocal;
void main(){float f=pow(1.-abs(dot(normalize(vNormal),normalize(-vPosition))),2.4);float a=atan(vLocal.z,vLocal.x);float rib=pow(.5+.5*cos(a*24.+sin(vLocal.y*2.)*.12),18.);float pulse=.9+.1*sin(uTime*1.15);vec3 c=mix(vec3(.18,.12,.34),vec3(.38,.7,.77),f);c+=vec3(.17,.13,.26)*rib;float skin=.035+f*.39+rib*.075;gl_FragColor=vec4(c*1.3,skin*pulse*uOpacity);}`;
const tentacleVertex=`uniform float uTime;varying float vT;void main(){vec3 p=position;vT=clamp(-p.y/5.,0.,1.);p.x+=sin(p.y*1.3+uTime*.7+p.z)*vT*.23;p.z+=cos(p.y*1.1+uTime*.6+p.x)*vT*.19;
#ifdef USE_INSTANCING
p=(instanceMatrix*vec4(p,1.)).xyz;
#endif
gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;

export function jellyModel(scale,position,{detail=1}={}) {
  const root=new THREE.Group();root.position.set(...position);root.scale.setScalar(scale);
  const profile=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI/2;profile.push(new THREE.Vector2(Math.sin(a)*2.2,Math.cos(a)*1.75));}
  const material=new THREE.ShaderMaterial({vertexShader:bellVertex,fragmentShader:bellFragment,uniforms:{uTime:{value:0},uOpacity:{value:1}},transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
  const bell=new THREE.Mesh(new THREE.LatheGeometry(profile,detail<1?40:96),material);root.add(bell);
  const rimPoints=[];for(let i=0;i<200;i++){const a=i/200*TAU,r=2.18+Math.sin(a*24)*.035;rimPoints.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a*24)*.025,Math.sin(a)*r));}
  const ringGeometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPoints,true),240,.014,4,true),ringMaterial=new THREE.MeshBasicMaterial({color:'#92d6db',transparent:true,opacity:.5});
  const ring=new THREE.Mesh(ringGeometry,ringMaterial);root.add(ring);
  const tendrilMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uOpacity:{value:1}},vertexShader:tentacleVertex,fragmentShader:`uniform float uOpacity;varying float vT;void main(){vec3 c=mix(vec3(.55,.33,.68),vec3(.25,.67,.75),vT);gl_FragColor=vec4(c*1.25,(.43-vT*.26)*uOpacity);}`});
  const tubes=[];for(let i=0;i<(detail<1?10:24);i++){
    const a=i/(detail<1?10:24)*TAU,r=1.95,points=[];
    for(let j=0;j<=28;j++){const t=j/28;points.push(new THREE.Vector3(Math.cos(a)*r*(1-t*.45)+Math.sin(t*8+i)*t*.22,-t*(4+(i%4)*.3),Math.sin(a)*r*(1-t*.45)));}
    tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),detail<1?24:56,.011,4,false));
  }
  const tendrilGeometry=mergeGeometries(tubes);tubes.forEach(g=>g.dispose());root.add(new THREE.Mesh(tendrilGeometry,tendrilMaterial));
  const armMaterial=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uOpacity:{value:1}},
    vertexShader:`uniform float uTime;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;float t=uv.y;p.x+=sin(uTime*.65+t*7.)*t*.24;p.z+=cos(uTime*.5+t*5.)*t*.16;
    #ifdef USE_INSTANCING
    p=(instanceMatrix*vec4(p,1.)).xyz;
    #endif
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`uniform float uOpacity;varying vec2 vUv;void main(){float edge=pow(max(0.,1.-abs(vUv.x*2.-1.)),.6);float frill=.7+.3*sin(vUv.y*78.+vUv.x*6.);vec3 c=mix(vec3(.52,.31,.64),vec3(.28,.69,.7),vUv.y);gl_FragColor=vec4(c*1.2,edge*frill*.32*(1.-vUv.y*.6)*uOpacity);}`});
  const armGeometries=[];
  for(let arm=0;arm<4;arm++){
    const positions=[],uvs=[],indices=[],a=arm/4*TAU+.3;
    for(let j=0;j<=64;j++){const t=j/64,angle=a+t*1.35,r=.48+t*.15,center=new THREE.Vector3(Math.cos(angle)*r,-t*4.5+.1,Math.sin(angle)*r),width=(.18+.08*Math.sin(t*35))*Math.pow(1-t*.82,.6);for(let side=0;side<2;side++){const u=side*2-1;positions.push(center.x+Math.cos(angle+Math.PI/2)*width*u,center.y+Math.sin(t*35)*u*.055,center.z+Math.sin(angle+Math.PI/2)*width*u);uvs.push(side,t);}}
    for(let j=0;j<64;j++){const i=j*2;indices.push(i,i+2,i+1,i+1,i+2,i+3);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();armGeometries.push(geometry);
  }
  const armGeometry=mergeGeometries(armGeometries);armGeometries.forEach(g=>g.dispose());root.add(new THREE.Mesh(armGeometry,armMaterial));
  const organs=[];for(let lobe=0;lobe<4;lobe++){
    const points=[];for(let i=0;i<80;i++){const a=i/80*TAU,phi=lobe/4*TAU;const x=Math.cos(a)*.27+.33,z=Math.sin(a)*.22;points.push(new THREE.Vector3(Math.cos(phi)*x-Math.sin(phi)*z,.62+Math.sin(a)*.025,Math.sin(phi)*x+Math.cos(phi)*z));}
    organs.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,true),80,.025,4,true));
  }
  const organGeometry=mergeGeometries(organs);organs.forEach(g=>g.dispose());organGeometry.translate(0,-.62,0).rotateX(.8).translate(0,.62,0);const organMaterial=new THREE.MeshBasicMaterial({color:'#bf9ccb',transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending});root.add(new THREE.Mesh(organGeometry,organMaterial));
  return {root,material,tendrilMaterial,armMaterial,ring,organMaterial,bellGeometry:bell.geometry,tendrilGeometry,armGeometry,organGeometry,baseY:position[1],scale,
    animate(time,opacity=1){material.uniforms.uTime.value=time;material.uniforms.uOpacity.value=opacity;tendrilMaterial.uniforms.uTime.value=time;tendrilMaterial.uniforms.uOpacity.value=opacity;armMaterial.uniforms.uTime.value=time;armMaterial.uniforms.uOpacity.value=opacity;ringMaterial.opacity=opacity*.5;organMaterial.opacity=opacity*.5;}};
}
