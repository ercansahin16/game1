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
    orderBy,
    limit
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
let currentBook = null;
let currentLesson = null;
let books = [];
let lessons = [];
let currentLessonWords = [];
let currentWordIndex = 0;
let currentWordList = [];

// Hadisler/Ayetler
const hadiths = [
    { text: "İlim öğrenmek her Müslüman'a farzdır.", source: "İbni Mace, Mukaddime, 17" },
    { text: "Kim ilim öğrenmek için bir yol tutarsa, Allah onu cennete giden bir yola iletir.", source: "Müslim, Zikir, 39" },
    { text: "Rahman olan Allah, Kur'an'ı öğreteni sever.", source: "Buhari, Tevhid, 33" },
    { text: "Sizin en hayırlınız, Kur'an'ı öğrenen ve öğretendir.", source: "Buhari, Fedailü'l-Kur'an, 21" },
    { text: "اِقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ", source: "Alak Suresi, 1. Ayet" },
    { text: "وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ", source: "Enbiya Suresi, 107. Ayet" }
];

// Ses
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;

// Admin panel değişkenleri
let adminAuthenticated = false;
let currentEditingBookId = null;
let currentEditingLessonId = null;
let moveType = null;
let moveItemId = null;
let moveCurrentParentId = null;

// ========== SAYFA YÜKLENME ==========

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM yüklendi");
    
    if (window.location.pathname.includes('admin.html')) {
        initAdminPage();
        return;
    }
    
    initUserPage();
});

// ========== KULLANICI SAYFASI ==========

function initUserPage() {
    window.menuBtn = document.getElementById('menuBtn');
    window.sideMenu = document.getElementById('sideMenu');
    window.menuOverlay = document.getElementById('menuOverlay');
    
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
    
    if (window.menuBtn) window.menuBtn.addEventListener('click', toggleMenu);
    if (window.menuOverlay) window.menuOverlay.addEventListener('click', toggleMenu);
    
    document.getElementById('loginBtn')?.addEventListener('click', () => handleLogin());
    document.getElementById('registerBtn')?.addEventListener('click', () => handleRegister());
    document.getElementById('forgotBtn')?.addEventListener('click', () => handleForgotPassword());
    document.getElementById('profileUpdateBtn')?.addEventListener('click', () => handleUpdatePassword());
    
    document.getElementById('showMeaningBtn')?.addEventListener('click', showMeaning);
    document.getElementById('nextWordBtn')?.addEventListener('click', nextWord);
    document.getElementById('soundBtn')?.addEventListener('click', playSound);
    document.getElementById('backToLessonsBtn')?.addEventListener('click', backToLessons);
    document.getElementById('backToBooksBtn')?.addEventListener('click', backToBooks);
    document.getElementById('backToHomeBtn')?.addEventListener('click', backToHome);
    
    document.getElementById('loginPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('registerPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRegister();
    });
    document.getElementById('forgotEmail')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleForgotPassword();
    });
    
    loadTheme();
    loadRandomHadith();
    
    auth.onAuthStateChanged(async (user) => {
        const loginSection = document.getElementById('loginSection');
        const learningSection = document.getElementById('learningSection');
        const menuBtn = document.getElementById('menuBtn');
        const userBadge = document.getElementById('userBadge');
        const menuUserName = document.getElementById('menuUserName');
        const userNameDisplay = document.getElementById('userNameDisplay');
        const profileName = document.getElementById('profileName');
        
        if (user) {
            currentUser = user;
            if (loginSection) loginSection.style.display = 'none';
            if (learningSection) learningSection.style.display = 'block';
            if (menuBtn) menuBtn.classList.remove('hidden');
            if (userBadge) userBadge.classList.remove('hidden');
            if (menuUserName) menuUserName.innerText = user.email.split('@')[0];
            if (userNameDisplay) userNameDisplay.innerText = user.email.split('@')[0];
            if (profileName) profileName.value = user.email.split('@')[0];
            
            await loadUserStats();
            await loadBooks();
            await loadRecentWords();
        } else {
            currentUser = null;
            if (loginSection) loginSection.style.display = 'flex';
            if (learningSection) learningSection.style.display = 'none';
            if (menuBtn) menuBtn.classList.add('hidden');
            if (userBadge) userBadge.classList.add('hidden');
        }
    });
}

