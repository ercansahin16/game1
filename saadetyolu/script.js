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
let currentLesson = null;
let lessons = [];
let currentLessonWords = [];
let currentWordIndex = 0;
let currentWordList = [];

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
    
    // Normal kullanıcı sayfası
    initUserPage();
});

function initUserPage() {
    // Elementleri tanımla
    window.menuBtn = document.getElementById('menuBtn');
    window.sideMenu = document.getElementById('sideMenu');
    window.menuOverlay = document.getElementById('menuOverlay');
    
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
    
    // Menü butonu
    if (window.menuBtn) {
        window.menuBtn.addEventListener('click', toggleMenu);
    }
    if (window.menuOverlay) {
        window.menuOverlay.addEventListener('click', toggleMenu);
    }
    
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
    
    // Enter tuşu ile giriş
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
        const loginSection = document.getElementById('loginSection');
        const learningSection = document.getElementById('learningSection');
        const menuBtn = document.getElementById('menuBtn');
        const userBadge = document.getElementById('userBadge');
        const menuUserName = document.getElementById('menuUserName');
        const userNameDisplay = document.getElementById('userNameDisplay');
        
        if (user) {
            console.log("Kullanıcı giriş yaptı:", user.email);
            currentUser = user;
            if (loginSection) loginSection.style.display = 'none';
            if (learningSection) learningSection.style.display = 'block';
            if (menuBtn) menuBtn.classList.remove('hidden');
            if (userBadge) userBadge.classList.remove('hidden');
            if (menuUserName) menuUserName.innerText = user.email.split('@')[0];
            if (userNameDisplay) userNameDisplay.innerText = user.email.split('@')[0];
            
            // Dersleri yükle
            await loadLessons();
            await loadUserLessons();
            
            console.log("Dersler yüklendi, gösteriliyor...");
        } else {
            console.log("Kullanıcı çıkış yaptı");
            currentUser = null;
            if (loginSection) loginSection.style.display = 'flex';
            if (learningSection) learningSection.style.display = 'none';
            if (menuBtn) menuBtn.classList.add('hidden');
            if (userBadge) userBadge.classList.add('hidden');
        }
    });
}

// ========== MENÜ FONKSİYONLARI ==========

function toggleMenu() {
    if (window.sideMenu) window.sideMenu.classList.toggle('open');
    if (window.menuOverlay) window.menuOverlay.classList.toggle('active');
}

window.goToHome = function() {
    console.log("goToHome çağrıldı");
    const lessonSelectArea = document.getElementById('lessonSelectArea');
    const wordLearningArea = document.getElementById('wordLearningArea');
    const profileSection = document.getElementById('profileSection');
    if (lessonSelectArea) lessonSelectArea.classList.remove('hidden');
    if (wordLearningArea) wordLearningArea.classList.add('hidden');
    if (profileSection) profileSection.classList.add('hidden');
    if (window.sideMenu) window.sideMenu.classList.remove('open');
    if (window.menuOverlay) window.menuOverlay.classList.remove('active');
};

window.goToLessons = function() {
    console.log("goToLessons çağrıldı, lessons.length:", lessons.length);
    const lessonSelectArea = document.getElementById('lessonSelectArea');
    const wordLearningArea = document.getElementById('wordLearningArea');
    const profileSection = document.getElementById('profileSection');
    
    if (lessonSelectArea) lessonSelectArea.classList.remove('hidden');
    if (wordLearningArea) wordLearningArea.classList.add('hidden');
    if (profileSection) profileSection.classList.add('hidden');
    
    if (window.sideMenu) window.sideMenu.classList.remove('open');
    if (window.menuOverlay) window.menuOverlay.classList.remove('active');
    
    if (lessons && lessons.length > 0) {
        console.log("Dersler gösteriliyor, ders sayısı:", lessons.length);
        if (currentUser) {
            loadUserLessons();
        } else {
            displayLessons([]);
        }
    } else {
        console.log("Dersler henüz yüklenmemiş, yükleniyor...");
        loadLessons();
    }
};

