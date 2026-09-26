const adminName = document.getElementById("adminName");
const adminEmail = document.getElementById("adminEmail");

const coursesList = document.getElementById("coursesList");
const lecturesList = document.getElementById("lecturesList");
const requestsList = document.getElementById("requestsList");
const examsList = document.getElementById("examsList");

const lectureCourse = document.getElementById("lectureCourse");
const examLecture = document.getElementById("examLecture");

const questionExam = document.getElementById("questionExam");
const optionQuestion = document.getElementById("optionQuestion");

const courseForm = document.getElementById("courseForm");
const lectureForm = document.getElementById("lectureForm");
const examForm = document.getElementById("examForm");
const questionForm = document.getElementById("questionForm");
const optionForm = document.getElementById("optionForm");

const statsCourses = document.getElementById("statsCourses");
const statsLectures = document.getElementById("statsLectures");
const statsRequests = document.getElementById("statsRequests");


function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// =====================================
// حماية لوحة الإدارة
// =====================================

async function checkAdmin() {

  const {
    data: { user },
    error
  } = await supabaseClient.auth.getUser();

  if (error || !user) {
    location.href = "login.html";
    return null;
  }

  const { data: profile, error: profileError } =
    await supabaseClient
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("id", user.id)
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {
    alert("ليس لديك صلاحية دخول لوحة الإدارة.");
    location.href = "student.html";
    return null;
  }

  adminName.textContent =
    profile.full_name || "Admin";

  adminEmail.textContent =
    profile.email || user.email || "";

  return user;
}


// =====================================
// تحميل الكورسات
// =====================================

async function loadCourses() {

  const { data, error } = await supabaseClient
    .from("courses")
    .select("*")
    .order("academic_year", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    coursesList.innerHTML =
      "<p>حدث خطأ أثناء تحميل الكورسات.</p>";
    return [];
  }

  statsCourses.textContent = data.length;

  renderCourses(data);
  fillCourseSelect(data);

  return data;
}


function renderCourses(courses) {

  if (!courses.length) {
    coursesList.innerHTML = `
      <div class="empty-state">
        لا توجد كورسات حتى الآن.
      </div>
    `;
    return;
  }

  coursesList.innerHTML = courses.map(course => `

    <div class="admin-card">

      <div class="admin-card-info">

        <h3>
          ${escapeHtml(course.title)}
        </h3>

        <p>
          ${escapeHtml(course.description || "بدون وصف")}
        </p>

        <div class="admin-meta">

          <span>
            السنة: ${course.academic_year}
          </span>

          <span>
            السعر:
            ${Number(course.price).toFixed(2)}
            جنيه
          </span>

          <span>
            ${course.is_visible ? "ظاهر" : "مخفي"}
          </span>

        </div>

      </div>

      <div class="admin-actions">

        <button
          class="danger-btn"
          onclick="deleteCourse('${course.id}')"
        >
          حذف
        </button>

      </div>

    </div>

  `).join("");
}


function fillCourseSelect(courses) {

  lectureCourse.innerHTML = `
    <option value="">
      اختر الكورس
    </option>

    ${courses.map(course => `
      <option value="${course.id}">
        ${escapeHtml(course.title)}
        — السنة ${course.academic_year}
      </option>
    `).join("")}
  `;
}


// =====================================
// تحميل المحاضرات
// =====================================

async function loadLectures() {

  const { data, error } = await supabaseClient
    .from("lectures")
    .select(`
      *,
      courses (
        title,
        academic_year
      )
    `)
    .order("course_id")
    .order("lecture_order");

  if (error) {
    console.error(error);
    lecturesList.innerHTML =
      "<p>حدث خطأ أثناء تحميل المحاضرات.</p>";
    return [];
  }

  statsLectures.textContent = data.length;

  renderLectures(data);
  fillExamLectureSelect(data);

  return data;
}


