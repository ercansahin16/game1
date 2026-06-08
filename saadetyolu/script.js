
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updatePassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

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

let currentUser = null;
let currentBook = null;
let currentLesson = null;
let books = [];
let lessons = [];
let currentLessonWords = [];
let currentWordIndex = 0;
let currentWordList = [];

const hadiths = [
    { text: "İlim öğrenmek her Müslüman'a farzdır.", source: "İbni Mace, Mukaddime, 17" },
    { text: "Kim ilim öğrenmek için bir yol tutarsa, Allah onu cennete giden bir yola iletir.", source: "Müslim, Zikir, 39" }
];

let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let adminAuthenticated = false;
let currentEditingBookId = null;
let currentEditingLessonId = null;
let moveType = null;
let moveItemId = null;
let moveCurrentParentId = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM yüklendi");
    if (window.location.pathname.includes('admin.html')) {
        initAdminPage();
        return;
    }
    initUserPage();
});

function initUserPage() {
    window.sideMenu = document.getElementById('sideMenu');
    window.menuOverlay = document.getElementById('menuOverlay');
    document.getElementById('menuBtn')?.addEventListener('click', () => {
        window.sideMenu?.classList.toggle('open');
        window.menuOverlay?.classList.toggle('active');
    });
    document.getElementById('menuOverlay')?.addEventListener('click', () => {
        window.sideMenu?.classList.remove('open');
        window.menuOverlay?.classList.remove('active');
    });
    
    document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
    document.getElementById('registerBtn')?.addEventListener('click', handleRegister);
    document.getElementById('forgotBtn')?.addEventListener('click', handleForgotPassword);
    document.getElementById('profileUpdateBtn')?.addEventListener('click', handleUpdatePassword);
    document.getElementById('showMeaningBtn')?.addEventListener('click', showMeaning);
    document.getElementById('nextWordBtn')?.addEventListener('click', nextWord);
    document.getElementById('soundBtn')?.addEventListener('click', playSound);
    document.getElementById('backToLessonsBtn')?.addEventListener('click', backToLessons);
    document.getElementById('backToBooksBtn')?.addEventListener('click', backToBooks);
    document.getElementById('backToHomeBtn')?.addEventListener('click', backToHome);
    
    loadTheme();
    loadRandomHadith();
    
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('learningSection').style.display = 'block';
            document.getElementById('menuBtn').classList.remove('hidden');
            document.getElementById('userBadge').classList.remove('hidden');
            document.getElementById('menuUserName').innerText = user.email.split('@')[0];
            document.getElementById('userNameDisplay').innerText = user.email.split('@')[0];
            document.getElementById('profileName').value = user.email.split('@')[0];
            await loadBooks();
            await loadRecentWords();
        } else {
            currentUser = null;
            document.getElementById('loginSection').style.display = 'flex';
            document.getElementById('learningSection').style.display = 'none';
            document.getElementById('menuBtn').classList.add('hidden');
            document.getElementById('userBadge').classList.add('hidden');
        }
    });
}

function loadRandomHadith() {
    const r = Math.floor(Math.random() * hadiths.length);
    document.getElementById('hadithText').innerHTML = `"${hadiths[r].text}"`;
    document.getElementById('hadithSource').innerHTML = `- ${hadiths[r].source}`;
}

function loadTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
    }
    const icon = document.getElementById('themeIcon');
    if (icon) icon.className = document.body.classList.contains('dark-mode') ? 'fas fa-moon' : 'fas fa-sun';
}

async function loadRecentWords() {
    const q = query(collection(db, 'words'), orderBy('createdAt', 'desc'), limit(10));
    const snapshot = await getDocs(q);
    const container = document.getElementById('recentWordsList');
    if (container) {
        container.innerHTML = '';
        snapshot.forEach(doc => {
            const w = doc.data();
            const div = document.createElement('div');
            div.className = 'recent-word-item';
            div.innerHTML = `<span>${w.arabic}</span><span>${w.turkish}</span>`;
            container.appendChild(div);
        });
    }
}

async function loadBooks() {
    const snapshot = await getDocs(query(collection(db, 'books'), orderBy('order', 'asc')));
    books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const container = document.getElementById('booksGrid');
    if (container) {
        container.innerHTML = '';
        books.forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.onclick = () => selectBook(book.id, book.name);
            card.innerHTML = `<i class="fas fa-book"></i><h4>${book.name}</h4><p>${book.description || ''}</p>`;
            container.appendChild(card);
        });
    }
    const featured = document.getElementById('featuredBooksGrid');
    if (featured) {
        featured.innerHTML = '';
        books.slice(0, 4).forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.onclick = () => selectBook(book.id, book.name);
            card.innerHTML = `<i class="fas fa-book"></i><h4>${book.name}</h4><p>${book.description || ''}</p>`;
            featured.appendChild(card);
        });
    }
    document.getElementById('totalBooksCount').innerText = books.length;
}

