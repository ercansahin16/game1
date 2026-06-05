import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    arrayUnion, 
    arrayRemove,
    query,
    where
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
let userWords = [];
let currentWordIndex = 0;
let poolWords = [];
let currentWordList = [];

// DOM elementleri
let menuBtn, sideMenu, menuOverlay;
let loginSection, learningSection;
let userNameInput, loginBtn;
let arabicWordEl, turkishWordEl;
let showMeaningBtn, nextWordBtn, soundBtn;
let totalWordCountEl, learnedPercentEl;
let progressFill, progressPercent;

// Ses için
let speechSynthesis = window.speechSynthesis;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
    initElements();
    initEventListeners();
    await checkStoredUser();
    await loadWordPool();
});

function initElements() {
    // Menü
    menuBtn = document.getElementById('menuBtn');
    sideMenu = document.getElementById('sideMenu');
    menuOverlay = document.getElementById('menuOverlay');
    
    // Giriş
    loginSection = document.getElementById('loginSection');
    learningSection = document.getElementById('learningSection');
    userNameInput = document.getElementById('userNameInput');
    loginBtn = document.getElementById('loginBtn');
    
    // Kelime kartı
    arabicWordEl = document.getElementById('arabicWord');
    turkishWordEl = document.getElementById('turkishWord');
    showMeaningBtn = document.getElementById('showMeaningBtn');
    nextWordBtn = document.getElementById('nextWordBtn');
    soundBtn = document.getElementById('soundBtn');
    
    // İstatistikler
    totalWordCountEl = document.getElementById('totalWordCount');
    learnedPercentEl = document.getElementById('learnedPercent');
    progressFill = document.getElementById('progressFill');
    progressPercent = document.getElementById('progressPercent');
    
    // Menüdeki kullanıcı adları
    if (document.getElementById('menuUserName')) {
        window.menuUserNameSpan = document.getElementById('menuUserName');
    }
    if (document.getElementById('userNameDisplay')) {
        window.userNameDisplaySpan = document.getElementById('userNameDisplay');
    }
}

function initEventListeners() {
    if (menuBtn) {
        menuBtn.addEventListener('click', toggleMenu);
    }
    if (menuOverlay) {
        menuOverlay.addEventListener('click', toggleMenu);
    }
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }
    if (showMeaningBtn) {
        showMeaningBtn.addEventListener('click', showMeaning);
    }
    if (nextWordBtn) {
        nextWordBtn.addEventListener('click', nextWord);
    }
    if (soundBtn) {
        soundBtn.addEventListener('click', playSound);
    }
    if (userNameInput) {
        userNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }
    
    // Kelime ekleme sayfasındaki arama
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterWords);
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
            await loadUserWords();
            showLearningSection();
        } else {
            localStorage.removeItem('saadet_user_id');
            localStorage.removeItem('saadet_user_name');
        }
    }
}

async function handleLogin() {
    const userName = userNameInput.value.trim();
    if (!userName) {
        showNotification('Lütfen adınızı giriniz 🌸', 'warning');
        return;
    }
    
    // Kullanıcı var mı kontrol et
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('userName', '==', userName));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
        // Mevcut kullanıcı
        const userDoc = querySnapshot.docs[0];
        currentUser = { id: userDoc.id, ...userDoc.data() };
    } else {
        // Yeni kullanıcı
        const newUserRef = doc(collection(db, 'users'));
        const newUser = {
            userName: userName,
            createdAt: new Date().toISOString(),
            selectedWords: []
        };
        await setDoc(newUserRef, newUser);
        currentUser = { id: newUserRef.id, ...newUser };
        
        // Çiçekli uyarı göster
        showFlowerNotification(`🌸 Hoş geldiniz ${userName}! Allah'ı tanımaya geldiniz. 🌸`);
    }
    
    // LocalStorage'a kaydet
    localStorage.setItem('saadet_user_id', currentUser.id);
    localStorage.setItem('saadet_user_name', currentUser.userName);
    
    // Menü ve badge'leri güncelle
    updateUserDisplay(currentUser.userName);
    
    await loadUserWords();
    showLearningSection();
}

function updateUserDisplay(userName) {
    if (window.menuUserNameSpan) window.menuUserNameSpan.innerText = userName;
    if (window.userNameDisplaySpan) window.userNameDisplaySpan.innerText = userName.split(' ')[0];
}

