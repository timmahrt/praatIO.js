import { toBeDeepCloseTo } from 'jest-matcher-deep-close-to';

var praatiojs = require('../../../lib');
var Textgrid = praatiojs.textgrid.Textgrid;
var IntervalTier = praatiojs.textgrid.IntervalTier;
var PointTier = praatiojs.textgrid.PointTier;

expect.extend({ toBeDeepCloseTo });

function getIntervalTier1 () {
  let intervals1 = [
    [0.73, 1.02, 'Ichiro'],
    [1.02, 1.231, 'hit'],
    [1.33, 1.54, 'a'],
    [1.54, 1.91, 'homerun']
  ];
  return new IntervalTier('speaker 1', intervals1);
}

function getIntervalTier2 () {
  let intervals2 = [
    [3.56, 3.98, 'and'],
    [3.98, 4.21, 'Fred'],
    [4.21, 4.44, 'caught'],
    [4.44, 4.53, 'it']
  ];
  return new IntervalTier('speaker 2', intervals2);
}

function getPointTier1 () {
  let points1 = [
    [0.9, '120'],
    [1.11, '100'],
    [1.41, '110'],
    [1.79, '95']
  ];
  return new PointTier('pitch vals 1', points1);
}

function getPointTier2 () {
  let points2 = [
    [3.78, '140'],
    [4.11, '131'],
    [4.32, '135'],
    [4.49, '120']
  ]
  return new PointTier('pitch vals 2', points2);
}

function getPointTier3 () {
  let points3 = [
    [2.29, 'Door slam'],
    [2.99, 'Cough']
  ]
  return new PointTier('noises', points3)
}

function getPrefabTextgrid (tierList = null) {
  let tg = new Textgrid();

  if (!tierList) {
    let intervalTier1 = getIntervalTier1();
    let intervalTier2 = getIntervalTier2();
    let pitchTier1 = getPointTier1();
    let pitchTier2 = getPointTier2();
    let noiseTier = getPointTier3();

    tierList = [intervalTier1, intervalTier2, pitchTier1, pitchTier2, noiseTier];
  }

  for (let i = 0; i < tierList.length; i++) {
    tg.addTier(tierList[i]);
  }

  return tg;
}

function testTier (tier, minTime, maxTime, entryList) {
  expect(tier.entryList.length).toEqual(entryList.length);
  expect(tier.entryList).toBeDeepCloseTo(entryList);
  expect(tier.minTimestamp).toEqual(minTime);
  expect(tier.maxTimestamp).toBeCloseTo(maxTime);
}

test('can build PointTiers', () => {
  let name = 'pitch values';
  let points = [
    [1.5, '93'],
    [2.5, '100'],
    [3.5, '75']
  ];
  let tier = new PointTier(name, points);

  expect(tier.name).toEqual(name);
  expect(tier.minTimestamp).toEqual(1.5);
  expect(tier.maxTimestamp).toEqual(3.5);
  expect(tier.entryList.length).toEqual(3);

  for (let i = 0; i < tier.entryList.length; i++) {
    expect(tier.entryList[i]).toEqual(points[i]);
  }
});

test('can build IntervalTiers', () => {
  let name = 'words';
  let intervals = [
    [0.73, 1.02, 'John'],
    [1.02, 1.231, 'ate'],
    [1.33, 1.54, 'the'],
    [1.54, 1.71, 'pie']
  ];
  let tier = new IntervalTier(name, intervals);

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
  let tg = getPrefabTextgrid();
  let origNumTiers = tg.tierNameList.length;
  let origTierNameList = tg.tierNameList.slice();
  let origMinTimestamp = tg.minTimestamp;
  let origMaxTimestamp = tg.maxTimestamp;

  let tierName = 'words';
  let tierMinTime = 1.2;
  let tierMaxTime = 3;

  // Ensure our times fit within the extremes used by the factory
  expect(tierMinTime).toBeGreaterThan(origMinTimestamp);
  expect(tierMaxTime).toBeLessThan(origMaxTimestamp);
  let tier = new IntervalTier(tierName, [], tierMinTime, tierMaxTime);

  tg.addTier(tier);

  expect(tg.tierNameList).toEqual(origTierNameList.concat([tierName]));
  expect(tg.minTimestamp).toEqual(origMinTimestamp);
  expect(tg.maxTimestamp).toEqual(origMaxTimestamp);

  expect(Object.keys(tg.tierDict).length).toEqual(origNumTiers + 1);
  expect(tg.tierDict[tierName].name).toEqual(tierName);
});

