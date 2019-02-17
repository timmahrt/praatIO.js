import { toBeDeepCloseTo } from 'jest-matcher-deep-close-to';

import {
  Textgrid, IntervalTier, PointTier,
  // functions that modify
  appendTextgrid, appendTier,
  cropTextgrid, cropTier,
  editTextgridTimestamps, editTierTimestamps,
  eraseRegionFromTextgrid, eraseRegionFromTier,
  insertSpaceIntoTextgrid,
  mergeTextgridTiers,
  takeTierUnion, takeIntervalTierDifference, takeIntervalTierIntersection,
  // functions that compare
  compareTextgrids,
  // utils
  sortCompareEntriesByTime
} from '../../../lib';

import {
  getIntervalTier1, getPointTier1,
  getPrefabTextgrid, testTier
} from './factory.js';

expect.extend({ toBeDeepCloseTo });

test('appendTextgrid can append one textgrid to another', () => {
  let tgA = new Textgrid();
  let intervalList1a = [[0.8, 1.2, 'blue'], [2.3, 2.56, 'skies']];
  let pointList1a = [[0.91, 'point 1'], [2.41, 'point 2']];
  let intervalList2a = [[1.8, 2.4, 'grip'], [2.9, 3.1, 'cheese']];
  tgA.addTier(new IntervalTier('speaker 1', intervalList1a));
  tgA.addTier(new PointTier('points 1', pointList1a));
  tgA.addTier(new IntervalTier('speaker 2', intervalList2a));

  let tgB = new Textgrid();
  let intervalList1b = [[0.31, 0.52, 'green'], [1.24, 1.91, 'fields']];
  let pointList1b = [[0.5, 'point 1'], [1.44, 'point 2']];
  tgB.addTier(new IntervalTier('speaker 1', intervalList1b));
  tgB.addTier(new PointTier('points 1', pointList1b));

  let combinedTg = appendTextgrid(tgA, tgB, false);
  let adjustVal = 3.1;

  expect(combinedTg.tierNameList.length).toEqual(3);

  let combinedIntervals = intervalList1a.concat(intervalList1b.map(entry => [entry[0] + adjustVal, entry[1] + adjustVal, entry[2]]));
  expect(combinedTg.tierDict['speaker 1'].entryList).toBeDeepCloseTo(combinedIntervals);

  let combinedPoints = pointList1a.concat(pointList1b.map(entry => [entry[0] + adjustVal, entry[1]]));
  expect(combinedTg.tierDict['points 1'].entryList).toBeDeepCloseTo(combinedPoints);

  expect(combinedTg.tierDict['speaker 2'].entryList).toEqual(intervalList2a);
});

test('appendTextgrid can append one textgrid to another (inverted append order)', () => {
  let tgA = new Textgrid();
  let intervalList1a = [[0.8, 1.2, 'blue'], [2.3, 2.56, 'skies']];
  let pointList1a = [[0.91, 'point 1'], [2.41, 'point 2']];
  let intervalList2a = [[1.8, 2.4, 'grip'], [2.9, 3.1, 'cheese']];
  tgA.addTier(new IntervalTier('speaker 1', intervalList1a));
  tgA.addTier(new PointTier('points 1', pointList1a));
  tgA.addTier(new IntervalTier('speaker 2', intervalList2a));

  let tgB = new Textgrid();
  let intervalList1b = [[0.31, 0.52, 'green'], [1.24, 1.91, 'fields']];
  let pointList1b = [[0.5, 'point 1'], [1.44, 'point 2']];
  tgB.addTier(new IntervalTier('speaker 1', intervalList1b));
  tgB.addTier(new PointTier('points 1', pointList1b));

  let combinedTg = appendTextgrid(tgB, tgA, false);
  let adjustVal = 1.91;

  expect(combinedTg.tierNameList.length).toEqual(3);

  let combinedIntervals = intervalList1b.concat(intervalList1a.map(entry => [entry[0] + adjustVal, entry[1] + adjustVal, entry[2]]));
  expect(combinedTg.tierDict['speaker 1'].entryList).toBeDeepCloseTo(combinedIntervals);

  let combinedPoints = pointList1b.concat(pointList1a.map(entry => [entry[0] + adjustVal, entry[1]]));
  expect(combinedTg.tierDict['points 1'].entryList).toBeDeepCloseTo(combinedPoints);

  let appendedIntervalList2a = intervalList2a.map(entry => [entry[0] + adjustVal, entry[1] + adjustVal, entry[2]]);
  expect(combinedTg.tierDict['speaker 2'].entryList).toEqual(appendedIntervalList2a);
});