function renderLectures(lectures) {

  if (!lectures.length) {
    lecturesList.innerHTML = `
      <div class="empty-state">
        لا توجد محاضرات حتى الآن.
      </div>
    `;
    return;
  }

  lecturesList.innerHTML = lectures.map(lecture => `

    <div class="admin-card">

      <div class="admin-card-info">

        <h3>
          ${escapeHtml(lecture.title)}
        </h3>

        <p>
          الكورس:
          ${escapeHtml(
            lecture.courses?.title || "غير معروف"
          )}
        </p>

        <div class="admin-meta">

          <span>
            رقم ${lecture.lecture_order}
          </span>

          <span>
            ${lecture.is_free ? "مجانية" : "مقفولة"}
          </span>

          <span>
            ${lecture.video_url ? "فيديو ✓" : "فيديو ✕"}
          </span>

          <span>
            ${lecture.pdf_url ? "PDF ✓" : "PDF ✕"}
          </span>

        </div>

      </div>

      <div class="admin-actions">

        <button
          class="danger-btn"
          onclick="deleteLecture('${lecture.id}')"
        >
          حذف
        </button>

      </div>

    </div>

  `).join("");
}


function fillExamLectureSelect(lectures) {

  examLecture.innerHTML = `
    <option value="">
      اختر المحاضرة
    </option>

    ${lectures.map(lecture => `
      <option value="${lecture.id}">
        ${escapeHtml(
          lecture.courses?.title || ""
        )}
        — ${escapeHtml(lecture.title)}
      </option>
    `).join("")}
  `;
}


// =====================================
// تحميل الاختبارات
// =====================================

