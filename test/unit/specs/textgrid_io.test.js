import fs from 'fs'
import { parseTextgrid, serializeTextgrid } from '../../../textgrid_io.js';

test('converting from a textgrid file to an object and back yields the same data', () => {
  let textgridText = fs.readFileSync('./test/assets/mary.TextGrid', 'utf8');
  let tg = parseTextgrid(textgridText);
  let outputTextgridText = serializeTextgrid(tg);

  expect(textgridText).toBe(outputTextgridText);
});
