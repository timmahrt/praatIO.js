/*
Written by Tim Mahrt
March 25, 2015
*/

import { doIntervalsOverlap, isClose, sortCompareEntriesByTime, entryListToTree, findIntervalAtTime, findPointAtTime } from './utils.js';

const INTERVAL_TIER = 'IntervalTier';
const POINT_TIER = 'TextTier';
const MIN_INTERVAL_LENGTH = 0.00000001; // Arbitrary threshold

class NonMatchingTiersException extends Error {};

class IncorrectArgumentException extends Error {
  constructor (value, targetValueList, ...args) {
    super(...args);
    this.value = value;
    this.targetValueList = targetValueList;
    this.message = `Expected value '${this.value}'to be one value in [${this.targetValueList}].`
  }
}

class NonOverlappingRegionException extends Error {
  constructor (intervalA, intervalB, ...args) {
    super(...args);
    this.intervalA = intervalA;
    this.intervalB = intervalB;
    this.message = `For target operation, interval [${intervalA}] must overlap with interval [${intervalB}]`
  }
}

class TierExistsException extends Error {
  constructor (tierName, ...args) {
    super(...args);
    this.tierName = tierName;
    this.message = `Tier name ${tierName} already exists in textgrid`;
  }
};

class TierCreationException extends Error {
  constructor (errStr, ...args) {
    super(...args);
    this.errStr = errStr;
    this.message = "Couldn't create tier: " + errStr;
  }
};

class TextgridCollisionException extends Error {
  constructor (tierName, entry, matchList, ...args) {
    super(...args);
    this.tierName = tierName;
    this.entry = entry;
    this.matchList = matchList;
    this.message = `Attempted to insert interval [${entry}] into tier '${tierName}' of textgrid but overlapping entries [${matchList}] already exist.`;
  }
};

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

class IndexException extends Error {
  constructor (indexVal, listLength, ...args) {
    super(...args);
    this.indexVal = indexVal;
    this.listLength = listLength;
    this.message = `Attempted to index a list of length ${listLength} with index ${indexVal}.`;
  }
};

class TextgridTier {
  constructor (name, entryList, minT, maxT) {
    // Don't allow a timeless tier to exist
    if (minT === null || maxT === null) {
      throw new TierCreationException('All textgrid tiers must have a min and max timestamp');
    }

    this.name = name;
    this.entryList = entryList;
    this.minTimestamp = minT;
    this.maxTimestamp = maxT;
    this.tierType = null;
    this.sort()
  }

  appendTier (tier) {
    if (this.tierType !== tier.tierType) {
      throw new NonMatchingTiersException('Tier types must match when appending tiers.');
    }
    let minTime = this.minTimestamp;
    let maxTime = this.maxTimestamp + tier.maxTimestamp;

    let appendTier = tier.editTimestamps(this.maxTimestamp, true);
    let entryList = this.entryList.concat(appendTier.entryList);

    return this.newCopy({
      name: this.name,
      entryList: entryList,
      minTimestamp: minTime,
      maxTimestamp: maxTime
    });
  }

  deleteEntry (entry) {
    let deleteI = -1;
    for (let i = 0; i < this.entryList.length; i++) {
      if (this.entriesAreEqual(this.entryList[i], entry)) {
        deleteI = i;
        break;
      }
    }

    if (deleteI === -1) {
      throw new IndexException(deleteI, this.entryList.length);
    }

    this.entryList.splice(deleteI, 1);
  }

  equals (tier) {
    let isEqual = true;
    isEqual &= this.name === tier.name;
    isEqual &= isClose(this.minTimestamp, tier.minTimestamp);
    isEqual &= isClose(this.maxTimestamp, tier.maxTimestamp);
    isEqual &= this.entryList.length === tier.entryList.length;

    if (isEqual) {
      for (let i = 0; i < this.entryList.length; i++) {
        isEqual &= this.entriesAreEqual(this.entryList[i], tier.entryList[i]);
      }
    }

    return !!isEqual;
  }

