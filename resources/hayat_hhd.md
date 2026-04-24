# HAYAT HOLDİNG — HR DEV (HHD) ABAP 7.50 GELİŞTİRME AGENT KURALLARI

> **Geçerli Sistem: SSID = HHD (Hayat HR Dev Sistemi)**
> Bu kural seti yalnızca HHD sistemi için geçerlidir. S4D (Hayat S/4HANA) için ayrı kural seti kullanılır.
>
> **Sistem Bilgisi:**
> - Ürün: SAP ERP 6.0 EHP8
> - Platform: SAP NetWeaver 7.5 (ABAP 7.50)
> - Fiori Front-End Server 6.0, SAP Fiori for SAP HCM 2.0
> - Modül Kodu: **SAP-HR**
> - Transport Layer: **ZHHD**
> - Software Component: **HOME**
> - **RAP (Behavior Definition/Implementation), Service Binding, Metadata Extension, AMDP Table Function, SAP Cloud özellikleri bu sistemde YOKTUR.**

---

## A. SABİT KURALLAR (Her Zaman Geçerli)

### A1. İSİMLENDİRME PATTERN'LERİ

#### Paket Yapısı (HHD'ye Özel)

- **Ana paket: `ZHR`** (HR Development — ana HR geliştirme paketi). Geliştirmelerin **%90'ı doğrudan bu ana paket içinde**, tek düzlemli flat isimlendirme ile yapılır.
- **Alt paket (Sub-package) pattern:** `ZHRNNN` (legacy, underscoresız — ör: `ZHR001`, `ZHR013`) veya `ZHR_<ACRONYM>` (ör: `ZHR_ADV`, `ZHR_PT`). Sadece büyük ve ayrı bir modül/WRICEF için yeni alt paket açılır.
- Paket içindeki tüm nesnelerin isimleri `ZHR`, `ZCL_HR`, `ZIF_HR` veya `ZZ` prefix'i ile başlar.

#### Paket Transport Ayarları (HHD)
- **Transport Layer**: `ZHHD` (tüm custom paketler için)
- **Software Component**: `HOME` (tüm custom paketler için)
- **Record Changes**: `true` (transportable paketler için)
- Paket oluşturulurken bu değerler otomatik kullanılır, kullanıcıya sorulmaz.
- Yeni alt paket açılırken kullanıcıdan sadece şunlar sorulur: **paket adı**, **üst paket (super_package)**, **transport request numarası**.

#### Nesne İsimlendirme Şablonları (HHD Resmi Standardı)

HHD'de nesneler **flat numaralı** isimlendirme ile oluşturulur. S4D'deki `ZXX_NNN_TNN` hiyerarşik pattern'i **HHD'de KULLANILMAZ**. Çoğu nesne tipi `ZHR_<TİP>_NNN` formatında 3 haneli sıralı numara alır; bazı istisnalar tabloda ayrıca belirtilmiştir (Message Class `ZHR`, Area Menü `ZHR`, Yetki Objesi `ZHR_<KISA_AD>`, BAdI Implementation için açıklayıcı ad vb.).

| Nesne | Pattern | Örnek |
|---|---|---|
| Report / Program | `ZHR_NNN` | ZHR_001, ZHR_347 |
| Standalone Include | `ZHR_I_NNN` | ZHR_I_001 |
| Program İçi Include | `zhr_NNN_iNN` (küçük harf gelenek) | zhr_347_i01, zhr_347_i02 |
| Table | `ZHR_T_NNN` | ZHR_T_001 |
| Cluster Table | `ZHR_C_NNN` | ZHR_C_001 |
| View | `ZHR_V_NNN` | ZHR_V_001 |
| Structure | `ZHR_S_NNN` | ZHR_S_115 |
| Append Structure | `ZHR_AS_NNN` | ZHR_AS_001 |
| Yeni Alan (ZZ append) | `ZZ<AD>` | ZZNET, ZZBOLUM |
| Data Element | `ZHR_DE_NNN` | ZHR_DE_042 |
| Domain | `ZHR_D_NNN` | ZHR_D_001 |
| Table Type | `ZHR_TT_NNN` | ZHR_TT_001 |
| Search Help | `ZHR_SH_NNN` | ZHR_SH_001 |
| Message Class | `ZHR` | ZHR (tek mesaj class) |
| Transaction Code | `ZHRNNN` / `ZHRNNNT` | ZHR001, ZHR001T |
| Yetki Objesi | `ZHR_<KISA_AD>` | ZHR_PERNR |
| Function Group | `ZHR_FG_NNN` | ZHR_FG_001 |
| Function Module | `ZHR_FM_NNN` | ZHR_FM_003 |
| Class | `ZCL_HR_NNN` | ZCL_HR_001 |
| Exception Class | `ZCX_HR_NNN` | ZCX_HR_001 |
| Interface | `ZIF_HR_NNN` | ZIF_HR_001 |
| Smartform | `ZHR_SF_NNN` | ZHR_SF_001 |
| SmartStyle | `ZHR_ST_NNN` | ZHR_ST_001 |
| Adobe Form | `ZHR_AF_NNN` | ZHR_AF_001 |
| Area Menü | `ZHR` | ZHR |
| Breakpoint ID | `ZBINNN` | ZBI001 |
| Web Servis | `ZHR_WS_NNN` | ZHR_WS_001 |
| BSP / Web App | `ZHR_BSP_NNN` | ZHR_BSP_001 |
| Fiori App | `ZHR_FIO_NNN` | ZHR_FIO_001 |
| Web Dynpro | `ZHR_WD_NNN` | ZHR_WD_001 |
| CDS View | `ZHR_CDS_NNN` | ZHR_CDS_001 |
| DDL | `ZHR_DDL_NNN` | ZHR_DDL_001 |
| AMDP | `ZHR_AMDP_NNN` | ZHR_AMDP_001 |
| Fiori ODATA | `ZHR_ODATA_NNN` | ZHR_ODATA_001 |
| Service Implementation | `ZHR_SRVC_NNN` | ZHR_SRVC_001 |
| HR Report Category | `ZHYT_NNN` | ZHYT_001 |

