## D. AGENT DAVRANIŞ KURALLARI

1. **Numara tahmini yapmaz.** Her nesne numarasını (P01/P02, I01/I02, CL01/CL02, FG01/FG02, FM01/FM02, ENHA_IM31/IM32, ENHA_E051/E052, BADI_E004/E005 vb.) kullanıcıya sorar.
2. **Sisteme gereksiz sorgu atmaz.** Sıradaki numara için SearchObject veya GetPackageContents çağırmaz.
3. **Önce tüm bilgileri toplar, sonra tek seferde oluşturur.** Agent şu akışı izler:
   - Geliştirme talebini anlar.
   - Gerekli tüm bilgileri (modül, paket, nesne numaraları, transport, ek bilgiler) tek bir turda kullanıcıdan toplar.
   - Oluşturulacak nesnelerin tam listesini kullanıcıya gösterir ve **tek bir onay** alır.
   - Onay aldıktan sonra tüm nesneleri art arda oluşturur. **Her nesne için ayrı ayrı onay istemez.**
4. **Oluşturduğu kodun standartlara uygunluğunu kendi kontrol eder:** prefix'ler, SY-DATLO kullanımı, hardcode olup olmadığı, IF FOUND ibaresi vb.
5. **Standart tablolara doğrudan SQL yazmaz.** Standart SAP tablolarına INSERT/UPDATE/DELETE/MODIFY yazmak yerine uygun BAPI/FM/sınıf arar. Bulamazsa kullanıcıyı bilgilendirir ve o tabloya müdahale etmez. Z/Y tabloları bu ku# HAYAT HOLDİNG — S/4HANA ABAP GELİŞTİRME AGENT KURALLARI

> Bu doküman MCP agent'ın memory'sinde kalıcı olarak tutulacak kural setidir.
> İki ana bölümden oluşur: (A) Sabit kurallar, (B) Her geliştirmede kullanıcıya sorulacak bilgiler, (C) Gerçek sistem örnekleri.

---

## A. SABİT KURALLAR (Her Zaman Geçerli)

### A1. İSİMLENDİRME PATTERN'LERİ

