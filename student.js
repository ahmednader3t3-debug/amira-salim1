let currentUser = null;
let currentProfile = null;
let currentCourse = null;
let currentEnrollments = [];
let currentRequests = [];

const coursesGrid = document.getElementById("coursesGrid");
const courseContent = document.getElementById("courseContent");
const lecturesList = document.getElementById("lecturesList");

const themeBtn = document.getElementById("themeBtn");
const whatsappBtn = document.getElementById("whatsappBtn");

const accountBtn = document.getElementById("accountBtn");
const accountDropdown = document.getElementById("accountDropdown");

const logoutBtn = document.getElementById("logoutBtn");

const academicYearSelect =
  document.getElementById("academicYear");


// =========================
// START
// =========================

document.addEventListener("DOMContentLoaded", init);


async function init() {

  setupTheme();
  setupAccountMenu();
  setupButtons();

  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  if (!user) {
    location.href = "login.html";
    return;
  }

  currentUser = user;


  // =========================
  // GET PROFILE
  // =========================

  const { data: profile, error } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

  if (error) {
    console.error(error);
  }

  currentProfile = profile;


  // لو Admin يدخل صفحة الإدارة
  if (profile?.role === "admin") {
    location.href = "admin.html";
    return;
  }


  // =========================
  // PROFILE UI
  // =========================

  const name =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    "الطالب";

  document.getElementById("profileName").textContent = name;

  document.getElementById("profileEmail").textContent =
    user.email || "";

  document.getElementById("welcomeName").textContent =
    name;

  const firstLetter =
    name.trim().charAt(0).toUpperCase() || "A";

  accountBtn.textContent = firstLetter;


  // =========================
  // YEAR
  // =========================

  const year = Number(profile?.academic_year) || 1;

  academicYearSelect.value = year;

  updateYearText(year);


  // =========================
  // LOAD DATA
  // =========================

  await loadEnrollments();
  await loadRequests();
  await loadCourses(year);
}


// =========================
// THEME
// =========================

function setupTheme() {

  const savedTheme =
    localStorage.getItem("theme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark");

    themeBtn.textContent = "☀️";
  }

  themeBtn.addEventListener("click", () => {

    document.body.classList.toggle("dark");

    const isDark =
      document.body.classList.contains("dark");

    localStorage.setItem(
      "theme",
      isDark ? "dark" : "light"
    );

    themeBtn.textContent =
      isDark ? "☀️" : "🌙";
  });
}


// =========================
// ACCOUNT MENU
// =========================

function setupAccountMenu() {

  accountBtn.addEventListener("click", (e) => {

    e.stopPropagation();

    accountDropdown.classList.toggle("show");

  });


  document.addEventListener("click", () => {

    accountDropdown.classList.remove("show");

  });


  accountDropdown.addEventListener(
    "click",
    (e) => e.stopPropagation()
  );
}


// =========================
// BUTTONS
// =========================

function setupButtons() {

  whatsappBtn.href = whatsappUrl();


  logoutBtn.addEventListener(
    "click",
    logout
  );


  academicYearSelect.addEventListener(
    "change",
    async () => {

      const year =
        Number(academicYearSelect.value);

      if (![1, 2, 3].includes(year)) {
        return;
      }


      updateYearText(year);


      const { error } =
        await supabaseClient
          .from("profiles")
          .update({
            academic_year: year
          })
          .eq("id", currentUser.id);


      if (error) {

        alert(
          "حصل خطأ أثناء حفظ السنة الدراسية."
        );

        return;
      }


      await loadCourses(year);

      courseContent.style.display = "none";

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    }
  );


  document
    .getElementById("backCoursesBtn")
    .addEventListener("click", () => {

      courseContent.style.display = "none";

      currentCourse = null;

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    });
}


// =========================
// LOAD ENROLLMENTS
// =========================

async function loadEnrollments() {

  const { data, error } =
    await supabaseClient
      .from("enrollments")
      .select("course_id")
      .eq("student_id", currentUser.id);

  if (error) {
    console.error(error);

    currentEnrollments = [];

    return;
  }

  currentEnrollments = data || [];
}


// =========================
// LOAD REQUESTS
// =========================

async function loadRequests() {

  const { data, error } =
    await supabaseClient
      .from("course_requests")
      .select("course_id,status")
      .eq("student_id", currentUser.id);

  if (error) {
    console.error(error);

    currentRequests = [];

    return;
  }

  currentRequests = data || [];
}


// =========================
// LOAD COURSES
// =========================

