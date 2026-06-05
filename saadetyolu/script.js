import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    deleteDoc,
    arrayUnion, 
    arrayRemove,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updatePassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Firebase yapılandırması
const firebaseConfig = {
    apiKey: "AIzaSyCloL8IN0NpHQBxFjaRH_62vOEWjLQjr4o",
    authDomain: "duapro-a7d7e.firebaseapp.com",
    projectId: "duapro-a7d7e",
    storageBucket: "duapro-a7d7e.appspot.com",
    messagingSenderId: "450775848659",
    appId: "1:450775848659:web:ca192a401da3f887e1e626"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Global değişkenler
let currentUser = null;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM yüklendi");
    
    // Elementleri al
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const forgotBtn = document.getElementById('forgotBtn');
    const logoutBtn = document.querySelector('.menu-item[onclick="window.logout()"]');
    
    // Tab butonları
    const tabBtns = document.querySelectorAll('.tab-btn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotForm = document.getElementById('forgotForm');
    
    // Tab geçişleri
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            loginForm.classList.add('hidden');
            registerForm.classList.add('hidden');
            forgotForm.classList.add('hidden');
            
            if (tab === 'login') loginForm.classList.remove('hidden');
            if (tab === 'register') registerForm.classList.remove('hidden');
            if (tab === 'forgot') forgotForm.classList.remove('hidden');
        });
    });
    
    // Giriş butonu
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            handleLogin(email, password);
        });
    }
    
    // Kayıt butonu
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            handleRegister(name, email, password);
        });
    }
    
    // Şifre sıfırlama butonu
    if (forgotBtn) {
        forgotBtn.addEventListener('click', () => {
            const email = document.getElementById('forgotEmail').value;
            handleForgotPassword(email);
        });
    }
    
    // Auth durumunu kontrol et
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('learningSection').style.display = 'block';
            document.getElementById('menuBtn').classList.remove('hidden');
            document.getElementById('userBadge').classList.remove('hidden');
            document.getElementById('menuUserName').innerText = user.email.split('@')[0];
            document.getElementById('userNameDisplay').innerText = user.email.split('@')[0];
        } else {
            currentUser = null;
            document.getElementById('loginSection').style.display = 'flex';
            document.getElementById('learningSection').style.display = 'none';
            document.getElementById('menuBtn').classList.add('hidden');
            document.getElementById('userBadge').classList.add('hidden');
        }
    });
});

async function handleLogin(email, password) {
    if (!email || !password) {
        showNotification('Lütfen e-posta ve şifre girin!');
        return;
    }
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showNotification('✅ Giriş başarılı!');
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
    } catch (error) {
        console.error(error);
        showNotification('Hata: ' + error.message);
    }
}

async function handleRegister(name, email, password) {
    if (!name || !email || !password) {
        showNotification('Lütfen tüm alanları doldurun!');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Şifre en az 6 karakter olmalı!');
        return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await setDoc(doc(db, 'users', user.uid), {
            name: name,
            email: email,
            selectedLessons: [],
            createdAt: new Date().toISOString()
        });
        
        showFlowerNotification(`🌸 Hoş geldiniz ${name}! Allah'ı tanımaya geldiniz. 🌸`);
        
        document.getElementById('registerName').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        
        // Login tab'ına geç
        document.querySelector('.tab-btn[data-tab="login"]').click();
        
    } catch (error) {
        console.error(error);
        if (error.code === 'auth/email-already-in-use') {
            showNotification('Bu e-posta zaten kullanılıyor!');
        } else {
            showNotification('Hata: ' + error.message);
        }
    }
}

async function handleForgotPassword(email) {
    if (!email) {
        showNotification('Lütfen e-posta adresinizi girin!');
        return;
    }
    
    try {
        await sendPasswordResetEmail(auth, email);
        showNotification('✅ Şifre sıfırlama bağlantısı e-posta adresinize gönderildi!');
        document.getElementById('forgotEmail').value = '';
    } catch (error) {
        console.error(error);
        showNotification('Hata: ' + error.message);
    }
}

async function handleUpdatePassword() {
    const newPassword = document.getElementById('profileNewPassword').value;
    
    if (!newPassword || newPassword.length < 6) {
        showNotification('Şifre en az 6 karakter olmalı!');
        return;
    }
    
    try {
        await updatePassword(auth.currentUser, newPassword);
        showNotification('✅ Şifre güncellendi!');
        document.getElementById('profileNewPassword').value = '';
    } catch (error) {
        showNotification('Hata: ' + error.message);
    }
}

