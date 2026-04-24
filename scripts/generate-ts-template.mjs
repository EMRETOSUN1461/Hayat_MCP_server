#!/usr/bin/env node
/**
 * Generates the Hayat TS XLSX templates under `resources/`:
 *   - ts-template.xlsx     (blank, all 9 sheets, headers + dropdowns + hint row)
 *   - ornek-simple.xlsx    (ZPP001 ekran değişikliği — 5 sekme dolu)
 *   - ornek-complex.xlsx   (SD_999 sipariş takip raporu — 9 sekme dolu)
 *
 * Run:  node scripts/generate-ts-template.mjs
 */

import ExcelJS from 'exceljs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resourcesDir = path.resolve(__dirname, '..', 'resources');

// ---------------------------------------------------------------------------
// Shared styling helpers
// ---------------------------------------------------------------------------

const HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1F4E78' },
};
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' } };
const REQ_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFE699' },
};
const HINT_FONT = { italic: true, color: { argb: 'FF7F7F7F' } };

function styleHeader(row) {
  row.eachCell((c) => {
    c.font = HEADER_FONT;
    c.fill = HEADER_FILL;
    c.alignment = { vertical: 'middle', horizontal: 'left' };
    c.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    };
  });
}

// ---------------------------------------------------------------------------
// Sheet builders
// ---------------------------------------------------------------------------

function buildGenelBilgi(wb, values = {}) {
  const ws = wb.addWorksheet('Genel_Bilgi');
  ws.columns = [
    { header: '', width: 40 },
    { header: '', width: 70 },
  ];

  const rows = [
    ['Alan', 'Değer', { header: true }],
    ['[Z] Fonksiyonel Danışman', values.functionalConsultant ?? '', { req: true }],
    ['[Z] Danışman E-Mail', values.consultantEmail ?? '', { req: true }],
    ['System ID', values.systemId ?? ''],
    ['TS No / Version', values.tsNoVersion ?? ''],
    ['[Z] Talep Başlığı (kısa)', values.title ?? '', { req: true }],
    ['[Z] Talep Açıklaması (uzun)', values.description ?? '', { req: true }],
    ['Çağrı No', values.callNumber ?? ''],
    ['[Z] ITJWM No', values.itjwmNo ?? '', { req: true }],
    ['[Z] Geliştirme Tipi', values.devType ?? '', { req: true, dropdown: ['Basic Change', 'Enhancement', 'Greenfield', 'Bug Fix'] }],
  ];

  rows.forEach((r, i) => {
    const row = ws.addRow([r[0], r[1]]);
    const opt = r[2] || {};
    if (opt.header) {
      styleHeader(row);
      row.height = 22;
    } else {
      if (opt.req) row.getCell(1).fill = REQ_FILL;
      if (opt.dropdown) {
        ws.getCell(`B${i + 1}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${opt.dropdown.join(',')}"`],
        };
      }
      row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    }
  });
  ws.getColumn(2).alignment = { wrapText: true, vertical: 'top' };
  return ws;
}

function buildNesneler(wb, rows = []) {
  const ws = wb.addWorksheet('Nesneler');
  ws.columns = [
    { header: 'Dev ID', width: 8 },
    { header: 'Tip', width: 20 },
    { header: 'Kategori', width: 12 },
    { header: 'Tcode', width: 12 },
    { header: 'Mevcut/Yeni Ad', width: 32 },
    { header: 'Açıklama', width: 50 },
  ];
  styleHeader(ws.getRow(1));

  const TIP_ENUM = [
    'Transaction',
    'Program',
    'Function Module',
    'Class',
    'Interface',
    'BAdI',
    'User-Exit',
    'Table',
    'Structure',
    'CDS View',
    'Data Element',
    'Domain',
    'Function Group',
  ];
  const KAT_ENUM = ['New', 'Modified'];

  // Reserve 50 rows of data validation so consultants can add rows easily
  const maxDataRows = Math.max(50, rows.length + 20);
  for (let i = 2; i <= maxDataRows + 1; i++) {
    ws.getCell(`B${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${TIP_ENUM.join(',')}"`],
    };
    ws.getCell(`C${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${KAT_ENUM.join(',')}"`],
    };
  }

  rows.forEach((r) => {
    ws.addRow([r.devId, r.type, r.category, r.tcode ?? '', r.name ?? '', r.description ?? '']);
  });

  return ws;
}

