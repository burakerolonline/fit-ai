# FitAI v3 — OpenAI + Gemini Fallback

## Akıllı Fallback Sistemi

```
Fotoğraf Analizi:  OpenAI GPT-4o  →  Google Gemini (ücretsiz)
Kıyafet Arama:    Gemini Search  →  OpenAI Search
Virtual Try-On:   fal.ai cat-vton
```

Kullanıcı hiçbir şey farketmez — OpenAI kredisi bitince otomatik Gemini'ye geçer.

## 3 API Key Gerekiyor

| Key | Nereden | Ücret |
|-----|---------|-------|
| OPENAI_API_KEY | platform.openai.com/api-keys | $5 min (100+ try-on) |
| GEMINI_API_KEY | aistudio.google.com/apikey | Ücretsiz (1500/gün) |
| FAL_KEY | fal.ai/dashboard/keys | Ücretsiz tier var |

## Deploy (GitHub + Vercel)

1. GitHub'a dosyaları yükle
2. Vercel'e bağla → Environment Variables ekle:
   - `OPENAI_API_KEY`
   - `GEMINI_API_KEY`
   - `FAL_KEY`
3. Deploy → bitti!