test('appendTextgrid will only append matching names if asked', () => {
  let tgA = new Textgrid();
  let intervalList1a = [[0.8, 1.2, 'blue'], [2.3, 2.56, 'skies']];
  let pointList1a = [[0.91, 'point 1'], [2.41, 'point 2']];
  let intervalList2a = [[1.8, 2.4, 'grip'], [2.9, 3.1, 'cheese']];
  tgA.addTier(new IntervalTier('speaker 1', intervalList1a));
  tgA.addTier(new PointTier('points 1', pointList1a));
  tgA.addTier(new IntervalTier('speaker 2', intervalList2a));

  let tgB = new Textgrid();
  let intervalList1b = [[0.31, 0.52, 'green'], [1.24, 1.91, 'fields']];
  let pointList1b = [[0.5, 'point 1'], [1.44, 'point 2']];
  let pointList2b = [[2.1, 'point 3'], [2.33, 'point 4']];
  tgB.addTier(new IntervalTier('speaker 1', intervalList1b));
  tgB.addTier(new PointTier('points 1', pointList1b));
  tgB.addTier(new PointTier('points 2', pointList2b));

  let combinedTg = appendTextgrid(tgA, tgB, true);
  let adjustVal = 3.1;

  expect(combinedTg.tierNameList.length).toEqual(2);

  let combinedIntervals = intervalList1a.concat(intervalList1b.map(entry => [entry[0] + adjustVal, entry[1] + adjustVal, entry[2]]));
  expect(combinedTg.tierDict['speaker 1'].entryList).toBeDeepCloseTo(combinedIntervals);

  let combinedPoints = pointList1a.concat(pointList1b.map(entry => [entry[0] + adjustVal, entry[1]]));
  expect(combinedTg.tierDict['points 1'].entryList).toBeDeepCloseTo(combinedPoints);
});

test('can append one interval tier to another', () => {
  let intervals1 = [
    [0.73, 1.02, 'Ichiro'],
    [1.02, 1.231, 'hit'],
    [1.33, 1.54, 'a'],
    [1.54, 1.91, 'homerun']
  ];
  let intervalTier1 = new IntervalTier('speaker 1', intervals1);

  let intervals2 = [
    [0.50, 0.63, 'and'],
    [0.63, 1.01, 'Fred'],
    [1.01, 1.33, 'caught'],
    [1.33, 1.56, 'it']
  ];
  let intervalTier2 = new IntervalTier('speaker 2', intervals2);

  expect(intervalTier1.entryList.length).toEqual(4);
  expect(intervalTier1.maxTimestamp).toEqual(1.91);
  expect(intervalTier2.entryList.length).toEqual(4);
  expect(intervalTier2.maxTimestamp).toEqual(1.56);

  let superIntervalTier = appendTier(intervalTier1, intervalTier2);
  expect(superIntervalTier.entryList.length).toEqual(8);
  expect(superIntervalTier.maxTimestamp).toBeCloseTo(1.91 + 1.56);
})

test('can append one point tier to another', () => {
  let points1 = [
    [0.73, 'Ichiro'],
    [1.02, 'hit'],
    [1.33, 'a'],
    [1.54, 'homerun']
  ];
  let pointTier1 = new PointTier('speaker 1', points1);

  let points2 = [
    [0.50, 'and'],
    [0.63, 'Fred'],
    [1.01, 'caught'],
    [1.33, 'it']
  ];
  let pointTier2 = new PointTier('speaker 2', points2);

  expect(pointTier1.entryList.length).toEqual(4);
  expect(pointTier1.maxTimestamp).toEqual(1.54);
  expect(pointTier2.entryList.length).toEqual(4);
  expect(pointTier2.maxTimestamp).toEqual(1.33);

  let superPointTier = appendTier(pointTier1, pointTier2);
  expect(superPointTier.entryList.length).toEqual(8);
  expect(superPointTier.maxTimestamp).toBeCloseTo(1.54 + 1.33);
})