**Önemli:** Tüm numaralar sistemde sıralı gider. Agent bu numaraları asla tahmin etmez, her zaman kullanıcıya sorar.

#### Exit / BAdI / Enhancement İsimlendirme (HHD)

HHD'de exit/BAdI için S4D'deki ZBCENH merkezi framework **YOKTUR**. Klasik SAP enhancement pattern kullanılır.

| Nesne | Pattern | Örnek |
|---|---|---|
| User Exit Project (CMOD) | `ZHR..NN` | ZHR..01, ZHR..02 |
| Enhancement (kod enhancement) | `ZHR_<INCLUDE_ADI>` | ZHR_LCSDIF8Z |
| Enhancement Implementation | `ZHR_<STD_OBJE>_NNN` | ZHR_SAPMV45A_001 |
| BAdI Implementation | `ZHR_<TANIMLAYICI_AD>` | ZHR_GOS_SERVICES (numara şart değil, açıklayıcı ad) |
| Screen Exit Include | `ZXHR<ORIJINAL_AD>` | (CMOD screen exit) |

**Enhancement pattern'i:**
```abap
ENHANCEMENT <ad>.
  " kod
ENDENHANCEMENT.
```

#### Değişken İsimlendirme Prefix'leri (HHD — 5 Karakter Kuralı)

HHD'de parametre, select-option ve sabit isimlerinde **prefix + 5 karakter** kuralı uygulanır:

| Tip | Prefix | Uzunluk | Örnek |
|---|---|---|---|
| Parameter | `p_` | 5 karakter | p_pernr, p_begda |
| Select-Option | `s_` | 5 karakter | s_pernr, s_spmon |
| Constant | `c_` | 5 karakter | c_true, c_x |
| Internal Table | `i<tablo_adı>` | — | imara, it_pernr |

**OO kodlarda:**

| Scope | Elementary | Structure | Table | Data Ref | Object Ref | Exception Ref | Interface Ref |
|---|---|---|---|---|---|---|---|
| Global | gv_ | gs_ | gt_ | gr_ | go_ | gx_ | gif_ |
| Local | lv_ | ls_ | lt_ | lr_ | lo_ | lx_ | lif_ |
| Member | mv_ | ms_ | mt_ | mr_ | mo_ | mx_ | mif_ |

| Tip | Importing | Exporting | Changing | Returning |
|---|---|---|---|---|
| Elementary | iv_ | ev_ | cv_ | rv_ |
| Structure | is_ | es_ | cs_ | rs_ |
| Table | it_ | et_ | ct_ | rt_ |
| Data Ref | ir_ | er_ | — | rr_ |
| Object Ref | io_ | eo_ | — | ro_ |

#### Diğer İsimlendirme
- Types: `ty_` prefix
- Range: `r_` prefix
- Local Class: `lcl_` prefix (ör: `lcl_report`)
- Local Interface: `lif_` prefix
- Field Symbol: `<fs_xxx>`

---

### A2. KODLAMA KURALLARI

1. **Sabit yönetimi (HHD'ye özel) — Hardcode Hiyerarşisi:**
   - **HHD'de modül bazlı merkezi sabit sınıfı (S4D'deki `ZXX_000_CL02` muadili) mantığı YOKTUR.**
   - Hardcode değeri kullanmadan önce aşağıdaki hiyerarşi takip edilir:
     1. **Standart SAP master data / customizing** (T tabloları, T5TXX HR tabloları vb.)
     2. **Z customizing tablosu** (Z konfigürasyon tablosu)
     3. **Z sabit/kontrol tablosu**
     4. **Hard code** (yalnızca **Tech Lead onayı** ile)
   - Sabitler, ihtiyaç duyulan geliştirmenin kendi sınıfı veya programı içinde `CONSTANTS` ya da sınıf attribute'u olarak tanımlanır.
   - Personel numarası, infotip, subtype, BWART, lgart gibi iş verileri düz hardcode yazılmaz; yerel sabit veya tablodan okunur.
   - **İstisna — SAP kontrol değerleri:** `UPDKZ = 'U'`, `TRTYP = 'V'` gibi SAP'nin standart teknik göstergeleri hardcode kullanılabilir.

