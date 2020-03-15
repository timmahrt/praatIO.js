import { toBeDeepCloseTo } from 'jest-matcher-deep-close-to';

import {
  IntervalTier, PointTier,
  // functions that compare
  compareTextgrids, compareTiers,
  // deep copy functions
  copyTextgrid, copyTier,
  // query functions
  getValuesAtPoints, getValuesInIntervals, getEntriesInInterval,
  getNonEntriesFromIntervalTier, findLabelInTier
} from '../../../lib';

import {
  getIntervalTier1, getIntervalTier2, getPointTier1, getPrefabTextgrid
} from './factory.js';

expect.extend({ toBeDeepCloseTo });

test('can build PointTiers', () => {
  const name = 'pitch values';
  const points = [
    [1.5, '93'],
    [2.5, '100'],
    [3.5, '75']
  ];
  const tier = new PointTier(name, points);

  expect(tier.name).toEqual(name);
  expect(tier.minTimestamp).toEqual(1.5);
  expect(tier.maxTimestamp).toEqual(3.5);
  expect(tier.entryList.length).toEqual(3);

  for (let i = 0; i < tier.entryList.length; i++) {
    expect(tier.entryList[i]).toEqual(points[i]);
  }
});

test('by default, the min and max timestamps come from the entry list', () => {
  const userEntryList = [[0.4, 0.6, 'A'], [0.8, 1.0, 'E'], [1.2, 1.3, 'I']];
  const tier = new IntervalTier('test', userEntryList)

  expect(tier.minTimestamp).toEqual(0.4);
  expect(tier.maxTimestamp).toEqual(1.3);
});

test('user can override the default min and max timestamps', () => {
  const userEntryList = [[0.4, 0.6, 'A'], [0.8, 1.0, 'E'], [1.2, 1.3, 'I']];
  const tier = new IntervalTier('test', userEntryList, 0.0, 2.0);

  expect(tier.minTimestamp).toEqual(0.0);
  expect(tier.maxTimestamp).toEqual(2.0);
});

test('user specified min/max values are ignored if greater/less than the min/max timestamps in the entry list', () => {
  const userEntryList = [[0.4, 0.6, 'A'], [0.8, 1.0, 'E'], [1.2, 1.3, 'I']];
  const tier = new IntervalTier('test', userEntryList, 0.9, 1.1);

  expect(tier.minTimestamp).toEqual(0.4);
  expect(tier.maxTimestamp).toEqual(1.3);
});

test('can build IntervalTiers', () => {
  const name = 'words';
  const intervals = [
    [0.73, 1.02, 'John'],
    [1.02, 1.231, 'ate'],
    [1.33, 1.54, 'the'],
    [1.54, 1.71, 'pie']
  ];
  const tier = new IntervalTier(name, intervals);

  expect(tier.name).toEqual(name);
  expect(tier.minTimestamp).toEqual(0.73);
  expect(tier.maxTimestamp).toEqual(1.71);
  expect(tier.entryList.length).toEqual(4);

  for (let i = 0; i < tier.entryList.length; i++) {
    expect(tier.entryList[i]).toEqual(intervals[i]);
  }
});

test('PointTiers and IntervalTiers must have a min and max timestamp', () => {
  expect(() => {
    new IntervalTier('no intervals', []); // eslint-disable-line no-new
  }).toThrowError("Couldn't create tier: All textgrid tiers must have a min and max timestamp");

  expect(() => {
    new PointTier('no points', []); // eslint-disable-line no-new
  }).toThrowError("Couldn't create tier: All textgrid tiers must have a min and max timestamp");
});

