/**
 * This module contains code for converting to and from the Textgrid
 * datastructure.  Textgrid files are typically stored as plain text.
 * This library does not do actual file IO but instead converts
 * to and from loaded strings to instances of Textgrid.
 *
 * @author Tim Mahrt
 * @since March 25, 2015
 * @module textgrid_io
 */

import iconvlite from 'iconv-lite';
import {
  Textgrid, IntervalTier, PointTier, copyTier,
  POINT_TIER, INTERVAL_TIER, MIN_INTERVAL_LENGTH
} from './textgrid.js';

import {
  cropTextgrid
} from './textgrid_modifiers.js';

/**
 * Python-like split from
 * http://stackoverflow.com/questions/6131195/javascript-splitting-string-from-the-first-comma
 * @param {string} str
 * @param {string} separator - the separator to split on
 * @param {number} max - the max number of times to split
 * @return {Array}
 * @ignore
 */
function extendedSplit (str, separator, max) {
  const out = [];
  let index = 0;
  let next;

  if (max) {
    while (out.length < max - 1) {
      next = str.indexOf(separator, index);
      if (next === -1) {
        break;
      }
      out.push(str.substring(index, next));
      index = next + separator.length;
    }
  }
  out.push(str.substring(index));
  return out;
}

function findAllSubstrings (sourceStr, subStr) {
  const indexList = [];
  let index = sourceStr.indexOf(subStr);
  while (index !== -1) {
    indexList.push(index);
    index += 1;

    index = sourceStr.indexOf(subStr, index);
  }
  return indexList;
}

function fetchRow (dataStr, searchStr, index) {
  const startIndex = dataStr.indexOf(searchStr, index) + searchStr.length;
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

function parseNormalTextgrid (data) {
  // Toss header
  const tierList = data.split('item [');
  const textgridHeader = tierList.shift();

  const tgMin = parseFloat(textgridHeader.split('xmin = ', 2)[1].split('\n', 1)[0].trim());
  const tgMax = parseFloat(textgridHeader.split('xmax = ', 2)[1].split('\n', 1)[0].trim());

  // Process each tier individually
  // tierList = data.split('item');
  // tierList = tierList[1,tierList.length];
  let tierTxt = '';
  tierList.shift(); // Removing the document root empty item
  const textgrid = new Textgrid();
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
    const tmpArray = extendedSplit(tierTxt, searchWord + ':', 2);
    const header = tmpArray[0];
    const tierData = tmpArray[1];
    let tierName = header.split('name = ', 2)[1].split('\n', 1)[0].trim();
    tierName = tierName.slice(1, tierName.length - 1); // remove quotes
    const tierStart = header.split('xmin = ', 2)[1].split('\n', 1)[0].trim();
    const tierEnd = header.split('xmax = ', 2)[1].split('\n', 1)[0].trim();

    // Get the tier entry list
    const entryList = [];
    let labelI = 0;
    let label = null;
    let tier = null;
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
        entryList.push([parseFloat(timePoint), label]);
      }
      tier = new PointTier(tierName, entryList, tierStart, tierEnd);
    }
    textgrid.addTier(tier);
  }
  return textgrid;
}

