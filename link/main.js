import { db, collection, doc, getDoc, getDocs, updateDoc, orderBy, query } from './firebase-core.js';

let currentData = {
    profile: null,
    links: []
};

// Sayfa yüklendiğinde verileri çek
async function loadData() {
    await loadProfile();
    await loadLinks();
    await updateStats();
}

async function loadProfile() {
    try {
        const profileDoc = await getDoc(doc(db, 'config', 'profile'));
        if (profileDoc.exists()) {
            currentData.profile = profileDoc.data();
            document.getElementById('userName').textContent = currentData.profile.name || 'Kullanıcı';
            document.getElementById('userBio').textContent = currentData.profile.bio || 'Hoş geldiniz!';
            
            if (currentData.profile.profileImage) {
                document.getElementById('profileImage').src = currentData.profile.profileImage;
            }
            if (currentData.profile.bannerImage) {
                document.getElementById('bannerImage').src = currentData.profile.bannerImage;
            }
        }
    } catch (error) {
        console.error('Profil yüklenirken hata:', error);
    }
}

async function loadLinks() {
    try {
        const linksQuery = query(collection(db, 'links'), orderBy('order', 'asc'));
        const linksSnapshot = await getDocs(linksQuery);
        currentData.links = [];
        linksSnapshot.forEach(doc => {
            currentData.links.push({ id: doc.id, ...doc.data() });
        });
        
        renderLinks();
    } catch (error) {
        console.error('Linkler yüklenirken hata:', error);
    }
}

function renderLinks() {
    const container = document.getElementById('linksContainer');
    
    if (currentData.links.length === 0) {
        container.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-link"></i>
                <p>Henüz link eklenmemiş</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = currentData.links.map(link => `
        <div class="link-card" data-id="${link.id}" data-url="${link.url}">
            <div class="link-icon">
                <i class="${link.icon || 'fas fa-link'}"></i>
            </div>
            <div class="link-content">
                <div class="link-title">${escapeHtml(link.title)}</div>
                <div class="link-url">${escapeHtml(link.url)}</div>
            </div>
            <div class="link-stats">
                <i class="fas fa-chart-simple"></i> ${link.clicks || 0}
            </div>
        </div>
    `).join('');
    
    // Link tıklama olaylarını ekle
    document.querySelectorAll('.link-card').forEach(card => {
        card.addEventListener('click', async (e) => {
            const url = card.dataset.url;
            const linkId = card.dataset.id;
            if (url) {
                await incrementClick(linkId);
                window.open(url, '_blank');
            }
        });
    });
}

async function incrementClick(linkId) {
    try {
        const linkRef = doc(db, 'links', linkId);
        const linkDoc = await getDoc(linkRef);
        const currentClicks = linkDoc.data()?.clicks || 0;
        await updateDoc(linkRef, { clicks: currentClicks + 1 });
        
        // Toplam tıklanma sayısını güncelle
        await updateStats();
    } catch (error) {
        console.error('Tıklanma kaydedilirken hata:', error);
    }
}

async function updateStats() {
    try {
        const totalClicks = currentData.links.reduce((sum, link) => sum + (link.clicks || 0), 0);
        document.getElementById('totalClicks').textContent = totalClicks;
        document.getElementById('linkCount').textContent = currentData.links.length;
    } catch (error) {
        console.error('İstatistikler güncellenirken hata:', error);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Sayfa yüklendiğinde verileri getir
loadData();

// Her 30 saniyede bir yenile
setInterval(() => {
    loadLinks();
    loadProfile();
}, 30000);
