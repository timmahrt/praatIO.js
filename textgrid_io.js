import {Textgrid, IntervalTier, PointTier, POINT_TIER, INTERVAL_TIER} from './textgrid.js'

// Python-like split from
// http://stackoverflow.com/questions/6131195/javascript-splitting-string-from-the-first-comma
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
