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
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { 
    getAuth, 
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

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
let moveType = null;
let moveItemId = null;
let moveCurrentParentId = null;

// Hadisler
const hadiths = [
    { text: "İlim öğrenmek her Müslüman'a farzdır.", source: "İbni Mace" },
    { text: "Kim ilim öğrenmek için bir yol tutarsa, Allah onu cennete giden bir yola iletir.", source: "Müslim" }
];

let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;

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
}

async function loadRecentWords() {
    const q = query(collection(db, 'words'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const container = document.getElementById('recentWordsList');
    if (container) {
        container.innerHTML = '';
        snapshot.docs.slice(0, 10).forEach(doc => {
            const w = doc.data();
            const div = document.createElement('div');
            div.className = 'recent-word-item';
            div.innerHTML = `<span>${w.arabic}</span><span>${w.turkish}</span>`;
            container.appendChild(div);
        });
    }
}

async function loadBooks() {
    const snapshot = await getDocs(collection(db, 'books'));
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
    const snapshot = await getDocs(query(collection(db, 'lessons'), where('bookId', '==', bookId)));
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
    const wordCountEl = document.getElementById('lessonWordCount');
    if (wordCountEl) wordCountEl.innerText = currentLessonWords.length;
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
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressPercent) progressPercent.innerText = `${percent}%`;
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
    } catch (error) { showNotification('Hata: ' + error.message); }
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
    document.getElementById('homeSection').classList.remove('hidden');
    document.getElementById('bookSelectArea').classList.add('hidden');
    document.getElementById('lessonSelectArea').classList.add('hidden');
    document.getElementById('wordLearningArea').classList.add('hidden');
    document.getElementById('profileSection').classList.add('hidden');
    window.sideMenu?.classList.remove('open');
    window.menuOverlay?.classList.remove('active');
    loadRandomHadith();
    loadRecentWords();
};

window.goToBooks = function() {
    document.getElementById('homeSection').classList.add('hidden');
    document.getElementById('bookSelectArea').classList.remove('hidden');
    document.getElementById('lessonSelectArea').classList.add('hidden');
    document.getElementById('wordLearningArea').classList.add('hidden');
    document.getElementById('profileSection').classList.add('hidden');
    window.sideMenu?.classList.remove('open');
    window.menuOverlay?.classList.remove('active');
    loadBooks();
};

window.showProfile = function() {
    document.getElementById('homeSection').classList.add('hidden');
    document.getElementById('bookSelectArea').classList.add('hidden');
    document.getElementById('lessonSelectArea').classList.add('hidden');
    document.getElementById('wordLearningArea').classList.add('hidden');
    document.getElementById('profileSection').classList.remove('hidden');
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
    window.sideMenu?.classList.remove('open');
    window.menuOverlay?.classList.remove('active');
};

window.logout = async function() {
    try { await signOut(auth); showNotification('🌸 Çıkış yapıldı. Yine bekleriz! 🌸'); } catch(e) { console.error(e); }
};

// ========== ADMIN PANEL ==========
let adminAuthenticated = false;

function showNotificationAdmin(msg) {
    const n = document.getElementById('notification');
    const m = document.getElementById('notificationMsg');
    if (n && m) { m.innerText = msg; n.classList.remove('hidden'); setTimeout(() => n.classList.add('hidden'), 3000); }
}

