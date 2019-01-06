import { Textgrid, IntervalTier, PointTier, INTERVAL_TIER, POINT_TIER } from '../../../textgrid.js';

function getPrefabTextgrid (tierList = null) {
  let tg = new Textgrid();

  if (!tierList) {
    let intervals1 = [
      [0.73, 1.02, 'Ichiro'],
      [1.02, 1.231, 'hit'],
      [1.33, 1.54, 'a'],
      [1.54, 1.91, 'homerun']
    ];
    let intervalTier1 = new IntervalTier('speaker 1', intervals1);

    let intervals2 = [
      [3.56, 3.98, 'and'],
      [3.98, 4.21, 'Fred'],
      [4.21, 4.44, 'caught'],
      [4.44, 4.53, 'it']
    ];
    let intervalTier2 = new IntervalTier('speaker 2', intervals2);

    let points1 = [
      [0.9, '120'],
      [1.11, '100'],
      [1.41, '110'],
      [1.79, '95']
    ];
    let pitchTier1 = new PointTier('pitch vals', points1);

    tierList = [intervalTier1, intervalTier2, pitchTier1];
  }

  for (let i = 0; i < tierList.length; i++) {
    tg.addTier(tierList[i]);
  }

  return tg;
}

function testTier (tier, minTime, maxTime, entryList) {
  expect(tier.entryList.length).toEqual(entryList.length);
  for (let i = 0; i < tier.entryList.length; i++) {

    if (tier.tierType === INTERVAL_TIER) {
      expect(tier.entryList[i][0]).toBeCloseTo(entryList[i][0]);
      expect(tier.entryList[i][1]).toBeCloseTo(entryList[i][1]);
      expect(tier.entryList[i][2]).toEqual(entryList[i][2]);
    }
    else if (tier.tierType === POINT_TIER) {
      expect(tier.entryList[i][0]).toBeCloseTo(entryList[i][0]);
      expect(tier.entryList[i][1]).toBeCloseTo(entryList[i][1]);
      expect(tier.entryList[i][2]).toEqual(entryList[i][2]);
    }
  }
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
  }).toThrowError("Couldn't create tier: All textgrid tiers must have a min and max duration");

  expect(() => {
    new PointTier('no points', []); // eslint-disable-line no-new
  }).toThrowError("Couldn't create tier: All textgrid tiers must have a min and max duration");
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

test('can rename tiers', () => {
  let tg = getPrefabTextgrid();
  let origName = 'speaker 1';
  let newName = 'Bob';
  expect(tg.tierNameList[0]).toEqual(origName);

  tg.renameTier(origName, newName);

  expect(tg.tierNameList[0]).toEqual(newName);
});

test('can delete tiers', () => {
  let tg = getPrefabTextgrid();
  let tierName = 'speaker 2';

  expect(tg.tierNameList.length).toEqual(3);
  expect(Object.keys(tg.tierDict).length).toEqual(3);
  expect(Object.keys(tg.tierDict)).toContain(tierName);

  tg.removeTier(tierName);

  expect(tg.tierNameList.length).toEqual(2);
  expect(Object.keys(tg.tierDict).length).toEqual(2);
  expect(Object.keys(tg.tierDict)).not.toContain(tierName);
});

test('can replace tiers', () => {
  let tg = getPrefabTextgrid();
  let newTierName = 'speaker 3';
  let oldTierName = 'speaker 1';

  expect(tg.tierNameList.length).toEqual(3);
  expect(Object.keys(tg.tierDict).length).toEqual(3);
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

  expect(tg.tierNameList.length).toEqual(3);
  expect(Object.keys(tg.tierDict).length).toEqual(3);
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
  let pointTier = new PointTier('pitch vals', [], 0, 100);

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
  let tg = getPrefabTextgrid();
  let tier = tg.tierDict['speaker 2'];
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
  let tg = getPrefabTextgrid();
  let tier = tg.tierDict['speaker 2'];
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
  let tg = getPrefabTextgrid();
  let tier = tg.tierDict['speaker 2'];
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
  let tg = getPrefabTextgrid();
  let pointTier = tg.tierDict['pitch vals'];
  let newPoint = [1.23, '85'];

  expect(pointTier.entryList.length).toEqual(4);
  pointTier.insertEntry(newPoint);
  expect(pointTier.entryList.length).toEqual(5);
  expect(pointTier.entryList).toContain(newPoint);
})