test('addTier adds a tier to a Textgrid', () => {
  const tg = getPrefabTextgrid();
  const origNumTiers = tg.tierNameList.length;
  const origTierNameList = tg.tierNameList.slice();
  const origMinTimestamp = tg.minTimestamp;
  const origMaxTimestamp = tg.maxTimestamp;

  const tierName = 'words';
  const tierMinTime = 1.2;
  const tierMaxTime = 3;

  // Ensure our times fit within the extremes used by the factory
  expect(tierMinTime).toBeGreaterThan(origMinTimestamp);
  expect(tierMaxTime).toBeLessThan(origMaxTimestamp);
  const tier = new IntervalTier(tierName, [], tierMinTime, tierMaxTime);

  tg.addTier(tier);

  expect(tg.tierNameList).toEqual(origTierNameList.concat([tierName]));
  expect(tg.minTimestamp).toEqual(origMinTimestamp);
  expect(tg.maxTimestamp).toEqual(origMaxTimestamp);

  expect(Object.keys(tg.tierDict).length).toEqual(origNumTiers + 1);
  expect(tg.tierDict[tierName].name).toEqual(tierName);
});

test('addTier overrides existing min/max time if less than/greater than existing times, respectively', () => {
  const tg = getPrefabTextgrid();
  const origNumTiers = tg.tierNameList.length;
  const origTierNameList = tg.tierNameList.slice();

  // Add second tier; override mintime and maxtime
  const tierName = 'editors notes'
  const tierMinTime = 0.1;
  const tierMaxTime = 150.3;
  const tier = new IntervalTier(tierName, [], tierMinTime, tierMaxTime);

  tg.addTier(tier);

  expect(tg.tierNameList).toEqual(origTierNameList.concat([tierName]));
  expect(tg.minTimestamp).toEqual(tierMinTime);
  expect(tg.maxTimestamp).toEqual(tierMaxTime);

  expect(Object.keys(tg.tierDict).length).toEqual(origNumTiers + 1);
  expect(tg.tierDict[tierName].name).toEqual(tierName);
});

test('tiers can be inserted into arbitrary positions', () => {
  const tg = getPrefabTextgrid();
  const origNumTiers = tg.tierNameList.length;
  const tierNameList = tg.tierNameList.slice();

  // Insert third tier between the two tiers; override mintime
  const tierName = 'speaker 3'
  const tierMinTime = 1.33;
  const tierMaxTime = 2.14;
  const tier = new PointTier(tierName, [], tierMinTime, tierMaxTime);
  const insertI = 1;

  tg.addTier(tier, insertI);
  tierNameList.splice(insertI, 0, tierName);

  expect(tg.tierNameList).toEqual(tierNameList);

  expect(Object.keys(tg.tierDict).length).toEqual(origNumTiers + 1);
  expect(tg.tierDict[tierName].name).toEqual(tierName);
});

test('addTier fails if a tier with the same name already exists in the textgrid', () => {
  const tg = getPrefabTextgrid();
  const tier = new IntervalTier('speaker 1', [], 0, 2);

  expect(() => {
    tg.addTier(tier);
  }).toThrowError('Tier name speaker 1 already exists in textgrid');
});

test('can rename tiers in a textgrid', () => {
  const tg = getPrefabTextgrid();
  const origName = 'speaker 1';
  const newName = 'Bob';
  expect(tg.tierNameList[0]).toEqual(origName);

  tg.renameTier(origName, newName);

  expect(tg.tierNameList[0]).toEqual(newName);
});

test('can delete tiers in a textgrid', () => {
  const tg = getPrefabTextgrid();
  const tierName = 'speaker 2';

  expect(tg.tierNameList.length).toEqual(5);
  expect(Object.keys(tg.tierDict).length).toEqual(5);
  expect(Object.keys(tg.tierDict)).toContain(tierName);

  tg.removeTier(tierName);

  expect(tg.tierNameList.length).toEqual(4);
  expect(Object.keys(tg.tierDict).length).toEqual(4);
  expect(Object.keys(tg.tierDict)).not.toContain(tierName);
});

