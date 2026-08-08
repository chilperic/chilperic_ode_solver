'use strict';

const assert = require('assert/strict');
const { boundedPopoverGeometry } = require('../../src/v76/app-shell.js');

const cases = [
  {
    label: 'right-edge profile menu',
    input: [1220, 430, 1280],
    expected: { width: 430, left: 838 }
  },
  {
    label: 'right-edge analysis menu',
    input: [820, 620, 1280],
    expected: { width: 620, left: 648 }
  },
  {
    label: 'phone viewport clamps a wide menu',
    input: [250, 620, 390],
    expected: { width: 366, left: 12 }
  },
  {
    label: 'left-edge trigger retains the safe gutter',
    input: [-40, 430, 1280],
    expected: { width: 430, left: 12 }
  }
];

for (const testCase of cases) {
  const actual = boundedPopoverGeometry(...testCase.input);
  assert.deepEqual(actual, testCase.expected, testCase.label);
  const viewport = testCase.input[2];
  assert.ok(actual.left >= 12, `${testCase.label}: left gutter`);
  assert.ok(actual.left + actual.width <= viewport - 12, `${testCase.label}: right gutter`);
}

console.log(`${cases.length}/${cases.length} bounded popover geometry checks passed`);
