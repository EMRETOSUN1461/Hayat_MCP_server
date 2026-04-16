# HAYAT HOLDİNG — S/4HANA ABAP GELİŞTİRME AGENT KURALLARI

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
- Paket oluştururken kullanıcıdan sadece şunlar sorulur: **paket adı**, **üst paket (super_package)**, **transport request numarası**.

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

7. **Data element/domain kontrolü:** Standartta uygun olan varsa yenisi oluşturulmaz. Structure ve tablolarda generic/built-in tipler (`abap.char`, `abap.quan`, `abap.curr` vb.) kesinlikle kullanılmaz — her alan için mutlaka data element kullanılır.

8. **Reuse ALV kullanılmaz.** CL_GUI_ALV_GRID tercih edilir.

9. **ALV raporları:** `ZBC_000_IF01` interface yapısı ve `ZBC_000_P01` programı örnek alınarak geliştirilir.

10. **ABAP Memory:** Memory ID ilgili obje adıyla başlar.

11. **Include'larda IF FOUND:** Enhancement include'ları çağrılırken `IF FOUND` ibaresi eklenir.

12. **Standart tablolara doğrudan müdahale yasağı:** Standart SAP tablolarına (MARA, VBAK, EKKO, LIKP, BKPF vb.) doğrudan `INSERT`, `UPDATE`, `DELETE`, `MODIFY` statement'ları yazılmaz. Güncelleme işlemleri mutlaka standart BAPI, Function Module veya SAP sınıfları aracılığıyla yapılır. Eğer ilgili işlem için standart bir BAPI/FM/sınıf yoksa, agent standart tabloya doğrudan müdahale etmez ve durumu kullanıcıya bildirir. Bu kural yalnızca standart tablolar için geçerlidir; Z/Y tabloları için doğrudan INSERT/UPDATE/DELETE/MODIFY kullanılabilir.

13. **Global sabit sınıfı transport kontrolü:** `ZXX_000_CL02` gibi global sabit sınıflarına (`ZSD_000_CL02`, `ZMM_000_CL02` vb.) ekleme yapmadan önce, sınıf üzerinde kullanıcının verdiği transport haricinde başka bir açık transport request olup olmadığı kontrol edilir. Başka bir request varsa işleme devam edilmez ve kullanıcı bilgilendirilir. Bu sınıflar her yerde kullanıldığından, değişikliğin doğru transporta girdiğinden emin olunmalıdır — aksi halde transport taşınmayı unutulursa prod sistemde dump alınır.

14. **FM / BAPI / Class Method çağrıları:** Kodlama içerisinde kullanılacak Function Module, BAPI veya Class Method çağrılarında parametre eksikliği ya da hatalı parametre geçişi runtime dump'a sebep olabilir (syntax check başarılı olsa bile). Bunu önlemek için:
   - Kullanılacak obje önce **Where-Used** veya ilgili arama tool'u ile sistemde var olup olmadığı kontrol edilir.
   - Obje sistemde **mevcut değilse** koda eklenmez; kullanıcıdan bilgi alınır (doğru obje adı, alternatif yöntem vb.).
   - Obje mevcutsa **imzası okunur** (import, export, changing, tables, exceptions parametreleri).
   - Parametreler imzaya birebir uygun şekilde kodlanır; opsiyonel/zorunlu ayrımına dikkat edilir.
   - Parametrelere gönderilecek değişkenlerin tipleri **her zaman FM/BAPI/Method imzasındaki tiple birebir aynı** olmalıdır (ör: `TYPE bapi2045l2-insplot`). Generic tipler (`space`, `sy-datum`, `abap_true` vb.) veya uyumsuz tipler kullanılmaz — tip uyumsuzluğu syntax check'ten geçse bile runtime dump'a sebep olur.
   - Özellikle EXPORTING/IMPORTING yön karışıklığına ve TABLES vs CHANGING farkına dikkat edilir.

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

#### BAdI/Exit İmplementasyon İş Akışı (Design Pattern)

Mevcut bir BAdI/exit sınıfında doğrudan kod varsa veya yeni bir BAdI/exit implemente edilecekse, agent aşağıdaki iş akışını uygular:

**1. Bilgi toplama — kullanıcıdan al:**
- Enhancement ID (`BADI_EXXX` / `EXIT_EXXX`)
- Uygulama sınıfı adı (`ZXX_000_BADI_EXXX_CL01`)
- Transport request numarası

**2. Ön kontroller:**
- BAdI interface'ini oku → parametre adlarını ve tiplerini tespit et (`IS_xxx type ???`, `CS_xxx type ???`)
- Global sabit sınıfında (`ZXX_000_CL02`) açık transport kontrolü yap → başka request varsa dur, kullanıcıyı bilgilendir
- Mevcut kodda hardcode var mı kontrol et → sabit sınıfında karşılığı yoksa yeni sabit ekle

**3. Uygulama sınıfını oluştur (`ZXX_000_BADI_EXXX_CL01`):**
- `ZBC_ENH_IF01` interface'ini implemente et
- `~CONTROL` metodu (ön kontrol, gerekmedikçe boş bırakılır)
- `~EXECUTE` metodu:
  - Parametreleri `co_base->get_param('PARAM_ADI')` ile al, `FIELD-SYMBOLS`'a ata
  - Atama kontrolü yap (`CHECK <fs> IS ASSIGNED`)
  - İş mantığını yaz
  - Hardcode yerine sabit sınıfı referansları kullan (`zxx_000_cl02=>gc_xxx`)
  - Tek seferlik sabitler (RFC kullanıcı adları vb.) sınıfın kendi attribute'larına yazılabilir

**4. BAdI/Exit sınıfını güncelle:**
- Metot içindeki tüm iş mantığını kaldır
- Yerine include pattern'i koy:
```abap
constants lc_exit_enhid type zbc_enh_t01_e01 value 'BADI_EXXX'.
include zbc_enh_i02.
```

**5. Doğrulama:**
- Her iki sınıfı da `GetClass`/`ReadClass` ile oku
- Enhancement ID'nin (`BADI_EXXX`) kullanıcının verdiği değerle birebir eşleştiğini doğrula
- Aktivasyon başarılı mı kontrol et

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

### B4. Structure Oluşturma

Agent, structure oluşturmadan önce **mutlaka** kullanıcıdan alan bilgilerini aşağıdaki formatta ister. Agent asla kendi başına alan listesi belirlemez.

**İstenecek format:**

| Alan Adı | Data Element | Curr/Quan Ref |
|---|---|---|
| VBELN | VBELN_VA | |
| KWMENG | KWMENG | VBAP-VRKME |
| NETWR | NETWR_AP | VBAP-WAERK |
| WAERK | WAERK | |

- `Curr/Quan Ref` kolonuna CURR/QUAN alanları için `TABLO-ALAN` formatında referans yazılır (ör: `MARA-MEINS`, `VBAP-WAERK`)
- CURR/QUAN olmayan alanlar için boş bırakılır

**Kurallar:**
- **Her alan için mutlaka data element kullanılır.** `abap.char(N)`, `abap.quan(N,M)`, `abap.curr(N,M)`, `abap.numc(N)` gibi generic/built-in tipler kesinlikle kullanılmaz. `Data Element` kolonu boşsa agent tahmin yapmaz — kullanıcıdan data element bilgisini ister. Bu bilgi alınmadan structure oluşturulmaz.
- **Alan adları ve sırası birebir korunur.** Alanlar kullanıcının verdiği isimle ve verdiği sırayla oluşturulur. Agent hiçbir alanı yeniden adlandıramaz, sırasını değiştiremez veya ekstra alan ekleyemez.
- `Curr/Quan Ref` kolonunda referans varsa, bu bilgi DDL'de `@Semantics` annotation'ı olarak yazılır
- **Curr/Quan Ref dış tabloya referanstır.** Birim/para birimi alanının aynı structure içinde olması gerekmez. Örneğin `MENGE` alanı `MARA-MEINS` referansı alıyorsa, MEINS alanı structure'a eklenmez — sadece annotation yazılır.
- **`@Semantics` annotation formatı:** `TABLO-ALAN` referansı küçük harfle, tire yerine nokta ile yazılır: `MARA-MEINS` → `@Semantics.quantity.unitOfMeasure : 'mara.meins'`, `VBAP-WAERK` → `@Semantics.amount.currencyCode : 'vbap.waerk'`
- Eğer birim/para birimi alanı structure'ın kendi içinde de varsa (kullanıcı eklenmesini istediyse), annotation kendi structure'ına referans verir: `'zsd_999_s01.waerk'`
- Agent bu bilgiyi almadan structure DDL kodu yazmaz