  eraseRegion (start, stop, doShrink, collisionCode) {
    let retTier;

    let codeList = ['strict', 'truncated'];
    if (!codeList.includes(collisionCode)) {
      throw new IncorrectArgumentException(collisionCode, codeList);
    }

    // erase region is in the middle of the textgrid
    if (start > this.minTimestamp && stop < this.maxTimestamp) {
      let leftCrop = this.crop(this.minTimestamp, start, collisionCode, false);

      if (doShrink === true) {
        let rightCrop = this.crop(stop, this.maxTimestamp, collisionCode, true);
        retTier = leftCrop.appendTier(rightCrop);
      }
      else {
        let rightCrop = this.crop(stop, this.maxTimestamp, collisionCode, false);
        retTier = leftCrop.union(rightCrop);
      }
    }
    // erase region is either at the start or end of the textgrid
    else {
      if (start > this.minTimestamp && stop >= this.maxTimestamp) {
        retTier = this.crop(this.minTimestamp, start, collisionCode, false);
      }
      else if (start <= this.minTimestamp && stop < this.maxTimestamp) {
        retTier = this.crop(stop, this.maxTimestamp, collisionCode, false);
        if (doShrink === true) {
          retTier = retTier.editTimestamps(-1 * stop, true);
        }
      }
      else {
        retTier = this.newCopy({ 'entryList': [] });
      }
    }
    return retTier;
  }

  /** Returns the indexes of the entries that match the search label */
  find (searchLabel, mode = null) {
    let cmprFunc;
    if (mode === 're') {
      cmprFunc = (text, reStr) => { return RegExp(reStr).test(text) };
    }
    else if (mode === 'substr') {
      cmprFunc = (text, subStr) => { return text.includes(subStr) };
    }
    else {
      cmprFunc = (text, searchText) => { return text === searchText };
    }

    // Run the search
    let returnList = [];
    for (let i = 0; i < this.entryList.length; i++) {
      if (cmprFunc(this.entryList[i][this.labelIndex], searchLabel)) returnList.push(i);
    }
    return returnList;
  }

  newCopy ({
    name = null,
    entryList = null,
    minTimestamp = null,
    maxTimestamp = null
  } = {}) {
    if (name === null) name = this.name;
    if (entryList === null) entryList = this.entryList.map(entry => entry.slice());
    if (minTimestamp === null) minTimestamp = this.minTimestamp;
    if (maxTimestamp === null) maxTimestamp = this.maxTimestamp;

    return new this.constructor(name, entryList, minTimestamp, maxTimestamp);
  }

  sort () {
    this.entryList.sort(sortCompareEntriesByTime);
  }

  union (tier) {
    let retTier = this.newCopy();

    for (let i = 0; i < tier.entryList.length; i++) {
      retTier.insertEntry(tier.entryList[i], false, 'merge');
    }

    retTier.sort();
    return retTier;
  }
}

class PointTier extends TextgridTier {
  constructor (name, entryList, minT = null, maxT = null) {
    entryList = entryList.map(([timeV, label]) => [parseFloat(timeV), label]);

    // Determine the min and max timestamps
    let timeList = entryList.map(entry => entry[0]);
    if (minT !== null) timeList.push(parseFloat(minT));
    if (timeList.length > 0) minT = Math.min(...timeList);

    if (maxT !== null) timeList.push(parseFloat(maxT));
    if (timeList.length > 0) maxT = Math.max(...timeList);

    // Finish intialization
    super(name, entryList, minT, maxT);
    this.tierType = POINT_TIER;
    this.labelIndex = 1;
  }