test('cannot append a point tier and interval tier', () => {
  let intervalTier = new IntervalTier('speaker 1', [], 0, 100);
  let pointTier = new PointTier('pitch vals 1', [], 0, 100);

  expect(() => {
    appendTier(intervalTier, pointTier); // eslint-disable-line no-new
  }).toThrowError('Tier types must match when appending tiers.');

  expect(() => {
    appendTier(pointTier, intervalTier); // eslint-disable-line no-new
  }).toThrowError('Tier types must match when appending tiers.');
})

test('cropTextgrid() rebaseToZero sets the the min time to zero', () => {
  let tg = getPrefabTextgrid();

  let oldStart = 0.73;
  let oldStop = 4.53;

  let newStart = 1.1;
  let newStop = 1.5;

  expect(tg.minTimestamp).toEqual(oldStart);
  expect(tg.maxTimestamp).toEqual(oldStop);

  let newTg = cropTextgrid(tg, 1.1, 1.5, 'strict', true);

  expect(newTg.minTimestamp).toEqual(0);
  expect(newTg.maxTimestamp).toBeCloseTo(newStop - newStart);
})

test('cropTier() rebaseToZero sets the the min time to zero for point tiers', () => {
  let pointTier = getPointTier1();
  let origEntryList = pointTier.entryList.map(entry => entry.slice());

  let oldStart = 0.9;
  let oldStop = 1.79;

  // This is actually expanding the tier, not cropping it
  let newStart = 0.8;
  let newStop = 2.0;

  expect(pointTier.entryList.length).toEqual(4);
  expect(origEntryList).toEqual(pointTier.entryList);
  expect(pointTier.minTimestamp).toEqual(oldStart);
  expect(pointTier.maxTimestamp).toEqual(oldStop);

  let croppedTier = cropTier(pointTier, newStart, newStop, '', true)
  let newEntryList = [
    [0.10, '120'],
    [0.31, '100'],
    [0.61, '110'],
    [0.99, '95']
  ];

  expect(croppedTier.entryList.length).toEqual(4);
  for (let i = 0; i < newEntryList.length; i++) {
    expect(croppedTier.entryList[i][0]).toBeCloseTo(newEntryList[i][0]);
    expect(croppedTier.entryList[i][1]).toEqual(newEntryList[i][1]);
  }
  expect(croppedTier.minTimestamp).toEqual(0);
  expect(croppedTier.maxTimestamp).toBeCloseTo(newStop - newStart);
})

test('cropTier() rebaseToZero sets the the min time to zero for interval tiers', () => {
  let intervalTier = getIntervalTier1();
  let origEntryList = intervalTier.entryList.map(entry => entry.slice());

  let oldStart = 0.73;
  let oldStop = 1.91;

  // This is actually expanding the tier, not cropping it
  let newStart = 0.6;
  let newStop = 2.0;

  expect(intervalTier.entryList.length).toEqual(4);
  expect(origEntryList).toEqual(intervalTier.entryList);
  expect(intervalTier.minTimestamp).toEqual(oldStart);
  expect(intervalTier.maxTimestamp).toEqual(oldStop);

  let croppedTier = cropTier(intervalTier, newStart, newStop, '', true)
  let newEntryList = [
    [0.13, 0.42, 'Ichiro'],
    [0.42, 0.631, 'hit'],
    [0.73, 0.94, 'a'],
    [0.94, 1.31, 'homerun']
  ];

  testTier(croppedTier, 0, newStop - newStart, newEntryList);
})