function parseShortTextgrid (data) {
  const indexList = [];

  const intervalIndicies = findAllSubstrings(data, '"IntervalTier"');
  for (let i = 0; i < intervalIndicies.length; i++) {
    indexList.push([intervalIndicies[i], true]);
  }

  const pointIndicies = findAllSubstrings(data, '"TextTier"');
  for (let i = 0; i < pointIndicies.length; i++) {
    indexList.push([pointIndicies[i], false]);
  }

  indexList.push([data.length, null]); // The 'end' of the file
  indexList.sort(function (x, y) {
    return x[0] - y[0];
  });

  const tupleList = [];
  for (let i = 0; i < indexList.length - 1; i++) {
    tupleList.push([indexList[i][0], indexList[i + 1][0], indexList[i][1]]);
  }

  // Set the textgrid's min and max times
  const header = data.slice(0, tupleList[0][0]);
  const headerList = header.split('\n');
  const tgMin = parseFloat(headerList[3]);
  const tgMax = parseFloat(headerList[4]);

  // Add the textgrid tiers
  const textgrid = new Textgrid();
  textgrid.minTimestamp = tgMin;
  textgrid.maxTimestamp = tgMax;

  for (let i = 0; i < tupleList.length; i++) {
    let tier = null;

    const blockStartI = tupleList[i][0];
    const blockEndI = tupleList[i][1];
    const isInterval = tupleList[i][2];

    const tierData = data.slice(blockStartI, blockEndI);

    const metaStartI = fetchRow(tierData, '', 0)[1];

    // Tier meta-information
    const [tierName, tierNameEndI] = fetchRow(tierData, '', metaStartI);
    let [tierStartTime, tierStartTimeI] = fetchRow(tierData, '', tierNameEndI);
    let [tierEndTime, tierEndTimeI] = fetchRow(tierData, '', tierStartTimeI);
    let startTimeI = fetchRow(tierData, '', tierEndTimeI)[1];

    tierStartTime = parseFloat(tierStartTime);
    tierEndTime = parseFloat(tierEndTime);

    // Tier entry data
    let startTime = null;
    let endTime = null;
    let label = null;
    // let tierType = null;
    let endTimeI = null;
    let labelI = null;

    const entryList = [];
    if (isInterval === true) {
      while (true) {
        [startTime, endTimeI] = fetchRow(tierData, '', startTimeI);
        if (endTimeI === -1) break;

        [endTime, labelI] = fetchRow(tierData, '', endTimeI);
        [label, startTimeI] = fetchRow(tierData, '', labelI);

        label = label.trim();
        entryList.push([startTime, endTime, label]);
      }
      tier = new IntervalTier(tierName, entryList, tierStartTime, tierEndTime);
    } else {
      while (true) {
        [startTime, labelI] = fetchRow(tierData, '', startTimeI);
        if (labelI === -1) break;

        [label, startTimeI] = fetchRow(tierData, '', labelI);

        label = label.trim();
        entryList.push([startTime, label]);
      }
      tier = new PointTier(tierName, entryList, tierStartTime, tierEndTime);
    }
    textgrid.addTier(tier);
  }

  return textgrid;
}

/**
 * Fills in the space between intervals with empty space.
 * This is necessary to do when saving to create a well-formed textgrid.
 * @ignore
 */
function fillInBlanks (tier, blankLabel = '', startTime = null, endTime = null) {
  if (startTime === null) startTime = tier.minTimestamp;
  if (endTime === null) endTime = tier.maxTimestamp;

  // Special case: empty textgrid
  if (tier.entryList.length === 0) tier.entryList.push([startTime, endTime, blankLabel]);

  // Create a new entry list
  const entryList = tier.entryList.slice();
  const entry = entryList[0];
  let prevEnd = parseFloat(entry[1]);
  const newEntryList = [entry];

  for (let i = 1; i < entryList.length; i++) {
    const newStart = parseFloat(entryList[i][0]);
    const newEnd = parseFloat(entryList[i][1]);

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
    const lastI = newEntryList.length - 1
    if (parseFloat(newEntryList[lastI][1]) > parseFloat(endTime)) {
      throw new Error('Tier data is after the tier end time.');
    }
    if (parseFloat(newEntryList[lastI][1]) < parseFloat(endTime)) {
      newEntryList.push([newEntryList[lastI][1], endTime, blankLabel]);
    }
  }
  return copyTier(tier, { entryList: newEntryList });
}

/**
 * Prints each entry in the tier on a separate line w/ timing info
 * @ignore
 */
