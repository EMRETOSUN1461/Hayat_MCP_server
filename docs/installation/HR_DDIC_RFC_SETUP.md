# HR / Legacy Sistemde DDIC Oluşturma — RFC Dispatcher Kurulumu

HR (legacy) SAP sisteminde Domain / Data Element / Structure / Table / Table Type **oluşturmak** için ADT REST endpoint'i mevcut değildir. Bu boşluk, sisteme deploy edilen `Z_HAYAT_DDIC_CREATE` adlı dispatcher Function Module ile kapatılır. MCP server, sistem türü `legacy` olduğunda ya da `SAP_USE_HR_DDIC_DISPATCHER=true` env değişkeni verildiğinde ilgili `Create*` araçlarını otomatik olarak bu FM üzerine yönlendirir.

## Gerekenler

- HR sistemine erişimli ADT/RFC bağlantısı (HTTP olabilir; saf RFC zorunlu değildir).
- ADT'nin mevcut olduğu bir kullanıcı: `Z_HAYAT_DDIC_CREATE`'i çağırabilmek için MCP, `handleCallFunctionModule` altyapısını kullanır (program update + activate + execute → `ZAI_MCP_OUTPUT` üzerinden sonuç).
- `ZAI_MCP_OUTPUT` tablosu (CHAR32 EXEC_ID, NUMC4 SEQ_NR, CHAR255 LINE) — `handleCallFunctionModule.ts` ön koşulu.
- `ZAI_MCP_FM_CALLER` adlı boş bir program iskeleti (`$TMP` paketinde, bu da `handleCallFunctionModule` ön koşulu).

## ABAP tarafı kurulum

ABAP kaynak dosyaları `resources/abap/hr_ddic_dispatcher/` klasöründedir. SE80'den manuel kurulum:

1. **Function Group**: SE80 → "Function Group" → `ZHAYAT_DDIC` oluştur. Paket: `$TMP` (test) veya kurumsal `Zxxx` paketi.
2. **Top include** (`LZHAYAT_DDICTOP`):
   - SE80 → fonksiyon grubunun altında `LZHAYAT_DDICTOP` include'unu aç.
   - İçeriği [`lzhayat_ddictop.abap`](../../resources/abap/hr_ddic_dispatcher/lzhayat_ddictop.abap) ile değiştir.
3. **Local class include** (`LZHAYAT_DDICCLS`):
   - Yeni include oluştur: `LZHAYAT_DDICCLS`.
   - İçeriği [`lzhayat_ddiccls.abap`](../../resources/abap/hr_ddic_dispatcher/lzhayat_ddiccls.abap) ile değiştir.
   - `SAPLZHAYAT_DDIC` ana programına `INCLUDE lzhayat_ddiccls.` satırını ekle (TOP'tan hemen sonra).
4. **Function Module**: SE37 → `Z_HAYAT_DDIC_CREATE` oluştur (Function Group: `ZHAYAT_DDIC`).
   - **Attributes** sekmesi: "Remote-Enabled Module" işaretle (RFC çağrılabilir olması için).
   - **Import / Export / Tables** sekmelerini [`z_hayat_ddic_create.abap`](../../resources/abap/hr_ddic_dispatcher/z_hayat_ddic_create.abap) dosyasının başındaki imza yorumuna göre doldur.
   - **Source Code** sekmesine aynı dosyanın gövdesini yapıştır.
5. **Aktivasyon**: SE80'de top → cls include → fm sırasıyla aktive et.

## Yetki

`Z_HAYAT_DDIC_CREATE`'i çağıran kullanıcı için gerekli yetkiler:

| Auth obj | Detay |
|---|---|
| `S_DEVELOP` | Object types `DOMA`, `DTEL`, `TABL`, `TTYP` için ACTVT 01 (create), 02 (change), 07 (activate) |
| `S_TRANSPRT` | Transport append için (`TR_OBJECTS_INSERT`) |
| `S_RFC` | FUGR `ZHAYAT_DDIC` ve FUNC `Z_HAYAT_DDIC_CREATE` için |

## MCP server tarafı yapılandırma

HR sistemi için `.env` dosyasında veya MCP başlangıç parametresinde:

```env
SAP_SYSTEM_TYPE=legacy
# isteğe bağlı: legacy değilse bile dispatcher yolunu zorlamak için
# SAP_USE_HR_DDIC_DISPATCHER=true
```

`SAP_SYSTEM_TYPE=legacy` ile `getSystemContext().isLegacy === true` olur ve `shouldUseHrDdicDispatcher()` true döner — `CreateDomain` / `CreateDataElement` / `CreateStructure` / `CreateTable` / `CreateTableType` araçları otomatik olarak `Z_HAYAT_DDIC_CREATE` yoluna düşer.

## İş akışı (Hayat agent memory Kural 13'e uygun)

1. `mcp__hr__CreateDomain` — domain nesnesi.
2. `mcp__hr__CreateDataElement` — data element (yukarıdaki domain'i `type_name`'de referans alır; `type_kind` zorunlu olarak `domain` olmalı, dispatcher diğer kind'leri kabul etmez).
3. `mcp__hr__CreateStructure` — alanlar `data_element` (rollname) ile tanımlanır; generic `abap.char(...)` kabul edilmez.
4. `mcp__hr__CreateTable` — alanlar `data_element` ile, key alanlar `key: true`, currency/quantity alanları `curr_quan_ref: "TABLE-FIELD"` formatında.
5. `mcp__hr__CreateTableType` — `row_type` parametresine yukarıdaki structure adı verilir.

Her adımdan sonra `mcp__hr__GetXxx` ile aktivasyon başarısı doğrulanır.

## Sınırlar

- Dispatcher `data element` için yalnızca **domain referansı** ile data element üretmeyi destekler (ABAP built-in tipleri veya class referansları desteklenmez). Bu kısıt Hayat coding standardındaki "her alan için mutlaka data element" kuralıyla uyumludur.
- `CreateTableType` mevcut sürümde yalnızca legacy üzerindedir; cloud/onprem ADT API'sinde table type create endpoint'i bulunmadığı için ayrı bir iş kapsamında ele alınması gerekir.
- Dispatcher her PUT/ACTIVATE çağrısında `EV_SUCCESS` ve `ET_LOG` döndürür; aktivasyon hatası `EV_SUCCESS = ABAP_FALSE` olarak gelir, MCP tarafı bu durumda `McpError` fırlatır.
- Mevcut nesnenin **güncellenmesi** (Update*) bu dispatcher kapsamında değildir — yalnızca create + activate.

## Hata ayıklama

- ABAP tarafında SE37 üzerinden `Z_HAYAT_DDIC_CREATE` doğrudan çağrılabilir. `IV_SPEC_JSON` parametresine [`README.md`](../../resources/abap/hr_ddic_dispatcher/README.md) içindeki örnek JSON yapıştırılarak izole test yapılır.
- MCP tarafı log'unda `via: 'hr-ddic-dispatcher'` flag'i çıktıda mevcuttur — handler dallanmasının dispatcher yoluna düştüğünü gösterir.
- `ET_LOG` tablo dönüşü, çıktıda `log: [{ type, message }]` olarak iletilir; aktivasyon hatalarını okumak için bu listeye bakılmalıdır.
