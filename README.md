# FitAI v2 - Virtual Try-On

## Önceki Versiyondaki Hatalar ve Düzeltmeler

| Hata | Düzeltme |
|------|----------|
| Vercel 10sn timeout → fal.ai yanıt veremiyordu | `maxDuration = 60` eklendi |
| Base64 resim çok büyük → fal.ai reddediyordu | `fal.storage.upload()` ile önce yükleniyor |
| Raw fetch ile fal.ai polling hatası | `@fal-ai/client` SDK kullanılıyor (otomatik queue + poll) |
| Hata mesajları gösterilmiyordu | Detaylı error handling eklendi |

## Kurulum

### 1. API Key'leri Al
- **fal.ai**: https://fal.ai/dashboard/keys
- **Anthropic**: https://console.anthropic.com

### 2. GitHub'a Yükle
- Tüm dosyaları GitHub repo'na yükle ("Upload files")
- `.env.example` dosyasını `.env.local` olarak KOPYALAMA — Vercel'de env var olarak ekleyeceksin

### 3. Vercel'de Deploy Et
- vercel.com → "Add New Project" → GitHub repo seç
- **Environment Variables** ekle:
  - `FAL_KEY` = fal.ai key'in
  - `ANTHROPIC_API_KEY` = Anthropic key'in
- Deploy

## Dosya Yapısı
```
app/
├── page.js              ← Frontend
├── layout.js            ← HTML layout
├── api/
│   ├── analyze/route.js ← Anthropic Vision + web search
│   └── tryon/route.js   ← fal.ai cat-vton (server-side)
```
