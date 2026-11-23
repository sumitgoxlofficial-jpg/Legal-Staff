# Makes the .xls (Excel 97-2003) fixtures for tests/import.test.mjs with xlwt, an independent writer: pip install xlwt
#   small.xls  two sheets, under 4096 bytes of workbook (the compound file's mini stream), every common cell type
#   large.xls  a shared-string table larger than one record, so strings are split across CONTINUE records
import datetime, os, xlwt
here = os.path.dirname(os.path.abspath(__file__))
date = xlwt.easyxf(num_format_str='DD/MM/YYYY')
wb = xlwt.Workbook(encoding='utf-8')
s = wb.add_sheet('Matters')
for c, v in enumerate(['Matter Name', 'Case No.', 'NDOH', 'Fee', 'Mobile', 'Done', 'Formula']): s.write(0, c, v)
s.write(1, 0, 'Sharma v. Union of India'); s.write(1, 1, 'W.P.(C) 55/2024'); s.write(1, 2, datetime.date(2028, 1, 15), date)
s.write(1, 3, 25000.5); s.write(1, 4, 9876543210); s.write(1, 5, True); s.write(1, 6, xlwt.Formula('"CS "&"12/2025"'))
s.write(2, 0, 'राम कुमार बनाम राज्य'); s.write(2, 1, 'CS 12/2025'); s.write(2, 3, 100); s.write(2, 4, 12); s.write(2, 6, xlwt.Formula('2+3'))
c = wb.add_sheet('Clients & Contacts'); c.write(0, 0, 'Name'); c.write(0, 1, 'City'); c.write(1, 0, 'Meena Devi'); c.write(1, 1, 'Patna')
wb.add_sheet('Empty')
wb.save(os.path.join(here, 'small.xls'))
wb = xlwt.Workbook(encoding='utf-8'); s = wb.add_sheet('Clients')
s.write(0, 0, 'Name'); s.write(0, 1, 'Note')
for i in range(1, 700):
    s.write(i, 0, 'Client %04d %s' % (i, 'x' * (i % 37)))
    s.write(i, 1, ('टिप्पणी %d ' % i) * (1 + i % 5) if i % 3 == 0 else 'note %d' % i)
wb.save(os.path.join(here, 'large.xls'))

# xlwt stores no calculated value for formulas; Excel always does. Give the 2+3 formula (row 2, column 6) the value 5, as Excel would.
import struct
p = os.path.join(here, 'small.xls'); b = bytearray(open(p, 'rb').read())
i = b.find(b'\x06\x00') 
while i >= 0:
    ln, row, col = struct.unpack_from('<HHH', b, i + 2)
    if row == 2 and col == 6 and ln > 20: b[i + 10:i + 18] = struct.pack('<d', 5.0); break
    i = b.find(b'\x06\x00', i + 1)
open(p, 'wb').write(bytes(b))