function tierToText (tier) {
  let text = ''
  text += `"${tier.tierType}"\n`;
  text += `"${tier.name}"\n`;
  text += `${tier.minTimestamp}\n${tier.maxTimestamp}\n`;
  text += `${tier.entryList.length}\n`;

  for (let i = 0; i < tier.entryList.length; i++) {
    let entry = tier.entryList[i];
    entry = entry.map(val => `${val}`);

    let labelI;
    if (tier.tierType === POINT_TIER) {
      labelI = 1;
    }
    else if (tier.tierType === INTERVAL_TIER) {
      labelI = 2;
    }

    entry[labelI] = `"${entry[labelI]}"`
    text += entry.join('\n') + '\n';
  }

  return text
}

/**
 * Remove intervals that are very tiny
 * Doing many small manipulations on intervals can lead to the creation
 * of ultrashort intervals (e.g. 1*10^-15 seconds long).  This function
 * removes such intervals.
 * @ignore
 */
function removeUltrashortIntervals (tier, minLength, minTimestamp) {
  // First, remove tiny intervals
  const newEntryList = [];
  let j = 0;
  for (let i = 0; i < tier.entryList.length; i++) {
    const [start, stop, label] = tier.entryList[i];
    if (stop - start < minLength) {
      // Correct ultra-short entries
      if (newEntryList.length > 0) {
        newEntryList[j - 1] = (newEntryList[j - 1], stop, newEntryList[j - 1]);
      }
    } else {
      // Special case: the first entry in oldEntryList was ultra-short
      if (newEntryList.length === 0 && start !== minTimestamp) {
        newEntryList.push([minTimestamp, stop, label]);
      } else { // Normal case
        newEntryList.push([start, stop, label]);
      }
      j += 1;
    }
  }

  // Next, shift near equivalent tiny boundaries
  j = 0;
  while (j < newEntryList.length - 1) {
    const diff = Math.abs(newEntryList[j][1] - newEntryList[j + 1][0]);
    if (diff > 0 && diff < minLength) {
      newEntryList[j] = [newEntryList[j][0], newEntryList[j + 1][0], newEntryList[j][2]];
    }
    j += 1;
  }

  return copyTier(tier, { entryList: newEntryList });
}

/**
 * Formats a textgrid instance for saving to a .csv file
 * @param {Textgrid} tg
 * @param {string} pivotTierName - One row in the output is listed for each entry in this tier.
 *  The corresponding entry in each tier will be provided on the same row
 *  along with the start and end time of the entry from the pivot tier.
 * @param {Array} [tierNameList=null] - the list of tier names to save.  If null, save all tiers.
 * @return {text}
 */
function serializeTextgridToCsv (tg, pivotTierName, tierNameList = null, includeHeader = true) {
  if (!tierNameList) tierNameList = tg.tierNameList;

  let table = [];
  if (includeHeader === true) {
    const colHeader = tierNameList.slice();
    colHeader.push('Start Time');
    colHeader.push('End Time');
    table.push(colHeader);
  }
  const tier = tg.tierDict[pivotTierName];
  for (let i = 0; i < tier.entryList.length; i++) {
    const start = tier.entryList[i][0];
    const stop = tier.entryList[i][1];
    // let label = tier.entryList[i][2];

    const subTG = cropTextgrid(tg, start, stop, 'truncated', false);

    const row = [];
    for (let j = 0; j < tierNameList.length; j++) {
      let subLabel = '';
      if (subTG.tierNameList.includes(tierNameList[j])) {
        const subTier = subTG.tierDict[tierNameList[j]];
        if (subTier.entryList.length > 0) {
          subLabel = subTier.entryList[0][2];
        }
      }
      row.push(subLabel);
    }
    row.push(start);
    row.push(stop);
    table.push(row);
  }

  table = table.map(row => row.join(','));
  const csv = table.join('\n');

  return csv;
}

/**
 * Formats a textgrid instance for saving to a .TextGrid file.
 * @param {Textgrid} tg
 * @param {number} [minimumIntervalLength=MIN_INTERVAL_LENGTH] - remove all intervals shorter than this; if null, don't remove any intervals
 * @param {number} [minTimestamp = null] -- the minTimestamp of the saved Textgrid; if None, use whatever is defined in the Textgrid object.  If minTimestamp is larger than timestamps in your textgrid, an exception will be thrown.
 * @param {number} [maxTimestamp = null] -- the maxTimestamp of the saved Textgrid; if None, use whatever is defined in the Textgrid object.  If maxTimestamp is larger than timestamps in your textgrid, an exception will be thrown.
 * @param {boolean} [useShortForm = true] -- specifies whether to use the short or long form specification of a textgrid;  the long form is more human readable, the short form is more compact
 * @return A text representation of a textgrid that can be opened by Praat
 */
