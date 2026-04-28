/**
 * TS (Teknik Şartname) Structural Validator
 *
 * Checks a ParsedTS against Hayat TS rules:
 *   1. Required general-info fields present + well-formed.
 *   2. Nesneler sheet has at least one row with name + category.
 *   3. Is_Mantigi has at least one block with substantive content.
 *   4. Conditional sheet coverage — if Nesneler mentions a type that triggers
 *      a sheet, that sheet must be present and non-empty, and each "New"
 *      object must have a matching `## Block: ...` header in the sheet.
 *   5. Hayat A1 naming pattern compliance for "New" objects.
 *
 * Cross-system SAP checks (does the object exist, is the Tcode tied to the
 * stated Program, etc.) live in `tsCrossValidator.ts` and are NOT done here.
 */

import type {
  AbapObjectRow,
  DdicBlock,
  ParsedTS,
  ValidationIssue,
} from './xlsxParser';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const ITJWM_REGEX = /^ITJWM-\d+$/i;

// Vague Turkish phrases that, on their own, do not describe a development
// precisely enough to proceed. If Is_Mantigi consists mostly of these, we emit
// warnings (semantic analysis in the agent makes the final call).
const VAGUE_PHRASES = [
  'düzeltilsin',
  'duzeltilsin',
  'bakılsın',
  'bakilsin',
  'hata giderilsin',
  'hatası giderilsin',
  'hatasi giderilsin',
  'düzeltme yapılsın',
  'duzeltme yapilsin',
  'kontrol edilsin',
  'incelensin',
];

// Conditional sheet trigger matrix.
// If Nesneler has ANY row of a type listed, the mapped sheet must be filled in.
const TRIGGER_MATRIX: Array<{
  types: string[];
  sheet: string;
}> = [
  {
    types: ['Table', 'Structure', 'Data Element', 'Domain'],
    sheet: 'DDIC_Alanlari',
  },
  { types: ['CDS View'], sheet: 'CDS_View' },
  {
    types: [
      'Class',
      'Interface',
      'Function Module',
      'Function Group',
      'BAdI',
      'User-Exit',
    ],
    sheet: 'Sinif_FM',
  },
  { types: ['Program', 'Transaction'], sheet: 'Program_Ekrani' },
];

// Hayat A1 naming patterns. These are intentionally tolerant — the definitive
// rule set lives in `resources/hayat_s4d.md` Section A1, and the
// cross-system validator enforces the canonical forms. Here we catch only the
// obvious violations.
const NAMING_PATTERNS: Partial<Record<string, RegExp>> = {
  Class: /^Z[A-Z]{2}_\d{3}_CL\d{2}$/i,
  Interface: /^Z[A-Z]{2}_\d{3}_IF\d{2}$/i,
  'Function Group': /^Z[A-Z]{2}_\d{3}_FG\d{2}$/i,
  'Function Module': /^Z[A-Z]{2}_\d{3}_FM_[A-Z0-9_]+$/i,
  Program: /^Z[A-Z]{2}_\d{3}_R\d{3}$/i,
  Table: /^Z[A-Z]{2}_\d{3}_T\d{2}$/i,
  Structure: /^Z[A-Z]{2}_\d{3}_STR_[A-Z0-9_]+$/i,
  'Data Element': /^Z[A-Z]{2}_\d{3}_DE_[A-Z0-9_]+$/i,
  Domain: /^Z[A-Z]{2}_\d{3}_DOM_[A-Z0-9_]+$/i,
  'CDS View': /^Z[A-Z]{2}_\d{3}_[CIP]_[A-Z0-9_]+$/i,
  Transaction: /^Z[A-Z0-9_]{1,19}$/i,
};

// ----------------------------------------------------------------------------
// Validators
// ----------------------------------------------------------------------------

