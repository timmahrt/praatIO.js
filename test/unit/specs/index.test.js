// THIS IS PROBABLY NOT HOW TO GO ABOUT TESTING INDEX.js
import {
  Textgrid, IntervalTier, PointTier,
  // functions that modify
  appendTextgrid, appendTier,
  cropTextgrid, cropTier,
  editTextgridTimestamps, editTierTimestamps,
  eraseRegionFromTextgrid, eraseRegionFromTier,
  insertSpaceIntoTextgrid, insertSpaceIntoTier,
  mergeTextgridTiers,
  takeTierUnion, takeIntervalTierDifference, takeIntervalTierIntersection,
  // functions that compare
  compareTextgrids, compareTiers, compareEntries,
  comparePoints, compareIntervals,
  // deep copy functions
  copyTextgrid, copyTier,
  // query functions
  getValuesAtPoints, getValuesInIntervals, getEntriesInInterval,
  getNonEntriesFromIntervalTier, findLabelInTier,
  // exceptions
  TierExistsException, TierCreationException, TextgridCollisionException,
  IndexException,
  NonMatchingTiersException, OvershootModificationException, IncorrectArgumentException,
  // constants
  INTERVAL_TIER, POINT_TIER, MIN_INTERVAL_LENGTH,
  // from textgrid_io
  parseTextgrid, serializeTextgrid, serializeTextgridToCsv, decodeBuffer,
  prepTgForSaving,
  // from utils
  doIntervalsOverlap, isClose, sortCompareEntriesByTime,
  entryListToTree, findIntervalAtTime, findPointAtTime
} from '../../../lib';

test('can import everything exported by praatio.js with no problem', () => {
  expect(Textgrid).not.toEqual(undefined);
  expect(IntervalTier).not.toEqual(undefined);
  expect(PointTier).not.toEqual(undefined);
  // functions that modify
  expect(appendTextgrid).not.toEqual(undefined);
  expect(appendTier).not.toEqual(undefined);
  expect(cropTextgrid).not.toEqual(undefined);
  expect(cropTier).not.toEqual(undefined);
  expect(editTextgridTimestamps).not.toEqual(undefined);
  expect(editTierTimestamps).not.toEqual(undefined);
  expect(eraseRegionFromTextgrid).not.toEqual(undefined);
  expect(eraseRegionFromTier).not.toEqual(undefined);
  expect(insertSpaceIntoTextgrid).not.toEqual(undefined);
  expect(insertSpaceIntoTier).not.toEqual(undefined);
  expect(mergeTextgridTiers).not.toEqual(undefined);
  expect(takeTierUnion).not.toEqual(undefined);
  expect(takeIntervalTierDifference).not.toEqual(undefined);
  expect(takeIntervalTierIntersection).not.toEqual(undefined);
  // functions that compare
  expect(compareTextgrids).not.toEqual(undefined);
  expect(compareTiers).not.toEqual(undefined);
  expect(compareEntries).not.toEqual(undefined);
  expect(comparePoints).not.toEqual(undefined);
  expect(compareIntervals).not.toEqual(undefined);
  // deep copy functions
  expect(copyTextgrid).not.toEqual(undefined);
  expect(copyTier).not.toEqual(undefined);
  // query functions
  expect(getValuesAtPoints).not.toEqual(undefined);
  expect(getValuesInIntervals).not.toEqual(undefined);
  expect(getEntriesInInterval).not.toEqual(undefined);
  expect(getNonEntriesFromIntervalTier).not.toEqual(undefined);
  expect(findLabelInTier).not.toEqual(undefined);
  // exceptions
  expect(TierExistsException).not.toEqual(undefined);
  expect(TierCreationException).not.toEqual(undefined);
  expect(TextgridCollisionException).not.toEqual(undefined);
  expect(IndexException).not.toEqual(undefined);
  expect(NonMatchingTiersException).not.toEqual(undefined);
  expect(OvershootModificationException).not.toEqual(undefined);
  expect(IncorrectArgumentException).not.toEqual(undefined);
  // constants
  expect(INTERVAL_TIER).not.toEqual(undefined);
  expect(POINT_TIER).not.toEqual(undefined);
  expect(MIN_INTERVAL_LENGTH).not.toEqual(undefined);
  // from textgrid_io
  expect(parseTextgrid).not.toEqual(undefined);
  expect(serializeTextgrid).not.toEqual(undefined);
  expect(serializeTextgridToCsv).not.toEqual(undefined);
  expect(decodeBuffer).not.toEqual(undefined);
  expect(prepTgForSaving).not.toEqual(undefined);
  // from utils
  expect(doIntervalsOverlap).not.toEqual(undefined);
  expect(isClose).not.toEqual(undefined);
  expect(sortCompareEntriesByTime).not.toEqual(undefined);
  expect(entryListToTree).not.toEqual(undefined);
  expect(findIntervalAtTime).not.toEqual(undefined);
  expect(findPointAtTime).not.toEqual(undefined);
});