test('addTier overrides existing min/max time if less than/greater than existing times, respectively', () => {
  let tg = getPrefabTextgrid();
  let origNumTiers = tg.tierNameList.length;
  let origTierNameList = tg.tierNameList.slice();

  // Add second tier; override mintime and maxtime
  let tierName = 'editors notes'
  let tierMinTime = 0.1;
  let tierMaxTime = 150.3;
  let tier = new IntervalTier(tierName, [], tierMinTime, tierMaxTime);

  tg.addTier(tier);

  expect(tg.tierNameList).toEqual(origTierNameList.concat([tierName]));
  expect(tg.minTimestamp).toEqual(tierMinTime);
  expect(tg.maxTimestamp).toEqual(tierMaxTime);

  expect(Object.keys(tg.tierDict).length).toEqual(origNumTiers + 1);
  expect(tg.tierDict[tierName].name).toEqual(tierName);
});

test('tiers can be inserted into arbitrary positions', () => {
  let tg = getPrefabTextgrid();
  let origNumTiers = tg.tierNameList.length;
  let tierNameList = tg.tierNameList.slice();

  // Insert third tier between the two tiers; override mintime
  let tierName = 'speaker 3'
  let tierMinTime = 1.33;
  let tierMaxTime = 2.14;
  let tier = new PointTier(tierName, [], tierMinTime, tierMaxTime);
  let insertI = 1;

  tg.addTier(tier, insertI);
  tierNameList.splice(insertI, 0, tierName);

  expect(tg.tierNameList).toEqual(tierNameList);

  expect(Object.keys(tg.tierDict).length).toEqual(origNumTiers + 1);
  expect(tg.tierDict[tierName].name).toEqual(tierName);
});

test('addTier fails if a tier with the same name already exists in the textgrid', () => {
  let tg = getPrefabTextgrid();
  let tier = new IntervalTier('speaker 1', [], 0, 2);

  expect(() => {
    tg.addTier(tier);
  }).toThrowError('Tier name speaker 1 already exists in textgrid');
});

test('can rename tiers in a textgrid', () => {
  let tg = getPrefabTextgrid();
  let origName = 'speaker 1';
  let newName = 'Bob';
  expect(tg.tierNameList[0]).toEqual(origName);

  tg.renameTier(origName, newName);

  expect(tg.tierNameList[0]).toEqual(newName);
});

test('can delete tiers in a textgrid', () => {
  let tg = getPrefabTextgrid();
  let tierName = 'speaker 2';

  expect(tg.tierNameList.length).toEqual(5);
  expect(Object.keys(tg.tierDict).length).toEqual(5);
  expect(Object.keys(tg.tierDict)).toContain(tierName);

  tg.removeTier(tierName);

  expect(tg.tierNameList.length).toEqual(4);
  expect(Object.keys(tg.tierDict).length).toEqual(4);
  expect(Object.keys(tg.tierDict)).not.toContain(tierName);
});

test('can replace tiers in a textgrid', () => {
  let tg = getPrefabTextgrid();
  let newTierName = 'speaker 3';
  let oldTierName = 'speaker 1';

  expect(tg.tierNameList.length).toEqual(5);
  expect(Object.keys(tg.tierDict).length).toEqual(5);
  expect(Object.keys(tg.tierDict)).toContain(oldTierName);
  expect(Object.keys(tg.tierDict)).not.toContain(newTierName);

  let intervals = [
    [0.51, 0.80, 'Sarah'],
    [0.80, 1.13, 'hit'],
    [1.13, 1.22, 'a'],
    [1.22, 1.50, 'flyball']
  ];
  let intervalTier = new IntervalTier(newTierName, intervals);
  tg.replaceTier(oldTierName, intervalTier);

  expect(tg.tierNameList.length).toEqual(5);
  expect(Object.keys(tg.tierDict).length).toEqual(5);
  expect(Object.keys(tg.tierDict)).not.toContain(oldTierName);
  expect(Object.keys(tg.tierDict)).toContain(newTierName);
});