window.showProfile = function() {
    console.log("showProfile çağrıldı");
    const profileEmail = document.getElementById('profileEmail');
    if (profileEmail && currentUser) profileEmail.value = currentUser.email;
    const lessonSelectArea = document.getElementById('lessonSelectArea');
    const wordLearningArea = document.getElementById('wordLearningArea');
    const profileSection = document.getElementById('profileSection');
    if (lessonSelectArea) lessonSelectArea.classList.add('hidden');
    if (wordLearningArea) wordLearningArea.classList.add('hidden');
    if (profileSection) profileSection.classList.remove('hidden');
    if (window.sideMenu) window.sideMenu.classList.remove('open');
    if (window.menuOverlay) window.menuOverlay.classList.remove('active');
};

window.showWarning = function() {
    showNotification('⚠️ DİKKAT! Eğer profilin size ait olmadığını düşünüyorsanız lütfen çıkış yapın. Saygılar. 🌸');
    if (window.sideMenu) window.sideMenu.classList.remove('open');
    if (window.menuOverlay) window.menuOverlay.classList.remove('active');
};

window.toggleTheme = function() {
    const body = document.body;
    if (body.classList.contains('dark-mode')) {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) themeIcon.className = 'fas fa-sun';
    } else {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) themeIcon.className = 'fas fa-moon';
    }
    if (window.sideMenu) window.sideMenu.classList.remove('open');
    if (window.menuOverlay) window.menuOverlay.classList.remove('active');
};

