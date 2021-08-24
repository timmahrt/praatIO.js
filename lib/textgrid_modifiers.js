/**
 * This module contains the methods that take one or more
 * tiers or textgrids and returns a modified result.<br /><br />
 *
 * @author Tim Mahrt
 * @since March 25, 2015
 * @module textgrid_modifiers
 */

import {
  Textgrid, IntervalTier, PointTier,
  copyTier
} from './textgrid.js';

class NonMatchingTiersException extends Error {};

class OvershootModificationException extends Error {
  constructor (tierName, oldEntry, newEntry, min, max, ...args) {
    super(...args);
    this.tierName = tierName;
    this.oldEntry = oldEntry;
    this.newEntry = newEntry;
    this.min = min;
    this.max = max;
    this.message = `Attempted to change [${oldEntry}] to [${newEntry}] in tier '${tierName}' however, this exceeds the bounds (${min},${max}).`;
  }
};

class IncorrectArgumentException extends Error {
  constructor (value, targetValueList, ...args) {
    super(...args);
    this.value = value;
    this.targetValueList = targetValueList;
    this.message = `Expected value '${this.value}' to be one value in [${this.targetValueList}].`
  }
}

/**
 * Append one textgrid to the end of this one
 * @param {Textgrid} tg1 - the source textgrid
 * @param {Textgrid} tg2 - the textgrid to add on
 * @param {boolean} [onlyMatchingNames=true] - only include tiers that appear in both textgrids
 * @return {Textgrid}
 */
function appendTextgrid (tg1, tg2, onlyMatchingNames = true) {
  // Get all tier names with no duplicates.  Ordered first by
  // this textgrid and then by the other textgrid.
  const combinedTierNameList = tg1.tierNameList.slice(0);
  for (let i = 0; i < tg2.tierNameList.length; i++) {
    const tierName = tg2.tierNameList[i];
    if (!combinedTierNameList.includes(tierName)) {
      combinedTierNameList.push(tierName);
    }
  }

  // Determine the tier names that will be in the final textgrid
  let finalTierNameList = [];
  if (onlyMatchingNames === false) {
    finalTierNameList = combinedTierNameList;
  }
  else {
    for (let i = 0; i < tg2.tierNameList.length; i++) {
      const tierName = tg2.tierNameList[i];
      if (tg1.tierNameList.includes(tierName) && tg2.tierNameList.includes(tierName)) {
        finalTierNameList.push(tierName);
      }
    }
  }

  // Add tiers from this textgrid
  const retTg = new Textgrid();
  const minTimestamp = tg1.minTimestamp
  const maxTimestamp = tg1.maxTimestamp + tg2.maxTimestamp
  for (let i = 0; i < finalTierNameList.length; i++) {
    const tierName = finalTierNameList[i];
    if (!tg1.tierNameList.includes(tierName)) continue;

    let tier = tg1.tierDict[tierName];
    tier = copyTier(tier, { minTimestamp: minTimestamp, maxTimestamp: maxTimestamp });
    retTg.addTier(tier);
  }

  // Add tiers from the other textgrid
  for (let i = 0; i < finalTierNameList.length; i++) {
    const tierName = finalTierNameList[i];
    if (!tg2.tierNameList.includes(tierName)) continue;

    let tier = tg2.tierDict[tierName];
    tier = copyTier(tier, { minTimestamp: minTimestamp, maxTimestamp: maxTimestamp });
    tier = editTierTimestamps(tier, tg1.maxTimestamp);

    if (!retTg.tierNameList.includes(tierName)) {
      retTg.addTier(tier);
    }
    else {
      let combinedTier = retTg.tierDict[tierName];
      let combinedEntryList = combinedTier.entryList;
      combinedEntryList = combinedEntryList.concat(tier.entryList);

      combinedTier = copyTier(combinedTier, { entryList: combinedEntryList });
      retTg.replaceTier(tierName, combinedTier);
    }
  }
  return retTg;
}

