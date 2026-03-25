import { db, storage, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, orderBy, query, ref, uploadBytes, getDownloadURL, deleteObject } from './firebase-core.js';

let sortable = null;
let currentLinks = [];

// Admin şifresi (varsayılan)
let ADMIN_PASSWORD = 'admin123';

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    loadAdminPassword();
    setupEventListeners();
    checkAdminSession();
});

function setupEventListeners() {
    document.getElementById('loginBtn')?.addEventListener('click', login);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('togglePassword')?.addEventListener('click', () => togglePassword('adminPassword'));
    document.getElementById('toggleNewPassword')?.addEventListener('click', () => togglePassword('newPassword'));
    document.getElementById('addLinkBtn')?.addEventListener('click', addLink);
    document.getElementById('saveProfileBtn')?.addEventListener('click', saveProfile);
    document.getElementById('openAvatarGallery')?.addEventListener('click', () => openTab('avatars'));
    document.getElementById('uploadAvatarBtn')?.addEventListener('click', () => document.getElementById('avatarUpload').click());
    document.getElementById('uploadBannerBtn')?.addEventListener('click', () => document.getElementById('bannerUpload').click());
    document.getElementById('avatarUpload')?.addEventListener('change', (e) => uploadImage(e, 'avatar'));
    document.getElementById('bannerUpload')?.addEventListener('change', (e) => uploadImage(e, 'banner'));
    document.getElementById('changePasswordBtn')?.addEventListener('click', changePassword);
    document.getElementById('exportDataBtn')?.addEventListener('click', exportData);
    document.getElementById('resetAllBtn')?.addEventListener('click', resetAllData);
    document.getElementById('refreshAvatarsBtn')?.addEventListener('click', loadAvatars);
    
    // Tab geçişleri
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => openTab(btn.dataset.tab));
    });
}

async function loadAdminPassword() {
    try {
        const configDoc = await getDoc(doc(db, 'config', 'admin'));
        if (configDoc.exists() && configDoc.data().password) {
            ADMIN_PASSWORD = configDoc.data().password;
        } else {
            await setDoc(doc(db, 'config', 'admin'), { password: ADMIN_PASSWORD });
        }
    } catch (error) {
        console.error('Şifre yüklenirken hata:', error);
    }
}

function checkAdminSession() {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
    if (isLoggedIn === 'true') {
        showAdminPanel();
    }
}

function login() {
    const password = document.getElementById('adminPassword').value;
    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        showAdminPanel();
        showToast('Giriş başarılı!', 'success');
    } else {
        showToast('Şifre hatalı!', 'error');
    }
}

function logout() {
    sessionStorage.removeItem('adminLoggedIn');
    location.reload();
}

function showAdminPanel() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
    loadProfileData();
    loadLinksData();
    loadAnalytics();
    loadAvatars();
}

function openTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`${tabName}Tab`).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    if (tabName === 'links') {
        loadLinksData();
    } else if (tabName === 'analytics') {
        loadAnalytics();
    } else if (tabName === 'avatars') {
        loadAvatars();
    }
}

async function loadProfileData() {
    try {
        const profileDoc = await getDoc(doc(db, 'config', 'profile'));
        if (profileDoc.exists()) {
            const data = profileDoc.data();
            document.getElementById('userNameInput').value = data.name || '';
            document.getElementById('userBioInput').value = data.bio || '';
            if (data.profileImage) {
                document.getElementById('currentAvatarImg').src = data.profileImage;
            }
            if (data.bannerImage) {
                document.getElementById('currentBannerImg').src = data.bannerImage;
            }
        }
    } catch (error) {
        console.error('Profil verisi yüklenirken hata:', error);
    }
}

