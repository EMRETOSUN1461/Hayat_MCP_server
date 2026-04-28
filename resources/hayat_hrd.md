# HRD (ECC) — Hayat Holding ABAP Kodlama ve İsimlendirme Standartları

> **Sistem**: HRD (ECC EHP7, NW 7.4, BASIS 740)
> **Kaynak**: `Hayat Holding Yazılım ECC Standartları.docx`
> **Aktivasyon**: kullanıcı talebinde **"ECC"** veya **"HRD"** geçtiğinde bu kural seti devreye girer.

## A. SABİT KURALLAR (Her Zaman Geçerli)

### A1. İSİMLENDİRME PATTERN'LERİ

`XX` = ilgili modülün kısaltması (FI, MM, SD, PP, QM, PM, HR, CCA, PC, AA, TR vb. — kullanıcının verdiği değer kullanılır).

#### Yan obje (DEV/TS bağlamına ait) — Pattern A

Bir geliştirme (Jira ticket / TS) altında yaratılan tüm yan objeler **DEV numarasıyla gruplanır**:

```
ZXX_<DEV>_<TYPE><NN>
```

`<TYPE>` kısaltmaları: **CL** class, **D** domain, **E** data element, **S** structure, **TT** table type, **FG** function group, **FM** function module, **I** include.

Örnekler:
- `ZHR_036_D01`, `ZHR_036_D02` (domain)
- `ZHR_036_E01`, `ZHR_036_E02` (data element)
- `ZHR_036_S01` (structure)
- `ZHR_036_FG01` (function group)
- `ZHR_036_TT01` (table type)
- `ZHR_036_CL01` (class)
- `ZHR_004_I_001` (include — `_I_NNN` formatı da olabilir)

#### Bağımsız obje (tek başına, DEV bağlamı yok) — Pattern B

| Nesne | Kalıp | Örnek |
|---|---|---|
| Tablo | `ZXX_T_NNN` | `ZPP_T_001` |
| View | `ZXX_V_NNN` | `ZPP_V_001` |
| Rapor (program) | `ZXX_NNN` | `ZSD_001` |
| Include (bağımsız) | `ZXX_I_NNN` | `ZMM_I_001` |
| Include (program içi) | `<program>_iNN` | `zfi_017_i01` |
| Message Class | `ZXX` | `ZHR` |
| Transaction Code | `ZXXNNN` | `ZWM001` |
| Transaction (bakım) | `ZXXNNNT` | `ZQM001T` |
| Yetki Objesi | `ZXX_<Açıklama>` | `ZHR_PERNR` |
| Search Help | `ZXX_SH_NNN` | `ZPP_SH_001` |
| Data Element | `ZXX_DE_NNN` | `ZHR_DE_001` |
| Domain | `ZXX_D_NNN` | `ZHR_D_001` |
| Enhancement Implementation | `ZXX_<EnhSpot>_NNN` | `ZSD_SAPMV45A_001` |
| BAdI Implementation | `ZXX_<BAdI Definition>` | `ZSD_BADI_SALES_ITEM` |
| Append Structure | `ZXX_AS_NNN` | `ZHR_AS_001` |
| New Field (ZZ alanı) | `ZZ<Açıklama>` | `ZZNET` |
| Package (super) | `ZXX` | `ZHR`, `ZFI` |
| Package (sub) | `ZXXNNN` | `ZFI001`, `ZFI002` |
| Function Group | `ZXX_FG_NNN` | `ZPP_FG_001` |
| Function Module | `ZXX_FM_NNN` | `ZPP_FM_001` |
| Class (utility/bağımsız) | `ZCL_XX_NNN` | `ZCL_PP_002` |
| Interface | `ZIF_XX_NNN` | `ZIF_HR_001` |
| Table Type | `ZXX_TT_NNN` | `ZPP_TT_001` |
| Smartform | `ZXX_SF_NNN` | `ZPP_SF_001` |
| Smartform Stil | `ZXX_ST_NNN` | `ZPP_ST_001` |
| Cluster Table | `ZXX_C_NNN` | `ZPP_C_001` |
| Area Menu | `ZXX` | `ZFI` |
| Adobe Form | `ZXX_AF_NNN` | `ZFI_AF_001` |
| BSP Web App | `ZXX_BSP_NNN` | `ZHR_BSP_001` |
| Fiori | `ZXX_FIO_NNN` | `ZHR_FIO_001` |
| WebDynPro | `ZXX_WD_NNN` | `ZHR_WD_001` |
| Breakpoint ID | `ZBINNN` | `ZBI001` |
| Web Service | `ZXX_WS_NNN` | `ZHR_WS_001` |

