// ========== ADMIN PANEL FONKSİYONLARI (DÜZELTİLMİŞ) ==========

let adminAuthenticated = false;

async function initAdminPage() {
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const adminPassword = document.getElementById('adminPassword');
    
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', () => authenticateAdmin(adminPassword.value));
    }
    if (adminPassword) {
        adminPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') authenticateAdmin(adminPassword.value);
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
    // Admin şifresi - isterseniz değiştirin
    const ADMIN_PASSWORD = "admin123";
    
    if (password === ADMIN_PASSWORD) {
        adminAuthenticated = true;
        sessionStorage.setItem('admin_auth', 'true');
        showAdminPanel();
        loadAllLessonsForAdmin();
        showNotification('✅ Admin girişi başarılı!');
    } else {
        showNotification('❌ Hatalı şifre!');
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
            // Güncelle
            await updateDoc(doc(db, 'lessons', lessonId), { name, description });
            showNotification('✅ Ders güncellendi!');
        } else {
            // Yeni ekle - order hesapla
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
            // Güncelle
            await updateDoc(doc(db, 'words', wordId), { arabic, turkish });
            showNotification('✅ Kelime güncellendi!');
        } else {
            // Yeni ekle
            const newWordRef = doc(collection(db, 'words'));
            await setDoc(newWordRef, { arabic, turkish, lessonId: currentEditingLesson });
            showNotification('✅ Yeni kelime eklendi!');
        }
        
        closeWordModal();
        
        // Listeyi yenile
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
        // Derse ait kelimeleri sil
        const wordsRef = collection(db, 'words');
        const q = query(wordsRef, where('lessonId', '==', lessonId));
        const snapshot = await getDocs(q);
        
        for (const docSnap of snapshot.docs) {
            await deleteDoc(doc(db, 'words', docSnap.id));
        }
        
        // Dersi sil
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
        
        // Listeyi yenile
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
