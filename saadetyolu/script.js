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
let userNameInput, loginBtn;
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
    
    // Tema ayarını yükle
    loadTheme();
    
    // Admin sayfası kontrolü
    if (window.location.pathname.includes('admin.html')) {
        initAdminPage();
        return;
    }
    
    await checkStoredUser();
    await loadLessons();
    await loadUserLessons();
});

function initElements() {
    menuBtn = document.getElementById('menuBtn');
    sideMenu = document.getElementById('sideMenu');
    menuOverlay = document.getElementById('menuOverlay');
    
    loginSection = document.getElementById('loginSection');
    learningSection = document.getElementById('learningSection');
    lessonSelectArea = document.getElementById('lessonSelectArea');
    wordLearningArea = document.getElementById('wordLearningArea');
    
    userNameInput = document.getElementById('userNameInput');
    loginBtn = document.getElementById('loginBtn');
    
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
    if (showMeaningBtn) showMeaningBtn.addEventListener('click', showMeaning);
    if (nextWordBtn) nextWordBtn.addEventListener('click', nextWord);
    if (soundBtn) soundBtn.addEventListener('click', playSound);
    if (backToLessonsBtn) backToLessonsBtn.addEventListener('click', backToLessons);
    
    if (userNameInput) {
        userNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }
}

function toggleMenu() {
    sideMenu.classList.toggle('open');
    menuOverlay.classList.toggle('active');
}

async function checkStoredUser() {
    const storedUserId = localStorage.getItem('saadet_user_id');
    const storedUserName = localStorage.getItem('saadet_user_name');
    
    if (storedUserId && storedUserName) {
        const userDoc = await getDoc(doc(db, 'users', storedUserId));
        if (userDoc.exists()) {
            currentUser = { id: storedUserId, ...userDoc.data() };
            currentUser.userName = storedUserName;
            updateUserDisplay(currentUser.userName);
            await loadUserLessons();
            showLearningSection();
            
            // Menü butonlarını göster
            if (menuBtn) menuBtn.classList.remove('hidden');
            const userBadge = document.getElementById('userBadge');
            if (userBadge) userBadge.classList.remove('hidden');
        } else {
            localStorage.removeItem('saadet_user_id');
            localStorage.removeItem('saadet_user_name');
            // Menü butonlarını gizle
            if (menuBtn) menuBtn.classList.add('hidden');
            const userBadge = document.getElementById('userBadge');
            if (userBadge) userBadge.classList.add('hidden');
        }
    } else {
        // Menü butonlarını gizle
        if (menuBtn) menuBtn.classList.add('hidden');
        const userBadge = document.getElementById('userBadge');
        if (userBadge) userBadge.classList.add('hidden');
    }
}

async function handleLogin() {
    const userName = userNameInput.value.trim();
    if (!userName) {
        showNotification('Lütfen adınızı giriniz 🌸');
        return;
    }
    
    // Kullanıcı var mı kontrol et
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('userName', '==', userName));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        currentUser = { id: userDoc.id, ...userDoc.data() };
        showNotification(`🌸 Hoş geldiniz ${userName}! 🌸`);
    } else {
        const newUserRef = doc(collection(db, 'users'));
        const newUser = {
            userName: userName,
            createdAt: new Date().toISOString(),
            selectedLessons: []  // Ders ID'leri
        };
        await setDoc(newUserRef, newUser);
        currentUser = { id: newUserRef.id, ...newUser };
        showFlowerNotification(`🌸 Hoş geldiniz ${userName}! Allah'ı tanımaya geldiniz. 🌸`);
    }
    
    localStorage.setItem('saadet_user_id', currentUser.id);
    localStorage.setItem('saadet_user_name', currentUser.userName);
    
    updateUserDisplay(currentUser.userName);
    await loadUserLessons();
    showLearningSection();
    
    if (menuBtn) menuBtn.classList.remove('hidden');
    const userBadge = document.getElementById('userBadge');
    if (userBadge) userBadge.classList.remove('hidden');
}

function updateUserDisplay(userName) {
    const menuUserName = document.getElementById('menuUserName');
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (menuUserName) menuUserName.innerText = userName;
    if (userNameDisplay) userNameDisplay.innerText = userName.split(' ')[0] || userName;
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

async function loadLessons() {
    const lessonsRef = collection(db, 'lessons');
    const q = query(lessonsRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        // Demo dersler oluştur
        await createDemoLessons();
        return loadLessons();
    }
    
    lessons = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

async function createDemoLessons() {
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
            await setDoc(wordRef, {
                ...word,
                lessonId: lessonRef.id
            });
        }
    }
}

