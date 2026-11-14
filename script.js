// الرقم السري للأدمن
const ADMIN_PASSCODE = "2002";
const STORAGE_KEY = "ahl_alaba_bilaad_news";
const AUTH_KEY = "ahl_alaba_admin_logged_in";

// أخبار افتراضية عند فتح الموقع لأول مرة
const defaultNews = [
  {
    id: "1",
    title: "انطلاق برنامج الضيافة الموسمية في مضيف أهل العباء - البلاد القديم",
    category: "خدمات المضيف",
    date: "2026-11-14",
    image: "",
    content: "يعلن مضيف أهل العباء في البلاد القديم عن بدء استقبال الزوار والمشاركين في برنامج الضيافة الموسمية، سائلين المولى عز وجل أن يتقبل من الجميع صالح الأعمال."
  },
  {
    id: "2",
    title: "دعوة لحضور الأمسية الثقافية والإنشادية",
    category: "فعاليات ومناسبات",
    date: "2026-11-12",
    image: "",
    content: "يسر إدارة مضيف أهل العباء بالبلاد القديم دعوتكم لحضور الأمسية الثقافية والإنشادية مساء يوم الخميس القادم تمام الساعة الثامنة مساءً. حضوركم يشرفنا."
  }
];

// جلب الأخبار من التخزين المحلي
function getNews() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultNews));
    return defaultNews;
  }
  return JSON.parse(stored);
}

// حفظ الأخبار في التخزين المحلي
function saveNews(newsArray) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newsArray));
}