async function selectBook(bookId, bookName) {
    currentBook = bookId;
    document.getElementById('selectedBookName').innerText = bookName;
    document.getElementById('bookSelectArea').classList.add('hidden');
    document.getElementById('lessonSelectArea').classList.remove('hidden');
    const snapshot = await getDocs(query(collection(db, 'lessons'), where('bookId', '==', bookId), orderBy('order', 'asc')));
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
    const snapshot = await getDocs(query(collection(db, 'words'), where('lessonId', '==', lessonId)));
    currentLessonWords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    document.getElementById('lessonWordCount').innerText = currentLessonWords.length;
    document.getElementById('lessonSelectArea').classList.add('hidden');
    document.getElementById('wordLearningArea').classList.remove('hidden');
    startLearningLesson();
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
    const total = currentWordList.length;
    const percent = Math.round(((currentWordIndex + 1) / total) * 100);
    document.getElementById('progressFill').style.width = `${percent}%`;
    document.getElementById('progressPercent').innerText = `${percent}%`;
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

async function updateUserProgress() {
    if (!currentUser || !currentLesson) return;
    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
        const data = userDoc.data();
        await updateDoc(userRef, { totalWordsViewed: (data.totalWordsViewed || 0) + 1, lastActive: new Date().toISOString() });
    }
}