function validateGeneralInfo(ts: ParsedTS, issues: ValidationIssue[]): void {
  const g = ts.generalInfo ?? {};

  if (!g.functionalConsultant) {
    issues.push({
      field: 'generalInfo.functionalConsultant',
      severity: 'error',
      message: 'Fonksiyonel Danışman adı eksik.',
      guidance:
        "Genel_Bilgi sekmesinde 'Fonksiyonel Danışman' satırının 2. kolonuna ad-soyad yazın.",
      example: 'Onur KAYA',
    });
  }

  if (!g.consultantEmail) {
    issues.push({
      field: 'generalInfo.consultantEmail',
      severity: 'error',
      message: 'Danışman e-mail eksik.',
      guidance:
        "Genel_Bilgi sekmesinde 'Danışman E-Mail' satırına geçerli bir e-posta yazın.",
      example: 'danisman@hayat.com.tr',
    });
  } else if (!EMAIL_REGEX.test(g.consultantEmail)) {
    issues.push({
      field: 'generalInfo.consultantEmail',
      severity: 'error',
      message: `Danışman e-mail formatı geçersiz: "${g.consultantEmail}".`,
      guidance: 'E-posta adresi `yerel@alan.uzantı` formatında olmalı.',
      example: 'danisman@hayat.com.tr',
    });
  }

  if (!g.itjwmNo) {
    issues.push({
      field: 'generalInfo.itjwmNo',
      severity: 'error',
      message: 'ITJWM No eksik.',
      guidance:
        "Genel_Bilgi sekmesinde 'ITJWM No' satırına çağrı numarasını yazın.",
      example: 'ITJWM-159424',
    });
  } else if (!ITJWM_REGEX.test(g.itjwmNo)) {
    issues.push({
      field: 'generalInfo.itjwmNo',
      severity: 'error',
      message: `ITJWM No formatı geçersiz: "${g.itjwmNo}".`,
      guidance: '`ITJWM-<sayı>` formatında olmalı.',
      example: 'ITJWM-159424',
    });
  }

  if (!g.title || g.title.length < 5) {
    issues.push({
      field: 'generalInfo.title',
      severity: 'error',
      message: 'Talep başlığı eksik veya çok kısa (en az 5 karakter).',
      guidance:
        "Genel_Bilgi sekmesinde 'Talep Başlığı (kısa)' satırını kısa ve ayırt edici yazın.",
      example: 'ZPP001 ekranına performans alanı eklenmesi',
    });
  }

  if (!g.description || g.description.length < 20) {
    issues.push({
      field: 'generalInfo.description',
      severity: 'error',
      message: 'Talep açıklaması eksik veya çok kısa (en az 20 karakter).',
      guidance:
        "Genel_Bilgi sekmesinde 'Talep Açıklaması (uzun)' satırına iş gerekçesini yazın.",
      example:
        'ARGE fire oranının ZPP001 raporunda ek sütun olarak gösterilmesi talep ediliyor. Üretim planlaması ekibinin fire analizi yapabilmesi için...',
    });
  }
}

function validateNesneler(ts: ParsedTS, issues: ValidationIssue[]): void {
  const rows = ts.abapObjects ?? [];
  const filled = rows.filter((r) => r.name || r.tcode);
  if (filled.length === 0) {
    issues.push({
      field: 'abapObjects',
      severity: 'error',
      message: 'Nesneler sekmesinde en az 1 dolu satır olmalı.',
      guidance:
        'Nesneler sekmesine etkilenen her ABAP nesnesini bir satır olarak ekleyin (Tip + Kategori + Ad zorunlu).',
      example:
        '| 1 | Class | Modified | — | ZPP_001_CL03 | Ana iş mantığı sınıfı |',
    });
    return;
  }

  for (const row of rows) {
    if (!row.type) {
      issues.push({
        field: `abapObjects[row=${row.rowIndex}].type`,
        severity: 'error',
        message: `Satır ${row.rowIndex}: Tip boş.`,
        guidance:
          "Tip kolonunda dropdown'dan bir değer seçin (Class, Program, …).",
      });
    }
    if (!row.category) {
      issues.push({
        field: `abapObjects[row=${row.rowIndex}].category`,
        severity: 'error',
        message: `Satır ${row.rowIndex}: Kategori boş veya geçersiz (New / Modified).`,
        guidance: "Kategori kolonunda 'New' veya 'Modified' seçin.",
      });
    }
    if (!row.name) {
      issues.push({
        field: `abapObjects[row=${row.rowIndex}].name`,
        severity: 'error',
        message: `Satır ${row.rowIndex}: Nesne adı boş.`,
        guidance:
          "Mevcut nesne için sistemdeki ad, yeni nesne için Hayat naming pattern'ine uygun önerilen ad.",
      });
    }

    // Naming pattern check — only for "New" rows where we have a name + type
    if (row.category === 'New' && row.name && row.type) {
      const pat = NAMING_PATTERNS[row.type];
      if (pat && !pat.test(row.name)) {
        issues.push({
          field: `abapObjects[row=${row.rowIndex}].name`,
          severity: 'error',
          message: `Satır ${row.rowIndex}: "${row.name}" Hayat naming pattern'ine uymuyor (${row.type}).`,
          guidance:
            'Beklenen kalıp: ' +
            pat.toString().replace(/[/^$i]/g, '') +
            '. Detay için `GetHayatCodingStandards({section:"naming"})` çağrısını kontrol edin.',
        });
      }
    }
  }
}