function serializeTextgrid (tg, minimumIntervalLength = MIN_INTERVAL_LENGTH, minTimestamp = null, maxTimestamp = null, useShortForm = true) {
  if (minTimestamp === null) minTimestamp = tg.minTimestamp;
  if (maxTimestamp === null) maxTimestamp = tg.maxTimestamp;

  const outputTg = prepTgForSaving(tg, minimumIntervalLength, minTimestamp, maxTimestamp);

  let outputTxt = '';
  if (useShortForm) {
    outputTxt = tgToShortTextForm(outputTg, minTimestamp, maxTimestamp);
  } else {
    outputTxt = tgToLongTextForm(outputTg, minTimestamp, maxTimestamp);
  }

  return outputTxt;
}

function tgToShortTextForm (tg, minTimestamp, maxTimestamp) {
  let outputTxt = '';
  outputTxt += 'File type = "ooTextFile"\n';
  outputTxt += 'Object class = "TextGrid"\n\n';
  outputTxt += `${minTimestamp}\n${maxTimestamp}\n`;
  outputTxt += `<exists>\n${tg.tierNameList.length}\n`;

  for (let i = 0; i < tg.tierNameList.length; i++) {
    outputTxt += tierToText(tg.tierDict[tg.tierNameList[i]]);
  }

  return outputTxt;
}

function tgToLongTextForm (tg, minTimestamp, maxTimestamp) {
  const tab = ' '.repeat(4);

  let outputTxt = '';

  // File header
  outputTxt += 'File type = "ooTextFile"\n';
  outputTxt += 'Object class = "TextGrid"\n\n';
  outputTxt += `xmin = ${minTimestamp} \n`
  outputTxt += `xmax = ${maxTimestamp} \n`
  outputTxt += 'tiers? <exists> \n'
  outputTxt += `size = ${tg.tierNameList.length} \n`
  outputTxt += 'item []: \n'

  for (let i = 0; i < tg.tierNameList.length; i++) {
    const tierName = tg.tierNameList[i];
    const tier = tg.tierDict[tierName];

    // Interval header
    outputTxt += tab + `item [${i + 1}]:\n`
    outputTxt += tab.repeat(2) + `class = "${tier.tierType}" \n`
    outputTxt += tab.repeat(2) + `name = "${tierName}" \n`
    outputTxt += tab.repeat(2) + `xmin = ${minTimestamp} \n`
    outputTxt += tab.repeat(2) + `xmax = ${maxTimestamp} \n`

    if (tier.tierType === INTERVAL_TIER) {
      outputTxt += tab.repeat(2) + `intervals: size = ${tier.entryList.length} \n`
      for (let j = 0; j < tier.entryList.length; j++) {
        const [start, stop, label] = tier.entryList[j];
        outputTxt += tab.repeat(2) + `intervals [${j + 1}]:\n`
        outputTxt += tab.repeat(3) + `xmin = ${start} \n`
        outputTxt += tab.repeat(3) + `xmax = ${stop} \n`
        outputTxt += tab.repeat(3) + `text = "${label}" \n`
      }
    } else {
      outputTxt += tab.repeat(2) + `points: size = ${tier.entryList.length} \n`
      for (let j = 0; j < tier.entryList.length; j++) {
        const [timestamp, label] = tier.entryList[j];
        outputTxt += tab.repeat(2) + `points [${j + 1}]:\n`
        outputTxt += tab.repeat(3) + `number = ${timestamp} \n`
        outputTxt += tab.repeat(3) + `mark = "${label}" \n`
      }
    }
  }

  return outputTxt;
}