async function initAdminPage() {
    console.log("Admin sayfası başlatılıyor...");
    
    // Sidebar menü
    const sidebar = document.getElementById('adminSidebar');
    const menuToggle = document.getElementById('menuToggleBtn');
    const sidebarClose = document.getElementById('sidebarCloseBtn');
    const sidebarItems = document.querySelectorAll('.sidebar-item[data-tab]');
    const themeBtn = document.getElementById('sidebarThemeBtn');
    const logoutBtn = document.getElementById('sidebarLogoutBtn');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }
    if (sidebarClose) {
        sidebarClose.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
        });
    }
    
    // Tab geçişleri
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.getElementById(`tab-${tabId}`)?.classList.add('active');
            document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            if (window.innerWidth <= 768) sidebar.classList.remove('mobile-open');
        });
    });
    
    // Tema değiştir
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            if (document.body.classList.contains('dark-mode')) {
                document.body.classList.remove('dark-mode');
                document.body.classList.add('light-mode');
                localStorage.setItem('theme', 'light');
            } else {
                document.body.classList.remove('light-mode');
                document.body.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
            }
        });
    }
    
    // Çıkış
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutAdmin);
    }
    
    // Giriş butonu
    document.getElementById('adminLoginBtn')?.addEventListener('click', () => {
        const password = document.getElementById('adminPassword').value;
        if (password === "admin123") {
            sessionStorage.setItem('admin_auth', 'true');
            document.getElementById('adminLoginScreen').style.display = 'none';
            document.getElementById('adminContent').style.classList.remove('hidden');
            loadAllData();
            showNotificationAdmin('✅ Admin girişi başarılı!');
        } else {
            showNotificationAdmin('❌ Hatalı şifre!');
        }
    });
    document.getElementById('adminPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('adminLoginBtn').click();
    });
    
    // Butonlar
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
    
    // Filtreler
    document.getElementById('lessonBookFilter')?.addEventListener('change', (e) => loadLessonsByBook(e.target.value));
    document.getElementById('wordBookFilter')?.addEventListener('change', (e) => loadWordLessonsByBook(e.target.value));
    document.getElementById('wordLessonFilter')?.addEventListener('change', (e) => loadWordsByLesson(e.target.value));
    
    // Oturum kontrolü
    if (sessionStorage.getItem('admin_auth') === 'true') {
        document.getElementById('adminLoginScreen').style.display = 'none';
        document.getElementById('adminContent').classList.remove('hidden');
        loadAllData();
    }
    
    // Modal dışına tıklama ile kapatma
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });
}

async function loadAllData() {
    await loadAllUsers();
    await loadAllBooks();
    await loadLessonFilters();
    await loadWordFilters();
    await updateSidebarStats();
}

async function updateSidebarStats() {
    const users = await getDocs(collection(db, 'users'));
    const words = await getDocs(collection(db, 'words'));
    const lessons = await getDocs(collection(db, 'lessons'));
    document.getElementById('sidebarTotalUsers').innerText = users.size;
    document.getElementById('sidebarTotalWords').innerText = words.size;
    document.getElementById('sidebarTotalLessons').innerText = lessons.size;
}

async function loadAllUsers() {
    const snapshot = await getDocs(collection(db, 'users'));
    const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    document.getElementById('totalUsersCount').innerText = users.length;
    document.getElementById('sidebarTotalUsers').innerText = users.length;
    let totalWords = 0;
    users.forEach(u => totalWords += u.totalWordsViewed || 0);
    document.getElementById('totalWordsViewed').innerText = totalWords;
    const tbody = document.getElementById('usersTableBody');
    if (tbody) {
        tbody.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name || '-'}</td>
                <td>${user.email}</td>
                <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR') : '-'}</td>
                <td>${user.selectedLessons?.length || 0}</td>
                <td class="user-word-count">${user.totalWordsViewed || 0}</td>
                <td>${user.lastActive ? new Date(user.lastActive).toLocaleDateString('tr-TR') : '-'}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

async function loadAllBooks() {
    const snapshot = await getDocs(collection(db, 'books'));
    books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    document.getElementById('totalBooksCount').innerText = books.length;
    const container = document.getElementById('booksList');
    if (container) {
        container.innerHTML = '';
        books.forEach(book => {
            const div = document.createElement('div');
            div.className = 'item-row';
            div.innerHTML = `
                <div class="item-info">
                    <strong>${book.name}</strong>
                    <small>${book.description || 'Açıklama yok'} | Sıra: ${book.order || 0}</small>
                </div>
                <div class="item-actions">
                    <button class="btn-edit" onclick="editBook('${book.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteBook('${book.id}')"><i class="fas fa-trash"></i></button>
                </div>
            `;
            container.appendChild(div);
        });
    }
    await loadLessonFilters();
    await loadWordFilters();
}

async function loadLessonFilters() {
    const filter = document.getElementById('lessonBookFilter');
    const modalSelect = document.getElementById('lessonBookSelect');
    if (filter) {
        filter.innerHTML = '<option value="">Tüm Kitaplar</option>';
        books.forEach(book => {
            const option = document.createElement('option');
            option.value = book.id;
            option.textContent = book.name;
            filter.appendChild(option);
        });
    }
    if (modalSelect) {
        modalSelect.innerHTML = '';
        books.forEach(book => {
            const option = document.createElement('option');
            option.value = book.id;
            option.textContent = book.name;
            modalSelect.appendChild(option);
        });
    }
}

async function loadWordFilters() {
    const bookFilter = document.getElementById('wordBookFilter');
    if (bookFilter) {
        bookFilter.innerHTML = '<option value="">Tüm Kitaplar</option>';
        books.forEach(book => {
            const option = document.createElement('option');
            option.value = book.id;
            option.textContent = book.name;
            bookFilter.appendChild(option);
        });
    }
    const wordLessonSelect = document.getElementById('wordLessonSelect');
    if (wordLessonSelect) {
        const snapshot = await getDocs(collection(db, 'lessons'));
        wordLessonSelect.innerHTML = '<option value="">Ders Seçin</option>';
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = data.name;
            wordLessonSelect.appendChild(option);
        });
    }
}