async function loadUserLessons() {
    if (!currentUser) return;
    
    const userDoc = await getDoc(doc(db, 'users', currentUser.id));
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
        // Dersi seç
        await updateDoc(doc(db, 'users', currentUser.id), {
            selectedLessons: arrayUnion(lessonId)
        });
        showNotification(`📚 ${lessons.find(l => l.id === lessonId)?.name} seçildi!`);
    }
    
    // Dersin kelimelerini yükle ve öğrenmeye başla
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
    
    // Karıştır
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
    if (turkishWordEl) {
        turkishWordEl.classList.remove('hidden');
    }
}

function nextWord() {
    if (currentLessonWords.length === 0) return;
    
    currentWordIndex = (currentWordIndex + 1) % currentWordList.length;
    displayCurrentWord();
}

function playSound() {
    if (!arabicWordEl || !currentWordList[currentWordIndex]) return;
    
    if (currentUtterance) {
        speechSynthesis.cancel();
    }
    
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
    if (totalWordCountEl) {
        totalWordCountEl.innerText = selectedCount;
    }
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
    
    // Menü butonlarını göster
    if (menuBtn) menuBtn.classList.remove('hidden');
    const userBadge = document.getElementById('userBadge');
    if (userBadge) userBadge.classList.remove('hidden');
}

function goToHome() {
    if (wordLearningArea) wordLearningArea.classList.add('hidden');
    if (lessonSelectArea) lessonSelectArea.classList.remove('hidden');
}

function goToLessons() {
    goToHome();
}

function showWarning() {
    showNotification('⚠️ DİKKAT! Eğer profilin size ait olmadığını düşünüyorsanız lütfen çıkış yapın ve profil adınıza harf ve/veya sayı ekleyin. Başka birisinin profilini kullanıyor olabilirsiniz. Saygılar. 🌸');
}

function toggleTheme() {
    const body = document.body;
    if (body.classList.contains('dark-mode')) {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
        // Tema ikonunu güncelle (admin panelindeki için)
        const themeIcons = document.querySelectorAll('#themeBtn i, #themeIcon');
        themeIcons.forEach(icon => {
            icon.className = 'fas fa-sun';
        });
    } else {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        // Tema ikonunu güncelle (admin panelindeki için)
        const themeIcons = document.querySelectorAll('#themeBtn i, #themeIcon');
        themeIcons.forEach(icon => {
            icon.className = 'fas fa-moon';
        });
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const body = document.body;
    if (savedTheme === 'light') {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) themeIcon.className = 'fas fa-sun';
    } else {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) themeIcon.className = 'fas fa-moon';
    }
}

async function logout() {
    localStorage.removeItem('saadet_user_id');
    localStorage.removeItem('saadet_user_name');
    currentUser = null;
    currentLesson = null;
    currentLessonWords = [];
    
    // Menüyü kapat
    if (sideMenu) sideMenu.classList.remove('open');
    if (menuOverlay) menuOverlay.classList.remove('active');
    
    if (loginSection) loginSection.classList.remove('hidden');
    if (learningSection) learningSection.classList.add('hidden');
    if (userNameInput) userNameInput.value = '';
    if (lessonSelectArea) lessonSelectArea.classList.remove('hidden');
    if (wordLearningArea) wordLearningArea.classList.add('hidden');
    
    // Menü butonlarını gizle
    if (menuBtn) menuBtn.classList.add('hidden');
    const userBadge = document.getElementById('userBadge');
    if (userBadge) userBadge.classList.add('hidden');
    
    showNotification('🌸 Çıkış yapıldı. Yine bekleriz! 🌸');
}

// ========== ADMIN PANEL FONKSİYONLARI ==========

let adminAuthenticated = false;

async function initAdminPage() {
    console.log("Admin sayfası başlatılıyor...");
    
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const adminPassword = document.getElementById('adminPassword');
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    
    // Admin giriş butonu
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Giriş butonuna tıklandı");
            authenticateAdmin(adminPassword.value);
        });
    }
    
    // Enter tuşu ile giriş
    if (adminPassword) {
        adminPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                authenticateAdmin(adminPassword.value);
            }
        });
    }
    
    // Şifre göster/gizle butonu
    if (togglePasswordBtn && adminPassword) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = adminPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            adminPassword.setAttribute('type', type);
            togglePasswordBtn.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    }
    
    // Yeni Ders Ekle butonu
    const addLessonBtn = document.getElementById('addLessonBtn');
    if (addLessonBtn) {
        addLessonBtn.addEventListener('click', () => openAddLessonModal());
    }
    
    // Yeni Kelime Ekle butonu
    const addWordBtn = document.getElementById('addWordBtn');
    if (addWordBtn) {
        addWordBtn.addEventListener('click', () => openAddWordModal());
    }
    
    // Kaydet butonları
    const saveLessonBtn = document.getElementById('saveLessonBtn');
    if (saveLessonBtn) {
        saveLessonBtn.addEventListener('click', () => saveLesson());
    }
    
    const saveWordBtn = document.getElementById('saveWordBtn');
    if (saveWordBtn) {
        saveWordBtn.addEventListener('click', () => saveWord());
    }
    
    // Admin şifresini kontrol et (önceki oturum)
    const storedAuth = sessionStorage.getItem('admin_auth');
    if (storedAuth === 'true') {
        adminAuthenticated = true;
        showAdminPanel();
        await loadAllLessonsForAdmin();
    }
}

