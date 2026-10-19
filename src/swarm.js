import * as THREE from 'three';

// Each instance remains a solid 3D object throughout the transition.
export function createSwarm({geometry,material,count,random,target,palette,radius=10,size=.12,spin=.18}) {
  const mesh=new THREE.InstancedMesh(geometry,material,count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled=false;
  const dummy=new THREE.Object3D();
  const colors=palette.map(value=>new THREE.Color(value));
  const items=Array.from({length:count},(_,index)=>{
    const a=random()*Math.PI*2,y=random()*2-1,r=radius*(.42+random()*.58),s=Math.sqrt(1-y*y);
    const item={home:new THREE.Vector3(...target(random,index,count)),away:new THREE.Vector3(Math.cos(a)*s*r,y*r*.72,Math.sin(a)*s*r*.66),phase:random()*Math.PI*2,size:size*(.6+random()*1.2),turn:random()*2-1};
    mesh.setColorAt(index,colors[Math.floor(random()*colors.length)]);
    return item;
  });
  function update(time,progress,quality=1,visibility=progress) {
    const t=THREE.MathUtils.smoothstep(progress,0,1);
    const emerge=THREE.MathUtils.smoothstep(visibility,.04,.56);
    mesh.visible=emerge>.001;
    mesh.count=Math.min(count,Math.max(48,Math.round(count*Math.max(.45,quality))));
    for(let i=0;i<mesh.count;i++) {
      const item=items[i];
      dummy.position.lerpVectors(item.home,item.away,t);
      dummy.position.x+=Math.sin(time*.28+item.phase)*t*.35;
      dummy.position.y+=Math.cos(time*.36+item.phase)*t*.3;
      dummy.position.z+=Math.sin(time*.24+item.phase*2)*t*.28;
      dummy.rotation.set(Math.sin(item.phase)*t*.55,item.turn*t*1.7+time*spin*t,Math.sin(time*.2+item.phase)*t*.3);
      dummy.scale.setScalar(item.size*emerge);
      dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;
  }
  update(0,0);
  return {mesh,items,update};
}
