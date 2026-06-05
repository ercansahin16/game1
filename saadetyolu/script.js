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
window.currentUser = null;
window.currentLesson = null;
window.lessons = [];
window.currentLessonWords = [];
window.currentWordIndex = 0;
window.currentWordList = [];

// Ses
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;

// Admin panel değişkenleri
let adminAuthenticated = false;
let currentEditingLesson = null;

// ========== SAYFA YÜKLENME ==========

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM yüklendi");
    
    // Admin sayfası kontrolü
    if (window.location.pathname.includes('admin.html')) {
        console.log("Admin sayfası tespit edildi");
        initAdminPage();
        return;
    }
    
    initUserPage();
});

function initUserPage() {
    // Menü elemanları
    const menuBtn = document.getElementById('menuBtn');
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    
    // Menü butonu
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            sideMenu.classList.toggle('open');
            menuOverlay.classList.toggle('active');
        });
    }
    if (menuOverlay) {
        menuOverlay.addEventListener('click', () => {
            sideMenu.classList.remove('open');
            menuOverlay.classList.remove('active');
        });
    }
    
    // Tab butonları
    const tabBtns = document.querySelectorAll('.tab-btn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotForm = document.getElementById('forgotForm');
    
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
    
    // Auth butonları
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const forgotBtn = document.getElementById('forgotBtn');
    const profileUpdateBtn = document.getElementById('profileUpdateBtn');
    
    if (loginBtn) loginBtn.addEventListener('click', () => handleLogin());
    if (registerBtn) registerBtn.addEventListener('click', () => handleRegister());
    if (forgotBtn) forgotBtn.addEventListener('click', () => handleForgotPassword());
    if (profileUpdateBtn) profileUpdateBtn.addEventListener('click', () => handleUpdatePassword());
    
    // Öğrenme butonları
    const showMeaningBtn = document.getElementById('showMeaningBtn');
    const nextWordBtn = document.getElementById('nextWordBtn');
    const soundBtn = document.getElementById('soundBtn');
    const backToLessonsBtn = document.getElementById('backToLessonsBtn');
    
    if (showMeaningBtn) showMeaningBtn.addEventListener('click', showMeaning);
    if (nextWordBtn) nextWordBtn.addEventListener('click', nextWord);
    if (soundBtn) soundBtn.addEventListener('click', playSound);
    if (backToLessonsBtn) backToLessonsBtn.addEventListener('click', backToLessons);
    
    // Enter tuşu
    const loginPassword = document.getElementById('loginPassword');
    const registerPassword = document.getElementById('registerPassword');
    const forgotEmail = document.getElementById('forgotEmail');
    
    if (loginPassword) loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    if (registerPassword) registerPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRegister();
    });
    if (forgotEmail) forgotEmail.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleForgotPassword();
    });
    
    // Tema yükle
    loadTheme();
    
    // Auth durumunu izle
    auth.onAuthStateChanged(async (user) => {
        console.log("Auth durumu değişti:", user ? "Giriş yapıldı" : "Çıkış yapıldı");
        
        const loginSection = document.getElementById('loginSection');
        const learningSection = document.getElementById('learningSection');
        const menuBtnEl = document.getElementById('menuBtn');
        const userBadge = document.getElementById('userBadge');
        const menuUserName = document.getElementById('menuUserName');
        const userNameDisplay = document.getElementById('userNameDisplay');
        
        if (user) {
            window.currentUser = user;
            if (loginSection) loginSection.style.display = 'none';
            if (learningSection) learningSection.style.display = 'block';
            if (menuBtnEl) menuBtnEl.classList.remove('hidden');
            if (userBadge) userBadge.classList.remove('hidden');
            if (menuUserName) menuUserName.innerText = user.email.split('@')[0];
            if (userNameDisplay) userNameDisplay.innerText = user.email.split('@')[0];
            
            // Dersleri yükle
            await loadLessons();
            await loadUserLessons();
        } else {
            window.currentUser = null;
            if (loginSection) loginSection.style.display = 'flex';
            if (learningSection) learningSection.style.display = 'none';
            if (menuBtnEl) menuBtnEl.classList.add('hidden');
            if (userBadge) userBadge.classList.add('hidden');
        }
    });
}

