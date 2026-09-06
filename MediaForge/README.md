# MediaForge — Social Media Downloader

Website downloader dengan tampilan modern untuk URL media dari YouTube, TikTok, Instagram, dan Facebook.

> Gunakan hanya untuk media yang Anda miliki, Anda berhak mengunduhnya, atau pengunduhan tersebut diizinkan oleh platform/pemilik konten. Jangan gunakan untuk melewati DRM, akses privat, atau pembatasan platform.

## Arsitektur

- `frontend/` → website statis, cocok untuk GitHub Pages.
- `backend/` → Node.js API yang menjalankan `yt-dlp` + FFmpeg.
- API key/provider dapat diatur melalui environment variable di backend.
- Nomor WhatsApp developer dan URL backend diatur di `frontend/config.js`.

GitHub Pages hanya menjalankan frontend. Untuk fungsi download sebenarnya, deploy folder `backend/` ke server Node/Docker terpisah.

## Menjalankan backend

Prasyarat:
- Node.js 20+
- `yt-dlp`
- FFmpeg

```bash
cd backend
npm install
cp .env.example .env
npm start
```

Default API: `http://localhost:3000`

## Docker

```bash
cd backend
docker build -t mediaforge .
docker run --rm -p 3000:3000 --env-file .env mediaforge
```

## GitHub Pages

Upload seluruh repository ke GitHub. Aktifkan Pages dari:
Settings → Pages → Deploy from branch → `main` → `/frontend`

Kemudian ubah `frontend/config.js`:

```js
window.MEDIAFORGE_CONFIG = {
  API_BASE_URL: "https://DOMAIN-BACKEND-ANDA",
  DEVELOPER_WHATSAPP: "628xxxxxxxxxx"
};
```

## API provider eksternal

Jika Anda memiliki provider downloader sendiri, isi `.env`:

```env
EXTERNAL_API_URL=https://api-provider-anda.example/download
EXTERNAL_API_KEY=ISI_API_KEY
```

Provider eksternal tidak wajib. Backend bawaan dapat menggunakan yt-dlp.

## Catatan

- Kualitas video: best, 1080p, 720p, 480p, 360p.
- Audio: MP3/M4A.
- Gambar: thumbnail/cover jika tersedia.
- Riwayat URL tersimpan lokal di browser.
- Tidak ada API key rahasia yang ditaruh di JavaScript frontend.