function showFlowerNotification(msg) {
    const notif = document.getElementById('notification');
    const notifMsg = document.getElementById('notificationMsg');
    if (notif && notifMsg) {
        notifMsg.innerText = msg;
        notif.classList.remove('hidden');
        setTimeout(() => {
            notif.classList.add('hidden');
        }, 4000);
    } else {
        alert(msg);
    }
}

function showNotification(msg, type = 'info') {
    const notif = document.getElementById('notification');
    const notifMsg = document.getElementById('notificationMsg');
    if (notif && notifMsg) {
        notifMsg.innerText = msg;
        notif.classList.remove('hidden');
        setTimeout(() => {
            notif.classList.add('hidden');
        }, 3000);
    }
}

async function loadWordPool() {
    const wordBankRef = collection(db, 'wordBank');
    const snapshot = await getDocs(wordBankRef);
    
    if (snapshot.empty) {
        // İlk kez çalışıyorsa demo kelimeleri ekle
        await initializeWordBank();
        return loadWordPool();
    }
    
    poolWords = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    // Kelime ekleme sayfasındaysa listeyi göster
    if (window.location.pathname.includes('kelime-ekle.html')) {
        displayWordPool();
    }
}

async function initializeWordBank() {
    const demoWords = [
        { arabic: "خلق", turkish: "yaratılış", category: "temel" },
        { arabic: "رحمن", turkish: "rahman, çok merhametli", category: "din" },
        { arabic: "كريم", turkish: "cömert, kerim", category: "karakter" },
        { arabic: "صبر", turkish: "sabır", category: "karakter" },
        { arabic: "شكر", turkish: "şükür", category: "ibadet" },
        { arabic: "توكل", turkish: "tevekkül", category: "iman" },
        { arabic: "إخلاص", turkish: "ihlas, samimiyet", category: "iman" },
        { arabic: "هدى", turkish: "hidayet, doğru yol", category: "iman" },
        { arabic: "تقوى", turkish: "takva, Allah korkusu", category: "iman" },
        { arabic: "بركة", turkish: "bereket", category: "iman" }
    ];
    
    for (const word of demoWords) {
        const wordRef = doc(collection(db, 'wordBank'));
        await setDoc(wordRef, word);
    }
}

async function loadUserWords() {
    if (!currentUser) return;
    
    const userDoc = await getDoc(doc(db, 'users', currentUser.id));
    if (userDoc.exists()) {
        const userData = userDoc.data();
        const selectedWordIds = userData.selectedWords || [];
        
        userWords = [];
        for (const wordId of selectedWordIds) {
            const wordDoc = await getDoc(doc(db, 'wordBank', wordId));
            if (wordDoc.exists()) {
                userWords.push({ id: wordDoc.id, ...wordDoc.data() });
            }
        }
        
        updateStats();
        prepareWordList();
    }
}

function updateStats() {
    if (totalWordCountEl) {
        totalWordCountEl.innerText = userWords.length;
    }
    if (learnedPercentEl && poolWords.length > 0) {
        const percent = Math.round((userWords.length / poolWords.length) * 100);
        learnedPercentEl.innerText = `${percent}%`;
    }
}

function prepareWordList() {
    if (userWords.length === 0) return;
    // Karıştır
    currentWordList = [...userWords];
    for (let i = currentWordList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentWordList[i], currentWordList[j]] = [currentWordList[j], currentWordList[i]];
    }
    currentWordIndex = 0;
    displayCurrentWord();
}

