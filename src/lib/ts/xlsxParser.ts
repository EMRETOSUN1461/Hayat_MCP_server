/**
 * TS (Teknik Şartname) XLSX Parser
 *
 * Parses Hayat Holding TS XLSX files into a structured ParsedTS object.
 * The XLSX format is defined in `resources/ts-template.xlsx` and uses 9 sheets:
 *
 *   1. Genel_Bilgi            (mandatory)    - 2-column key/value
 *   2. Nesneler               (mandatory)    - tabular object list
 *   3. Is_Mantigi             (mandatory)    - free-text with `### Blok N:` blocks
 *   4. DDIC_Alanlari          (conditional)  - multi-block `## Block: <TYPE> <NAME>`
 *   5. CDS_View               (conditional)  - key/value
 *   6. Sinif_FM               (conditional)  - multi-block
 *   7. Program_Ekrani         (conditional)  - multi-block (program + sel screen + ALV)
 *   8. Standart_Cagrilar      (optional)     - tabular
 *   9. Test_Senaryolari       (optional)     - tabular
 *
 * The parser never throws on "bad" content — it collects structural issues into
 * a ValidationIssue[] and returns them alongside the parsed data.
 */

import ExcelJS from 'exceljs';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type DevType = 'Basic Change' | 'Enhancement' | 'Greenfield' | 'Bug Fix';

export interface GeneralInfo {
  functionalConsultant?: string;
  consultantEmail?: string;
  systemId?: string;
  tsNoVersion?: string;
  title?: string;
  description?: string;
  callNumber?: string;
  itjwmNo?: string;
  devType?: DevType | string;
}

export interface AbapObjectRow {
  devId: string;
  type: string;
  category: 'New' | 'Modified' | '';
  tcode?: string;
  name?: string;
  description?: string;
  rowIndex: number; // 1-based sheet row number (useful for error messages)
}

export interface IsMantigiBlock {
  header: string; // e.g. "ZPP_001_CL03 → CALC_PERFORMANS methodu"
  content: string; // everything under the header, excluding code snippet
  codeSnippet?: string;
}

export type DdicKind = 'DOMAIN' | 'DATA_ELEMENT' | 'STRUCTURE' | 'TABLE';

export interface DdicBlock {
  kind: DdicKind;
  name: string;
  attributes: Record<string, string>;
  fields?: Array<Record<string, string>>;
}

export interface CdsViewBlock {
  name?: string;
  viewType?: string;
  sqlView?: string;
  baseObject?: string;
  joins?: string;
  where?: string;
  associations?: string;
  annotations?: string;
  selectFields?: string;
  parameters?: string;
}

export type SinifFmKind = 'CLASS_METHOD' | 'FM' | 'INTERFACE_METHOD';

export interface SinifFmBlock {
  kind: SinifFmKind;
  parentName: string; // Class / Interface / Function Group name
  memberName: string; // Method / FM name
  attributes: Record<string, string>;
}

export interface ProgramEkraniBlock {
  program?: Record<string, string>;
  selectionScreen?: Array<Record<string, string>>;
  alvLayout?: {
    outputTable?: string;
    fields: Array<Record<string, string>>;
  };
  alvButtons?: Array<Record<string, string>>;
}

export interface StandartCagriRow {
  standardObject: string;
  calledFrom: string;
  purpose: string;
  criticalParams: string;
}

export interface TestSenaryoRow {
  id: string;
  scenario: string;
  input: string;
  expectedOutput: string;
}

export interface ValidationIssue {
  field: string;
  severity: 'error' | 'warning';
  message: string;
  guidance: string;
  example?: string;
}

export interface ParsedTS {
  generalInfo: GeneralInfo;
  abapObjects: AbapObjectRow[];
  isMantigi: IsMantigiBlock[];
  ddicAlanlari?: DdicBlock[];
  cdsView?: CdsViewBlock;
  sinifFm?: SinifFmBlock[];
  programEkrani?: ProgramEkraniBlock;
  standartCagrilar?: StandartCagriRow[];
  testSenaryolari?: TestSenaryoRow[];
  presentSheets: string[]; // sheets that exist AND have content beyond the header
  parseIssues: ValidationIssue[]; // structural parsing problems
}

// ----------------------------------------------------------------------------
// Label → field map for Genel_Bilgi sheet
// ----------------------------------------------------------------------------

