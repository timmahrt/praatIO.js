/*
Written by Tim Mahrt
March 25, 2015
*/

const INTERVAL_TIER = 'IntervalTier';
const POINT_TIER = 'TextTier';
const MIN_INTERVAL_LENGTH = 0.00000001; // Arbitrary threshold

function isClose (a, b, relTol = 1e-14, abs_tol = 0.0) {
  return Math.abs(a - b) <= Math.max(relTol * Math.max(Math.abs(a), Math.abs(b)), abs_tol)
}

function sortCompareEntriesByTime (x, y) {
  return x[0] - y[0];
}

class NonMatchingTiersException extends Error {};

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
  constructor (name, entry, matchList, ...args) {
    super(...args);
    this.name = name;
    this.entry = entry;
    this.matchList = matchList;
    this.message = `Attempted to insert interval ${entry} into tier ${name} of textgrid but overlapping entries ${matchList} already exist.`;
  }
};

class OvershootModificationException extends Error {
  constructor (name, oldEntry, newEntry, min, max, ...args) {
    super(...args);
    this.name = name;
    this.oldEntry = oldEntry;
    this.newEntry = newEntry;
    this.min = min;
    this.max = max;
    this.message = `Attempted to chance ${oldEntry} to ${newEntry} in tier ${name} however, this exceeds the bounds (${min}, ${max}).`;
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
      throw new TierCreationException('All textgrid tiers must have a min and max duration');
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
    if (maxT !== null) timeList.push(parseFloat(maxT));

    if (timeList.length > 0) minT = Math.min(...timeList);
    if (timeList.length > 0) maxT = Math.max(...timeList);

    // Finish intialization
    super(name, entryList, minT, maxT);
    this.tierType = POINT_TIER;
    this.labelIndex = 1;
  }

  editTimestamps (offset, allowOvershoot = false) {
    let newEntryList = []
    for (let i = 0; i < this.entryList.length; i++) {
      let entry = this.entryList[i];
      let newTime = entry[0] + offset;
      let newEntry = [newTime, entry[1]];

      if (allowOvershoot === false) {
        if (newTime < this.minTimestamp || newTime > this.maxTimestamp) {
          throw new OvershootModificationException(entry, newEntry, this.name, this.minTimestamp, this.maxTimestamp);
        }
      }

      newEntryList.push(newEntry);
    }

    let newTimeList = newEntryList.map(entry => entry[0]);
    let newMin = Math.min(...newTimeList);
    let newMax = Math.max(...newTimeList);

    if (this.minTimestamp < newMin) newMin = this.minTimestamp;
    if (this.maxTimestamp > newMax) newMax = this.maxTimestamp;

    return new IntervalTier(this.name, newEntryList, newMin, newMax);
  }

  entriesAreEqual (entryA, entryB) {
    let isEqual = true;
    isEqual &= isClose(entryA[0], entryB[0]);
    isEqual &= entryA[1] === entryB[1];
    return !!isEqual;
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
    else if (collisionCode.toLower() === 'replace') {
      this.deleteEntry(match);
      this.entryList.push(entry);
    }
    else if (collisionCode.toLower() === 'merge') {
      let newEntry = [match[0], [match[1], entry[1]].join('-')];
      this.deleteEntry(match)
      this.entryList.push(newEntry)
    }
    else {
      throw new TextgridCollisionException(this.name, entry, match);
    }

    this.sort();

    if (match && warnFlag === true) {
      let msg = `Collision warning for ${entry} with item ${match} of tier ${this.name}`;
      console.log(msg);
    }
  }

  crop (cropStart, cropEnd, mode, rebaseToZero = true) {
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
}

class IntervalTier extends TextgridTier {
  constructor (name, entryList, minT = null, maxT = null) {
    entryList = entryList.map(([startTime, endTime, label]) => [parseFloat(startTime), parseFloat(endTime), label]);

    // Determine the min and max timestamps
    let startTimeList = entryList.map(entry => entry[0]);
    let endTimeList = entryList.map(entry => entry[1]);

    if (minT !== null) startTimeList.push(parseFloat(minT));
    if (maxT !== null) endTimeList.push(parseFloat(maxT));

    if (startTimeList.length > 0) minT = Math.min(...startTimeList);
    if (endTimeList.length > 0) maxT = Math.max(...endTimeList);

    // Finish initialization
    super(name, entryList, minT, maxT);
    this.tierType = INTERVAL_TIER;
    this.labelIndex = 2;
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
          throw new OvershootModificationException(entry, newEntry, this.name, this.minTimestamp, this.maxTimestamp);
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

  insertEntry (entry, warnFlag = true, collisionCode = null) {
    let startTime = entry[0];
    let endTime = entry[1];

    let matchList = this.crop(startTime, endTime, 'lax', false).entryList;

    if (matchList.length === 0) {
      this.entryList.push(entry);
    }
    else if (collisionCode.toLower() === 'replace') {
      for (let i = 0; i < this.matchList.length; i++) {
        this.deleteEntry(this.matchList[i]);
      }
      this.entryList.push(entry);
    }
    else if (collisionCode.toLower() === 'merge') {
      for (let i = 0; i < this.matchList.length; i++) {
        this.deleteEntry(this.matchList[i]);
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
      let msg = `Collision warning for ${entry} with items ${matchList} of tier ${this.name}`;
      console.log(msg);
    }
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

      // The current interval stradles the end of the new interval
      else if (intervalStart >= cropStart && intervalEnd > cropEnd) {
        if (mode === 'truncated') {
          matchedEntry = [intervalStart, cropEnd, intervalLabel];
        }
      }

      // The current interval stradles the start of the new interval
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
}

class Textgrid {
  constructor () {
    this.tierNameList = [];
    this.tierDict = {};

    this.minTimestamp = null;
    this.maxTimestamp = null;
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

  addTier (tier, tierIndex = null) {
    if (Object.keys(this.tierDict).includes(tier.name)) {
      throw new TierExistsException(tier.name);
    }

    if (tierIndex === null) this.tierNameList.push(tier.name);
    else this.tierNameList.splice(tierIndex, 0, tier.name);

    this.tierDict[tier.name] = tier;

    if (this.minTimestamp === null || tier.minTimestamp < this.minTimestamp) {
      this.minTimestamp = tier.minTimestamp;
    }

    if (this.maxTimestamp === null || tier.maxTimestamp > this.maxTimestamp) {
      this.maxTimestamp = tier.maxTimestamp;
    }
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

  newCopy () {
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
    let oldTier = this.tierDict[oldName];
    let tierIndex = this.tierNameList.indexOf(oldName);
    let newTier = oldTier.newCopy({ name: newName });

    this.removeTier(oldName);
    this.addTier(newTier, tierIndex);
  }

  removeTier (name) {
    this.tierNameList.splice(this.tierNameList.indexOf(name), 1);
    delete this.tierDict[name];
  }

  replaceTier (name, newTier) {
    let tierIndex = this.tierNameList.indexOf(name);
    this.removeTier(name);
    this.addTier(newTier, tierIndex);
  }
}

export { Textgrid, IntervalTier, PointTier, TierCreationException, TextgridCollisionException, INTERVAL_TIER, POINT_TIER, MIN_INTERVAL_LENGTH };