function toggleMenu() {
    if (window.sideMenu) window.sideMenu.classList.toggle('open');
    if (window.menuOverlay) window.menuOverlay.classList.toggle('active');
}

function loadRandomHadith() {
    const randomIndex = Math.floor(Math.random() * hadiths.length);
    const hadith = hadiths[randomIndex];
    const hadithText = document.getElementById('hadithText');
    const hadithSource = document.getElementById('hadithSource');
    if (hadithText) hadithText.innerHTML = `"${hadith.text}"`;
    if (hadithSource) hadithSource.innerHTML = `- ${hadith.source}`;
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
    const icon = document.getElementById('themeIcon');
    if (icon) icon.className = document.body.classList.contains('dark-mode') ? 'fas fa-moon' : 'fas fa-sun';
}

async function loadUserStats() {
    if (!currentUser) return;
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
        const data = userDoc.data();
        const totalWords = document.getElementById('profileTotalWords');
        const completedLessons = document.getElementById('profileCompletedLessons');
        if (totalWords) totalWords.innerText = data.totalWordsViewed || 0;
        if (completedLessons) completedLessons.innerText = data.completedLessons?.length || 0;
    }
}

async function loadRecentWords() {
    const wordsRef = collection(db, 'words');
    const q = query(wordsRef, orderBy('createdAt', 'desc'), limit(10));
    const snapshot = await getDocs(q);
    const container = document.getElementById('recentWordsList');
    if (!container) return;
    container.innerHTML = '';
    snapshot.forEach(doc => {
        const word = doc.data();
        const div = document.createElement('div');
        div.className = 'recent-word-item';
        div.innerHTML = `<span>${word.arabic}</span><span>${word.turkish}</span>`;
        container.appendChild(div);
    });
}

async function loadBooks() {
    const booksRef = collection(db, 'books');
    const q = query(booksRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    displayBooks();
    
    const featuredGrid = document.getElementById('featuredBooksGrid');
    if (featuredGrid) {
        featuredGrid.innerHTML = '';
        books.slice(0, 4).forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.onclick = () => selectBook(book.id, book.name);
            card.innerHTML = `<i class="fas fa-book"></i><h4>${book.name}</h4><p>${book.description || ''}</p>`;
            featuredGrid.appendChild(card);
        });
    }
    
    const totalBooks = document.getElementById('totalBooksCount');
    if (totalBooks) totalBooks.innerText = books.length;
}

function displayBooks() {
    const container = document.getElementById('booksGrid');
    if (!container) return;
    container.innerHTML = '';
    books.forEach(book => {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.onclick = () => selectBook(book.id, book.name);
        card.innerHTML = `<i class="fas fa-book"></i><h4>${book.name}</h4><p>${book.description || ''}</p>`;
        container.appendChild(card);
    });
}

