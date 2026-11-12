import * as THREE from 'three';

export function studioEnvironment(renderer) {
  const width = 256, height = 128;
  const data = new Float32Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const v = y / height;
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const softbox = (cx, cy, sx, sy) => Math.exp(-((u - cx) ** 2 / sx + (v - cy) ** 2 / sy));
      const key = softbox(.21, .28, .006, .044) * 3.35;
      const strip = softbox(.73, .39, .0018, .065) * 2.25;
      const top = softbox(.48, .11, .105, .009) * .62;
      const i = (y * width + x) * 4;
      data[i] = .035 + key * 1.06 + strip * .62 + top;
      data[i + 1] = .039 + key * .94 + strip * .81 + top * .93;
      data[i + 2] = .063 + key * .89 + strip * 1.2 + top * .97;
      data[i + 3] = 1;
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.needsUpdate = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromEquirectangular(texture);
  texture.dispose();
  pmrem.dispose();
  return target;
}

function noiseTile() {
  const size = 64, values = new Uint8Array(size * size * 4);
  let seed = 392;
  for (let i = 0; i < values.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    values[i] = seed >>> 24;
  }
  const texture = new THREE.DataTexture(values, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

const palettes = {
  saturn: ['#6886c3', '#c68c66', 0],
  heart: ['#8063c6', '#c37799', 1],
  tree: ['#1e7565', '#e1af65', 2],
  flower: ['#7859ae', '#d79cac', 3],
  ocean: ['#525da1', '#78c5bc', 4],
};

export function createAtmosphere() {
  const noise = noiseTile();
  const uniforms = {
    uNoise: { value: noise },
    uTime: { value: 0 },
    uBase: { value: new THREE.Color('#060a13') },
    uTint: { value: new THREE.Color() },
    uSecondary: { value: new THREE.Color() },
    uStyle: { value: 0 },
    uGain: { value: .82 },
    uAspect: { value: 1 },
    uFocus: { value: new THREE.Vector2(.6, .55) },
  };
  const material = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms,
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}`,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D uNoise;
      uniform float uTime,uStyle,uGain,uAspect;
      uniform vec3 uBase,uTint,uSecondary;
      uniform vec2 uFocus;

      float glow(vec2 p, vec2 center, vec2 scale) {
        vec2 q=(p-center)*scale;
        return exp(-dot(q,q));
      }
      float beam(float x, float width) {
        float q=x/width;
        return exp(-q*q);
      }
      void main() {
        vec2 p=(vUv-uFocus)*vec2(uAspect,1.);
        float t=uTime*.045;
        // Bilinear noise gives a continuous low-frequency field with a few
        // texture reads. Fine grain stays fixed to the screen.
        vec3 wash=texture2D(uNoise,(p*4.3+vec2(t*.6,2.7))/64.).rgb;
        float mist=texture2D(uNoise,(p*10.+wash.rg*2.+vec2(-t,9.))/64.).r;
        float plume=wash.b*.58+mist*.42;
        float volume=glow(p,vec2(0.,.07),vec2(1.7,1.9));
        vec3 light=uSecondary*volume*.021;

        if(uStyle<.5){
          float ribbon=p.y+p.x*.37+(wash.g-.5)*.19;
          float nebula=beam(ribbon,.25)*pow(plume,2.2);
          float filament=beam(ribbon+.08+mist*.055,.058)*plume*volume;
          light+=mix(uSecondary,uTint,smoothstep(-.63,.68,p.x+mist*.25))*(nebula*.155+filament*.031);
          light+=uSecondary*glow(p,vec2(.39,.24),vec2(1.7,2.2))*.018;
        }else if(uStyle<1.5){
          light+=uTint*glow(p,vec2(-.17,.13),vec2(1.62,2.55))*(.044+plume*.025);
          light+=uSecondary*glow(p,vec2(.36,-.15),vec2(1.9,2.35))*(.029+mist*.017);
          float arc=length(p*vec2(.91,1.14));
          light+=uSecondary*beam(arc-.56+wash.r*.075,.095)*plume*.024;
        }else if(uStyle<2.5){
          float shaft=p.x+p.y*.44+(wash.g-.5)*.045;
          float cone=beam(shaft+.29,.16+p.y*.07)*smoothstep(-.47,.63,p.y);
          light+=uTint*cone*(.031+plume*.047);
          light+=uSecondary*glow(p,vec2(.11,-.19),vec2(1.4,3.7))*(.016+plume*.068);
        }else if(uStyle<3.5){
          float soft=glow(p,vec2(-.25,.13),vec2(1.5,2.2));
          light+=uTint*soft*(.03+pow(plume,2.)*.08);
          light+=uSecondary*glow(p,vec2(.36,-.10),vec2(1.45,2.3))*.035;
        }else{
          float surface=glow(p,vec2(-.32,.62),vec2(1.42,3.25));
          float x=p.x+p.y*.35+(wash.g-.5)*.09;
          float spread=clamp((.57-p.y)*.14,0.,.12);
          float shafts=beam(x+.26,.045+spread)+.56*beam(x-.02,.026+spread)+.42*beam(x-.29,.028+spread);
          light+=uTint*(surface*.065+shafts*smoothstep(-.54,.53,p.y)*(.025+plume*.048));
          light+=uSecondary*glow(p,vec2(.27,-.08),vec2(1.65,2.0))*(.028+mist*.033);
        }

        float vignette=1.-.32*smoothstep(.38,1.3,length(p));
        float grain=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
        gl_FragColor=vec4(max(vec3(0.),uBase*(.52+.24*volume)*vignette+light*uGain+grain*.0006),1.);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  return {
    mesh,
    setLook(gain) { uniforms.uGain.value = gain; },
    resize(w, h, frame) {
      uniforms.uAspect.value = w / h;
      uniforms.uFocus.value.set(.5 - frame.offsetX / w, .5 + frame.offsetY / h);
    },
    setWorld(world) {
      const [secondary, tint, style] = palettes[world.id];
      uniforms.uBase.value.set(world.bg);
      uniforms.uTint.value.set(tint);
      uniforms.uSecondary.value.set(secondary);
      uniforms.uStyle.value = style;
    },
    update(time) { uniforms.uTime.value = time; },
    dispose() { noise.dispose(); },
  };
}