const GENEL_BILGI_MAP: Record<string, keyof GeneralInfo> = {
  'fonksiyonel danışman': 'functionalConsultant',
  'fonksiyonel danisman': 'functionalConsultant',
  'danışman e-mail': 'consultantEmail',
  'danisman e-mail': 'consultantEmail',
  'danışman email': 'consultantEmail',
  'danisman email': 'consultantEmail',
  'system id': 'systemId',
  'ts no / version': 'tsNoVersion',
  'ts no': 'tsNoVersion',
  'talep başlığı (kısa)': 'title',
  'talep basligi (kisa)': 'title',
  'talep başlığı': 'title',
  'talep basligi': 'title',
  'talep açıklaması (uzun)': 'description',
  'talep aciklamasi (uzun)': 'description',
  'talep açıklaması': 'description',
  'talep aciklamasi': 'description',
  'çağrı no': 'callNumber',
  'cagri no': 'callNumber',
  'itjwm no': 'itjwmNo',
  'geliştirme tipi': 'devType',
  'gelistirme tipi': 'devType',
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function cellStr(cell: ExcelJS.Cell | undefined): string {
  if (!cell) return '';
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v instanceof Date) return v.toISOString();
  // Rich text
  if (
    typeof v === 'object' &&
    'richText' in v &&
    Array.isArray((v as any).richText)
  ) {
    return (v as any).richText
      .map((r: any) => r.text ?? '')
      .join('')
      .trim();
  }
  // Hyperlink / formula result
  if (typeof v === 'object' && 'text' in (v as any)) {
    return String((v as any).text ?? '').trim();
  }
  if (typeof v === 'object' && 'result' in (v as any)) {
    const r = (v as any).result;
    return r === null || r === undefined ? '' : String(r).trim();
  }
  return String(v).trim();
}

function normaliseLabel(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

function collectColumnText(
  ws: ExcelJS.Worksheet,
  col = 1,
  startRow = 1,
): string {
  // Collect free-form text from a single-column sheet as one multi-line string.
  const lines: string[] = [];
  const last = ws.rowCount || 0;
  for (let r = startRow; r <= last; r++) {
    const row = ws.getRow(r);
    const val = cellStr(row.getCell(col));
    lines.push(val);
  }
  // Trim trailing empty lines
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

function isSheetEmpty(ws: ExcelJS.Worksheet): boolean {
  // A sheet is "empty" if it has no data beyond optional header row(s).
  const last = ws.rowCount || 0;
  if (last === 0) return true;
  // Walk through all cells; if any cell beyond row 1 has content, not empty.
  for (let r = 2; r <= last; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= (row.cellCount || 0); c++) {
      if (cellStr(row.getCell(c)) !== '') return false;
    }
  }
  return false; // header-only also counted as has-structure; treat as NOT empty
}

/**
 * True if the sheet has truly no meaningful content anywhere (even the header area).
 * Used to decide whether a conditional sheet was "left blank by the consultant".
 */
function isSheetCompletelyBlank(ws: ExcelJS.Worksheet): boolean {
  const last = ws.rowCount || 0;
  if (last === 0) return true;
  for (let r = 1; r <= last; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= (row.cellCount || 0); c++) {
      if (cellStr(row.getCell(c)) !== '') return false;
    }
  }
  return true;
}

// ----------------------------------------------------------------------------
// Sheet parsers
// ----------------------------------------------------------------------------

function parseGenelBilgi(
  ws: ExcelJS.Worksheet,
  issues: ValidationIssue[],
): GeneralInfo {
  const info: GeneralInfo = {};
  const last = ws.rowCount || 0;
  for (let r = 1; r <= last; r++) {
    const row = ws.getRow(r);
    const rawLabel = cellStr(row.getCell(1));
    const value = cellStr(row.getCell(2));
    if (!rawLabel) continue;
    // Strip optional `[Z]` / `[ZORUNLU]` markers from label
    const cleaned = rawLabel
      .replace(/\*\*\[z\]\*\*/gi, '')
      .replace(/\[zorunlu\]/gi, '')
      .replace(/\[z\]/gi, '')
      .replace(/\*\*/g, '')
      .trim();
    const key = normaliseLabel(cleaned);
    const field = GENEL_BILGI_MAP[key];
    if (field && value) {
      (info as any)[field] = value;
    }
  }
  return info;
}