test('cropTier() strict mode only keeps entries in the crop region for interval tiers', () => {
  let intervals = [
    [0.73, 1.02, 'Ichiro'],
    [1.02, 1.231, 'hit'],
    [1.33, 1.44, 'a'],
    [1.44, 1.54, 'great'],
    [1.54, 1.91, 'homerun']
  ];
  let intervalTier = new IntervalTier('speaker 1', intervals);
  let origEntryList = intervalTier.entryList.map(entry => entry.slice());

  let oldStart = 0.73;
  let oldStop = 1.91;

  let newStart = 0.8;
  let newStop = 1.6;

  expect(intervalTier.entryList.length).toEqual(5);
  expect(origEntryList).toEqual(intervalTier.entryList);
  expect(intervalTier.minTimestamp).toEqual(oldStart);
  expect(intervalTier.maxTimestamp).toEqual(oldStop);

  let croppedTier = cropTier(intervalTier, newStart, newStop, 'strict', false)
  let newEntryList = [
    [1.02, 1.231, 'hit'],
    [1.33, 1.44, 'a'],
    [1.44, 1.54, 'great']
  ];

  testTier(croppedTier, newStart, newStop, newEntryList);
})

test('cropTier() lax mode keeps entries that are spanning the crop boundaries for interval tiers', () => {
  let intervals = [
    [0.73, 1.02, 'Ichiro'],
    [1.02, 1.231, 'hit'],
    [1.33, 1.44, 'a'],
    [1.44, 1.54, 'great'],
    [1.54, 1.91, 'homerun']
  ];
  let intervalTier = new IntervalTier('speaker 1', intervals);

  let oldStart = 0.73;
  let oldStop = 1.91;

  let newStart = 1.1;
  let newStop = 1.5;

  expect(intervalTier.entryList.length).toEqual(5);
  expect(intervalTier.minTimestamp).toEqual(oldStart);
  expect(intervalTier.maxTimestamp).toEqual(oldStop);

  let croppedTier = cropTier(intervalTier, newStart, newStop, 'lax', false)
  let newEntryList = [
    [1.02, 1.231, 'hit'],
    [1.33, 1.44, 'a'],
    [1.44, 1.54, 'great']
  ];

  // min and max here are determined by the values in the entry
  // list in this case, since they are more extreme than the crop
  // region boundaries (due to how 'lax' works)
  testTier(croppedTier, 1.02, 1.54, newEntryList);
})

test('cropTier() truncated mode cuts partially contained intervals', () => {
  let intervals = [
    [0.73, 1.02, 'Ichiro'],
    [1.02, 1.231, 'hit'],
    [1.33, 1.44, 'a'],
    [1.44, 1.54, 'great'],
    [1.54, 1.91, 'homerun']
  ];
  let intervalTier = new IntervalTier('speaker 1', intervals);

  let oldStart = 0.73;
  let oldStop = 1.91;

  let newStart = 1.1;
  let newStop = 1.5;

  expect(intervalTier.entryList.length).toEqual(5);
  expect(intervalTier.minTimestamp).toEqual(oldStart);
  expect(intervalTier.maxTimestamp).toEqual(oldStop);

  let croppedTier = cropTier(intervalTier, newStart, newStop, 'truncated', false)
  let newEntryList = [
    [1.1, 1.231, 'hit'],
    [1.33, 1.44, 'a'],
    [1.44, 1.5, 'great']
  ];

  testTier(croppedTier, newStart, newStop, newEntryList);
})

test('editTextgridTimestamps() shifts all times in a textgrid', () => {
  let tg = getPrefabTextgrid();
  let adjustAmount = 1.3;
  let editedTg = editTextgridTimestamps(tg, adjustAmount, true);

  let speaker1Edited = tg.tierDict['speaker 1'].entryList.map(entry => [entry[0] + adjustAmount, entry[1] + adjustAmount, entry[2]]);
  expect(editedTg.tierDict['speaker 1'].entryList).toBeDeepCloseTo(speaker1Edited);

  let pitchVals2Edited = tg.tierDict['pitch vals 2'].entryList.map(entry => [entry[0] + adjustAmount, entry[1]]);
  expect(editedTg.tierDict['pitch vals 2'].entryList).toBeDeepCloseTo(pitchVals2Edited);

  expect(editedTg.minTimestamp).toBe(tg.minTimestamp);
  expect(editedTg.maxTimestamp).toBe(tg.maxTimestamp + adjustAmount);
})

