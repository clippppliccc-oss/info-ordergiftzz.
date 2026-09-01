# Telegram HTML Hosting Bot

Bot Telegram ini menerima file `.html` yang dikirim user, lalu otomatis "hosting" file itu di server dan membalas dengan link yang bisa dibuka siapa saja.

## Cara Kerja
1. User kirim file `.html` ke bot.
2. Bot download file itu dan simpan di folder `sites/<id>/index.html`.
3. Server Express di dalam bot ini men-serve folder tersebut sebagai halaman web.
4. Bot balas dengan link: `BASE_URL/site/<id>/`

## 1. Buat Bot di Telegram
1. Chat ke [@BotFather](https://t.me/BotFather) di Telegram.
2. Ketik `/newbot`, ikuti instruksinya.
3. Simpan **token** yang diberikan.

## 2. Install & Jalankan
```bash
npm install
cp .env.example .env
```
Buka `.env`, isi `BOT_TOKEN` dengan token dari BotFather.

Jalankan:
```bash
npm start
```

## 3. Supaya Link Bisa Diakses Publik
Server ini jalan lokal di komputer/servermu. Ada 2 opsi:

### Opsi A — Testing cepat (pakai ngrok)
```bash
npx ngrok http 3000
```
Ngrok akan kasih URL publik seperti `https://abcd1234.ngrok-free.app`.
Copy URL itu ke `.env` sebagai `BASE_URL`, lalu restart bot (`npm start`).

### Opsi B — Production (VPS + domain, disarankan)
1. Deploy folder ini ke VPS (misal DigitalOcean, VPS Indonesia, dll).
2. Install Node.js di VPS.
3. Jalankan bot terus-menerus pakai PM2:
   ```bash
   npm install -g pm2
   pm2 start bot.js --name html-host-bot
   pm2 save
   ```
4. Arahkan domain/subdomain ke VPS, lalu pasang reverse proxy Nginx ke port 3000, plus SSL (Certbot) supaya bisa `https://`.
5. Set `BASE_URL=https://domainkamu.com` di `.env`.

## Perintah Bot
- `/start` — info awal
- Kirim file `.html` — otomatis di-hosting
- `/mysites` — lihat semua situs yang sudah kamu hosting
- `/delete <id>` — hapus situs tertentu

## Catatan & Batasan
- Saat ini hanya mendukung 1 file `.html` per situs (jadi `index.html`). Kalau butuh multi-file (CSS/JS/gambar terpisah), bisa dikembangkan agar menerima file `.zip` lalu diekstrak — bilang saja kalau mau saya tambahkan fitur itu.
- Tidak ada validasi konten HTML (XSS, script berbahaya, dll). Untuk bot publik yang dipakai banyak orang asing, sebaiknya tambahkan sandboxing/scan konten sebelum production.
- Data situs disimpan di `sites.json` (sederhana). Untuk skala besar, ganti ke database seperti SQLite/PostgreSQL.
