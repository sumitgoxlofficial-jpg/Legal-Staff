/* Legal Staff — CSV and Excel (.xlsx) export without a library. Works in the browser (window.LSExport) and in Node (tests).
   rows: array of objects with the same keys. CSV is UTF-8 with a BOM so Excel reads rupee signs and Indian names correctly;
   cells that start with = + - @ are prefixed with an apostrophe so a spreadsheet never runs them as formulas. */
(function (root) {
  'use strict';
  var safe = function (v) { if (v == null) return ''; var s = String(v); return /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? "'" + s : s; };
  function cols(rows) { var k = []; rows.forEach(function (r) { Object.keys(r).forEach(function (c) { if (k.indexOf(c) < 0) k.push(c); }); }); return k; }
  function csv(rows) {
    var c = cols(rows), q = function (v) { v = safe(v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return '﻿' + [c.map(q).join(',')].concat(rows.map(function (r) { return c.map(function (k) { return q(r[k]); }).join(','); })).join('\r\n') + '\r\n';
  }
  var xml = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); };
  var colName = function (i) { var s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s; return s; };
  function sheet(rows) {
    var c = cols(rows), data = [c].concat(rows.map(function (r) { return c.map(function (k) { return r[k]; }); }));
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + data.map(function (row, ri) {
      return '<row r="' + (ri + 1) + '">' + row.map(function (v, ci) {
        var ref = colName(ci) + (ri + 1);
        if (v == null || v === '') return '';
        if (ri > 0 && typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"><v>' + v + '</v></c>';
        return '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + xml(ri > 0 ? safe(v) : v) + '</t></is></c>';
      }).join('') + '</row>'; }).join('') + '</sheetData></worksheet>';
  }
  var T = null;
  function crc32(b) { if (!T) { T = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; } } var r = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) r = T[(r ^ b[i]) & 255] ^ (r >>> 8); return (r ^ 0xFFFFFFFF) >>> 0; }
  var utf8 = function (s) { if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s); return Uint8Array.from(Buffer.from(s, 'utf8')); };
  function zip(files) {   // stored (uncompressed) zip: valid for Excel, LibreOffice and Google Sheets
    var parts = [], central = [], offset = 0;
    var u16 = function (n) { return [n & 255, (n >>> 8) & 255]; }, u32 = function (n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; };
    files.forEach(function (f) {
      var name = utf8(f.name), data = utf8(f.data), crc = crc32(data);
      var head = [0x50, 0x4B, 3, 4].concat(u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
      parts.push(Uint8Array.from(head), name, data);
      central.push(Uint8Array.from([0x50, 0x4B, 1, 2].concat(u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset))), name);
      offset += head.length + name.length + data.length;
    });
    var csz = central.reduce(function (a, b) { return a + b.length; }, 0);
    var end = Uint8Array.from([0x50, 0x4B, 5, 6].concat(u16(0), u16(0), u16(files.length), u16(files.length), u32(csz), u32(offset), u16(0)));
    var all = parts.concat(central, [end]), out = new Uint8Array(all.reduce(function (a, b) { return a + b.length; }, 0)), p = 0;
    all.forEach(function (b) { out.set(b, p); p += b.length; });
    return out;
  }
  function xlsx(rows, name) {
    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';
    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    var wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + xml((name || 'Report').replace(/[\\\/?*\[\]:]/g, ' ').slice(0, 31)) + '" sheetId="1" r:id="rId1"/></sheets></workbook>';
    var wrels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>';
    return zip([{ name: '[Content_Types].xml', data: ct }, { name: '_rels/.rels', data: rels }, { name: 'xl/workbook.xml', data: wb }, { name: 'xl/_rels/workbook.xml.rels', data: wrels }, { name: 'xl/worksheets/sheet1.xml', data: sheet(rows) }]);
  }
  var api = { csv: csv, xlsx: xlsx, crc32: crc32 };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.LSExport = api;
})(typeof window !== 'undefined' ? window : globalThis);
