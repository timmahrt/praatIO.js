/*
Written by Tim Mahrt
March 25, 2015

readTextgrid() will read in a textgrid in JSON format, ready to be processed by the
user.

TODO: add writeTextgrid()?

This is a translation of the file reading and writing capabilities of the python praatio
library.
*/
const INTERVAL_TIER = 'interval_tier';
const POINT_TIER = 'point_tier';
const MIN_INTERVAL_LENGTH = 0.00000001; // Arbitrary threshold

function fillInBlanks (tier, blankLabel = '', startTime = null, endTime = null) {
  /*
  Fills in the space between intervals with empty space

  This is necessary to do when saving to create a well-formed textgrid
  */

  if (startTime === null) startTime = tier.minTimestamp;
  if (endTime === null) endTime = tier.maxTimestamp;

  // Special case: empty textgrid
  if (tier.entryList.length === 0) tier.entryList.push([startTime, endTime, blankLabel]);

  // Create a new entry list
  let entryList = tier.entryList.slice();
  let entry = entryList[0];
  let prevEnd = parseFloat(entry[1]);
  let newEntryList = [entry, ];

  for (let i = 1; i < entryList.length; i++) {
    let newStart = parseFloat(entryList[i][0]);
    let newEnd = parseFloat(entryList[i][1]);

    if (prevEnd < newStart) newEntryList.push([prevEnd, newStart, blankLabel]);

    newEntryList.push(entryList[i]);

    prevEnd = newEnd;
  }

  // Special case: If there is a gap at the start of the file
  if (parseFloat(newEntryList[0][0]) < parseFloat(startTime)) {
    throw new Error('Tier data is before the tier start time.');
  }
  if (parseFloat(newEntryList[0][0]) > parseFloat(startTime)) {
    newEntryList.splice(0, 0, [startTime, newEntryList[0][0], blankLabel]);
  }

  // Special case: If there is a gap at the end of the file
  if (endTime !== null) {
    if (parseFloat(newEntryList[-1][1]) > parseFloat(endTime)) {
      throw new Error('Tier data is after the tier end time.');
    }
    if (parseFloat(newEntryList[-1][1]) < parseFloat(endTime)) {
      newEntryList.splice([newEntryList[-1][1], endTime, blankLabel]);
    }
  }

  return new IntervalTier(tier.name, newEntryList, tier.minTimestamp, tier.maxTimestamp);
}


function removeUltrashortIntervals (tier, minLength) {
  /*
  Remove intervals that are very tiny

  Doing many small manipulations on intervals can lead to the creation
  of ultrashort intervals (e.g. 1*10^-15 seconds long).  This function
  removes such intervals.
  */

  // First, remove tiny intervals
  let newEntryList = [];
  let j = 0;
  for (let i = 0; i < tier.entryList.length; i++) {
    let [start, stop, label] = tier.entryList[i];
    if (stop - start < minLength) {
      // Correct ultra-short entries
      if (newEntryList.length > 0) {
        newEntryList[j - 1] = (newEntryList[j - 1], stop, newEntryList[j - 1]);
      }
    } else {
      // Special case: the first entry in oldEntryList was ultra-short
      if (newEntryList.length === 0 && start !== 0) {
        newEntryList.push([0, stop, label]);
      } else // Normal case
      {
        newEntryList.push([start, stop, label]);
      }
      j += 1;
    }
  }

  // Next, shift near equivalent tiny boundaries
  j = 0;
  while (j < newEntryList.length - 1) {
    let diff = Math.abs(newEntryList[j][1] - newEntryList[j + 1][0]);
    if (diff > 0 && diff < MIN_INTERVAL_LENGTH) {
      newEntryList[j] = [newEntryList[j][0], newEntryList[j + 1][0], newEntryList[j][2]];
    }
  }

  return tier.newCopy({
    entryList: newEntryList
  });
}

// Python-like split from
// http://stackoverflow.com/questions/6131195/javascript-splitting-string-from-the-first-comma
function extended_split (str, separator, max) {
  let out = [],
    index = 0,
    next;

  while (!max || out.length < max - 1) {
    next = str.indexOf(separator, index);
    if (next === -1) {
      break;
    }
    out.push(str.substring(index, next));
    index = next + separator.length;
  }
  out.push(str.substring(index));
  return out;
}

function findAllSubstrings (sourceStr, subStr) {
  let indexList = [],
    index = sourceStr.indexOf(subStr);
  while (index !== -1) {
    indexList.push(index);
    index += 1;

    index = sourceStr.indexOf(subStr, index);
  }
  return indexList;
}