function authenticateAdmin(password) {
    const ADMIN_PASSWORD = "admin123";
    
    console.log("Şifre kontrolü yapılıyor...");
    
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
    const lessonsRef = collection(db, 'lessons');
    const q = query(lessonsRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    
    lessons = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    displayLessonsForAdmin();
}

function displayLessonsForAdmin() {
    const container = document.getElementById('lessonsAdminList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (lessons.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px;">Henüz ders eklenmemiş. "Yeni Ders" butonuna tıklayın.</div>';
        return;
    }
    
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
                <button class="btn-success" onclick="window.selectLessonForWords('${lesson.id}', '${lesson.name.replace(/'/g, "\\'")}')"><i class="fas fa-words"></i> Kelimeler</button>
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
    
    // Kelimeleri yükle
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
    const modal = document.getElementById('lessonModal');
    const modalTitle = document.getElementById('lessonModalTitle');
    const editLessonId = document.getElementById('editLessonId');
    const lessonName = document.getElementById('lessonName');
    const lessonDesc = document.getElementById('lessonDesc');
    
    if (modalTitle) modalTitle.innerText = '➕ Yeni Ders Ekle';
    if (editLessonId) editLessonId.value = '';
    if (lessonName) lessonName.value = '';
    if (lessonDesc) lessonDesc.value = '';
    if (modal) modal.classList.remove('hidden');
}

function openAddWordModal() {
    if (!currentEditingLesson) {
        showNotification('⚠️ Lütfen önce bir ders seçin!');
        return;
    }
    
    const modal = document.getElementById('wordModal');
    const modalTitle = document.getElementById('modalTitle');
    const editWordId = document.getElementById('editWordId');
    const wordArabic = document.getElementById('wordArabic');
    const wordTurkish = document.getElementById('wordTurkish');
    
    if (modalTitle) modalTitle.innerText = '➕ Yeni Kelime Ekle';
    if (editWordId) editWordId.value = '';
    if (wordArabic) wordArabic.value = '';
    if (wordTurkish) wordTurkish.value = '';
    if (modal) modal.classList.remove('hidden');
}

function closeWordModal() {
    const modal = document.getElementById('wordModal');
    if (modal) modal.classList.add('hidden');
}

function closeLessonModal() {
    const modal = document.getElementById('lessonModal');
    if (modal) modal.classList.add('hidden');
}

async function saveLesson() {
    const lessonId = document.getElementById('editLessonId')?.value || '';
    const name = document.getElementById('lessonName')?.value.trim();
    const description = document.getElementById('lessonDesc')?.value.trim();
    
    if (!name) {
        showNotification('❌ Ders adı gerekli!');
        return;
    }
    
    try {
        if (lessonId) {
            await updateDoc(doc(db, 'lessons', lessonId), { name, description });
            showNotification('✅ Ders güncellendi!');
        } else {
            const lessonsRef = collection(db, 'lessons');
            const snapshot = await getDocs(lessonsRef);
            const order = snapshot.size + 1;
            
            const newLessonRef = doc(collection(db, 'lessons'));
            await setDoc(newLessonRef, { name, description, order });
            showNotification('✅ Yeni ders eklendi!');
        }
        
        closeLessonModal();
        await loadAllLessonsForAdmin();
    } catch (error) {
        console.error('Ders kaydetme hatası:', error);
        showNotification('❌ Hata: ' + error.message);
    }
}

async function saveWord() {
    const wordId = document.getElementById('editWordId')?.value || '';
    const arabic = document.getElementById('wordArabic')?.value.trim();
    const turkish = document.getElementById('wordTurkish')?.value.trim();
    
    if (!arabic || !turkish) {
        showNotification('❌ Arapça ve Türkçe kelime gerekli!');
        return;
    }
    
    if (!currentEditingLesson) {
        showNotification('❌ Lütfen önce bir ders seçin!');
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
        
        const lessonName = document.getElementById('currentLessonName')?.innerText || '';
        await selectLessonForWords(currentEditingLesson, lessonName);
    } catch (error) {
        console.error('Kelime kaydetme hatası:', error);
        showNotification('❌ Hata: ' + error.message);
    }
}