test('editTierTimestamps() throws error on overshoot with flag for point tiers', () => {
  let tier = getPointTier1();

  expect(() => {
    editTierTimestamps(tier, 100.0, false);
  }).toThrowError("Attempted to change [0.9,120] to [100.9,120] in tier 'pitch vals 1' however, this exceeds the bounds (0.9,1.79).");
})

test('editTierTimestamps() throws error on overshoot with flag for interval tiers', () => {
  let tier = getIntervalTier1();

  expect(() => {
    editTierTimestamps(tier, 100.0, false);
  }).toThrowError("Attempted to change [0.73,1.02,Ichiro] to [100.73,101.02,Ichiro] in tier 'speaker 1' however, this exceeds the bounds (0.73,1.91).");
})

test('eraseRegionFromTextgrid works', () => {
  let tg = getPrefabTextgrid();
  let newTg = eraseRegionFromTextgrid(tg, 1.11, 4.3, false);

  let speaker1Tier = newTg.tierDict['speaker 1'];
  let speaker2Tier = newTg.tierDict['speaker 2'];
  let pitchTier = newTg.tierDict['pitch vals 1'];

  expect(speaker1Tier.entryList).toEqual([[0.73, 1.02, 'Ichiro'], [1.02, 1.11, 'hit']]);
  expect(speaker2Tier.entryList).toEqual([[4.3, 4.44, 'caught'], [4.44, 4.53, 'it']]);
  expect(pitchTier.entryList).toEqual([[0.9, '120'], [1.11, '100']]);

  expect(newTg.minTimestamp).toEqual(tg.minTimestamp);
  expect(newTg.maxTimestamp).toEqual(newTg.maxTimestamp);
})

test('eraseRegionFromTextgrid works with doShrink=true', () => {
  let tg = getPrefabTextgrid();
  let newTg = eraseRegionFromTextgrid(tg, 1.11, 4.3, true);

  let speaker1Tier = newTg.tierDict['speaker 1'];
  let speaker2Tier = newTg.tierDict['speaker 2'];
  let pitchTier = newTg.tierDict['pitch vals 1'];

  expect(speaker1Tier.entryList).toBeDeepCloseTo([[0.73, 1.02, 'Ichiro'], [1.02, 1.11, 'hit']]);
  expect(speaker2Tier.entryList).toBeDeepCloseTo([[1.11, 1.25, 'caught'], [1.25, 1.34, 'it']]);
  expect(pitchTier.entryList).toBeDeepCloseTo([[0.9, '120'], [1.11, '100']]);

  expect(newTg.minTimestamp).toEqual(tg.minTimestamp);
  expect(newTg.maxTimestamp).toBeCloseTo(tg.maxTimestamp - (4.3 - 1.11));
})

test('Can delete the start of a textgrid with eraseRegionFromTextgrid', () => {
  let tg = getPrefabTextgrid();
  let newTg = eraseRegionFromTextgrid(tg, 0.0, 1.5, false);

  let speaker1Tier = newTg.tierDict['speaker 1'];
  let speaker2Tier = newTg.tierDict['speaker 2'];
  let pitchTier = newTg.tierDict['pitch vals 1'];

  expect(speaker1Tier.entryList).toEqual([[1.5, 1.54, 'a'], [1.54, 1.91, 'homerun']]);
  expect(speaker2Tier.entryList).toEqual([[3.56, 3.98, 'and'], [3.98, 4.21, 'Fred'], [4.21, 4.44, 'caught'], [4.44, 4.53, 'it']]);
  expect(pitchTier.entryList).toEqual([[1.79, '95']]);
})

test('Can delete the start of a textgrid with eraseRegionFromTextgrid; doShrink=true', () => {
  let tg = getPrefabTextgrid();
  let newTg = eraseRegionFromTextgrid(tg, 0.0, 1.5, true);

  let speaker1Tier = newTg.tierDict['speaker 1'];
  let speaker2Tier = newTg.tierDict['speaker 2'];
  let pitchTier = newTg.tierDict['pitch vals 1'];

  expect(speaker1Tier.entryList).toBeDeepCloseTo([[0, 0.04, 'a'], [0.04, 0.41, 'homerun']]);
  expect(speaker2Tier.entryList).toBeDeepCloseTo([[2.06, 2.48, 'and'], [2.48, 2.71, 'Fred'], [2.71, 2.94, 'caught'], [2.94, 3.03, 'it']]);
  expect(pitchTier.entryList).toBeDeepCloseTo([[0.29, '95']]);
})

