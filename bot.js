require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN belum diset. Isi file .env dulu (lihat .env.example).');
  process.exit(1);
}

const SITES_DIR = path.join(__dirname, 'sites');
if (!fs.existsSync(SITES_DIR)) fs.mkdirSync(SITES_DIR, { recursive: true });

const DB_FILE = path.join(__dirname, 'sites.json');
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); } catch { return {}; }
}
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ---------- Express server (yang benar-benar "hosting" websitenya) ----------
const app = express();
app.use('/site', express.static(SITES_DIR, { extensions: ['html'] }));
app.get('/', (req, res) => {
  res.send('✅ Telegram HTML Hosting Bot aktif. Kirim file .html ke bot Telegram untuk hosting.');
});
app.listen(PORT, () => {
  console.log(`🌐 Server hosting jalan di ${BASE_URL} (port ${PORT})`);
});

// ---------- Bot Telegram ----------
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

function generateId() {
  return crypto.randomBytes(4).toString('hex'); // contoh: a1b2c3d4
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Gagal download file, status ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    '👋 Halo! Kirim file *.html* ke saya, nanti akan otomatis saya hosting dan kamu dapat link-nya.\n\n' +
    'Perintah lain:\n' +
    '/mysites - lihat semua situs yang sudah kamu hosting\n' +
    '/delete <id> - hapus situs berdasarkan id',
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/mysites/, (msg) => {
  const db = loadDB();
  const userId = msg.from.id;
  const mySites = Object.entries(db).filter(([id, data]) => data.userId === userId);

  if (mySites.length === 0) {
    bot.sendMessage(msg.chat.id, 'Kamu belum punya situs yang di-hosting. Kirim file .html untuk mulai.');
    return;
  }

  const list = mySites.map(([id, data]) =>
    `🔹 ${data.filename}\n   ${BASE_URL}/site/${id}/\n   (id: ${id})`
  ).join('\n\n');

  bot.sendMessage(msg.chat.id, `📄 Situs kamu:\n\n${list}`);
});

bot.onText(/\/delete (.+)/, (msg, match) => {
  const db = loadDB();
  const id = match[1].trim();
  const entry = db[id];

  if (!entry || entry.userId !== msg.from.id) {
    bot.sendMessage(msg.chat.id, '❌ Id tidak ditemukan atau bukan milikmu.');
    return;
  }

  const dir = path.join(SITES_DIR, id);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  delete db[id];
  saveDB(db);

  bot.sendMessage(msg.chat.id, `🗑️ Situs dengan id ${id} sudah dihapus.`);
});

bot.on('document', async (msg) => {
  const chatId = msg.chat.id;
  const doc = msg.document;
  const filename = doc.file_name || '';

  if (!filename.toLowerCase().endsWith('.html') && !filename.toLowerCase().endsWith('.htm')) {
    bot.sendMessage(chatId, '⚠️ Saat ini saya hanya menerima file .html atau .htm.');
    return;
  }

  try {
    bot.sendMessage(chatId, '⏳ Sedang memproses file kamu...');

    const fileLink = await bot.getFileLink(doc.file_id);
    const id = generateId();
    const siteDir = path.join(SITES_DIR, id);
    fs.mkdirSync(siteDir, { recursive: true });

    const destPath = path.join(siteDir, 'index.html');
    await downloadFile(fileLink, destPath);

    const db = loadDB();
    db[id] = {
      userId: msg.from.id,
      filename,
      createdAt: new Date().toISOString(),
    };
    saveDB(db);

    const url = `${BASE_URL}/site/${id}/`;
    bot.sendMessage(chatId,
      `✅ Website kamu sudah online!\n\n🔗 ${url}\n\nSimpan id ini kalau mau hapus nanti: \`${id}\``,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, '❌ Gagal memproses file. Coba lagi ya.');
  }
});

console.log('🤖 Bot Telegram siap menerima file .html...');
