import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ضع هنا معلومات مشروعك الخاص في Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const NEWS_COLLECTION = "news";

const ADMIN_PASSCODE = "2002";
const AUTH_KEY = "ahl_alaba_admin_logged_in";

// جلب جميع الأخبار من سحابة جوجل
async function fetchNewsFromCloud() {
  try {
    const q = query(collection(db, NEWS_COLLECTION), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    const newsList = [];
    querySnapshot.forEach((docSnap) => {
      newsList.push({ id: docSnap.id, ...docSnap.data() });
    });
    return newsList;
  } catch (error) {
    console.error("خطأ في جلب الأخبار:", error);
    return [];
  }
}

// تحميل خبر واحد كملف نصي (.txt)
window.downloadSingleNewsTxt = async function(id) {
  const newsList = await fetchNewsFromCloud();
  const news = newsList.find(item => item.id === id);
  if (!news) return;

  const fileContent = `${news.title}\nالتصنيف: ${news.category} | التاريخ: ${news.date}\n----------------------------------------\n\n${news.content}`;
  const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${news.title.slice(0, 25)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

/* =========================================================
   الصفحة الرئيسية (index.html)
========================================================= */
const publicNewsGrid = document.getElementById("publicNewsGrid");

if (publicNewsGrid) {
  let currentCategory = "الكل";
  let searchQuery = "";
  let cachedNews = [];

  async function initPublicPage() {
    cachedNews = await fetchNewsFromCloud();
    renderPublicNews();
  }

  function renderPublicNews() {
    const filtered = cachedNews.filter(item => {
      const matchCat = currentCategory === "الكل" || item.category === currentCategory;
      const matchSearch = (item.title && item.title.includes(searchQuery)) || (item.content && item.content.includes(searchQuery));
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      publicNewsGrid.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:2rem; color:#666;">لا توجد أخبار مطابقة حالياً.</p>`;
      return;
    }

    publicNewsGrid.innerHTML = filtered.map(item => `
      <article class="news-card">
        ${item.image ? `<img src="${item.image}" alt="${item.title}" class="news-img">` : ""}
        <div class="news-body">
          <div class="news-meta">
            <span class="badge">${item.category}</span>
            <span>📅 ${item.date}</span>
          </div>
          <h3 class="news-title">${item.title}</h3>
          <p class="news-excerpt">${item.content}</p>
          <div class="news-actions">
            <button class="btn btn-outline" onclick="openArticleModal('${item.id}')">اقرأ التفاصيل</button>
            <button class="btn btn-outline" onclick="downloadSingleNewsTxt('${item.id}')">📥 تحميل كملف</button>
          </div>
        </div>
      </article>
    `).join("");
  }

  document.getElementById("searchInput").addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderPublicNews();
  });

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.cat;
      renderPublicNews();
    });
  });

  window.openArticleModal = function(id) {
    const item = cachedNews.find(n => n.id === id);
    if (!item) return;

    const modalImg = document.getElementById("modalImg");
    if (item.image) {
      modalImg.src = item.image;
      modalImg.style.display = "block";
    } else {
      modalImg.style.display = "none";
    }

    document.getElementById("modalCategory").textContent = item.category;
    document.getElementById("modalDate").textContent = item.date;
    document.getElementById("modalTitle").textContent = item.title;
    document.getElementById("modalBody").textContent = item.content;
    document.getElementById("modalDownloadBtn").onclick = () => downloadSingleNewsTxt(item.id);

    document.getElementById("articleModal").classList.add("open");
  };

  window.closeArticleModal = function() {
    document.getElementById("articleModal").classList.remove("open");
  };

  initPublicPage();
}