test('can replace tiers in a textgrid', () => {
  const tg = getPrefabTextgrid();
  const newTierName = 'speaker 3';
  const oldTierName = 'speaker 1';

  expect(tg.tierNameList.length).toEqual(5);
  expect(Object.keys(tg.tierDict).length).toEqual(5);
  expect(Object.keys(tg.tierDict)).toContain(oldTierName);
  expect(Object.keys(tg.tierDict)).not.toContain(newTierName);

  const intervals = [
    [0.51, 0.80, 'Sarah'],
    [0.80, 1.13, 'hit'],
    [1.13, 1.22, 'a'],
    [1.22, 1.50, 'flyball']
  ];
  const intervalTier = new IntervalTier(newTierName, intervals);
  tg.replaceTier(oldTierName, intervalTier);

  expect(tg.tierNameList.length).toEqual(5);
  expect(Object.keys(tg.tierDict).length).toEqual(5);
  expect(Object.keys(tg.tierDict)).not.toContain(oldTierName);
  expect(Object.keys(tg.tierDict)).toContain(newTierName);
});

test('can compare textgrids for equality', () => {
  const tgA = getPrefabTextgrid();
  const tgB = getPrefabTextgrid();

  expect(compareTextgrids(tgA, tgB)).toEqual(true);

  const tierName = 'speaker 1';
  tgA.tierDict[tierName].insertEntry([2.03, 2.35, 'maybe'], false, 'replace');

  expect(compareTextgrids(tgA, tgB)).toEqual(false);
});

test('can delete entries from tiers', () => {
  const intervals = [
    [0.73, 1.02, 'Ichiro'],
    [1.02, 1.231, 'hit'],
    [1.33, 1.54, 'a'],
    [1.54, 1.91, 'homerun']
  ];
  const intervalTier = new IntervalTier('speaker 1', intervals);

  const points = [
    [0.50, 'and'],
    [0.63, 'Fred'],
    [1.01, 'caught'],
    [1.33, 'it']
  ];
  const pointTier = new PointTier('speaker 2', points);

  expect(intervalTier.entryList.length).toEqual(4);
  expect(intervalTier.entryList).toContainEqual(intervals[1]);
  intervalTier.deleteEntry(intervals[1]);
  expect(intervalTier.entryList.length).toEqual(3);
  expect(intervalTier.entryList).not.toContainEqual(intervals[1]);

  expect(pointTier.entryList.length).toEqual(4);
  expect(pointTier.entryList).toContainEqual(points[1]);
  pointTier.deleteEntry(points[1]);
  expect(pointTier.entryList.length).toEqual(3);
  expect(pointTier.entryList).not.toContainEqual(points[1]);
})

test('deleting entries from tiers fails if the entry doesnt exist', () => {
  const intervals = [
    [0.73, 1.02, 'Ichiro'],
    [1.02, 1.231, 'hit'],
    [1.33, 1.54, 'a'],
    [1.54, 1.91, 'homerun']
  ];
  const intervalTier = new IntervalTier('speaker 1', intervals);

  expect(() => {
    intervalTier.deleteEntry([1, 2, '3']); // eslint-disable-line no-new
  }).toThrowError('Attempted to index a list of length 4 with index -1.');
})

test('findLabelInTier() finds matching labels in a tier ', () => {
  const tier = getIntervalTier2();
  let matchList

  matchList = findLabelInTier(tier, 'Fred');
  expect(matchList.length).toEqual(1);
  expect(matchList[0]).toEqual(1);

  matchList = findLabelInTier(tier, 'caught');
  expect(matchList.length).toEqual(1);
  expect(matchList[0]).toEqual(2);

  matchList = findLabelInTier(tier, 'a');
  expect(matchList.length).toEqual(0);
})

test('findLabelInTier() works with partial matches', () => {
  const tier = getIntervalTier2();
  let matchList

  matchList = findLabelInTier(tier, 'Fred', 'substr');
  expect(matchList.length).toEqual(1);
  expect(matchList[0]).toEqual(1);

  matchList = findLabelInTier(tier, 'caught', 'substr');
  expect(matchList.length).toEqual(1);
  expect(matchList[0]).toEqual(2);

  matchList = findLabelInTier(tier, 'a', 'substr');
  expect(matchList.length).toEqual(2);
  expect(matchList).toEqual([0, 2]);
})