test('can compare textgrids for equality', () => {
  let tgA = getPrefabTextgrid();
  let tgB = getPrefabTextgrid();

  expect(tgA.equals(tgB)).toEqual(true);

  let tierName = 'speaker 1';
  tgA.tierDict[tierName].insertEntry([2.03, 2.35, 'maybe'], false, 'replace');

  expect(tgA.equals(tgB)).toEqual(false);
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

  let superIntervalTier = intervalTier1.appendTier(intervalTier2);
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

  let superPointTier = pointTier1.appendTier(pointTier2);
  expect(superPointTier.entryList.length).toEqual(8);
  expect(superPointTier.maxTimestamp).toBeCloseTo(1.54 + 1.33);
})

test('cannot append a point tier and interval tier', () => {
  let intervalTier = new IntervalTier('speaker 1', [], 0, 100);
  let pointTier = new PointTier('pitch vals 1', [], 0, 100);

  expect(() => {
    intervalTier.appendTier(pointTier); // eslint-disable-line no-new
  }).toThrowError('Tier types must match when appending tiers.');

  expect(() => {
    pointTier.appendTier(intervalTier); // eslint-disable-line no-new
  }).toThrowError('Tier types must match when appending tiers.');
})

test('can delete entries from tiers', () => {
  let intervals = [
    [0.73, 1.02, 'Ichiro'],
    [1.02, 1.231, 'hit'],
    [1.33, 1.54, 'a'],
    [1.54, 1.91, 'homerun']
  ];
  let intervalTier = new IntervalTier('speaker 1', intervals);

  let points = [
    [0.50, 'and'],
    [0.63, 'Fred'],
    [1.01, 'caught'],
    [1.33, 'it']
  ];
  let pointTier = new PointTier('speaker 2', points);

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
  let intervals = [
    [0.73, 1.02, 'Ichiro'],
    [1.02, 1.231, 'hit'],
    [1.33, 1.54, 'a'],
    [1.54, 1.91, 'homerun']
  ];
  let intervalTier = new IntervalTier('speaker 1', intervals);

  expect(() => {
    intervalTier.deleteEntry([1, 2, '3']); // eslint-disable-line no-new
  }).toThrowError('Attempted to index a list of length 4 with index -1.');
})

test('find() finds matching labels in a tier ', () => {
  let tier = getIntervalTier2();
  let matchList

  matchList = tier.find('Fred');
  expect(matchList.length).toEqual(1);
  expect(matchList[0]).toEqual(1);

  matchList = tier.find('caught');
  expect(matchList.length).toEqual(1);
  expect(matchList[0]).toEqual(2);

  matchList = tier.find('a');
  expect(matchList.length).toEqual(0);
})

test('find() works with partial matches', () => {
  let tier = getIntervalTier2();
  let matchList

  matchList = tier.find('Fred', 'substr');
  expect(matchList.length).toEqual(1);
  expect(matchList[0]).toEqual(1);

  matchList = tier.find('caught', 'substr');
  expect(matchList.length).toEqual(1);
  expect(matchList[0]).toEqual(2);

  matchList = tier.find('a', 'substr');
  expect(matchList.length).toEqual(2);
  expect(matchList).toEqual([0, 2]);
})

test('find() works with regular expressions', () => {
  let tier = getIntervalTier2();
  let matchList

  matchList = tier.find('a', 're');
  expect(matchList.length).toEqual(2);
  expect(matchList).toEqual([0, 2]);

  matchList = tier.find('^a', 're');
  expect(matchList.length).toEqual(1);
  expect(matchList[0]).toEqual(0);

  matchList = tier.find('Fred', 're');
  expect(matchList.length).toEqual(1);
  expect(matchList[0]).toEqual(1);
})