function buildFreeText(wb, name, content = '', hint = '') {
  const ws = wb.addWorksheet(name);
  ws.columns = [{ header: name, width: 120 }];
  styleHeader(ws.getRow(1));
  if (content) {
    ws.addRow([content]);
    ws.getCell('A2').alignment = { wrapText: true, vertical: 'top' };
  } else if (hint) {
    const row = ws.addRow([hint]);
    row.getCell(1).font = HINT_FONT;
    row.getCell(1).alignment = { wrapText: true, vertical: 'top' };
  }
  return ws;
}

function buildCdsView(wb, values = null) {
  const ws = wb.addWorksheet('CDS_View');
  ws.columns = [
    { header: 'Alan', width: 30 },
    { header: 'Değer', width: 90 },
  ];
  styleHeader(ws.getRow(1));

  const fields = [
    ['CDS View Adı', values?.name],
    ['View Type', values?.viewType, ['Basic', 'Composite', 'Consumption']],
    ['SQL View Name', values?.sqlView],
    ['Base Table/View', values?.baseObject],
    ['Join (varsa)', values?.joins],
    ['Where clause', values?.where],
    ["Association'lar", values?.associations],
    ["Annotation'lar", values?.annotations],
    ['Select Fields', values?.selectFields],
    ['Parameters (varsa)', values?.parameters],
  ];
  fields.forEach(([label, value, dropdown]) => {
    const row = ws.addRow([label, value ?? '']);
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    if (dropdown) {
      row.getCell(2).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${dropdown.join(',')}"`],
      };
    }
  });
  return ws;
}

