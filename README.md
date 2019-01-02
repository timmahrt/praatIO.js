
# praatIO

[![](https://travis-ci.org/timmahrt/praatIO.js.svg?branch=master)](https://travis-ci.org/timmahrt/praatIO.js)
[![](https://img.shields.io/badge/license-MIT-blue.svg?)](http://opensource.org/licenses/MIT)
[![](https://img.shields.io/npm/v/praatio.svg)](https://www.npmjs.com/package/praatio)

A library for reading and writing textgrid files in javascript.


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