/**
 * Add one tier to the end of another
 * @param {TextgridTier} tier1 - the base tier
 * @param {TextgridTier} tier2 - the tier to add
 * @return {TextgridTier}
 */
function appendTier (tier1, tier2) {
  if (tier1.tierType !== tier2.tierType) {
    throw new NonMatchingTiersException('Tier types must match when appending tiers.');
  }
  const minTime = tier1.minTimestamp;
  const maxTime = tier1.maxTimestamp + tier2.maxTimestamp;

  const appendTier = editTierTimestamps(tier2, tier1.maxTimestamp, true);
  const entryList = tier1.entryList.concat(appendTier.entryList);

  return copyTier(
    tier1,
    {
      name: tier1.name,
      entryList: entryList,
      minTimestamp: minTime,
      maxTimestamp: maxTime
    }
  );
}

/**
 * Creates a textgrid that only contains intervals from the crop region
 * @param {Textgrid} tg
 * @param {number} cropStart
 * @param {number} cropEnd
 * @param {string} mode - one of 'strict', 'lax', or 'truncated'
 *  If 'strict', only intervals wholly contained by the crop interval will be kept.
 *  If 'lax', partially contained intervals will be kept.
 *  If 'truncated', partially contained intervals will be truncated to fit within the crop region.
 * @param {boolean} rebaseToZero - if true, the all times in entries will be subtracted by the cropStart
 * @return {Textgrid} A new textgrid containing only entries that appear in the crop region.
 */
function cropTextgrid (tg, cropStart, cropEnd, mode, rebaseToZero) {
  const newTG = new Textgrid();

  let minT = cropStart;
  let maxT = cropEnd;
  if (rebaseToZero === true) {
    minT = 0;
    maxT = cropEnd - cropStart;
  }

  newTG.minTimestamp = minT;
  newTG.maxTimestamp = maxT;
  for (let i = 0; i < tg.tierNameList.length; i++) {
    const tierName = tg.tierNameList[i];
    const tier = tg.tierDict[tierName];
    const newTier = cropTier(tier, cropStart, cropEnd, mode, rebaseToZero);
    newTG.addTier(newTier);
  }

  return newTG;
}

/**
 * Creates a new tier containing only entries from inside the crop interval
 * @param {TextgridTier} tier
 * @param {number} cropStart
 * @param {number} cropEnd
 * @param {string} mode - mode is ignored.  This parameter is kept for compatibility with IntervalTier.crop()
 * @param {boolean} rebaseToZero - if true, all times will be subtracted by cropStart
 * @return {TextgridTier} Returns a copy of this tier with only values from the crop region.
 */
function cropTier (tier, cropStart, cropEnd, mode, rebaseToZero) {
  let croppedTier;
  if (tier instanceof PointTier) {
    croppedTier = cropPointTier(tier, cropStart, cropEnd, mode, rebaseToZero);
  }
  else if (tier instanceof IntervalTier) {
    croppedTier = cropIntervalTier(tier, cropStart, cropEnd, mode, rebaseToZero);
  }
  return croppedTier;
}

/**
 * Creates a new tier containing only entries from inside the crop interval
 * @param {PointTier} pointTier
 * @param {number} cropStart
 * @param {number} cropEnd
 * @param {string} mode - mode is ignored.  This parameter is kept for compatibility with IntervalTier.crop()
 * @param {boolean} rebaseToZero - if true, all times will be subtracted by cropStart
 * @return {PointTier} Returns a copy of this tier with only values from the crop region.
 */
function cropPointTier (pointTier, cropStart, cropEnd, mode, rebaseToZero) {
  let newEntryList = [];

  for (let i = 0; i < pointTier.entryList.length; i++) {
    const timestamp = pointTier.entryList[i][0];
    if (timestamp >= cropStart && timestamp <= cropEnd) newEntryList.push(pointTier.entryList[i]);
  }

  let minT = cropStart;
  let maxT = cropEnd;
  if (rebaseToZero === true) {
    newEntryList = newEntryList.map(entry => [entry[0] - cropStart, entry[1]]);
    minT = 0;
    maxT = cropEnd - cropStart;
  }

  const subTier = new PointTier(pointTier.name, newEntryList, minT, maxT);
  return subTier;
}

