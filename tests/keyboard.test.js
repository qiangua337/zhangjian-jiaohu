import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldHandleSceneSpace} from '../src/keyboard.js';

const space={code:'Space'};
const canvas={tagName:'CANVAS'};
const context={activeElement:canvas,canvas};

test('space can control the scene from its own canvas or page background',()=>{
  assert.equal(shouldHandleSceneSpace(space,context),true);
  for(const tagName of ['BODY','HTML'])assert.equal(shouldHandleSceneSpace(space,{...context,activeElement:{tagName}}),true);
  assert.equal(shouldHandleSceneSpace(space,{...context,activeElement:{tagName:'CANVAS'}}),false);
});

test('focused buttons, links and form controls retain their native space action',()=>{
  for(const tagName of ['BUTTON','A','INPUT','TEXTAREA','SELECT','SUMMARY','DIV'])assert.equal(shouldHandleSceneSpace(space,{...context,activeElement:{tagName}}),false,tagName);
  assert.equal(shouldHandleSceneSpace(space,{...context,activeElement:{tagName:'BODY',isContentEditable:true}}),false);
  assert.equal(shouldHandleSceneSpace(space,{...context,activeElement:null}),false);
});

test('holding space, composing text or using a modified shortcut cannot toggle repeatedly',()=>{
  for(const flag of ['repeat','defaultPrevented','isComposing','altKey','ctrlKey','metaKey','shiftKey'])assert.equal(shouldHandleSceneSpace({...space,[flag]:true},context),false,flag);
  assert.equal(shouldHandleSceneSpace({code:'Enter'},context),false);
});

test('a modal, theater, photo viewer or unavailable scene blocks the global shortcut',()=>{
  assert.equal(shouldHandleSceneSpace(space,{...context,blocked:true}),false);
  assert.equal(shouldHandleSceneSpace(space,{}),false);
});