### B5. Tablo Oluşturma

Agent, tablo oluşturmadan önce **mutlaka** kullanıcıdan alan ve tablo özellik bilgilerini aşağıdaki formatta ister. Agent asla kendi başına alan listesi veya tablo özellikleri belirlemez.

**İstenecek format:**

| Alan Adı | Data Element | Key | Curr/Quan Ref |
|---|---|---|---|
| MANDT | MANDT | X | |
| VBELN | VBELN_VA | X | |
| NETWR | NETWR_AP | | BKPF-WAERS |

Delivery Class       : C (veya A, L, G, W, S, E)
Data Maintenance     : ALLOWED (veya RESTRICTED, NOT_ALLOWED)

**Kurallar:**
- **Her alan için mutlaka data element kullanılır.** Generic/built-in tipler (`abap.char`, `abap.quan`, `abap.curr`, `abap.numc` vb.) kesinlikle kullanılmaz. `Data Element` kolonu boşsa agent tahmin yapmaz — kullanıcıdan data element bilgisini ister. Bu bilgi alınmadan tablo oluşturulmaz.
- **Alan adları ve sırası birebir korunur.** Alanlar kullanıcının verdiği isimle ve verdiği sırayla oluşturulur. Agent hiçbir alanı yeniden adlandıramaz, sırasını değiştiremez veya ekstra alan ekleyemez.
- **Curr/Quan Ref dış tabloya referanstır.** Birim/para birimi alanının aynı tabloda olması gerekmez. Agent kullanıcının vermediği alanı otomatik eklemez.
- `Key` kolonunda `X` olan alanlar primary key'dir. Key alanlar otomatik olarak NOT NULL kabul edilir.
- **Search help DDL tablo tanımında desteklenmez.** Kullanıcı search help'i SE11'den manuel ekler. Formatta search help istenmez.
- `Curr/Quan Ref` kolonunda CURR/QUAN alanları için `TABLO-ALAN` formatında referans zorunludur (ör: `VBAP-WAERK`)
- Agent bu bilgilerin tamamını almadan tablo oluşturmaz

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

### B6. CDS View

Numaralar B1'de sorulacak. Ek olarak:
- View katmanı: General (V), Interface (VI), Consumption (VC), Extension (VE)?
- SQL View adı (16 karakter limiti)
- Parametre alacak mı?
- Behaviour Definition gerekli mi?

### B7. Tablo / Data Dictionary

Numaralar B1'de sorulacak. Ek olarak:
- Text table gerekli mi?
- Maintenance view gerekli mi?
- Lock object gerekli mi?

### B8. Form

Numaralar B1'de sorulacak. Ek olarak:
- Form tipi: Smartform, Adobe Form, SAPScript?

---

## C. GERÇEK SİSTEM ÖRNEKLERİ

### C1. ALV Rapor Programı Yapısı (ZBC_000_IF01 Pattern)

Hayat'ta tüm ALV raporları aynı yapıyı takip eder. **Referans program: ZSD_616_P01 / ZSD_616_CL01.**

**Ana Program (ZSD_616_P01):**
```abap
REPORT zsd_616_p01.
INCLUDE zsd_616_p01_i01.

INITIALIZATION.
  CREATE OBJECT go_main.

START-OF-SELECTION.
  go_main->zbc_000_if01~start_of_selection( ).

END-OF-SELECTION.
  IF go_main->gt_record IS INITIAL.
    MESSAGE s022(zbc).
    RETURN.
  ENDIF.

  CALL FUNCTION 'ZBC_000_FM01'
    EXPORTING
      io_screen = go_main.
```