/**
 * Creates a new tier with only the entries from the crop region
 * @param {number} cropStart
 * @param {number} cropEnd
 * @param {string} number - one of 'strict', 'lax', or 'truncated'
    If 'strict', only intervals wholly contained by the crop interval will be kept.
    If 'lax', partially contained intervals will be kept.
    If 'truncated', partially contained intervals will be
        truncated to fit within the crop region.
 * @param {boolean} rebaseToZero - if true the cropped textgrid values will be subtracted by cropStart
 * @return {Textgrid} A copy of this tier with only entries from the crop region
 */
function cropIntervalTier (intervalTier, cropStart, cropEnd, mode, rebaseToZero) {
  let newEntryList = [];
  for (let i = 0; i < intervalTier.entryList.length; i++) {
    const entry = intervalTier.entryList[i];
    let matchedEntry = null;

    const intervalStart = entry[0];
    const intervalEnd = entry[1];
    const intervalLabel = entry[2];

    // Don't need to investigate if the interval is before or after
    // the crop region
    if (intervalEnd <= cropStart || intervalStart >= cropEnd) continue;

    // Determine if the current subEntry is wholly contained
    // within the superEntry
    if (intervalStart >= cropStart && intervalEnd <= cropEnd) {
      matchedEntry = entry;
    }

    // If it is only partially contained within the superEntry AND
    // inclusion is 'lax', include it anyways
    else if (mode === 'lax' && (intervalStart >= cropStart || intervalEnd <= cropEnd)) {
      matchedEntry = entry;
    }

    // If not strict, include partial tiers on the edges
    // -- regardless, record how much information was lost
    //        - for strict=true, the total time of the cut interval
    //        - for strict=false, the portion of the interval that lies
    //            outside the new interval

    // The current interval straddles the end of the new interval
    else if (intervalStart >= cropStart && intervalEnd > cropEnd) {
      if (mode === 'truncated') {
        matchedEntry = [intervalStart, cropEnd, intervalLabel];
      }
    }

    // The current interval straddles the start of the new interval
    else if (intervalStart < cropStart && intervalEnd <= cropEnd) {
      if (mode === 'truncated') {
        matchedEntry = [cropStart, intervalEnd, intervalLabel];
      }
    }

    // The current interval contains the new interval completely
    else if (intervalStart <= cropStart && intervalEnd >= cropEnd) {
      if (mode === 'lax') {
        matchedEntry = entry;
      } else if (mode === 'truncated') {
        matchedEntry = [cropStart, cropEnd, intervalLabel];
      }
    }

    if (matchedEntry !== null) {
      newEntryList.push(matchedEntry);
    }
  }

  let minT = cropStart;
  let maxT = cropEnd;
  if (rebaseToZero === true) {
    newEntryList = newEntryList.map(entryList => [entryList[0] - cropStart,
      entryList[1] - cropStart,
      entryList[2]
    ]);
    minT = 0;
    maxT = cropEnd - cropStart;
  }

  // Create subtier
  const croppedTier = new IntervalTier(intervalTier.name, newEntryList, minT, maxT);

  return croppedTier;
}

/**
 * Modifies all timestamps in the Textgrid and in the contained tiers by a constant amount
 * @param {Textgrid} tg
 * @param {number} offset - the amount to modify all timestamps by
 * @param {boolean} [allowOvershoot=false] - if false and offset pushes a value past maxTimestamp, throw an error; otherwise, lengthen the textgrid
 * @return {Textgrid}
 */
function editTextgridTimestamps (tg, offset, allowOvershoot = false) {
  const editedTg = new Textgrid();
  for (let i = 0; i < tg.tierNameList.length; i++) {
    let tier = tg.tierDict[tg.tierNameList[i]];
    tier = editTierTimestamps(tier, offset, allowOvershoot);
    editedTg.addTier(tier);
  }
  return editedTg;
}

