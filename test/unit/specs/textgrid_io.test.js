import fs from 'fs';

import {
  parseTextgrid, serializeTextgrid, serializeTextgridToCsv,
  decodeBuffer, IntervalTier, Textgrid, prepTgForSaving,
  INTERVAL_TIER, POINT_TIER
} from '../../../lib';

function entriesAreEqual (entryA, entryB, tierType) {
  expect([INTERVAL_TIER, POINT_TIER]).toContain(tierType);

  if (tierType === INTERVAL_TIER) {
    expect(entryA[0]).toBeCloseTo(entryB[0]);
    expect(entryA[1]).toBeCloseTo(entryB[1]);
    expect(entryA[2]).toEqual(entryB[2]);
  }
  else if (tierType === POINT_TIER) {
    expect(entryA[0]).toBeCloseTo(entryB[0]);
    expect(entryA[1]).toEqual(entryB[1]);
  }
}

function tiersAreEqual (tierA, tierB) {
  expect(tierA.minTimestamp).toBeCloseTo(tierB.minTimestamp);
  expect(tierA.maxTimestamp).toBeCloseTo(tierB.maxTimestamp);
  expect(tierA.maxTimestamp).not.toBe(0);
  expect(tierA.maxTimestamp).not.toBe(null);

  expect(tierA.tierType).toEqual(tierB.tierType);
  expect(tierA.entryList.length).toEqual(tierB.entryList.length);
  expect(tierA.entryList.length).not.toBe(0);

  for (let i = 0; i < tierA.entryList.length; i++) {
    entriesAreEqual(tierA.entryList[i], tierB.entryList[i], tierA.tierType);
  }
}

function textgridsAreEqual (tgA, tgB) {
  expect(tgA.minTimestamp).toBeCloseTo(tgB.minTimestamp);
  expect(tgA.maxTimestamp).toBeCloseTo(tgB.maxTimestamp);
  expect(tgA.maxTimestamp).not.toBe(0);
  expect(tgA.maxTimestamp).not.toBe(null);

  expect(tgA.tierNameList).toEqual(tgB.tierNameList);
  expect(tgA.tierNameList.length).not.toBe(0);

  for (let i = 0; i < tgA.tierNameList.length; i++) {
    const tierName = tgA.tierNameList[i];
    tiersAreEqual(tgA.tierDict[tierName], tgB.tierDict[tierName]);
  }
}

test('converting from a textgrid file to an instance and back yields the same data', () => {
  const textgridBuffer = fs.readFileSync('./test/assets/mary.TextGrid');
  const textgridText = decodeBuffer(textgridBuffer);
  const tg = parseTextgrid(textgridText);
  const outputTextgridText = serializeTextgrid(tg);

  expect(outputTextgridText).toBe(textgridText);
});

test('converting from a long textgrid file to an instance and back yields the same data', () => {
  const textgridBuffer = fs.readFileSync('./test/assets/mary_long.TextGrid');
  const textgridText = decodeBuffer(textgridBuffer);
  const tg = parseTextgrid(textgridText);
  const outputTextgridText = serializeTextgrid(tg, 0, null, null, false);

  expect(outputTextgridText).toBe(textgridText);
})

test('buffers and text can be parsed by parseTextgrid', () => {
  // reading as text won't work with praat's default output of utf16be, but such files can still be read as buffers
  const textgridBuffer = fs.readFileSync('./test/assets/mary.TextGrid');
  const textgridText = fs.readFileSync('./test/assets/mary.TextGrid', 'utf8');

  const tgFromBuffer = parseTextgrid(textgridBuffer);
  const tgFromText = parseTextgrid(textgridText);

  textgridsAreEqual(tgFromBuffer, tgFromText);
});

test('serializing a Textgrid instance to csv should work', () => {
  const textgrid = fs.readFileSync('./test/assets/mary.TextGrid');
  const tg = parseTextgrid(textgrid);
  const serializedCsv = serializeTextgridToCsv(tg, 'word');

  // A known 'good' csv file
  const savedCsv = fs.readFileSync('./test/assets/mary.csv', 'utf8');

  expect(serializedCsv).toEqual(savedCsv);
});

test('if two textgrid files are the same except one is short and one is normal, the parsed instances should be equal', () => {
  const normalTgBuffer = fs.readFileSync('./test/assets/mary_long.TextGrid');
  const normalTg = parseTextgrid(normalTgBuffer);

  const shortTgBuffer = fs.readFileSync('./test/assets/mary.TextGrid');
  const shortTg = parseTextgrid(shortTgBuffer);

  textgridsAreEqual(normalTg, shortTg);
});

test('removeUltrashortIntervals does nothing if there are no short intervals', () => {
  const userEntryList = [[0.4, 0.6, 'A'], [0.8, 1.0, 'E'], [1.2, 1.3, 'I']];
  const expectedEntryList = [
    [0.0, 0.4, ''], [0.4, 0.6, 'A'], [0.6, 0.8, ''], [0.8, 1.0, 'E'],
    [1.0, 1.2, ''], [1.2, 1.3, 'I'], [1.3, 2.0, '']
  ];
  const tier = new IntervalTier('test', userEntryList, 0, 2.0);
  const tg = new Textgrid();
  tg.addTier(tier);

  const expectedTier = new IntervalTier('test', expectedEntryList, 0, 2.0);
  const cleanedTg = prepTgForSaving(tg);
  const cleanedTier = cleanedTg.tierDict[cleanedTg.tierNameList[0]];

  tiersAreEqual(expectedTier, cleanedTier, INTERVAL_TIER);
});

