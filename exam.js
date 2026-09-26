const examLoading = document.getElementById("examLoading");
const examContent = document.getElementById("examContent");
const examError = document.getElementById("examError");
const examErrorText = document.getElementById("examErrorText");

const examTitle = document.getElementById("examTitle");
const examDescription = document.getElementById("examDescription");
const lectureTitle = document.getElementById("lectureTitle");
const maxScore = document.getElementById("maxScore");

const examReady = document.getElementById("examReady");
const examNoUrl = document.getElementById("examNoUrl");
const openExamBtn = document.getElementById("openExamBtn");

const themeBtn = document.getElementById("themeBtn");


// =====================================
// استخراج ID الاختبار من الرابط
// =====================================

const params = new URLSearchParams(window.location.search);
const examId = params.get("id");


// =====================================
// Dark / Light Mode
// =====================================

function applySavedTheme() {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
}

applySavedTheme();


if (themeBtn) {
  themeBtn.addEventListener("click", () => {

    document.body.classList.toggle("dark");

    const isDark =
      document.body.classList.contains("dark");

    localStorage.setItem(
      "theme",
      isDark ? "dark" : "light"
    );
  });
}


// =====================================
// التأكد من تسجيل الدخول
// =====================================

async function checkUser() {

  const {
    data: { user },
    error
  } = await supabaseClient.auth.getUser();

  if (error || !user) {
    location.href = "login.html";
    return null;
  }

  return user;
}


// =====================================
// تحميل الاختبار
// =====================================

async function loadExam() {

  if (!examId) {
    showError("رابط الاختبار غير صحيح.");
    return;
  }

  const user = await checkUser();

  if (!user) return;


  const { data: exam, error } = await supabaseClient
    .from("lecture_exams")
    .select(`
      id,
      title,
      description,
      exam_url,
      max_score,
      lecture_id,
      lectures (
        id,
        title,
        course_id,
        is_free
      )
    `)
    .eq("id", examId)
    .maybeSingle();


  if (error) {
    console.error(error);
    showError(
      "حدث خطأ أثناء تحميل بيانات الاختبار."
    );
    return;
  }


  if (!exam) {
    showError(
      "الاختبار غير موجود أو غير متاح لحسابك."
    );
    return;
  }


  renderExam(exam);
}


// =====================================
// عرض الاختبار
// =====================================

function renderExam(exam) {

  examTitle.textContent =
    exam.title || "اختبار المحاضرة";


  examDescription.textContent =
    exam.description || "";


  lectureTitle.textContent =
    exam.lectures?.title || "—";


  maxScore.textContent =
    exam.max_score ?? "—";


  if (exam.exam_url) {

    openExamBtn.href = exam.exam_url;

    examReady.style.display = "block";
    examNoUrl.style.display = "none";

  } else {

    examReady.style.display = "none";
    examNoUrl.style.display = "block";

  }


  examLoading.style.display = "none";
  examContent.style.display = "block";
}


// =====================================
// عرض خطأ
// =====================================

function showError(message) {

  examLoading.style.display = "none";
  examContent.style.display = "none";

  examError.style.display = "block";

  examErrorText.textContent = message;
}


// =====================================
// تشغيل
// =====================================

loadExam();