test('tier.newCopy() creates a new, unique copy', () => {
  let intervals = [
    [0.73, 1.02, 'Ichiro'],
    [1.02, 1.231, 'hit'],
    [1.33, 1.54, 'a'],
    [1.54, 1.91, 'homerun']
  ];
  let intervalTier1 = new IntervalTier('speaker 1', intervals);
  let intervalTier2 = intervalTier1.newCopy();

  expect(intervalTier1.equals(intervalTier2)).toBe(true);
  intervalTier2.insertEntry([3.5, 3.7, 'bloop'], false);
  expect(intervalTier1.equals(intervalTier2)).toBe(false);
})

test('Textgrid.newCopy() creates a new, unique copy', () => {
  let tg1 = getPrefabTextgrid();
  let tg2 = tg1.newCopy();

  expect(tg1.equals(tg2)).toBe(true);
  let newTier = new IntervalTier('speaker 3', [], 1.5, 2.0);
  tg2.addTier(newTier);
  expect(tg1.equals(tg2)).toBe(false);

  let tg3 = tg1.newCopy();

  expect(tg1.equals(tg3)).toBe(true);
  tg3.tierDict['speaker 1'].insertEntry([3.5, 3.7, 'bloop'], false);
  expect(tg1.equals(tg3)).toBe(false);
})

test('tier.union() merges one tier into another', () => {
  let tg = getPrefabTextgrid();
  let tier1 = tg.tierDict['speaker 1'];
  let tier2 = tg.tierDict['speaker 2'];

  expect(tier1.entryList.length).toEqual(4);
  expect(tier2.entryList.length).toEqual(4);

  // tier1 and tier2 don't overlap in time
  let tier12 = tier1.union(tier2);
  expect(tier12.entryList.length).toEqual(8);
  expect(tier12.entryList).toEqual(tier1.entryList.concat(tier2.entryList));

  // tier1 and tier3 partially overlap in time
  // merging them will cause 2 of tier1's entries to get merged
  let tier3 = new IntervalTier('blah blah', [[0.73, 1.231, 'coffee']])
  let tier13 = tier1.union(tier3);
  expect(tier13.entryList.length).toEqual(3);
})

test('pointTier.insertEntry works', () => {
  let pointTier = getPointTier1();
  let newPoint = [1.23, '85'];

  expect(pointTier.entryList.length).toEqual(4);
  pointTier.insertEntry(newPoint);
  expect(pointTier.entryList.length).toEqual(5);
  expect(pointTier.entryList).toContain(newPoint);
})

test('pointTier.insertEntry can replace existing points with flag', () => {
  let spy = jest.spyOn(global.console, 'log').mockImplementation(() => {});

  let pointTier = getPointTier1();
  let oldPoint = pointTier.entryList[0];
  let newPoint = [0.9, '85'];

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
  let pointTier = getPointTier1();
  let newPoint = [0.9, '85'];

  expect(() => {
    pointTier.insertEntry(newPoint);
  }).toThrowError("Attempted to insert interval [0.9,85] into tier 'pitch vals 1' of textgrid but overlapping entries [0.9,120] already exist.");
})

test('pointTier.insertEntry can merge into existing points with flag', () => {
  let pointTier = getPointTier1();
  let oldPoint = pointTier.entryList[0];
  let newPoint = [0.9, '85'];

  expect(pointTier.entryList.length).toEqual(4);
  expect(pointTier.entryList).toContain(oldPoint);
  pointTier.insertEntry(newPoint, false, 'merge');
  expect(pointTier.entryList.length).toEqual(4);
  expect(pointTier.entryList).toContainEqual([0.9, '120-85']);
  expect(pointTier.entryList).not.toContain(newPoint);
  expect(pointTier.entryList).not.toContain(oldPoint);
})

