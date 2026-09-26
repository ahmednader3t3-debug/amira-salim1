const CONTACT_NUMBER = "01068980363";
const WHATSAPP_NUMBER = "201068980363";

let currentUser = null;


/* ================================
   HELPERS
================================ */

function safe(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char])
  );
}

function safeAttr(value) {
  return safe(value).replace(/javascript:/gi, "");
}


/* ================================
   THEME
================================ */

function applyTheme() {

  const dark = localStorage.getItem("amira_theme") === "dark";

  document.body.classList.toggle("dark", dark);

  const themeBtn = document.getElementById("themeBtn");
  const settingsTheme = document.getElementById("settingsTheme");

  if (themeBtn) {
    themeBtn.textContent = dark ? "☀️" : "🌙";
  }

  if (settingsTheme) {
    settingsTheme.classList.toggle("active", dark);
  }
}

function toggleTheme() {

  const isDark =
    document.body.classList.contains("dark");

  localStorage.setItem(
    "amira_theme",
    isDark ? "light" : "dark"
  );

  applyTheme();
}


/* ================================
   MODALS
================================ */

function openModal(id) {
  document.getElementById(id)?.classList.add("show");
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove("show");
}


/* ================================
   INIT
================================ */

async function init() {

  applyTheme();

  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  if (!user) {
    location.href = "login.html";
    return;
  }

  currentUser = user;

  const name =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "الطالب";

  const email = user.email || "";

  document.getElementById("welcome").textContent =
    `أهلاً بك، ${name}`;

  document.getElementById("studentEmail").textContent =
    email;

  document.getElementById("accountName").textContent =
    name;

  document.getElementById("accountEmail").textContent =
    email;

  document.getElementById("avatarLetter").textContent =
    name.charAt(0).toUpperCase();


  await loadCourses();
  await loadAssignments();
  await loadExams();
  await loadGrades();
  await loadNotifications();


  document.getElementById("paymentInfo").innerHTML = `
    <b>طريقة الاشتراك</b><br>
    حوّل قيمة الكورس إلى رقم التواصل
    <strong>${CONTACT_NUMBER}</strong>
    وبعد التحويل اضغط على الاشتراك في الكورس
    وأرسل تأكيد التحويل على واتساب.
  `;
}


/* ================================
   COURSES
================================ */

async function loadCourses() {

  const box =
    document.getElementById("studentCourses");

  const {
    data: courses,
    error
  } = await supabaseClient
    .from("courses")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (error || !courses?.length) {

    box.innerHTML = `
      <div class="empty">
        لا توجد كورسات متاحة حاليًا.
      </div>
    `;

    document.getElementById("coursesCount").textContent = 0;

    return;
  }


  const {
    data: enrollments
  } = await supabaseClient
    .from("enrollments")
    .select("course_id")
    .eq("student_id", currentUser.id);


  const {
    data: requests
  } = await supabaseClient
    .from("course_requests")
    .select("course_id,status")
    .eq("student_id", currentUser.id);


  const enrolled =
    new Set(
      (enrollments || []).map(x => x.course_id)
    );

  const requested =
    new Map(
      (requests || []).map(x => [
        x.course_id,
        x.status
      ])
    );


  document.getElementById("coursesCount").textContent =
    enrolled.size;


  box.innerHTML = courses.map(course => {

    const status =
      requested.get(course.id);

    let action = "";

    if (enrolled.has(course.id)) {

      action = course.video_url
        ? `
          <a
            class="course-btn"
            target="_blank"
            href="${safeAttr(course.video_url)}"
          >
            ▶ فتح المحاضرة
          </a>
        `
        : `
          <div class="approved">
            ✓ الكورس مفعل لك
          </div>
        `;

    } else if (status === "pending") {

      action = `
        <div class="pending">
          ⏳ طلبك قيد المراجعة
        </div>
      `;

    } else if (status === "rejected") {

      action = `
        <button
          class="course-btn"
          onclick="requestCourse('${course.id}')"
        >
          إعادة طلب الكورس
        </button>
      `;

    } else {

      action = `
        <button
          class="course-btn"
          onclick="requestCourse('${course.id}')"
        >
          الاشتراك في الكورس
        </button>
      `;
    }


    return `
      <article class="course">

        <div class="course-icon">
          🩺
        </div>

        <span class="tag">
          دورة تدريبية
        </span>

        <h3>
          ${safe(course.title)}
        </h3>

        <p>
          ${safe(course.description || "")}
        </p>

        ${course.price > 0
          ? `<small>${safe(course.price)} جنيه</small>`
          : ""
        }

        ${action}

      </article>
    `;

  }).join("");
}