/**
 * Modifies all timestamps by a constant amount
 * @param {TextgridTier} tier
 * @param {number} offset
 * @param {boolean} [allowOvershoot=false] - if false and offset pushes a value past maxTimestamp, throw an error; otherwise, lengthen the tier
 * @return {TextgridTier}
 */
function editTierTimestamps (tier, offset, allowOvershoot = false) {
  let editedTier;
  if (tier instanceof PointTier) {
    editedTier = editPointTierTimestamps(tier, offset, allowOvershoot);
  }
  else if (tier instanceof IntervalTier) {
    editedTier = editIntervalTierTimestamps(tier, offset, allowOvershoot);
  }
  return editedTier;
}

function editPointTierTimestamps (pointTier, offset, allowOvershoot = false) {
  const newEntryList = []
  for (let i = 0; i < pointTier.entryList.length; i++) {
    const entry = pointTier.entryList[i];
    const newTime = entry[0] + offset;
    const newEntry = [newTime, entry[1]];

    if (allowOvershoot === false) {
      if (newTime < pointTier.minTimestamp || newTime > pointTier.maxTimestamp) {
        throw new OvershootModificationException(pointTier.name, entry, newEntry, pointTier.minTimestamp, pointTier.maxTimestamp);
      }
    }

    newEntryList.push(newEntry);
  }

  const newTimeList = newEntryList.map(entry => entry[0]);
  let newMin = Math.min(...newTimeList);
  let newMax = Math.max(...newTimeList);

  if (pointTier.minTimestamp < newMin) newMin = pointTier.minTimestamp;
  if (pointTier.maxTimestamp > newMax) newMax = pointTier.maxTimestamp;

  return new PointTier(pointTier.name, newEntryList, newMin, newMax);
}

function editIntervalTierTimestamps (intervalTier, offset, allowOvershoot = false) {
  const newEntryList = []
  for (let i = 0; i < intervalTier.entryList.length; i++) {
    const entry = intervalTier.entryList[i];
    const newStart = entry[0] + offset;
    const newStop = entry[1] + offset;
    const newEntry = [newStart, newStop, entry[2]];

    if (allowOvershoot === false) {
      if (newStart < intervalTier.minTimestamp || newStop > intervalTier.maxTimestamp) {
        throw new OvershootModificationException(intervalTier.name, entry, newEntry, intervalTier.minTimestamp, intervalTier.maxTimestamp);
      }
    }

    newEntryList.push(newEntry);
  }

  let newMin = Math.min(...newEntryList.map(entry => entry[0]));
  let newMax = Math.max(...newEntryList.map(entry => entry[1]));

  if (intervalTier.minTimestamp < newMin) newMin = intervalTier.minTimestamp;
  if (intervalTier.maxTimestamp > newMax) newMax = intervalTier.maxTimestamp;

  return new IntervalTier(intervalTier.name, newEntryList, newMin, newMax);
}

/**
 * Makes a region in all tiers blank (removes all contained entries)
 * @param {TextgridTier} tg
 * @param {number} start
 * @param {number} stop
 * @param {boolean} doShrink - if true, all values after the erase region will be shifted earlier in time by (stop - start) seconds
 * @return {TextgridTier} A copy of this textgrid without entries in the specified region.
 */
function eraseRegionFromTextgrid (tg, start, stop, doShrink) {
  const duration = stop - start;
  let maxTimestamp = tg.maxTimestamp;
  if (doShrink === true) maxTimestamp -= duration;

  const newTg = new Textgrid();
  newTg.minTimestamp = tg.minTimestamp;
  newTg.maxTimestamp = maxTimestamp;
  for (let i = 0; i < tg.tierNameList.length; i++) {
    let tier = tg.tierDict[tg.tierNameList[i]];
    tier = eraseRegionFromTier(tier, start, stop, doShrink, 'truncated');
    newTg.addTier(tier);
  }
  return newTg;
}

