# Z_HAYAT_DDIC_CREATE — HR Sistemi DDIC Dispatcher FM

Bu klasör, HR sisteminde Domain / Data Element / Structure / Table / Table Type oluşturmak için kullanılan dinamik dispatcher Function Module'ün kaynak kodunu içerir.

## Neden bu dispatcher?

HR (legacy) SAP sisteminde okuma/aktivasyon ADT API'leri çalışıyor; ancak DDIC nesne **oluşturma** için ADT REST endpoint'i mevcut değil. MCP `CreateTable` / `CreateStructure` / `CreateDataElement` / `CreateDomain` handler'ları sistem türü `legacy` olduğunda bu FM'i RFC üzerinden çağırır.

## Kurulum

İki kaynak dosya var:
- [`lzhayat_ddictop.abap`](lzhayat_ddictop.abap) — function group TOP include (TYPES + helper FORM'lar)
- [`z_hayat_ddic_create.abap`](z_hayat_ddic_create.abap) — RFC-enabled function module gövdesi

Kurulum yolları:

**Programatik (önerilen)**: HR MCP araçlarıyla otomatik kurulum — `mcp__hr__CreateFunctionGroup` → `mcp__hr__UpdateInclude` (top) → `mcp__hr__CreateFunctionModule`. Detay için [docs/installation/HR_DDIC_RFC_SETUP.md](../../../docs/installation/HR_DDIC_RFC_SETUP.md).

**Manuel (SE80)**:
1. SE80 → Function Group → `ZHAYAT_DDIC` (Paket: `$TMP` veya kurumsal Z paketi).
2. Top include (`LZHAYAT_DDICTOP`) içeriğini [`lzhayat_ddictop.abap`](lzhayat_ddictop.abap) ile değiştir.
3. SE37 → `Z_HAYAT_DDIC_CREATE` oluştur, "Remote-Enabled Module" işaretle, gövdesini [`z_hayat_ddic_create.abap`](z_hayat_ddic_create.abap) ile doldur.
4. Sırayla TOP include → FM aktive et.

## Ön koşullar (SAP sistem tarafı)

- `DDIF_DOMA_PUT`, `DDIF_DOMA_ACTIVATE`, `DDIF_DTEL_PUT`, `DDIF_DTEL_ACTIVATE`, `DDIF_TABL_PUT`, `DDIF_TABL_ACTIVATE`, `DDIF_TTYP_PUT`, `DDIF_TTYP_ACTIVATE` standart FM'leri (her SAP sisteminde mevcut).
- `TR_TADIR_INTERFACE` ve `TR_OBJECTS_INSERT` (transport API'leri).
- JSON parse için `/ui2/cl_json` (NW 7.40+ standart). Eski sistemde yoksa, dispatcher otomatik fallback'e geçer.

## Yetki

FM'i çağıran kullanıcının ihtiyaç duyduğu yetkiler:
- `S_DEVELOP` — DOMA/DTEL/TABL/TTYP nesne tipleri için ACTVT 01 (create), 02 (change), 07 (activate).
- `S_TRANSPRT` — transport append için.
- `S_RFC` — `Z_HAYAT_DDIC_CREATE` FM grubu (`ZHAYAT_DDIC`) için.

## İmza özet

```
IMPORTING
  IV_OBJECT_TYPE  TYPE CHAR10        " 'DOMAIN' | 'DTEL' | 'STRUCTURE' | 'TABLE' | 'TTYP'
  IV_OBJECT_NAME  TYPE TADIR-OBJ_NAME
  IV_PACKAGE      TYPE DEVCLASS
  IV_TRANSPORT    TYPE TRKORR OPTIONAL
  IV_SPEC_JSON    TYPE STRING        " obje tipine göre JSON spec
  IV_ACTIVATE     TYPE ABAP_BOOL DEFAULT 'X'
EXPORTING
  EV_SUCCESS      TYPE ABAP_BOOL
  EV_MESSAGE      TYPE STRING
  ET_LOG          TYPE BAPIRETTAB
```

## JSON Spec şemaları

### DOMAIN
```json
{
  "description": "Hayat genel domain örneği",
  "datatype": "CHAR",
  "leng": 10,
  "decimals": 0,
  "outputlen": 10,
  "convexit": "",
  "lowercase": false,
  "value_table": "",
  "fixed_values": [
    { "low": "X", "high": "", "ddtext": "Aktif" },
    { "low": "I", "high": "", "ddtext": "İptal" }
  ]
}
```

### DTEL
```json
{
  "description": "Hayat data element örneği",
  "domname": "ZSD_001_D01",
  "headlen": 10, "scrlen1": 10, "scrlen2": 20, "scrlen3": 40,
  "reptext": "Kısa", "scrtext_s": "Kısa", "scrtext_m": "Orta", "scrtext_l": "Uzun"
}
```

### STRUCTURE
```json
{
  "description": "Hayat struct örneği",
  "fields": [
    { "fieldname": "VBELN", "rollname": "VBELN_VA" },
    { "fieldname": "KWMENG", "rollname": "KWMENG", "reftable": "VBAP", "reffield": "VRKME" }
  ],
  "includes": [
    { "structure": "ZSD_000_S01", "suffix": "" }
  ]
}
```

### TABLE
```json
{
  "description": "Hayat tablo örneği",
  "delivery_class": "C",
  "data_maintenance": "X",
  "fields": [
    { "fieldname": "MANDT", "rollname": "MANDT", "key": true, "notnull": true },
    { "fieldname": "VBELN", "rollname": "VBELN_VA", "key": true, "notnull": true },
    { "fieldname": "NETWR", "rollname": "NETWR_AP", "reftable": "VBAP", "reffield": "WAERK" }
  ]
}
```

### TTYP
```json
{
  "description": "Hayat table type örneği",
  "rowtype": "ZSD_001_S01",
  "rowkind": "S",
  "accessmode": "T",
  "keykind": "N"
}
```

## Hata yönetimi

- `EV_SUCCESS = ABAP_FALSE` döndüğünde, `ET_LOG` içinde aktivasyon ve PUT mesajları satır satır listelenir (BAPIRET2 formatında).
- Aktivasyon başarısız olsa bile PUT işlemi geri alınmaz; geri alma sorumluluğu çağıranındır.