/* =========================================================
   صفحة الإدارة (admin.html)
========================================================= */
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  const loginSection = document.getElementById("loginSection");
  const dashboardSection = document.getElementById("dashboardSection");
  const logoutBtn = document.getElementById("logoutBtn");
  const newsDateInput = document.getElementById("newsDate");

  newsDateInput.valueAsDate = new Date();

  function checkAdminAuth() {
    if (sessionStorage.getItem(AUTH_KEY) === "true") {
      loginSection.style.display = "none";
      dashboardSection.style.display = "block";
      logoutBtn.style.display = "inline-flex";
      renderAdminNewsList();
    } else {
      loginSection.style.display = "flex";
      dashboardSection.style.display = "none";
      logoutBtn.style.display = "none";
    }
  }

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const enteredPass = document.getElementById("adminPassword").value.trim();
    if (enteredPass === ADMIN_PASSCODE) {
      sessionStorage.setItem(AUTH_KEY, "true");
      document.getElementById("loginError").style.display = "none";
      checkAdminAuth();
    } else {
      document.getElementById("loginError").style.display = "block";
    }
  });

  window.logoutAdmin = function() {
    sessionStorage.removeItem(AUTH_KEY);
    document.getElementById("adminPassword").value = "";
    checkAdminAuth();
  };

  async function renderAdminNewsList() {
    const listContainer = document.getElementById("adminNewsList");
    const news = await fetchNewsFromCloud();
    document.getElementById("newsCount").textContent = news.length;

    if (news.length === 0) {
      listContainer.innerHTML = "<p>لا توجد أخبار منشورة حالياً.</p>";
      return;
    }

    listContainer.innerHTML = news.map(item => `
      <div class="admin-news-item">
        <div>
          <h4>${item.title}</h4>
          <small>${item.category} • ${item.date}</small>
        </div>
        <div class="item-actions">
          <button class="btn btn-light" onclick="downloadSingleNewsTxt('${item.id}')">📥 ملف</button>
          <button class="btn btn-gold" onclick="prepareEditNews('${item.id}')">✏️ تعديل</button>
          <button class="btn btn-danger" onclick="deleteCloudNews('${item.id}')">🗑️ حذف</button>
        </div>
      </div>
    `).join("");
  }

  document.getElementById("newsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("editNewsId").value;
    const title = document.getElementById("newsTitle").value.trim();
    const category = document.getElementById("newsCategory").value;
    const date = document.getElementById("newsDate").value;
    const content = document.getElementById("newsContent").value.trim();
    const fileInput = document.getElementById("newsImageFile");

    const saveDataToCloud = async (imageDataUrl) => {
      try {
        if (id) {
          const docRef = doc(db, NEWS_COLLECTION, id);
          const updateData = { title, category, date, content };
          if (imageDataUrl !== null) updateData.image = imageDataUrl;
          await updateDoc(docRef, updateData);
          alert("تم تحديث الخبر بنجاح على سحابة Google!");
        } else {
          await addDoc(collection(db, NEWS_COLLECTION), {
            title,
            category,
            date,
            content,
            image: imageDataUrl || "",
            createdAt: Date.now()
          });
          alert("تم نشر الخبر بنجاح على سحابة Google لجميع الأجهزة!");
        }
        resetNewsForm();
        renderAdminNewsList();
      } catch (err) {
        console.error(err);
        alert("حدث خطأ أثناء الحفظ.");
      }
    };

    if (fileInput.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => saveDataToCloud(event.target.result);
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      saveDataToCloud(id ? null : "");
    }
  });

  window.prepareEditNews = async function(id) {
    const news = await fetchNewsFromCloud();
    const item = news.find(n => n.id === id);
    if (!item) return;

    document.getElementById("editNewsId").value = item.id;
    document.getElementById("newsTitle").value = item.title;
    document.getElementById("newsCategory").value = item.category;
    document.getElementById("newsDate").value = item.date;
    document.getElementById("newsContent").value = item.content;

    document.getElementById("formHeading").textContent = "✏️ تعديل الخبر سحابياً";
    document.getElementById("saveNewsBtn").textContent = "حفظ التعديلات";
    document.getElementById("cancelEditBtn").style.display = "inline-flex";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  window.resetNewsForm = function() {
    document.getElementById("newsForm").reset();
    document.getElementById("editNewsId").value = "";
    document.getElementById("newsDate").valueAsDate = new Date();
    document.getElementById("formHeading").textContent = "✍️ كتابة خبر جديد سحابياً";
    document.getElementById("saveNewsBtn").textContent = "نشر الخبر على سحابة Google";
    document.getElementById("cancelEditBtn").style.display = "none";
  };

  window.deleteCloudNews = async function(id) {
    if (!confirm("هل أنت متأكد من حذف هذا الخبر من السحابة؟")) return;
    try {
      await deleteDoc(doc(db, NEWS_COLLECTION, id));
      renderAdminNewsList();
      alert("تم حذف الخبر بنجاح.");
    } catch (err) {
      console.error(err);
      alert("فشل الحذف.");
    }
  };

  // رفع خبر من ملف نصي (.txt)
  document.getElementById("importFileInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      if (lines.length === 0) {
        alert("الملف فارغ!");
        return;
      }
      const title = lines[0].trim();
      const content = lines.slice(1).join("\n").trim() || title;
      const today = new Date().toISOString().split("T")[0];

      try {
        await addDoc(collection(db, NEWS_COLLECTION), {
          title: title,
          category: "إعلانات",
          date: today,
          content: content,
          image: "",
          createdAt: Date.now()
        });
        alert("تم استيراد ونشر الخبر من الملف النصي سحابياً بنجاح!");
        renderAdminNewsList();
      } catch (err) {
        console.error(err);
        alert("خطأ أثناء استيراد الملف.");
      }
      e.target.value = "";
    };
    reader.readAsText(file, "UTF-8");
  });

  checkAdminAuth();
}