> **NOT**: HRD (ECC EHP7 / NW 7.4) sisteminde CDS, AMDP, DDL, Fiori OData servisleri üretilmez veya MCP tool'u yoktur.

#### Class için özel kategori tespiti

Class'ta dört pattern var; agent talepteki ipuçlarından kategoriyi otomatik belirler:

| Anahtar kelime / Bağlam | Kategori | Pattern | Örnek |
|---|---|---|---|
| "BAdI", "BADI", "implementation", BAdI definition adı | **BAdI Impl.** | `ZCL_IM_<BADI_NAME>` | `ZCL_IM_ME_PROCESS_PO_CUST` |
| "OData", "Fiori", "Gateway", "DPC", "MPC" | **Fiori OData** | `ZCL_<APP>_<DPC\|MPC\|DPC_EXT\|MPC_EXT>` | `ZCL_ZMM_PROJ_002_DPC_EXT` |
| Mevcut program / TS / DEV no ile ilişki | **DEV-bağlı** | `ZXX_<DEV>_CL<NN>` | `ZHR_036_CL02` |
| "utility", "yardımcı", "global", "ortak" | **Bağımsız utility** | `ZCL_<XX>_<NNN>` | `ZCL_MM_007` |
| **Hiçbir ipucu yok** | — | **Tek soru sor** | — |

### A2. KODLAMA KURALLARI

#### Hard Code Yasağı

Malzeme, üretim yeri, satış org, şirket kodu vb. için hard code **yasak**. Tercih sırası:
1. Malzeme ana verisinde alan kullanılabilir mi?
2. Uyarlama tablosu (SAP standart) yapılabilir mi?
3. Z'li bakım tablosu kontrolü?
4. Son çare: Teknik Lider onayıyla hard code.

#### Mesajlar

- **Standart kural** (manuel geliştirme için): Custom mesaj yaratmadan önce sistemde standart mesaj var mı kontrol edilir. Hard code mesaj yerine Text Symbol veya custom message class (`Z<XX>`) kullanılır.
- **MCP üzerinden geliştirme istisnası**: MCP'de message class oluşturma tool'u **yoktur**. Bu yüzden agent geliştirme yaparken mesajları **hardcode olarak yazar** ve geliştirmeyi durdurmaz; final raporda hardcode mesaj listesi paylaşılır. Kullanıcı isterse sonradan SE91'den `Z<XX>` message class'a migrate edebilir.

#### Değişken Tanımlama Formatı

Değişken tanımları **include**'da yapılır. Her blok yorum satırıyla başlar.

| Tip | Format | Açıklama |
|---|---|---|
| Parameters | `p_XXXXX` | 5 karakter; LIKE ile referansta SAP alanı adıyla aynı |
| Select-options | `s_XXXXX` | 5 karakter; aynı kural |
| Constants | `c_XXXXX` | 5 karakter |
| Data | LIKE ref ise alan adı, değilse 5 karakter | Sayaç/kontrol için tek karakter olabilir |
| Internal Table | `i<table>` veya `i<5char>` | SAP tablosu ref ise `imara` gibi |

#### Tables / Selection-Screen / Data Sıralaması