  crop (cropStart, cropEnd, mode, rebaseToZero) {
    /*
    Creates a new tier containing all entires inside the new interval

    mode is ignored.  This parameter is kept for compatibility with
    IntervalTier.crop()
    */
    let newEntryList = [];

    for (let i = 0; i < this.entryList.length; i++) {
      let timestamp = this.entryList[i][0];
      if (timestamp >= cropStart && timestamp <= cropEnd) newEntryList.push(this.entryList[i]);
    }

    let minT = cropStart;
    let maxT = cropEnd;
    if (rebaseToZero === true) {
      newEntryList = newEntryList.map(entry => [entry[0] - cropStart, entry[1]]);
      minT = 0;
      maxT = cropEnd - cropStart;
    }

    let subTier = new PointTier(this.name, newEntryList, minT, maxT);
    return subTier;
  }

  editTimestamps (offset, allowOvershoot = false) {
    let newEntryList = []
    for (let i = 0; i < this.entryList.length; i++) {
      let entry = this.entryList[i];
      let newTime = entry[0] + offset;
      let newEntry = [newTime, entry[1]];

      if (allowOvershoot === false) {
        if (newTime < this.minTimestamp || newTime > this.maxTimestamp) {
          throw new OvershootModificationException(this.name, entry, newEntry, this.minTimestamp, this.maxTimestamp);
        }
      }

      newEntryList.push(newEntry);
    }

    let newTimeList = newEntryList.map(entry => entry[0]);
    let newMin = Math.min(...newTimeList);
    let newMax = Math.max(...newTimeList);

    if (this.minTimestamp < newMin) newMin = this.minTimestamp;
    if (this.maxTimestamp > newMax) newMax = this.maxTimestamp;

    return new PointTier(this.name, newEntryList, newMin, newMax);
  }

  entriesAreEqual (entryA, entryB) {
    let isEqual = true;
    isEqual &= isClose(entryA[0], entryB[0]);
    isEqual &= entryA[1] === entryB[1];
    return !!isEqual;
  }

  getValuesAtPoints (dataTupleList, fuzzyMatching) {
    /*
    Get the values that occur at points in the point tier

    If fuzzyMatching is True, if there is not a feature value
    at a point, the nearest feature value will be taken.

    The procedure assumes that all data is ordered in time.
    dataTupleList should be in the form
    [(t1, v1a, v1b, ..), (t2, v2a, v2b, ..), ..]
    */
    let searchTree = entryListToTree(this.entryList);

    let returnList = [];
    for (let i = 0; i < dataTupleList.length; i++) {
      let currentEntry = dataTupleList[i];
      if (findPointAtTime(currentEntry, searchTree, fuzzyMatching) !== null) {
        returnList.push(currentEntry);
      }
    }

    return returnList;
  }

  insertEntry (entry, warnFlag = true, collisionCode = null) {
    let startTime = entry[0];

    let match = null;
    for (let i = 0; i < this.entryList.length; i++) {
      if (isClose(startTime, this.entryList[i][0])) {
        match = this.entryList[i];
        break;
      }
    }

    if (!match) {
      this.entryList.push(entry);
    }
    else if (collisionCode && collisionCode.toLowerCase() === 'replace') {
      this.deleteEntry(match);
      this.entryList.push(entry);
    }
    else if (collisionCode && collisionCode.toLowerCase() === 'merge') {
      let newEntry = [match[0], [match[1], entry[1]].join('-')];
      this.deleteEntry(match)
      this.entryList.push(newEntry)
    }
    else {
      throw new TextgridCollisionException(this.name, entry, match);
    }

    this.sort();

    if (match && warnFlag === true) {
      let msg = `Collision warning for [${entry}] with items [${match}] of tier '${this.name}'`;
      console.log(msg);
    }
  }

  insertSpace (start, duration, collisionCode) {
    /*
    Inserts a region into the tier

    collisionCode: Ignored for the moment (added for compatibility
                   with insertSpace() for Interval Tiers)
    */
    let newEntryList = [];
    for (let i = 0; i < this.entryList.length; i++) {
      let entry = this.entryList[i];
      if (entry[0] <= start) {
        newEntryList.push(entry);
      }
      else if (entry[0] > start) {
        newEntryList.push([entry[0] + duration, entry[1]])
      }
    }

    return this.newCopy({ 'entryList': newEntryList, 'maxTimestamp': this.maxTimestamp + duration })
  }
}

