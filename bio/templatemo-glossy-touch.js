// Firebase ve Kart Yönetimi
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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
const FEATURES_COLLECTION = "featureCards";

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

async function renderFrontendCards() {
    const container = document.getElementById("featuresContainer");
    if (!container) return;
    try {
        const q = query(collection(db, FEATURES_COLLECTION), where("active", "==", true));
        const querySnapshot = await getDocs(q);
        let cards = [];
        querySnapshot.forEach(docSnap => {
            cards.push({ id: docSnap.id, ...docSnap.data() });
        });
        cards.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        if (cards.length === 0) {
            container.innerHTML = `<div class="glass" style="padding:2rem;">Henüz aktif kart eklenmemiş.</div>`;
            return;
        }
        
        let html = '';
        cards.forEach(card => {
            const icon = card.icon || "✨";
            const title = card.title || "Özellik";
            const desc = card.description || "Açıklama yok";
            const link = card.link || "";
            const showUrl = card.showLinkAsUrl === true;
            const isClickable = link && link.trim() !== "";
            const clickableClass = isClickable ? "clickable" : "";
            const linkDisplayText = link ? (showUrl ? `🔗 ${link}` : "🔗 Discover →") : "🔗 Bağlantı yok";
            
            html += `
                <div class="feature-card glass ${clickableClass}" ${isClickable ? `onclick="window.open('${escapeHtml(link)}', '_blank')"` : ""}>
                    <div class="feature-icon">${escapeHtml(icon)}</div>
                    <h3>${escapeHtml(title)}</h3>
                    <p>${escapeHtml(desc)}</p>
                    <span class="card-link">${escapeHtml(linkDisplayText)}</span>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = `<div class="glass" style="padding:2rem;">⚠️ Veri yüklenemedi: ${err.message}</div>`;
    }
}

// Sayfa Geçişleri ve Hamburger Menü
let currentPage = 'home';

window.showPage = function(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick') === `showPage('${pageId}')`) {
            link.classList.add('active');
        }
    });
    
    currentPage = pageId;
    
    const footer = document.getElementById('footer');
    const activePage = document.getElementById(pageId);
    activePage.appendChild(footer);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Mobil menüyü kapat
    const navLinks = document.getElementById('navLinks');
    if (navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
    }
};

// Hamburger Menü Toggle
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.getElementById('hamburgerBtn');
    const navLinks = document.getElementById('navLinks');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
    
    // Footer'ı home sayfasına taşı
    const footer = document.getElementById('footer');
    const homePage = document.getElementById('home');
    if (footer && homePage) {
        homePage.appendChild(footer);
    }
});

// PWA Kurulum
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('installButton');
    if (installBtn) {
        installBtn.style.display = 'inline-block';
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`Kullanıcı ${outcome} seçti`);
                deferredPrompt = null;
                installBtn.style.display = 'none';
            }
        });
    }
});

// Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/bio/sw.js')
        .then(reg => console.log('SW kaydedildi:', reg))
        .catch(err => console.log('SW kaydı başarısız:', err));
}

// Logo tıklaması
document.querySelector('.logo')?.addEventListener('click', () => showPage('home'));

// Kartları yükle
renderFrontendCards();
