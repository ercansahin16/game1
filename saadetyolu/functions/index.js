const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// ===== KULLANICI SİLME FONKSİYONU (CORS DESTEKLİ) =====
exports.deleteUser = functions.https.onCall(async (data, context) => {
    const uid = data.uid;
    
    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'Kullanıcı ID gerekli');
    }
    
    try {
        // Firestore'dan sil
        await admin.firestore().collection('users').doc(uid).delete();
        
        // Authentication'dan sil
        await admin.auth().deleteUser(uid);
        
        return { success: true, message: 'Kullanıcı başarıyla silindi!' };
    } catch (error) {
        console.error('Silme hatası:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// ===== VEYA HTTPS ile (CORS manuel) =====
exports.deleteUserHttp = functions.https.onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    
    try {
        const { uid } = req.body;
        
        if (!uid) {
            res.status(400).json({ error: 'Kullanıcı ID gerekli' });
            return;
        }
        
        await admin.firestore().collection('users').doc(uid).delete();
        await admin.auth().deleteUser(uid);
        
        res.status(200).json({ success: true, message: 'Kullanıcı silindi!' });
    } catch (error) {
        console.error('Silme hatası:', error);
        res.status(500).json({ error: error.message });
    }
});