function parseNesneler(
  ws: ExcelJS.Worksheet,
  issues: ValidationIssue[],
): AbapObjectRow[] {
  // Expected columns: Dev ID | Tip | Kategori | Tcode | Mevcut/Yeni Ad | Açıklama
  const out: AbapObjectRow[] = [];
  const last = ws.rowCount || 0;
  // Start at row 2 (row 1 = header)
  for (let r = 2; r <= last; r++) {
    const row = ws.getRow(r);
    const devId = cellStr(row.getCell(1));
    const type = cellStr(row.getCell(2));
    const category = cellStr(row.getCell(3));
    const tcode = cellStr(row.getCell(4));
    const name = cellStr(row.getCell(5));
    const description = cellStr(row.getCell(6));
    // Skip totally empty rows
    if (!devId && !type && !category && !tcode && !name && !description)
      continue;
    const catNorm =
      category.toLowerCase() === 'new'
        ? 'New'
        : category.toLowerCase() === 'modified'
          ? 'Modified'
          : '';
    out.push({
      devId,
      type,
      category: catNorm as 'New' | 'Modified' | '',
      tcode: tcode || undefined,
      name: name || undefined,
      description: description || undefined,
      rowIndex: r,
    });
  }
  return out;
}

function parseIsMantigi(ws: ExcelJS.Worksheet): IsMantigiBlock[] {
  const text = collectColumnText(ws, 1, 1);
  if (!text.trim()) return [];
  // Split by `### Blok N:` or `### Block N:` (case-insensitive, Turkish accents tolerated)
  const parts = text.split(/^###\s+(?:Blok|Block)\s+\d+\s*:\s*/im);
  // First element before any header = preamble; ignore if empty
  const blocks: IsMantigiBlock[] = [];
  if (parts.length === 1) {
    // No block markers — treat whole text as a single anonymous block
    blocks.push({ header: '(anonim blok)', content: text.trim() });
    return blocks;
  }
  // Re-match to recover headers
  const headerMatches = Array.from(
    text.matchAll(/^###\s+(?:Blok|Block)\s+\d+\s*:\s*(.+)$/gim),
  );
  for (let i = 0; i < headerMatches.length; i++) {
    const header = headerMatches[i][1].trim();
    const body = (parts[i + 1] || '').trim();
    const codeMatch = body.match(
      /(?:^|\n)(?:Kod\s+örneği|Kod\s+ornegi|Code\s+snippet)\s*:\s*\n?([\s\S]+?)(?:\n\n|$)/i,
    );
    const codeSnippet = codeMatch ? codeMatch[1].trim() : undefined;
    const content = codeSnippet ? body.replace(codeMatch![0], '').trim() : body;
    blocks.push({ header, content, codeSnippet });
  }
  return blocks;
}

/**
 * Parses multi-block free-text sheets (DDIC_Alanlari, Sinif_FM, Program_Ekrani).
 * Splits by `## Block: <rest-of-header>` markers.
 */
function splitBlocks(text: string): Array<{ header: string; body: string }> {
  if (!text.trim()) return [];
  const blocks: Array<{ header: string; body: string }> = [];
  const regex = /^##\s+Block\s*:\s*(.+)$/gim;
  const headers: Array<{ header: string; start: number; end: number }> = [];
  let m: RegExpExecArray | null = regex.exec(text);
  while (m !== null) {
    headers.push({
      header: m[1].trim(),
      start: m.index,
      end: m.index + m[0].length,
    });
    m = regex.exec(text);
  }
  if (headers.length === 0) return [];
  for (let i = 0; i < headers.length; i++) {
    const bodyStart = headers[i].end;
    const bodyEnd = i + 1 < headers.length ? headers[i + 1].start : text.length;
    blocks.push({
      header: headers[i].header,
      body: text.slice(bodyStart, bodyEnd).trim(),
    });
  }
  return blocks;
}

function parseAttributes(body: string): {
  attrs: Record<string, string>;
  fields: Array<Record<string, string>>;
} {
  const attrs: Record<string, string> = {};
  const fields: Array<Record<string, string>> = [];
  const lines = body.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // `Field: ...` rows become field records (pipe-separated)
    if (/^field\s*:/i.test(line)) {
      const rest = line.replace(/^field\s*:\s*/i, '');
      const parts = rest.split('|').map((p) => p.trim());
      const rec: Record<string, string> = {};
      // First part is the field name; subsequent parts are `Key: Value`
      rec.name = parts[0];
      for (let i = 1; i < parts.length; i++) {
        const kv = parts[i].split(':');
        if (kv.length >= 2) {
          rec[kv[0].trim().toLowerCase()] = kv.slice(1).join(':').trim();
        }
      }
      fields.push(rec);
      continue;
    }
    // `Key: Value` attribute rows
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim().toLowerCase();
      const val = line.slice(idx + 1).trim();
      if (key && val) attrs[key] = val;
    }
  }
  return { attrs, fields };
}

