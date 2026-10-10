// Toplu oyuncu ID atama: publicId'si olmayan tüm kullanıcılara benzersiz 8 haneli ID verir.
// Kullanım (sunucuda, ~/saadetyolu-bridge klasöründe):
//   node assign-ids.js           -> deneme (hiçbir şey yazmaz, sadece sayar)
//   node assign-ids.js --apply   -> gerçekten yazar
require('dotenv').config();
const crypto = require('crypto');
const admin = require('firebase-admin');

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();
const APPLY = process.argv.includes('--apply');

(async () => {
  const snap = await db.collection('users').select('publicId').get();
  const used = new Set();
  const missing = [];
  snap.forEach(d => {
    const id = d.get('publicId');
    if (id) used.add(String(id)); else missing.push(d.ref);
  });
  console.log(`Toplam kullanıcı: ${snap.size} | ID'si olan: ${used.size} | ID verilecek: ${missing.length}`);
  if (!APPLY) { console.log('Deneme modu: hiçbir şey yazılmadı. Gerçekten yazmak için: node assign-ids.js --apply'); return; }

  let done = 0;
  for (let i = 0; i < missing.length; i += 400) {
    const batch = db.batch();
    for (const ref of missing.slice(i, i + 400)) {
      let id;
      do { id = String(crypto.randomInt(10000000, 100000000)); } while (used.has(id));
      used.add(id);
      batch.update(ref, { publicId: id });
    }
    await batch.commit();
    done += Math.min(400, missing.length - i);
    console.log(`Yazıldı: ${done}/${missing.length}`);
  }
  console.log('Bitti.');
})().catch(e => { console.error('HATA:', e.message); process.exit(1); });