/* ================================
   COURSE REQUEST
================================ */

async function requestCourse(courseId) {

  const {
    data: course
  } = await supabaseClient
    .from("courses")
    .select("title")
    .eq("id", courseId)
    .single();


  const { error } =
    await supabaseClient
      .from("course_requests")
      .upsert(
        {
          student_id: currentUser.id,
          course_id: courseId,
          status: "pending"
        },
        {
          onConflict: "student_id,course_id"
        }
      );


  if (error) {

    alert("حصلت مشكلة: " + error.message);

    return;
  }


  const message = encodeURIComponent(
    `مرحباً، أنا ${
      currentUser.user_metadata?.full_name ||
      currentUser.email
    } وأريد الاشتراك في كورس: ${
      course?.title || ""
    }. تم التحويل على رقم ${CONTACT_NUMBER}.`
  );


  window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`,
    "_blank"
  );


  alert(
    "تم تسجيل طلبك، وبعد مراجعة التحويل سيتم تفعيل الكورس."
  );

  await loadCourses();
}


/* ================================
   ASSIGNMENTS
================================ */

async function loadAssignments() {

  const box =
    document.getElementById("assignmentsList");

  const {
    data,
    error
  } = await supabaseClient
    .from("assignments")
    .select("*")
    .order("due_at", {
      ascending: true,
      nullsFirst: false
    });


  if (error || !data?.length) {

    box.innerHTML = `
      <div class="empty">
        لا توجد واجبات حاليًا.
      </div>
    `;

    document.getElementById("assignmentsCount").textContent = 0;

    return;
  }


  document.getElementById("assignmentsCount").textContent =
    data.length;


  box.innerHTML = data.map(item => `
    <div class="dashboard-item">

      <div>

        <span class="tag">
          📝 واجب
        </span>

        <h3>
          ${safe(item.title)}
        </h3>

        <p>
          ${safe(item.description || "")}
        </p>

        ${
          item.due_at
            ? `<small>موعد التسليم: ${new Date(item.due_at).toLocaleString("ar-EG")}</small>`
            : ""
        }

      </div>

      <div class="dashboard-item-side">
        <strong>
          ${safe(item.max_score)}
        </strong>
        <small>الدرجة النهائية</small>
      </div>

    </div>
  `).join("");
}


/* ================================
   EXAMS
================================ */

async function loadExams() {

  const box =
    document.getElementById("examsList");

  const {
    data,
    error
  } = await supabaseClient
    .from("exams")
    .select("*")
    .order("starts_at", {
      ascending: true
    });


  if (error || !data?.length) {

    box.innerHTML = `
      <div class="empty">
        لا توجد امتحانات حاليًا.
      </div>
    `;

    document.getElementById("examsCount").textContent = 0;

    return;
  }


  document.getElementById("examsCount").textContent =
    data.length;


  box.innerHTML = data.map(exam => `

    <div class="dashboard-item">

      <div>

        <span class="tag">
          🧪 امتحان
        </span>

        <h3>
          ${safe(exam.title)}
        </h3>

        <p>
          ${safe(exam.description || "")}
        </p>

        <small>
          مدة الامتحان:
          ${safe(exam.duration_minutes)} دقيقة
        </small>

      </div>

      <div class="dashboard-item-side">

        ${
          exam.exam_url
            ? `
              <a
                class="course-btn"
                target="_blank"
                href="${safeAttr(exam.exam_url)}"
              >
                دخول الامتحان
              </a>
            `
            : `
              <small>
                لم يبدأ بعد
              </small>
            `
        }

      </div>

    </div>

  `).join("");
}


/* ================================
   GRADES
================================ */

async function loadGrades() {

  const box =
    document.getElementById("gradesList");

  const {
    data,
    error
  } = await supabaseClient
    .from("exam_results")
    .select(`
      score,
      feedback,
      exams (
        title,
        max_score
      )
    `)
    .eq("student_id", currentUser.id)
    .order("submitted_at", {
      ascending: false
    });


  if (error || !data?.length) {

    box.innerHTML = `
      <div class="empty">
        لا توجد نتائج حتى الآن.
      </div>
    `;

    document.getElementById("gradesCount").textContent = 0;

    return;
  }


  document.getElementById("gradesCount").textContent =
    data.length;


  box.innerHTML = data.map(result => `

    <div class="grade-item">

      <div>

        <span class="tag">
          RESULT
        </span>

        <h3>
          ${safe(result.exams?.title || "امتحان")}
        </h3>

      </div>

      <strong>
        ${safe(result.score ?? "-")}
        /
        ${safe(result.exams?.max_score ?? 100)}
      </strong>

    </div>

  `).join("");
}


/* ================================
   NOTIFICATIONS
================================ */

async function loadNotifications() {

  const box =
    document.getElementById("notificationsList");

  const {
    data,
    error
  } = await supabaseClient
    .from("notifications")
    .select("*")
    .order("created_at", {
      ascending: false
    });


  if (error || !data?.length) {

    box.innerHTML = `
      <div class="empty">
        لا توجد إشعارات جديدة.
      </div>
    `;

    return;
  }


  box.innerHTML = data.map(notification => `

    <div class="notification-item">

      <div class="notification-icon">
        🔔
      </div>

      <div>

        <h3>
          ${safe(notification.title)}
        </h3>

        <p>
          ${safe(notification.message || "")}
        </p>

        <small>
          ${new Date(notification.created_at).toLocaleString("ar-EG")}
        </small>

      </div>

    </div>

  `).join("");
}


/* ================================
   EVENTS
================================ */

document.getElementById("themeBtn")
  ?.addEventListener("click", toggleTheme);

document.getElementById("settingsTheme")
  ?.addEventListener("click", toggleTheme);


document.getElementById("profileBtn")
  ?.addEventListener(
    "click",
    () => openModal("profileModal")
  );


document.getElementById("settingsBtn")
  ?.addEventListener(
    "click",
    () => openModal("settingsModal")
  );


document.getElementById("closeProfile")
  ?.addEventListener(
    "click",
    () => closeModal("profileModal")
  );


document.getElementById("closeSettings")
  ?.addEventListener(
    "click",
    () => closeModal("settingsModal")
  );


document.getElementById("modalLogout")
  ?.addEventListener(
    "click",
    async () => {

      await supabaseClient.auth.signOut();

      location.href = "index.html";
    }
  );


document.getElementById("logout")
  ?.addEventListener(
    "click",
    async () => {

      await supabaseClient.auth.signOut();

      location.href = "index.html";
    }
  );


document.getElementById("languageSelect")
  ?.addEventListener(
    "change",
    event => {

      localStorage.setItem(
        "amira_language",
        event.target.value
      );

      if (event.target.value === "en") {

        alert(
          "English interface will be added in the next update."
        );

        event.target.value = "ar";
      }
    }
  );


/* Close modal when clicking outside */

document.querySelectorAll(".modal")
  .forEach(modal => {

    modal.addEventListener(
      "click",
      event => {

        if (event.target === modal) {
          modal.classList.remove("show");
        }

      }
    );

  });


/* START */

init();