async function saveProfile() {
    const name = document.getElementById('userNameInput').value;
    const bio = document.getElementById('userBioInput').value;
    
    try {
        await setDoc(doc(db, 'config', 'profile'), {
            name,
            bio,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        
        showToast('Profil başarıyla kaydedildi!', 'success');
    } catch (error) {
        showToast('Kayıt sırasında hata oluştu!', 'error');
    }
}

async function loadLinksData() {
    try {
        const linksQuery = query(collection(db, 'links'), orderBy('order', 'asc'));
        const linksSnapshot = await getDocs(linksQuery);
        currentLinks = [];
        linksSnapshot.forEach(doc => {
            currentLinks.push({ id: doc.id, ...doc.data() });
        });
        
        renderSortableLinks();
    } catch (error) {
        console.error('Linkler yüklenirken hata:', error);
    }
}

function renderSortableLinks() {
    const container = document.getElementById('sortableLinks');
    
    if (currentLinks.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:20px;">Henüz link eklenmemiş</p>';
        return;
    }
    
    container.innerHTML = currentLinks.map(link => `
        <div class="sortable-item" data-id="${link.id}">
            <div>
                <i class="${link.icon || 'fas fa-link'}"></i>
                <strong>${escapeHtml(link.title)}</strong>
                <small>${escapeHtml(link.url)}</small>
            </div>
            <div>
                <button class="btn-secondary" onclick="window.editLink('${link.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-danger" onclick="window.deleteLink('${link.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    if (sortable) {
        sortable.destroy();
    }
    
    sortable = new Sortable(container, {
        animation: 300,
        onEnd: async () => {
            const items = document.querySelectorAll('.sortable-item');
            for (let i = 0; i < items.length; i++) {
                const id = items[i].dataset.id;
                await updateDoc(doc(db, 'links', id), { order: i });
            }
            showToast('Sıralama kaydedildi!', 'success');
        }
    });
}

window.editLink = async (id) => {
    const link = currentLinks.find(l => l.id === id);
    if (!link) return;
    
    const newTitle = prompt('Link başlığını düzenle:', link.title);
    const newUrl = prompt('Link URL düzenle:', link.url);
    
    if (newTitle && newUrl) {
        await updateDoc(doc(db, 'links', id), {
            title: newTitle,
            url: newUrl
        });
        loadLinksData();
        showToast('Link güncellendi!', 'success');
    }
};

window.deleteLink = async (id) => {
    if (confirm('Bu linki silmek istediğinizden emin misiniz?')) {
        await deleteDoc(doc(db, 'links', id));
        loadLinksData();
        showToast('Link silindi!', 'success');
    }
};

async function addLink() {
    const title = document.getElementById('newLinkTitle').value;
    const url = document.getElementById('newLinkUrl').value;
    const icon = document.getElementById('newLinkIcon').value;
    
    if (!title || !url) {
        showToast('Lütfen tüm alanları doldurun!', 'error');
        return;
    }
    
    try {
        const newOrder = currentLinks.length;
        await addDoc(collection(db, 'links'), {
            title,
            url,
            icon,
            order: newOrder,
            clicks: 0,
            createdAt: new Date().toISOString()
        });
        
        document.getElementById('newLinkTitle').value = '';
        document.getElementById('newLinkUrl').value = '';
        loadLinksData();
        showToast('Link başarıyla eklendi!', 'success');
    } catch (error) {
        showToast('Link eklenirken hata oluştu!', 'error');
    }
}

async function uploadImage(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    
    const storageRef = ref(storage, `${type}s/${Date.now()}_${file.name}`);
    showToast('Resim yükleniyor...', 'info');
    
    try {
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        const updateData = {};
        if (type === 'avatar') {
            updateData.profileImage = downloadURL;
            document.getElementById('currentAvatarImg').src = downloadURL;
        } else {
            updateData.bannerImage = downloadURL;
            document.getElementById('currentBannerImg').src = downloadURL;
        }
        
        await setDoc(doc(db, 'config', 'profile'), updateData, { merge: true });
        showToast('Resim başarıyla yüklendi!', 'success');
    } catch (error) {
        console.error('Yükleme hatası:', error);
        showToast('Resim yüklenirken hata oluştu!', 'error');
    }
}

async function loadAnalytics() {
    try {
        const linksSnapshot = await getDocs(collection(db, 'links'));
        const links = [];
        let totalClicks = 0;
        
        linksSnapshot.forEach(doc => {
            const data = doc.data();
            const clicks = data.clicks || 0;
            totalClicks += clicks;
            links.push({ id: doc.id, title: data.title, clicks });
        });
        
        document.getElementById('totalClicksStat').textContent = totalClicks;
        document.getElementById('totalLinksStat').textContent = links.length;
        document.getElementById('avgClicksStat').textContent = links.length ? (totalClicks / links.length).toFixed(1) : 0;
        
        const analyticsList = document.getElementById('analyticsList');
        analyticsList.innerHTML = links
            .sort((a, b) => b.clicks - a.clicks)
            .map(link => `
                <div class="analytics-item">
                    <span class="link-name">${escapeHtml(link.title)}</span>
                    <span class="click-count"><i class="fas fa-chart-simple"></i> ${link.clicks} tıklanma</span>
                </div>
            `).join('');
    } catch (error) {
        console.error('Analitik yüklenirken hata:', error);
    }
}

async function loadAvatars() {
    // 25 çizgi film karakteri avatarı
    const cartoonAvatars = [
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Mickey',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Donald',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Goofy',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Pluto',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Simba',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Pumbaa',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Timon',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Woody',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Buzz',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Nemo',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Dory',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Elsa',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Anna',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Olaf',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Baymax',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Groot',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Rocket',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Pikachu',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Scooby',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Shaggy',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Tom',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Jerry',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Bugs',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Daffy',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Porky'
    ];
    
    const gallery = document.getElementById('avatarGallery');
    gallery.innerHTML = cartoonAvatars.map((avatar, index) => `
        <div class="avatar-option" onclick="selectAvatar('${avatar}')">
            <img src="${avatar}" alt="Avatar ${index + 1}">
        </div>
    `).join('');
}

window.selectAvatar = async (avatarUrl) => {
    try {
        await setDoc(doc(db, 'config', 'profile'), { profileImage: avatarUrl }, { merge: true });
        document.getElementById('currentAvatarImg').src = avatarUrl;
        showToast('Avatar başarıyla seçildi!', 'success');
    } catch (error) {
        showToast('Avatar seçilirken hata oluştu!', 'error');
    }
};

async function changePassword() {
    const newPassword = document.getElementById('newPassword').value;
    if (!newPassword) {
        showToast('Lütfen yeni şifre girin!', 'error');
        return;
    }
    
    try {
        await setDoc(doc(db, 'config', 'admin'), { password: newPassword });
        ADMIN_PASSWORD = newPassword;
        showToast('Şifre başarıyla değiştirildi!', 'success');
        document.getElementById('newPassword').value = '';
    } catch (error) {
        showToast('Şifre değiştirilirken hata oluştu!', 'error');
    }
}

async function exportData() {
    try {
        const profileDoc = await getDoc(doc(db, 'config', 'profile'));
        const linksSnapshot = await getDocs(collection(db, 'links'));
        const links = [];
        linksSnapshot.forEach(doc => links.push({ id: doc.id, ...doc.data() }));
        
        const exportData = {
            profile: profileDoc.data(),
            links: links,
            exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `link-data-${new Date().toISOString()}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        showToast('Veriler başarıyla dışa aktarıldı!', 'success');
    } catch (error) {
        showToast('Dışa aktarma sırasında hata oluştu!', 'error');
    }
}

async function resetAllData() {
    if (confirm('TÜM VERİLER SİLİNECEK! Bu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?')) {
        try {
            const linksSnapshot = await getDocs(collection(db, 'links'));
            linksSnapshot.forEach(async (doc) => {
                await deleteDoc(doc.ref);
            });
            
            await setDoc(doc(db, 'config', 'profile'), {
                name: 'Kullanıcı',
                bio: 'Hoş geldiniz!',
                profileImage: 'https://via.placeholder.com/120/f3e8ff/d4b8ff?text=Profile',
                bannerImage: 'https://via.placeholder.com/1200x300/f3e8ff/d4b8ff?text=Banner'
            });
            
            showToast('Tüm veriler sıfırlandı!', 'success');
            loadProfileData();
            loadLinksData();
            loadAnalytics();
        } catch (error) {
            showToast('Sıfırlama sırasında hata oluştu!', 'error');
        }
    }
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = inputId === 'adminPassword' ? document.getElementById('togglePassword') : document.getElementById('toggleNewPassword');
    
    if (input.type === 'password') {
        input.type = 'text';
        button.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        input.type = 'password';
        button.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toastMessage');
    toast.textContent = message;
    toast.style.background = type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3';
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
