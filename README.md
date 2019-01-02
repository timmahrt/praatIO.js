
# praatIO

[![](https://travis-ci.org/timmahrt/praatIO.js.svg?branch=master)](https://travis-ci.org/timmahrt/praatIO.js)
[![](https://coveralls.io/repos/github/timmahrt/praatIO.js/badge.svg?)](https://coveralls.io/github/timmahrt/praatIO.js?branch=master)
[![](https://img.shields.io/badge/license-MIT-blue.svg?)](http://opensource.org/licenses/MIT)
[![](https://img.shields.io/npm/v/praatio.svg)](https://www.npmjs.com/package/praatio)

A library for reading and writing textgrid files in javascript.

Major breaking api changes came with 1.0.1 and 1.0.2 along
with lots of bugfixes.  Ver 1.0 is going to be the alpha version.
Once it stabilizes (including larger test coverage),
I'll up the version to 2.0 and use semantic
versioning from there on out.

Sorry for any inconvenience.

## Major revisions

Ver 1.0 (December 31, 2018)
- Bugfixes and style refactoring (ES6)
- Passing linter and building


Ver 0.0 (June 06, 2015)
- Support for reading in a longform textgrid as JSON
- Handles both point tiers and interval tiers


## Requirements

None


## Installation

`npm install praatio`


## Usage

```javascript
import { Textgrid, IntervalTier, PointTier, INTERVAL_TIER, POINT_TIER, MIN_INTERVAL_LENGTH } from 'praatio/textgrid.js'
import { parseTextgrid, serializeTextgrid, serializeTextgridToCsv } from 'praatio/textgrid_io.js'
```

TODO: Make examples

If you read a .TextGrid file into memory,
`parseTextgrid` can be used to convert that into a Textgrid instance.

To go the opposite direction, use `serializeTextgrid` which
returns the contents of a `.TextGrid` file as a string,
which can be written directly to a file.
`serializeTextgridToCsv` works similarly, but returns the textgrid
as a comma separate list of values.  A textgrid cannot be fully
represented in a csv file, so you'll have to choose the tier
to 'pivot' from.