test('Can delete the end of a textgrid with eraseRegionFromTextgrid', () => {
  let tg = getPrefabTextgrid();
  let newTg = eraseRegionFromTextgrid(tg, 1.33, tg.maxTimestamp, false);

  let speaker1Tier = newTg.tierDict['speaker 1'];
  let speaker2Tier = newTg.tierDict['speaker 2'];
  let pitchTier = newTg.tierDict['pitch vals 1'];

  expect(speaker1Tier.entryList).toEqual([[0.73, 1.02, 'Ichiro'], [1.02, 1.231, 'hit']]);
  expect(speaker2Tier.entryList).toEqual([]);
  expect(pitchTier.entryList).toEqual([[0.9, '120'], [1.11, '100']]);
})

test('Deleting the end of a textgrid with eraseRegionFromTextgrid, there is no differences in entryLists if doShrink is false or true', () => {
  let tg = getPrefabTextgrid();
  let newTg1 = eraseRegionFromTextgrid(tg, 1.33, tg.maxTimestamp, true);
  let newTg2 = eraseRegionFromTextgrid(tg, 1.33, tg.maxTimestamp, false);

  expect(newTg1.entryList).toEqual(newTg2.entryList);
})

test('The wrong collision code with eraseRegionFromTier throws an error', () => {
  let tier = getIntervalTier1();
  expect(() => {
    eraseRegionFromTier(tier, 0, 1, true, null); // eslint-disable-line no-new
  }).toThrowError("Expected value 'null' to be one value in [strict,truncated].");
})

test('Can insertSpaceIntoTextgrid into the middle of a textgrid', () => {
  let tg = getPrefabTextgrid();
  let newTg = insertSpaceIntoTextgrid(tg, 2.0, 1.0, 'stretch');

  let oldSpeaker1Tier = tg.tierDict['speaker 1'];
  let oldSpeaker2Tier = tg.tierDict['speaker 2'];
  let oldPitchTier = tg.tierDict['pitch vals 1'];

  let speaker1Tier = newTg.tierDict['speaker 1'];
  let speaker2Tier = newTg.tierDict['speaker 2'];
  let pitchTier = newTg.tierDict['pitch vals 1'];

  expect(speaker1Tier.entryList).toEqual(oldSpeaker1Tier.entryList);
  expect(speaker2Tier.entryList).not.toEqual(oldSpeaker2Tier.entryList);
  expect(pitchTier.entryList).toEqual(oldPitchTier.entryList);

  expect(speaker2Tier.entryList).toBeDeepCloseTo([[4.56, 4.98, 'and'], [4.98, 5.21, 'Fred'], [5.21, 5.44, 'caught'], [5.44, 5.53, 'it']]);

  expect(newTg.maxTimestamp).toEqual(5.53);
})

test('Can insertSpaceIntoTextgrid into the start of a textgrid', () => {
  let tg = getPrefabTextgrid();
  let newTg = insertSpaceIntoTextgrid(tg, 0.0, 0.5, 'stretch');

  let speaker1Tier = newTg.tierDict['speaker 1'];
  let speaker2Tier = newTg.tierDict['speaker 2'];
  let pitchTier = newTg.tierDict['pitch vals 1'];

  expect(speaker1Tier.entryList).toBeDeepCloseTo([[1.23, 1.52, 'Ichiro'], [1.52, 1.731, 'hit'], [1.83, 2.04, 'a'], [2.04, 2.41, 'homerun']]);
  expect(speaker2Tier.entryList).toBeDeepCloseTo([[4.06, 4.48, 'and'], [4.48, 4.71, 'Fred'], [4.71, 4.94, 'caught'], [4.94, 5.03, 'it']]);
  expect(pitchTier.entryList).toBeDeepCloseTo([[1.4, '120'], [1.61, '100'], [1.91, '110'], [2.29, '95']])

  expect(newTg.maxTimestamp).toEqual(5.03);
})

