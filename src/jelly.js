import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const TAU=Math.PI*2;

const swimPhase=`
float phase(){
  float t=uTime*1.15;
  #ifdef USE_INSTANCING
  t+=dot(instanceMatrix[3].xz,vec2(.74,.96));
  #endif
  return t;
}
`;
const flexBell=`
vec3 flexBell(vec3 p){
  float a=atan(p.z,p.x),edge=pow(clamp(1.-p.y/1.8,0.,1.),6.);
  float swim=phase();
  p.xz*=1.+sin(swim)*.048+cos(a*24.)*edge*.019;
  p.y+=edge*(sin(a*24.)*.032+sin(swim)*.032);
  return p;
}
`;
const bellVertex=`uniform float uTime;varying vec3 vNormal;varying vec3 vPosition;varying vec3 vLocal;
${swimPhase}
${flexBell}
void main(){vLocal=position;vec3 p=flexBell(position),n=normal;
#ifdef USE_INSTANCING
p=(instanceMatrix*vec4(p,1.)).xyz;n=mat3(instanceMatrix)*n;
#endif
vNormal=normalize(normalMatrix*n);vec4 mv=modelViewMatrix*vec4(p,1.);vPosition=mv.xyz;gl_Position=projectionMatrix*mv;}`;
const bellFragment=`uniform float uTime;uniform float uOpacity;varying vec3 vNormal;varying vec3 vPosition;varying vec3 vLocal;
void main(){
  float f=pow(1.-abs(dot(normalize(vNormal),normalize(-vPosition))),2.3);
  float crown=smoothstep(.08,1.65,vLocal.y);
  float a=atan(vLocal.z,vLocal.x);
  float veins=a*24.+sin(vLocal.y*2.)*.15;
  float rib=pow(.5+.5*cos(veins),17.)*(1.-smoothstep(.33,1.8,fwidth(veins)));
  float caustic=sin(vLocal.x*4.7+vLocal.z*1.6+sin(vLocal.z*4.+uTime*.25))
    +sin(vLocal.z*5.2-vLocal.x*1.4-uTime*.28);
  float waterLight=(1.-smoothstep(.04,.26,abs(caustic)))*crown;
  vec3 body=mix(vec3(.17,.12,.37),vec3(.12,.40,.50),crown);
  vec3 edge=mix(vec3(.46,.30,.75),vec3(.27,.76,.78),smoothstep(-1.3,1.1,vLocal.x+vLocal.y*.34));
  vec3 c=mix(body,edge,f)+vec3(.12,.17,.22)*(rib+waterLight*.8);
  float skin=.031+f*.46+rib*.076+waterLight*.047;
  gl_FragColor=vec4(c*1.33,skin*uOpacity);
}`;
const tentacleVertex=`uniform float uTime;varying float vT;varying float vRipple;
${swimPhase}
void main(){vec3 p=position;vT=clamp(-p.y/5.,0.,1.);float t=phase();
p.xz*=1.+sin(t)*.048*(1.-vT);
p.x+=sin(p.y*1.25+t*.68+p.z)*vT*.34;p.z+=cos(p.y*1.06+t*.5+p.x)*vT*.27;
vRipple=.58+.42*sin(t*.55+vT*10.+position.z);
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
  const ringGeometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPoints,true),detail<1?102:190,.015,4,true);
  const ringMaterial=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{uTime:{value:0},uOpacity:{value:1}},
    vertexShader:bellVertex,
    fragmentShader:`uniform float uOpacity;varying vec3 vLocal;
      void main(){vec3 c=mix(vec3(.55,.35,.85),vec3(.27,.78,.78),smoothstep(-1.8,1.8,vLocal.x));gl_FragColor=vec4(c*1.48,uOpacity*.41);}`
  });
  const ring=new THREE.Mesh(ringGeometry,ringMaterial);root.add(ring);
  const tendrilMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uOpacity:{value:1}},vertexShader:tentacleVertex,
    fragmentShader:`uniform float uOpacity;varying float vT;varying float vRipple;
    void main(){vec3 c=mix(vec3(.43,.48,.84),vec3(.24,.7,.67),vT);gl_FragColor=vec4(c*1.27,(.4-vT*.27)*vRipple*uOpacity);}`});
  const tubes=[];for(let i=0;i<(detail<1?10:24);i++){
    const a=i/(detail<1?10:24)*TAU,r=1.95,points=[];
    for(let j=0;j<=28;j++){const t=j/28;points.push(new THREE.Vector3(Math.cos(a)*r*(1-t*.45)+Math.sin(t*8+i)*t*.22,-t*(4+(i%4)*.3),Math.sin(a)*r*(1-t*.45)));}
    tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),detail<1?21:46,.012,4,false));
  }
  const tendrilGeometry=mergeGeometries(tubes);tubes.forEach(g=>g.dispose());root.add(new THREE.Mesh(tendrilGeometry,tendrilMaterial));
  const armMaterial=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uOpacity:{value:1}},
    vertexShader:`uniform float uTime;varying vec2 vUv;
    ${swimPhase}
    void main(){vUv=uv;vec3 p=position;float t=uv.y;p.x+=sin(phase()*.58+t*7.)*t*.33;p.z+=cos(phase()*.44+t*5.)*t*.21;
    #ifdef USE_INSTANCING
    p=(instanceMatrix*vec4(p,1.)).xyz;
    #endif
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`uniform float uOpacity;varying vec2 vUv;void main(){
      float width=1.-abs(vUv.x*2.-1.);
      float core=pow(max(0.,width),1.6),frill=.64+.36*sin(vUv.y*70.+vUv.x*8.);
      vec3 c=mix(vec3(.49,.33,.74),vec3(.24,.69,.66),vUv.y);
      gl_FragColor=vec4(c*1.25,(core*.37+width*.10)*frill*(1.-vUv.y*.74)*uOpacity);
    }`});
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
    animate(time,opacity=1){
      for(const m of [material,tendrilMaterial,armMaterial,ringMaterial]){m.uniforms.uTime.value=time;m.uniforms.uOpacity.value=opacity;}
      organMaterial.opacity=opacity*.56;
    }};
}