test('prepTgForSaving respects a minimum timestamp if there is one', () => {
  const userEntryList = [[0.4, 0.6, 'A'], [0.8, 1.0, 'E'], [1.2, 1.3, 'I']];
  const expectedEntryList = [
    [0.3, 0.4, ''], [0.4, 0.6, 'A'], [0.6, 0.8, ''], [0.8, 1.0, 'E'],
    [1.0, 1.2, ''], [1.2, 1.3, 'I'], [1.3, 2.0, '']
  ];
  const tier = new IntervalTier('test', userEntryList, 0.3, 2.0);
  const tg = new Textgrid();
  tg.addTier(tier);

  const expectedTier = new IntervalTier('test', expectedEntryList, 0.3, 2.0);
  const cleanedTg = prepTgForSaving(tg);
  const cleanedTier = cleanedTg.tierDict[cleanedTg.tierNameList[0]];

  tiersAreEqual(expectedTier, cleanedTier, INTERVAL_TIER);
});

test('prepTgForSaving with forcing a minimum timestamp', () => {
  const userEntryList = [[0.4, 0.6, 'A'], [0.8, 1.0, 'E'], [1.2, 1.3, 'I']];
  const expectedEntryList = [
    [0.0, 0.4, ''], [0.4, 0.6, 'A'], [0.6, 0.8, ''], [0.8, 1.0, 'E'],
    [1.0, 1.2, ''], [1.2, 1.3, 'I'], [1.3, 2.0, '']
  ];
  const tier = new IntervalTier('test', userEntryList, 0.3, 2.0);
  const tg = new Textgrid();
  tg.addTier(tier);

  const expectedTier = new IntervalTier('test', expectedEntryList, 0, 2.0);
  const cleanedTg = prepTgForSaving(tg, null, 0);
  const cleanedTier = cleanedTg.tierDict[cleanedTg.tierNameList[0]];

  tiersAreEqual(expectedTier, cleanedTier, INTERVAL_TIER);
});

test('prepTgForSaving with forcing a maximum timestamp', () => {
  const userEntryList = [[0.4, 0.6, 'A'], [0.8, 1.0, 'E'], [1.2, 1.3, 'I']];
  const expectedEntryList = [
    [0.0, 0.4, ''], [0.4, 0.6, 'A'], [0.6, 0.8, ''], [0.8, 1.0, 'E'],
    [1.0, 1.2, ''], [1.2, 1.3, 'I'], [1.3, 3.0, '']
  ];
  const tier = new IntervalTier('test', userEntryList, 0, 2.0);
  const tg = new Textgrid();
  tg.addTier(tier);

  const expectedTier = new IntervalTier('test', expectedEntryList, 0, 3.0);
  const cleanedTg = prepTgForSaving(tg, null, 0, 3.0);
  const cleanedTier = cleanedTg.tierDict[cleanedTg.tierNameList[0]];

  tiersAreEqual(expectedTier, cleanedTier, INTERVAL_TIER);
});

test('prepTgForSaving raises exception if minTimestamp is too large', () => {
  const userEntryList = [[0.4, 0.6, 'A'], [0.8, 1.0, 'E'], [1.2, 1.3, 'I']];
  const tier = new IntervalTier('test', userEntryList, 0, 2.0);
  const tg = new Textgrid();
  tg.addTier(tier);

  expect(() => {
    prepTgForSaving(tg, null, 1.0, null);
  }).toThrowError('Tier data is before the tier start time.');
});

test('prepTgForSaving raises exception if maxTimestamp is too small', () => {
  const userEntryList = [[0.4, 0.6, 'A'], [0.8, 1.0, 'E'], [1.2, 1.3, 'I']];
  const tier = new IntervalTier('test', userEntryList, 0, 2.0);
  const tg = new Textgrid();
  tg.addTier(tier);

  expect(() => {
    prepTgForSaving(tg, null, null, 1.0);
  }).toThrowError('Tier data is after the tier end time.');
});

test('prepTgForSaving raises exception if maxTimestamp is too small', () => {
  const userEntryList = [[0.35, 0.6, 'A'], [0.8, 1.0, 'E'], [1.2, 1.3, 'I']];
  const expectedEntryList = [
    [0.3, 0.6, 'A'], [0.6, 0.8, ''], [0.8, 1.0, 'E'],
    [1.0, 1.2, ''], [1.2, 1.3, 'I'], [1.3, 2.0, '']
  ];

  const tier = new IntervalTier('test', userEntryList, 0.3, 2.0);
  const tg = new Textgrid();
  tg.addTier(tier);

  const expectedTier = new IntervalTier('test', expectedEntryList, 0.3, 2.0);
  const cleanedTg = prepTgForSaving(tg, 0.06);
  const cleanedTier = cleanedTg.tierDict[cleanedTg.tierNameList[0]];

  tiersAreEqual(expectedTier, cleanedTier, INTERVAL_TIER);
});
