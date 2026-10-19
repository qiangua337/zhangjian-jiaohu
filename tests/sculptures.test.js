import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {heartSurface,pineBranches} from '../src/sculptures.js';
import {createSwarm,orbitalPosition} from '../src/swarm.js';

function random(seed=17){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}

test('the heart is a closed, symmetric volume on its implicit surface',()=>{
  for(let j=1;j<18;j++)for(let i=0;i<28;i++){
    const phi=j/18*Math.PI,theta=i/28*Math.PI*2,p=heartSurface(phi,theta),mirror=heartSurface(phi,-theta);
    assert.ok(p.every(Number.isFinite));assert.ok(Math.abs(p[0]-mirror[0])<1e-5&&Math.abs(p[1]-mirror[1])<1e-5&&Math.abs(p[2]+mirror[2])<1e-5);
    const x=p[0]/3.25,y=(p[1]+.35)/3.25,z=p[2]/2.88,a=x*x+2.25*z*z+y*y-1;
    assert.ok(Math.abs(a*a*a-x*x*y*y*y-.1125*z*z*y*y*y)<.0001);
  }
});

test('released objects remain finite and fit both portrait and desktop stages',()=>{
  const geometry=new THREE.SphereGeometry(1,6,4),material=new THREE.MeshBasicMaterial(),swarm=createSwarm({geometry,material,count:320,random:random(),target:()=>[0,0,0],palette:['#ffaaaa'],size:.06,destination:(r,i,n)=>orbitalPosition(r,i,n,{radius:6.5,height:4.2,depth:2.6})});
  for(const progress of [0,.15,.45,.7,1]){
    swarm.update(30,progress,1,progress,1);
    for(let i=0;i<swarm.mesh.count;i++){
      const matrix=new THREE.Matrix4();swarm.mesh.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));
      assert.ok(Math.abs(matrix.elements[12])<7.2);assert.ok(Math.abs(matrix.elements[13])<5);assert.ok(Math.abs(matrix.elements[14])<3.5);
    }
  }
  swarm.update(30,1,.38,1,.62);assert.equal(swarm.mesh.count,122);
  for(let i=0;i<swarm.mesh.count;i++){const m=new THREE.Matrix4();swarm.mesh.getMatrixAt(i,m);assert.ok(Math.abs(m.elements[12])<4.6);}
  geometry.dispose();material.dispose();
});

test('lower tree quality preserves foliage from the base to the crown',()=>{
  const tree=pineBranches(random(),1800);tree.update(0,.35);
  const heights=[];for(let i=0;i<tree.mesh.count;i++){const matrix=new THREE.Matrix4();tree.mesh.getMatrixAt(i,matrix);heights.push(matrix.elements[13]);}
  assert.ok(Math.min(...heights)<-4);assert.ok(Math.max(...heights)>4);assert.equal(tree.mesh.count,630);
  tree.mesh.geometry.dispose();tree.mesh.material.dispose();
});