async function selectBook(bookId, bookName) {
    currentBook = bookId;
    const selectedBookName = document.getElementById('selectedBookName');
    if (selectedBookName) selectedBookName.innerText = bookName;
    document.getElementById('bookSelectArea').classList.add('hidden');
    document.getElementById('lessonSelectArea').classList.remove('hidden');
    
    const lessonsRef = collection(db, 'lessons');
    const q = query(lessonsRef, where('bookId', '==', bookId), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    lessons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const container = document.getElementById('lessonsGrid');
    if (container) {
        container.innerHTML = '';
        lessons.forEach(lesson => {
            const card = document.createElement('div');
            card.className = 'lesson-card';
            card.onclick = () => selectLesson(lesson.id);
            card.innerHTML = `<i class="fas fa-graduation-cap"></i><h4>${lesson.name}</h4><p>${lesson.description || ''}</p>`;
            container.appendChild(card);
        });
    }
}

async function selectLesson(lessonId) {
    currentLesson = lessonId;
    await loadLessonWords(lessonId);
    document.getElementById('lessonSelectArea').classList.add('hidden');
    document.getElementById('wordLearningArea').classList.remove('hidden');
    startLearningLesson();
}

async function loadLessonWords(lessonId) {
    const wordsRef = collection(db, 'words');
    const q = query(wordsRef, where('lessonId', '==', lessonId));
    const snapshot = await getDocs(q);
    currentLessonWords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const lessonWordCount = document.getElementById('lessonWordCount');
    if (lessonWordCount) lessonWordCount.innerText = currentLessonWords.length;
}

function startLearningLesson() {
    if (currentLessonWords.length === 0) {
        document.getElementById('arabicWord').innerText = "Bu derste henüz kelime yok";
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
    if (currentLessonWords.length === 0) return;
    const word = currentWordList[currentWordIndex];
    document.getElementById('arabicWord').innerText = word.arabic;
    document.getElementById('turkishWord').innerText = word.turkish;
    document.getElementById('turkishWord').classList.add('hidden');
    updateProgress();
}

function showMeaning() {
    document.getElementById('turkishWord').classList.remove('hidden');
    updateUserProgress();
}

function nextWord() {
    if (currentLessonWords.length === 0) return;
    currentWordIndex = (currentWordIndex + 1) % currentWordList.length;
    displayCurrentWord();
}

function playSound() {
    if (!currentWordList[currentWordIndex]) return;
    if (currentUtterance) speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentWordList[currentWordIndex].arabic);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.8;
    currentUtterance = utterance;
    speechSynthesis.speak(utterance);
}

function updateProgress() {
    const total = currentWordList.length;
    const percent = Math.round(((currentWordIndex + 1) / total) * 100);
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressPercent) progressPercent.innerText = `${percent}%`;
}

async function updateUserProgress() {
    if (!currentUser || !currentLesson) return;
    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
        const data = userDoc.data();
        await updateDoc(userRef, {
            totalWordsViewed: (data.totalWordsViewed || 0) + 1,
            lastActive: new Date().toISOString()
        });
    }
}

function backToLessons() {
    document.getElementById('lessonSelectArea').classList.remove('hidden');
    document.getElementById('wordLearningArea').classList.add('hidden');
    currentLesson = null;
    currentLessonWords = [];
}

function backToBooks() {
    document.getElementById('bookSelectArea').classList.remove('hidden');
    document.getElementById('lessonSelectArea').classList.add('hidden');
    currentBook = null;
}

function backToHome() {
    document.getElementById('homeSection').classList.remove('hidden');
    document.getElementById('bookSelectArea').classList.add('hidden');
    document.getElementById('lessonSelectArea').classList.add('hidden');
    document.getElementById('wordLearningArea').classList.add('hidden');
    document.getElementById('profileSection').classList.add('hidden');
    loadRandomHadith();
    loadRecentWords();
}

// ========== AUTH FONKSİYONLARI ==========

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) { showNotification('Lütfen e-posta ve şifre girin!'); return; }
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showNotification('✅ Giriş başarılı!');
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
    } catch (error) {
        if (error.code === 'auth/user-not-found') showNotification('Bu e-posta ile kayıtlı kullanıcı bulunamadı!');
        else if (error.code === 'auth/wrong-password') showNotification('Hatalı şifre!');
        else showNotification('Hata: ' + error.message);
    }
}

async function handleRegister() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    if (!name || !email || !password) { showNotification('Lütfen tüm alanları doldurun!'); return; }
    if (password.length < 6) { showNotification('Şifre en az 6 karakter olmalı!'); return; }
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            name: name, email: email, selectedLessons: [], completedLessons: [],
            totalWordsViewed: 0, createdAt: new Date().toISOString(), lastActive: new Date().toISOString()
        });
        showFlowerNotification(`🌸 Hoş geldiniz ${name}! Allah'ı tanımaya geldiniz. 🌸`);
        document.getElementById('registerName').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.querySelector('.tab-btn[data-tab="login"]')?.click();
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') showNotification('Bu e-posta zaten kullanılıyor!');
        else showNotification('Hata: ' + error.message);
    }
}

async function handleForgotPassword() {
    const email = document.getElementById('forgotEmail').value.trim();
    if (!email) { showNotification('Lütfen e-posta adresinizi girin!'); return; }
    try {
        await sendPasswordResetEmail(auth, email);
        showNotification('✅ Şifre sıfırlama bağlantısı e-posta adresinize gönderildi!');
        document.getElementById('forgotEmail').value = '';
    } catch (error) {
        if (error.code === 'auth/user-not-found') showNotification('Bu e-posta ile kayıtlı kullanıcı bulunamadı!');
        else showNotification('Hata: ' + error.message);
    }
}