function fetchRow (dataStr, searchStr, index) {
  let startIndex = dataStr.indexOf(searchStr, index) + searchStr.length;
  let endIndex = dataStr.indexOf('\n', startIndex);

  let word = dataStr.substring(startIndex, endIndex);
  word = word.trim();

  if (word[0] === '"' && word[word.length - 1] === '"') {
    word = word.substring(1, word.length - 1);
  }
  word = word.trim();

  // Increment the index by 1, unless nothing was found
  if (endIndex !== -1) endIndex += 1;

  return [word, endIndex];
}

function strToIntOrFloat (inputStr) {
  let retNum = null;
  if (inputStr.includes('.')) {
    retNum = parseFloat(inputStr);
  } else {
    retNum = parseInt(inputStr);
  }
  return retNum;
}

class TextgridTier {

  constructor (name, entryList, minT, maxT) {
    this.name = name;
    this.entryList = entryList;
    this.minTimestamp = minT;
    this.maxTimestamp = maxT;
    this.tierType = null;
  }

  appendTier (tier) {
    let minTime = this.minTimestamp;
    if (tier.minTimestamp < minTime) minTime = tier.minTimestamp;

    let maxTime = this.maxTimestamp + tier.maxTimestamp;

    let appendTier = tier.editTimestamps(this.maxTimestamp, allowOvershoot = true);

    if (this.tierType !== tier.tierType) {
      throw new Error('Tier types must match when appending tiers.');
    }

    let entryList = this.entryList + appendTier.entryList;
    entryList.sort(function(x, y) {
      return x[0] < x[1];
    });

    return this.newCopy(this.name, entryList, minTime, maxTime);
  }

  deleteEntry (entry) {
    let i = this.entryList.indexOf(entry);
    this.entryList.splice(i, 1);
  }

  find (matchLabel, substrMatchFlag, usingRE) {
    let returnList = [];
    for (let i = 0; i < this.entryList.length; i++) {
      if (usingRE === true) {
        if (this.entryList[i].match(matchLabel)) returnList.push(i);
      } else if (substrMatchFlag === false) {
        if (this.entryList[i] === matchLabel) returnList.push(i);
      } else {
        if (this.entryList[i].includes(matchLabel)) returnList.push(i);
      }
    }
    return returnList;
  }

  newCopy({
    name = null,
    entryList = null,
    minTimestamp = null,
    maxTimestamp = null
  } = {}) {
    if (name === null) name = this.name;
    if (entryList === null) entryList = this.entryList;
    if (minTimestamp === null) minTimestamp = this.minTimestamp;
    if (maxTimestamp === null) maxTimestamp = this.maxTimestamp;

    return this.constructor(name, entryList, minTimestamp, maxTimestamp);
  }

  sort () {
    this.entryList.sort(function(x, y) {
      return x[0] < x[1];
    });
  }

  union (tier) {
    let retTier = this.newCopy();

    for (let i = 0; i < tier.entryList.length; i++) {
      retTier.insertEntry(tier.entryList[i], false, 'merge');
    }
  }
}

