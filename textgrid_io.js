import { Textgrid, IntervalTier, PointTier, POINT_TIER, INTERVAL_TIER, MIN_INTERVAL_LENGTH } from './textgrid.js'

/**
Python-like split from
http://stackoverflow.com/questions/6131195/javascript-splitting-string-from-the-first-comma
*/
function extendedSplit (str, separator, max) {
  let out = [];
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
  let indexList = [];
  let index = sourceStr.indexOf(subStr);
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

function parseNormalTextgrid (data) {
  // Toss header
  let tierList = data.split('item [');
  let textgridHeader = tierList.shift();

  let tgMin = parseFloat(textgridHeader.split('xmin = ', 2)[1].split('\n', 1)[0].trim());
  let tgMax = parseFloat(textgridHeader.split('xmax = ', 2)[1].split('\n', 1)[0].trim());

  // Process each tier individually
  // tierList = data.split('item');
  // tierList = tierList[1,tierList.length];
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
    let tmpArray = extendedSplit(tierTxt, searchWord, 2);
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
    return x[0] - y[0];
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
    // let tierType = null;
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

/**
Fills in the space between intervals with empty space

This is necessary to do when saving to create a well-formed textgrid
*/
function fillInBlanks (tier, blankLabel = '', startTime = null, endTime = null) {
  if (startTime === null) startTime = tier.minTimestamp;
  if (endTime === null) endTime = tier.maxTimestamp;

  // Special case: empty textgrid
  if (tier.entryList.length === 0) tier.entryList.push([startTime, endTime, blankLabel]);

  // Create a new entry list
  let entryList = tier.entryList.slice();
  let entry = entryList[0];
  let prevEnd = parseFloat(entry[1]);
  let newEntryList = [entry];

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
    let lastI = newEntryList.length - 1
    if (parseFloat(newEntryList[lastI][1]) > parseFloat(endTime)) {
      throw new Error('Tier data is after the tier end time.');
    }
    if (parseFloat(newEntryList[lastI][1]) < parseFloat(endTime)) {
      newEntryList.push([newEntryList[lastI][1], endTime, blankLabel]);
    }
  }
  return tier.newCopy({ entryList: newEntryList });
}

/** Prints each entry in the tier on a separate line w/ timing info */
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
Remove intervals that are very tiny

Doing many small manipulations on intervals can lead to the creation
of ultrashort intervals (e.g. 1*10^-15 seconds long).  This function
removes such intervals.
*/
function removeUltrashortIntervals (tier, minLength) {
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
      } else { // Normal case
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
    j += 1;
  }

  return tier.newCopy({
    entryList: newEntryList
  });
}

/**
Formats a textgrid instance for saving to a .csv file

One row is listed for each entry in the tier with name /pivotTierName/.
The corresponding entry in each tier will be provided on the same row
along with the start and end time of the entry from the pivot tier.
*/
function serializeTextgridToCsv (tg, pivotTierName, tierNameList = null) {
  if (!tierNameList) tierNameList = tg.tierNameList;
  let colHeader = tierNameList.slice();
  colHeader.push('Start Time');
  colHeader.push('End Time');
  let table = [colHeader];
  let tier = tg.tierDict[pivotTierName];
  for (let i = 0; i < tier.entryList.length; i++) {
    let start = tier.entryList[i][0];
    let stop = tier.entryList[i][1];
    // let label = tier.entryList[i][2];

    let subTG = tg.crop(start, stop, 'truncated', false);

    let row = [];
    for (let j = 0; j < tierNameList.length; j++) {
      let subLabel = '';
      if (subTG.tierNameList.includes(tierNameList[j])) {
        let subTier = subTG.tierDict[tierNameList[j]];
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
  let csv = table.join('\n');

  return csv;
}

/**
Formats a textgrid instance for saving to a .TextGrid file.

If minimumIntervalLength is null, then ultrashortintervals will not be checked for.
*/
function serializeTextgrid (tg, minimumIntervalLength = MIN_INTERVAL_LENGTH) {
  for (let i = 0; i < tg.tierNameList.length; i++) {
    tg.tierDict[tg.tierNameList[i]].sort();
  }

  // Fill in the blank spaces for interval tiers
  for (let i = 0; i < tg.tierNameList.length; i++) {
    let tierName = tg.tierNameList[i];
    let tier = tg.tierDict[tierName];

    if (tier instanceof IntervalTier) {
      tier = fillInBlanks(tier, '', tg.minTimestamp, tg.maxTimestamp);
      if (minimumIntervalLength !== null) {
        tier = removeUltrashortIntervals(tier, minimumIntervalLength);
      }
      tg.tierDict[tierName] = tier;
    }
  }

  for (let i = 0; i < tg.tierNameList.length; i++) {
    tg.tierDict[tg.tierNameList[i]].sort();
  }

  // Header
  let outputTxt = '';
  outputTxt += 'File type = "ooTextFile short"\n';
  outputTxt += 'Object class = "TextGrid"\n\n';
  outputTxt += `${tg.minTimestamp}\n${tg.maxTimestamp}\n`;
  outputTxt += `<exists>\n${tg.tierNameList.length}\n`;

  for (let i = 0; i < tg.tierNameList.length; i++) {
    outputTxt += tierToText(tg.tierDict[tg.tierNameList[i]]);
  }

  return outputTxt;
}

/** Creates an instance of a Textgrid from the contents of a .Textgrid file. */
function parseTextgrid (text) {
  text = text.replace(/\r\n/g, '\n');

  let textgrid;
  if (text.indexOf('ooTextFile short') !== -1 || text.indexOf('item') === -1) {
    textgrid = parseShortTextgrid(text);
  } else {
    textgrid = parseNormalTextgrid(text);
  }

  return textgrid;
}

export { parseTextgrid, serializeTextgrid, serializeTextgridToCsv };
