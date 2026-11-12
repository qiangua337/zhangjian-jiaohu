import test from 'node:test';
import assert from 'node:assert/strict';
import { POSTER_SIZE, posterImageBox, posterSourceBox } from '../src/art-poster.js';

test('the poster fits and centers the whole source at landscape and phone aspect ratios', () => {
  for (const [width, height] of [[1920, 1080], [390, 844], [844, 390], [1200, 1200]]) {
    const rect = posterImageBox(width, height);
    assert.ok(rect.x >= 66);
    assert.ok(rect.y >= 252);
    assert.ok(rect.x + rect.width <= POSTER_SIZE.width - 66);
    assert.ok(rect.y + rect.height <= POSTER_SIZE.height - 348);
    assert.ok(Math.abs(rect.width - rect.height * width / height) < 2);
    assert.ok(Math.abs(rect.x * 2 + rect.width - POSTER_SIZE.width) <= 1);
    assert.ok(Math.abs(rect.y * 2 + rect.height - 1504) <= 1);
  }
});

test('a poster with local photos keeps the full source, while a stage crop is bounded at device pixel density', () => {
  assert.deepEqual(posterSourceBox(780, 1688, null), { x: 0, y: 0, width: 780, height: 1688 });
  assert.deepEqual(
    posterSourceBox(780, 1688, { left: -.03, top: .125, right: 1.02, bottom: .625 }),
    { x: 0, y: 211, width: 780, height: 844 }
  );
});
