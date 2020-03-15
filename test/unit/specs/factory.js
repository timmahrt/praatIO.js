import {
  Textgrid, IntervalTier, PointTier
} from '../../../lib';

function getIntervalTier1 () {
  const intervals1 = [
    [0.73, 1.02, 'Ichiro'],
    [1.02, 1.231, 'hit'],
    [1.33, 1.54, 'a'],
    [1.54, 1.91, 'homerun']
  ];
  return new IntervalTier('speaker 1', intervals1);
}

function getIntervalTier2 () {
  const intervals2 = [
    [3.56, 3.98, 'and'],
    [3.98, 4.21, 'Fred'],
    [4.21, 4.44, 'caught'],
    [4.44, 4.53, 'it']
  ];
  return new IntervalTier('speaker 2', intervals2);
}

function getPointTier1 () {
  const points1 = [
    [0.9, '120'],
    [1.11, '100'],
    [1.41, '110'],
    [1.79, '95']
  ];
  return new PointTier('pitch vals 1', points1);
}

function getPointTier2 () {
  const points2 = [
    [3.78, '140'],
    [4.11, '131'],
    [4.32, '135'],
    [4.49, '120']
  ]
  return new PointTier('pitch vals 2', points2);
}

function getPointTier3 () {
  const points3 = [
    [2.29, 'Door slam'],
    [2.99, 'Cough']
  ]
  return new PointTier('noises', points3)
}

function getPrefabTextgrid (tierList = null) {
  const tg = new Textgrid();

  if (!tierList) {
    const intervalTier1 = getIntervalTier1();
    const intervalTier2 = getIntervalTier2();
    const pitchTier1 = getPointTier1();
    const pitchTier2 = getPointTier2();
    const noiseTier = getPointTier3();

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

export {
  getIntervalTier1, getIntervalTier2, getPointTier1, getPointTier2,
  getPointTier3, getPrefabTextgrid, testTier
};
