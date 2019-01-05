import fs from 'fs';
import { INTERVAL_TIER, POINT_TIER } from '../../../textgrid.js';
import { parseTextgrid, serializeTextgrid, serializeTextgridToCsv, decodeBuffer } from '../../../textgrid_io.js';

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
    let tierName = tgA.tierNameList[i];
    tiersAreEqual(tgA.tierDict[tierName], tgB.tierDict[tierName]);
  }
}

test('converting from a textgrid file to an instance and back yields the same data', () => {
  let textgridBuffer = fs.readFileSync('./test/assets/mary.TextGrid');
  let textgridText = decodeBuffer(textgridBuffer);
  let tg = parseTextgrid(textgridText);
  let outputTextgridText = serializeTextgrid(tg);

  expect(outputTextgridText).toBe(textgridText);
});

test('buffers and text can be parsed by parseTextgrid', () => {
  let textgridBuffer = fs.readFileSync('./test/assets/mary.TextGrid');
  let textgridText = fs.readFileSync('./test/assets/mary.TextGrid', 'utf8');

  let tgFromBuffer = parseTextgrid(textgridBuffer);
  let tgFromText = parseTextgrid(textgridText);

  textgridsAreEqual(tgFromBuffer, tgFromText);
});

test('serializing a Textgrid instance to csv should work', () => {
  let textgrid = fs.readFileSync('./test/assets/mary.TextGrid');
  let tg = parseTextgrid(textgrid);
  let serializedCsv = serializeTextgridToCsv(tg, 'word');

  // A known 'good' csv file
  let savedCsv = fs.readFileSync('./test/assets/mary.csv', 'utf8');

  expect(serializedCsv).toEqual(savedCsv);
});

test('if two textgrid files are the same except one is short and one is normal, the parsed instances should be equal', () => {
  let normalTgBuffer = fs.readFileSync('./test/assets/mary_long.TextGrid');
  let normalTg = parseTextgrid(normalTgBuffer);

  let shortTgBuffer = fs.readFileSync('./test/assets/mary.TextGrid');
  let shortTg = parseTextgrid(shortTgBuffer);

  textgridsAreEqual(normalTg, shortTg);
});