test('intervalTier.insertEntry works', () => {
  let intervalTier = getIntervalTier1();
  let newInterval = [3.20, 3.50, 'maybe'];

  expect(intervalTier.entryList.length).toEqual(4);
  intervalTier.insertEntry(newInterval);
  expect(intervalTier.entryList.length).toEqual(5);
  expect(intervalTier.entryList).toContain(newInterval);
})

test('intervalTier.insertEntry can replace existing points with flag', () => {
  let spy = jest.spyOn(global.console, 'log').mockImplementation(() => {});

  let intervalTier = getIntervalTier1();
  let oldPoint = intervalTier.entryList[0];
  let newPoint = [0.73, 0.95, 'Sarah'];

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
  let intervalTier = getIntervalTier1();
  let newInterval = [0.73, 0.95, 'Sarah'];

  expect(() => {
    intervalTier.insertEntry(newInterval);
  }).toThrowError("Attempted to insert interval [0.73,0.95,Sarah] into tier 'speaker 1' of textgrid but overlapping entries [0.73,1.02,Ichiro] already exist.");
})

test('intervalTier.insertEntry can merge into existing points with flag', () => {
  let intervalTier = getIntervalTier1();
  let oldPoint1 = intervalTier.entryList[0];
  let oldPoint2 = intervalTier.entryList[1];

  // The new point spans two intervals--all three will be merged together
  let newPoint = [0.9, 1.10, 'he'];

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

test('pointTier.crop() rebaseToZero sets the the min time to zero', () => {
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

  let croppedTier = pointTier.crop(newStart, newStop, '', true)
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

test('intervalTier.crop() rebaseToZero sets the the min time to zero', () => {
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

  let croppedTier = intervalTier.crop(newStart, newStop, '', true)
  let newEntryList = [
    [0.13, 0.42, 'Ichiro'],
    [0.42, 0.631, 'hit'],
    [0.73, 0.94, 'a'],
    [0.94, 1.31, 'homerun']
  ];

  testTier(croppedTier, 0, newStop - newStart, newEntryList);
})

test('intervalTier.crop() strict mode only keeps entries in the crop region', () => {
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

  let croppedTier = intervalTier.crop(newStart, newStop, 'strict', false)
  let newEntryList = [
    [1.02, 1.231, 'hit'],
    [1.33, 1.44, 'a'],
    [1.44, 1.54, 'great']
  ];

  testTier(croppedTier, newStart, newStop, newEntryList);
})

test('intervalTier.crop() lax mode keeps entries that are spanning the crop boundaries', () => {
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

  let croppedTier = intervalTier.crop(newStart, newStop, 'lax', false)
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

test('intervalTier.crop() truncated mode cuts partially contained intervals', () => {
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

  let croppedTier = intervalTier.crop(newStart, newStop, 'truncated', false)
  let newEntryList = [
    [1.1, 1.231, 'hit'],
    [1.33, 1.44, 'a'],
    [1.44, 1.5, 'great']
  ];

  testTier(croppedTier, newStart, newStop, newEntryList);
})

test('textgrid.crop() rebaseToZero sets the the min time to zero', () => {
  let tg = getPrefabTextgrid();

  let oldStart = 0.73;
  let oldStop = 4.53;

  let newStart = 1.1;
  let newStop = 1.5;

  expect(tg.minTimestamp).toEqual(oldStart);
  expect(tg.maxTimestamp).toEqual(oldStop);

  let newTg = tg.crop(1.1, 1.5, 'strict', true);

  expect(newTg.minTimestamp).toEqual(0);
  expect(newTg.maxTimestamp).toBeCloseTo(newStop - newStart);
})

test('pointTier.editTimestamps() throws error on overshoot with flag', () => {
  let tier = getPointTier1();

  expect(() => {
    tier.editTimestamps(100.0, false);
  }).toThrowError("Attempted to change [0.9,120] to [100.9,120] in tier 'pitch vals 1' however, this exceeds the bounds (0.9,1.79).");
})

test('intervalTier.editTimestamps() throws error on overshoot with flag', () => {
  let tier = getIntervalTier1();

  expect(() => {
    tier.editTimestamps(100.0, false);
  }).toThrowError("Attempted to change [0.73,1.02,Ichiro] to [100.73,101.02,Ichiro] in tier 'speaker 1' however, this exceeds the bounds (0.73,1.91).");
})

test('textgrid.eraseRegion works', () => {
  let tg = getPrefabTextgrid();
  let newTg = tg.eraseRegion(1.11, 4.3, false);

  let speaker1Tier = newTg.tierDict['speaker 1'];
  let speaker2Tier = newTg.tierDict['speaker 2'];
  let pitchTier = newTg.tierDict['pitch vals 1'];

  expect(speaker1Tier.entryList).toEqual([[0.73, 1.02, 'Ichiro'], [1.02, 1.11, 'hit']]);
  expect(speaker2Tier.entryList).toEqual([[4.3, 4.44, 'caught'], [4.44, 4.53, 'it']]);
  expect(pitchTier.entryList).toEqual([[0.9, '120'], [1.11, '100']]);
})

test('textgrid.eraseRegion works with doShrink=true', () => {
  let tg = getPrefabTextgrid();
  let newTg = tg.eraseRegion(1.11, 4.3, true);

  let speaker1Tier = newTg.tierDict['speaker 1'];
  let speaker2Tier = newTg.tierDict['speaker 2'];
  let pitchTier = newTg.tierDict['pitch vals 1'];

  expect(speaker1Tier.entryList).toBeDeepCloseTo([[0.73, 1.02, 'Ichiro'], [1.02, 1.11, 'hit']]);
  expect(speaker2Tier.entryList).toBeDeepCloseTo([[1.11, 1.25, 'caught'], [1.25, 1.34, 'it']]);
  expect(pitchTier.entryList).toBeDeepCloseTo([[0.9, '120'], [1.11, '100']]);
})

test('Can delete the start of a textgrid with textgrid.eraseRegion', () => {
  let tg = getPrefabTextgrid();
  let newTg = tg.eraseRegion(0.0, 1.5, false);

  let speaker1Tier = newTg.tierDict['speaker 1'];
  let speaker2Tier = newTg.tierDict['speaker 2'];
  let pitchTier = newTg.tierDict['pitch vals 1'];

  expect(speaker1Tier.entryList).toEqual([[1.5, 1.54, 'a'], [1.54, 1.91, 'homerun']]);
  expect(speaker2Tier.entryList).toEqual([[3.56, 3.98, 'and'], [3.98, 4.21, 'Fred'], [4.21, 4.44, 'caught'], [4.44, 4.53, 'it']]);
  expect(pitchTier.entryList).toEqual([[1.79, '95']]);
})

test('Can delete the start of a textgrid with textgrid.eraseRegion; doShrink=true', () => {
  let tg = getPrefabTextgrid();
  let newTg = tg.eraseRegion(0.0, 1.5, true);

  let speaker1Tier = newTg.tierDict['speaker 1'];
  let speaker2Tier = newTg.tierDict['speaker 2'];
  let pitchTier = newTg.tierDict['pitch vals 1'];

  expect(speaker1Tier.entryList).toBeDeepCloseTo([[0, 0.04, 'a'], [0.04, 0.41, 'homerun']]);
  expect(speaker2Tier.entryList).toBeDeepCloseTo([[2.06, 2.48, 'and'], [2.48, 2.71, 'Fred'], [2.71, 2.94, 'caught'], [2.94, 3.03, 'it']]);
  expect(pitchTier.entryList).toBeDeepCloseTo([[0.29, '95']]);
})

test('Can delete the end of a textgrid with textgrid.eraseRegion', () => {
  let tg = getPrefabTextgrid();
  let newTg = tg.eraseRegion(1.33, tg.maxTimestamp, false);

  let speaker1Tier = newTg.tierDict['speaker 1'];
  let speaker2Tier = newTg.tierDict['speaker 2'];
  let pitchTier = newTg.tierDict['pitch vals 1'];

  expect(speaker1Tier.entryList).toEqual([[0.73, 1.02, 'Ichiro'], [1.02, 1.231, 'hit']]);
  expect(speaker2Tier.entryList).toEqual([]);
  expect(pitchTier.entryList).toEqual([[0.9, '120'], [1.11, '100']]);
})

test('Deleting the end of a textgrid with textgrid.eraseRegion, there is no differences if doShrink is false or true', () => {
  let tg = getPrefabTextgrid();
  let newTg1 = tg.eraseRegion(1.33, tg.maxTimestamp, true);
  let newTg2 = tg.eraseRegion(1.33, tg.maxTimestamp, false);

  expect(newTg1.equals(newTg2)).toEqual(true);
})

test('Can textgrid.insertspace into the middle of a textgrid', () => {
  let tg = getPrefabTextgrid();
  let newTg = tg.insertSpace(2.0, 1.0, 'stretch');

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

test('Can textgrid.insertspace into the start of a textgrid', () => {
  let tg = getPrefabTextgrid();
  let newTg = tg.insertSpace(0.0, 0.5, 'stretch');

  let speaker1Tier = newTg.tierDict['speaker 1'];
  let speaker2Tier = newTg.tierDict['speaker 2'];
  let pitchTier = newTg.tierDict['pitch vals 1'];

  expect(speaker1Tier.entryList).toBeDeepCloseTo([[1.23, 1.52, 'Ichiro'], [1.52, 1.731, 'hit'], [1.83, 2.04, 'a'], [2.04, 2.41, 'homerun']]);
  expect(speaker2Tier.entryList).toBeDeepCloseTo([[4.06, 4.48, 'and'], [4.48, 4.71, 'Fred'], [4.71, 4.94, 'caught'], [4.94, 5.03, 'it']]);
  expect(pitchTier.entryList).toBeDeepCloseTo([[1.4, '120'], [1.61, '100'], [1.91, '110'], [2.29, '95']])

  expect(newTg.maxTimestamp).toEqual(5.03);
})

test('Can textgrid.insertspace into the end of a textgrid', () => {
  let tg = getPrefabTextgrid();
  let newTg = tg.insertSpace(tg.maxTimestamp, 1.0, 'stretch');

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

test('textgrid.insertspace, with collisionCode="stretch", stretches intervals', () => {
  let tg = getPrefabTextgrid();
  let newTg = tg.insertSpace(1.5, 1.0, 'stretch');

  let speaker1Tier = newTg.tierDict['speaker 1'];

  // interval with label 'a' gets lengthened; intervals before are unaffected; intervals after are pushed 1 second later
  expect(speaker1Tier.entryList).toBeDeepCloseTo([[0.73, 1.02, 'Ichiro'], [1.02, 1.231, 'hit'], [1.33, 2.54, 'a'], [2.54, 2.91, 'homerun']]);

  expect(newTg.maxTimestamp).toEqual(5.53);
})

test('textgrid.insertspace, with collisionCode="split", splits conflicting intervals in 2 pieces', () => {
  let tg = getPrefabTextgrid();
  let newTg = tg.insertSpace(1.5, 1.0, 'split');

  let speaker1Tier = newTg.tierDict['speaker 1'];

  // interval with label 'a' gets lengthened; intervals before are unaffected; intervals after are pushed 1 second later
  expect(speaker1Tier.entryList).toBeDeepCloseTo([[0.73, 1.02, 'Ichiro'], [1.02, 1.231, 'hit'], [1.33, 1.5, 'a'], [2.5, 2.54, 'a'], [2.54, 2.91, 'homerun']]);

  expect(newTg.maxTimestamp).toEqual(5.53);
})

test('textgrid.insertspace, with collisionCode="no change", does not affect conflicting intervals', () => {
  let tg = getPrefabTextgrid();

  // newTg1 inserts a space half-way through an entry list while
  // newTg2 does not.  Since they don't modify values on collision,
  // the behaviour of the two insertions is the same.
  // In both cases, only intervals that start after the insertion point
  // are affected.
  let newTg1 = tg.insertSpace(1.5, 1.0, 'no change');
  let newTg2 = tg.insertSpace(1.54, 1.0, 'no change');

  expect(newTg1.equals(newTg2)).toEqual(true);
})