test('Can insertSpaceIntoTextgrid into the end of a textgrid', () => {
  let tg = getPrefabTextgrid();
  let newTg = insertSpaceIntoTextgrid(tg, tg.maxTimestamp, 1.0, 'stretch');

  let oldSpeaker1Tier = tg.tierDict['speaker 1'];
  let oldSpeaker2Tier = tg.tierDict['speaker 2'];
  let oldPitchTier = tg.tierDict['pitch vals 1'];

  let speaker1Tier = newTg.tierDict['speaker 1'];
  let speaker2Tier = newTg.tierDict['speaker 2'];
  let pitchTier = newTg.tierDict['pitch vals 1'];

  expect(speaker1Tier.entryList).toEqual(oldSpeaker1Tier.entryList);
  expect(speaker2Tier.entryList).toEqual(oldSpeaker2Tier.entryList);
  expect(pitchTier.entryList).toEqual(oldPitchTier.entryList);

  expect(newTg.maxTimestamp).toEqual(5.53);
})

test('insertSpaceIntoTextgrid, with collisionCode="stretch", stretches intervals', () => {
  let tg = getPrefabTextgrid();
  let newTg = insertSpaceIntoTextgrid(tg, 1.5, 1.0, 'stretch');

  let speaker1Tier = newTg.tierDict['speaker 1'];

  // interval with label 'a' gets lengthened; intervals before are unaffected; intervals after are pushed 1 second later
  expect(speaker1Tier.entryList).toBeDeepCloseTo([[0.73, 1.02, 'Ichiro'], [1.02, 1.231, 'hit'], [1.33, 2.54, 'a'], [2.54, 2.91, 'homerun']]);

  expect(newTg.maxTimestamp).toEqual(5.53);
})

test('insertSpaceIntoTextgrid, with collisionCode="split", splits conflicting intervals in 2 pieces', () => {
  let tg = getPrefabTextgrid();
  let newTg = insertSpaceIntoTextgrid(tg, 1.5, 1.0, 'split');

  let speaker1Tier = newTg.tierDict['speaker 1'];

  // interval with label 'a' gets lengthened; intervals before are unaffected; intervals after are pushed 1 second later
  expect(speaker1Tier.entryList).toBeDeepCloseTo([[0.73, 1.02, 'Ichiro'], [1.02, 1.231, 'hit'], [1.33, 1.5, 'a'], [2.5, 2.54, 'a'], [2.54, 2.91, 'homerun']]);

  expect(newTg.maxTimestamp).toEqual(5.53);
})

test('insertSpaceIntoTextgrid, with collisionCode="no change", does not affect conflicting intervals', () => {
  let tg = getPrefabTextgrid();

  // newTg1 inserts a space half-way through an entry list while
  // newTg2 does not.  Since they don't modify values on collision,
  // the behaviour of the two insertions is the same.
  // In both cases, only intervals that start after the insertion point
  // are affected.
  let newTg1 = insertSpaceIntoTextgrid(tg, 1.5, 1.0, 'no change');
  let newTg2 = insertSpaceIntoTextgrid(tg, 1.54, 1.0, 'no change');

  expect(compareTextgrids(newTg1, newTg2)).toEqual(true);
})

test('mergeTextgridTiers works', () => {
  let tg = getPrefabTextgrid();
  let mergedTg = mergeTextgridTiers(tg);

  let allIntervalsList = tg.tierDict['speaker 1'].entryList;
  allIntervalsList = allIntervalsList.concat(tg.tierDict['speaker 2'].entryList);

  let allPointsList = tg.tierDict['pitch vals 1'].entryList;
  allPointsList = allPointsList.concat(tg.tierDict['pitch vals 2'].entryList);
  allPointsList = allPointsList.concat(tg.tierDict['noises'].entryList);
  allPointsList.sort(sortCompareEntriesByTime);

  expect(mergedTg.tierNameList.length).toEqual(2);
  expect(mergedTg.tierDict['merged intervals'].entryList).toBeDeepCloseTo(allIntervalsList);
  expect(mergedTg.tierDict['merged points'].entryList).toBeDeepCloseTo(allPointsList);
})