// ========== MENÜ FONKSİYONLARI ==========

window.goToHome = function() {
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    document.getElementById('lessonSelectArea').classList.remove('hidden');
    document.getElementById('wordLearningArea').classList.add('hidden');
    document.getElementById('profileSection').classList.add('hidden');
    if (sideMenu) sideMenu.classList.remove('open');
    if (menuOverlay) menuOverlay.classList.remove('active');
};

window.goToLessons = function() {
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    document.getElementById('lessonSelectArea').classList.remove('hidden');
    document.getElementById('wordLearningArea').classList.add('hidden');
    document.getElementById('profileSection').classList.add('hidden');
    if (sideMenu) sideMenu.classList.remove('open');
    if (menuOverlay) menuOverlay.classList.remove('active');
    // Ders listesini yenile
    if (window.currentUser) {
        loadUserLessons();
    }
};

window.showProfile = function() {
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    const profileEmail = document.getElementById('profileEmail');
    if (profileEmail && window.currentUser) profileEmail.value = window.currentUser.email;
    document.getElementById('lessonSelectArea').classList.add('hidden');
    document.getElementById('wordLearningArea').classList.add('hidden');
    document.getElementById('profileSection').classList.remove('hidden');
    if (sideMenu) sideMenu.classList.remove('open');
    if (menuOverlay) menuOverlay.classList.remove('active');
};

window.showWarning = function() {
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    showNotification('⚠️ DİKKAT! Eğer profilin size ait olmadığını düşünüyorsanız lütfen çıkış yapın. Saygılar. 🌸');
    if (sideMenu) sideMenu.classList.remove('open');
    if (menuOverlay) menuOverlay.classList.remove('active');
};

window.toggleTheme = function() {
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');
    
    if (body.classList.contains('dark-mode')) {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
        if (themeIcon) themeIcon.className = 'fas fa-sun';
    } else {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        if (themeIcon) themeIcon.className = 'fas fa-moon';
    }
    if (sideMenu) sideMenu.classList.remove('open');
    if (menuOverlay) menuOverlay.classList.remove('active');
};

window.logout = async function() {
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    try {
        await signOut(auth);
        window.currentUser = null;
        window.currentLesson = null;
        window.currentLessonWords = [];
        window.lessons = [];
        
        const loginSection = document.getElementById('loginSection');
        const learningSection = document.getElementById('learningSection');
        const menuBtn = document.getElementById('menuBtn');
        const userBadge = document.getElementById('userBadge');
        
        if (loginSection) loginSection.style.display = 'flex';
        if (learningSection) learningSection.style.display = 'none';
        if (menuBtn) menuBtn.classList.add('hidden');
        if (userBadge) userBadge.classList.add('hidden');
        
        if (sideMenu) sideMenu.classList.remove('open');
        if (menuOverlay) menuOverlay.classList.remove('active');
        
        showNotification('🌸 Çıkış yapıldı. Yine bekleriz! 🌸');
    } catch (error) {
        console.error(error);
    }
};

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeIcon = document.getElementById('themeIcon');
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        if (themeIcon) themeIcon.className = 'fas fa-sun';
    } else {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
        if (themeIcon) themeIcon.className = 'fas fa-moon';
    }
}

// ========== AUTH FONKSİYONLARI ==========

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
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
        if (error.code === 'auth/user-not-found') {
            showNotification('Bu e-posta ile kayıtlı kullanıcı bulunamadı!');
        } else if (error.code === 'auth/wrong-password') {
            showNotification('Hatalı şifre!');
        } else {
            showNotification('Hata: ' + error.message);
        }
    }
}