class PointTier extends TextgridTier {
  constructor (name, entryList, minT = null, maxT = null) {
    entryList = entryList.map(([timeV, label]) => [parseFloat(timeV), label]);

    // Determine the min and max timestamps
    let timeList = entryList.map(entry => entry[0]);
    if (minT !== null) timeList.push(parseFloat(minT));
    if (maxT !== null) timeList.push(parseFloat(maxT));

    minT = Math.min(...timeList);
    maxT = Math.max(...timeList);

    // Finish intialization
    super(name, entryList, minT, maxT);
    this.tierType = 'TextTier';
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
    let timeList = startTimeList.concat(endTimeList);

    if (minT !== null) timeList.push(parseFloat(minT));
    if (maxT !== null) timeList.push(parseFloat(maxT));

    minT = Math.min(...startTimeList);
    maxT = Math.max(...endTimeList);

    // Finish initialization
    super(name, entryList, minT, maxT);
    this.tierType = 'IntervalTier';
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

  addTier (tier, tierIndex = null) {
    if (Object.keys(this.tierDict).includes(tier.name)) {
      throw new Error('Tier name already exists in textgrid');
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
    for (let i = 0; i < this.tierNameList; i++) {
      let tierName = this.tierNameList[i];
      textgrid.tierNameList.push(tierName);
      textgrid.tierDict[tierName] = this.tierDict[tierName];
    }

    textgrid.minTimestamp = this.minTimestamp;
    textgrid.maxTimestamp = this.maxTimestamp;

    return textgrid;
  }

  renameTier (oldName, newName) {
    let oldTier = this.tierDict[oldName];
    let tierIndex = this.tierNameList.indexOf(oldName);
    this.removeTier(oldName);
    this.addTier(oldTier, tierIndex);
  }

  removeTier (name) {
    this.tierNameList.splice(this.tierNameList.index(name), 1);
    delete this.tierDict[name];
  }

  replaceTier (name, newTier) {
    let tierIndex = this.tierNameList.indexOf(name);
    this.removeTier(name);
    this.addTier(newTier, tierIndex);
  }

  getOutputText (fn, minimumIntervalLength = MIN_INTERVAL_LENGTH) {
    /*
    Formats the textgrid for saving to a .TextGrid fileimumIntervalLength is null, then ultrashortintervals
    will not be checked for.
    */
    for (let i = 0; i < this.tierNameList.length; i++) {
      this.tierDict[this.tierNameList[i]].sort();
    }

    // Fill in the blank spaces for interval tiers
    for (let i = 0; i < this.tierNameList.length; i++) {
      let tierName = this.tierNameList[i];
      let tier = this.tierDict[tierName];

      if (tier instanceof IntervalTier) {
        tier = fillInBlanks(tier, '', this.minTimestamp, this.maxTimestamp);
        if (minimumIntervalLength !== null) {
          tier = removeUltrashortIntervals(tier, minimumIntervalLength);
        }
        this.tierDict[name] = tier;
      }
    }

    for (let i = 0; i < this.tierNameList.length; i++) {
      this.tierDict[this.tierNameList[i]].sort();
    }

    // Header
    let outputTxt = '';
    outputTxt += 'File type = "ooTextFile short"\n';
    outputTxt += 'Object class = "TextGrid"\n\n';
    outputTxt += '${this.minTimestamp}\n${this.maxTimestamp}\n';
    outputTxt += '<exists>\n${this.tierNameList}\n';

    for (let i = 0; i < this.tierNameList.length; i++) {
      outputTxt += this.tierDict[this.tierNameList[i]].getAsText();
    }

    return outputTxt;
  }
}

function parseNormalTextgrid (data) {
  // Toss header
  let tierList = data.split('item [');
  let textgridHeader = tierList.shift();

  let tgMin = parseFloat(textgridHeader.split('xmin = ', 2)[1].split('\n', 1)[0].trim());
  let tgMax = parseFloat(textgridHeader.split('xmax = ', 2)[1].split('\n', 1)[0].trim());

  // Process each tier individually
  //tierList = data.split('item');
  //tierList = tierList[1,tierList.length];
  let tierTxt = '';
  tierList.shift(); // Removing the document root empty item
  let textgrid = new Textgrid();
  textgrid.minTimestamp = tgMin;
  textgrid.maxTimestamp = tgMax;

  for (let i = 0; i < tierList.length; i++) {
    tierTxt = tierList[i];

    // Get tier type
    let tierType = POINT_TIER;
    let searchWord = 'points';
    if (tierTxt.indexOf('class = "IntervalTier"') > -1) {
      tierType = INTERVAL_TIER;
      searchWord = 'intervals';
    }

    // Get tier meta-information
    let tmpArray = extended_split(tierTxt, searchWord, 2);
    let header = tmpArray[0];
    let tierData = tmpArray[1];
    let tierName = header.split('name = ', 2)[1].split('\n', 1)[0].trim();
    tierName = tierName.slice(1, tierName.length - 1); // remove quotes
    let tierStart = header.split('xmin = ', 2)[1].split('\n', 1)[0].trim();
    let tierEnd = header.split('xmax = ', 2)[1].split('\n', 1)[0].trim();

    // Get the tier entry list
    let entryList = [];
    let labelI = 0;
    let label = null;
    let tier = null;
    console.log(tierType)
    if (tierType === INTERVAL_TIER) {
      let timeStartI = null;
      let timeEndI = null;
      let timeStart = null;
      let timeEnd = null;
      while (true) {
        [timeStart, timeStartI] = fetchRow(tierData, 'xmin = ', labelI);

        // Break condition here.  indexof loops around at the end of a file
        if (timeStartI <= labelI) break;

        [timeEnd, timeEndI] = fetchRow(tierData, 'xmax = ', timeStartI);
        [label, labelI] = fetchRow(tierData, 'text =', timeEndI);

        label = label.trim();
        if (label === '') continue;

        entryList.push([parseFloat(timeStart), parseFloat(timeEnd), label]);
      }
      tier = new IntervalTier(tierName, entryList, tierStart, tierEnd);
    } else {
      let timePointI = null;
      let timePoint = null;
      while (true) {
        [timePoint, timePointI] = fetchRow(tierData, 'number = ', labelI);

        // Break condition here.  indexof loops around at the end of a file
        if (timePointI <= labelI) break;

        [label, labelI] = fetchRow(tierData, 'mark =', timePointI);

        label = label.trim();
        if (label === '') continue;

        entryList.push([parseFloat(timePoint), label]);
      }
      tier = new PointTier(tierName, entryList, tierStart, tierEnd);
    }
    textgrid.addTier(tier);
  }
  return textgrid;
}

function parseShortTextgrid (data) {
  let indexList = [];

  let intervalIndicies = findAllSubstrings(data, '"IntervalTier"');
  for (let i = 0; i < intervalIndicies.length; i++) {
    indexList.push([intervalIndicies[i], true]);
  }

  let pointIndicies = findAllSubstrings(data, '"TextTier"');
  for (let i = 0; i < pointIndicies.length; i++) {
    indexList.push([pointIndicies[i], false]);
  }

  indexList.push([data.length, null]); // The 'end' of the file
  indexList.sort(function (x, y) {
    return x[0] < x[1];
  });

  let tupleList = [];
  for (let i = 0; i < indexList.length - 1; i++) {
    tupleList.push([indexList[i][0], indexList[i + 1][0], indexList[i][1]]);
  }

  // Set the textgrid's min and max times
  let header = data.slice(0, tupleList[0][0]);
  let headerList = header.split('\n');
  let tgMin = parseFloat(headerList[3]);
  let tgMax = parseFloat(headerList[4]);

  // Add the textgrid tiers
  let textgrid = new Textgrid();
  textgrid.minTimestamp = tgMin;
  textgrid.maxTimestamp = tgMax;

  for (let i = 0; i < tupleList.length; i++) {
    let tier = null;

    let blockStartI = tupleList[i][0];
    let blockEndI = tupleList[i][1];
    let isInterval = tupleList[i][2];

    let tierData = data.slice(blockStartI, blockEndI);

    let metaStartI = fetchRow(tierData, '', 0)[1];

    // Tier meta-information
    let [tierName, tierNameEndI] = fetchRow(tierData, '', metaStartI);
    let [tierStartTime, tierStartTimeI] = fetchRow(tierData, '', tierNameEndI);
    let [tierEndTime, tierEndTimeI] = fetchRow(tierData, '', tierStartTimeI);
    let startTimeI = fetchRow(tierData, '', tierEndTimeI)[1];

    tierStartTime = parseFloat(tierStartTime);
    tierEndTime = parseFloat(tierEndTime);

    // Tier entry data
    let startTime = null;
    let endTime = null;
    let label = null;
    let tierType = null;
    let endTimeI = null;
    let labelI = null;

    let entryList = [];
    if (isInterval === true) {
      while (true) {
        [startTime, endTimeI] = fetchRow(tierData, '', startTimeI);
        if (endTimeI === -1) break;

        [endTime, labelI] = fetchRow(tierData, '', endTimeI);
        [label, startTimeI] = fetchRow(tierData, '', labelI);

        label = label.trim();
        if (label === '') continue;
        entryList.push([startTime, endTime, label]);
      }
      tier = new IntervalTier(tierName, entryList, tierStartTime, tierEndTime);
    } else {
      while (true) {
        [startTime, labelI] = fetchRow(tierData, '', startTimeI);
        if (labelI === -1) break;

        [label, startTimeI] = fetchRow(tierData, '', labelI);

        label = label.trim();
        if (label === '') continue;
        entryList.push([startTime, label]);
      }
      tier = new PointTier(tierName, entryList, tierStartTime, tierEndTime);
    }
    textgrid.addTier(tier);
  }

  return textgrid;
}

function readTextgrid (text) {
  text = text.replace(/\r\n/g, '\n');

  let textgrid;
  if (text.indexOf('ooTextFile short') !== -1 || text.indexOf('item') === -1) {
    textgrid = parseShortTextgrid(text);
  } else {
    textgrid = parseNormalTextgrid(text);
  }

  return textgrid;
}

export default readTextgrid;