test('findLabelInTier() works with regular expressions', () => {
  const tier = getIntervalTier2();
  let matchList

  matchList = findLabelInTier(tier, 'a', 're');
  expect(matchList.length).toEqual(2);
  expect(matchList).toEqual([0, 2]);

  matchList = findLabelInTier(tier, '^a', 're');
  expect(matchList.length).toEqual(1);
  expect(matchList[0]).toEqual(0);

  matchList = findLabelInTier(tier, 'Fred', 're');
  expect(matchList.length).toEqual(1);
  expect(matchList[0]).toEqual(1);
})

test('copyTier() creates a new, unique copy', () => {
  const intervals = [
    [0.73, 1.02, 'Ichiro'],
    [1.02, 1.231, 'hit'],
    [1.33, 1.54, 'a'],
    [1.54, 1.91, 'homerun']
  ];
  const intervalTier1 = new IntervalTier('speaker 1', intervals);
  const intervalTier2 = copyTier(intervalTier1);

  expect(compareTiers(intervalTier1, intervalTier2)).toBe(true);
  intervalTier2.insertEntry([3.5, 3.7, 'bloop'], false);
  expect(compareTiers(intervalTier1, intervalTier2)).toBe(false);
})

test('copyTextgrid() creates a new, unique copy', () => {
  const tg1 = getPrefabTextgrid();
  const tg2 = copyTextgrid(tg1);

  expect(compareTextgrids(tg1, tg2)).toBe(true);
  const newTier = new IntervalTier('speaker 3', [], 1.5, 2.0);
  tg2.addTier(newTier);
  expect(compareTextgrids(tg1, tg2)).toBe(false);

  const tg3 = copyTextgrid(tg1);

  expect(compareTextgrids(tg1, tg3)).toBe(true);
  tg3.tierDict['speaker 1'].insertEntry([3.5, 3.7, 'bloop'], false);
  expect(compareTextgrids(tg1, tg3)).toBe(false);
})

test('pointTier.insertEntry works', () => {
  const pointTier = getPointTier1();
  const newPoint = [1.23, '85'];

  expect(pointTier.entryList.length).toEqual(4);
  pointTier.insertEntry(newPoint);
  expect(pointTier.entryList.length).toEqual(5);
  expect(pointTier.entryList).toContain(newPoint);
})

test('pointTier.insertEntry can replace existing points with flag', () => {
  const spy = jest.spyOn(global.console, 'log').mockImplementation(() => {});

  const pointTier = getPointTier1();
  const oldPoint = pointTier.entryList[0];
  const newPoint = [0.9, '85'];

  expect(pointTier.entryList.length).toEqual(4);
  expect(pointTier.entryList).toContain(oldPoint);
  pointTier.insertEntry(newPoint, true, 'replace');
  expect(pointTier.entryList.length).toEqual(4);
  expect(pointTier.entryList).toContain(newPoint);
  expect(pointTier.entryList).not.toContain(oldPoint);

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith("Collision warning for [0.9,85] with items [0.9,120] of tier 'pitch vals 1'");

  spy.mockRestore();
})

test('pointTier.insertEntry wont replace existing points if not explicitly asked', () => {
  const pointTier = getPointTier1();
  const newPoint = [0.9, '85'];

  expect(() => {
    pointTier.insertEntry(newPoint);
  }).toThrowError("Attempted to insert interval [0.9,85] into tier 'pitch vals 1' of textgrid but overlapping entries [0.9,120] already exist.");
})

test('pointTier.insertEntry can merge into existing points with flag', () => {
  const pointTier = getPointTier1();
  const oldPoint = pointTier.entryList[0];
  const newPoint = [0.9, '85'];

  expect(pointTier.entryList.length).toEqual(4);
  expect(pointTier.entryList).toContain(oldPoint);
  pointTier.insertEntry(newPoint, false, 'merge');
  expect(pointTier.entryList.length).toEqual(4);
  expect(pointTier.entryList).toContainEqual([0.9, '120-85']);
  expect(pointTier.entryList).not.toContain(newPoint);
  expect(pointTier.entryList).not.toContain(oldPoint);
})

