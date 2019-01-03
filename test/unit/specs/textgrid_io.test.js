import fs from 'fs';
import { parseTextgrid, serializeTextgrid, decodeBuffer } from '../../../textgrid_io.js';

test('converting from a textgrid file to an object and back yields the same data', () => {
  let textgridBuffer = fs.readFileSync('./test/assets/mary.TextGrid');
  let textgridText = decodeBuffer(textgridBuffer);
  let tg = parseTextgrid(textgridText);
  let outputTextgridText = serializeTextgrid(tg);

  expect(outputTextgridText).toBe(textgridText);
});
