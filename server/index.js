require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

const app = express();
app.set('trust proxy', 'loopback');
app.use(express.json({ limit: '10kb' }));

const HERYER_API_KEY = process.env.HERYER_API_KEY;
const HERYER_BASE_URL = process.env.HERYER_BASE_URL || 'https://www.saadetyolu.net';

// Basit deneme sınırlayıcı (şifre tahminine karşı)
const attempts = new Map();
function tooMany(key, max, windowMs) {
  const now = Date.now();
  const arr = (attempts.get(key) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) { attempts.set(key, arr); return true; }
  arr.push(now);
  attempts.set(key, arr);
  return false;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of attempts) {
    const f = v.filter(t => now - t < 600000);
    if (f.length) attempts.set(k, f); else attempts.delete(k);
  }
}, 600000).unref();

app.post('/api/sso-login', async (req, res) => {
  try {
    const email = String((req.body && req.body.email) || '').trim().toLowerCase();
    const password = String((req.body && req.body.password) || '');
    if (!email || !password || email.length > 200 || password.length > 200) {
      return res.status(400).json({ error: 'E-posta ve şifre gerekli' });
    }
    if (tooMany('ip:' + req.ip, 300, 600000) || tooMany('em:' + email, 8, 600000)) {
      return res.status(429).json({ error: 'Çok fazla deneme. Lütfen biraz bekleyin.' });
    }

    // Belgeye göre servis POST ile çağrılır (apiKey, userEmail, userPassword)
    const resp = await fetch(`${HERYER_BASE_URL}/get-auth-token-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: HERYER_API_KEY, userEmail: email, userPassword: password }),
      signal: AbortSignal.timeout(15000)
    });
    const text = (await resp.text()).trim();

    // Başarı: 200 ve geriye bir giriş linki döner. Başka her şey reddedilir (güvenli taraf).
    const basarili = resp.ok && !text.includes('<') && /loginWithToken\//.test(text);
    if (!basarili) {
      if (text.includes('Email veya şifre yanlış')) {
        return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
      }
      if (text.includes('Aktivasyon süreniz dolmuştur')) {
        return res.status(403).json({ error: 'saadetyolu.net hesabınızın kullanım süresi dolmuş' });
      }
      if (text.includes('Geçersiz kullanıcı') || text.includes('geçici olarak dondurulmuş')) {
        return res.status(403).json({ error: 'Bu hesapla giriş yapılamıyor' });
      }
      console.error('Heryer beklenmeyen cevap:', resp.status, text.slice(0, 120).replace(/\s+/g, ' '));
      if (text.includes('Yetkisiz işlem')) {
        return res.status(502).json({ error: 'Servis ayarı hatalı, yönetici ile iletişime geçin' });
      }
      return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    }

    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (e) {
      if (e.code !== 'auth/user-not-found') throw e;
      userRecord = await admin.auth().createUser({ email, emailVerified: true });
    }
    if (userRecord.disabled) {
      return res.status(403).json({ error: 'Bu hesap devre dışı bırakılmış' });
    }

    // Uygulama Firestore'da kullanıcı belgesi yoksa oturumu kapattığı için burada oluşturuyoruz
    // Okuma yapmadan tek yazma: belge varsa 'zaten var' hatası alınır ve geçilir.
    // Firestore kotası dolsa bile giriş engellenmesin diye hata olursa sadece loglanır.
    try {
      await db.collection('users').doc(userRecord.uid).create({
        name: email.split('@')[0],
        email: email,
        totalWordsViewed: 0,
        examsCompleted: [],
        averageScore: 0,
        quizSandik: [],
        quizScore: 0,
        mevcutSeviye: 1,
        myWords: [],
        tourCompleted: false,
        createdAt: new Date().toISOString(),
        provider: 'saadetyolu'
      });
    } catch (e) {
      if (e.code !== 6) console.error('Kullanıcı belgesi oluşturulamadı (giriş devam ediyor):', e && e.message);
    }

    const token = await admin.auth().createCustomToken(userRecord.uid);
    return res.json({ token });
  } catch (err) {
    console.error('SSO login hatası:', err && err.message);
    return res.status(500).json({ error: 'Sunucu hatası, lütfen tekrar deneyin' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => console.log(`Bridge servisi ${PORT} portunda çalışıyor`));