test('intervalTier.insertEntry works', () => {
  const intervalTier = getIntervalTier1();
  const newInterval = [3.20, 3.50, 'maybe'];

  expect(intervalTier.entryList.length).toEqual(4);
  intervalTier.insertEntry(newInterval);
  expect(intervalTier.entryList.length).toEqual(5);
  expect(intervalTier.entryList).toContain(newInterval);
})

test('intervalTier.insertEntry can replace existing points with flag', () => {
  const spy = jest.spyOn(global.console, 'log').mockImplementation(() => {});

  const intervalTier = getIntervalTier1();
  const oldPoint = intervalTier.entryList[0];
  const newPoint = [0.73, 0.95, 'Sarah'];

  expect(intervalTier.entryList.length).toEqual(4);
  expect(intervalTier.entryList).toContain(oldPoint);
  intervalTier.insertEntry(newPoint, true, 'replace');
  expect(intervalTier.entryList.length).toEqual(4);
  expect(intervalTier.entryList).toContain(newPoint);
  expect(intervalTier.entryList).not.toContain(oldPoint);

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith("Collision warning for [0.73,0.95,Sarah] with items [0.73,1.02,Ichiro] of tier 'speaker 1'");

  spy.mockRestore();
})

test('intervalTier.insertEntry wont replace existing points if not explicitly asked', () => {
  const intervalTier = getIntervalTier1();
  const newInterval = [0.73, 0.95, 'Sarah'];

  expect(() => {
    intervalTier.insertEntry(newInterval);
  }).toThrowError("Attempted to insert interval [0.73,0.95,Sarah] into tier 'speaker 1' of textgrid but overlapping entries [0.73,1.02,Ichiro] already exist.");
})

test('intervalTier.insertEntry can merge into existing points with flag', () => {
  const intervalTier = getIntervalTier1();
  const oldPoint1 = intervalTier.entryList[0];
  const oldPoint2 = intervalTier.entryList[1];

  // The new point spans two intervals--all three will be merged together
  const newPoint = [0.9, 1.10, 'he'];

  expect(intervalTier.entryList.length).toEqual(4);
  expect(intervalTier.entryList).toContain(oldPoint1);
  expect(intervalTier.entryList).toContain(oldPoint2);
  intervalTier.insertEntry(newPoint, false, 'merge');
  expect(intervalTier.entryList.length).toEqual(3);
  expect(intervalTier.entryList).toContainEqual([0.73, 1.231, 'Ichiro-he-hit']);
  expect(intervalTier.entryList).not.toContain(newPoint);
  expect(intervalTier.entryList).not.toContain(oldPoint1);
  expect(intervalTier.entryList).not.toContain(oldPoint2);
})

test('getNonEntriesFromIntervalTier returns empty regions of the tier', () => {
  const entryList = [[0.5, 1.0, '1'], [1.23, 1.45, '2'], [1.45, 1.5, '3'], [1.6, 1.72, '4']];
  const tier = new IntervalTier('TierA', entryList, 0, 2.0);
  const nonEntryList = [[0, 0.5, ''], [1.0, 1.23, ''], [1.5, 1.6, ''], [1.72, 2.0, '']];

  const actualNonEntryList = getNonEntriesFromIntervalTier(tier);
  expect(actualNonEntryList).toBeDeepCloseTo(nonEntryList);
})

test('getNonEntriesFromIntervalTier works for tier with just one entry', () => {
  const entryList = [[0.73, 1.2, 'cat']];
  const tier = new IntervalTier('TierA', entryList, 0, 2.0);
  const nonEntryList = [[0, 0.73, ''], [1.2, 2.0, '']];

  const actualNonEntryList = getNonEntriesFromIntervalTier(tier);
  expect(actualNonEntryList).toBeDeepCloseTo(nonEntryList);
})

