# FitAI v4 — Tamamen Ücretsiz Virtual Try-On

## Artık fal.ai'ye Gerek Yok!

Virtual try-on HuggingFace Spaces üzerinden çalışıyor — ücretsiz, API key gerektirmiyor.

## Sadece 2 API Key Gerekiyor

| Key | Nereden | Ücret |
|-----|---------|-------|
| OPENAI_API_KEY | platform.openai.com/api-keys | $5 min |
| GEMINI_API_KEY | aistudio.google.com/apikey | Ücretsiz |

OpenAI kredisi bitince otomatik Gemini'ye geçer.

## Sistem

```
Fotoğraf Analizi: OpenAI GPT-4o → Gemini fallback (ücretsiz)
Kıyafet Arama:   Gemini Google Search (ücretsiz)
Virtual Try-On:   HuggingFace Spaces (ücretsiz, API key yok)
```

## Deploy

1. GitHub'a dosyaları yükle
2. Vercel'e bağla
3. Environment Variables: OPENAI_API_KEY + GEMINI_API_KEY
4. Deploy → bitti!