function displayCurrentWord() {
    if (!arabicWordEl || !turkishWordEl) return;
    
    if (userWords.length === 0) {
        arabicWordEl.innerText = "Henüz kelime eklemediniz";
        turkishWordEl.classList.add('hidden');
        if (turkishWordEl) turkishWordEl.innerText = "";
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
    if (userWords.length === 0) return;
    
    currentWordIndex = (currentWordIndex + 1) % currentWordList.length;
    displayCurrentWord();
}

function playSound() {
    if (!arabicWordEl || arabicWordEl.innerText === "Henüz kelime eklemediniz") return;
    
    const word = currentWordList[currentWordIndex];
    if (!word) return;
    
    const utterance = new SpeechSynthesisUtterance(word.arabic);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
}

function updateProgress() {
    if (!progressFill || !progressPercent) return;
    
    const total = currentWordList.length;
    const remaining = total - currentWordIndex;
    const percent = Math.round(((currentWordIndex + 1) / total) * 100);
    progressFill.style.width = `${percent}%`;
    progressPercent.innerText = `${percent}%`;
}

function showLearningSection() {
    if (loginSection) loginSection.classList.add('hidden');
    if (learningSection) learningSection.classList.remove('hidden');
}

// Kelime Havuzu Sayfası Fonksiyonları
async function displayWordPool() {
    const wordsList = document.getElementById('wordsList');
    if (!wordsList) return;
    
    wordsList.innerHTML = '';
    
    for (const word of poolWords) {
        const isAdded = currentUser && userWords.some(w => w.id === word.id);
        
        const wordDiv = document.createElement('div');
        wordDiv.className = 'word-item';
        wordDiv.innerHTML = `
            <div class="word-info">
                <div class="word-arabic">${word.arabic}</div>
                <div class="word-turkish">${word.turkish}</div>
            </div>
            <button class="btn-add ${isAdded ? 'added' : ''}" data-id="${word.id}" data-arabic="${word.arabic}" data-turkish="${word.turkish}">
                ${isAdded ? '✓' : '+'}
            </button>
        `;
        
        const addBtn = wordDiv.querySelector('.btn-add');
        addBtn.addEventListener('click', () => toggleWord(addBtn, word));
        
        wordsList.appendChild(wordDiv);
    }
}

async function toggleWord(btn, word) {
    if (!currentUser) {
        showNotification('Lütfen önce giriş yapın 🌸', 'warning');
        return;
    }
    
    const isAdded = btn.classList.contains('added');
    
    if (isAdded) {
        // Kelimeyi kullanıcıdan kaldır
        await updateDoc(doc(db, 'users', currentUser.id), {
            selectedWords: arrayRemove(word.id)
        });
        btn.classList.remove('added');
        btn.innerHTML = '+';
        showNotification(`"${word.arabic}" kaldırıldı`, 'info');
    } else {
        // Kelimeyi kullanıcıya ekle
        await updateDoc(doc(db, 'users', currentUser.id), {
            selectedWords: arrayUnion(word.id)
        });
        btn.classList.add('added');
        btn.innerHTML = '✓';
        showNotification(`🌸 "${word.arabic}" eklendi! 🌸`, 'success');
    }
    
    // Kullanıcının kelime listesini yenile
    await loadUserWords();
}

function filterWords() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const wordItems = document.querySelectorAll('.word-item');
    
    wordItems.forEach(item => {
        const arabic = item.querySelector('.word-arabic')?.innerText.toLowerCase() || '';
        const turkish = item.querySelector('.word-turkish')?.innerText.toLowerCase() || '';
        
        if (arabic.includes(searchTerm) || turkish.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function goToAddWords() {
    window.location.href = 'kelime-ekle.html';
}

function showStats() {
    const totalPool = poolWords.length;
    const learned = userWords.length;
    const percent = totalPool > 0 ? Math.round((learned / totalPool) * 100) : 0;
    
    showNotification(`📊 Toplam Havuz: ${totalPool} kelime | Seçtiğin: ${learned} kelime | Oran: ${percent}%`, 'info');
}

function logout() {
    localStorage.removeItem('saadet_user_id');
    localStorage.removeItem('saadet_user_name');
    currentUser = null;
    userWords = [];
    
    if (loginSection) loginSection.classList.remove('hidden');
    if (learningSection) learningSection.classList.add('hidden');
    
    if (userNameInput) userNameInput.value = '';
    
    showNotification('🌸 Çıkış yapıldı. Yine bekleriz! 🌸', 'info');
    
    // Kelime ekleme sayfasındaysa ana sayfaya yönlendir
    if (window.location.pathname.includes('kelime-ekle.html')) {
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }
}

// Sayfa değiştiğinde kelime havuzunu yeniden yükle
if (window.location.pathname.includes('kelime-ekle.html')) {
    document.addEventListener('DOMContentLoaded', async () => {
        await checkStoredUser();
        await loadWordPool();
        if (currentUser) {
            await loadUserWords();
        }
    });
}

// Global fonksiyonlar
window.goToAddWords = goToAddWords;
window.showStats = showStats;
window.logout = logout;
window.toggleMenu = toggleMenu;