```abap
* ---Tables
tables: mara, mard.

* ---Selection-Screen-----------
parameters: p_matnr like mara-matnr,
            p_liste as checkbox.
select-options: s_mtart for mara-mtart.

* ---Constants-----------------
constants: c_linno like sy-linno value '65'.

* ---Data----------------------
data: matnr like mara-matnr,
      topla(10) type p.

* ---Internal Tables-----------
data: begin of imara occurs 100,
        matnr like mara-matnr,
        topla(10) type p,
      end of imara.
```

#### Diğer Kurallar

- **Text Symbol** kullanılır; program içinde `''` ile sabit string olmaz.
- Event'ler (TOP-OF-PAGE, END-OF-PAGE) → subroutine içinde.
- Kodlar mümkün olduğunca **subroutine** içinde toplanır; değişkenler parametre olarak aktarılır.
- Birçok program tarafından kullanılan kodlar için **fonksiyon** yaratılır.
- Subroutine'ler `include`'larda toplanır, programın başında include'lar tanımlanır.
- ABAP Workbench → Documentation bölümü doldurulur.
- Yapılan her değişiklik sonrası **SAT** ile performans analizi yapılır.

### A3. PROGRAM BAŞLIK ŞABLONU

Yeni programlarda kullanılır:

```abap
*&---------------------------------------------------------------------*
*& Report ZPS_P_001
*&---------------------------------------------------------------------*
*& Created By       :
*& Analyst          :
*& Created Date     :
*& Title            :
*& FS-TS Number     :
*&---------------------------------------------------------------------*
*& Description      :
```

Mevcut programlarda değişiklik yapılırken silme yok; değişen satırlar `*` ile commentlenir, blok yorumla işaretlenir:

```abap
* <Sicil> <Tarih> ITSM NO----------*
* Yapılan değişiklik açıklaması
... yeni kod ...
* <Sicil> <Tarih> ITSM NO----------*
```

### A4. REFERANS PROGRAMLAR (HRD'de mevcut)

- **SALV rapor şablonu**: `ZABAP_001`
- **BC ALV (container) şablonu**: `ZABAP_002`

Yeni rapor yazılırken bu iki şablondan başlanması önerilir.

### A5. HAYAT EXIT/BADI FRAMEWORK

#### User Exit Project (CMOD)

Format: `Z<XX>...01` (örn: `ZHR01`, `ZPP01`).
- Bir modülde **tek proje** altında ilerlenir; birden fazla danışman olsa bile aynı projeye toplanır.
- **Exit kodlamaları include kullanılarak yapılır**; süreç anlamında bağlantılı kodlar tek include altında toplanır.

#### Enhancement İsimlendirme

Format: `Z{XX}_<include adı>` (orijinal include adı korunur).
Örnek: `LCSDIF8Z` → `ZPP_LCSDIF8Z`

**Enhancement içindeki kodlamalar include kullanılarak yapılır.**

#### BAdI Implementation

Format: `ZCL_IM_<BADI_DEFINITION_NAME>`. BAdI içindeki kodlama include ile yapılır.

#### Entegrasyon Notları

- RFC kullanıcı açma → BASIS ekibi
- RF terminal web servisleri → `http://rf.hayat.com.tr/`
- SAP dışı sistemler → `https://po.hayat.com.tr/`
- DB02 connection name içinde `TEST` veya `PROD` bilgisi olmak zorunda; kod içinde de kontrol edilir
- Tüm SAP–NON-SAP entegrasyonları PO üzerinden yapılır
- IDOC/RFC SC: HOME_HRD, HOME_S4D gibi sistem bazlı SC'ler altında
- Mappingler: tek SC altında Sender:Receiver bazında namespace
- Şifreler maskelenir; Iflow kullanılmaz, ICO kurgusu zorunlu
- 3rd party sistemler: test sonu `_T`, canlı sonu `_P` (örn: `AYENSOFT_T`, `AYENSOFT_P`)

## B. AGENT BİLGİ TOPLAMA STRATEJİSİ