async function handleUpdatePassword() {
    const newPassword = document.getElementById('profileNewPassword').value;
    if (!newPassword || newPassword.length < 6) { showNotification('Şifre en az 6 karakter olmalı!'); return; }
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
        if (window.sideMenu) window.sideMenu.classList.remove('open');
        if (window.menuOverlay) window.menuOverlay.classList.remove('active');
    } catch (error) { console.error(error); }
}

// ========== BİLDİRİM ==========

function showNotification(msg) {
    const notif = document.getElementById('notification');
    const notifMsg = document.getElementById('notificationMsg');
    if (notif && notifMsg) {
        notifMsg.innerText = msg;
        notif.classList.remove('hidden');
        setTimeout(() => notif.classList.add('hidden'), 3000);
    } else { alert(msg); }
}

function showFlowerNotification(msg) {
    const notif = document.getElementById('notification');
    const notifMsg = document.getElementById('notificationMsg');
    if (notif && notifMsg) {
        notifMsg.innerText = msg;
        notif.classList.remove('hidden');
        setTimeout(() => notif.classList.add('hidden'), 4000);
    } else { alert(msg); }
}

// ========== GLOBAL FONKSİYONLAR ==========

window.goToHome = function() {
    document.getElementById('homeSection')?.classList.remove('hidden');
    document.getElementById('bookSelectArea')?.classList.add('hidden');
    document.getElementById('lessonSelectArea')?.classList.add('hidden');
    document.getElementById('wordLearningArea')?.classList.add('hidden');
    document.getElementById('profileSection')?.classList.add('hidden');
    if (window.sideMenu) window.sideMenu.classList.remove('open');
    if (window.menuOverlay) window.menuOverlay.classList.remove('active');
    loadRandomHadith();
    loadRecentWords();
};

window.goToBooks = function() {
    document.getElementById('homeSection')?.classList.add('hidden');
    document.getElementById('bookSelectArea')?.classList.remove('hidden');
    document.getElementById('lessonSelectArea')?.classList.add('hidden');
    document.getElementById('wordLearningArea')?.classList.add('hidden');
    document.getElementById('profileSection')?.classList.add('hidden');
    if (window.sideMenu) window.sideMenu.classList.remove('open');
    if (window.menuOverlay) window.menuOverlay.classList.remove('active');
    loadBooks();
};

window.showProfile = function() {
    document.getElementById('homeSection')?.classList.add('hidden');
    document.getElementById('bookSelectArea')?.classList.add('hidden');
    document.getElementById('lessonSelectArea')?.classList.add('hidden');
    document.getElementById('wordLearningArea')?.classList.add('hidden');
    document.getElementById('profileSection')?.classList.remove('hidden');
    if (window.sideMenu) window.sideMenu.classList.remove('open');
    if (window.menuOverlay) window.menuOverlay.classList.remove('active');
    const profileEmail = document.getElementById('profileEmail');
    if (profileEmail && currentUser) profileEmail.value = currentUser.email;
};

window.showWarning = function() {
    showNotification('⚠️ DİKKAT! Eğer profilin size ait olmadığını düşünüyorsanız lütfen çıkış yapın. Saygılar. 🌸');
    if (window.sideMenu) window.sideMenu.classList.remove('open');
    if (window.menuOverlay) window.menuOverlay.classList.remove('active');
};

window.toggleTheme = function() {
    if (document.body.classList.contains('dark-mode')) {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    }
    const icon = document.getElementById('themeIcon');
    if (icon) icon.className = document.body.classList.contains('dark-mode') ? 'fas fa-moon' : 'fas fa-sun';
    if (window.sideMenu) window.sideMenu.classList.remove('open');
    if (window.menuOverlay) window.menuOverlay.classList.remove('active');
};

window.logout = logout;

// ========== ADMIN PANEL ==========