class IntervalTier extends TextgridTier {
  constructor (name, entryList, minT = null, maxT = null) {
    entryList = entryList.map(([startTime, endTime, label]) => [parseFloat(startTime), parseFloat(endTime), label]);

    // Determine the min and max timestamps
    let startTimeList = entryList.map(entry => entry[0]);
    if (minT !== null) startTimeList.push(parseFloat(minT));
    if (startTimeList.length > 0) minT = Math.min(...startTimeList);

    let endTimeList = entryList.map(entry => entry[1]);
    if (maxT !== null) endTimeList.push(parseFloat(maxT));
    if (endTimeList.length > 0) maxT = Math.max(...endTimeList);

    // Finish initialization
    super(name, entryList, minT, maxT);
    this.tierType = INTERVAL_TIER;
    this.labelIndex = 2;
  }

  crop (cropStart, cropEnd, mode, rebaseToZero) {
    /*
    Creates a new tier with all entries that fit inside the new interval

    mode = {'strict', 'lax', 'truncated'}
        If 'strict', only intervals wholly contained by the crop
            interval will be kept
        If 'lax', partially contained intervals will be kept
        If 'truncated', partially contained intervals will be
            truncated to fit within the crop region.

    If rebaseToZero is true, the cropped textgrid values will be
        subtracted by the cropStart
    */
    let newEntryList = [];
    for (let i = 0; i < this.entryList.length; i++) {
      let entry = this.entryList[i];
      let matchedEntry = null;

      let intervalStart = entry[0];
      let intervalEnd = entry[1];
      let intervalLabel = entry[2];

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
    let croppedTier = new IntervalTier(this.name, newEntryList, minT, maxT);

    return croppedTier;
  }

  difference (tier) {
    /*
    Takes the set difference of this tier and the given one

    Any overlapping portions of entries with entries in this textgrid
    will be removed from the returned tier.
    */
    let retTier = this.newCopy();

    this.entryList.forEach((entry) => {
      retTier.eraseRegion(entry[0], entry[1], false, 'truncated');
    });

    return retTier;
  }

  editTimestamps (offset, allowOvershoot = false) {
    let newEntryList = []
    for (let i = 0; i < this.entryList.length; i++) {
      let entry = this.entryList[i];
      let newStart = entry[0] + offset;
      let newStop = entry[1] + offset;
      let newEntry = [newStart, newStop, entry[2]];

      if (allowOvershoot === false) {
        if (newStart < this.minTimestamp || newStop > this.maxTimestamp) {
          throw new OvershootModificationException(this.name, entry, newEntry, this.minTimestamp, this.maxTimestamp);
        }
      }

      newEntryList.push(newEntry);
    }

    let newMin = Math.min(...newEntryList.map(entry => entry[0]));
    let newMax = Math.max(...newEntryList.map(entry => entry[1]));

    if (this.minTimestamp < newMin) newMin = this.minTimestamp;
    if (this.maxTimestamp > newMax) newMax = this.maxTimestamp;

    return new IntervalTier(this.name, newEntryList, newMin, newMax);
  }

  entriesAreEqual (entryA, entryB) {
    let isEqual = true;
    isEqual &= isClose(entryA[0], entryB[0]);
    isEqual &= isClose(entryA[1], entryB[1]);
    isEqual &= entryA[2] === entryB[2];
    return !!isEqual
  }

  getValuesInIntervals (dataTupleList) {
    /*
    Returns data from dataTupleList contained in labeled intervals

    dataTupleList should be of the form:
    [(time1, value1a, value1b,...), (time2, value2a, value2b...), ...]
    */
    let searchTree = entryListToTree(this.entryList);

    let returnList = [];
    for (let i = 0; i < dataTupleList.length; i++) {
      let currentEntry = dataTupleList[i];
      if (findIntervalAtTime(currentEntry, searchTree) !== null) {
        returnList.push(currentEntry);
      }
    }

    return returnList;
  }

  getNonEntries () {
    /*
    Returns the regions of the textgrid without labels
    */
    let invertedEntryList = [];
    if (this.entryList[0][0] > 0) {
      invertedEntryList.push([0, this.entryList[0][0], '']);
    }

    for (let i = 0; i < this.entryList.length - 1; i++) {
      let currEnd = this.entryList[i][1];
      let nextStart = this.entryList[i + 1][0];
      if (currEnd !== nextStart) {
        invertedEntryList.push([currEnd, nextStart, '']);
      }
    }

    if (this.entryList[-1][1] < this.maxTimestamp) {
      invertedEntryList.push([this.maxTimestamp, '']);
    }

    return invertedEntryList;
  }

  insertEntry (entry, warnFlag = false, collisionCode = null) {
    let startTime = entry[0];
    let endTime = entry[1];

    let matchList = this.crop(startTime, endTime, 'lax', false).entryList;

    if (matchList.length === 0) {
      this.entryList.push(entry);
    }
    else if (collisionCode && collisionCode.toLowerCase() === 'replace') {
      for (let i = 0; i < matchList.length; i++) {
        this.deleteEntry(matchList[i]);
      }
      this.entryList.push(entry);
    }
    else if (collisionCode && collisionCode.toLowerCase() === 'merge') {
      for (let i = 0; i < matchList.length; i++) {
        this.deleteEntry(matchList[i]);
      }
      matchList.push(entry);
      matchList.sort(sortCompareEntriesByTime);

      let startTimes = matchList.map(entry => entry[0]);
      let endTimes = matchList.map(entry => entry[1]);
      let labels = matchList.map(entry => entry[2]);

      let newEntry = [
        Math.min(...startTimes),
        Math.max(...endTimes),
        labels.join('-')
      ]

      this.entryList.push(newEntry);
    }
    else {
      throw new TextgridCollisionException(this.name, entry, matchList);
    }

    this.sort();

    if (matchList && warnFlag === true) {
      let msg = `Collision warning for [${entry}] with items [${matchList}] of tier '${this.name}'`;
      console.log(msg);
    }
  }

  insertSpace (spaceStart, duration, collisionCode) {
    /*
    Inserts a blank region into the tier

    collisionCode: in the event that an interval stradles the
                   starting point
    - 'stretch' - stretches the interval by /duration/ amount
    - 'split' - splits the interval into two--everything to the
                right of 'start' will be advanced by 'duration' seconds
    - 'no change' - leaves the interval as is with no change
    - None or any other value - IncorrectArgumentException is thrown
    */

    let codeList = ['stretch', 'split', 'no change']
    if (!codeList.includes(collisionCode)) {
      throw new IncorrectArgumentException(collisionCode, codeList);
    }

    let newEntryList = []
    for (let i = 0; i < this.entryList; i++) {
      let [start, stop, label] = this.entryList[i];

      if (stop <= spaceStart) {
        newEntryList.push([start, stop, label])
      }
      else if (start >= spaceStart) {
        newEntryList.push([start + spaceStart, stop + spaceStart + duration, label])
      }
      else if (start <= spaceStart && stop > spaceStart) {
        if (collisionCode === 'stretch') {
          newEntryList.push([start, spaceStart, label])
        }
        else if (collisionCode === 'split') {
          newEntryList.push([start, spaceStart, label])
          newEntryList.push([spaceStart + duration, stop + duration, label])
        }
        else if (collisionCode === 'no change') {
          newEntryList.push([start, stop, label])
        }
      }
    }

    return this.newCopy({ 'entryList': newEntryList, 'maxTimestamp': this.maxTimestamp + duration })
  }

  intersection (tier) {
  /*
  Takes the set intersection of this tier and the given one

  Only intervals that exist in both tiers will remain in the
  returned tier.  If intervals partially overlap, only the overlapping
  portion will be returned.
  */
    let newEntryList = [];
    for (let i = 0; i < tier.entryList; i++) {
      let entry = tier.entryList[i];
      let subTier = this.crop(entry[0], entry[1], 'truncated', false);

      // Combine the labels in the two tiers
      let stub = this.entry[2] + '-';
      let subEntryList = subTier.entryList.map((subEntry) => [subEntry[0], subEntry[1], stub + subEntry[0]]);
      newEntryList.concat(subEntryList);
    }
    let name = this.name + '-' + tier.name;
    let retTier = this.newCopy({ 'name': name, 'entryList': newEntryList });
    return retTier;
  }
}

class Textgrid {
  constructor () {
    this.tierNameList = [];
    this.tierDict = {};

    this.minTimestamp = null;
    this.maxTimestamp = null;
  }