async function handleRegister() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    
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
        const loginTab = document.querySelector('.tab-btn[data-tab="login"]');
        if (loginTab) loginTab.click();
        
    } catch (error) {
        console.error(error);
        if (error.code === 'auth/email-already-in-use') {
            showNotification('Bu e-posta zaten kullanılıyor!');
        } else {
            showNotification('Hata: ' + error.message);
        }
    }
}

async function handleForgotPassword() {
    const email = document.getElementById('forgotEmail').value.trim();
    
    if (!email) {
        showNotification('Lütfen e-posta adresinizi girin!');
        return;
    }
    
    try {
        await sendPasswordResetEmail(auth, email);
        showNotification('✅ Şifre sıfırlama bağlantısı e-posta adresinize gönderildi!');
        document.getElementById('forgotEmail').value = '';
        const forgotResult = document.getElementById('forgotResult');
        if (forgotResult) {
            forgotResult.innerHTML = '<div style="background:#10b981; padding:12px; border-radius:12px; margin-top:10px; color:white;">✅ Şifre sıfırlama bağlantısı gönderildi!</div>';
            setTimeout(() => { forgotResult.innerHTML = ''; }, 5000);
        }
    } catch (error) {
        console.error(error);
        if (error.code === 'auth/user-not-found') {
            showNotification('Bu e-posta ile kayıtlı kullanıcı bulunamadı!');
        } else {
            showNotification('Hata: ' + error.message);
        }
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

// ========== BİLDİRİM FONKSİYONLARI ==========

function showNotification(msg) {
    const notif = document.getElementById('notification');
    const notifMsg = document.getElementById('notificationMsg');
    if (notif && notifMsg) {
        notifMsg.innerText = msg;
        notif.classList.remove('hidden');
        setTimeout(() => notif.classList.add('hidden'), 3000);
    } else {
        alert(msg);
    }
}

function showFlowerNotification(msg) {
    const notif = document.getElementById('notification');
    const notifMsg = document.getElementById('notificationMsg');
    if (notif && notifMsg) {
        notifMsg.innerText = msg;
        notif.classList.remove('hidden');
        setTimeout(() => notif.classList.add('hidden'), 4000);
    } else {
        alert(msg);
    }
}

// ========== DERS VE KELİME FONKSİYONLARI ==========

async function loadLessons() {
    console.log("Dersler yükleniyor...");
    try {
        const lessonsRef = collection(db, 'lessons');
        const q = query(lessonsRef, orderBy('order', 'asc'));
        const snapshot = await getDocs(q);
        
        console.log("Ders snapshot boyutu:", snapshot.size);
        
        if (snapshot.empty) {
            console.log("Ders bulunamadı, demo dersler oluşturuluyor...");
            await createDemoLessons();
            return loadLessons();
        }
        
        window.lessons = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log("Dersler yüklendi:", window.lessons.length);
        
        // Dersleri göster (eğer kullanıcı giriş yaptıysa)
        if (window.currentUser) {
            await loadUserLessons();
        }
    } catch (error) {
        console.error("Dersler yüklenirken hata:", error);
    }
}

async function createDemoLessons() {
    const lessonsRef = collection(db, 'lessons');
    const existingLessons = await getDocs(lessonsRef);
    if (!existingLessons.empty) return;
    
    const demoLessons = [
        { name: "Ders 1", description: "Temel Kelimeler", order: 1 },
        { name: "Ders 2", description: "Günlük Hayat", order: 2 },
        { name: "Ders 3", description: "İbadet Kelimeleri", order: 3 }
    ];
    
    const demoWords = {
        "Ders 1": [
            { arabic: "خلق", turkish: "yaratılış" },
            { arabic: "رحمن", turkish: "rahman, çok merhametli" },
            { arabic: "كريم", turkish: "cömert, kerim" },
            { arabic: "صبر", turkish: "sabır" }
        ],
        "Ders 2": [
            { arabic: "شكر", turkish: "şükür" },
            { arabic: "توكل", turkish: "tevekkül" },
            { arabic: "إخلاص", turkish: "ihlas, samimiyet" }
        ],
        "Ders 3": [
            { arabic: "هدى", turkish: "hidayet, doğru yol" },
            { arabic: "تقوى", turkish: "takva, Allah korkusu" },
            { arabic: "بركة", turkish: "bereket" }
        ]
    };
    
    for (const lesson of demoLessons) {
        const lessonRef = doc(collection(db, 'lessons'));
        await setDoc(lessonRef, lesson);
        
        const words = demoWords[lesson.name] || [];
        for (const word of words) {
            const wordRef = doc(collection(db, 'words'));
            await setDoc(wordRef, { ...word, lessonId: lessonRef.id });
        }
    }
    
    console.log("Demo dersler oluşturuldu");
}

async function loadUserLessons() {
    if (!window.currentUser) {
        console.log("Kullanıcı yok");
        return;
    }
    
    console.log("Kullanıcı dersleri yükleniyor...");
    
    try {
        const userDoc = await getDoc(doc(db, 'users', window.currentUser.uid));
        let selectedLessonIds = [];
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            selectedLessonIds = userData.selectedLessons || [];
        }
        
        console.log("Seçili dersler:", selectedLessonIds);
        displayLessons(selectedLessonIds);
        
        const totalWordCountEl = document.getElementById('totalWordCount');
        if (totalWordCountEl) totalWordCountEl.innerText = selectedLessonIds.length;
        
    } catch (error) {
        console.error("Kullanıcı dersleri yüklenirken hata:", error);
    }
}

function displayLessons(selectedLessonIds) {
    const lessonsGrid = document.getElementById('lessonsGrid');
    if (!lessonsGrid) {
        console.log("lessonsGrid bulunamadı");
        return;
    }
    
    console.log("Dersler gösteriliyor:", window.lessons.length);
    lessonsGrid.innerHTML = '';
    
    if (!window.lessons || window.lessons.length === 0) {
        lessonsGrid.innerHTML = '<div style="text-align:center; padding:40px;">Henüz ders eklenmemiş.</div>';
        return;
    }
    
    for (const lesson of window.lessons) {
        const isSelected = selectedLessonIds.includes(lesson.id);
        const lessonCard = document.createElement('div');
        lessonCard.className = 'lesson-card';
        lessonCard.innerHTML = `
            <i class="fas ${isSelected ? 'fa-check-circle' : 'fa-book'}"></i>
            <h4>${lesson.name}</h4>
            <p>${lesson.description || ''}</p>
        `;
        lessonCard.onclick = () => selectLesson(lesson.id, isSelected);
        lessonsGrid.appendChild(lessonCard);
    }
}

async function selectLesson(lessonId, isSelected) {
    if (!window.currentUser) return;
    
    if (!isSelected) {
        await updateDoc(doc(db, 'users', window.currentUser.uid), {
            selectedLessons: arrayUnion(lessonId)
        });
        showNotification(`📚 ${window.lessons.find(l => l.id === lessonId)?.name} seçildi!`);
    }
    
    await loadLessonWords(lessonId);
    window.currentLesson = lessonId;
    document.getElementById('lessonSelectArea').classList.add('hidden');
    document.getElementById('wordLearningArea').classList.remove('hidden');
    startLearningLesson();
}

async function loadLessonWords(lessonId) {
    const wordsRef = collection(db, 'words');
    const q = query(wordsRef, where('lessonId', '==', lessonId));
    const snapshot = await getDocs(q);
    
    window.currentLessonWords = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    const lessonWordCountEl = document.getElementById('lessonWordCount');
    if (lessonWordCountEl) lessonWordCountEl.innerText = window.currentLessonWords.length;
}

function startLearningLesson() {
    if (window.currentLessonWords.length === 0) {
        const arabicWordEl = document.getElementById('arabicWord');
        if (arabicWordEl) arabicWordEl.innerText = "Bu derste henüz kelime yok";
        return;
    }
    
    window.currentWordList = [...window.currentLessonWords];
    for (let i = window.currentWordList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [window.currentWordList[i], window.currentWordList[j]] = [window.currentWordList[j], window.currentWordList[i]];
    }
    window.currentWordIndex = 0;
    displayCurrentWord();
}

function displayCurrentWord() {
    const arabicWordEl = document.getElementById('arabicWord');
    const turkishWordEl = document.getElementById('turkishWord');
    
    if (!arabicWordEl || !turkishWordEl) return;
    
    if (window.currentLessonWords.length === 0) {
        arabicWordEl.innerText = "Bu derste kelime yok";
        turkishWordEl.classList.add('hidden');
        return;
    }
    
    const word = window.currentWordList[window.currentWordIndex];
    arabicWordEl.innerText = word.arabic;
    turkishWordEl.innerText = word.turkish;
    turkishWordEl.classList.add('hidden');
    updateProgress();
}

function showMeaning() {
    const turkishWordEl = document.getElementById('turkishWord');
    if (turkishWordEl) turkishWordEl.classList.remove('hidden');
}

function nextWord() {
    if (window.currentLessonWords.length === 0) return;
    window.currentWordIndex = (window.currentWordIndex + 1) % window.currentWordList.length;
    displayCurrentWord();
}

function playSound() {
    if (!window.currentWordList || !window.currentWordList[window.currentWordIndex]) return;
    if (currentUtterance) speechSynthesis.cancel();
    
    const word = window.currentWordList[window.currentWordIndex];
    const utterance = new SpeechSynthesisUtterance(word.arabic);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.8;
    currentUtterance = utterance;
    speechSynthesis.speak(utterance);
}

function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    if (!progressFill || !progressPercent) return;
    
    const total = window.currentWordList.length;
    const percent = Math.round(((window.currentWordIndex + 1) / total) * 100);
    progressFill.style.width = `${percent}%`;
    progressPercent.innerText = `${percent}%`;
}