function parseDdic(ws: ExcelJS.Worksheet): DdicBlock[] {
  const text = collectColumnText(ws, 1, 1);
  const blocks = splitBlocks(text);
  const out: DdicBlock[] = [];
  for (const b of blocks) {
    // Header shape: "DOMAIN <NAME>" / "DATA_ELEMENT <NAME>" / "STRUCTURE <NAME>" / "TABLE <NAME>"
    const m = b.header.match(
      /^(DOMAIN|DATA[_\s]?ELEMENT|STRUCTURE|TABLE)\s+(\S+)/i,
    );
    if (!m) continue;
    const kind = m[1].toUpperCase().replace(/\s/g, '_') as DdicKind;
    const name = m[2];
    const { attrs, fields } = parseAttributes(b.body);
    out.push({
      kind,
      name,
      attributes: attrs,
      fields: fields.length > 0 ? fields : undefined,
    });
  }
  return out;
}

function parseCdsView(ws: ExcelJS.Worksheet): CdsViewBlock {
  // Expected: 2-column key/value like Genel_Bilgi.
  const out: CdsViewBlock = {};
  const last = ws.rowCount || 0;
  const map: Record<string, keyof CdsViewBlock> = {
    'cds view adı': 'name',
    'cds view adi': 'name',
    'view type': 'viewType',
    'sql view name': 'sqlView',
    'sql view': 'sqlView',
    'base table/view': 'baseObject',
    'base table': 'baseObject',
    'base object': 'baseObject',
    'join (varsa)': 'joins',
    join: 'joins',
    'where clause': 'where',
    where: 'where',
    "association'lar": 'associations',
    associations: 'associations',
    "annotation'lar": 'annotations',
    annotations: 'annotations',
    'select fields': 'selectFields',
    'parameters (varsa)': 'parameters',
    parameters: 'parameters',
  };
  for (let r = 1; r <= last; r++) {
    const row = ws.getRow(r);
    const label = normaliseLabel(cellStr(row.getCell(1)));
    const value = cellStr(row.getCell(2));
    if (!label || !value) continue;
    const f = map[label];
    if (f) (out as any)[f] = value;
  }
  return out;
}

function parseSinifFm(ws: ExcelJS.Worksheet): SinifFmBlock[] {
  const text = collectColumnText(ws, 1, 1);
  const blocks = splitBlocks(text);
  const out: SinifFmBlock[] = [];
  for (const b of blocks) {
    // Possible headers:
    //   CLASS <NAME> / METHOD <METHOD>
    //   INTERFACE <NAME> / METHOD <METHOD>
    //   FM <NAME>
    let kind: SinifFmKind = 'CLASS_METHOD';
    let parentName = '';
    let memberName = '';
    const classMatch = b.header.match(
      /^(CLASS|INTERFACE)\s+(\S+)\s*\/\s*METHOD\s+(\S+)/i,
    );
    const fmMatch = b.header.match(/^FM\s+(\S+)/i);
    if (classMatch) {
      kind =
        classMatch[1].toUpperCase() === 'INTERFACE'
          ? 'INTERFACE_METHOD'
          : 'CLASS_METHOD';
      parentName = classMatch[2];
      memberName = classMatch[3];
    } else if (fmMatch) {
      kind = 'FM';
      memberName = fmMatch[1];
    } else {
      continue;
    }
    const { attrs } = parseAttributes(b.body);
    out.push({ kind, parentName, memberName, attributes: attrs });
  }
  return out;
}

function parseProgramEkrani(ws: ExcelJS.Worksheet): ProgramEkraniBlock {
  const text = collectColumnText(ws, 1, 1);
  const blocks = splitBlocks(text);
  const out: ProgramEkraniBlock = {};
  for (const b of blocks) {
    const head = b.header.toUpperCase();
    if (head.startsWith('PROGRAM')) {
      const { attrs } = parseAttributes(b.body);
      out.program = attrs;
    } else if (head.startsWith('SELECTION_SCREEN')) {
      const { fields } = parseAttributes(b.body);
      out.selectionScreen = fields;
    } else if (head.startsWith('ALV_LAYOUT')) {
      const { attrs, fields } = parseAttributes(b.body);
      out.alvLayout = {
        outputTable: attrs['output table'] || attrs['outputtable'],
        fields,
      };
    } else if (head.startsWith('ALV_BUTTONS')) {
      const { fields } = parseAttributes(b.body);
      out.alvButtons = fields;
    }
  }
  return out;
}