function validateIsMantigi(ts: ParsedTS, issues: ValidationIssue[]): void {
  const blocks = ts.isMantigi ?? [];
  if (blocks.length === 0) {
    issues.push({
      field: 'isMantigi',
      severity: 'error',
      message: 'Is_Mantigi sekmesi boş — en az 1 iş mantığı bloğu olmalı.',
      guidance:
        "Is_Mantigi sekmesinde '### Blok 1: …' header'ı ile başlayan en az bir blok bulunmalı.",
      example:
        '### Blok 1: ZPP_001_CL03 → CALC_PERFORMANS\nAmaç: …\nKaynak tablo: …',
    });
    return;
  }

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const joined = `${b.header}\n${b.content}\n${b.codeSnippet ?? ''}`;
    if (joined.trim().length < 50) {
      issues.push({
        field: `isMantigi[${i}]`,
        severity: 'warning',
        message: `Blok "${b.header}" çok kısa (< 50 karakter) — semantik analizde yetersiz bulunabilir.`,
        guidance:
          'Bloğa: amaç, kaynak tablo/alan, filtre koşulu ve mümkünse kod örneği ekleyin.',
      });
    }
    const lower = joined.toLowerCase();
    const hit = VAGUE_PHRASES.find((p) => lower.includes(p));
    // Only warn if the block consists mostly of the vague phrase (short AND vague)
    if (hit && joined.length < 200) {
      issues.push({
        field: `isMantigi[${i}]`,
        severity: 'warning',
        message: `Blok "${b.header}" belirsiz ifade içeriyor: "${hit}".`,
        guidance:
          'Belirsiz ifadeler yerine NE / NEREDE / NASIL anlatın: method adı, alan adı, koşul, kod örneği.',
        example:
          'Method: CALC_PERFORMANS\nAlan: cs_performans_data-arge_fire\nKoşul: werks + budat + arbpl eşleşmesi',
      });
    }
  }
}

