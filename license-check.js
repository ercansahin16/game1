import { db } from './firebase-core.js';
import { collection, query, where, getDocs, updateDoc } 
from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

function getDeviceId() {
  let id = localStorage.getItem("deviceId");
  if (!id) {
    // Tüm tarayıcılarda çalışan basit bir benzersiz ID
    id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem("deviceId", id);
  }
  return id;
}

async function verifyLicense(key) {
  try {
    const q = query(collection(db, "licenses"), where("key", "==", key));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return false; // geçersiz anahtar
    }

    const docRef = snapshot.docs[0];
    const data = docRef.data();
    const currentDevice = getDeviceId();

    if (!data.deviceId) {
      // İlk kullanım: cihazı kaydet
      await updateDoc(docRef.ref, {
        deviceId: currentDevice,
        used: true
      });
      return true;
    }

    if (data.deviceId === currentDevice) {
      return true; // aynı cihaz
    }

    return false; // başka cihaz
  } catch (e) {
    console.error("Lisans doğrulama hatası:", e);
    return false;
  }
}

function startGame() {
  document.getElementById("loadingSpinner").style.display = "none";
  document.getElementById("licensePrompt").style.display = "none";
  document.getElementById("gameContainer").style.display = "block";

  const iframe = document.createElement("iframe");
  iframe.src = "game/index.html";
  iframe.style.width = "100%";
  iframe.style.height = "100vh";
  iframe.style.border = "none";

  document.getElementById("gameContainer").appendChild(iframe);
}

// Sayfa yüklendiğinde
window.addEventListener("load", async () => {
  const saved = localStorage.getItem("nevafilKey");
  if (saved) {
    const ok = await verifyLicense(saved);
    if (ok) {
      startGame();
      return;
    } else {
      // Anahtar geçersiz veya başka cihazda kullanılmış
      localStorage.removeItem("nevafilKey");
    }
  }
  // Lisans yok veya geçersiz -> lisans ekranını göster, spinner'ı kapat
  document.getElementById("loadingSpinner").style.display = "none";
  document.getElementById("licensePrompt").style.display = "flex";
});

window.onLicenseSubmit = async () => {
  const key = document.getElementById("licenseInput").value.trim();
  if (!key) {
    alert("Anahtar girin");
    return;
  }

  const ok = await verifyLicense(key);
  if (ok) {
    localStorage.setItem("nevafilKey", key);
    startGame();
  } else {
    alert("Geçersiz lisans veya başka cihazda kullanılıyor!");
  }
};
