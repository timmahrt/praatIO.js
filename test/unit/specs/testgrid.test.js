import { Textgrid, IntervalTier, PointTier, TierCreationException } from '../../../textgrid.js';

function getPrefabTextgrid (tierList = null) {
  let tg = new Textgrid()

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
    ]
    let pitchTier1 = new PointTier('pitch vals', points1)

    tierList = [intervalTier1, intervalTier2, pitchTier1]
  }

  for (let i = 0; i < tierList.length; i++) {
    tg.addTier(tierList[i]);
  }

  return tg
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
  }).toThrowError(TierCreationException);

  expect(() => {
    new PointTier('no points', []); // eslint-disable-line no-new
  }).toThrowError(TierCreationException);
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

  expect(tg.tierNameList.length).toBe(3);
  expect(Object.keys(tg.tierDict).length).toBe(3);
  expect(Object.keys(tg.tierDict)).toContain(tierName);

  tg.removeTier(tierName);

  expect(tg.tierNameList.length).toBe(2);
  expect(Object.keys(tg.tierDict).length).toBe(2);
  expect(Object.keys(tg.tierDict)).not.toContain(tierName);
});

test('can replace tiers', () => {
  let tg = getPrefabTextgrid();
  let newTierName = 'speaker 3';
  let oldTierName = 'speaker 1';

  expect(tg.tierNameList.length).toBe(3);
  expect(Object.keys(tg.tierDict).length).toBe(3);
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

  expect(tg.tierNameList.length).toBe(3);
  expect(Object.keys(tg.tierDict).length).toBe(3);
  expect(Object.keys(tg.tierDict)).not.toContain(oldTierName);
  expect(Object.keys(tg.tierDict)).toContain(newTierName);
})

test('can compare textgrids for equality', () => {
  let tgA = getPrefabTextgrid();
  let tgB = getPrefabTextgrid();

  expect(tgA.equals(tgB)).toBe(true);

  let tierName = 'speaker 1';
  tgA.tierDict[tierName].insertEntry([2.03, 2.35, 'maybe'], false, 'replace');

  expect(tgA.equals(tgB)).toBe(false);
});