/**
 * Makes a region in a tier blank (removes all contained entries)
 * @param {TextgridTier} tier
 * @param {number} start
 * @param {number} stop
 * @param {boolean} doShrink - if true, all values after the erase region will be shifted earlier in time by (stop - start) seconds
 * @return {TextgridTier} A copy of this tier without entries in the specified region.
 */
function eraseRegionFromTier (tier, start, stop, doShrink, collisionCode) {
  let retTier;

  const codeList = ['strict', 'truncated'];
  if (!codeList.includes(collisionCode)) {
    throw new IncorrectArgumentException(collisionCode, codeList);
  }

  // erase region is in the middle of the textgrid
  if (start > tier.minTimestamp && stop < tier.maxTimestamp) {
    const leftCrop = cropTier(tier, tier.minTimestamp, start, collisionCode, false);

    if (doShrink === true) {
      const rightCrop = cropTier(tier, stop, tier.maxTimestamp, collisionCode, true);
      retTier = appendTier(leftCrop, rightCrop);
    }
    else {
      const rightCrop = cropTier(tier, stop, tier.maxTimestamp, collisionCode, false);
      retTier = takeTierUnion(leftCrop, rightCrop);
    }
  }
  // erase region is either at the start or end of the textgrid
  else {
    if (start > tier.minTimestamp && stop >= tier.maxTimestamp) {
      retTier = cropTier(tier, tier.minTimestamp, start, collisionCode, false);
    }
    else if (start <= tier.minTimestamp && stop < tier.maxTimestamp) {
      retTier = cropTier(tier, stop, tier.maxTimestamp, collisionCode, false);
      if (doShrink === true) {
        retTier = editTierTimestamps(retTier, -1 * stop, true);
      }
    }
    else {
      retTier = copyTier(tier, { entryList: [] });
    }
  }

  if (doShrink !== true) {
    retTier.minTimestamp = tier.minTimestamp;
    retTier.maxTimestamp = tier.maxTimestamp;
  }
  return retTier;
}

/**
 * Inserts a blank region into a textgrid
 * @param {Textgrid} tg
 * @param {number} start
 * @param {number} duration - Note: every item that occurs after /start/ will be pushed back by /duration/ seconds.
 * @param {boolean} collisionCode - if /start/ occurs inside a labeled interval, this determines the behaviour.
 *  Must be one of 'stretch', 'split', or 'no change'
 *  'stretch' - stretches the interval by /duration/ amount
 *  'split' - splits the interval into two--everything to the
            right of 'start' will be advanced by 'duration' seconds
 *  'no change' - leaves the interval as is with no change
 * @return {Textgrid} A copy of this textgrid with the inserted blank region.
 */
function insertSpaceIntoTextgrid (tg, start, duration, collisionCode) {
  const newTg = new Textgrid();
  newTg.minTimestamp = tg.minTimestamp;
  newTg.maxTimestamp = tg.maxTimestmap + duration;

  for (let i = 0; i < tg.tierNameList.length; i++) {
    let tier = tg.tierDict[tg.tierNameList[i]];
    tier = insertSpaceIntoTier(tier, start, duration, collisionCode);
    newTg.addTier(tier);
  }

  return newTg;
}

/**
 * Inserts a blank region into a tier
 * @param {TextgridTier} tier
 * @param {number} start
 * @param {number} duration - Note: every item that occurs after /start/ will be pushed back by /duration/ seconds.
 * @param {boolean} collisionCode - (unused parameter for point tiers) if /start/ occurs inside a labeled interval, this determines the behaviour.
 *  Must be one of 'stretch', 'split', or 'no change'
 *  'stretch' - stretches the interval by /duration/ amount
 *  'split' - splits the interval into two--everything to the
            right of 'start' will be advanced by 'duration' seconds
 *  'no change' - leaves the interval as is with no change
 * @return {TextgridTier} A copy of this tier with the inserted blank region.
 */