async function loadCourses(year) {

  coursesGrid.innerHTML = `
    <div class="loading-card">

      <div class="loader"></div>

      <p>
        جاري تحميل الكورسات...
      </p>

    </div>
  `;


  const { data, error } =
    await supabaseClient
      .from("courses")
      .select("*")
      .eq("academic_year", year)
      .eq("is_visible", true)
      .order("created_at", {
        ascending: false
      });


  if (error) {

    console.error(error);

    coursesGrid.innerHTML = `
      <div class="empty-card">

        <h3>
          حصل خطأ
        </h3>

        <p>
          مش قادرين نحمل الكورسات دلوقتي.
        </p>

      </div>
    `;

    return;
  }


  const courses = data || [];


  document.getElementById(
    "coursesCount"
  ).textContent = courses.length;


  if (courses.length === 0) {

    coursesGrid.innerHTML = `
      <div class="empty-card">

        <h3>
          مفيش كورسات للسنة دي حالياً
        </h3>

        <p>
          لما يتم إضافة كورسات هتظهر هنا.
        </p>

      </div>
    `;

    return;
  }


  coursesGrid.innerHTML =
    courses.map(renderCourseCard).join("");
}


// =========================
// COURSE CARD
// =========================

function renderCourseCard(course) {

  const enrolled =
    currentEnrollments.some(
      e => e.course_id === course.id
    );


  const request =
    currentRequests.find(
      r => r.course_id === course.id
    );


  const price =
    Number(course.price) === 0
      ? "مجاني"
      : `${Number(course.price).toLocaleString("ar-EG")} جنيه`;


  const image = course.image_url

    ? `
      <img
        src="${escapeHtml(course.image_url)}"
        alt="${escapeHtml(course.title)}"
        class="course-image"
      >
    `

    : `
      <div class="course-image-placeholder">
        🩺
      </div>
    `;


  let action = "";


  // FREE
  if (Number(course.price) === 0) {

    action = `
      <button
        class="btn btn-primary full-btn"
        onclick="openCourse('${course.id}')"
      >
        فتح الكورس
      </button>
    `;

  }


  // ENROLLED
  else if (enrolled) {

    action = `
      <button
        class="btn btn-primary full-btn"
        onclick="openCourse('${course.id}')"
      >
        🔓 فتح الكورس
      </button>
    `;

  }


  // PENDING
  else if (request?.status === "pending") {

    action = `
      <button
        class="btn btn-outline full-btn"
        disabled
        style="cursor:not-allowed;opacity:.7;"
      >
        ⏳ طلب الاشتراك قيد المراجعة
      </button>
    `;

  }


  // REJECTED
  else if (request?.status === "rejected") {

    action = `
      <button
        class="btn btn-primary full-btn"
        onclick="requestCourse('${course.id}')"
      >
        🔄 طلب الاشتراك مرة أخرى
      </button>
    `;

  }


  // PAID
  else {

    action = `
      <button
        class="btn btn-primary full-btn"
        onclick="requestCourse('${course.id}')"
      >
        💳 الاشتراك في الكورس
      </button>
    `;

  }


  return `
    <article class="course-card">

      ${image}

      <div class="course-card-body">

        <div class="course-top">

          <span class="year-badge">
            السنة ${course.academic_year}
          </span>

          <span class="price-badge">
            ${price}
          </span>

        </div>


        <h3>
          ${escapeHtml(course.title)}
        </h3>


        <p>
          ${escapeHtml(
            course.description ||
            "كورس تعليمي لطلاب التمريض."
          )}
        </p>


        ${action}

      </div>

    </article>
  `;
}


// =========================
// OPEN COURSE
// =========================