test('getNonEntriesFromIntervalTier works for tier with no blank spot at the beginning or end', () => {
  const entryList = [[0.0, 0.6, 'cat'], [0.8, 0.9, 'bird'], [1.2, 2.0, 'dog']];
  const tier = new IntervalTier('TierA', entryList, 0, 2.0);
  const nonEntryList = [[0.6, 0.8, ''], [0.9, 1.2, '']];

  const actualNonEntryList = getNonEntriesFromIntervalTier(tier);
  expect(actualNonEntryList).toBeDeepCloseTo(nonEntryList);
})

test('getNonEntriesFromIntervalTier returns whole interval for empty tier', () => {
  const entryList = [];
  const tier = new IntervalTier('TierA', entryList, 0, 2.0);
  const nonEntryList = [[0, 2.0, '']];

  const actualNonEntryList = getNonEntriesFromIntervalTier(tier);
  expect(actualNonEntryList).toBeDeepCloseTo(nonEntryList);
})

test('getValuesInIntervals works', () => {
  const entryList = [[0.0, 0.6, 'cat'], [0.8, 0.9, 'bird'], [1.2, 2.0, 'dog']];
  const pointList = [[0.1, 'a'], [0.43, 'b'], [0.6, 'c'], [0.71, 'd'], [0.79, 'e'], [0.83, 'f'], [0.95, 'g'], [1.09, 'h'], [1.15, 'i'], [1.26, 'j'], [1.99, 'k']];
  const expectedResult = [[0.1, 'a'], [0.43, 'b'], [0.6, 'c'], [0.83, 'f'], [1.26, 'j'], [1.99, 'k']];
  const tier = new IntervalTier('Speaker 1', entryList);

  const containedValues = getValuesInIntervals(tier, pointList);
  expect(containedValues).toBeDeepCloseTo(expectedResult);
})

test('getValuesAtPoints works', () => {
  const pointEntryList = [[0.1, '1'], [0.6, '2'], [0.8, '3'], [0.83, '4'], [1.09, '5'], [1.11, '6'], [1.33, '7']];
  const pointList = [[0.1, 'a'], [0.43, 'b'], [0.6, 'c'], [0.71, 'd'], [0.79, 'e'], [0.83, 'f'], [0.95, 'g'], [1.09, 'h'], [1.15, 'i'], [1.26, 'j'], [1.99, 'k']];
  const expectedResult = [[0.1, 'a'], [0.6, 'c'], [0.83, 'f'], [1.09, 'h']];
  const tier = new PointTier('Pitch vals 1', pointEntryList);

  const containedValues = getValuesAtPoints(tier, pointList, false);
  expect(containedValues).toBeDeepCloseTo(expectedResult);
})

test('getEntriesInInterval works for IntervalTiers', () => {
  const intervalEntryList = [[0.0, 0.6, 'cat'], [0.8, 0.9, 'bird'], [1.0, 1.1, 'elephant'], [1.2, 2.0, 'dog'], [2.5, 3.0, 'horse'], [400.0, 405.0, 'fish']];
  const start = 0.85;
  const stop = 1.5;
  const expectedResult = [[0.8, 0.9, 'bird'], [1.0, 1.1, 'elephant'], [1.2, 2.0, 'dog']];

  const tier = new IntervalTier('Speaker 1', intervalEntryList);
  const containedEntries = getEntriesInInterval(tier, start, stop);
  expect(containedEntries).toBeDeepCloseTo(expectedResult);
})

test('getEntriesInInterval works for PointTiers', () => {
  const pointEntryList = [[0.1, 'a'], [0.43, 'b'], [0.6, 'c'], [0.71, 'd'], [0.79, 'e'], [0.83, 'f'], [0.95, 'g'], [1.09, 'h'], [1.15, 'i'], [1.26, 'j'], [1.99, 'k']];
  const start = 0.43;
  const stop = 0.79;
  const expectedResult = [[0.43, 'b'], [0.6, 'c'], [0.71, 'd'], [0.79, 'e']];

  const tier = new PointTier('Pitch vals 1', pointEntryList);
  const containedEntries = getEntriesInInterval(tier, start, stop);
  expect(containedEntries).toBeDeepCloseTo(expectedResult);
})