  addTier (tier, tierIndex = null) {
    /*
    Adds a tier to the textgrid.  Added to the end, unless an index is specified.
    */
    if (Object.keys(this.tierDict).includes(tier.name)) {
      throw new TierExistsException(tier.name);
    }

    if (tierIndex === null) this.tierNameList.push(tier.name);
    else this.tierNameList.splice(tierIndex, 0, tier.name);

    this.tierDict[tier.name] = tier;

    if (this.minTimestamp === null) {
      this.minTimestamp = tier.minTimestamp;
    }
    if (this.maxTimestamp === null) {
      this.maxTimestamp = tier.maxTimestamp;
    }
    this.homogonizeMinMaxTimestamps();
  }

  homogonizeMinMaxTimestamps () {
    /*
    Makes all min and max timestamps within a textgrid the same
    */
    let minTimes = this.tierNameList.map(tierName => this.tierDict[tierName].minTimestamp);
    let maxTimes = this.tierNameList.map(tierName => this.tierDict[tierName].maxTimestamp);

    let minTimestamp = Math.min(...minTimes);
    let maxTimestamp = Math.max(...maxTimes);

    this.minTimestamp = minTimestamp;
    this.tierNameList.forEach(tierName => {
      this.tierDict[tierName].minTimestamp = minTimestamp;
    })

    this.maxTimestamp = maxTimestamp;
    this.tierNameList.forEach(tierName => {
      this.tierDict[tierName].maxTimestamp = maxTimestamp;
    })
  }

