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

// DOM elementleri
let menuBtn, sideMenu, menuOverlay;
let loginSection, learningSection, lessonSelectArea, wordLearningArea;
let loginEmail, loginPassword, loginBtn;
let registerName, registerEmail, registerPassword, registerBtn;
let forgotEmail, forgotBtn, forgotResult;
let profileSection, profileEmail, profileNewPassword, profileUpdateBtn;
let arabicWordEl, turkishWordEl;
let showMeaningBtn, nextWordBtn, soundBtn, backToLessonsBtn;
let totalWordCountEl, lessonWordCountEl;
let progressFill, progressPercent;
let lessonsGrid;

// Ses
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;

// Admin panel değişkenleri
let currentEditingLesson = null;
let currentEditingWord = null;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
    initElements();
    initEventListeners();
    loadTheme();
    
    if (window.location.pathname.includes('admin.html')) {
        initAdminPage();
        return;
    }
    
    await checkAuthState();
    await loadLessons();
});

function initElements() {
    menuBtn = document.getElementById('menuBtn');
    sideMenu = document.getElementById('sideMenu');
    menuOverlay = document.getElementById('menuOverlay');
    
    loginSection = document.getElementById('loginSection');
    learningSection = document.getElementById('learningSection');
    lessonSelectArea = document.getElementById('lessonSelectArea');
    wordLearningArea = document.getElementById('wordLearningArea');
    profileSection = document.getElementById('profileSection');
    
    // Login
    loginEmail = document.getElementById('loginEmail');
    loginPassword = document.getElementById('loginPassword');
    loginBtn = document.getElementById('loginBtn');
    
    // Register
    registerName = document.getElementById('registerName');
    registerEmail = document.getElementById('registerEmail');
    registerPassword = document.getElementById('registerPassword');
    registerBtn = document.getElementById('registerBtn');
    
    // Forgot
    forgotEmail = document.getElementById('forgotEmail');
    forgotBtn = document.getElementById('forgotBtn');
    forgotResult = document.getElementById('forgotResult');
    
    // Profile
    profileEmail = document.getElementById('profileEmail');
    profileNewPassword = document.getElementById('profileNewPassword');
    profileUpdateBtn = document.getElementById('profileUpdateBtn');
    
    arabicWordEl = document.getElementById('arabicWord');
    turkishWordEl = document.getElementById('turkishWord');
    showMeaningBtn = document.getElementById('showMeaningBtn');
    nextWordBtn = document.getElementById('nextWordBtn');
    soundBtn = document.getElementById('soundBtn');
    backToLessonsBtn = document.getElementById('backToLessonsBtn');
    
    totalWordCountEl = document.getElementById('totalWordCount');
    lessonWordCountEl = document.getElementById('lessonWordCount');
    progressFill = document.getElementById('progressFill');
    progressPercent = document.getElementById('progressPercent');
    
    lessonsGrid = document.getElementById('lessonsGrid');
}

function initEventListeners() {
    if (menuBtn) menuBtn.addEventListener('click', toggleMenu);
    if (menuOverlay) menuOverlay.addEventListener('click', toggleMenu);
    
    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    if (registerBtn) registerBtn.addEventListener('click', handleRegister);
    if (forgotBtn) forgotBtn.addEventListener('click', handleForgotPassword);
    if (profileUpdateBtn) profileUpdateBtn.addEventListener('click', handleUpdatePassword);
    
    if (showMeaningBtn) showMeaningBtn.addEventListener('click', showMeaning);
    if (nextWordBtn) nextWordBtn.addEventListener('click', nextWord);
    if (soundBtn) soundBtn.addEventListener('click', playSound);
    if (backToLessonsBtn) backToLessonsBtn.addEventListener('click', backToLessons);
    
    // Enter tuşu ile giriş
    if (loginPassword) {
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }
}

function toggleMenu() {
    sideMenu.classList.toggle('open');
    menuOverlay.classList.toggle('active');
}

// ========== AUTHENTICATION ==========

async function checkAuthState() {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData(user.uid);
            showLearningSection();
            if (menuBtn) menuBtn.classList.remove('hidden');
            const userBadge = document.getElementById('userBadge');
            if (userBadge) userBadge.classList.remove('hidden');
            updateUserDisplay(user.email.split('@')[0]);
            await loadUserLessons();
        } else {
            currentUser = null;
            if (loginSection) loginSection.classList.remove('hidden');
            if (learningSection) learningSection.classList.add('hidden');
            if (menuBtn) menuBtn.classList.add('hidden');
            const userBadge = document.getElementById('userBadge');
            if (userBadge) userBadge.classList.add('hidden');
        }
    });
}

async function loadUserData(uid) {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', uid), {
            selectedLessons: [],
            createdAt: new Date().toISOString()
        });
    }
}