window.logout = async function() {
    try {
        await signOut(auth);
        currentUser = null;
        currentLesson = null;
        currentLessonWords = [];
        showNotification('🌸 Çıkış yapıldı. Yine bekleriz! 🌸');
        if (window.sideMenu) window.sideMenu.classList.remove('open');
        if (window.menuOverlay) window.menuOverlay.classList.remove('active');
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
    console.log("loadLessons çağrıldı");
    try {
        const lessonsRef = collection(db, 'lessons');
        const q = query(lessonsRef, orderBy('order', 'asc'));
        const snapshot = await getDocs(q);
        
        console.log("Ders snapshot boyutu:", snapshot.size);
        
        if (snapshot.empty) {
            console.log("Ders bulunamadı, demo dersler oluşturuluyor...");
            await createDemoLessons();
            const newSnapshot = await getDocs(q);
            lessons = newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Demo dersler oluşturuldu, ders sayısı:", lessons.length);
        } else {
            lessons = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log("Dersler yüklendi:", lessons.length);
        }
        
        if (currentUser) {
            await loadUserLessons();
        } else {
            displayLessons([]);
        }
    } catch (error) {
        console.error("Dersler yüklenirken hata:", error);
        showNotification('Dersler yüklenirken hata oluştu!');
    }
}

async function createDemoLessons() {
    console.log("createDemoLessons çağrıldı");
    const lessonsRef = collection(db, 'lessons');
    const existingLessons = await getDocs(lessonsRef);
    
    if (!existingLessons.empty) {
        console.log("Dersler zaten var, demo oluşturulmuyor");
        return;
    }
    
    const demoLessons = [
        { name: "Ders 1 - Temel Kelimeler", description: "Kur'an'da sık geçen temel kavramlar", order: 1 },
        { name: "Ders 2 - Güzel İsimler", description: "Allah'ın 99 ismi (El-Esma-ül Hüsna)", order: 2 },
        { name: "Ders 3 - İbadet Terimleri", description: "Namaz, oruç, hac gibi ibadetlerle ilgili terimler", order: 3 }
    ];
    
    const demoWords = {
        "Ders 1 - Temel Kelimeler": [
            { arabic: "خلق", turkish: "yaratılış" },
            { arabic: "رحمن", turkish: "Rahman, çok merhametli" },
            { arabic: "كريم", turkish: "Kerim, cömert" },
            { arabic: "صبر", turkish: "sabır" },
            { arabic: "شكر", turkish: "şükür" }
        ],
        "Ders 2 - Güzel İsimler": [
            { arabic: "الرحمن", turkish: "Rahman (çok merhametli)" },
            { arabic: "الرحيم", turkish: "Rahim (çok esirgeyici)" },
            { arabic: "الملك", turkish: "Melik (hükümran)" },
            { arabic: "القدوس", turkish: "Kuddüs (eksikliklerden uzak)" },
            { arabic: "السلام", turkish: "Selam (esenlik veren)" }
        ],
        "Ders 3 - İbadet Terimleri": [
            { arabic: "صلاة", turkish: "namaz" },
            { arabic: "صوم", turkish: "oruç" },
            { arabic: "زكاة", turkish: "zekât" },
            { arabic: "حج", turkish: "hac" },
            { arabic: "دعاء", turkish: "dua" }
        ]
    };
    
    for (const lesson of demoLessons) {
        const lessonRef = doc(collection(db, 'lessons'));
        await setDoc(lessonRef, lesson);
        console.log("Ders oluşturuldu:", lesson.name);
        
        const words = demoWords[lesson.name] || [];
        for (const word of words) {
            const wordRef = doc(collection(db, 'words'));
            await setDoc(wordRef, { ...word, lessonId: lessonRef.id });
            console.log("Kelime eklendi:", word.arabic);
        }
    }
    
    console.log("Demo dersler ve kelimeler oluşturuldu");
}

async function loadUserLessons() {
    console.log("loadUserLessons çağrıldı, currentUser:", currentUser ? currentUser.uid : "yok");
    
    if (!currentUser) {
        console.log("Kullanıcı yok, çıkılıyor");
        return;
    }
    
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        let selectedLessonIds = [];
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            selectedLessonIds = userData.selectedLessons || [];
            console.log("Kullanıcının seçili dersleri:", selectedLessonIds);
        } else {
            console.log("Kullanıcı dokümanı yok, yeni oluşturulacak");
            await setDoc(doc(db, 'users', currentUser.uid), {
                email: currentUser.email,
                selectedLessons: [],
                createdAt: new Date().toISOString()
            });
        }
        
        displayLessons(selectedLessonIds);
        
        const totalWordCountEl = document.getElementById('totalWordCount');
        if (totalWordCountEl) totalWordCountEl.innerText = selectedLessonIds.length;
        
    } catch (error) {
        console.error("Kullanıcı dersleri yüklenirken hata:", error);
        showNotification('Dersler yüklenirken hata oluştu!');
    }
}

function displayLessons(selectedLessonIds) {
    const lessonsGrid = document.getElementById('lessonsGrid');
    if (!lessonsGrid) {
        console.log("lessonsGrid bulunamadı");
        return;
    }
    
    console.log("displayLessons çağrıldı - lessons:", lessons);
    console.log("Seçili ders ID'leri:", selectedLessonIds);
    
    lessonsGrid.innerHTML = '';
    
    if (!lessons || lessons.length === 0) {
        lessonsGrid.innerHTML = '<div style="text-align:center; padding:40px; color: var(--text-secondary);">📚 Henüz ders eklenmemiş. Admin panelden ders ekleyebilirsiniz.</div>';
        return;
    }
    
    for (const lesson of lessons) {
        const isSelected = selectedLessonIds ? selectedLessonIds.includes(lesson.id) : false;
        const lessonCard = document.createElement('div');
        lessonCard.className = 'lesson-card';
        lessonCard.innerHTML = `
            <i class="fas ${isSelected ? 'fa-check-circle' : 'fa-book'}"></i>
            <h4>${escapeHtml(lesson.name)}</h4>
            <p>${escapeHtml(lesson.description || 'Ders açıklaması yok')}</p>
        `;
        lessonCard.onclick = (function(lId, selected) {
            return function() { selectLesson(lId, selected); };
        })(lesson.id, isSelected);
        lessonsGrid.appendChild(lessonCard);
    }
    
    console.log("Ders kartları oluşturuldu, toplam:", lessons.length);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

async function selectLesson(lessonId, isSelected) {
    if (!currentUser) return;
    
    if (!isSelected) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            selectedLessons: arrayUnion(lessonId)
        });
        showNotification(`📚 ${lessons.find(l => l.id === lessonId)?.name} seçildi!`);
        // Seçili dersleri yenile
        await loadUserLessons();
    }
    
    await loadLessonWords(lessonId);
    currentLesson = lessonId;
    document.getElementById('lessonSelectArea').classList.add('hidden');
    document.getElementById('wordLearningArea').classList.remove('hidden');
    startLearningLesson();
}

