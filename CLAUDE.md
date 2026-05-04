# MCP ABAP ADT - Development Guide

## 📍 Source of Truth — Tüm Kural ve Tool Değişiklikleri

**Bu repo Hayat ABAP geliştirme kuralları ve MCP tool'ları için TEK MERKEZDİR.** Local Claude Desktop, Azure-deploy Claude SDK ve Claude Code agent — hepsi MCP server üzerinden aynı kaynaklardan beslenir. Sürüklenme / çakışma / eksik kural önlenir.

> Her commit / deploy öncesi drift kontrolü için: `npm run check:rule-drift`

### Nereye ne yazılır

| Değişiklik tipi | Hedef dosya | Etki |
|---|---|---|
| Sistemler-arası agent kuralı (KURAL #N) | `resources/global.md` | `GetHayatCodingStandards` default 'all' çağrısında otomatik prepend |
| S4D sistem-bazlı standart | `resources/hayat_s4d.md` | `GetHayatCodingStandards({system: "S4D"})` |
| HHD sistem-bazlı standart | `resources/hayat_hhd.md` | `GetHayatCodingStandards({system: "HHD"})` |
| HRD/ECC sistem-bazlı standart | `resources/hayat_hrd.md` | `GetHayatCodingStandards({system: "HRD"})` |
| Yeni MCP tool / tool değişikliği / bug fix | `src/handlers/<group>/...` + handler index | `npm run build` sonrası deploy |
| Deploy konfigürasyonu | `docker/Dockerfile`, `.dockerignore`, `package.json` "files" | Docker imajı |

### NEREYE ASLA YAZMA

- ❌ `~/.claude/projects/.../memory/` — agent'ın lokal hafızası, deploy ile gitmez, drift kaynağıdır
- ❌ Diğer makine config'leri (`claude_desktop_config.json` vb.) — deployment plumbing, kural değildir
- ❌ Test config (`tests/test-config.yaml` — gitignored), `.env*` (gitignored) — kural koymak için yer değil
- ❌ Gitignored / dockerignored herhangi bir dizin

### Deploy zinciri

1. Repo değişiklikleri → `git push origin main`
2. CI/CD veya manuel: `docker build` → image registry
3. Azure Kubernetes pull + deploy
4. `resources/*.md` konteyner içinde `/app/resources/` altında hazır
5. Tüm caller'lar (Claude Desktop, SDK, Claude Code) `GetHayatCodingStandards` ile **aynı** ve **güncel** kuralları alır

### Drift Tespiti

Lokal memory dizini sadece `MEMORY.md` index pointer'ı içermelidir. Başka kural dosyası → drift.

`npm run check:rule-drift` aşağıdakileri kontrol eder:
- Lokal agent memory'de rule dosyası yok
- `resources/global.md` ve `resources/hayat_*.md` mevcut
- `.dockerignore` rule dosyalarını re-include ediyor (`!resources/**/*.md`)
- `Dockerfile` resources/ kopyalıyor
- `package.json` "files" array'i resources/ içeriyor
- CLAUDE.md eski mirror dosyasını referanslamıyor

---

## Agent Davranış Kuralları

Bu projede çalışan tüm agent oturumları (Claude Code, Azure-hosted agent, vs.) aşağıdaki kural setlerini okumakla yükümlüdür:

- **Sistemler-arası kurallar**: [`resources/global.md`](resources/global.md) — sistem seçimi, transport otonom yönetimi, MCP'nin üretemediği nesneler, sistem-bazlı kısıtlar, **DDIC değişiklik güvenliği** (standart tablo/append/data element/domain için katı koruma — KURAL #9), **BDC son çare** (KURAL #10). `GetHayatCodingStandards` default 'all' çağrısında otomatik olarak yanıtın başına eklenir.
- **Sistem-bazlı kodlama standartları**: MCP server'ın `GetHayatCodingStandards` tool'undan alınır:
  - `GetHayatCodingStandards({system: "S4D"})` → S4HANA standartları (`resources/hayat_s4d.md`)
  - `GetHayatCodingStandards({system: "HHD"})` → HR Dev standartları (`resources/hayat_hhd.md`)
  - `GetHayatCodingStandards({system: "HRD"})` → ECC EHP7 standartları (`resources/hayat_hrd.md`)

Kullanıcı "ECC" derse `system="HRD"` kullanılır (sistem ID = HRD).

## Testing

### Integration Tests

Integration tests run against a real SAP system. Two modes:

- **Soft mode** (default, `integration_hard_mode.enabled: false`): calls handlers directly, no MCP subprocess.
- **Hard mode** (`integration_hard_mode.enabled: true`): spawns full MCP server via stdio, calls tools through MCP protocol.

**Strategy**: Run soft mode for mass regression testing. Use hard mode only for targeted verification of recent changes.

**Shared objects**: Before the first test run, create shared SAP objects (tables, CDS views, classes) that some tests depend on:
```bash
npm run shared:setup     # first run only, persists across test runs
npm run shared:check     # verify they exist
```

**Running integration tests**: Always save full output to a log file — do NOT truncate with `tail`. Tests take 15-25 minutes; use `timeout 1800` (30 min) or `run_in_background` with no timeout truncation. This avoids re-running long tests just to see errors.

```bash
# Soft mode (mass run) — save full log
npm run test:integration 2>&1 | tee /tmp/integration-test.log

# Hard mode (targeted, in test-config.yaml set integration_hard_mode.enabled: true)
npm test -- --testPathPatterns=<specific-test>
```

### Test Configuration

All test parameters live in `tests/test-config.yaml` (gitignored). The template (`tests/test-config.yaml.template`) works out of the box with sensible defaults.

**Setup:**
```bash
cp tests/test-config.yaml.template tests/test-config.yaml
# Edit ONLY the lines marked "# ← CHANGE"
```

**Required changes** (marked `# ← CHANGE`):
- `environment.env` — session .env file name (`"e19.env"`, `"mdd.env"`) from standard sessions folder
- `environment.system_type` — `"onprem"`, `"cloud"`, or `"legacy"`
- `environment.connection_type` — `"http"` (default) or `"rfc"` (legacy)
- `environment.default_package` — dev package (`ZMCP_TEST`, `$TMP`)
- `environment.default_transport` — transport request or `""` for local packages
- `shared_dependencies.package` — package for shared test objects
- `shared_dependencies.software_component` — `"LOCAL"`, `"HOME"`, etc.

Everything else (object names, timeouts, CDS sources, unit test code) has working defaults. See `docs/development/tests/TESTING_GUIDE.md` for full details.

### available_in

`available_in` in `TOOL_DEFINITION` restricts tool to specific SAP environments. If omitted, the tool is available everywhere. Only set it when a tool genuinely doesn't work on some platform (e.g., Programs are onprem-only):

```typescript
available_in: ['onprem', 'legacy'] as const,  // not available on cloud
```

Values: `'onprem'` | `'cloud'` | `'legacy'`. If omitted, tool is available everywhere. Test-level `available_in` is controlled separately in `test-config.yaml.template`.

### Cloud vs On-Prem

- Programs are NOT available on ABAP Cloud (`available_in: ['onprem', 'legacy']`)
- Runtime profiling (class-based) and dumps work on both cloud and onprem
- `RuntimeRunProgramWithProfiling` is onprem-only (no programs on cloud)
