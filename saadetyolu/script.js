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
    
    // Admin sayfası