async function loadLessonWords(lessonId) {
    const wordsRef = collection(db, 'words');
    const q = query(wordsRef, where('lessonId', '==', lessonId));
    const snapshot = await getDocs(q);
    
    currentLessonWords = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    const lessonWordCountEl = document.getElementById('lessonWordCount');
    if (lessonWordCountEl) lessonWordCountEl.innerText = currentLessonWords.length;
}

function startLearningLesson() {
    if (currentLessonWords.length === 0) {
        const arabicWordEl = document.getElementById('arabicWord');
        if (arabicWordEl) arabicWordEl.innerText = "Bu derste henüz kelime yok";
        return;
    }
    
    currentWordList = [...currentLessonWords];
    for (let i = currentWordList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentWordList[i], currentWordList[j]] = [currentWordList[j], currentWordList[i]];
    }
    currentWordIndex = 0;
    displayCurrentWord();
}

function displayCurrentWord() {
    const arabicWordEl = document.getElementById('arabicWord');
    const turkishWordEl = document.getElementById('turkishWord');
    
    if (!arabicWordEl || !turkishWordEl) return;
    
    if (currentLessonWords.length === 0) {
        arabicWordEl.innerText = "Bu derste kelime yok";
        turkishWordEl.classList.add('hidden');
        return;
    }
    
    const word = currentWordList[currentWordIndex];
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
    if (currentLessonWords.length === 0) return;
    currentWordIndex = (currentWordIndex + 1) % currentWordList.length;
    displayCurrentWord();
}

function playSound() {
    if (!currentWordList[currentWordIndex]) return;
    if (currentUtterance) speechSynthesis.cancel();
    
    const word = currentWordList[currentWordIndex];
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
    
    const total = currentWordList.length;
    const percent = Math.round(((currentWordIndex + 1) / total) * 100);
    progressFill.style.width = `${percent}%`;
    progressPercent.innerText = `${percent}%`;
}

function backToLessons() {
    document.getElementById('lessonSelectArea').classList.remove('hidden');
    document.getElementById('wordLearningArea').classList.add('hidden');
    currentLesson = null;
    currentLessonWords = [];
    // Ders listesini yenile
    if (currentUser) {
        loadUserLessons();
    }
}

// ========== ADMIN PANEL FONKSİYONLARI ==========

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
    const ADMIN_PASSWORD = "admin123";
    
    if (password === ADMIN_PASSWORD) {
        adminAuthenticated = true;
        sessionStorage.setItem('admin_auth', 'true');
        showAdminPanel();
        loadAllLessonsForAdmin();
        showNotification('✅ Admin girişi başarılı!');
    } else {
        showNotification('❌ Hatalı şifre!');
        const adminPassword = document.getElementById('adminPassword');
        if (adminPassword) adminPassword.value = '';
    }
}

function showAdminPanel() {
    const adminLoginSection = document.getElementById('adminLoginSection');
    const adminPanel = document.getElementById('adminPanel');
    if (adminLoginSection) adminLoginSection.classList.add('hidden');
    if (adminPanel) adminPanel.classList.remove('hidden');
}