function buildTabular(wb, name, columns, rows = []) {
  const ws = wb.addWorksheet(name);
  ws.columns = columns.map((c) => ({ header: c.header, width: c.width }));
  styleHeader(ws.getRow(1));
  for (const r of rows) {
    ws.addRow(columns.map((c) => r[c.key] ?? ''));
    ws.lastRow.eachCell((cell) => {
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
  }
  return ws;
}

// ---------------------------------------------------------------------------
// Content fixtures: blank template hints + simple & complex examples
// ---------------------------------------------------------------------------

const HINT_IS_MANTIGI = `### Blok 1: <Nesne adı> → <Method / lokasyon>
Amaç: <Neyi başarmak istiyoruz>
Kaynak tablo/struct: <VBAK, MARA …>
Filtre: <where koşulları>
Kod örneği:
  SELECT SINGLE ... FROM ...
    WHERE ...
    INTO ...

### Blok 2: ...`;

const HINT_DDIC = `## Block: DOMAIN <AD>
Datatype: CHAR
Length: 18
Value table: -
Fix values: -

## Block: DATA_ELEMENT <AD>
Domain: <DOMAIN_AD>
Short text: <Kısa açıklama>
Field label (medium): <Orta etiket>
Field label (long): <Uzun etiket>

## Block: STRUCTURE <AD>
Field: FIELD_1 | Type: CHAR | Length: 20 | DE/Ref: -
Field: FIELD_2 | Type: DEC  | Length: 13,2 | DE/Ref: -

## Block: TABLE <AD>
Delivery class: A
Data class: APPL0
Size category: 0
Key fields: MANDT, FIELD_1
Field: MANDT   | Type: CLNT  | DE: MANDT
Field: FIELD_1 | Type: CHAR  | Length: 20 | DE: -`;

const HINT_SINIF_FM = `## Block: CLASS <AD> / METHOD <METHOD_AD>
Visibility: PUBLIC
Type: Instance
Importing: I_PARAM TYPE <tip>
Exporting: E_PARAM TYPE <tip>
Changing: -
Raising: ZCX_<...>
Kısa açıklama: <ne yapıyor>

## Block: FM <FM_AD>
Function Group: <FG_AD>
Importing: I_MATNR TYPE MATNR
Exporting: E_MAKTX TYPE MAKTX
Exceptions: NOT_FOUND`;

const HINT_PROGRAM = `## Block: PROGRAM <PROGRAM_AD>
Type: Executable
Tcode: <TCODE>
Transport: (developer sağlayacak)

## Block: SELECTION_SCREEN
Field: P_WERKS | Type: WERKS_D | Mandatory: X | Default: 1000
Field: S_MATNR | Type: RANGE of MATNR | Mandatory: -

## Block: ALV_LAYOUT
Output table: GT_OUT TYPE TABLE OF <STRUCTURE>
Field: MATNR | Col pos: 1 | Hotspot: X | Sum: -
Field: MENGE | Col pos: 2 | Hotspot: - | Sum: X

## Block: ALV_BUTTONS
Button: PDF_EXPORT | Icon: ICON_PRINT | Tooltip: PDF'e aktar`;

// ---- Simple example: ZPP001 ekran değişikliği ----

const simple = {
  generalInfo: {
    functionalConsultant: 'Onur KAYA',
    consultantEmail: 'onur.kaya@hayat.com.tr',
    systemId: 'S4D',
    tsNoVersion: 'TS1.0',
    title: 'ZPP001 ekranına ARGE fire alanı eklenmesi',
    description:
      'Üretim planlama ekibinin ARGE fire oranını rapor ekranında görebilmesi için ZPP001 ALV çıktısına yeni bir sütun eklenmelidir. Değer ZPP_001_T02 tablosundaki ARGE_FIRE alanından gelecek.',
    callNumber: '',
    itjwmNo: 'ITJWM-159424',
    devType: 'Enhancement',
  },
  nesneler: [
    {
      devId: '1',
      type: 'Program',
      category: 'Modified',
      tcode: 'ZPP001',
      name: 'ZPP001',
      description: 'Ana program',
    },
    {
      devId: '2',
      type: 'Class',
      category: 'Modified',
      tcode: '',
      name: 'ZPP_001_CL03',
      description: 'Ana iş mantığı sınıfı (CALC_PERFORMANS methodu güncellenecek)',
    },
  ],
  isMantigi: `### Blok 1: ZPP_001_CL03 → CALC_PERFORMANS methodu
Amaç: cs_performans_data-arge_fire alanına ZPP_001_T02 tablosundan fire oranı değerini doldurmak.
Kaynak tablo: ZPP_001_T02
Filtre: werks, schnr, budat, arbpl, ymatnr alanları is_uretim_data'dan alınarak WHERE koşulu kurulur.
Kod örneği:
  SELECT SINGLE arge_fire FROM zpp_001_t02
    WHERE werks  EQ is_uretim_data-werks
      AND schnr  EQ me->gs_range-p_schnr
      AND budat  EQ is_uretim_data-budat
      AND arbpl  EQ is_uretim_data-arbpl
      AND ymatnr EQ is_uretim_data-ymatnr
    INTO cs_performans_data-arge_fire.

### Blok 2: ZPP001 ALV layout'una yeni sütun eklenmesi
Amaç: ALV çıktısına ARGE_FIRE alanını göstermek.
Konum: ZPP001 programı içindeki ALV field catalog build-up kısmı.
Alan özellikleri: Sum = X, Hotspot = -, Col pos = son.`,
  sinifFm: `## Block: CLASS ZPP_001_CL03 / METHOD CALC_PERFORMANS
Visibility: PUBLIC
Type: Instance
Importing: IS_URETIM_DATA TYPE ZPP_001_STR_URETIM
Changing:  CS_PERFORMANS_DATA TYPE ZPP_001_STR_PERFORMANS
Raising:   ZCX_PP_001
Kısa açıklama: ARGE fire oranını ZPP_001_T02'den okuyarak performans yapısına doldurur.`,
  programEkrani: `## Block: PROGRAM ZPP001
Type: Executable
Tcode: ZPP001
Transport: (developer sağlayacak)

## Block: ALV_LAYOUT
Output table: GT_PERFORMANS TYPE TABLE OF ZPP_001_STR_PERFORMANS
Field: ARGE_FIRE | Col pos: son | Hotspot: - | Sum: X`,
};

// ---- Complex example: SD_999 Sipariş Takip ve Otomatik Onay Raporu ----

const complex = {
  generalInfo: {
    functionalConsultant: 'Zeynep DEMIR',
    consultantEmail: 'zeynep.demir@hayat.com.tr',
    systemId: 'S4D',
    tsNoVersion: 'TS1.0',
    title: 'Satış Sipariş Durum Takip ve Otomatik Onay Raporu',
    description:
      'Müşteri temsilcileri açık satış siparişlerinin durumunu tek bir ALV ekranında görmek ve belirli kriterleri (kredi limiti, stok, teslim tarihi) karşılayan siparişleri otomatik onaylayabilmek istemektedir. Rapor yeni bir program, CDS view ve ilgili DDIC yapıları ile geliştirilecektir.',
    callNumber: 'C-2026-00123',
    itjwmNo: 'ITJWM-200001',
    devType: 'Greenfield',
  },
  nesneler: [
    { devId: '1', type: 'Domain', category: 'New', tcode: '', name: 'ZSD_999_DOM_STATUS', description: 'Sipariş onay durumu domain' },
    { devId: '2', type: 'Data Element', category: 'New', tcode: '', name: 'ZSD_999_DE_STATUS', description: 'Sipariş onay durumu data element' },
    { devId: '3', type: 'Structure', category: 'New', tcode: '', name: 'ZSD_999_STR_ORDER', description: 'Sipariş takip satır structure' },
    { devId: '4', type: 'Table', category: 'New', tcode: '', name: 'ZSD_999_T01', description: 'Onay geçmişi log tablosu' },
    { devId: '5', type: 'CDS View', category: 'New', tcode: '', name: 'ZSD_999_C_ORDER', description: 'Sipariş + müşteri + kredi limit birleşik view' },
    { devId: '6', type: 'Class', category: 'New', tcode: '', name: 'ZSD_999_CL01', description: 'Onay iş mantığı sınıfı' },
    { devId: '7', type: 'Function Module', category: 'New', tcode: '', name: 'ZSD_999_FM_LOG_AUTO_APPROVE', description: 'Onay logu yazan FM' },
    { devId: '8', type: 'Function Group', category: 'New', tcode: '', name: 'ZSD_999_FG01', description: 'Log FM için function group' },
    { devId: '9', type: 'Program', category: 'New', tcode: 'ZSD999', name: 'ZSD_999_R001', description: 'Ana rapor programı' },
    { devId: '10', type: 'Transaction', category: 'New', tcode: 'ZSD999', name: 'ZSD999', description: 'Rapor transaction' },
  ],
  isMantigi: `### Blok 1: ZSD_999_CL01 → GET_OPEN_ORDERS
Amaç: Açık satış siparişlerini ZSD_999_C_ORDER CDS view'ından çekmek.
Kaynak: ZSD_999_C_ORDER
Filtre: Selection screen'den gelen p_werks, s_kunnr, s_auart, p_datum_from, p_datum_to.
Kod örneği:
  SELECT * FROM zsd_999_c_order
    WHERE werks IN @gt_werks
      AND kunnr IN @gt_kunnr
      AND vbtyp EQ 'C'
    INTO TABLE @rt_orders.

### Blok 2: ZSD_999_CL01 → AUTO_APPROVE
Amaç: Bir sipariş için otomatik onay kriterlerini çalıştırmak.
Kriterler:
  1) Müşterinin kredi limiti aşılmamış (BAPI_USER_GET_DETAIL + KNKK okuma).
  2) Stok mevcut (MARD-LABST > sipariş miktarı).
  3) Teslim tarihi bugünden küçük değil.
Başarılıysa: VBAK-BSTNK alanı güncellenir, ZSD_999_FM_LOG_AUTO_APPROVE çağrılır.

### Blok 3: ZSD_999_FM_LOG_AUTO_APPROVE
Amaç: Onay aksiyonunu ZSD_999_T01 tablosuna log'lamak.
Input: I_VBELN, I_KUNNR, I_USER, I_STATUS, I_TIMESTAMP.
Transaction: kendi LUW'inde COMMIT WORK.

### Blok 4: ZSD_999_R001 selection screen + ALV
Selection: werks (tek), kunnr range, auart range, tarih aralığı.
ALV: Hotspot VBELN (double click → VA03), sum NETWR ve KWMENG, check'li onay butonu.`,
  ddicAlanlari: `## Block: DOMAIN ZSD_999_DOM_STATUS
Datatype: CHAR
Length: 1
Value table: -
Fix values: A=Approved, P=Pending, R=Rejected

## Block: DATA_ELEMENT ZSD_999_DE_STATUS
Domain: ZSD_999_DOM_STATUS
Short text: Onay Durumu
Field label (medium): Onay Drm
Field label (long): Sipariş Onay Durumu

## Block: STRUCTURE ZSD_999_STR_ORDER
Field: VBELN   | Type: VBELN   | DE/Ref: VBELN_VA
Field: POSNR   | Type: POSNR   | DE/Ref: POSNR_VA
Field: KUNNR   | Type: KUNNR   | DE/Ref: KUNAG
Field: MATNR   | Type: MATNR   | DE/Ref: MATNR
Field: KWMENG  | Type: QUAN    | Length: 13,3 | DE/Ref: KWMENG
Field: NETWR   | Type: CURR    | Length: 15,2 | DE/Ref: NETWR_AP
Field: WAERK   | Type: WAERK   | DE/Ref: WAERK
Field: STATUS  | Type: CHAR    | Length: 1    | DE/Ref: ZSD_999_DE_STATUS

## Block: TABLE ZSD_999_T01
Delivery class: A
Data class: APPL1
Size category: 1
Key fields: MANDT, VBELN, POSNR, TIMESTAMP
Field: MANDT     | Type: CLNT      | DE: MANDT
Field: VBELN     | Type: VBELN     | DE: VBELN_VA
Field: POSNR     | Type: POSNR     | DE: POSNR_VA
Field: TIMESTAMP | Type: TIMESTAMPL| DE: TIMESTAMPL
Field: USERNAME  | Type: XUBNAME   | DE: XUBNAME
Field: STATUS    | Type: CHAR      | Length: 1 | DE: ZSD_999_DE_STATUS`,
  cdsView: {
    name: 'ZSD_999_C_ORDER',
    viewType: 'Basic',
    sqlView: 'ZSD999ORDER',
    baseObject: 'VBAK',
    joins: 'INNER JOIN VBAP ON VBAP.VBELN = VBAK.VBELN\nLEFT OUTER JOIN KNA1 ON KNA1.KUNNR = VBAK.KUNNR',
    where: "VBAK.VBTYP = 'C' AND VBAK.AEDAT >= $parameters.p_date_from",
    associations: '_Customer: KNA1 ON $projection.kunnr = _Customer.kunnr',
    annotations:
      '@AccessControl.authorizationCheck: #NOT_REQUIRED\n@EndUserText.label: \'Açık satış siparişleri (SD_999)\'',
    selectFields:
      'VBAK.VBELN, VBAP.POSNR, VBAK.KUNNR, VBAP.MATNR, VBAP.KWMENG, VBAP.NETWR, VBAK.WAERK, _Customer.NAME1',
    parameters: 'p_date_from : DATS,\np_werks : WERKS_D',
  },
  sinifFm: `## Block: CLASS ZSD_999_CL01 / METHOD GET_OPEN_ORDERS
Visibility: PUBLIC
Type: Instance
Importing: IT_WERKS TYPE RANGE OF WERKS_D, IT_KUNNR TYPE RANGE OF KUNNR, IT_AUART TYPE RANGE OF AUART, I_DATE_FROM TYPE DATS, I_DATE_TO TYPE DATS
Exporting: RT_ORDERS TYPE TABLE OF ZSD_999_STR_ORDER
Raising:   ZCX_SD_999
Kısa açıklama: Açık siparişleri ZSD_999_C_ORDER üzerinden döndürür.

## Block: CLASS ZSD_999_CL01 / METHOD AUTO_APPROVE
Visibility: PUBLIC
Type: Instance
Importing: IS_ORDER TYPE ZSD_999_STR_ORDER
Exporting: E_APPROVED TYPE ABAP_BOOL, E_REASON TYPE STRING
Raising:   ZCX_SD_999
Kısa açıklama: Kredi/stok/tarih kriterlerini uygular; pozitif sonuç log'a yazılır.

## Block: FM ZSD_999_FM_LOG_AUTO_APPROVE
Function Group: ZSD_999_FG01
Importing: I_VBELN TYPE VBELN_VA, I_POSNR TYPE POSNR_VA, I_USER TYPE XUBNAME, I_STATUS TYPE ZSD_999_DE_STATUS
Exporting: E_LOG_ID TYPE GUID_22
Exceptions: NOT_SAVED, INVALID_STATUS`,
  programEkrani: `## Block: PROGRAM ZSD_999_R001
Type: Executable
Tcode: ZSD999
Transport: (developer sağlayacak)

## Block: SELECTION_SCREEN
Field: P_WERKS  | Type: WERKS_D | Mandatory: X | Default: 1000
Field: S_KUNNR  | Type: RANGE of KUNNR | Mandatory: -
Field: S_AUART  | Type: RANGE of AUART | Mandatory: -
Field: P_DATFR  | Type: DATS    | Mandatory: X | Default: SY-DATUM - 30
Field: P_DATTO  | Type: DATS    | Mandatory: X | Default: SY-DATUM

## Block: ALV_LAYOUT
Output table: GT_ORDERS TYPE TABLE OF ZSD_999_STR_ORDER
Field: VBELN  | Col pos: 1 | Hotspot: X | Sum: -
Field: POSNR  | Col pos: 2 | Hotspot: - | Sum: -
Field: KUNNR  | Col pos: 3 | Hotspot: X | Sum: -
Field: MATNR  | Col pos: 4 | Hotspot: - | Sum: -
Field: KWMENG | Col pos: 5 | Hotspot: - | Sum: X
Field: NETWR  | Col pos: 6 | Hotspot: - | Sum: X
Field: STATUS | Col pos: 7 | Hotspot: - | Sum: -

## Block: ALV_BUTTONS
Button: AUTO_APPROVE | Icon: ICON_OKAY   | Tooltip: Seçili siparişleri otomatik onayla
Button: VA03         | Icon: ICON_SELECT_DETAIL | Tooltip: Seçili siparişi VA03'te aç
Button: EXPORT_XLSX  | Icon: ICON_EXPORT | Tooltip: Excel'e aktar`,
  standartCagrilar: [
    { standardObject: 'BAPI_USER_GET_DETAIL', calledFrom: 'ZSD_999_CL01 → AUTO_APPROVE', purpose: 'Kullanıcı departman ve yetki bilgisi', criticalParams: 'USERNAME = SY-UNAME' },
    { standardObject: 'RV_ORDER_CREDIT_CHECK', calledFrom: 'ZSD_999_CL01 → AUTO_APPROVE', purpose: 'Kredi kontrolü', criticalParams: 'KUNNR, NETWR, WAERK' },
    { standardObject: 'BAPI_TRANSACTION_COMMIT', calledFrom: 'ZSD_999_FM_LOG_AUTO_APPROVE', purpose: 'Log kaydı için COMMIT', criticalParams: 'WAIT = X' },
  ],
  testSenaryolari: [
    { id: 'T01', scenario: 'Filtresiz rapor', input: 'P_WERKS=1000, tarih = son 30 gün', expectedOutput: 'ALV en az 1 satır döner' },
    { id: 'T02', scenario: 'Kredi limiti aşan sipariş', input: 'Kredi limiti aşılmış test müşterisi', expectedOutput: 'AUTO_APPROVE R status döner, log yazılır' },
    { id: 'T03', scenario: 'Geçersiz tarih aralığı', input: 'P_DATFR > P_DATTO', expectedOutput: 'Hata mesajı: tarih sırası geçersiz' },
  ],
};

// ---------------------------------------------------------------------------
// Workbook assembly
// ---------------------------------------------------------------------------

function stdColumns() {
  return {
    standart: [
      { header: 'Standart Nesne Adı', width: 35, key: 'standardObject' },
      { header: 'Çağrıldığı Yer', width: 40, key: 'calledFrom' },
      { header: 'Amaç', width: 40, key: 'purpose' },
      { header: 'Kritik Parametreler', width: 40, key: 'criticalParams' },
    ],
    test: [
      { header: 'Test ID', width: 10, key: 'id' },
      { header: 'Senaryo', width: 40, key: 'scenario' },
      { header: 'Input', width: 40, key: 'input' },
      { header: 'Beklenen Output', width: 40, key: 'expectedOutput' },
    ],
  };
}

async function writeBlankTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hayat MCP TS Generator';

  buildGenelBilgi(wb);
  buildNesneler(wb);
  buildFreeText(wb, 'Is_Mantigi', '', HINT_IS_MANTIGI);
  buildFreeText(wb, 'DDIC_Alanlari', '', HINT_DDIC);
  buildCdsView(wb);
  buildFreeText(wb, 'Sinif_FM', '', HINT_SINIF_FM);
  buildFreeText(wb, 'Program_Ekrani', '', HINT_PROGRAM);
  buildTabular(wb, 'Standart_Cagrilar', stdColumns().standart);
  buildTabular(wb, 'Test_Senaryolari', stdColumns().test);

  const out = path.join(resourcesDir, 'ts-template.xlsx');
  await wb.xlsx.writeFile(out);
  console.log('Wrote', out);
}

async function writeSimpleExample() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hayat MCP TS Generator';
  buildGenelBilgi(wb, simple.generalInfo);
  buildNesneler(wb, simple.nesneler);
  buildFreeText(wb, 'Is_Mantigi', simple.isMantigi);
  // Conditional sheets — empty for DDIC / CDS
  buildFreeText(wb, 'DDIC_Alanlari', '');
  buildCdsView(wb);
  buildFreeText(wb, 'Sinif_FM', simple.sinifFm);
  buildFreeText(wb, 'Program_Ekrani', simple.programEkrani);
  // Optional sheets empty
  buildTabular(wb, 'Standart_Cagrilar', stdColumns().standart);
  buildTabular(wb, 'Test_Senaryolari', stdColumns().test);

  const out = path.join(resourcesDir, 'ornek-simple.xlsx');
  await wb.xlsx.writeFile(out);
  console.log('Wrote', out);
}

async function writeComplexExample() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hayat MCP TS Generator';
  buildGenelBilgi(wb, complex.generalInfo);
  buildNesneler(wb, complex.nesneler);
  buildFreeText(wb, 'Is_Mantigi', complex.isMantigi);
  buildFreeText(wb, 'DDIC_Alanlari', complex.ddicAlanlari);
  buildCdsView(wb, complex.cdsView);
  buildFreeText(wb, 'Sinif_FM', complex.sinifFm);
  buildFreeText(wb, 'Program_Ekrani', complex.programEkrani);
  buildTabular(wb, 'Standart_Cagrilar', stdColumns().standart, complex.standartCagrilar);
  buildTabular(wb, 'Test_Senaryolari', stdColumns().test, complex.testSenaryolari);

  const out = path.join(resourcesDir, 'ornek-complex.xlsx');
  await wb.xlsx.writeFile(out);
  console.log('Wrote', out);
}

await writeBlankTemplate();
await writeSimpleExample();
await writeComplexExample();
