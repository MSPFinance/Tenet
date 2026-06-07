import XLSX from 'xlsx';

export function readSheetRows(filePathOrBuffer, sheetName = null, headerRowIndex = 0) {
  const workbook = typeof filePathOrBuffer === 'string'
    ? XLSX.readFile(filePathOrBuffer, { cellDates: true })
    : XLSX.read(filePathOrBuffer, { type: 'buffer', cellDates: true });

  const targetSheetName = sheetName || workbook.SheetNames[0];
  const sheet = workbook.Sheets[targetSheetName];

  if (!sheet) {
    throw new Error(`Sheet not found: ${targetSheetName}`);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    range: headerRowIndex,
    raw: false,
  });

  return {
    sheetName: targetSheetName,
    rows: rows.map(normalizeRowKeys),
  };
}

export function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;

  const cleaned = String(value).replace(/[$,]/g, '').trim();
  const number = Number(cleaned);

  return Number.isNaN(number) ? null : number;
}

function normalizeRowKeys(row) {
  const normalized = {};

  Object.entries(row).forEach(([key, value]) => {
    const cleanKey = String(key)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    normalized[cleanKey] = value;
  });

  return normalized;
}