#### Paket Yapısı
- Ana paket: `ZXX` (ör: ZSD, ZMM, ZFI)
- Ortak paket: `ZXX_000` (modül genelinde ortak nesneler, exit/badi include'ları burada)
- WRICEF paketi: `ZXX_NNN` (ör: ZSD_001, ZMM_399)
- Paket içindeki tüm nesnelerin isimleri, istisnalar haricinde paket ismiyle başlar.

#### Paket Transport Ayarları
- **Transport Layer**: `ZS4D` (tüm custom paketler için)
- **Software Component**: `HOME` (tüm custom paketler için)
- **Record Changes**: `true` (transportable paketler için)
- Paket oluşturulurken bu değerler otomatik kullanılır, kullanıcıya sorulmaz.

#### Nesne İsimlendirme Şablonları

| Nesne | Pattern | Örnek |
|---|---|---|
| Program | `ZXX_NNN_PNN` | ZMM_399_P01 |
| Include | `ZXX_NNN_PNN_INN` | ZMM_399_P01_I01 |
| Function Group | `ZXX_NNN_FGNN` | ZMM_399_FG01 |
| Function Module | `ZXX_NNN_FGNN_FMNN` | ZMM_399_FG01_FM01 |
| Class | `ZXX_NNN_CLNN` | ZMM_399_CL01 |
| Exception Class | `ZCX_XX_NNN_CLNN` | ZCX_SD_001_CL01 |
| Interface | `ZXX_NNN_IFNN` | ZSD_001_IF01 |
| Program İçin Class | `ZXX_NNN_PNN_CLNN` | ZSD_001_P01_CL01 |
| Table | `ZXX_NNN_TNN` | ZSD_003_T01 |
| Text Table | `ZXX_NNN_TNNT` | ZSD_003_T01T |
| Structure | `ZXX_NNN_SNN` | ZSD_016_S01 |
| Append Structure | `ZXX_000_ASNN` | ZMM_000_AS01 |
| Data Element | `ZXX_NNN_ENN` | ZSD_016_E01 |
| Domain | `ZXX_NNN_DNN` | ZSD_016_D01 |
| Table Type | `ZXX_NNN_TTNN` | ZMM_399_TT01 |
| Search Help | `ZXX_NNN_SHNN` | ZSD_016_SH01 |
| Lock Object | `EZXX_NNN_TNN` | EZSD_016_T01 |
| View (Genel) | `ZXX_NNN_VNN` | ZSD_016_V01 |
| Maintenance View | `ZXX_NNN_VMNN` | ZSD_016_VM01 |
| CDS View (Genel) | `ZXX_NNN_CDS_VNN` | ZPP_040_CDS_V01 |
| CDS SQL View | `ZXXNNNCDSYNN` | ZPP040CDSV01 (maks 16 karakter) |
| CDS Interface View | `ZXX_NNN_CDS_VINN` | ZSD_001_CDS_VI01 |
| CDS Consumption View | `ZXX_NNN_CDS_VCNN` | ZSD_001_CDS_VC01 |
| CDS Extension View | `ZXX_NNN_CDS_VENN` | ZSD_001_CDS_VE01 |
| CDS Behaviour Def. | `ZXX_NNN_CDS_BDNN` | ZSD_001_CDS_BD01 |
| CDS Behaviour Pool | `ZXX_NNN_CDS_BPNN` | ZSD_001_CDS_BP01 |
| CDS BP Class | `ZXX_NNN_CDS_BPNN_CLNN` | ZSD_001_CDS_BP01_CL01 |
| CDS Table Function | `ZXX_NNN_TF_VNN` | ZPP_003_TF_V01 |
| AMDP Class | `ZXX_NNN_AMDP_CLNN` | ZSD_001_AMDP_CL01 |
| Transaction Code | `ZXXNNN` | ZSD001 |
| Message Class | `ZXX_NNN` | ZSD_001 |
| Number Range | `ZXX_NNN_N1` | ZSD_001_N1 |
| Smartform | `ZXX_NNN_FORM_SFNN` | ZSD_001_FORM_SF01 |
| Adobe Form | `ZXX_NNN_FORM_AFNN` | ZSD_001_FORM_AF01 |
| Adobe Form Interface | `ZXX_NNN_FORM_AINN` | ZSD_001_FORM_AI01 |
| ODATA Service | `ZXX_NNN_ODATA_NN` | ZSD_001_ODATA_01 |
| ODATA Helper Class | `ZXX_NNN_ODATA_CLNN` | ZSD_001_ODATA_CL01 |
| Fiori App | `ZXX_NNN_FIO_APPNN` | ZSD_001_FIO_APP01 |
| BSP App | `ZXX_NNN_BSPNN` | ZSD_001_BSP01 |
| XSLT Transformation | `ZXX_NNN_XSLT_NN` | ZSD_001_XSLT_01 |
| Simple Transformation | `ZXX_NNN_XST_NN` | ZSD_001_XST_01 |
| Shared Memory Area | `ZXX_NNN_SHM_AREA_CLNN` | ZSD_001_SHM_AREA_CL01 |
| Shared Memory Root | `ZXX_NNN_SHM_ROOT_CLNN` | ZSD_001_SHM_ROOT_CL01 |
| STVARVC Param | `ZXX_NNN_VARC_PNN` | ZSD_001_VARC_P01 |
| STVARVC SelOpt | `ZXX_NNN_VARC_SNN` | ZSD_001_VARC_S01 |
| Checkpoint Group | `ZXX_NNN_CPG_NN` | ZSD_001_CPG_01 |

#### Hayat Exit/BAdI Nesne İsimlendirme

| Nesne | Pattern | Paket | Örnek |
|---|---|---|---|
| Enhancement Impl. | `ZXX_000_ENHA_IMNN` | ZXX_000 | ZSD_000_ENHA_IM31, ZSD_000_ENHA_IM79 |
| Exit Include | `ZXX_000_ENHA_ENNN_INN` | ZXX_000 | ZSD_000_ENHA_E051_I01 |
| Exit Uygulama Class | `ZXX_NNN_ENHA_ENNN_CLNN` | ZXX_NNN | ZSD_167_ENHA_E051_CL01 |
| BAdI Implementation | `ZXX_000_BADI_IMNN` | ZXX_000 | ZMM_000_BADI_IM02 |
| BAdI Impl. Class | `ZXX_000_BADI_IMNN_CLNN` | ZXX_000 | ZMM_000_BADI_IM02_CL01 |
| BAdI Exit Class | `ZXX_NNN_BADI_ENNN_CLNN` | ZXX_NNN | ZSD_575_BADI_E004_CL01 |
| Screen Exit Include | `ZXX_000_SCRN_ENNN_INN` | ZXX_000 | ZSD_000_SCRN_E001_I01 |
| Repair Include | `ZXX_000_REPA_ENNN_INN` | ZXX_000 | ZSD_000_REPA_E001_I01 |
| Append Include | `ZXX_000_ENHA_ANNN_INN` | ZXX_000 | ZSD_000_ENHA_A001_I01 |

**Önemli:** Tüm numaralar (ENHA_IMNN, ENHA_ENNN, BADI_ENNN vb.) sistemde sıralı gider. Agent bu numaraları asla tahmin etmez, her zaman kullanıcıya sorar.

#### Değişken İsimlendirme Prefix'leri

| Scope | Elementary | Structure | Table | Data Ref | Object Ref | Exception Ref | Interface Ref | Constant |
|---|---|---|---|---|---|---|---|---|
| Global | gv_ | gs_ | gt_ | gr_ | go_ | gx_ | gif_ | gc_ |
| Local | lv_ | ls_ | lt_ | lr_ | lo_ | lx_ | lif_ | lc_ |
| Member | mv_ | ms_ | mt_ | mr_ | mo_ | mx_ | mif_ | mc_ |

#### Metod/Fonksiyon Parametre Prefix'leri

| Tip | Elementary | Structure | Table | Data Ref | Object Ref |
|---|---|---|---|---|---|
| Importing | iv_ | is_ | it_ | ir_ | io_ |
| Exporting | ev_ | es_ | et_ | er_ | eo_ |
| Changing | cv_ | cs_ | ct_ | — | — |
| Returning | rv_ | rs_ | rt_ | rr_ | ro_ |

#### Subroutine Parametre Prefix'leri
- Using: `pv_`, `pt_`, `ps_`, `pr_`, `po_`
- Changing: `cv_`, `ct_`, `cs_`
- Table: `t_`

#### Selection Screen
- Select Option: `s_` (ör: S_WERKS, S_LIFNR)
- Parameter: `p_` (ör: P_BUKRS)
- Radio Button: `r1_`, `r2_` (ör: R1_PROC1)
- Checkbox: `p_` veya `cb_` (ör: P_ISEMR1, CB_ACTIVE)

#### Diğer İsimlendirme
- Types: `ty_` prefix (ör: `ty_material_list`)
- Range: `r_` prefix (ör: `r_matnr`)
- Local Class: `lcl_` prefix
- Local Interface: `lif_` prefix
- Append Structure alanları: `zz` prefix (ör: `zzmtart`)

---

### A2. KODLAMA KURALLARI

1. **Hardcode ve sabit yönetimi:**
   - Malzeme, şirket kodu, üretim yeri, müşteri, satış org. gibi iş verileri kesinlikle hardcode yazılmaz.
   - Modülün `ZXX_000_CL02` sınıfındaki mevcut sabitler kullanılabilir. Yeni sabit eklemeden önce agent, ilgili sabit sınıfını (ör: `ZSD_000_CL02`, `ZMM_000_CL02`) tarayarak aynı anlama gelen bir sabit tanımı olup olmadığını kontrol eder. Yoksa kullanıcıdan yeni sabit oluşturmak için onay alır.
   - ZBCENH koşullu çıkış yapısı veya Z'li koşul tabloları da sabit yönetimi için alternatif yöntemlerdir.
   - Tek seferlik, revizyon ihtiyacı olmayan sabitler doğrudan ilgili alt sınıfın attributes kısmına yazılabilir.
   - **İstisna — Özel göstergeler:** SAP'nin standart kontrol değerleri için hardcode kullanılabilir, bunların sabit sınıfına alınmasına gerek yoktur. Örnekler: `UPDKZ = 'U'`, `TRTYP = 'V'`, `POSNR = '000001'`, `SHKZG = 'S'` gibi SAP'nin kendi iç gösterge/kontrol değerleri. **Not:** Hareket türleri (BWART) bu istisnaya dahil değildir — hareket türleri için mutlaka sabit sınıfları kullanılır.

2. **Object Oriented zorunluluğu:** Tüm geliştirmeler zorunluluk olmadıkça OO ile yapılır.

3. **Tarih/saat:** `SY-DATUM`, `SY-UZEIT` yerine **`SY-DATLO`**, **`SY-TIMLO`** kullanılır.

4. **Breakpoint:** `BREAK user` / `BREAK-POINT` kullanılmaz; SAAB ile checkpoint group oluşturulur.

5. **Text symbol:** Program içindeki metinler text symbol ile tanımlanır.

6. **Mesaj kontrolü:** Aynı mesaj zaten varsa yenisi oluşturulmaz. Bir modülün mesajı başka modülün mesaj class'ından verilmez.

7. **Data element/domain kontrolü:** Standartta uygun olan varsa yenisi oluşturulmaz.

8. **Reuse ALV kullanılmaz.** CL_GUI_ALV_GRID tercih edilir.

9. **ALV raporları:** `ZBC_000_IF01` interface yapısı ve `ZBC_000_P01` programı örnek alınarak geliştirilir.

10. **ABAP Memory:** Memory ID ilgili obje adıyla başlar.

11. **Include'larda IF FOUND:** Enhancement include'ları çağrılırken `IF FOUND` ibaresi eklenir.

12. **Standart tablolara doğrudan müdahale yasağı:** Standart SAP tablolarına (MARA, VBAK, EKKO, LIKP, BKPF vb.) doğrudan `INSERT`, `UPDATE`, `DELETE`, `MODIFY` statement'ları yazılmaz. Güncelleme işlemleri mutlaka standart BAPI, Function Module veya SAP sınıfları aracılığıyla yapılır. Eğer ilgili işlem için standart bir BAPI/FM/sınıf yoksa, agent standart tabloya doğrudan müdahale etmez ve durumu kullanıcıya bildirir. Bu kural yalnızca standart tablolar için geçerlidir; Z/Y tabloları için doğrudan INSERT/UPDATE/DELETE/MODIFY kullanılabilir.

---

### A3. PROGRAM BAŞLIK ŞABLONU

Her programın başında aşağıdaki format kullanılır:

```abap
*&---------------------------------------------------------------------*
*& Report ZXX_NNN_PNN
*&---------------------------------------------------------------------*
*& Created By       :
*& Analyst          :
*& Created Date     :
*& Title            :
*& FS-TS Number     :
*&----------------------------------------------------------------------
*& Description      :
*&
*&----------------------------------------------------------------------
```

Program attributes title formatı: `XX : {Açıklama}` (ör: `MM : İthalat Süreç Raporu`)

---

### A4. UTILITY SINIFLARI (ZBC_000 Paketi)

| Sınıf | Kullanım |
|---|---|
| ZBC_000_CL01 | General Utilities (read text, save text, popup, get_selections_from_program) |
| ZBC_000_CL02 | Screen Utilities (alan özellikleri, zorunlu alan kontrolü) |
| ZBC_000_CL03 | Mail Utilities (tüm mail gönderimleri) |
| ZBC_000_CL04 | File Utilities (excel yükleme/indirme, file dialog) |
| ZBC_000_CL05 | Batch Utilities (toplu veri aktarımı) |
| ZBC_000_CL07 | Log Message Utilities (kullanıcıya mesaj gösterimi) |
| ZBC_000_CL08 | Output Print Utilities (Smartforms, Adobe çıktıları) |
| ZBC_000_CL09 | ALV Utilities (opsiyonel) |
| ZBC_000_CL10 | Basis Global Constants |
| ZBC_000_CL11 | Domain Conversion-Exit Sınıfı |
| ZBC_000_IF01 | ALV raporlar için zorunlu interface |
| ZBC_000_FM01 | End-of-selection'da ALV ekranını çağıran fonksiyon modülü |
| ZXX_000_CL02 | Modül bazlı sabitler sınıfı (ör: ZMM_000_CL02=>gc_lfart_yifb) |

---

### A5. HAYAT EXIT/BADI FRAMEWORK (ZBCENH Yapısı)

#### Temel Prensipler
- Tüm exit/badi geliştirmeleri `ZBC_ENH_T01` tablosunda kayıtlıdır.
- Exit class'ları `ZBC_ENH_IF01` interface'ini implemente eder.
- Interface'in iki metodu vardır: `~CONTROL` (ön kontrol) ve `~EXECUTE` (iş mantığı).
- Interface'in bir attribute'u vardır: `~MV_ENH_CLASS_NAME` (TYPE CLB_CLASS_NAME).
- Parametreler `co_base->get_param('PARAM_ADI')` ile alınır ve FIELD-SYMBOLS'a atanır.
- Exit/badi include nesneleri `ZXX_000` ortak paketinde oluşturulur.
- Uygulama sınıfları ilgili WRICEF paketinde oluşturulur.
- Koşullu çıkış: `ZBC_ENH_T03` tablosu ile yönetilir.

#### Exit Include Çağrı Yapıları

**Not:** Aşağıdaki örneklerdeki EXIT_EXXX, BADI_EXXX gibi numaralar yalnızca format gösterimidir. Gerçek numaralar her zaman kullanıcıdan alınır.

**Function Exit içinden (ZBC_ENH_I01):**
```abap
CONSTANTS lc_exit_enhid TYPE zbc_enh_t01_e01 VALUE 'EXIT_EXXX'.
INCLUDE zbc_enh_i01.
```

**BAdI metodu içinden (ZBC_ENH_I02):**
```abap
CONSTANTS lc_exit_enhid TYPE zbc_enh_t01_e01 VALUE 'BADI_EXXX'.
INCLUDE zbc_enh_i02.
```

**Enhancement point/section:**
```abap
ENHANCEMENT 1 ZSD_000_ENHA_IMNN.    "active version
  INCLUDE ZSD_000_ENHA_ENNN_I01 IF FOUND.
ENDENHANCEMENT.
```

**Ekstra parametre gerektiğinde (I03/I04 + I00 pattern):**
```abap
CONSTANTS lc_exit_enhid TYPE zbc_enh_t01_e01 VALUE 'EXIT_EXXX'.
INCLUDE zbc_enh_i03.
ls_param-name = 'GS_AUFK'.
GET REFERENCE OF gs_aufk INTO ls_param-value.
INSERT ls_param INTO TABLE lt_param.
INCLUDE zbc_enh_i00.
```

#### Uygulama Sınıfı İç Yapısı (Execute Metodu)

Parametreleri `co_base->get_param()` ile alıp field-symbols'a atama pattern'i:
```abap
METHOD zbc_enh_if01~execute.
  DATA: lr_data TYPE REF TO data.
  FIELD-SYMBOLS: <xlips> TYPE va_lipsvb_t,
                 <likp>  TYPE likp.

  lr_data = co_base->get_param( 'XLIPS[]' ).
  ASSIGN lr_data->* TO <xlips>.

  lr_data = co_base->get_param( 'LIKP' ).
  ASSIGN lr_data->* TO <likp>.

  " ...iş mantığı...
ENDMETHOD.
```

#### Aynı User Exit'te Birden Fazla Modül
Bir SAP user exit'inde birden fazla modül enhancement yapabilir. Her biri kendi ENHA_IM numarasıyla ayrı ENHANCEMENT bloğu açar:
```abap
ENHANCEMENT 1  ZEWM_000_ENHA_IM215.    "active version
  INCLUDE zewm_000_enha_e215_i01 IF FOUND.
ENDENHANCEMENT.
ENHANCEMENT 1  ZMM_000_ENHA_IM56.    "active version
  INCLUDE ZMM_000_ENHA_E122_I01 IF FOUND.
ENDENHANCEMENT.
ENHANCEMENT 1  ZSD_000_ENHA_IM31.    "active version
  INCLUDE ZSD_000_ENHA_E051_I01 IF FOUND.
ENDENHANCEMENT.
```

#### AMDP BAdI'lerde
Custom exit yapısı kullanılamaz. BADI_A001 şeklinde raporlama kaydı yapılır, uygulayan sınıf adı boş bırakılır.

---

## B. HER GELİŞTİRMEDE AGENT'IN KULLANICIYA SORMASI GEREKEN BİLGİLER

Agent bir nesne oluşturma veya geliştirme talebi aldığında, **önce geliştirme tipini anlar**, sonra aşağıdaki bilgileri kullanıcıdan ister. Agent asla numara önermez veya tahmin etmez.

### B1. Her Zaman Sorulacaklar

1. **Modül:** SD, MM, FI, PP, QM, PM, TR, AA, HR, CCA, PC, BC, EWM...
2. **Ana paket ve alt paket:** Ör: "ZSD ana paketi altında ZSD_999 alt paketi"
3. **Oluşturulacak her nesnenin tam adı ve numarası:** Agent hiçbir nesneyi numarasını tahmin ederek oluşturmaz. Aşağıdaki nesneler dahil olmak üzere her nesne için numara kullanıcıdan alınır:
   - Program: `ZXX_NNN_PNN` → "Program numarası ne olacak? Ör: P01, P02?"
   - Include: `ZXX_NNN_PNN_INN` → "Include numarası ne olacak? Ör: I01, I02?"
   - Class: `ZXX_NNN_CLNN` → "Class numarası ne olacak? Ör: CL01, CL02?"
   - Interface: `ZXX_NNN_IFNN` → "Interface numarası ne olacak? Ör: IF01?"
   - Function Group: `ZXX_NNN_FGNN` → "Function Group numarası ne olacak? Ör: FG01?"
   - Function Module: `ZXX_NNN_FGNN_FMNN` → "Function Module numarası ne olacak? Ör: FM01?"
   - Table: `ZXX_NNN_TNN` → "Tablo numarası ne olacak? Ör: T01?"
   - Structure: `ZXX_NNN_SNN` → "Structure numarası ne olacak? Ör: S01?"
   - Data Element: `ZXX_NNN_ENN` → "Data Element numarası ne olacak? Ör: E01?"
   - Domain: `ZXX_NNN_DNN` → "Domain numarası ne olacak? Ör: D01?"
   - Table Type: `ZXX_NNN_TTNN` → "Table Type numarası ne olacak? Ör: TT01?"
   - CDS View: `ZXX_NNN_CDS_VNN` → "CDS View numarası ne olacak? Ör: V01?"
   - Form nesneleri, Search Help, Lock Object vb. — hepsi aynı şekilde sorulur.
4. **Transport request numarası:** Agent her nesne oluşturmadan önce transport numarasını sorar. Mevcut bir request mi kullanılacak, yoksa yeni mi oluşturulacak? Numara her zaman kullanıcıdan alınır.

### B2. Yeni Program / ALV Raporu

Numaralar B1'de sorulacak. Ek olarak:
- Program title (`XX : Açıklama` formatında)
- FS-TS numarası
- Created By / Analyst isimleri
- Gerekli structure, table type varsa numaraları

### B3. Exit/BAdI/Enhancement Geliştirme

Bu alan en çok numara gerektiren kısımdır. Tüm numaralar ZBCENH üzerinden developer tarafından takip edilir. Agent hiçbir numarayı tahmin etmez, hepsini kullanıcıya sorar.

1. **Exit tipi:** Enhancement, BAdI, Function Exit, Screen Exit, Repair?
2. **Exit ID numarası:** Ör: "ENHA_EXXX numarası nedir?" (ENHA_E051, ENHA_E052 gibi — developer ZBCENH'den sıradaki numarayı alır)
3. **BAdI ID numarası (BAdI ise):** Ör: "BADI_EXXX numarası nedir?" (BADI_E004, BADI_E005 gibi)
4. **Function Exit ID numarası (Function Exit ise):** Ör: "EXIT_EXXX numarası nedir?"
5. **Enhancement Implementation numarası:** Ör: "ZSD_000_ENHA_IMNN — IM numarası kaç?"
6. **Exit uygulama class numarası:** Ör: "ZSD_167_ENHA_E051_CL01 mi olacak?"
7. **Include numarası:** Ör: "ZSD_000_ENHA_E051_I01 mi?"
8. **Koşullu çıkış gerekli mi?** (ZBC_ENH_T03)

**BAdI için ek olarak:**
- BAdI Implementation numarası (ör: ZMM_000_BADI_IM02, sıradaki IM?)
- BAdI Implementation Class numarası (ör: ZMM_000_BADI_IM02_CL01)
- BAdI Exit Class numarası (ör: ZSD_575_BADI_E004_CL01)

**Önemli:** Agent ZBCENH bakımı yapmaz. Developer sıradaki numarayı ZBCENH işlem kodundan kontrol edip agent'a bildirir.

### B4. CDS View

Numaralar B1'de sorulacak. Ek olarak:
- View katmanı: General (V), Interface (VI), Consumption (VC), Extension (VE)?
- SQL View adı (16 karakter limiti)
- Parametre alacak mı?
- Behaviour Definition gerekli mi?

### B5. Tablo / Data Dictionary

Numaralar B1'de sorulacak. Ek olarak:
- Text table gerekli mi?
- Maintenance view gerekli mi?
- Lock object gerekli mi?

### B6. Form

Numaralar B1'de sorulacak. Ek olarak:
- Form tipi: Smartform, Adobe Form, SAPScript?

---

## C. GERÇEK SİSTEM ÖRNEKLERİ

### C1. ALV Rapor Programı Yapısı (ZBC_000_IF01 Pattern)

Hayat'ta tüm ALV raporları aynı yapıyı takip eder:

**Ana Program (ZMM_399_P01):**
```abap
REPORT zmm_399_p01.
INCLUDE zmm_399_p01_i01.

INITIALIZATION.
  PERFORM initialization.

START-OF-SELECTION.
  go_main->zbc_000_if01~start_of_selection( ).

END-OF-SELECTION.
  CALL FUNCTION 'ZBC_000_FM01'
    EXPORTING
      io_screen = go_main.

FORM initialization.
  CREATE OBJECT go_main.
ENDFORM.
```

**Include (ZMM_399_P01_I01):**
- `DATA: go_main TYPE REF TO zmm_399_cl01.` tanımı
- TABLES bildirimleri
- SELECTION-SCREEN blokları (s_, p_ prefix'leri ile)

**Program Sınıfı (ZMM_399_CL01):**
- `ZBC_000_IF01` interface'ini implement eder
- Public section'da: `gs_range`, `gt_data`, `gs_data` gibi veri tanımları (structure ve table type referanslarıyla: ZMM_399_S01, ZMM_399_TT01)
- Interface metodları: `start_of_selection`, `get_datas`, `create_alv_object`, `fill_field_catalog`, `fill_layout`, `exclude_buttons`, `screen_pbo`, `screen_pai`, `alv_toolbar`, `alv_user_command`, `alv_hotspot_click` vb.
- `start_of_selection` içinde: `zbc_000_cl01=>get_selections_from_program()` ile selection screen değerleri alınır
- `fill_field_catalog` içinde: `LVC_FIELDCATALOG_MERGE` ile structure'dan fcat üretilir, TEXT-xxx ile kolon başlıkları atanır
- `fill_layout` içinde: zebra, cwidth_opt, sel_mode gibi layout ayarları
- ALV handler'ları: `SET HANDLER me->zbc_000_if01~alv_toolbar FOR zbc_000_if01~go_alv` pattern'i
- İlk gösterim: `zbc_000_if01~go_alv->set_table_for_first_display()`

### C2. Hayat Enhancement Exit Class (ZSD_167_ENHA_E051_CL01)

```
Sınıf: ZSD_167_ENHA_E051_CL01
Paket: ZSD_167
Interface: ZBC_ENH_IF01
Metodlar: ~CONTROL, ~EXECUTE
Attribute: ~MV_ENH_CLASS_NAME (TYPE CLB_CLASS_NAME)
```

Execute metodunda parametreleri alma pattern'i:
```abap
lr_data = co_base->get_param( 'XLIPS[]' ).    " Tablo parametresi [] ile
ASSIGN lr_data->* TO <xlips>.

lr_data = co_base->get_param( 'LIKP' ).       " Tekil structure
ASSIGN lr_data->* TO <likp>.
```

Bu sınıf include üzerinden çağrılır:
```
ZSD_000_ENHA_E051_I01 (include, ZSD_000 paketinde)
  → ZBC_ENH_T01 tablosundan ZSD_167_ENHA_E051_CL01 sınıfını bulur
  → ~Execute metodunu çalıştırır
```

### C3. Hayat BAdI Exit Class (ZSD_575_BADI_E004_CL01)

BAdI exit class'ları da aynı ZBC_ENH_IF01 interface'ini kullanır. Aynı `co_base->get_param()` pattern'i geçerlidir.

### C4. SAP User Exit'te Enhancement Ekleme (MV50AFZ1 örneği)

SAP standart include'unda her enhancement ayrı bir blok olarak eklenir:
```abap
FORM USEREXIT_SAVE_DOCUMENT_PREPARE.
  ENHANCEMENT 1 ZEWM_000_ENHA_IM215.    "active version
    INCLUDE zewm_000_enha_e215_i01 IF FOUND.
  ENDENHANCEMENT.
  ENHANCEMENT 1 ZMM_000_ENHA_IM56.    "active version
    INCLUDE ZMM_000_ENHA_E122_I01 IF FOUND.
  ENDENHANCEMENT.
  ENHANCEMENT 1 ZSD_000_ENHA_IM31.    "active version
    INCLUDE ZSD_000_ENHA_E051_I01 IF FOUND.
  ENDENHANCEMENT.
ENDFORM.
```

### C5. BAdI Implementation (ZMM_000_BADI_IM02)

```
Implementation: ZMM_000_BADI_IM02
Definition: INVOICE_UPDATE
Interface: IF_EX_INVOICE_UPDATE
Implementing Class: ZMM_000_BADI_IM02_CL01
Paket: ZMM_000
Enhancement: ZMM_000_ENHA_IM06
```
BAdI implementation'ın short text'ine badi adı/açıklaması yazılır.

### C6. CDS View (ZPP_040_CDS_V01)

```sql
@AbapCatalog.sqlViewName: 'ZPP040CDSV01'
@AbapCatalog.compiler.compareFilter: true
@AbapCatalog.preserveKey: true
@AccessControl.authorizationCheck: #CHECK
@EndUserText.label: 'Malzeme Ürün Ağacı CDS'
define view ZPP_040_CDS_V01 with parameters SPRAS:spras
  as select from mara as m1
    inner join mast on m1.matnr = mast.matnr
    ...
```
SQL View adı 16 karakter limiti: `ZPP040CDSV01`

### C7. AMDP Class (Table Function)

AMDP sınıfları `IF_AMDP_MARKER_HDB` interface'ini implemente eder. Table function methodları `FOR TABLE FUNCTION` ile tanımlanır:
```abap
CLASS-METHODS:
  get_data_mardh FOR TABLE FUNCTION zpp_003_tf_v01.
```

---

## D. AGENT DAVRANIŞ KURALLARI

1. **Numara tahmini yapmaz.** Her nesne numarasını (P01/P02, I01/I02, CL01/CL02, FG01/FG02, FM01/FM02, ENHA_IM31/IM32, ENHA_E051/E052, BADI_E004/E005 vb.) kullanıcıya sorar.
2. **Sisteme gereksiz sorgu atmaz.** Sıradaki numara için SearchObject veya GetPackageContents çağırmaz.
3. **Nesne oluşturmadan önce tüm bilgileri toplar.** Eksik bilgiyle nesne oluşturmaya başlamaz.
4. **Oluşturduğu kodun standartlara uygunluğunu kendi kontrol eder:** prefix'ler, SY-DATLO kullanımı, hardcode olup olmadığı, IF FOUND ibaresi vb.
5. **Birden fazla nesne oluşturulacaksa** (ör: exit class + include + ZBCENH kaydı), tüm nesne listesini ve numaralarını önceden kullanıcıya onaylatır.
6. **Standart tablolara doğrudan SQL yazmaz.** Standart SAP tablolarına INSERT/UPDATE/DELETE/MODIFY yazmak yerine uygun BAPI/FM/sınıf arar. Bulamazsa kullanıcıyı bilgilendirir ve o tabloya müdahale etmez. Z/Y tabloları bu kuraldan muaftır.
7. **Transport numarasını her zaman sorar.** Nesne oluşturmaya veya değiştirmeye başlamadan önce kullanılacak transport request numarasını kullanıcıdan alır.
8. **Alt paket yoksa önce oluşturur.** Nesne oluşturmaya başlamadan önce hedef alt paketin (ZXX_NNN) var olup olmadığını kontrol eder. Yoksa `CreatePackage` ile oluşturur ve aktive eder. Bu adımı kullanıcıya sormadan otomatik yapar.
