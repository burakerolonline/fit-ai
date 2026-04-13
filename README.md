# FitAI - Virtual Try-On

AI destekli sanal kıyafet deneme uygulaması.

## Nasıl Çalışır

1. Fotoğrafını yükle
2. Stil seç (luxury, streetwear, casual, minimalist, avant-garde)
3. AI fotoğrafını analiz eder (vücut tipi, ten rengi, yüz şekli)
4. Önerilen kıyafeti web'den bulur
5. **fal.ai** ile kıyafeti senin üzerine giydirir
6. Before/After sonucu gösterir

## Kurulum (5 dakika)

### 1. API Key'leri Al

- **fal.ai**: https://fal.ai/dashboard/keys → ücretsiz key al
- **Anthropic**: https://console.anthropic.com → API key al

### 2. Projeyi Kur

```bash
git clone <repo>
cd fitai
cp .env.example .env.local
```

`.env.local` dosyasını düzenle:
```
FAL_KEY=your_fal_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

### 3. Çalıştır

```bash
npm install
npm run dev
```

http://localhost:3000 adresini aç.

### 4. Vercel'e Deploy Et (opsiyonel)

```bash
npx vercel
```

Vercel dashboard'da Environment Variables'a API key'lerini ekle.

## API Routes

| Route | Açıklama |
|-------|----------|
| `POST /api/analyze` | Fotoğraf analizi (Anthropic Vision) + kıyafet görseli arama |
| `POST /api/tryon` | Virtual try-on (fal.ai cat-vton) |

## Neden Backend Gerekli?

fal.ai ve diğer AI API'leri tarayıcıdan doğrudan çağrılamıyor (CORS engeli).
Next.js API routes bu sorunu çözüyor — API çağrıları server-side yapılıyor.

## Teknoloji

- **Frontend**: Next.js 14 + React
- **AI Analiz**: Anthropic Claude (vision + web search)
- **Virtual Try-On**: fal.ai cat-vton
- **Deploy**: Vercel