function backToLessons() {
    document.getElementById('lessonSelectArea').classList.remove('hidden');
    document.getElementById('wordLearningArea').classList.add('hidden');
    currentLesson = null;
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
        showNotification(error.code === 'auth/user-not-found' ? 'Bu e-posta ile kayıtlı kullanıcı bulunamadı!' : (error.code === 'auth/wrong-password' ? 'Hatalı şifre!' : 'Hata: ' + error.message));
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
        await setDoc(doc(db, 'users', userCredential.user.uid), { name, email, selectedLessons: [], completedLessons: [], totalWordsViewed: 0, createdAt: new Date().toISOString(), lastActive: new Date().toISOString() });
        showFlowerNotification(`🌸 Hoş geldiniz ${name}! Allah'ı tanımaya geldiniz. 🌸`);
        document.getElementById('registerName').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.querySelector('.tab-btn[data-tab="login"]')?.click();
    } catch (error) {
        showNotification(error.code === 'auth/email-already-in-use' ? 'Bu e-posta zaten kullanılıyor!' : 'Hata: ' + error.message);
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
        showNotification(error.code === 'auth/user-not-found' ? 'Bu e-posta ile kayıtlı kullanıcı bulunamadı!' : 'Hata: ' + error.message);
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

function showNotification(msg) {
    const n = document.getElementById('notification');
    const m = document.getElementById('notificationMsg');
    if (n && m) { m.innerText = msg; n.classList.remove('hidden'); setTimeout(() => n.classList.add('hidden'), 3000); } else { alert(msg); }
}

function showFlowerNotification(msg) {
    const n = document.getElementById('notification');
    const m = document.getElementById('notificationMsg');
    if (n && m) { m.innerText = msg; n.classList.remove('hidden'); setTimeout(() => n.classList.add('hidden'), 4000); } else { alert(msg); }
}

window.goToHome = function() {
    document.getElementById('homeSection')?.classList.remove('hidden');
    document.getElementById('bookSelectArea')?.classList.add('hidden');
    document.getElementById('lessonSelectArea')?.classList.add('hidden');
    document.getElementById('wordLearningArea')?.classList.add('hidden');
    document.getElementById('profileSection')?.classList.add('hidden');
    window.sideMenu?.classList.remove('open');
    window.menuOverlay?.classList.remove('active');
    loadRandomHadith();
    loadRecentWords();
};

window.goToBooks = function() {
    document.getElementById('homeSection')?.classList.add('hidden');
    document.getElementById('bookSelectArea')?.classList.remove('hidden');
    document.getElementById('lessonSelectArea')?.classList.add('hidden');
    document.getElementById('wordLearningArea')?.classList.add('hidden');
    document.getElementById('profileSection')?.classList.add('hidden');
    window.sideMenu?.classList.remove('open');
    window.menuOverlay?.classList.remove('active');
    loadBooks();
};

window.showProfile = function() {
    document.getElementById('homeSection')?.classList.add('hidden');
    document.getElementById('bookSelectArea')?.classList.add('hidden');
    document.getElementById('lessonSelectArea')?.classList.add('hidden');
    document.getElementById('wordLearningArea')?.classList.add('hidden');
    document.getElementById('profileSection')?.classList.remove('hidden');
    window.sideMenu?.classList.remove('open');
    window.menuOverlay?.classList.remove('active');
    document.getElementById('profileEmail').value = currentUser?.email || '';
};

window.showWarning = function() {
    showNotification('⚠️ DİKKAT! Profilin size ait değilse çıkış yapın. Saygılar. 🌸');
    window.sideMenu?.classList.remove('open');
    window.menuOverlay?.classList.remove('active');
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
    window.sideMenu?.classList.remove('open');
    window.menuOverlay?.classList.remove('active');
};

window.logout = async function() {
    try { await signOut(auth); showNotification('🌸 Çıkış yapıldı. Yine bekleriz! 🌸'); } catch(e) { console.error(e); }
};

async function initAdminPage() {
    document.getElementById('adminLoginBtn')?.addEventListener('click', () => {
        if (document.getElementById('adminPassword').value === "admin123") {
            sessionStorage.setItem('admin_auth', 'true');
            document.getElementById('adminLoginSection').classList.add('hidden');
            document.getElementById('adminPanel').classList.remove('hidden');
            loadAllBooks();
            loadAllUsers();
            showNotification('✅ Admin girişi başarılı!');
        } else { showNotification('❌ Hatalı şifre!'); }
    });
    document.getElementById('adminPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('adminLoginBtn').click();
    });
    document.getElementById('togglePasswordBtn')?.addEventListener('click', () => {
        const input = document.getElementById('adminPassword');
        const btn = document.getElementById('togglePasswordBtn');
        if (input.type === 'password') { input.type = 'text'; btn.innerHTML = '<i class="fas fa-eye-slash"></i>'; }
        else { input.type = 'password'; btn.innerHTML = '<i class="fas fa-eye"></i>'; }
    });
    document.getElementById('addBookBtn')?.addEventListener('click', () => openBookModal());
    document.getElementById('addLessonBtn')?.addEventListener('click', () => openLessonModal());
    document.getElementById('addWordBtn')?.addEventListener('click', () => openWordModal());
    document.getElementById('saveBookBtn')?.addEventListener('click', saveBook);
    document.getElementById('saveLessonBtn')?.addEventListener('click', saveLesson);
    document.getElementById('saveWordBtn')?.addEventListener('click', saveWord);
    document.getElementById('refreshUsersBtn')?.addEventListener('click', loadAllUsers);
    document.getElementById('moveLessonBtn')?.addEventListener('click', () => openMoveModal('lesson'));
    document.getElementById('moveWordBtn')?.addEventListener('click', () => openMoveModal('word'));
    document.getElementById('confirmMoveBtn')?.addEventListener('click', confirmMove);
    document.getElementById('themeBtn')?.addEventListener('click', () => window.toggleTheme());
    document.getElementById('logoutAdminBtn')?.addEventListener('click', () => {
        sessionStorage.removeItem('admin_auth');
        document.getElementById('adminLoginSection').classList.remove('hidden');
        document.getElementById('adminPanel').classList.add('hidden');
        document.getElementById('adminPassword').value = '';
        showNotification('Admin çıkışı yapıldı');
    });
    if (sessionStorage.getItem('admin_auth') === 'true') {
        document.getElementById('adminLoginSection').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
        loadAllBooks();
        loadAllUsers();
        initAdminMenu();
    }
}

async function loadAllBooks() {
    const snapshot = await getDocs(query(collection(db, 'books'), orderBy('order', 'asc')));
    const container = document.getElementById('booksAdminList');
    if (container) {
        container.innerHTML = '';
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            div.className = 'book-admin-item';
            div.innerHTML = `<div><h4>${data.name}</h4><p>${data.description || ''} | Sıra: ${data.order || 0}</p></div>
                <div><button class="btn-warning" onclick="window.editBookAdmin('${doc.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-info" onclick="window.selectBookForLessons('${doc.id}', '${data.name.replace(/'/g, "\\'")}')"><i class="fas fa-book-open"></i> Dersler</button>
                <button class="btn-danger" onclick="window.deleteBookAdmin('${doc.id}')"><i class="fas fa-trash"></i></button></div>`;
            container.appendChild(div);
        });
    }
}