async function handleRegister() {
    const name = registerName.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value.trim();
    
    if (!name || !email || !password) {
        showNotification('Lütfen tüm alanları doldurun!');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Şifre en az 6 karakter olmalıdır!');
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
        registerName.value = '';
        registerEmail.value = '';
        registerPassword.value = '';
        
        // Login formuna geç
        document.querySelector('.tab-btn[data-tab="login"]').click();
        
    } catch (error) {
        console.error('Kayıt hatası:', error);
        if (error.code === 'auth/email-already-in-use') {
            showNotification('Bu e-posta zaten kullanılıyor!');
        } else {
            showNotification('Kayıt hatası: ' + error.message);
        }
    }
}

async function handleLogin() {
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();
    
    if (!email || !password) {
        showNotification('Lütfen e-posta ve şifre girin!');
        return;
    }
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showNotification('✅ Giriş başarılı!');
        loginEmail.value = '';
        loginPassword.value = '';
    } catch (error) {
        console.error('Giriş hatası:', error);
        if (error.code === 'auth/user-not-found') {
            showNotification('Bu e-posta ile kayıtlı kullanıcı bulunamadı!');
        } else if (error.code === 'auth/wrong-password') {
            showNotification('Hatalı şifre!');
        } else {
            showNotification('Giriş hatası: ' + error.message);
        }
    }
}

async function handleForgotPassword() {
    const email = forgotEmail.value.trim();
    
    if (!email) {
        showNotification('Lütfen e-posta adresinizi girin!');
        return;
    }
    
    try {
        // Kullanıcının kayıtlı olup olmadığını kontrol et
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            showNotification('Bu e-posta ile kayıtlı kullanıcı bulunamadı!');
            return;
        }
        
        // Firebase Auth ile şifre sıfırlama emaili gönder
        await sendPasswordResetEmail(auth, email);
        
        if (forgotResult) {
            forgotResult.innerHTML = `
                <div style="background: #10b981; padding: 12px; border-radius: 12px; margin-top: 10px;">
                    ✅ Şifre sıfırlama bağlantısı e-posta adresinize gönderildi!<br>
                    Lütfen e-postanızı kontrol edin.
                </div>
            `;
        }
        showNotification('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi!');
        
    } catch (error) {
        console.error('Şifre sıfırlama hatası:', error);
        showNotification('Hata: ' + error.message);
    }
}

async function handleUpdatePassword() {
    const newPassword = profileNewPassword.value.trim();
    
    if (!newPassword) {
        showNotification('Lütfen yeni şifre girin!');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('Şifre en az 6 karakter olmalıdır!');
        return;
    }
    
    try {
        await updatePassword(auth.currentUser, newPassword);
        showNotification('✅ Şifre başarıyla güncellendi!');
        profileNewPassword.value = '';
    } catch (error) {
        console.error('Şifre güncelleme hatası:', error);
        showNotification('Hata: ' + error.message);
    }
}

async function logout() {
    try {
        await signOut(auth);
        currentUser = null;
        currentLesson = null;
        currentLessonWords = [];
        
        if (sideMenu) sideMenu.classList.remove('open');
        if (menuOverlay) menuOverlay.classList.remove('active');
        if (lessonSelectArea) lessonSelectArea.classList.remove('hidden');
        if (wordLearningArea) wordLearningArea.classList.add('hidden');
        if (profileSection) profileSection.classList.add('hidden');
        
        showNotification('🌸 Çıkış yapıldı. Yine bekleriz! 🌸');
    } catch (error) {
        console.error('Çıkış hatası:', error);
    }
}

function updateUserDisplay(name) {
    const menuUserName = document.getElementById('menuUserName');
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (menuUserName) menuUserName.innerText = name;
    if (userNameDisplay) userNameDisplay.innerText = name;
}

function showFlowerNotification(msg) {
    const notif = document.getElementById('notification');
    const notifMsg = document.getElementById('notificationMsg');
    if (notif && notifMsg) {
        notifMsg.innerText = msg;
        notif.classList.remove('hidden');
        setTimeout(() => notif.classList.add('hidden'), 4000);
    }
}

function showNotification(msg) {
    const notif = document.getElementById('notification');
    const notifMsg = document.getElementById('notificationMsg');
    if (notif && notifMsg) {
        notifMsg.innerText = msg;
        notif.classList.remove('hidden');
        setTimeout(() => notif.classList.add('hidden'), 3000);
    }
}

function showProfile() {
    if (profileSection) {
        if (profileEmail && currentUser) {
            profileEmail.value = currentUser.email;
        }
        lessonSelectArea.classList.add('hidden');
        wordLearningArea.classList.add('hidden');
        profileSection.classList.remove('hidden');
    }
}

function showLessons() {
    if (lessonSelectArea) lessonSelectArea.classList.remove('hidden');
    if (wordLearningArea) wordLearningArea.classList.add('hidden');
    if (profileSection) profileSection.classList.add('hidden');
}

// ========== DERS VE KELİME İŞLEMLERİ ==========

async function loadLessons() {
    const lessonsRef = collection(db, 'lessons');
    const q = query(lessonsRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        await createDemoLessons();
        return loadLessons();
    }
    
    lessons = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
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
}