function parseTabular<T>(
  ws: ExcelJS.Worksheet,
  columns: Array<{ colIdx: number; key: keyof T & string }>,
): T[] {
  const out: T[] = [];
  const last = ws.rowCount || 0;
  for (let r = 2; r <= last; r++) {
    const row = ws.getRow(r);
    const rec: Record<string, string> = {};
    let anyFilled = false;
    for (const c of columns) {
      const v = cellStr(row.getCell(c.colIdx));
      if (v) anyFilled = true;
      rec[c.key] = v;
    }
    if (anyFilled) out.push(rec as unknown as T);
  }
  return out;
}

// ----------------------------------------------------------------------------
// Main entry point
// ----------------------------------------------------------------------------

export async function parseTSXlsx(filePath: string): Promise<ParsedTS> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const issues: ValidationIssue[] = [];
  const presentSheets: string[] = [];

  const getSheet = (name: string): ExcelJS.Worksheet | undefined => {
    const ws = wb.getWorksheet(name);
    if (!ws) return undefined;
    if (!isSheetCompletelyBlank(ws)) {
      presentSheets.push(name);
    }
    return ws;
  };

  // --- Mandatory sheets ---
  const wsGenel = getSheet('Genel_Bilgi');
  if (!wsGenel) {
    issues.push({
      field: 'sheet.Genel_Bilgi',
      severity: 'error',
      message: 'Genel_Bilgi sekmesi bulunamadı.',
      guidance: 'XLSX dosyasında "Genel_Bilgi" isimli bir sekme bulunmalı.',
    });
  }
  const generalInfo = wsGenel ? parseGenelBilgi(wsGenel, issues) : {};

  const wsNesneler = getSheet('Nesneler');
  if (!wsNesneler) {
    issues.push({
      field: 'sheet.Nesneler',
      severity: 'error',
      message: 'Nesneler sekmesi bulunamadı.',
      guidance: 'XLSX dosyasında "Nesneler" isimli bir sekme bulunmalı.',
    });
  }
  const abapObjects = wsNesneler ? parseNesneler(wsNesneler, issues) : [];

  const wsIsMantigi = getSheet('Is_Mantigi');
  if (!wsIsMantigi) {
    issues.push({
      field: 'sheet.Is_Mantigi',
      severity: 'error',
      message: 'Is_Mantigi sekmesi bulunamadı.',
      guidance: 'XLSX dosyasında "Is_Mantigi" isimli bir sekme bulunmalı.',
    });
  }
  const isMantigi = wsIsMantigi ? parseIsMantigi(wsIsMantigi) : [];

  // --- Conditional / optional sheets ---
  const wsDdic = getSheet('DDIC_Alanlari');
  const ddicAlanlari =
    wsDdic && !isSheetCompletelyBlank(wsDdic) ? parseDdic(wsDdic) : undefined;

  const wsCds = getSheet('CDS_View');
  const cdsView =
    wsCds && !isSheetCompletelyBlank(wsCds) ? parseCdsView(wsCds) : undefined;

  const wsSinif = getSheet('Sinif_FM');
  const sinifFm =
    wsSinif && !isSheetCompletelyBlank(wsSinif)
      ? parseSinifFm(wsSinif)
      : undefined;

  const wsProg = getSheet('Program_Ekrani');
  const programEkrani =
    wsProg && !isSheetCompletelyBlank(wsProg)
      ? parseProgramEkrani(wsProg)
      : undefined;

  const wsStd = getSheet('Standart_Cagrilar');
  const standartCagrilar =
    wsStd && !isSheetCompletelyBlank(wsStd)
      ? parseTabular<StandartCagriRow>(wsStd, [
          { colIdx: 1, key: 'standardObject' },
          { colIdx: 2, key: 'calledFrom' },
          { colIdx: 3, key: 'purpose' },
          { colIdx: 4, key: 'criticalParams' },
        ])
      : undefined;

  const wsTest = getSheet('Test_Senaryolari');
  const testSenaryolari =
    wsTest && !isSheetCompletelyBlank(wsTest)
      ? parseTabular<TestSenaryoRow>(wsTest, [
          { colIdx: 1, key: 'id' },
          { colIdx: 2, key: 'scenario' },
          { colIdx: 3, key: 'input' },
          { colIdx: 4, key: 'expectedOutput' },
        ])
      : undefined;

  return {
    generalInfo,
    abapObjects,
    isMantigi,
    ddicAlanlari,
    cdsView,
    sinifFm,
    programEkrani,
    standartCagrilar,
    testSenaryolari,
    presentSheets,
    parseIssues: issues,
  };
}