// تحميل خبر واحد كملف نصي (.txt)
function downloadSingleNewsTxt(id) {
  const news = getNews().find(item => item.id === id);
  if (!news) return;

  const fileContent = `${news.title}\nالتصنيف: ${news.category} | التاريخ: ${news.date}\n----------------------------------------\n\n${news.content}`;
  const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${news.title.slice(0, 25)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

/* =========================================================
   1. أكواد الصفحة الرئيسية (index.html)
========================================================= */
const publicNewsGrid = document.getElementById("publicNewsGrid");

if (publicNewsGrid) {
  let currentCategory = "الكل";
  let searchQuery = "";

  function renderPublicNews() {
    const allNews = getNews();
    const filtered = allNews.filter(item => {
      const matchCat = currentCategory === "الكل" || item.category === currentCategory;
      const matchSearch = item.title.includes(searchQuery) || item.content.includes(searchQuery);
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      publicNewsGrid.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:2rem; color:#666;">لا توجد أخبار مطابقة لبحثك حالياً.</p>`;
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

  // البحث والتصفية
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

  // نافذة قراءة الخبر
  window.openArticleModal = function(id) {
    const item = getNews().find(n => n.id === id);
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

  renderPublicNews();
}

/* =========================================================
   2. أكواد صفحة الإدارة (admin.html)
========================================================= */
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  const loginSection = document.getElementById("loginSection");
  const dashboardSection = document.getElementById("dashboardSection");
  const logoutBtn = document.getElementById("logoutBtn");
  const newsDateInput = document.getElementById("newsDate");

  // تعيين تاريخ اليوم تلقائياً
  newsDateInput.valueAsDate = new Date();

  // التحقق من حالة تسجيل الدخول
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

  // تسجيل الدخول بالرقم السري 2002
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

  // تسجيل الخروج
  window.logoutAdmin = function() {
    sessionStorage.removeItem(AUTH_KEY);
    document.getElementById("adminPassword").value = "";
    checkAdminAuth();
  };

  // عرض الأخبار في لوحة الأدمن
  function renderAdminNewsList() {
    const listContainer = document.getElementById("adminNewsList");
    const news = getNews();
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
          <button class="btn btn-gold" onclick="editNews('${item.id}')">✏️ تعديل</button>
          <button class="btn btn-danger" onclick="deleteNews('${item.id}')">🗑️ حذف</button>
        </div>
      </div>
    `).join("");
  }

  // حفظ أو تعديل خبر من النموذج
  document.getElementById("newsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("editNewsId").value;
    const title = document.getElementById("newsTitle").value.trim();
    const category = document.getElementById("newsCategory").value;
    const date = document.getElementById("newsDate").value;
    const content = document.getElementById("newsContent").value.trim();
    const fileInput = document.getElementById("newsImageFile");

    const processSave = (imageDataUrl) => {
      let allNews = getNews();
      if (id) {
        // تعديل خبر موجود
        allNews = allNews.map(item => {
          if (item.id === id) {
            return {
              ...item,
              title,
              category,
              date,
              content,
              image: imageDataUrl !== null ? imageDataUrl : item.image
            };
          }
          return item;
        });
      } else {
        // إضافة خبر جديد
        const newEntry = {
          id: Date.now().toString(),
          title,
          category,
          date,
          content,
          image: imageDataUrl || ""
        };
        allNews.unshift(newEntry);
      }
      saveNews(allNews);
      resetNewsForm();
      renderAdminNewsList();
      alert("تم حفظ ونشر الخبر بنجاح!");
    };

    // قراءة الصورة إن وجدت
    if (fileInput.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => processSave(event.target.result);
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      processSave(null);
    }
  });

  // تعبئة النموذج لتعديل خبر
  window.editNews = function(id) {
    const item = getNews().find(n => n.id === id);
    if (!item) return;

    document.getElementById("editNewsId").value = item.id;
    document.getElementById("newsTitle").value = item.title;
    document.getElementById("newsCategory").value = item.category;
    document.getElementById("newsDate").value = item.date;
    document.getElementById("newsContent").value = item.content;

    document.getElementById("formHeading").textContent = "✏️ تعديل الخبر";
    document.getElementById("saveNewsBtn").textContent = "حفظ التعديلات";
    document.getElementById("cancelEditBtn").style.display = "inline-flex";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // إعادة تعيين النموذج
  window.resetNewsForm = function() {
    document.getElementById("newsForm").reset();
    document.getElementById("editNewsId").value = "";
    document.getElementById("newsDate").valueAsDate = new Date();
    document.getElementById("formHeading").textContent = "✍️ كتابة خبر جديد";
    document.getElementById("saveNewsBtn").textContent = "نشر الخبر الآن";
    document.getElementById("cancelEditBtn").style.display = "none";
  };

  // حذف خبر
  window.deleteNews = function(id) {
    if (!confirm("هل أنت متأكد من حذف هذا الخبر؟")) return;
    const filtered = getNews().filter(n => n.id !== id);
    saveNews(filtered);
    renderAdminNewsList();
  };

  // استيراد وتنزيل خبر من ملف (.txt أو .json)
  document.getElementById("importFileInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const allNews = getNews();
      const today = new Date().toISOString().split("T")[0];

      if (file.name.endsWith(".json")) {
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            saveNews([...parsed, ...allNews]);
            alert(`تم استيراد ${parsed.length} خبر بنجاح!`);
          } else if (parsed.title && parsed.content) {
            allNews.unshift({
              id: Date.now().toString(),
              title: parsed.title,
              category: parsed.category || "فعاليات ومناسبات",
              date: parsed.date || today,
              content: parsed.content,
              image: parsed.image || ""
            });
            saveNews(allNews);
            alert("تم استيراد الخبر من ملف JSON بنجاح!");
          }
        } catch {
          alert("ملف JSON غير صالح.");
        }
      } else {
        // معالجة الملف النصي (.txt): السطر الأول عنوان والباقي محتوى
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        if (lines.length === 0) {
          alert("الملف فارغ!");
          return;
        }
        const title = lines[0].trim();
        const content = lines.slice(1).join("\n").trim() || title;

        allNews.unshift({
          id: Date.now().toString(),
          title: title,
          category: "إعلانات",
          date: today,
          content: content,
          image: ""
        });
        saveNews(allNews);
        alert("تم رفع ونشر الخبر من الملف النصي بنجاح!");
      }

      renderAdminNewsList();
      e.target.value = "";
    };
    reader.readAsText(file, "UTF-8");
  });

  // تصدير جميع الأخبار كنسخة احتياطية JSON
  window.exportAllNewsJSON = function() {
    const dataStr = JSON.stringify(getNews(), null, 2);
    const blob = new Blob([dataStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `أخبار_مضيف_أهل_العباء_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  checkAdminAuth();
}
