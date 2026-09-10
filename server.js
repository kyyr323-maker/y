require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Konfigurasi Environment & Nexa API
const NEXA_API_URL = process.env.NEXA_API_URL || 'https://api.nexadev.my.id/api/rch';
const NEXA_API_KEY = process.env.NEXA_API_KEY || 'iya';
const WHATSAPP_ADMIN = process.env.WHATSAPP_ADMIN || '6288275775946';

// Parse VIP DB
const parseVipDb = () => {
  const dbRaw = process.env.VIP_DATABASE || '';
  const map = {};
  dbRaw.split(',').forEach(item => {
    const [key, tier] = item.split(':');
    if (key && tier) map[key.trim()] = tier.trim();
  });
  return map;
};

const tierLimits = {
  basic: { limit: 30, name: "VIP Basic (30 Limit)" },
  standard: { limit: 60, name: "VIP Standard (60 Limit)" },
  premium: { limit: 100, name: "VIP Premium (100 Limit)" }
};

// Database Sementara untuk History & Leaderboard
let reactionHistory = [
  { id: 1, user: "Free User", link: "whatsapp.com/channel/kyyznews", emoji: "🔥", time: "Baru saja" },
  { id: 2, user: "VIP Member", link: "whatsapp.com/channel/gaming", emoji: "🚀", time: "5 menit lalu" }
];

let leaderboardData = [
  { rank: 1, channel: "KYYZ OFFICIAL CHANNEL", total: 1420, topEmoji: "🔥" },
  { rank: 2, channel: "ROBLOX INDO GANG", total: 980, topEmoji: "❤️" },
  { rank: 3, channel: "ANIME LOVERS ID", total: 640, topEmoji: "⭐" }
];

// API: Validasi VIP Key
app.post('/api/validate-vip', (req, res) => {
  const { apiKey } = req.body;
  const vipDb = parseVipDb();

  if (!apiKey || !vipDb[apiKey.trim()]) {
    return res.status(401).json({ success: false, message: "Akses Ditolak! VIP Key salah atau tidak terdaftar." });
  }

  const tier = vipDb[apiKey.trim()];
  const tierInfo = tierLimits[tier] || { limit: 30, name: "VIP Custom" };

  res.json({
    success: true,
    tier: tier,
    tierName: tierInfo.name,
    maxLimit: tierInfo.limit,
    message: `Autentikasi Berhasil! Selamat datang di ${tierInfo.name}`
  });
});

// API: Ambil Data Dashboard (Leaderboard & History)
app.get('/api/dashboard-data', (req, res) => {
  res.json({
    adminWa: WHATSAPP_ADMIN,
    history: reactionHistory,
    leaderboard: leaderboardData
  });
});

// API: Kirim Reaksi (Menggunakan Nexa API)
app.post('/api/send-reaction', async (req, res) => {
  const { link, emoji, userType } = req.body;
  if (!link || !emoji) {
    return res.status(400).json({ success: false, message: "Link saluran dan emoji wajib diisi!" });
  }

  try {
    // Membentuk URL target sesuai format Nexa API
    const targetUrl = `${NEXA_API_URL}?key=${NEXA_API_KEY}&url=${encodeURIComponent(link)}&reaction=${encodeURIComponent(emoji)}`;
    
    // Melakukan request HTTP ke Nexa API
    const response = await fetch(targetUrl);
    const result = await response.json().catch(() => ({}));

    // Simpan riwayat reaksi ke database lokal sementara
    reactionHistory.unshift({
      id: Date.now(),
      user: userType || "Free User",
      link: link,
      emoji: emoji,
      time: "Baru saja"
    });

    if (reactionHistory.length > 10) reactionHistory.pop();

    res.json({
      success: true,
      message: `Berhasil mengirim reaksi [${emoji}] via Nexa API!`,
      nexaResponse: result,
      history: reactionHistory
    });

  } catch (err) {
    console.error("Gagal menghubungi Nexa API:", err.message);
    res.status(500).json({ success: false, message: "Gagal terhubung ke server Nexa API!" });
  }
});

app.listen(PORT, () => {
  console.log(`[KYYZ NEO-BRUTALISM SERVER] Berjalan di http://localhost:${PORT}`);
});