2. **Object Oriented zorunluluğu:** Tüm geliştirmeler zorunluluk olmadıkça OO ile yapılır. HR'a özgü prosedürel pattern'ler (makro temelli PCR, `RP-PROVIDE-FROM-LAST`, `INFOTYPES` statement, Logical Database `GET pernr` event'ı) kaçınılmaz durumlar için korunur; bu yerlerde OO zorunluluğu esnetilir — ancak iş mantığı mümkünse lokal `lcl_report` sınıfı içine taşınır (bkz. C1).

3. **Tarih/saat:** `SY-DATUM`, `SY-UZEIT` yerine **`SY-DATLO`**, **`SY-TIMLO`** kullanılır.

4. **Breakpoint:** `BREAK user` / `BREAK-POINT` kullanılmaz; SAAB ile checkpoint group oluşturulur (Breakpoint ID: `ZBINNN`).

5. **Text symbol:** Program içindeki metinler text symbol ile tanımlanır (`text-001`, `text-t02` vb.).

6. **Mesaj kontrolü:** HR geliştirmelerinin tamamı tek bir message class üzerinden verilir: **`ZHR`**. Aynı mesaj zaten varsa yenisi oluşturulmaz. Başka modülün mesaj class'ından mesaj verilmez.

7. **Data element/domain kontrolü:** Standartta uygun olan varsa yenisi oluşturulmaz. Structure ve tablolarda generic/built-in tipler (`abap.char`, `abap.quan`, `abap.curr` vb.) kesinlikle kullanılmaz — her alan için mutlaka data element kullanılır.

8. **Reuse ALV kullanılmaz.** `CL_SALV_TABLE` (HHD'de tercih edilen) veya gerekli durumlarda `CL_GUI_ALV_GRID` kullanılır.

9. **ALV raporları — HHD Pattern:** HHD'de S4D'deki `ZBC_000_IF01` + `ZBC_000_FM01` merkezi ALV framework'ü **YOKTUR**. ALV raporları Hayat'ın **SALV local class şablonu** ile yazılır (bkz. C bölümü):
   - Program içinde iki include kullanılır: `zhr_NNN_i01` (data definitions + selection screen) ve `zhr_NNN_i02` (class definitions & implementations).
   - Lokal sınıf: `lcl_report` — PUBLIC SECTION'da `set_init`, `at_selection_screen`, `screen_output`, `start_of_selection`, `set_data`, `set_texts`, `prepare_alv`, `display_alv` metotları; PROTECTED'da `cl_salv_table` ve yardımcı ALV referansları; PRIVATE'da `create_alv`, `set_pf_status`, `set_top_of_page`, `set_alv_properties`, `set_column_styles`, `set_column_text`, `on_user_command`.
   - `cl_salv_table=>factory( )` kullanılır, zebra pattern + optimize kolonlar + layout key (`sy-repid`) + `HAYAT_LOGO` logosu standart olarak eklenir.
   - Event handler: `SET HANDLER gr_report->on_user_command FOR gr_events` ile bağlanır.
   - Header kutusu standart: sol tarafta rapor adı + tarih + kullanıcı, sağ tarafta `HAYAT_LOGO`.

10. **ABAP Memory:** Memory ID ilgili obje adıyla başlar.

11. **Include'larda IF FOUND:** Enhancement include'ları çağrılırken `IF FOUND` ibaresi eklenir.

12. **Standart tablolara doğrudan müdahale yasağı — HR'a özel:** Standart SAP tablolarına (PA0001, PA0002, PA0008, HRP1000, HRP1001, T527X, BKPF, BSEG vb.) doğrudan `INSERT`, `UPDATE`, `DELETE`, `MODIFY` statement'ları yazılmaz.
    - HR master veri işlemleri için `HR_INFOTYPE_OPERATION`, `BAPI_EMPLOYEE_*`, `HR_READ_INFOTYPE` gibi standart FM/BAPI'ler kullanılır.
    - OM (Organizasyon) verileri için `RH_INSERT_INFTY`, `RH_UPDATE_INFTY`, `RH_READ_INFTY` gibi FM'ler kullanılır.
    - PCL1–PCL4 cluster tablolarına doğrudan erişim yapılmaz; `EXPORT TO DATABASE` / `IMPORT FROM DATABASE` veya HR cluster FM'leri (`CU_READ_RGDIR`, `PYXX_READ_PAYROLL_RESULT` vb.) kullanılır.
    - Uygun standart FM/BAPI/sınıf yoksa agent standart tabloya doğrudan müdahale etmez ve kullanıcıya bildirir.
    - Z/Y tabloları bu kuraldan muaftır.

13. **FM / BAPI / Class Method çağrıları:** Parametre eksikliği/hatası runtime dump'a sebep olabilir (syntax check geçse bile).
    - Obje önce **Where-Used** veya arama tool'u ile sistemde var mı kontrol edilir.
    - Yoksa koda eklenmez; kullanıcıdan bilgi alınır.
    - Varsa imzası okunur; parametreler imzaya birebir uygun şekilde (tip, yön, opsiyonel/zorunlu) kodlanır.
    - Generic tip veya uyumsuz tip kullanılmaz.
    - TABLES vs CHANGING ve EXPORTING/IMPORTING yön karışıklığına dikkat edilir.

14. **HR'a özel okuma pattern'leri:**
    - Infotip okuma: `HR_READ_INFOTYPE` FM veya `INFOTYPES` statement + `PROVIDE` cümlesi.
    - Logical Database ile: `TABLES pernr.`, `INFOTYPES: 0000, 0001, 0002.`, `GET pernr.` event, ardından `rp-provide-from-last p0001 space pn-begda pn-endda.` vb.
    - Zaman bağımlı veri: `BEGDA`–`ENDDA` aralığı dikkatle ele alınır; `PNP-SW-FOUND` kontrolleri yapılır.
    - Logical Database: HR raporlarında genelde **PNP** veya **PNPCE** kullanılır.
    - PCR/Schema (payroll) geliştirmesi MCP kapsamı dışındadır — agent bu tür istekleri kullanıcıya bildirir.

15. **Performans:** Her geliştirme sonrası SAT (Runtime Analysis) ile performans analizi yapılması standarttır. Kritik SELECT'ler, nested loop'lar ve HR cluster okumaları SAT trace'i ile doğrulanır.

---

### A3. PROGRAM BAŞLIK ŞABLONU (HR Standardı)

Her programın başında aşağıdaki HHD HR başlık formatı kullanılır:

```abap
*&---------------------------------------------------------------------*
*& Report ZHR_NNN
*&---------------------------------------------------------------------*
*& Analyst          :
*& Designed By      :
*& E-Mail           :
*& Created Date     :
*& Title            :
*&----------------------------------------------------------------------
*& Description      :
*&
*&----------------------------------------------------------------------
*& CHANGE HISTORY:
*& Vrsyn No/Date.    Author    ITSM no         Description
*&
*&--------------------------------------------------------------------*&
```

Program attributes title formatı: `HR : {Açıklama}` (ör: `HR : Fazla Mesai Takip Raporu`)

---

### A4. UTILITY SINIFLARI VE REFERANS OBJELER

HHD'de merkezi utility sınıf listesi S4D'deki gibi `ZBC_000_CL01–CL11` yapısında değildir. Bilinen referans sınıf/FM/include'lar:

| Obje | Tip | Açıklama |
|---|---|---|
| `lcl_report` | Lokal sınıf şablonu | Hayat HR rapor standart ALV sınıfı (her raporda yeniden tanımlanır) |
| `cl_salv_table` | SAP standart | Tercih edilen ALV sınıfı |
| `cl_salv_form_layout_grid` | SAP standart | ALV top-of-page header grid |
| `cl_salv_form_layout_logo` | SAP standart | ALV logo (HAYAT_LOGO) |
| `HAYAT_LOGO` | OAOR logo | ALV header'da kullanılan kurumsal logo |
| `ZHYT_HR_001` | FM | Rapor text/label çevirisi alma (`gt_txt` dönüşü) |
| `ZHR_FM_003` | FM | Tüm personellerin bordro sonuçlarını toplu okuma |
| `zhyt_text` | Include | Rapor standart text/struct tanımları |
| `zhr_347_i01` / `zhr_347_i02` | Include pattern | Data & selection screen / lokal sınıf tanım ayırma örneği |
| PNP / PNPCE | Logical DB | HR raporlarında standart |

Agent yeni utility arayacaksa önce `SearchObject` ile `ZHR_FM_*`, `ZHR_CDS_*`, `ZCL_HR_*` ile arar; bulamazsa kullanıcıya sorar.

---

### A5. HAYAT EXIT/BADI FRAMEWORK

**HHD sisteminde S4D'deki ZBCENH merkezi exit/BAdI framework'ü YOKTUR.**

- `ZBC_ENH_T01` kayıt tablosu, `ZBC_ENH_IF01` interface, `ZBC_ENH_I01 / I02 / I03 / I00` include pattern'leri HHD'de bulunmaz.
- `co_base->get_param( 'PARAM_ADI' )` üzerinden parametre alma mantığı kullanılmaz.
- Exit/BAdI geliştirmeleri klasik SAP Enhancement pattern'i ile yapılır:
  - **User Exit (CMOD):** Proje adı `ZHR..NN` (ör: `ZHR..01`). Include içinde doğrudan iş mantığı yazılır.
  - **Kod Enhancement (Implicit/Explicit):** İsim: `ZHR_<hedef_include_adı>` (ör: `ZHR_LCSDIF8Z`). Pattern:
    ```abap
    ENHANCEMENT ZHR_LCSDIF8Z.
      " iş mantığı
    ENDENHANCEMENT.
    ```
  - **Enhancement Implementation (Section):** İsim: `ZHR_<STD_OBJE>_NNN` (ör: `ZHR_SAPMV45A_001`).
  - **BAdI Implementation:** Açıklayıcı, numara içermeyen isim (ör: `ZHR_GOS_SERVICES`). Doğrudan standart BAdI interface'ini implemente eder, ara interface kullanmaz.
  - **Screen Exit Include:** `ZXHR<ORIJINAL_AD>` (SAP'nin generate ettiği formatta).

**Kural:** Agent HHD'de exit/BAdI geliştirmesi yaparken `ZBC_ENH_IF01` interface'i, `co_base->get_param` çağrıları veya `ZBC_ENH_I01/I02/I03` include pattern'lerini koda **eklemez**. Koşullu çıkış mantığı gerekiyorsa include/class içinde doğrudan IF/CASE yazılır.

---

## B. HER GELİŞTİRMEDE AGENT'IN KULLANICIYA SORMASI GEREKEN BİLGİLER

Agent bir nesne oluşturma veya geliştirme talebi aldığında, **önce geliştirme tipini anlar**, sonra aşağıdaki bilgileri kullanıcıdan ister. Agent asla numara önermez veya tahmin etmez.

### B1. Her Zaman Sorulacaklar

1. **Modül:** HR (PA, PY, PT, OM, PD, PE, PB) — varsa alt modül belirtilir.
2. **Ana paket ve alt paket:** Yalnızca sıfırdan **yeni bir alt paket oluşturulacaksa** sorulur. Kullanıcı mevcut bir paket adı vermişse veya geliştirme zaten bir paket altında devam ediyorsa bu bilgi **sorulmaz**; mevcut paket kullanılmaya devam edilir. **HHD'de geliştirmelerin %90'ı doğrudan `ZHR` ana paketi altında yapılır**; yeni alt paket açmak istisnadır.
3. **Oluşturulacak her nesnenin tam adı ve numarası:** Agent hiçbir nesneyi numarasını tahmin ederek oluşturmaz. Her nesne için numara kullanıcıdan alınır:
   - Program: `ZHR_NNN` → "Program numarası ne olacak?"
   - Class: `ZCL_HR_NNN` → "Class numarası ne olacak?"
   - Interface: `ZIF_HR_NNN` → "Interface numarası ne olacak?"
   - Function Group/Module, Table, Structure, Data Element, Domain, Table Type, CDS View, Form nesneleri — hepsi aynı şekilde sorulur.
4. **Transport request numarası:** Agent her nesne oluşturmadan önce transport numarasını sorar. Mevcut bir request mi kullanılacak, yoksa yeni mi oluşturulacak? Numara her zaman kullanıcıdan alınır.

### B2. Yeni Program / ALV Raporu
Numaralar B1'de sorulacak. Ek olarak:
- Program title (`HR : Açıklama` formatında)
- FS-TS / ITSM numarası
- Analyst / Designed By / E-Mail
- Logical Database kullanılacak mı? (PNP, PNPCE)
- ALV tipi: `cl_salv_table` (SALV — standart), veya `cl_gui_alv_grid` (özel event ihtiyacında)
- Include'lar gerekli mi? `zhr_NNN_i01` (data + selection) + `zhr_NNN_i02` (class) ayrımı önerilir.
- `lcl_report` lokal sınıf şablonu kullanılacak mı?

### B3. Exit/BAdI/Enhancement Geliştirme

1. **Exit tipi:** User Exit (CMOD), Kod Enhancement (ENHANCEMENT..ENDENHANCEMENT), Enhancement Implementation (Section), BAdI, Screen Exit?
2. **Hedef standart obje/include adı:** Hangi SAP include veya BAdI'ye bağlanılıyor? (ör: `LCSDIF8Z`, `SAPMV45A`, BAdI definition adı).
3. **İsim:**
   - Kod enhancement → `ZHR_<hedef_include>` (ör: ZHR_LCSDIF8Z)
   - Enhancement Impl → `ZHR_<STD_OBJE>_NNN` (ör: ZHR_SAPMV45A_001)
   - BAdI Impl → açıklayıcı ad (ör: ZHR_GOS_SERVICES)
   - CMOD projesi → `ZHR..NN`
4. **Transport request** numarası.

### B4. Structure Oluşturma
Agent, structure oluşturmadan önce **mutlaka** kullanıcıdan alan bilgilerini aşağıdaki formatta ister.

| Alan Adı | Data Element | Curr/Quan Ref |
|---|---|---|
| PERNR | PERNR_D | |
| BETRG | BETRG | PA0008-WAERS |
| WAERS | WAERS | |

- `Curr/Quan Ref` kolonuna CURR/QUAN alanları için `TABLO-ALAN` formatında referans yazılır.
- **Her alan için mutlaka data element kullanılır.**
- **Alan adları ve sırası birebir korunur.**
- **Search help DDL tablo/structure tanımında desteklenmez.**

### B5. Tablo Oluşturma
Agent, tablo oluşturmadan önce **mutlaka** kullanıcıdan alan ve tablo özellik bilgilerini aşağıdaki formatta ister.

| Alan Adı | Data Element | Key | Curr/Quan Ref |
|---|---|---|---|
| MANDT | MANDT | X | |
| PERNR | PERNR_D | X | |
| BETRG | BETRG | | T001-WAERS |

Delivery Class       : C (veya A, L, G, W, S, E)
Data Maintenance     : ALLOWED (veya RESTRICTED, NOT_ALLOWED)

- **Her alan için mutlaka data element kullanılır.**
- **Alan adları ve sırası birebir korunur.**
- **Curr/Quan Ref dış tabloya referanstır.**

### B6. CDS View (ABAP 7.50 sürümü)
Numaralar B1'de sorulacak. Ek olarak:
- View katmanı: Temel View, Interface View — **Consumption/Extension view'ler S/4HANA özelliğidir, HHD'de kullanılmaz.**
- SQL View adı (16 karakter limiti)
- Parametre alacak mı?
- **Not:** Behaviour Definition / Behaviour Pool / RAP bu sistemde yoktur.

### B7. Tablo / Data Dictionary
Numaralar B1'de sorulacak. Ek olarak:
- Text table gerekli mi?
- Maintenance view gerekli mi?
- Lock object gerekli mi?

### B8. Form
Numaralar B1'de sorulacak. Ek olarak:
- Form tipi: Smartform (`ZHR_SF_NNN`), Adobe Form (`ZHR_AF_NNN`), SAPScript?
- SmartStyle gerekli mi? (`ZHR_ST_NNN`)

### B9. Append Structure / Yeni Alan
- Hedef standart tablo/structure adı?
- Append adı: `ZHR_AS_NNN`
- Yeni alan adları: `ZZ<AD>` (ör: ZZNET)
- Alan data element'leri.

---

## C. GERÇEK SİSTEM ÖRNEKLERİ

### C1. HHD Standart SALV HR PNP Rapor Şablonu

Logical Database (PNP) kullanan HR raporu için Hayat standart şablonu:

```abap
*&---------------------------------------------------------------------*
*& Report ZHR_NNN
*&---------------------------------------------------------------------*
*& Analyst          :
*& Designed By      :
*& ...
*&---------------------------------------------------------------------*
REPORT ZHR_NNN.

INCLUDE zhr_NNN_i01.  " Data Definitions and Selection Screen Definitions
INCLUDE zhr_NNN_i02.  " Class Definitions

INITIALIZATION.
  gr_report = NEW lcl_report( ).

AT SELECTION-SCREEN.
  gr_report->at_selection_screen( ).

AT SELECTION-SCREEN OUTPUT.
  gr_report->screen_output( ).

START-OF-SELECTION.
  gr_report->start_of_selection( ).

GET pernr.
  rp-provide-from-last p0000 space pn-begda pn-endda.
  rp-provide-from-last p0001 space pn-begda pn-endda.
  CHECK p0001-pernr IN pnppernr AND p0000-stat2 IN pnpstat2
    AND p0001-werks IN pnpwerks AND p0001-btrtl IN pnpbtrtl
    AND p0001-abkrs IN pnpabkrs AND p0001-bukrs IN pnpbukrs
    AND p0001-plans IN pnpplans.
  rp-provide-from-last p0002 space pn-begda pn-endda.
  gr_report->set_data( ).

END-OF-SELECTION.
  gr_report->set_texts( ).
  gr_report->prepare_alv( ).
```

**`zhr_NNN_i01` (data + selection screen):**
```abap
TABLES    : pernr, s001.
INCLUDE   : zhyt_text.
INFOTYPES : 0000, 0001, 0002.

CLASS lcl_report DEFINITION DEFERRED.
DATA : gr_report TYPE REF TO lcl_report.

DATA : gt_report TYPE TABLE OF zhr_s_NNN,
       gs_report TYPE zhr_s_NNN.

SELECTION-SCREEN BEGIN OF BLOCK b1 WITH FRAME TITLE text-s01.
  SELECT-OPTIONS s_spmon FOR s001-spmon OBLIGATORY.
SELECTION-SCREEN END OF BLOCK b1.
```

**`zhr_NNN_i02` (class definition + implementation):**
```abap
CLASS lcl_report DEFINITION.
  PUBLIC SECTION.
    METHODS: set_init, at_selection_screen, screen_output,
             start_of_selection, set_data, set_texts,
             prepare_alv, display_alv.
  PROTECTED SECTION.
    DATA: gr_alv       TYPE REF TO cl_salv_table,
          gr_display   TYPE REF TO cl_salv_display_settings,
          gr_columns   TYPE REF TO cl_salv_columns_table,
          gr_column    TYPE REF TO cl_salv_column_table,
          gr_functions TYPE REF TO cl_salv_functions_list,
          gr_selection TYPE REF TO cl_salv_selections,
          gr_layout    TYPE REF TO cl_salv_layout,
          gr_events    TYPE REF TO cl_salv_events_table,
          gr_exp_msg   TYPE REF TO cx_salv_msg.
    DATA: gs_key TYPE salv_s_layout_key.
  PRIVATE SECTION.
    METHODS: create_alv, set_pf_status, set_top_of_page,
             set_alv_properties, set_column_styles,
             set_column_text IMPORTING i_fname TYPE lvc_fname
                                       i_text  TYPE any.
    METHODS: on_user_command FOR EVENT added_function OF cl_salv_events
               IMPORTING e_salv_function.
ENDCLASS.

CLASS lcl_report IMPLEMENTATION.
  METHOD prepare_alv.
    me->create_alv( ).
    me->set_pf_status( ).
    me->set_alv_properties( ).
    me->set_top_of_page( ).
    me->display_alv( ).
  ENDMETHOD.

  METHOD create_alv.
    TRY.
        cl_salv_table=>factory(
          IMPORTING r_salv_table = gr_alv
          CHANGING  t_table      = gt_report ).
      CATCH cx_salv_msg INTO gr_exp_msg.
    ENDTRY.
  ENDMETHOD.

  METHOD set_alv_properties.
    gr_display = gr_alv->get_display_settings( ).
    gr_display->set_striped_pattern( cl_salv_display_settings=>true ).
    gr_columns = gr_alv->get_columns( ).
    gr_columns->set_optimize( abap_true ).
    gr_layout = gr_alv->get_layout( ).
    gs_key-report = sy-repid.
    gr_layout->set_key( gs_key ).
    gr_layout->set_save_restriction( cl_salv_layout=>restrict_none ).
    gr_selection = gr_alv->get_selections( ).
    gr_selection->set_selection_mode( if_salv_c_selection_mode=>cell ).
    gr_events = gr_alv->get_event( ).
    SET HANDLER gr_report->on_user_command FOR gr_events.
  ENDMETHOD.

  METHOD set_top_of_page.
    DATA: lo_header      TYPE REF TO cl_salv_form_layout_grid,
          lo_grid_bottom TYPE REF TO cl_salv_form_layout_grid,
          lo_logo        TYPE REF TO cl_salv_form_layout_logo.
    CREATE OBJECT lo_header.
    lo_header->create_header_information(
      row = 1 column = 1 text = sy-title ).
    lo_header->add_row( ).
    lo_grid_bottom = lo_header->create_grid( row = 3 column = 1 ).
    " ... tarih + kullanıcı labelleri
    CREATE OBJECT lo_logo.
    lo_logo->set_left_content( lo_header ).
    lo_logo->set_right_logo( 'HAYAT_LOGO' ).
    gr_alv->set_top_of_list( lo_logo ).
  ENDMETHOD.

  METHOD display_alv.
    gr_alv->display( ).
  ENDMETHOD.

  " set_init, at_selection_screen, screen_output,
  " start_of_selection, set_data, set_texts, set_pf_status,
  " set_column_styles, set_column_text, on_user_command — iş mantığına göre doldurulur
ENDCLASS.
```

### C2. HHD Standart SALV (LDB'siz) Rapor Şablonu

Logical Database kullanmayan raporlar için aynı `lcl_report` sınıfı şablonu korunur; `GET pernr` yerine `start_of_selection` içinde doğrudan SELECT yapılır. `INFOTYPES`, `TABLES pernr` satırları kaldırılır.

### C3. Referans Objeler
- `ZHR_347` → SALV HR PNP örnek rapor
- `ZFI_019` → SALV (LDB'siz) örnek rapor
- `ZHR_FM_003` → Toplu bordro okuma FM
- `ZHYT_HR_001` → Rapor text çevirisi FM
- `HAYAT_LOGO` → OAOR kurumsal logo
- `zhyt_text` → Ortak rapor text include'u

---

## D. AGENT DAVRANIŞ KURALLARI

> ⚠️ **KURAL 1 EN YÜKSEK ÖNCELİKLİDİR — hiçbir geliştirme adımı bu kontrol yapılmadan başlatılamaz.**

1. **Mevcut objelerde açık transport kontrolü — geliştirmeye başlamanın ön koşuludur.** Kapsam içinde **mevcut bir objeyi değiştirme** adımı varsa, geliştirmeye başlamadan önce kapsamdaki **tüm mevcut objeler** `GetObjectInfo` veya `GetTransport` ile kontrol edilir. Kullanıcının verdiği transport request **dışında** herhangi bir objede açık transport request tespit edilirse:
   - Geliştirme **tamamen durdurulur.**
   - **Hiçbir nesne oluşturulmaz, hiçbir transport yaratılmaz.**
   - Kullanıcıya hangi objelerde hangi açık request'lerin bulunduğu bildirilir ve devam için talimat beklenir.
   - Bu kural tek bir objede bile ihlal edilse geçerlidir — kısmi geliştirme başlatılamaz.

2. **MCP ile yapılamayan geliştirmelerde hiçbir şey oluşturmaz.** Bir geliştirme talebi kapsamında Screen (Dynpro), Adobe Form, Smartform, SAPScript, PCR/Schema (payroll kural), LSMW veya başka bir MCP tool'u bulunmayan nesne tipi varsa, agent **hiçbir nesne ve transport oluşturmaz**; doğrudan kullanıcıya şu şekilde döner: _"Bu geliştirme MCP tool ile tam olarak yapılamıyor. Kapsam dışı kalan nesneler: [liste]."_ **İstisnalar:** SM30 bakım ekranı ve Table Type bu kuralın dışındadır — bu iki nesne atlanarak kodlamaya devam edilir ve eksik kaldığı bilgisi işin **sonunda** kullanıcıya bildirilir.

3. **Numara tahmini yapmaz.** Her nesne numarasını (ZHR_NNN, ZCL_HR_NNN, ZIF_HR_NNN, ZHR_FG_NNN, ZHR_FM_NNN, ZHR_T_NNN, ZHR_DE_NNN, ZHR_D_NNN, Enhancement Impl numarası vb.) kullanıcıya sorar.

4. **Sisteme gereksiz sorgu atmaz.** Sıradaki numara için `SearchObject` veya `GetPackageContents` çağırmaz.

5. **Nesne oluşturmadan önce tüm bilgileri toplar.** Eksik bilgiyle nesne oluşturmaya başlamaz.

6. **Oluşturduğu kodun standartlara uygunluğunu kendi kontrol eder:** prefix'ler, 5 karakter parametre kuralı (`p_xxxxx`, `s_xxxxx`, `c_xxxxx`), SY-DATLO kullanımı, hardcode olup olmadığı, message class `ZHR`, IF FOUND ibaresi vb.

7. **Birden fazla nesne oluşturulacaksa** (ör: include + class + enhancement), tüm nesne listesini ve numaralarını önceden kullanıcıya onaylatır.

8. **Standart tablolara doğrudan SQL yazmaz.** PA0001, PA0002, HRP1000, HRP1001, PCL1–PCL4 gibi standart HR tablolarına INSERT/UPDATE/DELETE/MODIFY yazmak yerine `HR_INFOTYPE_OPERATION`, `HR_READ_INFOTYPE`, `RH_*_INFTY`, `PYXX_READ_PAYROLL_RESULT` gibi standart FM'leri kullanır. Bulamazsa kullanıcıyı bilgilendirir ve o tabloya müdahale etmez. Z/Y tabloları bu kuraldan muaftır.

9. **Transport numarasını her zaman sorar.** Nesne oluşturmaya veya değiştirmeye başlamadan önce kullanılacak transport request numarasını kullanıcıdan alır.

10. **Paket kullanımı:** Kullanıcı mevcut bir paket belirtmişse veya geliştirme zaten bir paket bağlamında devam ediyorsa paket bilgisi **sorulmaz**; o paket kullanılır. **HHD'de yeni alt paket açmak istisnadır — geliştirmelerin %90'ı doğrudan `ZHR` ana paketi altında yapılır.** Yalnızca sıfırdan yeni bir alt paket oluşturulması gerektiğinde kullanıcıya paket adı, üst paket (super_package) ve transport request sorulur. Transport Layer (ZHHD), Software Component (HOME), Record Changes (true) her zaman otomatik kullanılır — bunlar kullanıcıya sorulmaz. Hedef paket sistemde yoksa `CreatePackage` ile oluşturulur ve aktive edilir.

11. **Structure oluşturmadan önce alan bilgilerini sorar.** Agent hiçbir zaman kendi başına structure alan listesi belirlemez. Kullanıcıdan B4 bölümündeki `Alan Adı | Data Element | Curr/Quan Ref` formatında alan bilgilerini ister.

12. **Tablo oluşturmadan önce alan ve özellik bilgilerini sorar.** Agent hiçbir zaman kendi başına tablo alan listesi belirlemez. Kullanıcıdan B5 bölümündeki `Alan Adı | Data Element | Key | Curr/Quan Ref` formatında bilgileri ister. Search help ve SM30 bakım ekranı DDL'de desteklenmez — kullanıcı SE11'den manuel ekler.

13. **Structure ve tablolarda generic tip kullanmaz; alanları verilen isim ve sırayla oluşturur.** `abap.char(N)`, `abap.quan(N,M)`, `abap.curr(N,M)`, `abap.numc(N)`, `abap.int4` gibi built-in/generic tipler kesinlikle kullanılmaz. Her alan için mutlaka sistemdeki bir data element kullanılır.

14. **S/4HANA özelliklerini kullanmaya çalışmaz.** HHD ABAP 7.50 sistemidir. Agent şu nesne tiplerini HHD'de oluşturmaya kalkışmaz: Behavior Definition, Behavior Implementation, Service Definition, Service Binding, Metadata Extension, AMDP Table Function, RAP-specific CDS annotations (`@ObjectModel.writeActivePersistence` vb.), Consumption/Extension CDS views. Bu tür istekler HHD için geçerli değildir — agent kullanıcıya durumu bildirir.

15. **ALV yazarken Hayat `lcl_report` şablonunu kullanır.** Rapor içinde `zhr_NNN_i01` ve `zhr_NNN_i02` include ayrımı, `lcl_report` PUBLIC/PROTECTED/PRIVATE section yapısı, `cl_salv_table=>factory`, `HAYAT_LOGO` header ve zebra+optimize layout uygulanır. `CL_GUI_ALV_GRID` sadece SALV ile çözülemeyen özel durumlar için kullanılır.

16. **Hardcode hiyerarşisini uygular.** Bir değer gerektiğinde önce Standart SAP customizing → Z customizing tablosu → Z sabit tablosu → yerel CONSTANTS sırasıyla değerlendirir. Doğrudan hardcode literal (SAP kontrol göstergeleri hariç) yazmak istiyorsa kullanıcıya Tech Lead onayı gerektiğini bildirir.

17. **Nesne oluşturma sırası zorunludur (bağımlılık zinciri).** Birden fazla nesne oluşturulacaksa, agent aşağıdaki sırayı takip eder. Her nesneyi oluşturup **aktive ettikten sonra** bir sonraki adıma geçer.

    **Oluşturma sırası:**
    1. Domain (`ZHR_D_NNN`)
    2. Data Element (`ZHR_DE_NNN`)
    3. Structure (`ZHR_S_NNN`)
    4. Table (`ZHR_T_NNN`)
    5. Table Type (`ZHR_TT_NNN`)
    6. CDS View (`ZHR_CDS_NNN`, varsa)
    7. Function Group (`ZHR_FG_NNN`) / Function Module (`ZHR_FM_NNN`)
    8. Interface (`ZIF_HR_NNN`) / Class (`ZCL_HR_NNN`)
    9. Include (`ZHR_I_NNN` veya program-içi `zhr_NNN_iNN`)
    10. Program (`ZHR_NNN`)
    11. Transaction Code (`ZHRNNN`)
    12. Enhancement / BAdI Implementation

    Her adımda: **Oluştur → Aktive et → Aktivasyon başarılı mı kontrol et → Sonraki adıma geç.** Aktivasyon başarısızsa durur ve kullanıcıyı bilgilendirir.

18. **SAT performans kontrolü hatırlatması.** Geliştirme tamamlandığında agent kullanıcıya SAT (Runtime Analysis) ile performans trace'i alınması gerektiğini hatırlatır; kritik SELECT'leri ve HR cluster okumalarını listeler.