function backToLessons() {
    document.getElementById('lessonSelectArea').classList.remove('hidden');
    document.getElementById('wordLearningArea').classList.add('hidden');
    window.currentLesson = null;
    window.currentLessonWords = [];
}

// ========== ADMIN PANEL FONKSİYONLARI (Kısa) ==========

async function initAdminPage() {
    console.log("Admin sayfası başlatılıyor...");
    
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const adminPassword = document.getElementById('adminPassword');
    
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', () => authenticateAdmin(adminPassword.value));
    }
    if (adminPassword) {
        adminPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') authenticateAdmin(adminPassword.value);
        });
    }
    
    const addLessonBtn = document.getElementById('addLessonBtn');
    if (addLessonBtn) addLessonBtn.addEventListener('click', () => openAddLessonModal());
    
    const addWordBtn = document.getElementById('addWordBtn');
    if (addWordBtn) addWordBtn.addEventListener('click', () => openAddWordModal());
    
    const saveLessonBtn = document.getElementById('saveLessonBtn');
    if (saveLessonBtn) saveLessonBtn.addEventListener('click', () => saveLesson());
    
    const saveWordBtn = document.getElementById('saveWordBtn');
    if (saveWordBtn) saveWordBtn.addEventListener('click', () => saveWord());
    
    const storedAuth = sessionStorage.getItem('admin_auth');
    if (storedAuth === 'true') {
        adminAuthenticated = true;
        showAdminPanel();
        await loadAllLessonsForAdmin();
    }
}