  appendTextgrid (tg, onlyMatchingNames = true) {
    /*
    Append one textgrid to the end of this one

    if onlyMatchingNames is False, tiers that don't appear in both
    textgrids will also appear
    */

    // Get all tier names with no duplicates.  Ordered first by
    // this textgrid and then by the other textgrid.
    let combinedTierNameList = this.tierNameList;
    for (let i = 0; i < tg.tierNameList.length; i++) {
      let tierName = tg.tierNameList[i];
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
      for (let i = 0; i < tg.tierNameList.length; i++) {
        let tierName = tg.tierNameList[i];
        if (this.tierNameList.includes(tierName) && tg.tierNameList.includes(tierName)) {
          finalTierNameList.push(tierName);
        }
      }
    }

    // Add tiers from this textgrid
    let retTg = new Textgrid();
    let minTimestamp = this.minTimestamp
    let maxTimestamp = this.maxTimestamp + tg.maxTimestamp
    for (let i = 0; i < finalTierNameList.length; i++) {
      let tier = this.tierDict[finalTierNameList[i]];
      tier = tier.newCopy({ 'minTimestamp': minTimestamp, 'maxTimestamp': maxTimestamp });
      retTg.addTier(tier);
    }

    // Add tiers from the other textgrid
    for (let i = 0; i < tg.tierNameList.length; i++) {
      let tierName = tg.tierNameList[i];
      if (!finalTierNameList.includes(tierName)) continue;

      let tier = tg.tierDict[tierName];
      tier = tier.newCopy({ 'minTimestamp': minTimestamp, 'maxTimestamp': maxTimestamp });
      tier = tier.editTimestamps(this.maxTimestamp);

      if (!retTg.tierNameList.includes(tierName)) {
        retTg.addTier(tier);
      }
      else {
        let combinedTier = retTg.tierDict[tierName];
        let combinedEntryList = combinedTier.entryList;
        combinedEntryList.push(...tier.entryList);

        tier = tier.newCopy({ 'entryList': tier.entryList });
        retTg.replaceTier(tierName, tier);
      }
    }

    return retTg;
  }