async function initAdminPage() {
    console.log("Admin sayfası başlatılıyor...");
    
    document.getElementById('adminLoginBtn')?.addEventListener('click', () => {
        authenticateAdmin(document.getElementById('adminPassword').value);
    });
    document.getElementById('adminPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') authenticateAdmin(e.target.value);
    });
    document.getElementById('togglePasswordBtn')?.addEventListener('click', () => {
        const input = document.getElementById('adminPassword');
        const btn = document.getElementById('togglePasswordBtn');
        if (input.type === 'password') {
            input.type = 'text';
            btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            input.type = 'password';
            btn.innerHTML = '<i class="fas fa-eye"></i>';
        }
    });
    
    document.getElementById('addBookBtn')?.addEventListener('click', () => openBookModal());
    document.getElementById('addLessonBtn')?.addEventListener('click', () => openLessonModal());
    document.getElementById('addWordBtn')?.addEventListener('click', () => openWordModal());
    document.getElementById('saveBookBtn')?.addEventListener('click', () => saveBook());
    document.getElementById('saveLessonBtn')?.addEventListener('click', () => saveLesson());
    document.getElementById('saveWordBtn')?.addEventListener('click', () => saveWord());
    document.getElementById('refreshUsersBtn')?.addEventListener('click', () => loadAllUsers());
    document.getElementById('moveLessonBtn')?.addEventListener('click', () => openMoveModal('lesson'));
    document.getElementById('moveWordBtn')?.addEventListener('click', () => openMoveModal('word'));
    document.getElementById('confirmMoveBtn')?.addEventListener('click', () => confirmMove());
    document.getElementById('themeBtn')?.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        document.body.classList.toggle('dark-mode');
    });
    document.getElementById('logoutAdminBtn')?.addEventListener('click', logoutAdmin);
    
    const storedAuth = sessionStorage.getItem('admin_auth');
    if (storedAuth === 'true') {
        adminAuthenticated = true;
        showAdminPanel();
        await loadAllBooks();
        await loadAllUsers();
    }
}

function authenticateAdmin(password) {
    if (password === "admin123") {
        adminAuthenticated = true;
        sessionStorage.setItem('admin_auth', 'true');
        showAdminPanel();
        loadAllBooks();
        loadAllUsers();
        showNotification('✅ Admin girişi başarılı!');
    } else {
        showNotification('❌ Hatalı şifre!');
    }
}

function showAdminPanel() {
    document.getElementById('adminLoginSection').classList.add('hidden');
    document.getElementById('adminPanel').classList.remove('hidden');
}