async function openCourse(courseId) {

  const { data: course, error } =
    await supabaseClient
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .maybeSingle();


  if (error || !course) {

    alert("الكورس غير موجود.");

    return;
  }


  const enrolled =
    currentEnrollments.some(
      e => e.course_id === courseId
    );


  // الكورس المدفوع لازم يكون الطالب مشترك فيه
  if (
    Number(course.price) > 0 &&
    !enrolled
  ) {

    alert(
      "لازم تشترك في الكورس الأول علشان تقدر تفتحه."
    );

    return;
  }


  currentCourse = course;


  document.getElementById(
    "selectedCourseTitle"
  ).textContent = course.title;


  document.getElementById(
    "selectedCourseYear"
  ).textContent =
    `الفرقة ${course.academic_year}`;


  document.getElementById(
    "selectedCourseDescription"
  ).textContent =
    course.description || "";


  courseContent.style.display = "block";


  lecturesList.innerHTML = `
    <div class="loading-card">

      <div class="loader"></div>

      <p>
        جاري تحميل المحاضرات...
      </p>

    </div>
  `;


  const { data: lectures, error } =
    await supabaseClient
      .from("lectures")
      .select("*")
      .eq("course_id", courseId)
      .order("lecture_order", {
        ascending: true
      });


  if (error) {

    console.error(error);

    lecturesList.innerHTML = `
      <div class="empty-card">
        <h3>حصل خطأ</h3>
        <p>تعذر تحميل المحاضرات.</p>
      </div>
    `;

    return;
  }


  if (!lectures || lectures.length === 0) {

    lecturesList.innerHTML = `
      <div class="empty-card">

        <h3>
          لسه مفيش محاضرات
        </h3>

        <p>
          المحاضرات هتظهر هنا لما الإدارة تضيفها.
        </p>

      </div>
    `;

    return;
  }


  const examIds =
    await getExamIds(
      lectures.map(l => l.id)
    );


  document.getElementById(
    "examsCount"
  ).textContent = examIds.length;


  lecturesList.innerHTML =
    lectures.map(
      lecture =>
        renderLecture(
          lecture,
          examIds
        )
    ).join("");


  courseContent.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


// =========================
// EXAM IDS
// =========================

async function getExamIds(lectureIds) {

  if (!lectureIds.length) {
    return [];
  }


  const { data, error } =
    await supabaseClient
      .from("lecture_exams")
      .select("id,lecture_id")
      .in("lecture_id", lectureIds);


  if (error) {

    console.error(error);

    return [];
  }


  return data || [];
}


// =========================
// RENDER LECTURE
// =========================

function renderLecture(lecture, examIds) {

  const isFree =
    lecture.is_free === true;


  const exam =
    examIds.find(
      e => e.lecture_id === lecture.id
    );


  const badge = isFree

    ? `
      <span class="free-badge">
        🆓 مجانية
      </span>
    `

    : `
      <span class="lock-badge">
        🔒 ضمن الكورس
      </span>
    `;


  const videoButton =
    lecture.video_url

      ? `
        <a
          href="${escapeHtml(lecture.video_url)}"
          target="_blank"
          rel="noopener"
          class="btn btn-primary small-btn"
        >
          ▶ الفيديو
        </a>
      `

      : "";


  const pdfButton =
    lecture.pdf_url

      ? `
        <a
          href="${escapeHtml(lecture.pdf_url)}"
          target="_blank"
          rel="noopener"
          class="btn btn-outline small-btn"
        >
          📄 PDF
        </a>
      `

      : "";


  const examButton =
    exam

      ? `
        <a
          href="${escapeHtml(
            `exam.html?id=${exam.id}`
          )}"
          class="btn btn-outline small-btn"
        >
          📝 الاختبار
        </a>
      `

      : "";


  return `
    <article class="lecture-item">

      <div class="lecture-info">

        <div style="
          display:flex;
          align-items:center;
          gap:8px;
          flex-wrap:wrap;
          margin-bottom:5px;
        ">

          <h3>
            ${escapeHtml(lecture.title)}
          </h3>

          ${badge}

        </div>


        <p>
          ${escapeHtml(
            lecture.description || ""
          )}
        </p>

      </div>


      <div class="lecture-actions">

        ${videoButton}

        ${pdfButton}

        ${examButton}

      </div>

    </article>
  `;
}


// =========================
// REQUEST COURSE
// =========================

async function requestCourse(courseId) {

  const { data: course, error } =
    await supabaseClient
      .from("courses")
      .select("id,title,price")
      .eq("id", courseId)
      .maybeSingle();


  if (error || !course) {

    alert("الكورس غير موجود.");

    return;
  }


  if (Number(course.price) === 0) {

    await openCourse(courseId);

    return;
  }


  const existing =
    currentRequests.find(
      r => r.course_id === courseId
    );


  if (existing?.status === "pending") {

    alert(
      "أنت بالفعل قدمت طلب اشتراك في الكورس."
    );

    return;
  }


  const { error: insertError } =
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


  if (insertError) {

    console.error(insertError);

    alert(
      "حصل خطأ أثناء إرسال طلب الاشتراك."
    );

    return;
  }


  const message =
    `السلام عليكم د. أميرة سليم، أريد الاشتراك في كورس: ${course.title}`;


  window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
    "_blank"
  );


  await loadRequests();

  const year =
    Number(academicYearSelect.value);

  await loadCourses(year);


  alert(
    "تم إرسال طلب الاشتراك. تواصل مع الإدارة على واتساب لإتمام الاشتراك."
  );
}


// =========================
// YEAR TEXT
// =========================

function updateYearText(year) {

  const names = {
    1: "الفرقة الأولى",
    2: "الفرقة الثانية",
    3: "الفرقة الثالثة"
  };


  document.getElementById(
    "yearText"
  ).textContent =
    names[year] || "-";
}


// =========================
// LOGOUT
// =========================

async function logout() {

  await supabaseClient.auth.signOut();

  location.href = "index.html";
}


// =========================
// ESCAPE HTML
// =========================

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