async function loadLessonsByBook(bookId) {
    let q;
    if (bookId) {
        q = query(collection(db, 'lessons'), where('bookId', '==', bookId));
    } else {
        q = collection(db, 'lessons');
    }
    const snapshot = await getDocs(q);
    const container = document.getElementById('lessonsList');
    if (container) {
        container.innerHTML = '';
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const bookName = books.find(b => b.id === data.bookId)?.name || '-';
            const div = document.createElement('div');
            div.className = 'item-row';
            div.innerHTML = `
                <div class="item-info">
                    <strong>${data.name}</strong>
                    <small>${data.description || ''} | Kitap: ${bookName} | Sıra: ${data.order || 0}</small>
                </div>
                <div class="item-actions">
                    <button class="btn-edit" onclick="editLesson('${doc.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteLesson('${doc.id}')"><i class="fas fa-trash"></i></button>
                </div>
            `;
            container.appendChild(div);
        });
    }
    document.getElementById('totalLessonsCount').innerText = snapshot.size;
    document.getElementById('sidebarTotalLessons').innerText = snapshot.size;
}

async function loadWordLessonsByBook(bookId) {
    let q;
    if (bookId) {
        q = query(collection(db, 'lessons'), where('bookId', '==', bookId));
    } else {
        q = collection(db, 'lessons');
    }
    const snapshot = await getDocs(q);
    const lessonFilter = document.getElementById('wordLessonFilter');
    if (lessonFilter) {
        lessonFilter.innerHTML = '<option value="">Tüm Dersler</option>';
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = data.name;
            lessonFilter.appendChild(option);
        });
    }
}

async function loadWordsByLesson(lessonId) {
    let q;
    if (lessonId) {
        q = query(collection(db, 'words'), where('lessonId', '==', lessonId));
    } else {
        q = collection(db, 'words');
    }
    const snapshot = await getDocs(q);
    const container = document.getElementById('wordsList');
    if (container) {
        container.innerHTML = '';
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            div.className = 'item-row';
            div.innerHTML = `
                <div class="item-info">
                    <strong class="word-arabic">${data.arabic}</strong>
                    <small>${data.turkish}</small>
                </div>
                <div class="item-actions">
                    <button class="btn-edit" onclick="editWord('${doc.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteWord('${doc.id}')"><i class="fas fa-trash"></i></button>
                </div>
            `;
            container.appendChild(div);
        });
    }
    document.getElementById('totalWordsCount').innerText = snapshot.size;
    document.getElementById('sidebarTotalWords').innerText = snapshot.size;
}