**Include (ZSD_616_P01_I01):**
- `DATA: go_main TYPE REF TO zsd_616_cl01.` tanımı
- TABLES bildirimleri veya DATA BEGIN OF so yapısı
- SELECTION-SCREEN blokları (s_, p_ prefix'leri ile)

**Program Sınıfı — Kritik Metodlar (ZSD_616_CL01 referans):**

`constructor`:
```abap
METHOD constructor.
  me->zbc_000_if01~gv_struc_name = 'ZXX_NNN_SNN'.
ENDMETHOD.
```

`screen_pbo` — **PF-STATUS ve IS INITIAL kontrolü zorunlu:**
```abap
METHOD zbc_000_if01~screen_pbo.
  SET PF-STATUS 'GUI100' OF PROGRAM iv_program.
  IF zbc_000_if01~go_alv IS INITIAL.
    me->zbc_000_if01~create_alv_object( ).
    me->zbc_000_if01~gv_title = sy-title.
  ELSE.
    zbc_000_cl09=>refresh_table_display( io_alv_grid = zbc_000_if01~go_alv ).
  ENDIF.
ENDMETHOD.
```

`create_alv_object` — **Container ve ALV nesnesi burada oluşturulur (CHECK IS BOUND yapılmaz!):**
```abap
METHOD zbc_000_if01~create_alv_object.
  DATA: lo_container TYPE REF TO cl_gui_custom_container.
  DATA: ls_layout  TYPE lvc_s_layo, ls_variant TYPE disvariant.
  DATA: lt_exclude TYPE ui_functions, lt_fcat TYPE lvc_t_fcat.

  CREATE OBJECT lo_container EXPORTING container_name = 'ALV_CONTAINER'.
  CREATE OBJECT zbc_000_if01~go_alv EXPORTING i_parent = lo_container.

  lt_fcat    = me->zbc_000_if01~fill_field_catalog( iv_structure_name = me->zbc_000_if01~gv_struc_name ).
  lt_exclude = me->zbc_000_if01~exclude_buttons( ).
  ls_layout  = me->zbc_000_if01~fill_layout( ).
  ls_variant-report = sy-cprog.

  CALL METHOD zbc_000_if01~go_alv->set_table_for_first_display
    EXPORTING is_layout = ls_layout  it_toolbar_excluding = lt_exclude
              is_variant = ls_variant  i_save = 'A'  i_default = 'X'
    CHANGING  it_outtab = gt_data  it_fieldcatalog = lt_fcat.
ENDMETHOD.
```

`fill_field_catalog` — **Data element'ten gelen başlıklar kullanılır, hardcode başlık yazılmaz:**
```abap
METHOD zbc_000_if01~fill_field_catalog.
  FREE rt_fcat.
  CALL FUNCTION 'LVC_FIELDCATALOG_MERGE'
    EXPORTING i_structure_name = iv_structure_name
    CHANGING  ct_fieldcat = rt_fcat.
  LOOP AT rt_fcat ASSIGNING FIELD-SYMBOL(<fs>).
    <fs>-colddictxt = 'L'.   " Data element long text kullan
    " Sadece özel durumlar için müdahale:
    " WHEN 'VRKME'. <fs>-no_out = abap_true.
    " WHEN 'NETWR'. <fs>-cfieldname = 'WAERK'.
  ENDLOOP.
  gt_fcat = rt_fcat.
ENDMETHOD.
```

`screen_pai`:
```abap
METHOD zbc_000_if01~screen_pai.
  CASE iv_ucomm.
    WHEN 'BACK' OR 'EXIT' OR 'CANCEL'.
      zbc_000_if01~go_alv->free( ).
      FREE: gt_data.
      SET SCREEN 0. LEAVE SCREEN.
  ENDCASE.
ENDMETHOD.
```

**Önemli noktalar:**
- `create_alv_object` içinde `CHECK go_alv IS BOUND` **yapılmaz** — bu metod container ve ALV nesnesini kendisi oluşturur
- `screen_pbo` içinde `SET PF-STATUS 'GUI100' OF PROGRAM iv_program` **zorunludur**
- `screen_pbo` içinde `IF go_alv IS INITIAL` kontrolü ile ALV sadece bir kez oluşturulur, sonraki PBO'larda refresh yapılır
- `fill_field_catalog` içinde `colddictxt = 'L'` ile data element long text'leri kullanılır, hardcode başlık verilmez
- `set_table_for_first_display` çağrısında `is_variant` ve `i_save = 'A'` parametreleri layout kaydetme desteği sağlar
- Basit ALV raporlarında SET HANDLER (hotspot, double_click, toolbar, user_command) eklenmez, sadece gerektiğinde eklenir

#### ZBC_000_IF01 ALV Event Metotları Kullanım Kılavuzu

Agent, ALV raporlarında aşağıdaki senaryolarda ilgili interface metodunu kullanır. Aynı iş için private metot oluşturmaz; tüm ALV event işlemleri interface metotları üzerinden yapılır.

| Senaryo | Metot | Açıklama |
|---|---|---|
| Toolbar'dan buton gizleme | `~EXCLUDE_BUTTONS` | ALV standart toolbar'ından gösterilmemesi istenen butonları çıkarır. `rt_exc_buttons` return tablosuna ekle. |
| Toolbar'a yeni buton ekleme | `~ALV_TOOLBAR` | ALV toolbar'ına custom buton ekler. `e_object->mt_toolbar` tablosuna `stb_button` satırları APPEND edilir. |
| Custom buton tıklama işlemi | `~ALV_USER_COMMAND` | `~ALV_TOOLBAR` ile eklenen butonların `e_ucomm` değerine göre iş mantığı çalıştırır. |
| GUI Status buton işlemi | `~USER_COMMAND` | PF-STATUS'e (GUI Status) eklenen butonların `iv_ucomm` değerine göre iş mantığı çalıştırır. ALV toolbar butonu değilse bu metot kullanılır. |
| Hotspot tıklama | `~ALV_HOTSPOT_CLICK` | `fill_field_catalog` içinde bir alana `hotspot = abap_true` atandıktan sonra, o alana tıklandığında çalışacak iş mantığı bu metoda yazılır. `e_row_id`, `e_column_id` parametreleri ile tıklanan hücre belirlenir. |
| Çift tıklama | `~ALV_DOUBLE_CLICK` | ALV'de bir satıra çift tıklandığında çalışacak iş mantığı bu metoda yazılır. `e_row`, `e_column` parametreleri ile tıklanan hücre belirlenir. |
| Buton tipi alan tıklama | `~ALV_BUTTON_CLICK` | `fill_field_catalog` içinde bir alana `style = cl_gui_alv_grid=>mc_style_button` atandıktan sonra, o butona tıklandığında çalışacak iş mantığı bu metoda yazılır. |
| Hücre değişikliği | `~ALV_DATA_CHANGED` | ALV editable modda iken hücre değeri değiştiğinde tetiklenir. Validasyon ve hesaplama mantığı bu metoda yazılır. `er_data_changed` parametresi ile değişen hücrelere erişim sağlanır. |
| Değişiklik tamamlama | `~ALV_DATA_CHANGED_FINISHED` | `~ALV_DATA_CHANGED` işlemi tamamlandıktan sonra tetiklenir. Değişiklik sonrası toplam hesaplama veya ekran güncelleme gibi işlemler için kullanılır. |

**Event handler kaydı:** Kullanılan her event metodu için `create_alv_object` metodunda `set_table_for_first_display` çağrısından SONRA `SET HANDLER` ile kayıt yapılır:
```abap
SET HANDLER me->zbc_000_if01~alv_toolbar FOR zbc_000_if01~go_alv.
SET HANDLER me->zbc_000_if01~alv_user_command FOR zbc_000_if01~go_alv.
" Diğer event'ler için de aynı pattern:
" SET HANDLER me->zbc_000_if01~alv_hotspot_click FOR zbc_000_if01~go_alv.
" SET HANDLER me->zbc_000_if01~alv_double_click FOR zbc_000_if01~go_alv.
" SET HANDLER me->zbc_000_if01~alv_button_click FOR zbc_000_if01~go_alv.
" SET HANDLER me->zbc_000_if01~alv_data_changed FOR zbc_000_if01~go_alv.
" SET HANDLER me->zbc_000_if01~alv_data_changed_finished FOR zbc_000_if01~go_alv.
```

**Kural:** Agent, ALV event işlemleri için private metot tanımlamaz. Tüm event kodları doğrudan ilgili interface metoduna yazılır. İş mantığı karmaşıksa, private helper metotlar oluşturulabilir ancak event handler'ın kendisi her zaman interface metodudur.

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
8. **Alt paket yoksa önce oluşturur.** Nesne oluşturmaya başlamadan önce hedef alt paketin (ZXX_NNN) var olup olmadığını kontrol eder. Yoksa `CreatePackage` ile oluşturur ve aktive eder. Bu adımı kullanıcıya sormadan otomatik yapar. Paket oluştururken yalnızca şunları sorar: paket adı, üst paket (super_package), transport request. Transport Layer (ZS4D), Software Component (HOME), Record Changes (true) otomatik kullanılır — kullanıcıya sorulmaz.
9. **Structure oluşturmadan önce alan bilgilerini sorar.** Agent hiçbir zaman kendi başına structure alan listesi belirlemez. Kullanıcıdan B4 bölümündeki `Alan Adı | Data Element | Curr/Quan Ref` formatında alan bilgilerini ister. CURR/QUAN alanları için `Curr/Quan Ref` kolonunda `TABLO-ALAN` formatında referans zorunludur.
10. **Tablo oluşturmadan önce alan ve özellik bilgilerini sorar.** Agent hiçbir zaman kendi başına tablo alan listesi belirlemez. Kullanıcıdan B5 bölümündeki `Alan Adı | Data Element | Key | Curr/Quan Ref` formatında bilgileri ister. Search help ve SM30 bakım ekranı DDL'de desteklenmez — kullanıcı SE11'den manuel ekler.
11. **Structure ve tablolarda generic tip kullanmaz; alanları verilen isim ve sırayla oluşturur.** `abap.char(N)`, `abap.quan(N,M)`, `abap.curr(N,M)`, `abap.numc(N)`, `abap.int4` gibi built-in/generic tipler kesinlikle kullanılmaz. Her alan için mutlaka sistemdeki bir data element kullanılır (ör: `KWMENG`, `NETWR_AP`, `VBELN_VA`). Data element bilgisi verilmeden agent structure veya tablo oluşturmaz — kullanıcıdan data element adını ister. Alanlar kullanıcının verdiği isimle ve verdiği sırayla oluşturulur; agent hiçbir alanı yeniden adlandıramaz, sırasını değiştiremez veya kendi başına ekstra alan ekleyemez.
12. **ALV sınıflarında referans program ZSD_616_CL01'dir.** `create_alv_object` içinde container ve ALV nesnesi oluşturulur (`CHECK IS BOUND` yapılmaz). `screen_pbo` içinde `SET PF-STATUS` ve `IF go_alv IS INITIAL` kontrolü zorunludur. `fill_field_catalog` içinde kolon başlıkları data element'ten gelir, hardcode yazılmaz (`colddictxt = 'L'`).
13. **Nesne oluşturma sırası zorunludur (bağımlılık zinciri).** Birden fazla nesne oluşturulacaksa, agent aşağıdaki sırayı takip eder. Her nesneyi oluşturup **aktive ettikten sonra** bir sonraki adıma geçer. Bağımlılığı karşılanmamış bir nesne asla oluşturulmaya çalışılmaz (ör: domain aktif değilken data element oluşturulmaz, data element aktif değilken structure oluşturulmaz).

    **Oluşturma sırası:**
    1. Domain
    2. Data Element
    3. Structure
    4. Table
    5. CDS View
    6. Function Group / Function Module
    7. Class / Interface
    8. Program

    Her adımda: **Oluştur → Aktive et → Aktivasyon başarılı mı kontrol et → Sonraki adıma geç.** Aktivasyon başarısızsa durur ve kullanıcıyı bilgilendirir.
