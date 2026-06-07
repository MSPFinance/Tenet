import XLSX from 'xlsx';

export function readSheetRows(buffer, sheetName = null, headerRowIndex = 0) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = sheetName ? workbook.Sheets[sheetName] : workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error(`Sheet not found: ${sheetName || workbook.SheetNames[0]}`);

  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
  const headers = (raw[headerRowIndex] || []).map((h) => normalizeHeader(h));
  const rows = raw.slice(headerRowIndex + 1)
    .filter((row) => row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ''))
    .map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        if (header) record[header] = cleanCell(row[index]);
      });
      return record;
    });

  return { headers, rows };
}

export function normalizeHeader(value) {
  if (!value) return '';
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function cleanCell(value) {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  return text === '' ? null : text;
}

export function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}
