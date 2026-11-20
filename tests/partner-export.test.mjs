// Checks the CSV/Excel writer: formula-injection guard, quoting, a valid .xlsx that unzips and parses.
import { createRequire } from 'node:module'; import { writeFileSync, mkdtempSync } from 'node:fs'; import { execFileSync } from 'node:child_process'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import assert from 'node:assert/strict';
const { csv, xlsx, crc32 } = createRequire(import.meta.url)('../static/export-lite.js');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const rows = [{ Name: 'Asha, "Rao"', Amount: 15, Note: '=HYPERLINK("http://x")' }, { Name: 'Zoë ₹', Amount: 1500.5, Note: '-5' }, { Name: '@cmd', Amount: 0, Note: '' }];
const c = csv(rows);
ok(c.startsWith('﻿Name,Amount,Note\r\n'), 'csv has BOM and header');
ok(c.includes('"Asha, ""Rao"""'), 'commas and quotes are escaped');
ok(c.includes(`"'=HYPERLINK(""http://x"")"`) || c.includes(`'=HYPERLINK`), 'a leading = is neutralised');
ok(c.includes("'@cmd"), 'a leading @ is neutralised');
ok(c.includes(',-5\r\n'), 'a plain negative number is left alone');
ok(crc32(new TextEncoder().encode('123456789')) === 0xCBF43926, 'crc32 matches the standard check value');
const dir = mkdtempSync(join(tmpdir(), 'lsx-')); const f = join(dir, 'r.xlsx'); writeFileSync(f, xlsx(rows, 'Commission ledger'));
let listing = ''; try { listing = execFileSync('python3', ['-I', '-c', `import zipfile,sys,xml.dom.minidom as m
z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None
for n in z.namelist(): m.parseString(z.read(n))
print(' '.join(sorted(z.namelist())))
s=z.read('xl/worksheets/sheet1.xml').decode(); assert '<v>1500.5</v>' in s and 'Zoë ₹' in s and "'=HYPERLINK" in s
try:
    import openpyxl; w=openpyxl.load_workbook(sys.argv[1]).active; assert w['A2'].value=='Asha, "Rao"' and w['B3'].value==1500.5; print('openpyxl ok')
except ImportError: pass`, f]).toString(); } catch (e) { assert.fail('xlsx failed to unzip/parse: ' + e.message); }
ok(listing.includes('xl/worksheets/sheet1.xml') && listing.includes('[Content_Types].xml'), 'xlsx contains the required parts and every part is well-formed XML');
console.log(`export: ${n} checks passed` + (listing.includes('openpyxl ok') ? ' (also read back with openpyxl)' : ''));
