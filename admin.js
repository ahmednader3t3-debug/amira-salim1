const adminName = document.getElementById("adminName");
const adminEmail = document.getElementById("adminEmail");

const coursesList = document.getElementById("coursesList");
const lecturesList = document.getElementById("lecturesList");
const requestsList = document.getElementById("requestsList");

const lectureCourse = document.getElementById("lectureCourse");
const examLecture = document.getElementById("examLecture");

const courseForm = document.getElementById("courseForm");
const lectureForm = document.getElementById("lectureForm");
const examForm = document.getElementById("examForm");

const statsCourses = document.getElementById("statsCourses");
const statsLectures = document.getElementById("statsLectures");
const statsRequests = document.getElementById("statsRequests");


// ===============================
// أدوات مساعدة
// ===============================

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showMessage(message, type = "ok") {
  alert(message);
}


// ===============================
// حماية صفحة الأدمن
// ===============================

async function checkAdmin() {
  const {
    data: { user },
    error
  } = await supabaseClient.auth.getUser();

  if (error || !user) {
    location.href = "login.html";
    return null;
  }

  const { data: profile, error: profileError } = await supabaseClient
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

  if (adminName) {
    adminName.textContent = profile.full_name || "Admin";
  }

  if (adminEmail) {
    adminEmail.textContent = profile.email || user.email || "";
  }

  return user;
}


// ===============================
// تحميل الكورسات
// ===============================

async function loadCourses() {
  const { data, error } = await supabaseClient
    .from("courses")
    .select("*")
    .order("academic_year", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    coursesList.innerHTML = "<p>حدث خطأ أثناء تحميل الكورسات.</p>";
    return [];
  }

  if (statsCourses) {
    statsCourses.textContent = data.length;
  }

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

        <h3>${escapeHtml(course.title)}</h3>

        <p>
          ${escapeHtml(course.description || "بدون وصف")}
        </p>

        <div class="admin-meta">
          <span>
            السنة: ${course.academic_year}
          </span>

          <span>
            السعر: ${Number(course.price).toFixed(2)} جنيه
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
          حذف الكورس
        </button>

      </div>

    </div>
  `).join("");
}


// ===============================
// اختيار الكورس عند إضافة محاضرة
// ===============================

function fillCourseSelect(courses) {
  if (!lectureCourse) return;

  if (!courses.length) {
    lectureCourse.innerHTML = `
      <option value="">لا توجد كورسات</option>
    `;
    return;
  }

  lectureCourse.innerHTML = `
    <option value="">اختر الكورس</option>

    ${courses.map(course => `
      <option value="${course.id}">
        ${escapeHtml(course.title)} - السنة ${course.academic_year}
      </option>
    `).join("")}
  `;
}


// ===============================
// تحميل المحاضرات
// ===============================

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
    .order("course_id", { ascending: true })
    .order("lecture_order", { ascending: true });

  if (error) {
    console.error(error);
    lecturesList.innerHTML = "<p>حدث خطأ أثناء تحميل المحاضرات.</p>";
    return [];
  }

  if (statsLectures) {
    statsLectures.textContent = data.length;
  }

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
          ${escapeHtml(lecture.courses?.title || "غير معروف")}
        </p>

        <div class="admin-meta">

          <span>
            المحاضرة رقم ${lecture.lecture_order}
          </span>

          <span>
            ${lecture.is_free ? "مجانية" : "مقفولة"}
          </span>

          ${
            lecture.video_url
              ? `<span>فيديو ✓</span>`
              : `<span>فيديو ✕</span>`
          }

          ${
            lecture.pdf_url
              ? `<span>PDF ✓</span>`
              : `<span>PDF ✕</span>`
          }

        </div>

      </div>

      <div class="admin-actions">

        <button
          class="danger-btn"
          onclick="deleteLecture('${lecture.id}')"
        >
          حذف المحاضرة
        </button>

      </div>

    </div>
  `).join("");
}


// ===============================
// اختيار المحاضرة عند إضافة اختبار
// ===============================

function fillExamLectureSelect(lectures) {
  if (!examLecture) return;

  if (!lectures.length) {
    examLecture.innerHTML = `
      <option value="">لا توجد محاضرات</option>
    `;
    return;
  }

  examLecture.innerHTML = `
    <option value="">اختر المحاضرة</option>

    ${lectures.map(lecture => `
      <option value="${lecture.id}">
        ${escapeHtml(lecture.courses?.title || "")}
        — ${escapeHtml(lecture.title)}
      </option>
    `).join("")}
  `;
}


// ===============================
// تحميل طلبات الاشتراك
// ===============================