test('pointTier.insertEntry can replace existing points with flag', () => {
  let spy = jest.spyOn(global.console, 'log').mockImplementation(() => {});

  let tg = getPrefabTextgrid();
  let pointTier = tg.tierDict['pitch vals'];
  let oldPoint = pointTier.entryList[0];
  let newPoint = [0.9, '85'];

  expect(pointTier.entryList.length).toEqual(4);
  expect(pointTier.entryList).toContain(oldPoint);
  pointTier.insertEntry(newPoint, true, 'replace');
  expect(pointTier.entryList.length).toEqual(4);
  expect(pointTier.entryList).toContain(newPoint);
  expect(pointTier.entryList).not.toContain(oldPoint);

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith("Collision warning for [0.9,85] with items [0.9,120] of tier 'pitch vals'");

  spy.mockRestore();
})

test('pointTier.insertEntry wont replace existing points if not explicitly asked', () => {
  let tg = getPrefabTextgrid();
  let pointTier = tg.tierDict['pitch vals'];
  let newPoint = [0.9, '85'];

  expect(() => {
    pointTier.insertEntry(newPoint);
  }).toThrowError("Attempted to insert interval [0.9,85] into tier 'pitch vals' of textgrid but overlapping entries [0.9,120] already exist.");
})

test('pointTier.insertEntry can merge into existing points with flag', () => {
  let tg = getPrefabTextgrid();
  let pointTier = tg.tierDict['pitch vals'];
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
  let tg = getPrefabTextgrid();
  let intervalTier = tg.tierDict['speaker 1'];
  let newInterval = [3.20, 3.50, 'maybe'];

  expect(intervalTier.entryList.length).toEqual(4);
  intervalTier.insertEntry(newInterval);
  expect(intervalTier.entryList.length).toEqual(5);
  expect(intervalTier.entryList).toContain(newInterval);
})

test('intervalTier.insertEntry can replace existing points with flag', () => {
  let spy = jest.spyOn(global.console, 'log').mockImplementation(() => {});

  let tg = getPrefabTextgrid();
  let intervalTier = tg.tierDict['speaker 1'];
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
  let tg = getPrefabTextgrid();
  let intervalTier = tg.tierDict['speaker 1'];
  let newInterval = [0.73, 0.95, 'Sarah'];

  expect(() => {
    intervalTier.insertEntry(newInterval);
  }).toThrowError("Attempted to insert interval [0.73,0.95,Sarah] into tier 'speaker 1' of textgrid but overlapping entries [0.73,1.02,Ichiro] already exist.");
})

test('intervalTier.insertEntry can merge into existing points with flag', () => {
  let tg = getPrefabTextgrid();
  let intervalTier = tg.tierDict['speaker 1'];
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
  let tg = getPrefabTextgrid();
  let pointTier = tg.tierDict['pitch vals'];
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
  let tg = getPrefabTextgrid();
  let intervalTier = tg.tierDict['speaker 1'];
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

  let newStart = 1.1;
  let newStop = 1.5;

  expect(tg.minTimestamp).toEqual(0.73);
  expect(tg.maxTimestamp).toEqual(4.53);

  let newTg = tg.crop(1.1, 1.5, 'strict', true);

  expect(newTg.minTimestamp).toEqual(0);
  expect(newTg.maxTimestamp).toBeCloseTo(newStop - newStart);
})

test('pointTier.editTimestamps() throws error on overshoot with flag', () => {
  let tg = getPrefabTextgrid();
  let tier = tg.tierDict['pitch vals'];

  expect(() => {
    tier.editTimestamps(100.0, false);
  }).toThrowError("Attempted to change [0.9,120] to [100.9,120] in tier 'pitch vals' however, this exceeds the bounds (0.9,1.79).");
})

test('intervalTier.editTimestamps() throws error on overshoot with flag', () => {
  let tg = getPrefabTextgrid();
  let tier = tg.tierDict['speaker 1'];

  expect(() => {
    tier.editTimestamps(100.0, false);
  }).toThrowError("Attempted to change [0.73,1.02,Ichiro] to [100.73,101.02,Ichiro] in tier 'speaker 1' however, this exceeds the bounds (0.73,1.91).");
})