async function loadAllLessonsForAdmin() {
    try {
        const lessonsRef = collection(db, 'lessons');
        const q = query(lessonsRef, orderBy('order', 'asc'));
        const snapshot = await getDocs(q);
        
        const lessonsList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        displayLessonsForAdmin(lessonsList);
    } catch (error) {
        console.error('Dersler yüklenirken hata:', error);
        const container = document.getElementById('lessonsAdminList');
        if (container) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color: red;">❌ Bağlantı hatası!</div>';
        }
    }
}

function displayLessonsForAdmin(lessonsList) {
    const container = document.getElementById('lessonsAdminList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!lessonsList || lessonsList.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px;">Henüz ders eklenmemiş. "Yeni Ders" butonuna tıklayın.</div>';
        return;
    }
    
    for (const lesson of lessonsList) {
        const lessonDiv = document.createElement('div');
        lessonDiv.className = 'lesson-admin-item';
        lessonDiv.innerHTML = `
            <div class="lesson-info">
                <h4><i class="fas fa-book"></i> ${lesson.name}</h4>
                <p>${lesson.description || 'Açıklama yok'} | Sıra: ${lesson.order || 0}</p>
            </div>
            <div class="lesson-actions">
                <button class="btn-warning" onclick="window.editLesson('${lesson.id}')"><i class="fas fa-edit"></i> Düzenle</button>
                <button class="btn-danger" onclick="window.deleteLesson('${lesson.id}')"><i class="fas fa-trash"></i> Sil</button>
                <button class="btn-success" onclick="window.selectLessonForWords('${lesson.id}', '${lesson.name}')"><i class="fas fa-words"></i> Kelimeler</button>
            </div>
        `;
        container.appendChild(lessonDiv);
    }
}

async function selectLessonForWords(lessonId, lessonName) {
    currentEditingLesson = lessonId;
    const currentLessonNameSpan = document.getElementById('currentLessonName');
    if (currentLessonNameSpan) currentLessonNameSpan.innerText = lessonName;
    const wordsSection = document.getElementById('wordsSection');
    if (wordsSection) wordsSection.style.display = 'block';
    
    const wordsRef = collection(db, 'words');
    const q = query(wordsRef, where('lessonId', '==', lessonId));
    const snapshot = await getDocs(q);
    
    const words = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    displayWordsForAdmin(words);
}