window.selectBookForLessons = async (bookId, bookName) => {
    currentEditingBookId = bookId;
    
    // Element kontrolü ile güvenli atama
    const currentBookNameEl = document.getElementById('currentBookName');
    if (currentBookNameEl) {
        currentBookNameEl.innerText = bookName;
    }
    
    const lessonsSection = document.getElementById('lessonsSection');
    if (lessonsSection) lessonsSection.style.display = 'block';
    
    const moveLessonBtn = document.getElementById('moveLessonBtn');
    if (moveLessonBtn) moveLessonBtn.style.display = 'inline-flex';
    
    // Dersleri yükle
    const lessonsRef = collection(db, 'lessons');
    const q = query(lessonsRef, where('bookId', '==', bookId));
    const snapshot = await getDocs(q);
    const lessonsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const container = document.getElementById('lessonsAdminList');
    if (container) {
        container.innerHTML = '';
        if (lessonsList.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px;">Bu kitapta henüz ders yok. "Yeni Ders" butonuna tıklayın.</div>';
        } else {
            lessonsList.forEach(lesson => {
                const div = document.createElement('div');
                div.className = 'lesson-admin-item';
                div.innerHTML = `
                    <div class="lesson-info">
                        <h4><i class="fas fa-graduation-cap"></i> ${lesson.name}</h4>
                        <p>${lesson.description || 'Açıklama yok'} | Sıra: ${lesson.order || 0}</p>
                    </div>
                    <div class="lesson-actions">
                        <button class="btn-warning" onclick="window.editLessonAdmin('${lesson.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-info" onclick="window.selectLessonForWords('${lesson.id}', '${lesson.name.replace(/'/g, "\\'")}')"><i class="fas fa-words"></i> Kelimeler</button>
                        <button class="btn-danger" onclick="window.deleteLessonAdmin('${lesson.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                container.appendChild(div);
            });
        }
    }
};

window.selectLessonForWords = async (lessonId, lessonName) => {
    currentEditingLessonId = lessonId;
    
    const currentLessonNameEl = document.getElementById('currentLessonName');
    if (currentLessonNameEl) {
        currentLessonNameEl.innerText = lessonName;
    }
    
    const wordsSection = document.getElementById('wordsSection');
    if (wordsSection) wordsSection.style.display = 'block';
    
    const moveWordBtn = document.getElementById('moveWordBtn');
    if (moveWordBtn) moveWordBtn.style.display = 'inline-flex';
    
    const wordsRef = collection(db, 'words');
    const q = query(wordsRef, where('lessonId', '==', lessonId));
    const snapshot = await getDocs(q);
    const wordsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const container = document.getElementById('wordsAdminList');
    if (container) {
        container.innerHTML = '';
        if (wordsList.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px;">Bu derste henüz kelime yok. "Yeni Kelime" butonuna tıklayın.</div>';
        } else {
            wordsList.forEach(word => {
                const div = document.createElement('div');
                div.className = 'word-admin-item';
                div.innerHTML = `
                    <div class="word-info">
                        <div class="word-arabic">${word.arabic}</div>
                        <div class="word-turkish">${word.turkish}</div>
                    </div>
                    <div class="word-actions">
                        <button class="btn-warning" onclick="window.editWordAdmin('${word.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-danger" onclick="window.deleteWordAdmin('${word.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                container.appendChild(div);
            });
        }
    }
};