async function logout() {
    try {
        await signOut(auth);
        showNotification('🌸 Çıkış yapıldı. Yine bekleriz! 🌸');
        if (document.getElementById('sideMenu').classList.contains('open')) {
            document.getElementById('sideMenu').classList.remove('open');
            document.getElementById('menuOverlay').classList.remove('active');
        }
    } catch (error) {
        console.error(error);
    }
}

function showNotification(msg) {
    const notif = document.getElementById('notification');
    const notifMsg = document.getElementById('notificationMsg');
    notifMsg.innerText = msg;
    notif.classList.remove('hidden');
    setTimeout(() => notif.classList.add('hidden'), 3000);
}

function showFlowerNotification(msg) {
    const notif = document.getElementById('notification');
    const notifMsg = document.getElementById('notificationMsg');
    notifMsg.innerText = msg;
    notif.classList.remove('hidden');
    setTimeout(() => notif.classList.add('hidden'), 4000);
}

function goToHome() {
    document.getElementById('lessonSelectArea').classList.remove('hidden');
    document.getElementById('wordLearningArea').classList.add('hidden');
    document.getElementById('profileSection').classList.add('hidden');
}

function goToLessons() {
    document.getElementById('lessonSelectArea').classList.remove('hidden');
    document.getElementById('wordLearningArea').classList.add('hidden');
    document.getElementById('profileSection').classList.add('hidden');
}

function showProfile() {
    document.getElementById('profileEmail').value = currentUser?.email || '';
    document.getElementById('lessonSelectArea').classList.add('hidden');
    document.getElementById('wordLearningArea').classList.add('hidden');
    document.getElementById('profileSection').classList.remove('hidden');
}

function showWarning() {
    showNotification('⚠️ DİKKAT! Eğer profilin size ait olmadığını düşünüyorsanız lütfen çıkış yapın. Saygılar. 🌸');
}

function toggleTheme() {
    const body = document.body;
    if (body.classList.contains('dark-mode')) {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    }
}

function toggleMenu() {
    document.getElementById('sideMenu').classList.toggle('open');
    document.getElementById('menuOverlay').classList.toggle('active');
}

// Menü butonu
document.getElementById('menuBtn')?.addEventListener('click', toggleMenu);
document.getElementById('menuOverlay')?.addEventListener('click', toggleMenu);

// Tema yükle
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
}

// DOĞRUDAN ÇALIŞAN FONKSİYONLAR
window.handleLoginDirect = async () => {
    console.log("Login butonuna tıklandı (direct)");
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        alert('Lütfen e-posta ve şifre girin!');
        return;
    }
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        alert('✅ Giriş başarılı!');
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        // Sayfayı yenilemeden giriş sonrasını göster
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('learningSection').style.display = 'block';
        document.getElementById('menuBtn').classList.remove('hidden');
        document.getElementById('userBadge').classList.remove('hidden');
        document.getElementById('menuUserName').innerText = email.split('@')[0];
        document.getElementById('userNameDisplay').innerText = email.split('@')[0];
    } catch (error) {
        console.error(error);
        alert('Hata: ' + error.message);
    }
};

window.handleRegisterDirect = async () => {
    console.log("Kayıt butonuna tıklandı (direct)");
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    if (!name || !email || !password) {
        alert('Lütfen tüm alanları doldurun!');
        return;
    }
    
    if (password.length < 6) {
        alert('Şifre en az 6 karakter olmalı!');
        return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await setDoc(doc(db, 'users', user.uid), {
            name: name,
            email: email,
            selectedLessons: [],
            createdAt: new Date().toISOString()
        });
        
        alert(`🌸 Hoş geldiniz ${name}! Allah'ı tanımaya geldiniz. 🌸`);
        
        document.getElementById('registerName').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        
        // Login tab'ına geç
        document.querySelector('.tab-btn[data-tab="login"]').click();
        
    } catch (error) {
        console.error(error);
        if (error.code === 'auth/email-already-in-use') {
            alert('Bu e-posta zaten kullanılıyor!');
        } else {
            alert('Hata: ' + error.message);
        }
    }
};

window.handleForgotDirect = async () => {
    console.log("Şifre sıfırlama butonuna tıklandı (direct)");
    const email = document.getElementById('forgotEmail').value;
    
    if (!email) {
        alert('Lütfen e-posta adresinizi girin!');
        return;
    }
    
    try {
        await sendPasswordResetEmail(auth, email);
        alert('✅ Şifre sıfırlama bağlantısı e-posta adresinize gönderildi!');
        document.getElementById('forgotEmail').value = '';
    } catch (error) {
        console.error(error);
        alert('Hata: ' + error.message);
    }
};



// Global fonksiyonlar
window.goToHome = goToHome;
window.goToLessons = goToLessons;
window.showProfile = showProfile;
window.showWarning = showWarning;
window.toggleTheme = toggleTheme;
window.logout = logout;
