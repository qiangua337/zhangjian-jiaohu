import test from 'node:test';
import assert from 'node:assert/strict';
import { CHECK_DURATION, PerformanceSample } from '../src/performance-sample.js';

test('the report counts the three foreground minutes and keeps early and late performance separate', () => {
  const report = new PerformanceSample();
  let now = 0;
  assert.equal(report.frame({time:now,rate:60,tier:0}),false);
  while (report.elapsed < 60_000) {
    now += 20;
    assert.equal(report.frame({time:now,rate:60,tier:0}),false);
  }
  report.pause();
  now += 18_000;
  report.frame({time:now,rate:30,tier:2});
  assert.equal(report.elapsed,60_000);
  while (report.elapsed < 120_000) report.frame({time:now+=40,rate:30,tier:2});
  while (report.elapsed < CHECK_DURATION-60) report.frame({time:now+=60,rate:30,tier:3});
  assert.equal(report.frame({time:now+=60,rate:30,tier:3}),true);
  const [early,mid,late] = report.summary();
  assert.equal(early.fps,50);
  assert.equal(mid.fps,25);
  assert.equal(late.frameP95,60);
  assert.equal(late.late,1000);
  assert.deepEqual([...report.rates],[60,30]);
  assert.equal(report.qualityChanges,2);
});

test('camera reports compute inference cost and consecutive visible-hand sample spacing independently', () => {
  const report = new PerformanceSample();
  report.frame({time:0,rate:60,tier:0});
  report.frame({time:16,rate:60,tier:0});
  report.inference({time:20,cost:5,tracked:true});
  report.inference({time:60,cost:6,tracked:true});
  report.inference({time:100,cost:18,tracked:false});
  report.pause();
  report.inference({time:2000,cost:7,tracked:true});
  const [row] = report.summary();
  assert.equal(row.inferenceP95,18);
  assert.equal(row.handIntervalP95,40);
  assert.equal(row.trackedPercent,75);
});