async function loadExams() {

  const { data, error } = await supabaseClient
    .from("lecture_exams")
    .select(`
      id,
      title,
      description,
      max_score,
      lecture_id,
      lectures (
        title,
        course_id,
        courses (
          title
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    examsList.innerHTML =
      "<p>حدث خطأ أثناء تحميل الاختبارات.</p>";
    return [];
  }

  renderExams(data);
  fillExamSelect(data);

  await loadQuestions();

  return data;
}


function renderExams(exams) {

  if (!exams.length) {
    examsList.innerHTML = `
      <div class="empty-state">
        لا توجد اختبارات حتى الآن.
      </div>
    `;
    return;
  }

  examsList.innerHTML = exams.map(exam => `

    <div class="admin-card">

      <div class="admin-card-info">

        <h3>
          ${escapeHtml(exam.title)}
        </h3>

        <p>
          الكورس:
          ${escapeHtml(
            exam.lectures?.courses?.title || ""
          )}
        </p>

        <p>
          المحاضرة:
          ${escapeHtml(
            exam.lectures?.title || ""
          )}
        </p>

        <div class="admin-meta">

          <span>
            الدرجة:
            ${exam.max_score}
          </span>

        </div>

      </div>

    </div>

  `).join("");
}


function fillExamSelect(exams) {

  questionExam.innerHTML = `
    <option value="">
      اختر الاختبار
    </option>

    ${exams.map(exam => `
      <option value="${exam.id}">
        ${escapeHtml(exam.title)}
        — ${escapeHtml(
          exam.lectures?.title || ""
        )}
      </option>
    `).join("")}
  `;
}


// =====================================
// إضافة / تحديث اختبار
// =====================================

examForm.addEventListener("submit", async (e) => {

  e.preventDefault();

  const lectureId =
    examLecture.value;

  const title =
    document.getElementById("examTitle")
      .value.trim();

  const description =
    document.getElementById("examDescription")
      .value.trim();

  const maxScore =
    Number(
      document.getElementById("examMaxScore")
        .value
    );

  if (
    !lectureId ||
    !title ||
    !Number.isFinite(maxScore) ||
    maxScore <= 0
  ) {
    alert("راجع بيانات الاختبار.");
    return;
  }

  const { error } =
    await supabaseClient
      .from("lecture_exams")
      .upsert(
        {
          lecture_id: lectureId,
          title,
          description,
          max_score: maxScore
        },
        {
          onConflict: "lecture_id"
        }
      );

  if (error) {
    console.error(error);
    alert("حدث خطأ أثناء حفظ الاختبار.");
    return;
  }

  alert("تم حفظ الاختبار بنجاح.");

  examForm.reset();

  await loadExams();
});


// =====================================
// إضافة سؤال
// =====================================

questionForm.addEventListener("submit", async (e) => {

  e.preventDefault();

  const examId =
    questionExam.value;

  const questionText =
    document.getElementById("questionText")
      .value.trim();

  const questionOrder =
    Number(
      document.getElementById("questionOrder")
        .value
    );

  if (
    !examId ||
    !questionText ||
    !Number.isFinite(questionOrder) ||
    questionOrder < 1
  ) {
    alert("راجع بيانات السؤال.");
    return;
  }

  const { error } =
    await supabaseClient
      .from("exam_questions")
      .insert({
        exam_id: examId,
        question_text: questionText,
        question_order: questionOrder
      });

  if (error) {
    console.error(error);
    alert("حدث خطأ أثناء إضافة السؤال.");
    return;
  }

  alert("تم إضافة السؤال.");

  questionForm.reset();

  await loadQuestions();
});


// =====================================
// تحميل الأسئلة
// =====================================

async function loadQuestions() {

  const { data, error } =
    await supabaseClient
      .from("exam_questions")
      .select(`
        id,
        question_text,
        question_order,
        exam_id,
        lecture_exams (
          title
        )
      `)
      .order("exam_id")
      .order("question_order");

  if (error) {
    console.error(error);
    return;
  }

  fillQuestionSelect(data);
}


function fillQuestionSelect(questions) {

  optionQuestion.innerHTML = `
    <option value="">
      اختر السؤال
    </option>

    ${questions.map(question => `
      <option value="${question.id}">
        ${escapeHtml(
          question.lecture_exams?.title || ""
        )}
        — ${escapeHtml(
          question.question_text
        )}
      </option>
    `).join("")}
  `;
}


// =====================================
// إضافة اختيار
// =====================================

optionForm.addEventListener("submit", async (e) => {

  e.preventDefault();

  const questionId =
    optionQuestion.value;

  const optionText =
    document.getElementById("optionText")
      .value.trim();

  const optionOrder =
    Number(
      document.getElementById("optionOrder")
        .value
    );

  const isCorrect =
    document.getElementById("optionCorrect")
      .checked;

  if (
    !questionId ||
    !optionText ||
    !Number.isFinite(optionOrder) ||
    optionOrder < 1
  ) {
    alert("راجع بيانات الاختيار.");
    return;
  }

  /*
    لو الاختيار الجديد هو الصحيح،
    نخلي باقي اختيارات السؤال غير صحيحة.
  */

  if (isCorrect) {

    const { error: resetError } =
      await supabaseClient
        .from("exam_options")
        .update({
          is_correct: false
        })
        .eq("question_id", questionId);

    if (resetError) {
      console.error(resetError);
      alert("حدث خطأ أثناء تحديد الإجابة الصحيحة.");
      return;
    }
  }

  const { error } =
    await supabaseClient
      .from("exam_options")
      .insert({
        question_id: questionId,
        option_text: optionText,
        option_order: optionOrder,
        is_correct: isCorrect
      });

  if (error) {
    console.error(error);
    alert("حدث خطأ أثناء إضافة الاختيار.");
    return;
  }

  alert("تم إضافة الاختيار.");

  optionForm.reset();

  await loadQuestions();
});


// =====================================
// إضافة كورس
// =====================================

courseForm.addEventListener("submit", async (e) => {

  e.preventDefault();

  const title =
    document.getElementById("courseTitle")
      .value.trim();

  const description =
    document.getElementById("courseDescription")
      .value.trim();

  const academicYear =
    Number(
      document.getElementById("courseYear")
        .value
    );

  const price =
    Number(
      document.getElementById("coursePrice")
        .value
    );

  const imageUrl =
    document.getElementById("courseImage")
      .value.trim();

  const isVisible =
    document.getElementById("courseVisible")
      .checked;

  if (
    !title ||
    ![1, 2, 3].includes(academicYear) ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    alert("راجع بيانات الكورس.");
    return;
  }

  const { error } =
    await supabaseClient
      .from("courses")
      .insert({
        title,
        description,
        academic_year: academicYear,
        price,
        image_url: imageUrl || null,
        is_visible: isVisible
      });

  if (error) {
    console.error(error);
    alert("حدث خطأ أثناء إضافة الكورس.");
    return;
  }

  alert("تم إضافة الكورس بنجاح.");

  courseForm.reset();

  document.getElementById("courseVisible").checked = true;

  await loadCourses();
});


// =====================================
// إضافة محاضرة
// =====================================

lectureForm.addEventListener("submit", async (e) => {

  e.preventDefault();

  const courseId =
    lectureCourse.value;

  const title =
    document.getElementById("lectureTitle")
      .value.trim();

  const description =
    document.getElementById("lectureDescription")
      .value.trim();

  const videoUrl =
    document.getElementById("lectureVideo")
      .value.trim();

  const pdfUrl =
    document.getElementById("lecturePdf")
      .value.trim();

  const lectureOrder =
    Number(
      document.getElementById("lectureOrder")
        .value
    );

  const isFree =
    document.getElementById("lectureFree")
      .checked;

  if (
    !courseId ||
    !title ||
    !Number.isFinite(lectureOrder) ||
    lectureOrder < 1
  ) {
    alert("راجع بيانات المحاضرة.");
    return;
  }

  const { error } =
    await supabaseClient
      .from("lectures")
      .insert({
        course_id: courseId,
        title,
        description,
        video_url: videoUrl || null,
        pdf_url: pdfUrl || null,
        lecture_order: lectureOrder,
        is_free: isFree
      });

  if (error) {
    console.error(error);
    alert("حدث خطأ أثناء إضافة المحاضرة.");
    return;
  }

  alert("تم إضافة المحاضرة.");

  lectureForm.reset();

  await loadLectures();
});


// =====================================
// طلبات الاشتراك
// =====================================

async function loadRequests() {

  const { data, error } =
    await supabaseClient
      .from("course_requests")
      .select(`
        id,
        status,
        created_at,
        student_id,
        course_id,
        courses (
          title,
          price
        ),
        profiles (
          full_name,
          email
        )
      `)
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error(error);
    requestsList.innerHTML =
      "<p>حدث خطأ أثناء تحميل الطلبات.</p>";
    return;
  }

  const pending =
    data.filter(
      request => request.status === "pending"
    ).length;

  statsRequests.textContent = pending;

  renderRequests(data);
}


function renderRequests(requests) {

  if (!requests.length) {
    requestsList.innerHTML = `
      <div class="empty-state">
        لا توجد طلبات اشتراك.
      </div>
    `;
    return;
  }

  requestsList.innerHTML =
    requests.map(request => {

      let statusText = "قيد الانتظار";

      if (request.status === "approved") {
        statusText = "تمت الموافقة";
      }

      if (request.status === "rejected") {
        statusText = "مرفوض";
      }

      return `

        <div class="admin-card">

          <div class="admin-card-info">

            <h3>
              ${escapeHtml(
                request.profiles?.full_name || "طالب"
              )}
            </h3>

            <p>
              ${escapeHtml(
                request.profiles?.email || ""
              )}
            </p>

            <p>
              الكورس:
              <strong>
                ${escapeHtml(
                  request.courses?.title || ""
                )}
              </strong>
            </p>

            <div class="admin-meta">

              <span>
                ${Number(
                  request.courses?.price || 0
                ).toFixed(2)}
                جنيه
              </span>

              <span>
                ${statusText}
              </span>

            </div>

          </div>

          <div class="admin-actions">

            ${
              request.status === "pending"
                ? `
                  <button
                    class="success-btn"
                    onclick="approveRequest(
                      '${request.id}',
                      '${request.student_id}',
                      '${request.course_id}'
                    )"
                  >
                    موافقة
                  </button>

                  <button
                    class="danger-btn"
                    onclick="rejectRequest(
                      '${request.id}'
                    )"
                  >
                    رفض
                  </button>
                `
                : ""
            }

          </div>

        </div>

      `;
    }).join("");
}


// =====================================
// الموافقة
// =====================================

async function approveRequest(
  requestId,
  studentId,
  courseId
) {

  if (!confirm(
    "هل تريد الموافقة وفتح الكورس للطالب؟"
  )) {
    return;
  }

  const { error: enrollmentError } =
    await supabaseClient
      .from("enrollments")
      .upsert(
        {
          student_id: studentId,
          course_id: courseId
        },
        {
          onConflict:
            "student_id,course_id"
        }
      );

  if (enrollmentError) {
    console.error(enrollmentError);
    alert("تعذر فتح الكورس للطالب.");
    return;
  }

  const { error } =
    await supabaseClient
      .from("course_requests")
      .update({
        status: "approved",
        updated_at:
          new Date().toISOString()
      })
      .eq("id", requestId);

  if (error) {
    console.error(error);
    alert("حدث خطأ أثناء تحديث الطلب.");
    return;
  }

  alert("تمت الموافقة وفتح الكورس.");

  await loadRequests();
}


// =====================================
// رفض الطلب
// =====================================

async function rejectRequest(requestId) {

  if (!confirm("هل تريد رفض الطلب؟")) {
    return;
  }

  const { error } =
    await supabaseClient
      .from("course_requests")
      .update({
        status: "rejected",
        updated_at:
          new Date().toISOString()
      })
      .eq("id", requestId);

  if (error) {
    console.error(error);
    alert("حدث خطأ أثناء رفض الطلب.");
    return;
  }

  alert("تم رفض الطلب.");

  await loadRequests();
}


// =====================================
// حذف كورس
// =====================================

async function deleteCourse(courseId) {

  if (!confirm(
    "حذف الكورس سيحذف المحاضرات والاختبارات والاشتراكات المرتبطة به. هل أنت متأكد؟"
  )) {
    return;
  }

  const { error } =
    await supabaseClient
      .from("courses")
      .delete()
      .eq("id", courseId);

  if (error) {
    console.error(error);
    alert("حدث خطأ أثناء حذف الكورس.");
    return;
  }

  alert("تم حذف الكورس.");

  await loadCourses();
  await loadLectures();
  await loadExams();
  await loadRequests();
}


// =====================================
// حذف محاضرة
// =====================================

async function deleteLecture(lectureId) {

  if (!confirm(
    "هل تريد حذف المحاضرة والاختبار المرتبط بها؟"
  )) {
    return;
  }

  const { error } =
    await supabaseClient
      .from("lectures")
      .delete()
      .eq("id", lectureId);

  if (error) {
    console.error(error);
    alert("حدث خطأ أثناء حذف المحاضرة.");
    return;
  }

  alert("تم حذف المحاضرة.");

  await loadLectures();
  await loadExams();
}


// =====================================
// تسجيل الخروج
// =====================================

document
  .getElementById("logoutBtn")
  .addEventListener("click", async () => {

    await supabaseClient.auth.signOut();

    location.href = "login.html";
  });


// =====================================
// Dark Mode
// =====================================

const themeBtn =
  document.getElementById("themeBtn");

function applyTheme() {

  const theme =
    localStorage.getItem("theme");

  document.body.classList.toggle(
    "dark",
    theme === "dark"
  );
}

applyTheme();

themeBtn.addEventListener("click", () => {

  document.body.classList.toggle("dark");

  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark")
      ? "dark"
      : "light"
  );
});


// =====================================
// تشغيل لوحة الأدمن
// =====================================

async function initAdmin() {

  const user = await checkAdmin();

  if (!user) return;

  await loadCourses();
  await loadLectures();
  await loadRequests();
  await loadExams();
}

initAdmin();
