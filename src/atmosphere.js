import * as THREE from 'three';

export function studioEnvironment(renderer) {
  const width=512,height=256,data=new Float32Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const u=x/width,v=y/height;
    const softbox=(cx,cy,sx,sy)=>Math.exp(-((u-cx)**2/sx+(v-cy)**2/sy));
    const key=softbox(.22,.29,.014,.055)*3.8,strip=softbox(.73,.43,.004,.07)*2.1,top=softbox(.5,.12,.2,.012)*.8,i=(y*width+x)*4;
    data.set([.035+key*1.08+strip*.78+top,.04+key*.98+strip*.86+top*.94,.065+key*.94+strip*1.16+top*.95,1],i);
  }
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);
  texture.mapping=THREE.EquirectangularReflectionMapping;texture.needsUpdate=true;
  const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromEquirectangular(texture);
  texture.dispose();pmrem.dispose();return target;
}

export function createAtmosphere() {
  const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{uTime:{value:0},uBase:{value:new THREE.Color('#060a13')},uTint:{value:new THREE.Color('#8787b0')},uSecondary:{value:new THREE.Color('#405080')},uStyle:{value:0},uGain:{value:.82},uAspect:{value:1},uFocus:{value:new THREE.Vector2(.6,.55)}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}`,
    fragmentShader:`varying vec2 vUv;uniform float uTime;uniform vec3 uBase;uniform vec3 uTint;uniform vec3 uSecondary;uniform float uStyle;uniform float uGain;uniform float uAspect;uniform vec2 uFocus;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    float cloud(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=noise(p)*a;p=p*2.03+vec2(4.2,1.7);a*=.5;}return n;}
    void main(){
      vec2 p=(vUv-uFocus)*vec2(uAspect,1.);float r=length(p);float t=uTime*.008;
      vec2 warp=vec2(cloud(p*2.7+vec2(t,0.)),cloud(p*2.7+vec2(4.,t)));
      float mist=cloud(p*4.+warp*1.5+vec2(t,-t*.5));
      float band=exp(-pow((p.y+p.x*.32)*4.,2.));float aura=exp(-r*r*3.5);float filament=0.;float lower=0.;
      if(uStyle<.5){
        filament=pow(mist,3.)*band*.18;
        lower=exp(-pow((p.y+p.x*.32+.12)*13.,2.))*cloud(p*7.+warp)*.032;
      }else if(uStyle<1.5){
        float angle=atan(p.y,p.x);float ribbon=sin(r*31.+angle*1.7+mist*3.-t);
        filament=pow(max(0.,ribbon),18.)*exp(-pow((r-.42)*3.5,2.))*.021;
        band=exp(-pow((p.y-p.x*.28)*3.,2.));lower=exp(-r*r*8.)*.028;
      }else if(uStyle<2.5){
        band=exp(-pow((p.y+.27)*5.,2.));
        float ray=pow(max(0.,sin(p.x*21.+warp.y*1.4)),14.);
        filament=ray*smoothstep(-.3,.5,p.y)*exp(-abs(p.x)*1.5)*.016;
        lower=cloud(p*6.+vec2(t,0.))*band*.04;
      }else if(uStyle<3.5){
        float angle=atan(p.y,p.x);float petals=sin(angle*7.+r*8.+mist*2.+t);
        filament=pow(max(0.,petals),12.)*exp(-pow((r-.4)*4.5,2.))*.018;
        band=exp(-r*r*4.);lower=exp(-r*r*7.)*.027;
      }else{
        float ray=pow(max(0.,sin(p.x*27.+p.y*4.+warp.x)),22.);
        filament=ray*smoothstep(-.45,.6,p.y)*exp(-abs(p.x)*2.)*.035;
        band=exp(-pow(p.x*2.,2.));lower=cloud(p*8.+warp)*exp(-pow((p.y+.4)*8.,2.))*.026;
      }
      vec3 tint=mix(uSecondary,uTint,smoothstep(-.7,.6,p.x+mist*.2));
      vec3 c=uBase*.65+tint*((pow(mist,2.2)*band*aura*.12+filament+lower)*uGain);
      c+=uSecondary*exp(-r*r*5.)*.018*uGain;
      float grain=(hash(gl_FragCoord.xy)-.5)/2200.;gl_FragColor=vec4(c+grain,1.);
    }`});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);mesh.frustumCulled=false;mesh.renderOrder=-1000;
  return {mesh,material,setLook(gain){material.uniforms.uGain.value=gain;},resize(w,h,frame){material.uniforms.uAspect.value=w/h;if(frame)material.uniforms.uFocus.value.set(.5-frame.offsetX/w,.5+frame.offsetY/h);},setWorld(world){material.uniforms.uBase.value.set(world.bg);material.uniforms.uTint.value.set(world.color);material.uniforms.uSecondary.value.set({saturn:'#5369ae',heart:'#7d5fa7',tree:'#34846d',flower:'#8259a2',ocean:'#366394'}[world.id]);material.uniforms.uStyle.value=['saturn','heart','tree','flower','ocean'].indexOf(world.id);},update(time){material.uniforms.uTime.value=time;}};
}
