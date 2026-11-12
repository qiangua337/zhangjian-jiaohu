import test from 'node:test';
import assert from 'node:assert/strict';
import { BLOOMED_FLOWER, FramePacer, handMorph, renderBudget, sculptingPose } from '../src/motion.js';
import { GestureContinuity, TwoHandZoom } from '../src/gesture-motion.js';

test('hand and slider use the same continuous flower pose, with a stable bloom before petal flight', () => {
  assert.equal(handMorph('flower', .12), 0);
  for (const openness of [.70, .73, .76]) {
    assert.equal(handMorph('flower', openness), BLOOMED_FLOWER);
    assert.deepEqual(sculptingPose('flower', handMorph('flower', openness)), { open: 1, scatter: 0 });
  }
  let previous = 0;
  for (let i = 0; i <= 100; i++) {
    const amount = handMorph('flower', i / 100);
    assert.ok(amount >= previous && amount - previous < .05);
    previous = amount;
  }
  assert.equal(previous, 1);
  assert.deepEqual(sculptingPose('flower', 1), { open: 1, scatter: .94 });
});

test('frame pacing stays near its target on 60, 90 and 120 Hz displays', () => {
  for (const hz of [60, 90, 120]) for (const rate of [30, 60]) {
    const pacer = new FramePacer();
    let frames = 0;
    for (let i = 0; i < hz * 5; i++) {
      const elapsed = pacer.take(i * 1000 / hz + Math.sin(i * .67) * .42, rate);
      if (elapsed === null) continue;
      assert.ok(elapsed > 0 && elapsed < 1000 / rate + 1000 / hz + 1);
      frames++;
    }
    assert.ok(Math.abs(frames - rate * 5) <= 1, hz + ' Hz at ' + rate + ' fps');
    pacer.reset();
    assert.equal(pacer.take(33000, rate), 1000 / rate);
  }
});

test('automatic mobile camera use limits postprocessing, leaving explicit quality choices intact', () => {
  const full = renderBudget({mobile:true,camera:false,mode:'auto',tier:0});
  const withCamera = renderBudget({mobile:true,camera:true,mode:'auto',tier:0});
  const constrained = renderBudget({mobile:true,camera:true,mode:'auto',tier:2});
  assert.equal(withCamera.rate, full.rate);
  assert.ok(withCamera.pixels < full.pixels && withCamera.bloom < full.bloom);
  assert.ok(constrained.rate < full.rate && constrained.density < full.density);
  assert.deepEqual(
    renderBudget({mobile:true,camera:true,mode:'high',tier:2}),
    renderBudget({mobile:true,camera:false,mode:'high',tier:0})
  );
});

test('a stray second hand cannot take over, and a brief loss preserves the current mode', () => {
  const control = new GestureContinuity(), left = {x:.2,y:.5,pose:'pinch'}, right = {x:.8,y:.5,pose:'palm'};
  assert.deepEqual(control.sample([left], 0).hands, [left]);
  assert.deepEqual(control.sample([right,left], 60).hands, [left]);
  assert.deepEqual(control.sample([left], 120).hands, [left]);
  assert.deepEqual(control.sample([left,right], 180).hands, [left]);
  assert.deepEqual(control.sample([right,left], 254).hands, [right,left]);
  assert.deepEqual(control.sample([left], 320), {hands:[right,left],stale:true});
  assert.deepEqual(control.sample([left], 430), {hands:[left],stale:false});
  assert.deepEqual(control.sample([], 520), {hands:[left],stale:true});
  assert.deepEqual(control.sample([], 640), {hands:[],stale:false});
});

test('two-hand zoom resists small spacing noise and always stays within camera limits', () => {
  const zoom = new TwoHandZoom();
  const position = gap => zoom.target(gap, 22, 10, 52);
  assert.equal(position(.36), 22);
  assert.equal(position(.368), 22);
  assert.equal(position(.35), 22);
  assert.ok(position(.48) < 22);
  assert.ok(position(.24) > 22);
  assert.equal(position(.085), 52);
  assert.equal(position(.05), null);
  assert.equal(zoom.target(.33, 31, 10, 52), 31);
});