function insertSpaceIntoTier (tier, start, duration, collisionCode) {
  let lengthenedTier;
  if (tier instanceof PointTier) {
    lengthenedTier = insertSpaceIntoPointTier(tier, start, duration, collisionCode);
  }
  else if (tier instanceof IntervalTier) {
    lengthenedTier = insertSpaceIntoIntervalTier(tier, start, duration, collisionCode);
  }
  return lengthenedTier;
}

function insertSpaceIntoPointTier (pointTier, start, duration, collisionCode) {
  const newEntryList = [];
  for (let i = 0; i < pointTier.entryList.length; i++) {
    const entry = pointTier.entryList[i];
    if (entry[0] <= start) {
      newEntryList.push(entry);
    }
    else if (entry[0] > start) {
      newEntryList.push([entry[0] + duration, entry[1]])
    }
  }

  return copyTier(pointTier, { entryList: newEntryList, maxTimestamp: pointTier.maxTimestamp + duration })
}

function insertSpaceIntoIntervalTier (intervalTier, start, duration, collisionCode) {
  const codeList = ['stretch', 'split', 'no change']
  if (!codeList.includes(collisionCode)) {
    throw new IncorrectArgumentException(collisionCode, codeList);
  }

  const newEntryList = [];
  for (let i = 0; i < intervalTier.entryList.length; i++) {
    const [entryStart, entryStop, label] = intervalTier.entryList[i];
    if (entryStop <= start) {
      newEntryList.push([entryStart, entryStop, label])
    }
    else if (entryStart >= start) {
      newEntryList.push([entryStart + duration, entryStop + duration, label])
    }
    else if (entryStart <= start && entryStop > start) {
      if (collisionCode === 'stretch') {
        newEntryList.push([entryStart, entryStop + duration, label])
      }
      else if (collisionCode === 'split') {
        newEntryList.push([entryStart, start, label])
        newEntryList.push([start + duration, start + duration + (entryStop - start), label])
      }
      else if (collisionCode === 'no change') {
        newEntryList.push([entryStart, entryStop, label])
      }
    }
  }

  return copyTier(intervalTier, { entryList: newEntryList, maxTimestamp: intervalTier.maxTimestamp + duration })
}

/**
 * Combine tiers in a textgrid.
 * @param {Textgrid} tg
 * @param {Array} [tierNameList=null] - The list of tier names to include in the merge.  If null, all tiers are merged.
 * @param {boolean} [preserveOtherTiers=true] - If true, keep tiers that were not merged.
 *  If false, the return textgrid will only have one merged tier for all interval tiers and one merged tier for all point tiers, if present.
 * @param {string} [intervalTierName='merged intervals']
 * @param {string} [pointTierName='merged points']
 * @return {Textgrid} A copy of the textgrid with the specified tiers merged.
 */
function mergeTextgridTiers (tg, tierNameList = null, preserveOtherTiers = true, intervalTierName = 'merged intervals', pointTierName = 'merged points') {
  if (tierNameList === null) {
    tierNameList = tg.tierNameList;
  }

  // Determine the tiers to merge
  const intervalTierNameList = [];
  const pointTierNameList = [];
  for (let i = 0; i < tierNameList.length; i++) {
    const tierName = tierNameList[i];
    const tier = tg.tierDict[tierName];
    if (tier instanceof IntervalTier) {
      intervalTierNameList.push(tierName);
    }
    else if (tier instanceof PointTier) {
      pointTierNameList.push(tierName);
    }
  }

  // Merge the interval tiers
  let intervalTier = null;
  if (intervalTierNameList.length > 0) {
    intervalTier = tg.tierDict[intervalTierNameList[0]];
    for (let i = 1; i < intervalTierNameList.length; i++) {
      intervalTier = takeTierUnion(intervalTier, tg.tierDict[intervalTierNameList[i]]);
    }
    intervalTier.name = intervalTierName;
  }

  // Merge the point tiers
  let pointTier = null;
  if (pointTierNameList.length > 0) {
    pointTier = tg.tierDict[pointTierNameList[0]];
    for (let i = 1; i < pointTierNameList.length; i++) {
      pointTier = takeTierUnion(pointTier, tg.tierDict[pointTierNameList[i]]);
    }
    pointTier.name = pointTierName;
  }

  // Add unmerged tiers
  const tierNamesToKeep = []
  if (preserveOtherTiers === true) {
    for (let i = 0; i < tg.tierNameList.length; i++) {
      const currTierName = tg.tierNameList[i];
      if (!tierNameList.includes(currTierName)) tierNamesToKeep.push(currTierName);
    }
  }

  // Create the final textgrid to output
  const retTg = new Textgrid();
  if (intervalTier !== null) retTg.addTier(intervalTier);
  if (pointTier !== null) retTg.addTier(pointTier);

  for (let i = 0; i < tierNamesToKeep.length; i++) {
    retTg.addTier(tg.tierDict[tierNamesToKeep[i]]);
  }

  retTg.minTimestamp = tg.minTimestamp;
  retTg.maxTimestamp = tg.maxTimestamp;

  return retTg;
}

