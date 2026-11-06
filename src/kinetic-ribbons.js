import * as THREE from 'three';

// Short strips share one GPU draw; motion follows the same clock as the sculptures.
export function createKineticRibbons(){
  const count=66,segments=12,positions=[],paths=[],seeds=[];let seed=408;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<count;i++){const values=[random(),random(),random(),random()];for(let j=0;j<segments;j++)for(const [u,side] of [[j/segments,-1],[(j+1)/segments,-1],[j/segments,1],[j/segments,1],[(j+1)/segments,-1],[(j+1)/segments,1]]){positions.push(0,0,0);paths.push(u,side);seeds.push(...values);}}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('aPath',new THREE.Float32BufferAttribute(paths,2));geometry.setAttribute('aSeed',new THREE.Float32BufferAttribute(seeds,4));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    uniforms:{uTime:{value:0},uScatter:{value:0},uPulse:{value:0},uFraming:{value:1},uMode:{value:0},uColor:{value:new THREE.Color()},uSecondary:{value:new THREE.Color()}},
    vertexShader:`attribute vec2 aPath;attribute vec4 aSeed;uniform float uTime;uniform float uScatter;uniform float uPulse;uniform float uFraming;uniform float uMode;varying vec2 vPath;varying float vTint;
    void main(){float t=uTime*(.035+aSeed.z*.025);float a=aSeed.x*6.283185+t+aPath.x*(.12+aSeed.w*.3);float radius=4.3+aSeed.y*3.+uScatter*1.3+uPulse*.15;vec3 p=vec3(cos(a)*radius,sin(a)*radius*.7,sin(a*1.3+aSeed.z*6.)*1.8-2.8);vec3 normal=normalize(vec3(cos(a),sin(a),.1));if(uMode>1.5&&uMode<2.5){float fall=fract(aSeed.x-uTime*.027);p=vec3((aSeed.y-.5)*12.,(fall-.5)*12.+aPath.x*.48,-2.-aSeed.z*5.);normal=vec3(1.,0.,0.);}if(uMode>3.5){float rise=fract(aSeed.x+uTime*.017);p=vec3((aSeed.y-.5)*12.+sin(rise*5.+aSeed.z*6.)*.6,(rise-.5)*12.+aPath.x*.6,-2.-aSeed.z*5.);normal=vec3(1.,0.,0.);}p+=normal*aPath.y*(.007+aSeed.w*.009);p.x*=uFraming;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);vPath=aPath;vTint=aSeed.z;}`,
    fragmentShader:`uniform vec3 uColor;uniform vec3 uSecondary;uniform float uPulse;uniform float uScatter;varying vec2 vPath;varying float vTint;void main(){float taper=sin(vPath.x*3.141592);float edge=1.-abs(vPath.y);vec3 color=mix(uColor,uSecondary,vTint);float alpha=pow(taper,1.4)*pow(edge,.5)*(.18+uScatter*.1+uPulse*.28);gl_FragColor=vec4(color*1.35,alpha);}`});
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
  return{mesh,setWorld(world){material.uniforms.uMode.value=['saturn','heart','tree','flower','ocean'].indexOf(world.id);material.uniforms.uColor.value.set(world.color);material.uniforms.uSecondary.value.set({saturn:'#7189cc',heart:'#9672d4',tree:'#f4dfaa',flower:'#b8a1d9',ocean:'#80bbda'}[world.id]);},update(time,scatter,quality,framing,pulse){const u=material.uniforms;u.uTime.value=time;u.uScatter.value=scatter;u.uPulse.value=pulse;u.uFraming.value=framing;geometry.setDrawRange(0,Math.max(22,Math.round(count*quality))*segments*6);}};
}