test('mergeTextgridTiers, can choose which tiers to merge', () => {
  let tg = getPrefabTextgrid();
  let tierNameList = [0, 1, 2, 3].map(num => tg.tierNameList[num]);
  let mergedTg = mergeTextgridTiers(tg, tierNameList, true);

  let allIntervalsList = tg.tierDict['speaker 1'].entryList;
  allIntervalsList = allIntervalsList.concat(tg.tierDict['speaker 2'].entryList);

  let allPointsList = tg.tierDict['pitch vals 1'].entryList;
  allPointsList = allPointsList.concat(tg.tierDict['pitch vals 2'].entryList);

  expect(mergedTg.tierNameList.length).toEqual(3);
  expect(mergedTg.tierDict['merged intervals'].entryList).toBeDeepCloseTo(allIntervalsList);
  expect(mergedTg.tierDict['merged points'].entryList).toBeDeepCloseTo(allPointsList);
  expect(mergedTg.tierDict['noises'].entryList).toEqual(tg.tierDict['noises'].entryList);
})

test('takeTierUnion() merges one tier into another', () => {
  let tg = getPrefabTextgrid();
  let tier1 = tg.tierDict['speaker 1'];
  let tier2 = tg.tierDict['speaker 2'];

  expect(tier1.entryList.length).toEqual(4);
  expect(tier2.entryList.length).toEqual(4);

  // tier1 and tier2 don't overlap in time
  let tier12 = takeTierUnion(tier1, tier2);
  expect(tier12.entryList.length).toEqual(8);
  expect(tier12.entryList).toEqual(tier1.entryList.concat(tier2.entryList));

  // tier1 and tier3 partially overlap in time
  // merging them will cause 2 of tier1's entries to get merged
  let tier3 = new IntervalTier('blah blah', [[0.73, 1.231, 'coffee']])
  let tier13 = takeTierUnion(tier1, tier3);
  expect(tier13.entryList.length).toEqual(3);
})

test('takeIntervalTierDifference takes the set difference with another tier', () => {
  let entryListA = [[0.5, 1.0, '1a'], [1.23, 1.44, '2a'], [1.95, 2.05, '3a']];
  let entryListB = [[0.1, 0.7, '1b'], [1.3, 1.35, '2b'], [1.5, 1.8, '3b'], [2.00, 2.43, '4b']];
  let tierA = new IntervalTier('TierA', entryListA);
  let tierB = new IntervalTier('TierB', entryListB);
  let differenceTier = takeIntervalTierDifference(tierA, tierB);

  // Only overlapping entries are kept; partially overlapping entries will
  // only include the overlapping portion
  let differenceEntryList = [[0.7, 1.0, '1a'], [1.23, 1.3, '2a'], [1.35, 1.44, '2a'], [1.95, 2.00, '3a']];
  expect(differenceTier.name).toEqual('TierA');
  expect(differenceTier.entryList).toBeDeepCloseTo(differenceEntryList);
})

test('takeIntervalTierIntersection does the set intersection of the two tiers', () => {
  let entryListA = [[0.5, 1.0, '1a'], [1.23, 1.44, '2a'], [1.95, 2.05, '3a']];
  let entryListB = [[0.1, 0.4, '1b'], [1.23, 1.44, '2b'], [1.5, 1.8, '3b'], [2.00, 2.43, '4b']];
  let tier1 = new IntervalTier('TierA', entryListA);
  let tier2 = new IntervalTier('TierB', entryListB);
  let intersectTier = takeIntervalTierIntersection(tier1, tier2);

  // Only overlapping entries are kept; partially overlapping entries will
  // only include the overlapping portion
  let intersectionEntryList = [[1.23, 1.44, '2a-2b'], [2.00, 2.05, '3a-4b']];
  expect(intersectTier.name).toEqual('TierA-TierB');
  expect(intersectTier.entryList).toBeDeepCloseTo(intersectionEntryList);
})