/**
 * Takes the set union of two tiers.
 * All the entries in the second tier will be added to the first.
 * Overlapping entries will be merged together.
 * @params {TextgridTier} tier1 - the base tier
 * @params {TextgridTier} tier2 - the tier to union into the base tier
 * @return {TextgridTier}
 */
function takeTierUnion (tier1, tier2) {
  const retTier = copyTier(tier1);

  for (let i = 0; i < tier2.entryList.length; i++) {
    retTier.insertEntry(tier2.entryList[i], false, 'merge');
  }

  retTier.sort();
  return retTier;
}

/**
 * Takes the set difference of this tier and the given one.
 * Any overlapping portions of entries with entries in this textgrid
 * will be removed from the returned tier.
 * @params {TextgridTier} tier1 - the base tier
 * @params {TextgridTier} tier2 - the tier to take the difference of with the base tier
 * @return {TextgridTier}
 */
function takeIntervalTierDifference (tier1, tier2) {
  let retTier = copyTier(tier1);

  for (let i = 0; i < tier2.entryList.length; i++) {
    const entry = tier2.entryList[i];
    retTier = eraseRegionFromTier(retTier, entry[0], entry[1], false, 'truncated');
  }

  return retTier;
}

/**
 * Takes the set intersection of this tier and the given one.
 * Only intervals that exist in both tiers will remain in the
 * returned tier.  If intervals partially overlap, only the overlapping
 * portion will be returned.
 * @params {TextgridTier} tier1 - the base tier
 * @params {TextgridTier} tier2 - the tier to intersect the base tier with
 * @return {TextgridTier}
 */
function takeIntervalTierIntersection (tier1, tier2) {
  let newEntryList = [];
  for (let i = 0; i < tier1.entryList.length; i++) {
    const entry = tier1.entryList[i];
    const subTier = cropTier(tier2, entry[0], entry[1], 'truncated', false);

    // Combine the labels in the two tiers
    const stub = entry[2] + '-';
    const subEntryList = subTier.entryList.map((subEntry) => [subEntry[0], subEntry[1], stub + subEntry[2]]);
    newEntryList = newEntryList.concat(subEntryList);
  }
  const name = tier1.name + '-' + tier2.name;
  const retTier = copyTier(tier1, { name: name, entryList: newEntryList });
  return retTier;
}

export {
  // functions that modify
  appendTextgrid, appendTier,
  cropTextgrid, cropTier,
  editTextgridTimestamps, editTierTimestamps,
  eraseRegionFromTextgrid, eraseRegionFromTier,
  insertSpaceIntoTextgrid, insertSpaceIntoTier,
  mergeTextgridTiers,
  takeTierUnion, takeIntervalTierDifference, takeIntervalTierIntersection,
  // exceptions
  NonMatchingTiersException, OvershootModificationException, IncorrectArgumentException
};