async function loadRequests() {
  const { data, error } = await supabaseClient
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
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    requestsList.innerHTML = `
      <p>حدث خطأ أثناء تحميل طلبات الاشتراك.</p>
    `;
    return [];
  }

  if (statsRequests) {
    const pendingCount = data.filter(
      request => request.status === "pending"
    ).length;

    statsRequests.textContent = pendingCount;
  }

  renderRequests(data);

  return data;
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

  requestsList.innerHTML = requests.map(request => {

    let statusText = "قيد الانتظار";
    let statusClass = "pending";

    if (request.status === "approved") {
      statusText = "تمت الموافقة";
      statusClass = "approved";
    }

    if (request.status === "rejected") {
      statusText = "مرفوض";
      statusClass = "rejected";
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
                request.courses?.title || "غير معروف"
              )}
            </strong>
          </p>

          <div class="admin-meta">

            <span>
              السعر:
              ${Number(
                request.courses?.price || 0
              ).toFixed(2)} جنيه
            </span>

            <span class="request-status ${statusClass}">
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
                  onclick="rejectRequest('${request.id}')"
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


// ===============================
// إضافة كورس
// ===============================

if (courseForm) {
  courseForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title =
      document.getElementById("courseTitle").value.trim();

    const description =
      document.getElementById("courseDescription").value.trim();

    const academicYear =
      Number(
        document.getElementById("courseYear").value
      );

    const price =
      Number(
        document.getElementById("coursePrice").value
      );

    const imageUrl =
      document.getElementById("courseImage").value.trim();

    const isVisible =
      document.getElementById("courseVisible").checked;

    if (
      !title ||
      ![1, 2, 3].includes(academicYear) ||
      Number.isNaN(price) ||
      price < 0
    ) {
      alert("راجع بيانات الكورس.");
      return;
    }

    const { error } = await supabaseClient
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
}


// ===============================
// إضافة محاضرة
// ===============================

if (lectureForm) {
  lectureForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const courseId =
      document.getElementById("lectureCourse").value;

    const title =
      document.getElementById("lectureTitle").value.trim();

    const description =
      document.getElementById("lectureDescription").value.trim();

    const videoUrl =
      document.getElementById("lectureVideo").value.trim();

    const pdfUrl =
      document.getElementById("lecturePdf").value.trim();

    const lectureOrder =
      Number(
        document.getElementById("lectureOrder").value
      );

    const isFree =
      document.getElementById("lectureFree").checked;

    if (
      !courseId ||
      !title ||
      Number.isNaN(lectureOrder) ||
      lectureOrder < 1
    ) {
      alert("راجع بيانات المحاضرة.");
      return;
    }

    const { error } = await supabaseClient
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

    alert("تم إضافة المحاضرة بنجاح.");

    lectureForm.reset();

    await loadLectures();
  });
}


// ===============================
// إضافة / تعديل اختبار
// ===============================

if (examForm) {
  examForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const lectureId =
      document.getElementById("examLecture").value;

    const title =
      document.getElementById("examTitle").value.trim();

    const description =
      document.getElementById("examDescription").value.trim();

    const examUrl =
      document.getElementById("examUrl").value.trim();

    const maxScore =
      Number(
        document.getElementById("examMaxScore").value
      );

    if (
      !lectureId ||
      !title ||
      Number.isNaN(maxScore) ||
      maxScore <= 0
    ) {
      alert("راجع بيانات الاختبار.");
      return;
    }

    /*
      لأن lecture_id عليه UNIQUE
      فـ upsert هنا يسمح بإضافة الاختبار
      أو تحديث الاختبار الموجود لنفس المحاضرة.
    */

    const { error } = await supabaseClient
      .from("lecture_exams")
      .upsert(
        {
          lecture_id: lectureId,
          title,
          description,
          exam_url: examUrl || null,
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
  });
}


// ===============================
// الموافقة على طلب
// ===============================

async function approveRequest(
  requestId,
  studentId,
  courseId
) {
  const confirmed = confirm(
    "هل تريد الموافقة على هذا الطلب وفتح الكورس للطالب؟"
  );

  if (!confirmed) return;

  // إنشاء الاشتراك
  const { error: enrollmentError } =
    await supabaseClient
      .from("enrollments")
      .upsert(
        {
          student_id: studentId,
          course_id: courseId
        },
        {
          onConflict: "student_id,course_id"
        }
      );

  if (enrollmentError) {
    console.error(enrollmentError);
    alert("تعذر إنشاء اشتراك الطالب.");
    return;
  }

  // تحديث حالة الطلب
  const { error: requestError } =
    await supabaseClient
      .from("course_requests")
      .update({
        status: "approved",
        updated_at: new Date().toISOString()
      })
      .eq("id", requestId);

  if (requestError) {
    console.error(requestError);
    alert(
      "تم إنشاء الاشتراك لكن حدث خطأ أثناء تحديث الطلب."
    );
    return;
  }

  alert("تمت الموافقة وفتح الكورس للطالب.");

  await loadRequests();
}


// ===============================
// رفض طلب
// ===============================

async function rejectRequest(requestId) {
  const confirmed = confirm(
    "هل تريد رفض طلب الاشتراك؟"
  );

  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("course_requests")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString()
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


// ===============================
// حذف كورس
// ===============================

async function deleteCourse(courseId) {
  const confirmed = confirm(
    "تحذير: حذف الكورس سيحذف المحاضرات والاشتراكات والطلبات المرتبطة به.\n\nهل أنت متأكد؟"
  );

  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("courses")
    .delete()
    .eq("id", courseId);

  if (error) {
    console.error(error);
    alert("حدث خطأ أثناء حذف الكورس.");
    return;
  }

  alert("تم حذف الكورس.");

  await Promise.all([
    loadCourses(),
    loadLectures(),
    loadRequests()
  ]);
}


// ===============================
// حذف محاضرة
// ===============================

async function deleteLecture(lectureId) {
  const confirmed = confirm(
    "هل أنت متأكد من حذف هذه المحاضرة؟"
  );

  if (!confirmed) return;

  const { error } = await supabaseClient
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
}


// ===============================
// تسجيل الخروج
// ===============================

const logoutBtn =
  document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    location.href = "login.html";
  });
}


// ===============================
// Dark / Light Mode
// ===============================

const themeBtn =
  document.getElementById("themeBtn");

function applySavedTheme() {
  const savedTheme =
    localStorage.getItem("theme");

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


// ===============================
// تشغيل لوحة الإدارة
// ===============================

async function initAdmin() {
  const user = await checkAdmin();

  if (!user) return;

  await Promise.all([
    loadCourses(),
    loadLectures(),
    loadRequests()
  ]);
}

initAdmin();
