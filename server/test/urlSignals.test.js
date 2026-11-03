import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeUrlHeuristics } from '../src/urlSignals.js';
test('brand boundary distinguishes subdomains from lookalikes', () => {
  assert.equal(analyzeUrlHeuristics('https://www.facebook.com/').score, 0);
  assert.ok(analyzeUrlHeuristics('https://evilfacebook.com/').reasons.some(x => x.includes('brand-like')));
  assert.ok(analyzeUrlHeuristics('https://facebook.com.evil.example/').reasons.some(x => x.includes('brand-like')));
});
test('embedded credentials remain a visible risk signal', () => {
  assert.ok(analyzeUrlHeuristics('https://facebook.com@evil.example/').reasons.some(x => x.includes('embedded credentials')));
});