// ========== CRUD İŞLEMLERİ ==========
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
    openModal('bookModal');
}

function openLessonModal(lessonId = null) {
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
    openModal('lessonModal');
}

function openWordModal(wordId = null) {
    if (wordId) {
        document.getElementById('wordModalTitle').innerText = 'Kelime Düzenle';
        document.getElementById('editWordId').value = wordId;
    } else {
        document.getElementById('wordModalTitle').innerText = 'Yeni Kelime Ekle';
        document.getElementById('editWordId').value = '';
        document.getElementById('wordArabic').value = '';
        document.getElementById('wordTurkish').value = '';
    }
    openModal('wordModal');
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('visible');
}

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('visible');
};

async function saveBook() {
    const id = document.getElementById('editBookId').value;
    const name = document.getElementById('bookName').value.trim();
    const description = document.getElementById('bookDesc').value.trim();
    const order = parseInt(document.getElementById('bookOrder').value) || 0;
    if (!name) { showNotificationAdmin('Kitap adı gerekli!'); return; }
    try {
        if (id) {
            await updateDoc(doc(db, 'books', id), { name, description, order });
            showNotificationAdmin('Kitap güncellendi!');
        } else {
            await setDoc(doc(collection(db, 'books')), { name, description, order });
            showNotificationAdmin('Yeni kitap eklendi!');
        }
        closeModal('bookModal');
        await loadAllBooks();
        await updateSidebarStats();
    } catch(e) { showNotificationAdmin('Hata: ' + e.message); }
}

async function saveLesson() {
    const id = document.getElementById('editLessonId').value;
    const name = document.getElementById('lessonName').value.trim();
    const description = document.getElementById('lessonDesc').value.trim();
    const order = parseInt(document.getElementById('lessonOrder').value) || 0;
    const bookId = document.getElementById('lessonBookSelect').value;
    if (!name) { showNotificationAdmin('Ders adı gerekli!'); return; }
    if (!bookId) { showNotificationAdmin('Lütfen bir kitap seçin!'); return; }
    try {
        if (id) {
            await updateDoc(doc(db, 'lessons', id), { name, description, order, bookId });
            showNotificationAdmin('Ders güncellendi!');
        } else {
            await setDoc(doc(collection(db, 'lessons')), { name, description, order, bookId });
            showNotificationAdmin('Yeni ders eklendi!');
        }
        closeModal('lessonModal');
        await loadAllBooks();
        await loadLessonsByBook(document.getElementById('lessonBookFilter').value);
        await updateSidebarStats();
    } catch(e) { showNotificationAdmin('Hata: ' + e.message); }
}

async function saveWord() {
    const id = document.getElementById('editWordId').value;
    const arabic = document.getElementById('wordArabic').value.trim();
    const turkish = document.getElementById('wordTurkish').value.trim();
    const lessonId = document.getElementById('wordLessonSelect').value;
    if (!arabic || !turkish) { showNotificationAdmin('Her iki alan da gerekli!'); return; }
    if (!lessonId) { showNotificationAdmin('Lütfen bir ders seçin!'); return; }
    try {
        if (id) {
            await updateDoc(doc(db, 'words', id), { arabic, turkish });
            showNotificationAdmin('Kelime güncellendi!');
        } else {
            await setDoc(doc(collection(db, 'words')), { arabic, turkish, lessonId, createdAt: new Date().toISOString() });
            showNotificationAdmin('Yeni kelime eklendi!');
        }
        closeModal('wordModal');
        await loadWordsByLesson(document.getElementById('wordLessonFilter').value);
        await updateSidebarStats();
    } catch(e) { showNotificationAdmin('Hata: ' + e.message); }
}

window.editBook = (id) => openBookModal(id);
window.editLesson = (id) => openLessonModal(id);
window.editWord = (id) => openWordModal(id);

