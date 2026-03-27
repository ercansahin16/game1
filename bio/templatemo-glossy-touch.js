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

// Sayfa Geçişleri
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
    
    const footer = document.getElementById('footer');
    const activePage = document.getElementById(pageId);
    if (footer && activePage) {
        activePage.appendChild(footer);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Mobil menüyü kapat
    const navLinks = document.getElementById('navLinks');
    if (navLinks && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
    }
};

// ========== HAMBURGER MENÜ ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM yüklendi - hamburger menü hazırlanıyor');
    
    const hamburger = document.getElementById('hamburgerBtn');
    const navLinks = document.getElementById('navLinks');
    
    if (hamburger && navLinks) {
        console.log('✅ Buton ve menü bulundu');
        
        hamburger.addEventListener('click', function(e) {
            e.stopPropagation();
            navLinks.classList.toggle('active');
            console.log('Menü durumu:', navLinks.classList.contains('active') ? 'açıldı' : 'kapandı');
        });
        
        // Sayfa dışına tıklayınca menüyü kapat
        document.addEventListener('click', function(event) {
            if (navLinks.classList.contains('active') && 
                !navLinks.contains(event.target) && 
                !hamburger.contains(event.target)) {
                navLinks.classList.remove('active');
                console.log('Menü dışarı tıklama ile kapandı');
            }
        });
        
    } else {
        console.error('❌ Buton veya menü bulunamadı!');
        console.log('hamburgerBtn:', hamburger);
        console.log('navLinks:', navLinks);
    }
    
    // Footer'ı home sayfasına taşı
    const footer = document.getElementById('footer');
    const homePage = document.getElementById('home');
    if (footer && homePage) {
        homePage.appendChild(footer);
    }
    
    // İndir butonunu başlangıçta gizle, PWA hazır olunca göster
    const installBtn = document.getElementById('installButton');
    if (installBtn) {
        installBtn.style.display = 'none';
    }
});

// ========== PWA KURULUM - HER ZAMAN ÇALIŞIR ==========
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('📱 PWA kuruluma hazır');
    
    const installBtn = document.getElementById('installButton');
    if (installBtn) {
        installBtn.style.display = 'inline-block';
        installBtn.textContent = '📱 Uygulamayı Yükle';
    }
});

// PWA kurulumu mümkün değilse butonu göster ama alternatif işlev ekle
window.addEventListener('load', () => {
    const installBtn = document.getElementById('installButton');
    if (installBtn) {
        // Buton zaten görünüyor, ek işlev ekle
        if (!window.deferredPrompt) {
            installBtn.textContent = '📱 Uygulama Yükleme Kılavuzu';
        }
    }
    
    // Uygulama zaten yüklüyse butonu gizle
    if (window.matchMedia('(display-mode: standalone)').matches) {
        if (installBtn) installBtn.style.display = 'none';
    }
});

// Service Worker Kaydı
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/bio/sw.js')
        .then(reg => console.log('✅ SW kaydedildi:', reg))
        .catch(err => console.log('❌ SW kaydı başarısız:', err));
}

// Sayfa yüklendikten sonra PWA durumunu kontrol et
window.addEventListener('load', () => {
    // Uygulama zaten standalone modunda çalışıyorsa butonu gizle
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('✅ Uygulama standalone modunda çalışıyor');
        const installBtn = document.getElementById('installButton');
        if (installBtn) installBtn.style.display = 'none';
    }
    
    // HTTPS kontrolü
    if (location.protocol !== 'https:') {
        console.warn('⚠️ PWA HTTPS üzerinde çalışmalıdır');
    }
    
    // Service Worker durumunu kontrol et
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
            if (reg) {
                console.log('✅ Service Worker kayıtlı:', reg);
            } else {
                console.log('⚠️ Service Worker kaydı bulunamadı');
            }
        });
    }
});

// ========== SERVICE WORKER KAYDI ==========
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/bio/sw.js')
        .then(reg => {
            console.log('✅ SW kaydedildi:', reg);
            // Service Worker durumunu dinle
            if (reg.installing) {
                console.log('📦 Service Worker kuruluyor...');
            } else if (reg.waiting) {
                console.log('⏳ Service Worker bekliyor');
            } else if (reg.active) {
                console.log('🚀 Service Worker aktif');
            }
        })
        .catch(err => console.log('❌ SW kaydı başarısız:', err));
}

// Logo tıklaması
document.querySelector('.logo')?.addEventListener('click', () => showPage('home'));

// Kartları yükle
renderFrontendCards();

console.log('🎉 Glossy Touch başlatıldı - PWA hazır');
