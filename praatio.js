
/*
Written by Tim Mahrt
March 25, 2015

readTextgrid() will read in a textgrid in JSON format, ready to be processed by the
user.

TODO: add writeTextgrid()?

This is a translation of the file reading and writing capabilities of the python praatio
library.
*/
var INTERVAL_TIER = "interval_tier"
var POINT_TIER = "point_tier"

// Python-like split from 
// http://stackoverflow.com/questions/6131195/javascript-splitting-string-from-the-first-comma
function extended_split(str, separator, max) {
  var out = [],
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
};

var fetchRow = function(dataStr, searchStr, index) {
  var startIndex = dataStr.indexOf(searchStr, index) + searchStr.length;
  var endIndex = dataStr.indexOf("\n", startIndex);

  var word = dataStr.substring(startIndex, endIndex);
  word = word.trim()

  if (word[0] == '"' && word[word.length - 1] == '"') {
    word = word.substring(1, word.length - 1);
  }
  word = word.trim()

  return [word, endIndex + 1];
}

var parseNormalTextgrid = function(data) {

  // Toss header
  var tierList = data.split('item');
  var textgridHeader = tierList[0];

  var tgStart = textgridHeader.split("xmin = ", 2)[1].split("\n", 1)[0].trim();
  var tgEnd = textgridHeader.split("xmax = ", 2)[1].split("\n", 1)[0].trim();
  tierList.shift();

  // Process each tier individually
  //tierList = data.split('item');
  //tierList = tierList[1,tierList.length];
  var tierTxt = '';
  tierList.shift();

  var tierDict = {};
  var tierNameList = [];

  for (i = 0; i < tierList.length; i++) {
    tierTxt = tierList[i];

    // Get tier type
    var tierType = POINT_TIER;
    var searchWord = "points";
    if (tierTxt.indexOf('class = "IntervalTier"') > -1) {
      tierType = INTERVAL_TIER;
      searchWord = "intervals";
    }

    // Get tier meta-information
    var tmpArray = extended_split(tierTxt, searchWord, 2);
    var header = tmpArray[0];
    var tierData = tmpArray[1];
    var tierName = header.split("name = ", 2)[1].split("\n", 1)[0].trim();
    var tierStart = header.split("xmin = ", 2)[1].split("\n", 1)[0].trim();
    var tierEnd = header.split("xmax = ", 2)[1].split("\n", 1)[0].trim();


    // Get the tier entry list
    var entryList = [];
    var labelI = 0;
    if (tierType == INTERVAL_TIER) {
      tierType = "IntervalTier";
      while (true) {
        var startArray = fetchRow(tierData, "xmin = ", labelI);

        var timeStart = startArray[0];
        var timeStartI = startArray[1];

        // Break condition here.  indexof loops around at the end of a file
        if (timeStartI <= labelI) {
          break;
        }

        var endArray = fetchRow(tierData, "xmax = ", timeStartI);

        var timeEnd = endArray[0];
        var timeEndI = endArray[1];

        var labelArray = fetchRow(tierData, "text =", timeEndI);
        var label = labelArray[0];
        var labelI = labelArray[1];

        label = label.trim();
        if (label === "") continue;

        entryList.push([parseFloat(timeStart), parseFloat(timeEnd), label]);
      }
    } else {
      tierType = "TextTier"; // Name for point tier type??
      while (true) {
        var pointArray = fetchRow(tierData, "number = ", labelI);

        var timePoint = pointArray[0];
        var timePointI = pointArray[1];

        // Break condition here.  indexof loops around at the end of a file
        if (timePointI <= labelI) {
          break;
        }

        var labelArray = fetchRow(tierData, "mark =", timePointI);
        var label = labelArray[0];
        var labelI = labelArray[1];

        label = label.trim();
        if (label === "") continue;

        entryList.push([parseFloat(timePoint), label]);
      }
    }

    var tier = {
      'name': tierName,
      'type': tierType,
      'start': tierStart,
      'end': tierEnd,
      'entryList': entryList
    };
    tierDict[tierName] = tier;
    tierNameList.push(tierName);
  }

  var textgrid = {
    'tierNameList': tierNameList,
    'tierDict': tierDict,
    'minT': tgStart,
    'maxT': tgEnd,
  };
  return textgrid;
}

var parseShortTextgrid = function(lines) {

}


var readTextgrid = function(text) {

  var lines = text.split('\n');

  if (text.indexOf('ooTextFile short') == -1 || text.indexOf('item') > -1) {
    jsonTextgrid = parseNormalTextgrid(text);
  } else {
    jsonTextgrid = parseShortTextgrid(lines);
  }

  return jsonTextgrid;
}