> **GENEL PRENSİP**: Önce talep metni dikkatlice analiz edilir. Bilgi talep içinde herhangi bir formatta (cümle, tablo, .docx, .xlsx, JSON vb.) yer alıyorsa **agent o değeri kullanır, sormaz**. Sistemden tespit edilebilen her şey `GetPackageContents` / `GetProgFullCode` vb. ile çekilir. Soru sadece talep+sistem birleşiminden çıkarılamayan tek bir kalan bilgi varsa sorulur.

### B1. Asla sorulmaz — talepten/sistemden tespit edilir

- **Sıradaki obje numarası** — `GetPackageContents` ile, en yüksek + 1.
- **Sıradaki DEV numarası** — yeni geliştirme için, en yüksek mevcut DEV + 1.
- **Yan obje numarası** (CL01, S01, D01, vb.) — aynı DEV altında en yüksek + 1.
- **Bağımsız obje numarası** (FM_009, T_008, vb.) — aynı tipte en yüksek + 1.
- **Modül kısaltması (`XX`)** — talepten / paket adından (`ZHR`→HR, `ZMM`→MM) tespit edilir.
- **Class kategorisi** — talepte ipucu varsa otomatik tespit (BAdI / Fiori / DEV-bağlı / utility).
- **Yeni obje vs değişiklik** — talep dilinden ("oluştur/yarat" → yeni; "güncelle/değiştir" → değişiklik).
- **Title / Description** — talep cümlesinden Title-Case türetilir.
- **Structure / Tablo alan listesi, data element** — talepte verilmişse kullanılır (cümle, tablo, dosya — fark etmez).

### B2. Sadece şu durumlarda — tek birleşik soru sorulur

- Talep + sistem birleşiminden hiçbir şekilde çıkarılamayan bilgi:
  - Modül kısaltması net değil (paket de yoksa)
  - DEV no'su belirsiz, mevcut DEV mi yeni DEV mi anlaşılmıyor
  - Class kategorisi 4 alternatiften eşit olası birden fazla
  - Talep "yeni obje" mi "değişiklik" mi gerçekten net değil
  - Structure/tablo alan listesi talepte hiç yok ve standart bir karşılığı tahmin edilemiyor
- Birden fazla bilgi eksikse hepsi **tek bir mesajda toplanır**, ardı ardına soru sorulmaz.

### B3. Transport (HRD özel durumu)

HRD'de `ListTransports` / `CreateTransport` MCP tool'ları **yok**. Bu nedenle:
- `$TMP` paket → transport gerekmez, atla.
- Diğer paketler → kullanıcıdan transport numarası istenir (tek bir defa, geliştirmenin başında). Diğer sistemlerin (S4D / HHD) aksine bu HRD'de mecburdur.

## C. GERÇEK SİSTEM ÖRNEKLERİ

### Pattern A — DEV-bağlı (HRD'de yaygın)

`ZHR` paketinde DEV 036 altındaki yan objeler:

```
ZHR_036_D01, ZHR_036_D02     (domain)
ZHR_036_E01, ZHR_036_E02     (data element)
ZHR_036_S01                  (structure)
ZHR_036_FG01                 (function group)
ZHR_036_TT01                 (table type)
ZHR_036_CL01                 (class — varsa)
```

### Pattern B — Bağımsız (doküman standardı)

```
ZHR_001 ... ZHR_013          (raporlar — düz numaralı)
ZHR_FM_007, ZHR_FM_008       (function module)
ZHR_FG_001, ZHR_FG_002       (function group)
ZHR_DE_001 ... ZHR_DE_127    (data element)
ZHR_S_001 ... ZHR_S_041      (structure — boşluklu)
ZHR_T_001, ZHR_T_003         (table)
ZHR_TT_001, ZHR_TT_006       (table type)
```

### Class kategori örnekleri

