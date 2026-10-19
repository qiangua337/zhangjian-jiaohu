import * as THREE from 'three';

const TAU=Math.PI*2;
export function orbitalPosition(random,index,count,{radius=6,bands=3,height=3.4,depth=3}={}) {
  const band=index%bands,a=index/count*TAU*2.618+band*1.9;
  const r=radius*(.53+band/Math.max(1,bands-1)*.43)+(random()-.5)*.65;
  return [Math.cos(a)*r,Math.sin(a)*height*(.58+band*.16)+(random()-.5)*.5,Math.sin(a*1.3+band)*depth];
}

// Bounded destinations and curved paths keep every released piece in the stage.
export function createSwarm({geometry,material,count,random,target,palette,radius=6,size=.12,spin=.15,destination}) {
  const mesh=new THREE.InstancedMesh(geometry,material,count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled=false;
  const dummy=new THREE.Object3D(),away=new THREE.Vector3();
  const colors=palette.map(value=>new THREE.Color(value));
  const items=Array.from({length:count},(_,index)=>{
    const position=destination?destination(random,index,count):orbitalPosition(random,index,count,{radius});
    const item={home:new THREE.Vector3(...target(random,index,count)),away:new THREE.Vector3(...position),phase:random()*TAU,size:size*(.55+Math.pow(random(),2)*1.25),turn:random()*2-1,delay:random()*.13};
    mesh.setColorAt(index,colors[Math.floor(random()*colors.length)]);
    return item;
  });
  function update(time,progress,quality=1,visibility=progress,framing=1) {
    const t=THREE.MathUtils.smoothstep(THREE.MathUtils.clamp(progress,0,1),0,1);
    mesh.visible=visibility>.015;
    mesh.count=Math.min(count,Math.max(12,Math.round(count*Math.max(.3,quality))));
    for(let i=0;i<mesh.count;i++) {
      const item=items[i],emerge=THREE.MathUtils.smoothstep(visibility,item.delay,item.delay+.4);
      away.copy(item.away);away.x*=framing;dummy.position.lerpVectors(item.home,away,t);
      const curl=Math.sin(t*Math.PI)*item.turn;
      dummy.position.x+=Math.sin(item.phase)*curl*.9+Math.sin(time*.22+item.phase)*t*.13;
      dummy.position.y+=Math.cos(item.phase)*curl*.65+Math.sin(time*.29+item.phase)*t*.16;
      dummy.position.z+=Math.sin(item.phase*2)*curl*.6+Math.sin(time*.18+item.phase)*t*.12;
      dummy.rotation.set(Math.sin(item.phase)*t*.28,item.turn*t*.58+Math.sin(time*spin+item.phase)*t*.36,Math.sin(time*.16+item.phase)*t*.24);
      dummy.scale.setScalar(item.size*emerge);
      dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;
  }
  update(0,0);
  return {mesh,items,update};
}