function openBookModal(id = null) {
    if (id) {
        const book = books.find(b => b.id === id);
        if (book) {
            document.getElementById('bookModalTitle').innerText = 'Kitap Düzenle';
            document.getElementById('editBookId').value = id;
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

function openLessonModal(id = null) {
    if (!currentEditingBookId) { showNotification('Lütfen önce bir kitap seçin!'); return; }
    if (id) {
        document.getElementById('lessonModalTitle').innerText = 'Ders Düzenle';
        document.getElementById('editLessonId').value = id;
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

function openWordModal(id = null) {
    if (!currentEditingLessonId) { showNotification('Lütfen önce bir ders seçin!'); return; }
    if (id) {
        document.getElementById('wordModalTitle').innerText = 'Kelime Düzenle';
        document.getElementById('editWordId').value = id;
    } else {
        document.getElementById('wordModalTitle').innerText = 'Yeni Kelime Ekle';
        document.getElementById('editWordId').value = '';
        document.getElementById('wordArabic').value = '';
        document.getElementById('wordTurkish').value = '';
    }
    document.getElementById('currentLessonIdForWord').value = currentEditingLessonId;
    document.getElementById('wordModal').classList.remove('hidden');
}

async function saveBook() {
    const id = document.getElementById('editBookId').value;
    const name = document.getElementById('bookName').value.trim();
    const desc = document.getElementById('bookDesc').value.trim();
    const order = parseInt(document.getElementById('bookOrder').value) || 0;
    if (!name) { showNotification('Kitap adı gerekli!'); return; }
    try {
        if (id) { await updateDoc(doc(db, 'books', id), { name, description: desc, order }); showNotification('Kitap güncellendi!'); }
        else { await setDoc(doc(collection(db, 'books')), { name, description: desc, order }); showNotification('Yeni kitap eklendi!'); }
        document.getElementById('bookModal').classList.add('hidden');
        await loadAllBooks();
    } catch(e) { showNotification('Hata: ' + e.message); }
}

async function saveLesson() {
    const id = document.getElementById('editLessonId').value;
    const name = document.getElementById('lessonName').value.trim();
    const desc = document.getElementById('lessonDesc').value.trim();
    const order = parseInt(document.getElementById('lessonOrder').value) || 0;
    const bookId = document.getElementById('currentBookIdForLesson').value;
    if (!name) { showNotification('Ders adı gerekli!'); return; }
    try {
        if (id) { await updateDoc(doc(db, 'lessons', id), { name, description: desc, order, bookId }); showNotification('Ders güncellendi!'); }
        else { await setDoc(doc(collection(db, 'lessons')), { name, description: desc, order, bookId }); showNotification('Yeni ders eklendi!'); }
        document.getElementById('lessonModal').classList.add('hidden');
        await window.selectBookForLessons(bookId, document.getElementById('currentBookName').innerText);
    } catch(e) { showNotification('Hata: ' + e.message); }
}

async function saveWord() {
    const id = document.getElementById('editWordId').value;
    const arabic = document.getElementById('wordArabic').value.trim();
    const turkish = document.getElementById('wordTurkish').value.trim();
    const lessonId = document.getElementById('currentLessonIdForWord').value;
    if (!arabic || !turkish) { showNotification('Her iki alan da gerekli!'); return; }
    try {
        if (id) { await updateDoc(doc(db, 'words', id), { arabic, turkish }); showNotification('Kelime güncellendi!'); }
        else { await setDoc(doc(collection(db, 'words')), { arabic, turkish, lessonId, createdAt: new Date().toISOString() }); showNotification('Yeni kelime eklendi!'); }
        document.getElementById('wordModal').classList.add('hidden');
        await window.selectLessonForWords(lessonId, document.getElementById('currentLessonName').innerText);
    } catch(e) { showNotification('Hata: ' + e.message); }
}

window.editBookAdmin = (id) => openBookModal(id);
window.editLessonAdmin = (id) => openLessonModal(id);
window.editWordAdmin = (id) => openWordModal(id);
window.deleteBookAdmin = async (id) => {
    if (!confirm('Bu kitabı silmek istediğinize emin misiniz?')) return;
    try {
        const lessons = await getDocs(query(collection(db, 'lessons'), where('bookId', '==', id)));
        for (const l of lessons.docs) {
            const words = await getDocs(query(collection(db, 'words'), where('lessonId', '==', l.id)));
            for (const w of words.docs) await deleteDoc(doc(db, 'words', w.id));
            await deleteDoc(doc(db, 'lessons', l.id));
        }
        await deleteDoc(doc(db, 'books', id));
        showNotification('Kitap silindi!');
        await loadAllBooks();
    } catch(e) { showNotification('Hata: ' + e.message); }
};
window.deleteLessonAdmin = async (id) => {
    if (!confirm('Bu dersi silmek istediğinize emin misiniz?')) return;
    try {
        const words = await getDocs(query(collection(db, 'words'), where('lessonId', '==', id)));
        for (const w of words.docs) await deleteDoc(doc(db, 'words', w.id));
        await deleteDoc(doc(db, 'lessons', id));
        showNotification('Ders silindi!');
        await window.selectBookForLessons(currentEditingBookId, document.getElementById('currentBookName').innerText);
    } catch(e) { showNotification('Hata: ' + e.message); }
};
window.deleteWordAdmin = async (id) => {
    if (!confirm('Bu kelimeyi silmek istediğinize emin misiniz?')) return;
    await deleteDoc(doc(db, 'words', id));
    showNotification('Kelime silindi!');
    await window.selectLessonForWords(currentEditingLessonId, document.getElementById('currentLessonName').innerText);
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
    select.innerHTML = '<option>Yükleniyor...</option>';
    if (moveType === 'lesson') {
        const snapshot = await getDocs(collection(db, 'books'));
        select.innerHTML = '';
        snapshot.docs.forEach(doc => {
            if (doc.id !== moveCurrentParentId) {
                const opt = document.createElement('option');
                opt.value = doc.id;
                opt.textContent = doc.data().name;
                select.appendChild(opt);
            }
        });
    } else {
        const snapshot = await getDocs(query(collection(db, 'lessons'), where('bookId', '==', currentEditingBookId)));
        select.innerHTML = '';
        snapshot.docs.forEach(doc => {
            if (doc.id !== moveCurrentParentId) {
                const opt = document.createElement('option');
                opt.value = doc.id;
                opt.textContent = doc.data().name;
                select.appendChild(opt);
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
        document.getElementById('moveModal').classList.add('hidden');
    } catch(e) { showNotification('Hata: ' + e.message); }
}

async function loadAllUsers() {
    const snapshot = await getDocs(collection(db, 'users'));
    const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    document.getElementById('totalUsersCount').innerText = users.length;
    let total = 0;
    users.forEach(u => total += u.totalWordsViewed || 0);
    document.getElementById('totalWordsViewed').innerText = total;
    const tbody = document.getElementById('usersTableBody');
    if (tbody) {
        tbody.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${user.name || '-'}</td><td>${user.email}</td><td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR') : '-'}</td><td>${user.selectedLessons?.length || 0}</td><td class="user-word-count">${user.totalWordsViewed || 0}</td><td>${user.lastActive ? new Date(user.lastActive).toLocaleDateString('tr-TR') : '-'}</td>`;
            tbody.appendChild(row);
        });
    }
}


// ========== ADMIN MENÜ FONKSİYONLARI ==========

// Admin menü elementleri
let adminSideMenu = null;
let adminMenuOverlay = null;

function initAdminMenu() {
    adminSideMenu = document.getElementById('adminSideMenu');
    adminMenuOverlay = document.getElementById('adminMenuOverlay');
    const adminMenuBtn = document.getElementById('adminMenuBtn');
    
    if (adminMenuBtn) {
        adminMenuBtn.addEventListener('click', () => {
            adminSideMenu?.classList.toggle('open');
            adminMenuOverlay?.classList.toggle('active');
        });
    }
    
    if (adminMenuOverlay) {
        adminMenuOverlay.addEventListener('click', () => {
            adminSideMenu?.classList.remove('open');
            adminMenuOverlay?.classList.remove('active');
        });
    }
}

// Admin bölüm gösterim fonksiyonları
window.showAdminUsers = function() {
    document.getElementById('adminUsersSection')?.classList.remove('hidden');
    document.getElementById('adminBooksSection')?.classList.add('hidden');
    document.getElementById('adminLessonsSection')?.classList.add('hidden');
    document.getElementById('adminWordsSection')?.classList.add('hidden');
    adminSideMenu?.classList.remove('open');
    adminMenuOverlay?.classList.remove('active');
    loadAllUsers();
};

window.showAdminBooks = function() {
    document.getElementById('adminUsersSection')?.classList.add('hidden');
    document.getElementById('adminBooksSection')?.classList.remove('hidden');
    document.getElementById('adminLessonsSection')?.classList.add('hidden');
    document.getElementById('adminWordsSection')?.classList.add('hidden');
    adminSideMenu?.classList.remove('open');
    adminMenuOverlay?.classList.remove('active');
    loadAllBooks();
};

window.showAdminLessons = function() {
    document.getElementById('adminUsersSection')?.classList.add('hidden');
    document.getElementById('adminBooksSection')?.classList.add('hidden');
    document.getElementById('adminLessonsSection')?.classList.remove('hidden');
    document.getElementById('adminWordsSection')?.classList.add('hidden');
    adminSideMenu?.classList.remove('open');
    adminMenuOverlay?.classList.remove('active');
    loadLessonsForAdminSelect();
};

window.showAdminWords = function() {
    console.log("showAdminWords çağrıldı");
    document.getElementById('adminUsersSection')?.classList.add('hidden');
    document.getElementById('adminBooksSection')?.classList.add('hidden');
    document.getElementById('adminLessonsSection')?.classList.add('hidden');
    document.getElementById('adminWordsSection')?.classList.remove('hidden');
    adminSideMenu?.classList.remove('open');
    adminMenuOverlay?.classList.remove('active');
    loadWordsForAdminSelect();
};

window.toggleAdminTheme = function() {
    if (document.body.classList.contains('dark-mode')) {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    }
    const icon = document.getElementById('adminThemeIcon');
    if (icon) icon.className = document.body.classList.contains('dark-mode') ? 'fas fa-moon' : 'fas fa-sun';
    adminSideMenu?.classList.remove('open');
    adminMenuOverlay?.classList.remove('active');
};

// Admin dersler için kitap seçimi
// Dersler için kitap seçimi (düzeltilmiş)
async function loadLessonsForAdminSelect() {
    const snapshot = await getDocs(collection(db, 'books'));
    const booksList = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
    
    const select = document.getElementById('lessonBookSelect');
    if (select) {
        select.innerHTML = '<option value="">-- Kitap Seçin --</option>';
        booksList.forEach(book => {
            const option = document.createElement('option');
            option.value = book.id;
            option.textContent = book.name;
            select.appendChild(option);
        });
        select.onchange = () => {
            if (select.value) {
                loadLessonsByBook(select.value);
                // Kitap seçildiğinde currentBookName'i güncelle
                const bookName = select.options[select.selectedIndex]?.text || '';
                const currentBookNameEl = document.getElementById('currentBookName');
                if (currentBookNameEl) currentBookNameEl.innerText = bookName;
            }
        };
    }
}

async function loadLessonsByBook(bookId) {
    const lessonsRef = collection(db, 'lessons');
    const q = query(lessonsRef, where('bookId', '==', bookId));
    const snapshot = await getDocs(q);
    const lessonsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const container = document.getElementById('lessonsAdminList');
    if (container) {
        container.innerHTML = '';
        lessonsList.forEach(lesson => {
            const div = document.createElement('div');
            div.className = 'lesson-item';
            div.innerHTML = `
                <div><strong>${lesson.name}</strong><br><small>${lesson.description || ''} | Sıra: ${lesson.order || 0}</small></div>
                <div>
                    <button class="btn-warning" onclick="window.editLessonItem('${lesson.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-info" onclick="window.selectLessonForWordsFromList('${lesson.id}', '${lesson.name.replace(/'/g, "\\'")}')"><i class="fas fa-words"></i></button>
                    <button class="btn-danger" onclick="window.deleteLessonItem('${lesson.id}')"><i class="fas fa-trash"></i></button>
                </div>
            `;
            container.appendChild(div);
        });
    }
    currentEditingBookId = bookId;
    document.getElementById('moveLessonBtn').style.display = 'inline-flex';
}

// Admin kelimeler için ders seçimi
// Kelimeler için kitap ve ders seçimi (düzeltilmiş)
async function loadWordsForAdminSelect() {
    const snapshot = await getDocs(collection(db, 'books'));
    const booksList = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
    
    const bookSelect = document.getElementById('wordBookSelect');
    if (bookSelect) {
        bookSelect.innerHTML = '<option value="">-- Kitap Seçin --</option>';
        booksList.forEach(book => {
            const option = document.createElement('option');
            option.value = book.id;
            option.textContent = book.name;
            bookSelect.appendChild(option);
        });
        bookSelect.onchange = () => {
            if (bookSelect.value) {
                loadLessonsForWords(bookSelect.value);
            }
        };
    }
}

async function loadLessonsForWords(bookId) {
    const q = query(collection(db, 'lessons'), where('bookId', '==', bookId));
    const snapshot = await getDocs(q);
    const lessonsList = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
    
    const lessonSelect = document.getElementById('wordLessonSelectAdmin');
    if (lessonSelect) {
        lessonSelect.innerHTML = '<option value="">-- Ders Seçin --</option>';
        lessonsList.forEach(lesson => {
            const option = document.createElement('option');
            option.value = lesson.id;
            option.textContent = lesson.name;
            lessonSelect.appendChild(option);
        });
        lessonSelect.onchange = () => {
            if (lessonSelect.value) {
                const lessonName = lessonSelect.options[lessonSelect.selectedIndex]?.text || '';
                window.selectLessonForWordsFromList(lessonSelect.value, lessonName);
            }
        };
    }
}

async function loadWordsByLesson(lessonId) {
    currentEditingLessonId = lessonId;
    const wordsRef = collection(db, 'words');
    const q = query(wordsRef, where('lessonId', '==', lessonId));
    const snapshot = await getDocs(q);
    const wordsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const container = document.getElementById('wordsAdminList');
    if (container) {
        container.innerHTML = '';
        wordsList.forEach(word => {
            const div = document.createElement('div');
            div.className = 'word-item';
            div.innerHTML = `
                <div><strong class="word-arabic">${word.arabic}</strong> - ${word.turkish}</div>
                <div>
                    <button class="btn-warning" onclick="window.editWordItem('${word.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-danger" onclick="window.deleteWordItem('${word.id}')"><i class="fas fa-trash"></i></button>
                </div>
            `;
            container.appendChild(div);
        });
    }
    document.getElementById('moveWordBtn').style.display = 'inline-flex';
}

// Kelimeler için ders seçimi (düzeltilmiş)
window.selectLessonForWordsFromList = async (lessonId, lessonName) => {
    console.log("selectLessonForWordsFromList çağrıldı:", lessonId, lessonName);
    currentEditingLessonId = lessonId;
    
    // Element kontrolü
    const currentLessonNameSpan = document.getElementById('currentLessonName');
    if (currentLessonNameSpan) {
        currentLessonNameSpan.innerText = lessonName;
    } else {
        console.log("currentLessonName elementi bulunamadı");
    }
    
    const wordsSection = document.getElementById('wordsSection');
    if (wordsSection) wordsSection.style.display = 'block';
    
    const moveWordBtn = document.getElementById('moveWordBtn');
    if (moveWordBtn) moveWordBtn.style.display = 'inline-flex';
    
    // Kelimeleri yükle
    const q = query(collection(db, 'words'), where('lessonId', '==', lessonId));
    const snapshot = await getDocs(q);
    const container = document.getElementById('wordsAdminList');
    if (container) {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<div style="text-align:center; padding:20px;">Bu derste henüz kelime yok. "Yeni Kelime" butonuna tıklayın.</div>';
        } else {
            snapshot.forEach(doc => {
                const word = doc.data();
                const div = document.createElement('div');
                div.className = 'word-item';
                div.innerHTML = `
                    <div><strong class="word-arabic">${word.arabic}</strong> - ${word.turkish}</div>
                    <div>
                        <button class="btn-warning" onclick="window.editWordItem('${doc.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-danger" onclick="window.deleteWordItem('${doc.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                container.appendChild(div);
            });
        }
    }
};

window.editLessonItem = async (id) => {
    const lessonDoc = await getDoc(doc(db, 'lessons', id));
    if (lessonDoc.exists()) {
        const data = lessonDoc.data();
        document.getElementById('lessonModalTitle').innerText = 'Ders Düzenle';
        document.getElementById('editLessonId').value = id;
        document.getElementById('lessonName').value = data.name;
        document.getElementById('lessonDesc').value = data.description || '';
        document.getElementById('lessonOrder').value = data.order || 0;
        document.getElementById('currentBookIdForLesson').value = data.bookId;
        document.getElementById('lessonModal').classList.remove('hidden');
    }
};

window.deleteLessonItem = async (id) => {
    if (!confirm('Bu dersi silmek istediğinize emin misiniz? İçindeki tüm kelimeler de silinecek!')) return;
    try {
        const words = await getDocs(query(collection(db, 'words'), where('lessonId', '==', id)));
        for (const w of words.docs) await deleteDoc(doc(db, 'words', w.id));
        await deleteDoc(doc(db, 'lessons', id));
        showNotification('Ders silindi!');
        const bookSelect = document.getElementById('lessonBookSelect');
        if (bookSelect && bookSelect.value) loadLessonsByBook(bookSelect.value);
    } catch(e) { showNotification('Hata: ' + e.message); }
};

window.editWordItem = async (id) => {
    const wordDoc = await getDoc(doc(db, 'words', id));
    if (wordDoc.exists()) {
        const data = wordDoc.data();
        document.getElementById('wordModalTitle').innerText = 'Kelime Düzenle';
        document.getElementById('editWordId').value = id;
        document.getElementById('wordArabic').value = data.arabic;
        document.getElementById('wordTurkish').value = data.turkish;
        document.getElementById('currentLessonIdForWord').value = data.lessonId;
        document.getElementById('wordModal').classList.remove('hidden');
    }
};

window.deleteWordItem = async (id) => {
    if (!confirm('Bu kelimeyi silmek istediğinize emin misiniz?')) return;
    await deleteDoc(doc(db, 'words', id));
    showNotification('Kelime silindi!');
    const lessonSelect = document.getElementById('wordLessonSelectAdmin');
    if (lessonSelect && lessonSelect.value) loadWordsByLesson(lessonSelect.value);
};

// initAdminPage fonksiyonuna menü başlatmayı ekleyin
// Mevcut initAdminPage fonksiyonunun içine şunu ekleyin:


window.closeBookModal = () => document.getElementById('bookModal').classList.add('hidden');
window.closeLessonModal = () => document.getElementById('lessonModal').classList.add('hidden');
window.closeWordModal = () => document.getElementById('wordModal').classList.add('hidden');
window.closeMoveModal = () => document.getElementById('moveModal').classList.add('hidden');