async function editLesson(lessonId) {
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return;
    
    const modal = document.getElementById('lessonModal');
    const modalTitle = document.getElementById('lessonModalTitle');
    const editLessonId = document.getElementById('editLessonId');
    const lessonName = document.getElementById('lessonName');
    const lessonDesc = document.getElementById('lessonDesc');
    
    if (modalTitle) modalTitle.innerText = '✏️ Ders Düzenle';
    if (editLessonId) editLessonId.value = lessonId;
    if (lessonName) lessonName.value = lesson.name;
    if (lessonDesc) lessonDesc.value = lesson.description || '';
    if (modal) modal.classList.remove('hidden');
}

async function deleteLesson(lessonId) {
    if (!confirm('⚠️ Bu dersi silmek istediğinize emin misiniz? İçindeki tüm kelimeler de silinecek!')) return;
    
    try {
        const wordsRef = collection(db, 'words');
        const q = query(wordsRef, where('lessonId', '==', lessonId));
        const snapshot = await getDocs(q);
        
        for (const docSnap of snapshot.docs) {
            await deleteDoc(doc(db, 'words', docSnap.id));
        }
        
        await deleteDoc(doc(db, 'lessons', lessonId));
        showNotification('✅ Ders silindi!');
        
        await loadAllLessonsForAdmin();
        
        if (currentEditingLesson === lessonId) {
            const wordsSection = document.getElementById('wordsSection');
            if (wordsSection) wordsSection.style.display = 'none';
            currentEditingLesson = null;
        }
    } catch (error) {
        console.error('Ders silme hatası:', error);
        showNotification('❌ Hata: ' + error.message);
    }
}

async function editWord(wordId) {
    if (!currentEditingLesson) {
        showNotification('❌ Lütfen önce bir ders seçin!');
        return;
    }
    
    try {
        const wordDoc = await getDoc(doc(db, 'words', wordId));
        if (!wordDoc.exists()) {
            showNotification('❌ Kelime bulunamadı!');
            return;
        }
        
        const word = wordDoc.data();
        
        const modal = document.getElementById('wordModal');
        const modalTitle = document.getElementById('modalTitle');
        const editWordId = document.getElementById('editWordId');
        const wordArabic = document.getElementById('wordArabic');
        const wordTurkish = document.getElementById('wordTurkish');
        
        if (modalTitle) modalTitle.innerText = '✏️ Kelime Düzenle';
        if (editWordId) editWordId.value = wordId;
        if (wordArabic) wordArabic.value = word.arabic;
        if (wordTurkish) wordTurkish.value = word.turkish;
        if (modal) modal.classList.remove('hidden');
    } catch (error) {
        console.error('Kelime yükleme hatası:', error);
        showNotification('❌ Hata: ' + error.message);
    }
}

async function deleteWord(wordId) {
    if (!confirm('⚠️ Bu kelimeyi silmek istediğinize emin misiniz?')) return;
    
    try {
        await deleteDoc(doc(db, 'words', wordId));
        showNotification('✅ Kelime silindi!');
        
        const lessonName = document.getElementById('currentLessonName')?.innerText || '';
        await selectLessonForWords(currentEditingLesson, lessonName);
    } catch (error) {
        console.error('Kelime silme hatası:', error);
        showNotification('❌ Hata: ' + error.message);
    }
}

function logoutAdmin() {
    sessionStorage.removeItem('admin_auth');
    adminAuthenticated = false;
    const adminLoginSection = document.getElementById('adminLoginSection');
    const adminPanel = document.getElementById('adminPanel');
    const adminPassword = document.getElementById('adminPassword');
    
    if (adminLoginSection) adminLoginSection.classList.remove('hidden');
    if (adminPanel) adminPanel.classList.add('hidden');
    if (adminPassword) adminPassword.value = '';
    showNotification('Admin çıkışı yapıldı');
}

// Global fonksiyonlar (HTML'den erişim için)
window.goToHome = goToHome;
window.goToLessons = goToLessons;
window.showWarning = showWarning;
window.toggleTheme = toggleTheme;
window.logout = logout;
window.editLesson = editLesson;
window.deleteLesson = deleteLesson;
window.editWord = editWord;
window.deleteWord = deleteWord;
window.selectLessonForWords = selectLessonForWords;
window.logoutAdmin = logoutAdmin;
window.openAddLessonModal = openAddLessonModal;
window.openAddWordModal = openAddWordModal;
window.closeWordModal = closeWordModal;
window.closeLessonModal = closeLessonModal;
window.saveLesson = saveLesson;
window.saveWord = saveWord;

// Sayfa yüklendiğinde admin panelini başlat
if (window.location.pathname.includes('admin.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        console.log("DOM yüklendi, admin panel başlatılıyor...");
        initAdminPage();
    });
}