window.deleteBook = async (id) => {
    if (!confirm('Bu kitabı silmek istediğinize emin misiniz?')) return;
    try {
        const lessons = await getDocs(query(collection(db, 'lessons'), where('bookId', '==', id)));
        for (const l of lessons.docs) {
            const words = await getDocs(query(collection(db, 'words'), where('lessonId', '==', l.id)));
            for (const w of words.docs) await deleteDoc(doc(db, 'words', w.id));
            await deleteDoc(doc(db, 'lessons', l.id));
        }
        await deleteDoc(doc(db, 'books', id));
        showNotificationAdmin('Kitap silindi!');
        await loadAllBooks();
        await updateSidebarStats();
    } catch(e) { showNotificationAdmin('Hata: ' + e.message); }
};

window.deleteLesson = async (id) => {
    if (!confirm('Bu dersi silmek istediğinize emin misiniz?')) return;
    try {
        const words = await getDocs(query(collection(db, 'words'), where('lessonId', '==', id)));
        for (const w of words.docs) await deleteDoc(doc(db, 'words', w.id));
        await deleteDoc(doc(db, 'lessons', id));
        showNotificationAdmin('Ders silindi!');
        await loadLessonsByBook(document.getElementById('lessonBookFilter').value);
        await updateSidebarStats();
    } catch(e) { showNotificationAdmin('Hata: ' + e.message); }
};

window.deleteWord = async (id) => {
    if (!confirm('Bu kelimeyi silmek istediğinize emin misiniz?')) return;
    await deleteDoc(doc(db, 'words', id));
    showNotificationAdmin('Kelime silindi!');
    await loadWordsByLesson(document.getElementById('wordLessonFilter').value);
    await updateSidebarStats();
};

// ========== TAŞIMA ==========
function openMoveModal(type) {
    moveType = type;
    if (type === 'lesson') {
        moveItemId = currentEditingLessonId;
        document.getElementById('moveModalTitle').innerText = 'Dersi Taşı';
        document.getElementById('moveItemLabel').innerText = 'Hedef Kitap:';
    } else {
        moveItemId = currentEditingWordId;
        document.getElementById('moveModalTitle').innerText = 'Kelimeyi Taşı';
        document.getElementById('moveItemLabel').innerText = 'Hedef Ders:';
    }
    openModal('moveModal');
    loadMoveTargets();
}

async function loadMoveTargets() {
    const select = document.getElementById('moveTargetSelect');
    select.innerHTML = '<option>Yükleniyor...</option>';
    if (moveType === 'lesson') {
        const snapshot = await getDocs(collection(db, 'books'));
        select.innerHTML = '';
        snapshot.docs.forEach(doc => {
            const opt = document.createElement('option');
            opt.value = doc.id;
            opt.textContent = doc.data().name;
            select.appendChild(opt);
        });
    } else {
        const snapshot = await getDocs(collection(db, 'lessons'));
        select.innerHTML = '';
        snapshot.docs.forEach(doc => {
            const opt = document.createElement('option');
            opt.value = doc.id;
            opt.textContent = doc.data().name;
            select.appendChild(opt);
        });
    }
}

async function confirmMove() {
    const targetId = document.getElementById('moveTargetSelect').value;
    if (!targetId) { showNotificationAdmin('Lütfen bir hedef seçin!'); return; }
    try {
        if (moveType === 'lesson') {
            await updateDoc(doc(db, 'lessons', moveItemId), { bookId: targetId });
            showNotificationAdmin('Ders taşındı!');
        } else {
            await updateDoc(doc(db, 'words', moveItemId), { lessonId: targetId });
            showNotificationAdmin('Kelime taşındı!');
        }
        closeModal('moveModal');
        await loadAllBooks();
    } catch(e) { showNotificationAdmin('Hata: ' + e.message); }
}

function logoutAdmin() {
    sessionStorage.removeItem('admin_auth');
    document.getElementById('adminLoginScreen').style.display = 'flex';
    document.getElementById('adminContent').classList.add('hidden');
    document.getElementById('adminPassword').value = '';
    showNotificationAdmin('Admin çıkışı yapıldı');
}

window.logoutAdmin = logoutAdmin;
window.toggleAdminTheme = window.toggleTheme;