async function loadUserLessons() {
    if (!currentUser) return;
    
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
        const userData = userDoc.data();
        const selectedLessonIds = userData.selectedLessons || [];
        displayLessons(selectedLessonIds);
        updateStats(selectedLessonIds.length);
    }
}

function displayLessons(selectedLessonIds) {
    if (!lessonsGrid) return;
    lessonsGrid.innerHTML = '';
    
    for (const lesson of lessons) {
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
    if (!currentUser) return;
    
    if (!isSelected) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            selectedLessons: arrayUnion(lessonId)
        });
        showNotification(`📚 ${lessons.find(l => l.id === lessonId)?.name} seçildi!`);
    }
    
    await loadLessonWords(lessonId);
    currentLesson = lessonId;
    lessonSelectArea.classList.add('hidden');
    wordLearningArea.classList.remove('hidden');
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
    
    if (lessonWordCountEl) {
        lessonWordCountEl.innerText = currentLessonWords.length;
    }
}

function startLearningLesson() {
    if (currentLessonWords.length === 0) {
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
    if (turkishWordEl) turkishWordEl.classList.remove('hidden');
}

function nextWord() {
    if (currentLessonWords.length === 0) return;
    currentWordIndex = (currentWordIndex + 1) % currentWordList.length;
    displayCurrentWord();
}

function playSound() {
    if (!arabicWordEl || !currentWordList[currentWordIndex]) return;
    if (currentUtterance) speechSynthesis.cancel();
    
    const word = currentWordList[currentWordIndex];
    const utterance = new SpeechSynthesisUtterance(word.arabic);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.8;
    currentUtterance = utterance;
    speechSynthesis.speak(utterance);
}

function updateProgress() {
    if (!progressFill || !progressPercent) return;
    const total = currentWordList.length;
    const percent = Math.round(((currentWordIndex + 1) / total) * 100);
    progressFill.style.width = `${percent}%`;
    progressPercent.innerText = `${percent}%`;
}

function updateStats(selectedCount) {
    if (totalWordCountEl) totalWordCountEl.innerText = selectedCount;
}

function backToLessons() {
    lessonSelectArea.classList.remove('hidden');
    wordLearningArea.classList.add('hidden');
    currentLesson = null;
    currentLessonWords = [];
}

function showLearningSection() {
    if (loginSection) loginSection.classList.add('hidden');
    if (learningSection) learningSection.classList.remove('hidden');
    if (menuBtn) menuBtn.classList.remove('hidden');
    const userBadge = document.getElementById('userBadge');
    if (userBadge) userBadge.classList.remove('hidden');
}

function goToHome() {
    if (wordLearningArea) wordLearningArea.classList.add('hidden');
    if (lessonSelectArea) lessonSelectArea.classList.remove('hidden');
    if (profileSection) profileSection.classList.add('hidden');
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

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
    }
}

// ========== ADMIN PANEL FONKSİYONLARI ==========

let adminAuthenticated = false;

async function initAdminPage() {
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
    lessons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    displayLessonsForAdmin();
}

function displayLessonsForAdmin() {
    const container = document.getElementById('lessonsAdminList');
    if (!container) return;
    container.innerHTML = '';
    
    for (const lesson of lessons) {
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
    
    if (words.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px;">Bu derste henüz kelime yok</div>';
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
    const lesson = lessons.find(l => l.id === id);
    if (!lesson) return;
    document.getElementById('lessonModalTitle').innerText = 'Ders Düzenle';
    document.getElementById('editLessonId').value = id;
    document.getElementById('lessonName').value = lesson.name;
    document.getElementById('lessonDesc').value = lesson.description || '';
    document.getElementById('lessonModal').classList.remove('hidden');
};

window.deleteLesson = async (id) => {
    if (!confirm('Bu dersi silmek istediğinize emin misiniz?')) return;
    const wordsRef = collection(db, 'words');
    const q = query(wordsRef, where('lessonId', '==', id));
    const snapshot = await getDocs(q);
    for (const docSnap of snapshot.docs) await deleteDoc(doc(db, 'words', docSnap.id));
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

// Global fonksiyonlar
window.goToHome = goToHome;
window.goToLessons = showLessons;
window.showProfile = showProfile;
window.showWarning = showWarning;
window.toggleTheme = toggleTheme;
window.logout = logout;
window.closeWordModal = closeWordModal;
window.closeLessonModal = closeLessonModal;
window.openAddLessonModal = openAddLessonModal;
window.openAddWordModal = openAddWordModal;
window.selectLessonForWords = selectLessonForWords;
window.logoutAdmin = logoutAdmin;
window.editLesson = window.editLesson;
window.deleteLesson = window.deleteLesson;
window.editWord = window.editWord;
window.deleteWord = window.deleteWord;

if (window.location.pathname.includes('admin.html')) {
    document.addEventListener('DOMContentLoaded', () => initAdminPage());
}