  crop (cropStart, cropEnd, mode, rebaseToZero) {
    /*
    Creates a textgrid where all intervals fit within the crop region

    mode = {'strict', 'lax', 'truncated'}
        If 'strict', only intervals wholly contained by the crop
            interval will be kept
        If 'lax', partially contained intervals will be kept
        If 'truncated', partially contained intervals will be
            truncated to fit within the crop region.

    If rebaseToZero is true, the cropped textgrid values will be
        subtracted by the cropStart
    */
    let newTG = new Textgrid();

    let minT = cropStart;
    let maxT = cropEnd;
    if (rebaseToZero === true) {
      minT = 0;
      maxT = cropEnd - cropStart;
    }

    newTG.minTimestamp = minT;
    newTG.maxTimestamp = maxT;
    for (let i = 0; i < this.tierNameList.length; i++) {
      let tierName = this.tierNameList[i];
      let tier = this.tierDict[tierName];
      let newTier = tier.crop(cropStart, cropEnd, mode, rebaseToZero);
      newTG.addTier(newTier);
    }

    return newTG;
  }

  equals (tg) {
    let isEqual = true;
    isEqual &= isClose(this.minTimestamp, tg.minTimestamp);
    isEqual &= isClose(this.maxTimestamp, tg.maxTimestamp);
    isEqual &= this.tierNameList.length === tg.tierNameList.length;
    for (let i = 0; i < this.tierNameList.length; i++) {
      isEqual &= this.tierNameList[i] === tg.tierNameList[i];
    }

    for (let i = 0; i < this.tierNameList.length; i++) {
      let tierName = this.tierNameList[i];
      isEqual &= this.tierDict[tierName].equals(tg.tierDict[tierName]);
    }

    return !!isEqual;
  }

  editTimestamps (offset, allowOvershoot) {
    /*
    Modifies all timestamps by a constant amount
    */
    let tg = new Textgrid();
    for (let i = 0; i < this.tierNameList; i++) {
      let tier = this.tierDict[this.tierNameList[i]];
      tier = tier.editTimestamps(offset, allowOvershoot);
      tg.addTier(tier);
    }
    return tg;
  }

  eraseRegion (start, stop, doShrink) {
    /*
    Makes a region in a tier blank (removes all contained entries)

    If 'doShrink' is True, all entries appearing after the erased interval
    will be shifted to fill the void (ie the duration of the textgrid
    will be reduced by start - stop)
    */
    let duration = stop - start;
    let maxTimestamp = this.maxTimestamp;
    if (doShrink === true) maxTimestamp -= duration;

    let newTg = new Textgrid();
    newTg.minTimestamp = this.minTimestamp;
    newTg.maxTimestamp = maxTimestamp;
    for (let i = 0; i < this.tierNameList.length; i++) {
      let tier = this.tierDict[this.tierNameList[i]];
      tier = tier.eraseRegion(start, stop, doShrink, 'truncated');
      newTg.addTier(tier);
    }

    return newTg;
  }

  insertSpace (start, stop, collisionCode) {
    /*
    Inserts a blank region into a textgrid

    Every item that occurs after /start/ will be pushed back by
    /duration/ seconds

    collisionCode: in the event that an interval stradles the
                   starting point
    - 'stretch' - stretches the interval by /duration/ amount
    - 'split' - splits the interval into two--everything to the
                right of 'start' will be advanced by 'duration' seconds
    - 'no change' - leaves the interval as is with no change
    - None or any other value - AssertionError is thrown
    */
    let duration = stop - start;
    let newTg = new Textgrid();
    newTg.minTimestamp = this.minTimestamp;
    newTg.maxTimestamp = this.maxTimestmap + duration;

    for (let i = 0; i < this.tierNameList.length; i++) {
      let tier = this.tierDict[this.tierNameList[i]];
      tier = tier.insertSpace(start, start + duration, collisionCode);
      newTg.addTier(newTg);
    }

    return newTg;
  }