function displayWordsForAdmin(words) {
    const container = document.getElementById('wordsAdminList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (words.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px;">Bu derste henüz kelime yok. "Yeni Kelime" butonuna tıklayın.</div>';
        return;
    }
    
    for (const word of words) {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'word-admin-item';
        wordDiv.innerHTML = `
            <div class="word-info">
                <div class="word-arabic">${word.arabic}</div>
                <div class="word-turkish">${word.turkish}</div>
            </div>
            <div class="word-actions">
                <button class="btn-warning" onclick="window.editWord('${word.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-danger" onclick="window.deleteWord('${word.id}')"><i class="fas fa-trash"></i></button>
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

function closeWordModal() { 
    document.getElementById('wordModal').classList.add('hidden'); 
}

function closeLessonModal() { 
    document.getElementById('lessonModal').classList.add('hidden'); 
}

async function saveLesson() {
    const lessonId = document.getElementById('editLessonId').value;
    const name = document.getElementById('lessonName').value.trim();
    const description = document.getElementById('lessonDesc').value.trim();
    
    if (!name) { 
        showNotification('Ders adı gerekli!'); 
        return; 
    }
    
    try {
        if (lessonId) {
            await updateDoc(doc(db, 'lessons', lessonId), { name, description });
            showNotification('✅ Ders güncellendi!');
        } else {
            const newLessonRef = doc(collection(db, 'lessons'));
            const snapshot = await getDocs(collection(db, 'lessons'));
            const order = snapshot.size + 1;
            await setDoc(newLessonRef, { name, description, order });
            showNotification('✅ Yeni ders eklendi!');
        }
        closeLessonModal();
        await loadAllLessonsForAdmin();
    } catch (error) {
        showNotification('❌ Hata: ' + error.message);
    }
}

async function saveWord() {
    const wordId = document.getElementById('editWordId').value;
    const arabic = document.getElementById('wordArabic').value.trim();
    const turkish = document.getElementById('wordTurkish').value.trim();
    
    if (!arabic || !turkish) { 
        showNotification('Her iki alan da gerekli!'); 
        return; 
    }
    if (!currentEditingLesson) { 
        showNotification('Lütfen önce bir ders seçin!'); 
        return; 
    }
    
    try {
        if (wordId) {
            await updateDoc(doc(db, 'words', wordId), { arabic, turkish });
            showNotification('✅ Kelime güncellendi!');
        } else {
            const newWordRef = doc(collection(db, 'words'));
            await setDoc(newWordRef, { arabic, turkish, lessonId: currentEditingLesson });
            showNotification('✅ Yeni kelime eklendi!');
        }
        closeWordModal();
        await selectLessonForWords(currentEditingLesson, document.getElementById('currentLessonName').innerText);
    } catch (error) {
        showNotification('❌ Hata: ' + error.message);
    }
}

window.editLesson = async (id) => {
    const lessonsRef = collection(db, 'lessons');
    const q = query(lessonsRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    const lesson = snapshot.docs.find(d => d.id === id)?.data();
    if (!lesson) return;
    
    document.getElementById('lessonModalTitle').innerText = '✏️ Ders Düzenle';
    document.getElementById('editLessonId').value = id;
    document.getElementById('lessonName').value = lesson.name;
    document.getElementById('lessonDesc').value = lesson.description || '';
    document.getElementById('lessonModal').classList.remove('hidden');
};

window.deleteLesson = async (id) => {
    if (!confirm('⚠️ Bu dersi silmek istediğinize emin misiniz? İçindeki tüm kelimeler de silinecek!')) return;
    
    try {
        const wordsRef = collection(db, 'words');
        const q = query(wordsRef, where('lessonId', '==', id));
        const snapshot = await getDocs(q);
        for (const docSnap of snapshot.docs) {
            await deleteDoc(doc(db, 'words', docSnap.id));
        }
        await deleteDoc(doc(db, 'lessons', id));
        showNotification('✅ Ders silindi!');
        await loadAllLessonsForAdmin();
    } catch (error) {
        showNotification('❌ Hata: ' + error.message);
    }
};

window.editWord = async (id) => {
    const wordDoc = await getDoc(doc(db, 'words', id));
    if (!wordDoc.exists()) return;
    const word = wordDoc.data();
    
    document.getElementById('modalTitle').innerText = '✏️ Kelime Düzenle';
    document.getElementById('editWordId').value = id;
    document.getElementById('wordArabic').value = word.arabic;
    document.getElementById('wordTurkish').value = word.turkish;
    document.getElementById('wordModal').classList.remove('hidden');
};

window.deleteWord = async (id) => {
    if (!confirm('⚠️ Bu kelimeyi silmek istediğinize emin misiniz?')) return;
    await deleteDoc(doc(db, 'words', id));
    showNotification('✅ Kelime silindi!');
    await selectLessonForWords(currentEditingLesson, document.getElementById('currentLessonName').innerText);
};

function logoutAdmin() {
    sessionStorage.removeItem('admin_auth');
    adminAuthenticated = false;
    const adminLoginSection = document.getElementById('adminLoginSection');
    const adminPanel = document.getElementById('adminPanel');
    const adminPassword = document.getElementById('adminPassword');
    if (adminLoginSection) adminLoginSection.classList.remove('hidden');
    if (adminPanel) adminPanel.classList.add('hidden');
    if (adminPassword) adminPassword.value = '';
    showNotification('🔐 Admin çıkışı yapıldı');
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
