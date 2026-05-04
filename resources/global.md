# Hayat Holding — Agent Davranış Kuralları (Sistemler-Arası)

> Bu dosya **sistemden bağımsız** agent davranış kurallarını içerir. Sistem-bazlı (S4D / HHD / HRD) kodlama standartları MCP server'ın `GetHayatCodingStandards({system: <ID>})` tool'undan alınır.

## KURAL #1 — Sistem Seçimi

İşleme başlamadan önce **MUTLAKA** iki bilgi sağlanmalıdır:

1. **Sistem kodu** — hangi SAP sistemine bağlanılacağı (kullanıcıdan gelir)
2. **Referans standardı** — `GetHayatCodingStandards` tool'u ile alınır; kullanıcıdan ayrı MD dosyası istenmez

### Sistem kodu → MCP server eşleşmesi

| Kullanıcı talebinde geçen | Sistem ID | MCP server | Standartlar tool çağrısı |
|---|---|---|---|
| **S4D** | S4D | `mcp-S4` | `GetHayatCodingStandards({system: "S4D"})` |
| **HHD** | HHD | `mcp-HR` | `GetHayatCodingStandards({system: "HHD"})` |
| **ECC** veya **HRD** | HRD | `mcp-ECC` | `GetHayatCodingStandards({system: "HRD"})` |

### Otomatik bağlanma kuralı
- "S4D" → `mcp__mcp-S4__*` toollarını kullan
- "HHD" → `mcp__mcp-HR__*` toollarını kullan
- "ECC" veya "HRD" → `mcp__mcp-ECC__*` toollarını kullan

### Yapılacak / Yapılmayacak

- **Sistem kodu eksikse HİÇBİR İŞLEM YAPMA.** Eksik bilgiyi kullanıcıya sor, cevap gelene kadar bekle.
- Tahmin etme, varsayım yapma, "muhtemelen S4'tür" deme.
- Teknik detaylar (tablo alanları, class spec, vs.) kullanıcıdan herhangi bir formatta gelir: prompt metni, .docx, .xlsx, .md fark etmez. Her seferinde MD dosyası isteme.

### İş Akışı