  mergeTiers (includeFunc = null, tierNameList = null, preserveOtherTiers = true) {
    /*
    Combine tiers

    /includeFunc/ regulates which intervals to include in the merging
      with all others being tossed (default accepts all)

    If /tierNameList/ is none, combine all tiers.
    */
    if (tierNameList === null) {
      tierNameList = this.tierNameList;
    }

    if (includeFunc === null) {
      includeFunc = (entryList) => { return true };
    }

    // Determine the tiers to merge
    let intervalTierNameList = [];
    let pointTierNameList = [];
    for (let i = 0; i < tierNameList.length; i++) {
      let tierName = tierNameList[i];
      let tier = this.tierDict[tierName];
      if (tier instanceof IntervalTier) {
        intervalTierNameList.push(tier);
      }
      else if (tier instanceof PointTier) {
        pointTierNameList.push(tier);
      }
    }

    // Merge the interval tiers
    let intervalTier = null;
    if (intervalTierNameList.length > 0) {
      intervalTier = this.tierDict[intervalTierNameList[0]];
    }
    for (let i = 1; i < intervalTierNameList.length; i++) {
      intervalTier = intervalTier.merge(this.tierDict[intervalTierNameList[i]]);
    }

    // Merge the point tiers
    let pointTier = null;
    if (pointTierNameList.length > 0) {
      pointTier = this.tierDict[pointTierNameList[0]];
    }
    for (let i = 1; i < pointTierNameList.length; i++) {
      pointTier = pointTier.merge(this.tierDict[pointTierNameList[i]]);
    }

    // Create the final textgrid to output
    let tg = new Textgrid();
    if (intervalTier !== null) tg.addTier(intervalTier);
    if (pointTier !== null) tg.addTier(pointTier);

    tg.minTimestamp = this.minTimestamp;
    tg.maxTimestamp = this.maxTimestamp;

    return tg;
  }

  newCopy () {
    /*
    Returns a deep copy of this textgrid
    */
    let textgrid = new Textgrid();
    for (let i = 0; i < this.tierNameList.length; i++) {
      let tierName = this.tierNameList[i];
      textgrid.addTier(this.tierDict[tierName].newCopy());
    }

    textgrid.minTimestamp = this.minTimestamp;
    textgrid.maxTimestamp = this.maxTimestamp;

    return textgrid;
  }

  renameTier (oldName, newName) {
    /*
    Renames one tier.  The new name must not exist in the textgrid already.
    */
    if (Object.keys(this.tierDict).includes(newName)) {
      throw new TierExistsException(newName);
    }

    let oldTier = this.tierDict[oldName];
    let tierIndex = this.tierNameList.indexOf(oldName);
    let newTier = oldTier.newCopy({ name: newName });

    this.removeTier(oldName);
    this.addTier(newTier, tierIndex);
  }

  removeTier (name) {
    /*
    Removes the given tier from this textgrid.
    */
    this.tierNameList.splice(this.tierNameList.indexOf(name), 1);
    delete this.tierDict[name];
  }

  replaceTier (name, newTier) {
    /*
    Replace the tier with the given name with a new tier
    */
    let tierIndex = this.tierNameList.indexOf(name);
    this.removeTier(name);
    this.addTier(newTier, tierIndex);
  }
}

export {
  Textgrid, IntervalTier, PointTier,
  NonMatchingTiersException, IncorrectArgumentException,
  NonOverlappingRegionException, TierExistsException,
  TierCreationException, TextgridCollisionException,
  OvershootModificationException, IndexException,
  INTERVAL_TIER, POINT_TIER, MIN_INTERVAL_LENGTH
};