function validateConditionalSheets(
  ts: ParsedTS,
  issues: ValidationIssue[],
): void {
  const rows = ts.abapObjects ?? [];
  const present = new Set(ts.presentSheets ?? []);

  // Figure out which sheets are triggered and by which types
  for (const rule of TRIGGER_MATRIX) {
    const triggeringRows = rows.filter((r) => rule.types.includes(r.type));
    if (triggeringRows.length === 0) continue;

    if (!present.has(rule.sheet)) {
      issues.push({
        field: `sheet.${rule.sheet}`,
        severity: 'error',
        message: `"${rule.sheet}" sekmesi zorunlu ama boş. Nesneler içinde ${rule.types
          .filter((t) => triggeringRows.some((r) => r.type === t))
          .join(', ')} var.`,
        guidance: `"${rule.sheet}" sekmesini açın ve tetikleyici nesneler için detayları girin.`,
      });
    }
  }

  // Block coverage: every "New" object must have a matching block in its sheet
  const ddicBlocks = ts.ddicAlanlari ?? [];
  const sinifFmBlocks = ts.sinifFm ?? [];
  const progBlock = ts.programEkrani;

  for (const row of rows) {
    if (row.category !== 'New' || !row.name) continue;
    const up = row.name.toUpperCase();

    if (['Domain', 'Data Element', 'Structure', 'Table'].includes(row.type)) {
      const found = ddicBlocks.some((b) => b.name.toUpperCase() === up);
      if (!found) {
        issues.push({
          field: `sheet.DDIC_Alanlari[${row.name}]`,
          severity: 'error',
          message: `DDIC_Alanlari sekmesinde "${row.name}" için '## Block:' başlığı bulunamadı.`,
          guidance: `"## Block: ${row.type
            .toUpperCase()
            .replace(' ', '_')} ${row.name}" ile başlayan bir blok ekleyin.`,
        });
      }
    }

    if (row.type === 'Function Group') {
      // Function Group'un kendine ait block'u zorunlu değil — FM block'larının
      // "Function Group: <AD>" attribute'u ile dolaylı referans yeterli sayılır.
      const referenced = sinifFmBlocks.some((b) => {
        const fg = b.attributes['function group'];
        return fg && fg.toUpperCase() === up;
      });
      if (!referenced) {
        issues.push({
          field: `sheet.Sinif_FM[${row.name}]`,
          severity: 'warning',
          message: `Sinif_FM içinde "Function Group: ${row.name}" attribute'una sahip hiç FM bloğu yok.`,
          guidance:
            "Function Group'u kullanan en az bir FM bloğu ekleyin (FM bloğunun içinde 'Function Group: <AD>' satırı).",
        });
      }
    } else if (['Class', 'Interface', 'Function Module'].includes(row.type)) {
      const found = sinifFmBlocks.some((b) => {
        if (row.type === 'Class' || row.type === 'Interface') {
          return b.parentName.toUpperCase() === up;
        }
        if (row.type === 'Function Module') {
          return b.memberName.toUpperCase() === up;
        }
        return false;
      });
      if (!found) {
        issues.push({
          field: `sheet.Sinif_FM[${row.name}]`,
          severity: 'error',
          message: `Sinif_FM sekmesinde "${row.name}" için '## Block:' başlığı bulunamadı.`,
          guidance:
            "Her yeni sınıf/method veya FM için '## Block: CLASS <AD> / METHOD <AD>' veya '## Block: FM <AD>' başlığı ekleyin.",
        });
      }
    }

    if (row.type === 'Program') {
      const progName = progBlock?.program?.program || progBlock?.program?.name;
      if (!progBlock || !progBlock.program) {
        issues.push({
          field: `sheet.Program_Ekrani[${row.name}]`,
          severity: 'error',
          message: `Program_Ekrani sekmesinde "${row.name}" için '## Block: PROGRAM' bloğu bulunamadı.`,
          guidance:
            "'## Block: PROGRAM <AD>' ile başlayan bir blok ekleyip Type/Tcode/Transport satırlarını doldurun.",
        });
      } else if (progName && progName.toUpperCase() !== up) {
        issues.push({
          field: `sheet.Program_Ekrani[${row.name}]`,
          severity: 'warning',
          message: `Program_Ekrani'ndaki program adı ("${progName}") Nesneler'dekiyle ("${row.name}") eşleşmiyor.`,
          guidance:
            'Blok başlığındaki program adının Nesneler sekmesiyle tutarlı olduğundan emin olun.',
        });
      }
    }
  }
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

export function validateTSStructure(ts: ParsedTS): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  // Include any issues the parser already captured
  for (const i of ts.parseIssues ?? []) issues.push(i);
  validateGeneralInfo(ts, issues);
  validateNesneler(ts, issues);
  validateIsMantigi(ts, issues);
  validateConditionalSheets(ts, issues);
  return issues;
}

export function summariseIssues(issues: ValidationIssue[]): {
  errorCount: number;
  warningCount: number;
  totalIssues: number;
} {
  let errorCount = 0;
  let warningCount = 0;
  for (const i of issues) {
    if (i.severity === 'error') errorCount++;
    else warningCount++;
  }
  return {
    errorCount,
    warningCount,
    totalIssues: errorCount + warningCount,
  };
}

// Re-export so consumers only need to import from tsValidator
export type { AbapObjectRow, DdicBlock, ParsedTS, ValidationIssue };