| Talep | Tespit edilen kategori | Üretilen ad |
|---|---|---|
| "ME_PROCESS_PO_CUST BAdI'sini implement et" | BAdI Impl. | `ZCL_IM_ME_PROCESS_PO_CUST` |
| "ZMM_PROJ_002 Fiori uygulaması için DPC_EXT class oluştur" | Fiori OData | `ZCL_ZMM_PROJ_002_DPC_EXT` |
| "ZHR_036 geliştirmesine yeni bir class ekle" | DEV-bağlı | `ZHR_036_CL02` (CL01 varsa) |
| "ZHR'a yeni rapor yap, içinde class olsun" | DEV-bağlı (yeni DEV) | DEV=038, class=`ZHR_038_CL01` |
| "ZMM modülü için bir utility class lazım" | Bağımsız utility | `ZCL_MM_007` (en yüksek 006'sa) |

## D. AGENT DAVRANIŞ KURALLARI

### Temel Felsefe

**Agent kullanıcıya minimum soru sorar, maksimum otonom çalışır.** Sıradaki numarayı, DEV numarasını ve isim kalıbını mümkün olduğunca sistemden tespit eder. Belirsizlik varsa **tek bir soru** ile karar alır, sonra çalışmaya devam eder.

### D0. Mevcut objelerde açık transport çakışması — geliştirmeye başlamanın ön koşulu

> Bu kontrol KURAL #6 otonom akışından **daha üstündür**. Çakışma varsa hiçbir şey yapılmaz.

Geliştirme kapsamında **mevcut bir objeyi değiştirme** adımı varsa, geliştirmeye başlamadan **önce** kapsamdaki tüm mevcut objeler kontrol edilir. HRD'de `GetTransport` / `ListTransports` MCP tool'ları **olmadığı için** agent kendi sorgulayamaz; bu nedenle:

- Geliştirmeye başlamadan **önce** kullanıcıdan **açık onay** istenir: _"HRD'de transport çakışma kontrolü tool'u yok. Şu objelerin üzerinde başka açık request olmadığını SE03/SE10'dan kontrol edip onayla: <obje listesi>. 'Çakışma yok, devam et' yazana kadar geliştirme başlamaz."_
- Kullanıcı çakışma varsa bildirir → Geliştirme **tamamen durdurulur.** Hiçbir nesne oluşturulmaz, hiçbir transport yaratılmaz. Kapsamı tek bir objede bile çakışma olsa kısmi geliştirme başlatılamaz.
- Kullanıcı "çakışma yok, devam et" derse → KURAL #6 otonom akışına geçilir.

### D1. Numara & DEV Tahmin Algoritması

```
TALEP GELDİ
│
├─ Talep mevcut bir DEV/program/TS no'ya atıfta bulunuyor mu?
│   └─ EVET → Pattern A, DEV bilinen
│             GetPackageContents ile ZXX_<DEV>_<TYPE>* objelerini filtrele
│             En yüksek <NN> + 1 → yeni numara
│             Örnek: ZHR_036'da CL01 var → yeni ZHR_036_CL02
│
├─ Talep birden fazla ilişkili obje içeriyor mu?
│   └─ EVET → Pattern A, DEV otomatik tahmin
│             GetPackageContents ile ZXX_<NNN>_* DEV numaralarını bul
│             En yüksek DEV + 1 → yeni DEV numarası
│             Tüm yan objeler bu yeni DEV altına gruplanır
│
└─ Tek bağımsız obje
   Pattern B uygulanır
   GetPackageContents ile aynı tipteki ZXX_<TYPE>_* objeleri filtrele
   En yüksek <NNN> + 1 → yeni numara
```

**Boşluk doldurma yapma**: DEV'ler 036, 037, 042 ise sıradaki **043**'tür. Silinmiş numaraları tekrar kullanma.

**Edge case'ler**:
- `GetPackageContents` başarısız (yetki/paket yok) → kullanıcıya bildirilip numara sorulur (fallback).
- Pattern karışık (eski + yeni format aynı paket) → talebe en uygun olanı seç, diğerini görmezden gel.
- Aynı oturumda birden fazla aynı tipte obje → her oluşturma sonrası sayaç bellekte +1; tekrar `GetPackageContents` çağrılmaz.
- `Z_CL_*`, `ZMM_UTIL` gibi serbest format objeler → sayım dışında bırakılır.

### D2. Eski Objelerde Değişiklik Kuralı

HRD'deki eski programlar büyük olasılıkla bu standartlara **tam uymaz**. Mevcut bir objede değişiklik yapılıyorsa:

**ÖNCE** mevcut yapı kontrol edilir (`GetProgFullCode` / `GetProgram` / `GetClass` / `GetFunctionModule`).

| Kriter | Standart işareti | Eski (legacy) işareti |
|---|---|---|
| Program adı | `ZXX_NNN` (örn: `ZHR_001`) | Random/eski format (örn: `ZHRREP01`, `Z_TEST`) |
| Header bloğu | `Created By / Analyst / Created Date / FS-TS Number` formatı | Yok veya farklı format |
| Değişken adları | `p_XXXXX`, `s_XXXXX`, `c_XXXXX` (5 karakter) | Random uzunlukta veya farklı prefix |
| Include yapısı | `ZXX_I_NNN` veya `<prog>_iNN` | Düzensiz |

#### Durum A — Mevcut obje standartlara **uyuyor**

- **Standartlara harfiyen uyulur.** Yeni eklenen tüm kod (değişken, include, metod, header) bu dokümandaki kalıpların **tamamını** uygular.
- Yeni include/metod/form isimleri standart formatta verilir.
- Değişken adlandırması standart kalıbına uyar.

#### Durum B — Mevcut obje standartlara **uymuyor** (eski/legacy)

- **Mevcut isimlendirme yapısı korunur.** Standartlara uymuyor diye değişken/fonksiyon/include adı değiştirilmez.
- **Mevcut kodlama tarzı korunur.** Yeni standart kodlama formatına çevirme yapılmaz.
- Eklenen yeni satırlar, mevcut programın kodlama stiline uyumlu eklenir.
- Yeni eklenen alt parçalar (include, method, form) mevcut isimlendirme şemasını izler. Örn: program `zfi_017_i01`, `zfi_017_i02` kullanıyorsa yeni include `zfi_017_i03` olur.

**Karar belirsizse** (kısmen uyuyor, kısmen uymuyor) — kullanıcıya sor.

### D3. Tamamen Yeni Obje Oluşturma

- Bu dokümandaki isimlendirme standardı uygulanır (A1).
- Bu dokümandaki kodlama kuralları uygulanır (A2 + A3).
- Modül kısaltması (`XX`) kullanıcıdan alınır (talepte yoksa).

### D4. MCP Sınırları (HRD / BASIS 7.40)

**MCP'de çalışmaz**: CDS view, Behavior Definition, Service Binding/Definition, Metadata Extension (NW 7.4'te yok).