async function loadAllBooks() {
    const booksRef = collection(db, 'books');
    const q = query(booksRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const container = document.getElementById('booksAdminList');
    if (container) {
        container.innerHTML = '';
        books.forEach(book => {
            const div = document.createElement('div');
            div.className = 'book-admin-item';
            div.innerHTML = `
                <div class="book-info"><h4>${book.name}</h4><p>${book.description || ''} | Sıra: ${book.order || 0}</p></div>
                <div class="book-actions">
                    <button class="btn-warning" onclick="window.editBook('${book.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-info" onclick="window.selectBookForLessons('${book.id}', '${book.name.replace(/'/g, "\\'")}')"><i class="fas fa-book-open"></i> Dersler</button>
                    <button class="btn-danger" onclick="window.deleteBook('${book.id}')"><i class="fas fa-trash"></i></button>
                </div>
            `;
            container.appendChild(div);
        });
    }
}

window.selectBookForLessons = async (bookId, bookName) => {
    currentEditingBookId = bookId;
    document.getElementById('currentBookName').innerText = bookName;
    document.getElementById('lessonsSection').style.display = 'block';
    document.getElementById('moveLessonBtn').style.display = 'inline-flex';
    
    const lessonsRef = collection(db, 'lessons');
    const q = query(lessonsRef, where('bookId', '==', bookId), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    const lessonsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const container = document.getElementById('lessonsAdminList');
    if (container) {
        container.innerHTML = '';
        lessonsList.forEach(lesson => {
            const div = document.createElement('div');
            div.className = 'lesson-admin-item';
            div.innerHTML = `
                <div class="lesson-info"><h4>${lesson.name}</h4><p>${lesson.description || ''} | Sıra: ${lesson.order || 0}</p></div>
                <div class="lesson-actions">
                    <button class="btn-warning" onclick="window.editLesson('${lesson.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-info" onclick="window.selectLessonForWords('${lesson.id}', '${lesson.name.replace(/'/g, "\\'")}')"><i class="fas fa-words"></i> Kelimeler</button>
                    <button class="btn-danger" onclick="window.deleteLesson('${lesson.id}')"><i class="fas fa-trash"></i></button>
                </div>
            `;
            container.appendChild(div);
        });
    }
};

window.selectLessonForWords = async (lessonId, lessonName) => {
    currentEditingLessonId = lessonId;
    document.getElementById('currentLessonName').innerText = lessonName;
    document.getElementById('wordsSection').style.display = 'block';
    document.getElementById('moveWordBtn').style.display = 'inline-flex';
    
    const wordsRef = collection(db, 'words');
    const q = query(wordsRef, where('lessonId', '==', lessonId));
    const snapshot = await getDocs(q);
    const wordsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const container = document.getElementById('wordsAdminList');
    if (container) {
        container.innerHTML = '';
        wordsList.forEach(word => {
            const div = document.createElement('div');
            div.className = 'word-admin-item';
            div.innerHTML = `
                <div class="word-info"><div class="word-arabic">${word.arabic}</div><div class="word-turkish">${word.turkish}</div></div>
                <div class="word-actions">
                    <button class="btn-warning" onclick="window.editWord('${word.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-danger" onclick="window.deleteWord('${word.id}')"><i class="fas fa-trash"></i></button>
                </div>
            `;
            container.appendChild(div);
        });
    }
};

function openBookModal(bookId = null) {
    if (bookId) {
        const book = books.find(b => b.id === bookId);
        if (book) {
            document.getElementById('bookModalTitle').innerText = 'Kitap Düzenle';
            document.getElementById('editBookId').value = bookId;
            document.getElementById('bookName').value = book.name;
            document.getElementById('bookDesc').value = book.description || '';
            document.getElementById('bookOrder').value = book.order || 0;
        }
    } else {
        document.getElementById('bookModalTitle').innerText = 'Yeni Kitap Ekle';
        document.getElementById('editBookId').value = '';
        document.getElementById('bookName').value = '';
        document.getElementById('bookDesc').value = '';
        document.getElementById('bookOrder').value = books.length + 1;
    }
    document.getElementById('bookModal').classList.remove('hidden');
}

function openLessonModal(lessonId = null) {
    if (!currentEditingBookId) { showNotification('Lütfen önce bir kitap seçin!'); return; }
    if (lessonId) {
        document.getElementById('lessonModalTitle').innerText = 'Ders Düzenle';
        document.getElementById('editLessonId').value = lessonId;
    } else {
        document.getElementById('lessonModalTitle').innerText = 'Yeni Ders Ekle';
        document.getElementById('editLessonId').value = '';
        document.getElementById('lessonName').value = '';
        document.getElementById('lessonDesc').value = '';
        document.getElementById('lessonOrder').value = 1;
    }
    document.getElementById('currentBookIdForLesson').value = currentEditingBookId;
    document.getElementById('lessonModal').classList.remove('hidden');
}

function openWordModal(wordId = null) {
    if (!currentEditingLessonId) { showNotification('Lütfen önce bir ders seçin!'); return; }
    if (wordId) {
        document.getElementById('wordModalTitle').innerText = 'Kelime Düzenle';
        document.getElementById('editWordId').value = wordId;
    } else {
        document.getElementById('wordModalTitle').innerText = 'Yeni Kelime Ekle';
        document.getElementById('editWordId').value = '';
        document.getElementById('wordArabic').value = '';
        document.getElementById('wordTurkish').value = '';
    }
    document.getElementById('currentLessonIdForWord').value = currentEditingLessonId;
    document.getElementById('wordModal').classList.remove('hidden');
}

window.closeBookModal = () => document.getElementById('bookModal').classList.add('hidden');
window.closeLessonModal = () => document.getElementById('lessonModal').classList.add('hidden');
window.closeWordModal = () => document.getElementById('wordModal').classList.add('hidden');
window.closeMoveModal = () => document.getElementById('moveModal').classList.add('hidden');

async function saveBook() {
    const bookId = document.getElementById('editBookId').value;
    const name = document.getElementById('bookName').value.trim();
    const description = document.getElementById('bookDesc').value.trim();
    const order = parseInt(document.getElementById('bookOrder').value) || 0;
    if (!name) { showNotification('Kitap adı gerekli!'); return; }
    try {
        if (bookId) {
            await updateDoc(doc(db, 'books', bookId), { name, description, order });
            showNotification('Kitap güncellendi!');
        } else {
            await setDoc(doc(collection(db, 'books')), { name, description, order });
            showNotification('Yeni kitap eklendi!');
        }
        closeBookModal();
        await loadAllBooks();
    } catch (error) { showNotification('Hata: ' + error.message); }
}

async function saveLesson() {
    const lessonId = document.getElementById('editLessonId').value;
    const name = document.getElementById('lessonName').value.trim();
    const description = document.getElementById('lessonDesc').value.trim();
    const order = parseInt(document.getElementById('lessonOrder').value) || 0;
    const bookId = document.getElementById('currentBookIdForLesson').value;
    if (!name) { showNotification('Ders adı gerekli!'); return; }
    try {
        if (lessonId) {
            await updateDoc(doc(db, 'lessons', lessonId), { name, description, order, bookId });
            showNotification('Ders güncellendi!');
        } else {
            await setDoc(doc(collection(db, 'lessons')), { name, description, order, bookId });
            showNotification('Yeni ders eklendi!');
        }
        closeLessonModal();
        await window.selectBookForLessons(bookId, document.getElementById('currentBookName').innerText);
    } catch (error) { showNotification('Hata: ' + error.message); }
}

async function saveWord() {
    const wordId = document.getElementById('editWordId').value;
    const arabic = document.getElementById('wordArabic').value.trim();
    const turkish = document.getElementById('wordTurkish').value.trim();
    const lessonId = document.getElementById('currentLessonIdForWord').value;
    if (!arabic || !turkish) { showNotification('Her iki alan da gerekli!'); return; }
    try {
        if (wordId) {
            await updateDoc(doc(db, 'words', wordId), { arabic, turkish });
            showNotification('Kelime güncellendi!');
        } else {
            await setDoc(doc(collection(db, 'words')), { arabic, turkish, lessonId, createdAt: new Date().toISOString() });
            showNotification('Yeni kelime eklendi!');
        }
        closeWordModal();
        await window.selectLessonForWords(lessonId, document.getElementById('currentLessonName').innerText);
    } catch (error) { showNotification('Hata: ' + error.message); }
}

window.editBook = async (id) => openBookModal(id);
window.editLesson = async (id) => openLessonModal(id);
window.editWord = async (id) => openWordModal(id);

window.deleteBook = async (id) => {
    if (!confirm('Bu kitabı silmek istediğinize emin misiniz?')) return;
    try {
        const lessonsRef = collection(db, 'lessons');
        const q = query(lessonsRef, where('bookId', '==', id));
        const snapshot = await getDocs(q);
        for (const lessonDoc of snapshot.docs) {
            const wordsRef = collection(db, 'words');
            const wq = query(wordsRef, where('lessonId', '==', lessonDoc.id));
            const wSnapshot = await getDocs(wq);
            for (const wordDoc of wSnapshot.docs) await deleteDoc(doc(db, 'words', wordDoc.id));
            await deleteDoc(doc(db, 'lessons', lessonDoc.id));
        }
        await deleteDoc(doc(db, 'books', id));
        showNotification('Kitap silindi!');
        await loadAllBooks();
        if (currentEditingBookId === id) {
            document.getElementById('lessonsSection').style.display = 'none';
            document.getElementById('wordsSection').style.display = 'none';
        }
    } catch (error) { showNotification('Hata: ' + error.message); }
};

window.deleteLesson = async (id) => {
    if (!confirm('Bu dersi silmek istediğinize emin misiniz?')) return;
    try {
        const wordsRef = collection(db, 'words');
        const q = query(wordsRef, where('lessonId', '==', id));
        const snapshot = await getDocs(q);
        for (const wordDoc of snapshot.docs) await deleteDoc(doc(db, 'words', wordDoc.id));
        await deleteDoc(doc(db, 'lessons', id));
        showNotification('Ders silindi!');
        await window.selectBookForLessons(currentEditingBookId, document.getElementById('currentBookName').innerText);
    } catch (error) { showNotification('Hata: ' + error.message); }
};

window.deleteWord = async (id) => {
    if (!confirm('Bu kelimeyi silmek istediğinize emin misiniz?')) return;
    try {
        await deleteDoc(doc(db, 'words', id));
        showNotification('Kelime silindi!');
        await window.selectLessonForWords(currentEditingLessonId, document.getElementById('currentLessonName').innerText);
    } catch (error) { showNotification('Hata: ' + error.message); }
};

function openMoveModal(type) {
    moveType = type;
    if (type === 'lesson') {
        if (!currentEditingLessonId) { showNotification('Lütfen önce taşınacak dersi seçin!'); return; }
        moveItemId = currentEditingLessonId;
        moveCurrentParentId = currentEditingBookId;
        document.getElementById('moveModalTitle').innerText = 'Dersi Taşı';
        document.getElementById('moveItemLabel').innerText = 'Hedef Kitap:';
    } else {
        if (!currentEditingWordId) { showNotification('Lütfen önce taşınacak kelimeyi seçin!'); return; }
        moveItemId = currentEditingWordId;
        moveCurrentParentId = currentEditingLessonId;
        document.getElementById('moveModalTitle').innerText = 'Kelimeyi Taşı';
        document.getElementById('moveItemLabel').innerText = 'Hedef Ders:';
    }
    document.getElementById('moveModal').classList.remove('hidden');
    loadMoveTargets();
}

async function loadMoveTargets() {
    const select = document.getElementById('moveTargetSelect');
    select.innerHTML = '<option value="">Yükleniyor...</option>';
    if (moveType === 'lesson') {
        const booksRef = collection(db, 'books');
        const snapshot = await getDocs(booksRef);
        select.innerHTML = '';
        snapshot.docs.forEach(doc => {
            if (doc.id !== moveCurrentParentId) {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().name;
                select.appendChild(option);
            }
        });
    } else {
        const lessonsRef = collection(db, 'lessons');
        const q = query(lessonsRef, where('bookId', '==', currentEditingBookId));
        const snapshot = await getDocs(q);
        select.innerHTML = '';
        snapshot.docs.forEach(doc => {
            if (doc.id !== moveCurrentParentId) {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().name;
                select.appendChild(option);
            }
        });
    }
}

async function confirmMove() {
    const targetId = document.getElementById('moveTargetSelect').value;
    if (!targetId) { showNotification('Lütfen bir hedef seçin!'); return; }
    try {
        if (moveType === 'lesson') {
            await updateDoc(doc(db, 'lessons', moveItemId), { bookId: targetId });
            showNotification('Ders taşındı!');
            await window.selectBookForLessons(targetId, document.getElementById('currentBookName').innerText);
        } else {
            await updateDoc(doc(db, 'words', moveItemId), { lessonId: targetId });
            showNotification('Kelime taşındı!');
            await window.selectLessonForWords(targetId, document.getElementById('currentLessonName').innerText);
        }
        closeMoveModal();
    } catch (error) { showNotification('Hata: ' + error.message); }
}

async function loadAllUsers() {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    document.getElementById('totalUsersCount').innerText = users.length;
    let totalWords = 0;
    users.forEach(u => totalWords += u.totalWordsViewed || 0);
    document.getElementById('totalWordsViewed').innerText = totalWords;
    const tbody = document.getElementById('usersTableBody');
    if (tbody) {
        tbody.innerHTML = '';
        for (const user of users) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name || '-'}</td><td>${user.email}</td>
                <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR') : '-'}</td>
                <td>${user.selectedLessons?.length || 0}</td>
                <td class="user-word-count">${user.totalWordsViewed || 0}</td>
                <td>${user.lastActive ? new Date(user.lastActive).toLocaleDateString('tr-TR') : '-'}</td>
            `;
            tbody.appendChild(row);
        }
    }
}

function logoutAdmin() {
    sessionStorage.removeItem('admin_auth');
    adminAuthenticated = false;
    document.getElementById('adminLoginSection').classList.remove('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
    document.getElementById('adminPassword').value = '';
    showNotification('Admin çıkışı yapıldı');
}