/**
 * Processing done before every textgrid is saved (serializeTextgrid calls this function) -- gaps are filled with silence and short intervals can be removed
 * @param {Textgrid} tg
 * @param {number} [minimumIntervalLength=MIN_INTERVAL_LENGTH] - remove all intervals shorter than this; if null, don't remove any intervals
 * @param {number} [minTimestamp = null] -- the minTimestamp of the saved Textgrid; if None, use whatever is defined in the Textgrid object.  If minTimestamp is larger than timestamps in your textgrid, an exception will be thrown.
 * @param {number} [maxTimestamp = null] -- the maxTimestamp of the saved Textgrid; if None, use whatever is defined in the Textgrid object.  If maxTimestamp is larger than timestamps in your textgrid, an exception will be thrown.
 * @return A cleaned TextGrid
 */
function prepTgForSaving (tg, minimumIntervalLength = MIN_INTERVAL_LENGTH, minTimestamp = null, maxTimestamp = null) {
  if (minTimestamp === null) minTimestamp = tg.minTimestamp;
  if (maxTimestamp === null) maxTimestamp = tg.maxTimestamp;

  for (let i = 0; i < tg.tierNameList.length; i++) {
    tg.tierDict[tg.tierNameList[i]].sort();
  }

  // Fill in the blank spaces for interval tiers
  for (let i = 0; i < tg.tierNameList.length; i++) {
    const tierName = tg.tierNameList[i];
    let tier = tg.tierDict[tierName];

    if (tier instanceof IntervalTier) {
      tier = fillInBlanks(tier, '', minTimestamp, maxTimestamp);
      if (minimumIntervalLength !== null) {
        tier = removeUltrashortIntervals(tier, minimumIntervalLength, minTimestamp);
      }
      tg.tierDict[tierName] = tier;
    }
  }

  for (let i = 0; i < tg.tierNameList.length; i++) {
    tg.tierDict[tg.tierNameList[i]].sort();
  }

  return tg;
}

/**
 * Creates an instance of a Textgrid from the contents of a .Textgrid file.
 * @param {Buffer|string} text - can be either a buffer or a raw text string
 * @param {boolean} readRaw - default false; if true, points and intervals with an empty label '' are removed
 * @return {Textgrid}
 */
function parseTextgrid (text, readRaw = false) {
  text = decodeBuffer(text);
  text = text.replace(/\r\n/g, '\n');

  let textgrid;
  const caseA = text.indexOf('ooTextFile short') > -1; // 'short' in header
  const caseB = text.indexOf('item [') === -1; // 'item' keyword not in file
  if (caseA || caseB) {
    textgrid = parseShortTextgrid(text);
  } else {
    textgrid = parseNormalTextgrid(text);
  }

  if (readRaw === false) {
    for (let i = 0; i < textgrid.tierNameList.length; i++) {
      const tierName = textgrid.tierNameList[i];
      const tier = removeBlanks(textgrid.tierDict[tierName]);
      textgrid.replaceTier(tierName, tier);
    }
  }

  return textgrid;
}

function removeBlanks (tier) {
  const entryList = [];
  for (let i = 0; i < tier.entryList.length; i++) {
    const entry = tier.entryList[i];
    if (entry[entry.length - 1] === '') {
      continue;
    }
    entryList.push(entry);
  }
  return copyTier(tier, { entryList: entryList });
}

/**
 * Decodes a buffer from utf16/8 to text.
 * @param {Buffer} buffer - if not of type Buffer, it will be returned without modification.
 * @return {string}
 * @ignore
 */
function decodeBuffer (buffer) {
  let returnText = buffer
  if (Buffer.isBuffer(buffer)) {
    let decodedText = iconvlite.decode(buffer, 'utf16');
    if (decodedText.indexOf('ooTextFile') === -1) {
      decodedText = iconvlite.decode(buffer, 'utf8');
    }
    returnText = decodedText;
  }
  return returnText;
}

export { parseTextgrid, serializeTextgrid, serializeTextgridToCsv, decodeBuffer, prepTgForSaving };