**MCP tool yok**: Table, Structure, Data Element, Domain, Adobe Form, GetSession, SearchObject, GetWhereUsed, Transport (Get/Create/List), GetTableContents, GetSqlQuery, GetTransaction, Enhancement tool'ları, Profiling/Dump → bunlar SE11/SE10/SE16/SAT'ten manuel yapılır.

**Çalışır**: Function Module, Function Group, Class, Interface, Program, Include, Package, View (read), Unit Test.

### D5. Bilinen MCP Bug — UpdateProgram Lock Handle Invalid

HRD'de `UpdateProgram` mevcut bir programa kod yazarken **"Resource INCLUDE <PROG> is not locked / invalid lock handle"** hatası verir. Sebep: ECC 7.40'ta lock'ın session memory'ye yazılması (BASIS 7.50+'da global enqueue table). Modern client davranışı bu sürümle uyumsuz.

**Workaround'lar**:
- Yeni program oluşturma için `CreateProgram` çalışıyor (lock gerektirmez).
- Mevcut programa kod yazma: SE38'den manuel yapılır VEYA `CallFunctionModule` ile `RPY_PROGRAM_UPDATE` denenir.

### D6. Önemli Genel Not

**Bu dokümanda belirtilmeyen herhangi bir geliştirme yöntemi Hayat Holding BT ekibi ile paylaşılmadan kullanılmamalıdır.** Şüpheli durumlarda kullanıcıya sor.