1. Sistem kodu var mı? Yoksa sor.
2. `GetHayatCodingStandards` ile standartları al (ilgili MCP server'da).
3. Kullanıcının verdiği teknik detayları + coding standards ile eksik bilgileri tespit et.
4. Eksikleri (ör. key alanları, delivery class, maintenance view gerekli mi) sor.
5. Tamamlanınca işlemi yap.

## KURAL #2 — Transport Request Otonom Yönetimi

Agent transport numarasını **kendi yönetir**, kullanıcıya sormadan ilerler:

1. **`$TMP` paketi (lokal obje) ise** → transport gerekmez, atla.
2. **Mevcut açık transport varsa** → `ListTransports` ile kullanıcının kendi adına açık olan request'leri kontrol et. Geliştirme bağlamına uyan bir tane varsa onu kullan.
3. **Açık transport yoksa** → `CreateTransport` ile yeni bir Workbench Request oluştur. Açıklama formatı: `<modül>;<proje kodu varsa>;<ticket no varsa>;<P/U>;<sicil>;<sicil>;<açıklama>` (HRD için ECC standardı; S4D/HHD için sistemin kendi formatı).
4. **Karar bilgilendirilir, kullanıcıya soru olarak sorulmaz**: "Açık `S4DK912345` request'i kullanılacak" veya "Yeni request `S4DK912678` oluşturuldu" gibi bilgi verilir, akış durmaz.

### Sistem-bazlı kısıt
- **HRD (ECC)**: `ListTransports` / `CreateTransport` MCP tool'ları **yok**. Bu sistemde agent transport oluşturamaz; kullanıcıya bildirilip ya `$TMP` ile lokal yapılması ya da SE10'dan manuel transport beklenmesi gerektiği söylenir.
- **S4D / HHD**: tool'lar mevcut, otonom akış uygulanır.

### Kullanıcı itirazı
Kullanıcı belirli bir transport adı verirse (örn: "S4DK912900'ü kullan") agent o değeri kullanır, kendi seçim/oluşturma yapmaz.

## KURAL #3 — MCP'nin Üretemediği Nesneler

Aşağıdaki nesne tipleri MCP tool'larıyla üretilemez. Kapsamdaysa **kullanıcıya sorma**, sessizce atla, geliştirmenin sonunda eksik kaldığı bilgisini bildir:

- **SM30** bakım ekranı
- **Lock Object**
- **Screen / Dynpro**
- **SAPScript**
- **LSMW**
- **PCR / Schema** (HR)
- **Message Class** (SE91 — MCP tool yok)

### Message Class özel durumu

Geliştirme sırasında bir hata/uyarı/bilgi mesajı yazmak gerekiyorsa:
- MCP message class üretemediği için agent **kodda hardcode mesaj kullanır** (örn: `MESSAGE 'Malzeme bulunamadı' TYPE 'E'.`).
- Bu durum standart sapması sayılmaz, geliştirme **DURDURULMAZ** — KURAL #7 tetiklenmez.
- Final raporda "Notlar" bölümünde bilgi olarak iletilir: _"Hardcode mesaj kullanıldı (MCP message class tool'u yok). İleride SE91'den `Z<XX>` message class'a migrate edilebilir."_
- Hardcode mesajların listesi de raporda paylaşılır (text + tip + kullanıldığı yer) ki kullanıcı isterse manuel olarak message class'a taşıyabilsin.

## KURAL #4 — Sistem-Bazlı Kısıtlar

### HHD (BASIS 7.50, NW 7.5)
- DDIC nesneleri (Table, Structure, Data Element, Domain, Table Type) **MCP ile üretilemez** — SE11'den manuel yapılır.
- Diğer objeler (Class, FM, Program vb.) MCP ile çalışır.

### HRD (BASIS 7.40, NW 7.4 — ECC EHP7)
- CDS, Behavior Definition, Service Binding/Definition, Metadata Extension **yok** (NW 7.4).
- Table, Structure, DE, Domain, Adobe Form, Transport tool'ları, GetSession, SearchObject vb. MCP'de **tool yok** — SE11/SE10/SE16/SAT'ten manuel.
- `UpdateProgram` bilinen lock bug'ı yaşar — bkz. HRD standartları D5.

### S4D
- Tüm modern objeler MCP ile çalışır. Kısıt yok.

## KURAL #5 — Karar Belirsiz Olduğunda

Talep yorumu net değilse (yeni obje mi değişiklik mi, hangi modül, hangi paket vb.) önce KURAL #6'daki tespit/türetme yollarını dene. Eğer hâlâ birden fazla eşit olası yol varsa **tek bir soru** sor, cevap gelir gelmez durmadan devam et.

## KURAL #6 — Otonom Davranış Çerçevesi (Maksimum Otomasyon)

**Temel felsefe**: Agent kullanıcıya minimum soru sorar, maksimum otonom çalışır. Aşağıdaki bilgiler **kullanıcıya sorulmadan** tespit edilir, türetilir veya default kullanılır. Karar netse agent **bilgi verir, onay beklemez**.

### A. Talepten doğrudan çıkarılabilenler (LLM yorumlama ile)

| Bilgi | Nasıl tespit edilir | Örnek |
|---|---|---|
| **Modül kısaltması (`XX`)** | Paket adından (`ZHR` → HR, `ZMM` → MM, `ZFI` → FI) veya talep dilinden | "ZHR'a rapor ekle" → XX=HR |
| **Hedef paket** | Kullanıcı sistem + obje söylüyorsa implicit | "HRD'de ZHR_001'i güncelle" → paket=ZHR |
| **Title / Description** | Talep cümlesinden Title-Case ile türet | "personel listeleme raporu" → Title: "Personel Listeleme Raporu" |
| **Yeni vs değişiklik** | Talep dilinden | "oluştur / yarat / yeni" → YENİ; "güncelle / değiştir / ekle (var olana)" → DEĞİŞİKLİK |
| **Class kategorisi** | Talepteki ipuçlarından | "BAdI implement et" → BAdI Impl.; "Fiori OData" → Gateway DPC/MPC; "utility" → bağımsız; "geliştirmenin parçası" → DEV-bağlı |
| **Obje tipi** | Talep dilinden | "rapor" → executable program; "FM" / "fonksiyon" → function module; "class" → class pool |

### B. Sistemden tespit edilebilenler (tool çağrısıyla, sormadan)

| Bilgi | Tool | Davranış |
|---|---|---|
| **Sıradaki obje numarası** | `GetPackageContents` | Aynı tipteki en yüksek + 1 |
| **Sıradaki DEV numarası** | `GetPackageContents` | Yeni geliştirme için en yüksek DEV + 1 |
| **Yeni paket adı** | `SearchObject` veya `GetPackageContents("Z<XX>", include_subpackages=true)` | Modül kısaltması biliniyorsa, `Z<XX>_NNN` formatındaki mevcut alt paketleri tara; en yüksek `NNN` + 1 ile yeni paket oluşturulur (örn: ZMM_001..ZMM_998 var → yeni `ZMM_999`). Yeni paket olduğu için içindeki obje numaraları 01/001'den başlar. |
| **Mevcut obje yapı tespiti** (eski/standart) | `GetProgFullCode` / `GetClass` / `GetFunctionModule` | Kod okunup standartlara uyup uymadığı analiz edilir |
| **Açık transport** | `ListTransports` | Kullanıcı adına açık Workbench Request varsa kullan |
| **Yeni transport** | `CreateTransport` | Açık yoksa otomatik oluştur, açıklama formatlı yazılır |
| **Obje çakışma kontrolü** | `GetProgram` / `GetClass` vb. | Create öncesi aynı isimde var mı bak |
| **Standart mesaj kontrolü** | `SearchObject` (varsa) | Custom mesaj yaratmadan önce SAP standart mesaj var mı |

### C. Default değerler (dokümante kabul, sormadan kullanılır)

| Alan | Default değer | Neden |
|---|---|---|
| **Transport Layer** | Sistem default (`ZS4D`, `HOME` vb.) | Hayat dokümanında tanımlı |
| **Software Component** | `HOME` | Hayat standardı |
| **Record Changes** | `true` | Hayat standardı |
| **Application area** | `*` | SAP default |
| **Authorization Group** | boş | Çoğu Z objesi için gerekmez |
| **Logical Database** | boş / `D$S` | "Processing without database" |
| **Original Language** | Sistemin masterLanguage'ı (EN/TR) | Connection'dan otomatik |
| **Created By / Responsible** | `SAP_USERNAME` env'den | Connection'dan otomatik |
| **Created Date** | Bugünün tarihi | Sistem tarihi |
| **Program Type** | Talepten ("rapor"→executable, "include"→include, vb.) | LLM yorumu |

### D. Karar belirsizliği halinde davranış

| Durum | Davranış |
|---|---|
| **Pattern net** (tek olası yol) | Tahmin et, **bilgi ver** ("ZHR_038 olarak oluşturuyorum"), durma. |
| **2-3 olası yol var, biri belirgin** | En olası olanı seç, **bilgi ver** ("ZHR_036 DEV'i bağlamında ilerliyorum, itirazın varsa belirt"), durma. |
| **Gerçekten eşit olası birden fazla yol** | **Tek soru sor** (birleşik şekilde), cevap geldikten sonra durmadan devam et. |
| **Sistem hata verirse** | Hatayı yorumla, otomatik düzeltme dene; düzeltilemezse net hata mesajıyla kullanıcıya bildir. |

### E. Otomatik geri kontroller (sormadan yap)

- **Create öncesi çakışma kontrolü**: `Get*` ile aynı isimde obje var mı kontrol et:
  - **Kullanıcı specific bir isim verdi (yeni obje yaratılmak üzere) + obje sistemde zaten var** → **DUR.** Hiçbir obje oluşturulmaz, hiçbir transport açılmaz. "Geliştirme Durduruldu — Obje Çakışması" çıktısı verilir, kullanıcı talimat verene kadar beklenir. (Yeni isim mi, mevcudu güncelleme mi — kullanıcının açık kararı şart.)
  - **Agent otonom isim üretiyor (en yüksek + 1 algoritması)** → çakışma zaten oluşmaz; algoritma boş numarayı seçer. Yarış durumunda (race condition) bir sonraki müsait numara kullanılır.
- **Activate sonrası**: `Check` tool'u ile syntax error kontrolü; hata varsa fix dene veya net hata bildir.
- **Transport conflict**: Verilen/seçilen transport o objeye uyumlu mu kontrol et.
- **Bağımlılık zinciri**: Domain → Data Element → Structure → Table → CDS → FG/FM → Class/Interface → Program sırası takip edilir; her adımda aktive et + sonraki adıma geç.
- **Standart SAP tablo INSERT/UPDATE/DELETE**: ASLA doğrudan SQL yazma. BAPI/FM/sınıf ara, bulamazsan kullanıcıyı bilgilendir, müdahale etme. (Z/Y tablolar bu kuraldan muaftır.)

#### Çakışma durdurma çıktı formatı

```
🚫 Geliştirme Durduruldu — Obje Çakışması

Sistem: <S4D / HHD / HRD>
Talepte verilen isim: <obje adı>
Sistemde mevcut: <evet — type: <obje tipi>, paket: <paket>, status: <ACTIVE/INACTIVE>>

⚠️ Hiçbir obje oluşturulmadı, hiçbir transport açılmadı, hiçbir paket yaratılmadı.

Devam için seçenek:
1. **Mevcut objeyi güncelle** — "<isim>'i güncelle, şu değişikliği yap: ..." şeklinde açık talimat ver
2. **Farklı bir isim ile yeni obje yarat** — "<yeni isim> ile yeni oluştur" şeklinde açıkla
3. **Agent otonom isim seçsin** — "sıradaki müsait numara ile yeni oluştur" de
```

Bu durdurma her sistemde (S4D, HHD, HRD) geçerlidir — çakışma kontrolü sistem-bağımsız bir geri kontroldür.

### F. Soru SADECE şu durumlarda sorulur

> **GENEL PRENSİP**: Aşağıdaki kategoriler için bile **önce talep metni dikkatlice analiz edilir**. Bilgi talep içinde herhangi bir formatta (cümle, tablo, .docx, .xlsx, JSON, kod parçası vb.) yer alıyorsa **agent o değeri kullanır, sormaz**. Soru sadece bilgi gerçekten talep içinden çıkarılamadığında sorulur. Amaç: kullanıcıyla minimum etkileşim, maksimum otomasyon.

Aşağıdaki listede **olmayan** hiçbir şey için kullanıcıya soru sorulmaz:

1. **Sistem kodu** belirtilmemişse (KURAL #1).
2. **Talebin kendisi anlamsız/eksik** ise (örn: "bir şey yap" — neyi, nereye, nasıl belli değil).
3. **Karar gerçekten eşit olası birden fazla yol** varsa (KURAL #6.D'de açıklandı) ve agent talepten/sistemden ayırt edemiyorsa. Bu durumda da tek bir birleşik soru sorulur.
4. **MCP'nin üretemediği nesne tipi kapsamda zorunlu** ise (KURAL #3) — atlanır, sonda bildirilir; sorulmaz.
5. **Kritik onay gerekiyorsa** (örn: standart SAP programını silmek, üretim ortamını etkileyecek değişiklik) — agent **kendiliğinden riskli işlemi** yapmaz, kullanıcıdan açık onay ister.
6. **ZBCENH bağlamındaki Enhancement / BAdI / Function Exit / Screen Exit numaraları** (ENHA_IMNN, ENHA_ENNN, BADI_ENNN, EXIT_ENNN, ENHA_SNN vb.) — bu numaralar developer tarafından **ZBCENH üzerinden merkezi takip edilir**; sistem listesi yetersizdir. **Talepte (cümlede/tabloda/dokümanda) açıkça verilmişse o değer kullanılır, sorulmaz.** Hiç bahsi yoksa tek birleşik soruyla istenir.
7. **DDIC obje alan listesi ve data element bilgileri** (Structure, Table, Append Structure oluştururken alan adı / data element / key / Curr-Quan ref) — **talepte (cümlede/tabloda/dokümanda) verilmişse kullanılır, sorulmaz.** Hiç bahsi yoksa tek birleşik soruyla istenir.

### G. Bilgi verme protokolü — geliştirme süresince

Otonom kararlar kullanıcıya **akış kesilmeden** iletilir. Karar bildiriminde durulmaz, onay beklenmez:

> "ZHR paketinde mevcut DEV'lerden en yükseği 037. Yeni geliştirme **DEV 038** altında oluşturulacak.
> - Rapor: `ZHR_038`
> - Transport: yeni `S4DK912678` oluşturuldu
> - Modül: HR (paket adından)
> Devam ediyorum."

Kullanıcı itiraz ederse o noktada düzeltilir; itiraz yoksa onay beklenmeden iş yapılır.

### H. Geliştirme tamamlama çıktısı (final rapor)

Geliştirme bittiğinde agent **tek bir özet mesajla** kullanıcıya döner. Format:

```
✅ Geliştirme Tamamlandı

📦 Paket: <paket adı>
🚛 Transport: <TR numarası>

🆕 Oluşturulan / Değiştirilen Objeler:
   - <obje tipi> | <obje adı> | <durum: ACTIVE / INACTIVE>
   - ...

⚠️ Atlanan / Manuel Yapılması Gerekenler (varsa):
   - <obje tipi>: <neden — MCP tool yok, ZBCENH manuel kayıt vb.>

💬 Kullanılan Hardcode Mesajlar (varsa — MCP message class tool'u yok):
   - "<mesaj metni>" | <tip: E/W/I/S> | <kullanıldığı yer: program/method/satır>
   - ...
   → İleride SE91'den `Z<XX>` message class'a migrate edilebilir.

📝 Notlar (varsa):
   - <ek bilgi: aktivasyon uyarısı, performans notu, dependency vb.>
```

Bu özet **dışında** ekstra açıklama, doğrulama sorusu veya devam isteği yoktur. Agent geliştirme süresince kullanıcıya soru sormadan, sadece bilgi vererek ilerler ve sonunda bu formatta sonucu döner.

## KURAL #7 — Standart-Dışı İsimlendirme/Kodlama Talebinde Durdurma (yalnızca S4D)

> ⚠️ **Bu kural YALNIZCA `S4D` sistemi için geçerlidir.** HHD ve HRD'de uygulanmaz — bu sistemlerde standart-dışı isim/kodlama talepleri durdurma sebebi değildir, KURAL #6 otonom akışı devam eder. (HRD'de mevcut programların büyük kısmı zaten standart-dışı; HHD'de de eski objelere uyum gerekebilir.)
>
> S4D'de bu kural KURAL #6'daki otonom davranıştan **daha üstündür**. Standart sapması tespit edildiği anda otonom akış kesilir.

S4D talepte Hayat S4D coding standards'a uymayan bir **isim** veya **kodlama yapısı** tespit edilirse:

1. Agent **HİÇBİR OBJE OLUŞTURMAZ** — transport açmaz, paket açmaz, structure/tablo/program/class oluşturmaz. Hiçbir mutasyon yapılmaz.
2. Geliştirmeyi durdurur, standart sapmasını ve doğru kalıbı net bir şekilde bildirir.
3. Kullanıcı yanıt verene kadar bekler. Kullanıcı verdiği isim olsa bile **otomatik ilerlemez** — açık talimat şarttır.

### Standart sapması tetikleyici örnekleri

| Sapma tipi | Örnek (talepte) | Beklenen standart |
|---|---|---|
| Modül kodu içermeyen structure | `ZSTOK` | `ZXX_NNN_SNN` (örn: `ZMM_999_S01`) |
| Modül kodu içermeyen program | `Z_TEST_PROG`, `ZRAPOR1` | `ZXX_NNN_PNN` (örn: `ZMM_999_P01`) |
| Modül kodu içermeyen class | `ZCL_TEST`, `MY_CLASS` | `ZCL_XX_NNN` veya `ZXX_NNN_CLNN` |
| Y prefixli obje | `Y_*` | `Z*` (Hayat'ta yalnızca Z prefix) |
| Sayı dışı serbest format | `ZMM_RAPOR_STOK` | `ZMM_NNN_PNN` |
| Generic ABAP tip kullanımı | `abap.char(10)`, `abap.quan(13,3)` | Data element zorunlu (örn: `KWMENG`, `MATNR`) |
| Standart SAP tabloya direkt SQL | `INSERT INTO mara ...` | BAPI/FM/sınıf zorunlu |
| `BREAK-POINT` / `BREAK user` | Doğrudan breakpoint | Checkpoint group (SAAB) |
| `SY-DATUM` / `SY-UZEIT` | Sistem tarih/saat | `SY-DATLO` / `SY-TIMLO` |

### Agent çıktı formatı (durdurma)

```
🚫 Geliştirme Durduruldu — Standart Sapması Tespit Edildi

Sistem: <S4D / HHD / HRD>
Talepte algılanan: <hatalı isim veya yapı>
Sapma sebebi: <Hayat standardının hangi maddesi ihlal ediliyor>
Beklenen Hayat standardı: <doğru kalıp + örnek>

⚠️ Hiçbir obje oluşturulmadı, hiçbir transport açılmadı, hiçbir paket yaratılmadı.

Devam için iki seçenek var:
1. **Standart formata çevirerek devam et (önerilen)** —
   "evet, standart formatta devam et" yaz, agent <önerilen ad> ile ilerler.

2. **Standart-dışı kullanım için açık onay** —
   "<orijinal istenen ad> ile devam et, standart-dışı olduğunu onaylıyorum" gibi
   açık bir ifadeyle bildir. Bu durumda istisna olarak ilerler ve final raporda
   "Standart sapması: <ad>, kullanıcı açık onayı ile" notu düşülür.
```

### Otomatik kontrol akışı

Talep alındığında agent **ilk** olarak:
1. KURAL #1 — sistem kodu var mı?
2. **Sistem `S4D` ise** → KURAL #7 — talepte standart-dışı isim/kodlama var mı? **Varsa hemen dur.**
3. **Sistem `HHD` veya `HRD` ise** → KURAL #7 atlanır; doğrudan KURAL #6'ya geçilir.
4. KURAL #8 — mevcut bir objede değişiklik yapılacaksa, o obje üzerinde başka bir açık transport request var mı kontrol et. **Varsa hemen dur.**
5. KURAL #6 — kalan tüm bilgileri otonom topla, ilerle.

S4D'de KURAL #7 tetiklendiğinde KURAL #6.G (bilgi protokolü) ve KURAL #6.H (final özet) devreye girmez — onun yerine yukarıdaki "Geliştirme Durduruldu" formatı kullanılır.

### HHD ve HRD'de standart-dışı talepler

Bu sistemlerde:
- **HHD**: standart-dışı talep durdurma sebebi değildir; eski programlara uyum sağlamak için esneklik gereklidir. Yine de yeni obje oluşturuluyorsa Hayat HHD standartları **önerilen** kalıptır; agent talepteki ismi kullanır ama final raporda standart-dışı not düşer.
- **HRD**: ECC eski sistemde mevcut programların çoğu standart-dışıdır ve buna saygı gösterilir. Agent durmadan talepteki isimle ilerler. Eğer talep tamamen yeni bir geliştirmeyse `hayat_hrd.md`'deki standart kalıp önerilir, yine durulmaz.

## KURAL #8 — Mevcut Obje Değişikliğinde Açık Transport Çakışması (tüm sistemler)

> Bu kural KURAL #6'daki otonom davranıştan **daha üstündür**. Açık transport çakışması tespit edildiği anda otonom akış kesilir ve geliştirme başlamaz.

Geliştirme kapsamında **mevcut bir objeyi değiştirme** adımı varsa, geliştirmeye başlamadan **önce** kapsamdaki **tüm mevcut objeler** sistemden kontrol edilir:

1. Her mevcut obje için `GetObjectInfo` veya `GetTransport` ile o objenin üzerinde açık transport request var mı tespit edilir.
2. Kullanıcının verdiği transport request **dışında** herhangi bir objede başka bir açık request varsa:
   - Geliştirme **tamamen durdurulur.**
   - **Hiçbir nesne oluşturulmaz, hiçbir transport yaratılmaz.**
   - Hangi objelerde hangi açık request'lerin (numara + sahibi + açıklama) bulunduğu kullanıcıya bildirilir.
   - Kullanıcı talimat verene kadar beklenir. Kısmi geliştirme başlatılamaz — tek bir objede bile çakışma varsa kapsamın tamamı durdurulur.

### HRD özel davranışı (tool yok)

HRD'de `GetTransport` / `ListTransports` MCP tool'ları **yok**. Bu yüzden:
- Agent objeyi kendi sorgulayamaz.
- Kullanıcıdan **açık onay** istenir: _"HRD'de transport tool yok. <obje listesi> objelerinin üzerinde başka açık request olmadığını SE03/SE10'dan kontrol edip onayla. 'Çakışma yok, devam et' yazana kadar beklenir."_

### Çakışma çıktı formatı

```
🚫 Geliştirme Durduruldu — Açık Transport Çakışması

Sistem: <S4D / HHD / HRD>
Kullanıcı transport: <TR no — varsa>

Çakışan objeler ve açık request'ler:
   - <obje tipi> | <obje adı>
     → Açık request: <TR no> | Sahibi: <kullanıcı> | Açıklama: <metin>
   - ...

⚠️ Hiçbir obje oluşturulmadı, hiçbir transport açılmadı.

Devam için seçenek:
1. Çakışan request release edilsin → release sonrası "tekrar dene" yaz
2. Aynı request'e dahil ol → "<TR no>'yu kullan, devam et" şeklinde belirt
3. Kapsamdan obje çıkar → "<obje>'yi kapsamdan çıkar, kalanlarla devam et" şeklinde belirt
```

## KURAL #9 — DDIC Değişiklik Güvenliği (Tablo, Append, Data Element, Domain)

> Bu kural **tüm sistemlerde** (S4D / HHD / HRD) geçerlidir ve KURAL #6 otonom davranıştan **daha üstündür**. DDIC obje yapısında veri kaybına yol açabilecek değişiklikleri sıkı koruma altına alır.
>
> Not: Bu kural DDIC **structure** değişikliklerini düzenler (tablo yapısı, alan ekle/çıkar). Runtime **data** manipulation (INSERT/UPDATE/DELETE) için bkz. KURAL #6.E.
>
> MCP `UpdateTable` / `UpdateStructure` handler'ları yalnızca syntax check yapar; semantik schema-impact analizi YOKTUR. Bu nedenle insan-onaylı pre-flight koruma zorunludur.

### 9.A — Var olan custom tablolarda alan değişikliği

Sistemde **zaten var olan** custom Z/Y tablolarda yapılabilecek tek değişiklik:

✅ **İzin verilen**: Mevcut alanların **sonuna nullable yeni kolon ekleme**.

❌ **Yasak (talep gelirse DUR ve kullanıcıya geri sor)**:
- Mevcut alanın tip / uzunluk / decimals değiştirilmesi
- Alan silinmesi
- Key alan eklenmesi / çıkarılması
- Alan sırasının değiştirilmesi
- `DeleteTable` (açık onay olmadan asla)

**Akış**:
1. `GetTable` ile mevcut yapıyı oku.
2. Yeni alanları sona ekleyerek `UpdateTable` çağır.
3. Response'taki `activation_warnings` kullanıcıya iletilir (varsa).

**Kapsam dışı**:
- **Yeni** `CreateTable` çağrıları (kısıt yok, standart akış).
- **Structure** operasyonları (`CreateStructure` / `UpdateStructure` — bu kuralın 9.B kapsamındaki SAP standart tablonun append'i değilse normal akış).

**Sebep**: Sona nullable kolon ekleme SAP'de güvenlidir (mevcut satırlar etkilenmez); diğer değişiklikler operasyonel veri kaybı veya SE14 conversion çakışmasına yol açar. MCP append structure tool'u olmadığı için tabloyu doğrudan değiştirmek tek yol — bu nedenle değişiklik yelpazesi sona-ekleme ile sınırlandırılır.

### 9.B — Standart SAP tablo & append structure'larına müdahale (🛑 EN KATI)

🛑 **MUTLAK YASAK — TÜM SİSTEMLERDE GEÇERLİ**

**Kapsam (dokunulmaz objeler)**:
- SAP standart tüm tablolar (`MARA`, `EKKO`, `BSEG`, `VBAK`, `T*`, `BUT000` vb. — `Z*` / `Y*` / `/<NS>/` ile başlamayanlar standart kabul edilir).
- Bu standart tablolara bağlı **tüm append structure'lar** — müşteri yaratımı (`Z*` adlı) olsa bile (append fiziksel olarak standart tablonun parçasıdır).

**Yasaklanan işlemler (hepsi)**:

| İşlem | Karar |
|---|---|
| Standart tabloya `UpdateTable` ile alan ekle/çıkar | ❌ ASLA |
| Standart tabloya yeni append structure yarat (`CreateStructure`) | ❌ ASLA |
| Mevcut append structure'a alan ekle/çıkar (`UpdateStructure`) | ❌ ASLA |
| Standart tablo veya append'ini sil (`DeleteTable` / `DeleteStructure`) | ❌ ASLA |

**Talep geldiğinde**:
1. 🛑 DUR. İşlemi başlatma; transport açma; obje yaratma.
2. Hedef objenin standart SAP olduğunu kullanıcıya söyle ve hangi yasağa girdiğini açıkla.
3. Alternatif öner: paralel Z tablo + key (`MANDT` + key alanları) ile join, BAdI/exit ile veri zenginleştirme, CDS view extension.
4. Kullanıcı "bu kuralı geçici geçersiz kıl" şeklinde **açık** ifade kullanmadığı sürece reddet.

**Tespit yöntemi**:
- Tablo adı `Z*` / `Y*` / `/<NS>/` ile başlamıyorsa **standart kabul et** (varsayılan: ihtiyatlı davran).
- Şüphede `GetTable` ile sorgula: `delivery_class` ve `responsible/author` alanlarına bak (SAP-delivered tablolar genelde `A`/`L`/`S` delivery class + `SAP*` author).
- Bir append structure'ın bağlı olduğu tablo standart ise, append'in adı `Z*` olsa bile bu kural devreye girer.

**Sebep**: Standart tabloya müdahale support package, upgrade ve nota uygulamalarında çakışma yaratır; veri kaybı ve sistem tutarsızlığı riski en yüksek seviyededir. Append structure'lar SAP'nin onayladığı yöntem olsa da, üzerinde sürekli alan ekle/çıkar değişikliği aynı tabloyu kullanan diğer entegrasyonları kırabilir.

### 9.C — Standart tabloda kullanılan data element / domain'e müdahale (🛑 EN KATI)

🛑 **MUTLAK YASAK — TÜM SİSTEMLERDE GEÇERLİ**

**Kapsam**:
- `UpdateDataElement` / `DeleteDataElement` çağrıları
- `UpdateDomain` / `DeleteDomain` çağrıları

**Yasak koşul**:
- Hedef **data element**, en az bir SAP **standart tabloda** alan tipi olarak kullanılıyorsa → değişiklik **YASAK**.
- Hedef **domain**, kullanan herhangi bir data element üzerinden (doğrudan veya zincirleme) bir SAP **standart tabloya** ulaşıyorsa → değişiklik **YASAK**.

**Akış**:
1. 🛑 DUR. Henüz `Update*` / `Delete*` çağırma.
2. `GetWhereUsed({object_name, object_type: 'DTEL' | 'DOMA'})` ile kullanım listesini al.
3. **Domain için iki seviye kontrol**: domain → data element(ler) → tablo(lar). Her seviyede `Z*` / `Y*` / `/<NS>/` dışı bir tablo görünürse YASAK.
4. Standart tablo kullanımı varsa: hangi tabloda (örn: "MATNR data element'i `MARA-MATNR`'da kullanılıyor") açıkla, reddet.
5. Alternatif öner: yeni bir `Z` data element / domain yarat, mevcut nesneye dokunma. İhtiyaca göre paralel kullanım veya yeni alanlarda yeni Z nesne kullan.

**Sebep**: Bir data element'in tip/uzunluk/domain değişimi, onu kullanan TÜM tabloları etkiler. Standart tablo (örn `MATNR_D` domain → `MATNR` data element → `MARA-MATNR`) etkilenirse upgrade çakışması ve veri kaybı kesindir. Domain düzeyi etki yelpazesi çok daha geniştir — FI/MM/SD aynı domain'i paylaşır.

### 9.D — Önceki kurallarla ilişki

- 9.B ve 9.C, 9.A'dan **daha üstündür**: hedef obje SAP standardıysa veya bir standart tabloya bağlıysa, "var olan custom tablo" izinleri uygulanmaz; her zaman reddedilir.
- KURAL #6.G (bilgi protokolü) ve KURAL #6.H (final özet) bu kurallarda devreye girmez — durdurma çıktısı ile reddedilir.
- KURAL #4 (HHD DDIC kısıtı) zaten HHD'de DDIC üretimini engellediği için 9.A pratikte HHD'de tetiklenmez; ancak 9.B ve 9.C HHD'de hâlâ önemlidir (data element/domain değişiklikleri ECC'den migrate edilmiş objeler için S4D/HRD'de geçerli olabilir).

### 9.E — Durdurma çıktı formatı

```
🛑 Geliştirme Durduruldu — DDIC Değişiklik Güvenliği

Sistem: <S4D / HHD / HRD>
Kural: <9.A / 9.B / 9.C>
Hedef obje: <tip> | <isim>
İhlal: <ne yapılmaya çalışıldı + neden yasak>
Tespit kanıtı: <örn: "GetWhereUsed → MARA, EKKO standart tablolarında kullanılıyor">

⚠️ Hiçbir obje oluşturulmadı, hiçbir transport açılmadı, hiçbir değişiklik yapılmadı.

Devam için seçenek:
1. Yeni Z nesne yarat — "yeni Z<...> ile devam et" şeklinde belirt
2. Paralel Z tablo + key join öner — "paralel tablo yaklaşımıyla devam et"
3. Talebi iptal et — "bu işten vazgeç"
```

## KURAL #10 — Batch Input/BDC Son Çare; Önce BAPI/FM/CLASS Kontrolü

> Bu kural **tüm sistemlerde** (S4D / HHD / HRD) geçerlidir ve KURAL #6 otonom davranıştan **önce** uygulanan bir ön kontroldür. TS / talep analiz aşamasında, henüz obje yaratmadan tetiklenir.

### Tetikleyici

Talepte aşağıdaki ifadelerden biri geçerse veya bir SAP standart işlem koduna toplu kayıt atma gereksinimi tarif ediliyorsa kural devreye girer:

- "Batch Input"
- "BDC"
- "SM35" / "SM36"
- "Call Transaction"
- "Recording" (SHDB)
- "OB08'e toplu yükleme", "ME21N'e toplu giriş", "VA01'e toplu sipariş" gibi standart TCode'a toplu veri aktarma talebi

### Akış

1. **Önce BAPI/FM/Class araması** — `SearchObject` / `GetObjectsByType` / `GetWhereUsed` ile sistemde söz konusu işlemi karşılayan standart bir **BAPI / Function Module / Class** var mı kontrol et.

2. **Karşılığı bulunduysa** → BDC'yi **reddet**, kullanıcı/danışmana geri dön. Yorum:
   > "Bu iş için `<BAPI/FM_ADI>` standart olarak mevcut; BDC önerilmez. Geliştirme `<BAPI_ADI>` + `BAPI_TRANSACTION_COMMIT` üzerinden kurgulanmalı."

3. **Hiçbir karşılığı yoksa** → BDC son çare olarak **kabul edilir**, izin verilir. Final raporda "BAPI alternatifi bulunamadığı için BDC kullanıldı, taranan tool'lar: ..." notu düşülür.

### Yaygın eşleşmeler (tam liste değil — her TS için sistemde doğrula)

| Standart TCode | Önerilen BAPI/FM |
|---|---|
| OB08 (kur tipi) | `BAPI_EXCHRATE_CREATEMULTIPLE` |
| ME21N / ME21 (PR) | `BAPI_REQUISITION_CREATE` |
| ME41 (RFQ) | `BAPI_QUOTATION_CREATEFROMDATA2` |
| VA01 (sipariş) | `BAPI_SALESORDER_CREATEFROMDAT2` |
| FB01 / F-02 (yevmiye) | `BAPI_ACC_DOCUMENT_POST` |
| MM01 (malzeme) | `BAPI_MATERIAL_SAVEDATA` |
| XK01 / XK02 (satıcı) | `BAPI_VENDOR_CREATE` / `VENDOR_INSERT` |
| XD01 / XD02 (müşteri) | `BAPI_CUSTOMER_CREATEFROMDATA1` |
| MIRO (gelen fatura) | `BAPI_INCOMINGINVOICE_CREATE` |
| MIGO (mal hareketi) | `BAPI_GOODSMVT_CREATE` |
| HR Master Data (PA30) | `HR_INFOTYPE_OPERATION` |
| FK01 / FK02 (FI satıcı) | `BAPI_VENDOR_CREATE` |
| FD01 / FD02 (FI müşteri) | `BAPI_CUSTOMER_CREATEFROMDATA1` |
| CS01 (BOM) | `BAPI_MATERIAL_BOM_GROUP_CREATE` |

### Sebep

SAP upgrade veya support package ile ekran/dynpro yapısı değişince BDC'ler kırılır. Çalışma anında beklenmedik popup/uyarı (yetki, validasyon, info mesajı) çıkarsa BDC akışı bozulur ve veri tutarsızlığı oluşur. BAPI/FM çağrıları **upgrade-safe**, transactional ve popup'tan etkilenmez; `BAPI_TRANSACTION_COMMIT` / `ROLLBACK WORK` ile atomicite sağlanır.

### Önceki kurallarla ilişki

- KURAL #6 (otonom davranış) bu kural devreye girdiğinde **askıya alınır** — önce BAPI taraması yapılır, sonra geliştirme kararı verilir.
- KURAL #5 (karar belirsizliği) burada uygulanmaz — BAPI bulunduysa kullanıcıya sorulmaz, doğrudan reddedilir ve alternatif önerilir.
- KURAL #3 (MCP'nin üretemediği nesneler): BDC kabul edildiği durumlarda transaction code (SE93) ve SHDB recording manuel kalır; bu kapsamda zaten sessiz atlanır.

### Reddetme çıktı formatı (BAPI bulunduğunda)

```
⚠️ BDC Kullanımı Reddedildi — KURAL #10

Talep: <hangi TCode'a toplu yükleme>
Bulunan alternatif: <BAPI/FM_ADI>
Tarama yöntemi: <SearchObject / GetWhereUsed sorgusu>

Geliştirme önerisi:
- Ana akış: <BAPI_ADI> ile çağrı
- Atomicite: BAPI_TRANSACTION_COMMIT / ROLLBACK WORK
- Hata yönetimi: BAPIRET2 tablosu üzerinden satır bazlı raporlama

Devam için: "BAPI ile devam et" veya "yine de BDC istiyorum, gerekçesi şu" yazın.
```