function authenticateAdmin(password) {
    if (password === "admin123") {
        adminAuthenticated = true;
        sessionStorage.setItem('admin_auth', 'true');
        showAdminPanel();
        loadAllLessonsForAdmin();
        showNotification('✅ Admin girişi başarılı!');
    } else {
        showNotification('❌ Hatalı şifre!');
    }
}

function showAdminPanel() {
    const adminLoginSection = document.getElementById('adminLoginSection');
    const adminPanel = document.getElementById('adminPanel');
    if (adminLoginSection) adminLoginSection.classList.add('hidden');
    if (adminPanel) adminPanel.classList.remove('hidden');
}

async function loadAllLessonsForAdmin() {
    const lessonsRef = collection(db, 'lessons');
    const q = query(lessonsRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    const lessonsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    displayLessonsForAdmin(lessonsList);
}

function displayLessonsForAdmin(lessonsList) {
    const container = document.getElementById('lessonsAdminList');
    if (!container) return;
    container.innerHTML = '';
    
    for (const lesson of lessonsList) {
        const lessonDiv = document.createElement('div');
        lessonDiv.className = 'lesson-admin-item';
        lessonDiv.innerHTML = `
            <div class="lesson-info">
                <h4>${lesson.name}</h4>
                <p>${lesson.description || 'Açıklama yok'} | Sıra: ${lesson.order || 0}</p>
            </div>
            <div class="lesson-actions">
                <button class="btn-warning" onclick="window.editLesson('${lesson.id}')">Düzenle</button>
                <button class="btn-danger" onclick="window.deleteLesson('${lesson.id}')">Sil</button>
                <button class="btn-success" onclick="window.selectLessonForWords('${lesson.id}', '${lesson.name}')">Kelimeler</button>
            </div>
        `;
        container.appendChild(lessonDiv);
    }
}

async function selectLessonForWords(lessonId, lessonName) {
    currentEditingLesson = lessonId;
    document.getElementById('currentLessonName').innerText = lessonName;
    document.getElementById('wordsSection').style.display = 'block';
    
    const wordsRef = collection(db, 'words');
    const q = query(wordsRef, where('lessonId', '==', lessonId));
    const snapshot = await getDocs(q);
    const words = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    displayWordsForAdmin(words);
}

function displayWordsForAdmin(words) {
    const container = document.getElementById('wordsAdminList');
    if (!container) return;
    container.innerHTML = '';
    
    for (const word of words) {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'word-admin-item';
        wordDiv.innerHTML = `
            <div class="word-info">
                <div class="word-arabic">${word.arabic}</div>
                <div class="word-turkish">${word.turkish}</div>
            </div>
            <div class="word-actions">
                <button class="btn-warning" onclick="window.editWord('${word.id}')">Düzenle</button>
                <button class="btn-danger" onclick="window.deleteWord('${word.id}')">Sil</button>
            </div>
        `;
        container.appendChild(wordDiv);
    }
}

function openAddLessonModal() {
    document.getElementById('lessonModal').classList.remove('hidden');
    document.getElementById('editLessonId').value = '';
    document.getElementById('lessonName').value = '';
    document.getElementById('lessonDesc').value = '';
}

function openAddWordModal() {
    if (!currentEditingLesson) {
        showNotification('Lütfen önce bir ders seçin!');
        return;
    }
    document.getElementById('wordModal').classList.remove('hidden');
    document.getElementById('editWordId').value = '';
    document.getElementById('wordArabic').value = '';
    document.getElementById('wordTurkish').value = '';
}

function closeWordModal() { document.getElementById('wordModal').classList.add('hidden'); }
function closeLessonModal() { document.getElementById('lessonModal').classList.add('hidden'); }

async function saveLesson() {
    const lessonId = document.getElementById('editLessonId').value;
    const name = document.getElementById('lessonName').value.trim();
    const description = document.getElementById('lessonDesc').value.trim();
    
    if (!name) { showNotification('Ders adı gerekli!'); return; }
    
    try {
        if (lessonId) {
            await updateDoc(doc(db, 'lessons', lessonId), { name, description });
            showNotification('Ders güncellendi!');
        } else {
            const newLessonRef = doc(collection(db, 'lessons'));
            const snapshot = await getDocs(collection(db, 'lessons'));
            const order = snapshot.size + 1;
            await setDoc(newLessonRef, { name, description, order });
            showNotification('Yeni ders eklendi!');
        }
        closeLessonModal();
        await loadAllLessonsForAdmin();
    } catch (error) {
        showNotification('Hata: ' + error.message);
    }
}

async function saveWord() {
    const wordId = document.getElementById('editWordId').value;
    const arabic = document.getElementById('wordArabic').value.trim();
    const turkish = document.getElementById('wordTurkish').value.trim();
    
    if (!arabic || !turkish) { showNotification('Her iki alan da gerekli!'); return; }
    if (!currentEditingLesson) { showNotification('Lütfen önce bir ders seçin!'); return; }
    
    try {
        if (wordId) {
            await updateDoc(doc(db, 'words', wordId), { arabic, turkish });
            showNotification('Kelime güncellendi!');
        } else {
            const newWordRef = doc(collection(db, 'words'));
            await setDoc(newWordRef, { arabic, turkish, lessonId: currentEditingLesson });
            showNotification('Yeni kelime eklendi!');
        }
        closeWordModal();
        await selectLessonForWords(currentEditingLesson, document.getElementById('currentLessonName').innerText);
    } catch (error) {
        showNotification('Hata: ' + error.message);
    }
}

window.editLesson = async (id) => {
    const lessonsRef = collection(db, 'lessons');
    const q = query(lessonsRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    const lesson = snapshot.docs.find(d => d.id === id)?.data();
    if (!lesson) return;
    
    document.getElementById('lessonModalTitle').innerText = 'Ders Düzenle';
    document.getElementById('editLessonId').value = id;
    document.getElementById('lessonName').value = lesson.name;
    document.getElementById('lessonDesc').value = lesson.description || '';
    document.getElementById('lessonModal').classList.remove('hidden');
};

window.deleteLesson = async (id) => {
    if (!confirm('Bu dersi silmek istediğinize emin misiniz?')) return;
    await deleteDoc(doc(db, 'lessons', id));
    showNotification('Ders silindi!');
    await loadAllLessonsForAdmin();
};

window.editWord = async (id) => {
    const wordDoc = await getDoc(doc(db, 'words', id));
    if (!wordDoc.exists()) return;
    const word = wordDoc.data();
    
    document.getElementById('modalTitle').innerText = 'Kelime Düzenle';
    document.getElementById('editWordId').value = id;
    document.getElementById('wordArabic').value = word.arabic;
    document.getElementById('wordTurkish').value = word.turkish;
    document.getElementById('wordModal').classList.remove('hidden');
};

window.deleteWord = async (id) => {
    if (!confirm('Bu kelimeyi silmek istediğinize emin misiniz?')) return;
    await deleteDoc(doc(db, 'words', id));
    showNotification('Kelime silindi!');
    await selectLessonForWords(currentEditingLesson, document.getElementById('currentLessonName').innerText);
};

function logoutAdmin() {
    sessionStorage.removeItem('admin_auth');
    document.getElementById('adminLoginSection').classList.remove('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
    document.getElementById('adminPassword').value = '';
}

// Global admin fonksiyonları
window.openAddLessonModal = openAddLessonModal;
window.openAddWordModal = openAddWordModal;
window.closeWordModal = closeWordModal;
window.closeLessonModal = closeLessonModal;
window.editLesson = window.editLesson;
window.deleteLesson = window.deleteLesson;
window.editWord = window.editWord;
window.deleteWord = window.deleteWord;
window.selectLessonForWords = selectLessonForWords;
window.logoutAdmin = logoutAdmin;

if (window.location.pathname.includes('admin.html')) {
    document.addEventListener('DOMContentLoaded', () => initAdminPage());
}
