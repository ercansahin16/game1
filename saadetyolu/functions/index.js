const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.deleteUser = functions.https.onCall(async (data, context) => {
    const uid = data.uid;
    
    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'Kullanıcı ID gerekli');
    }
    
    try {
        await admin.firestore().collection('users').doc(uid).delete();
        await admin.auth().deleteUser(uid);
        return { success: true, message: 'Kullanıcı başarıyla silindi!' };
    } catch (error) {
        console.error('Silme hatası:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
