const CONTACT_NUMBER = "01068980363";
const WHATSAPP_NUMBER = "201068980363";

let currentUser = null;
let coursesMap = new Map();

async function init() {

  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  if (!user) {
    location.href = "login.html";
    return;
  }

  currentUser = user;

  document.getElementById("welcome").textContent =
    "أهلاً بك، " + (user.user_metadata?.full_name || user.email);

  await loadCourses();
  await loadAssignments();
  await loadExams();
  await loadGrades();
  await loadNotifications();

  document.getElementById("paymentInfo").innerHTML = `
    <b>طريقة الاشتراك:</b><br>
    حوّل قيمة الكورس إلى رقم التواصل
    <strong>${CONTACT_NUMBER}</strong>
    وبعد التحويل اضغط زر الاشتراك في الكورس وأرسل رسالة تأكيد على واتساب.
  `;
}


/* =========================
   COURSES
========================= */

async function loadCourses() {

  const { data: courses, error } =
    await supabaseClient
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

  const { data: enrollments } =
    await supabaseClient
      .from("enrollments")
      .select("course_id")
      .eq("student_id", currentUser.id);

  const { data: requests } =
    await supabaseClient
      .from("course_requests")
      .select("course_id,status")
      .eq("student_id", currentUser.id);

  const enrolled = new Set(
    (enrollments || []).map(x => x.course_id)
  );

  const requested = new Map(
    (requests || []).map(x => [x.course_id, x.status])
  );

  const box = document.getElementById("studentCourses");

  if (error || !courses?.length) {
    box.innerHTML =
      '<div class="empty">لا توجد كورسات حاليًا.</div>';
    return;
  }

  document.getElementById("coursesCount").textContent =
    enrolled.size;

  courses.forEach(c => coursesMap.set(c.id, c));

  box.innerHTML = courses.map(c => {

    const status = requested.get(c.id);

    let action = "";

    if (enrolled.has(c.id)) {

      action = c.video_url
        ? `<a class="course-btn"
             target="_blank"
             href="${safeAttr(c.video_url)}">
             فتح المحاضرة
           </a>`
        : `<div class="approved">
             تم تفعيل الكورس لك.
           </div>`;

    } else if (status === "pending") {

      action = `
        <div class="pending">
          طلبك قيد المراجعة.
        </div>
      `;

    } else if (status === "rejected") {

      action = `
        <button class="course-btn"
          onclick="requestCourse('${c.id}')">
          إعادة طلب الكورس
        </button>
      `;

    } else {

      action = `
        <button class="course-btn"
          onclick="requestCourse('${c.id}')">
          الاشتراك في الكورس
        </button>
      `;
    }

    return `
      <article class="course">

        <div class="course-icon">🩺</div>

        <span class="tag">دورة تدريبية</span>

        <h3>${safe(c.title)}</h3>

        <p>${safe(c.description || "")}</p>

        ${action}

      </article>
    `;

  }).join("");
}


/* =========================
   ASSIGNMENTS
========================= */

async function loadAssignments() {

  const box = document.getElementById("assignmentsList");

  const { data, error } =
    await supabaseClient
      .from("assignments")
      .select("*")
      .order("due_at", { ascending: true });

  if (error) {
    box.innerHTML =
      `<div class="empty">${safe(error.message)}</div>`;
    return;
  }

  if (!data?.length) {
    box.innerHTML =
      '<div class="empty">لا توجد واجبات حاليًا.</div>';
    return;
  }

  const courseIds = data.map(x => x.course_id);

  const { data: enrollments } =
    await supabaseClient
      .from("enrollments")
      .select("course_id")
      .eq("student_id", currentUser.id)
      .in("course_id", courseIds);

  const enrolled = new Set(
    (enrollments || []).map(x => x.course_id)
  );

  const visible = data.filter(x => enrolled.has(x.course_id));

  document.getElementById("assignmentsCount").textContent =
    visible.length;

  if (!visible.length) {
    box.innerHTML =
      '<div class="empty">لا توجد واجبات للكورسات المفعلة.</div>';
    return;
  }

  const { data: submissions } =
    await supabaseClient
      .from("assignment_submissions")
      .select("*")
      .eq("student_id", currentUser.id);

  const submissionMap = new Map(
    (submissions || []).map(x => [x.assignment_id, x])
  );

  box.innerHTML = visible.map(a => {

    const submission = submissionMap.get(a.id);

    let status = "لم يتم التسليم";
    let statusClass = "status pending";

    if (submission) {
      status = submission.score !== null
        ? `تم التصحيح: ${submission.score}/${a.max_score}`
        : "تم التسليم";

      statusClass =
        submission.score !== null
          ? "status approved"
          : "status pending";
    }

    return `
      <article class="dashboard-item">

        <div>
          <span class="tag">واجب</span>

          <h3>${safe(a.title)}</h3>

          <p>${safe(a.description || "")}</p>

          <small>
            موعد التسليم:
            ${formatDate(a.due_at)}
          </small>
        </div>

        <div class="dashboard-item-side">

          <span class="${statusClass}">
            ${status}
          </span>

          ${
            !submission
            ? `<button
                 class="btn small"
                 onclick="submitAssignment('${a.id}')">
                 تسليم الواجب
               </button>`
            : ""
          }

        </div>

      </article>
    `;

  }).join("");
}


/* =========================
   SUBMIT ASSIGNMENT
========================= */

async function submitAssignment(id) {

  const answer = prompt("اكتب إجابتك أو ملاحظاتك للواجب:");

  if (answer === null) return;

  if (!answer.trim()) {
    alert("اكتب الإجابة أولًا.");
    return;
  }

  const { error } =
    await supabaseClient
      .from("assignment_submissions")
      .upsert({
        assignment_id: id,
        student_id: currentUser.id,
        answer: answer.trim()
      }, {
        onConflict: "assignment_id,student_id"
      });

  if (error) {
    alert("حدث خطأ: " + error.message);
    return;
  }

  alert("تم تسليم الواجب بنجاح.");

  loadAssignments();
}


/* =========================
   EXAMS
========================= */

async function loadExams() {

  const box = document.getElementById("examsList");

  const { data, error } =
    await supabaseClient
      .from("exams")
      .select("*")
      .order("starts_at", { ascending: true });

  if (error) {
    box.innerHTML =
      `<div class="empty">${safe(error.message)}</div>`;
    return;
  }

  if (!data?.length) {
    box.innerHTML =
      '<div class="empty">لا توجد امتحانات حاليًا.</div>';
    return;
  }

  const courseIds = data.map(x => x.course_id);

  const { data: enrollments } =
    await supabaseClient
      .from("enrollments")
      .select("course_id")
      .eq("student_id", currentUser.id)
      .in("course_id", courseIds);

  const enrolled = new Set(
    (enrollments || []).map(x => x.course_id)
  );

  const visible = data.filter(x => enrolled.has(x.course_id));

  document.getElementById("examsCount").textContent =
    visible.length;

  if (!visible.length) {
    box.innerHTML =
      '<div class="empty">لا توجد امتحانات للكورسات المفعلة.</div>';
    return;
  }

  const { data: results } =
    await supabaseClient
      .from("exam_results")
      .select("*")
      .eq("student_id", currentUser.id);

  const resultMap = new Map(
    (results || []).map(x => [x.exam_id, x])
  );

  box.innerHTML = visible.map(exam => {

    const result = resultMap.get(exam.id);

    let action = "";

    if (result) {

      action = `
        <span class="status approved">
          النتيجة: ${result.score}/${exam.max_score}
        </span>
      `;

    } else if (exam.exam_url) {

      action = `
        <a
          class="btn small"
          target="_blank"
          href="${safeAttr(exam.exam_url)}">
          دخول الامتحان
        </a>
      `;

    } else {

      action = `
        <span class="status pending">
          لم يبدأ بعد
        </span>
      `;
    }

    return `
      <article class="dashboard-item">

        <div>

          <span class="tag">امتحان</span>

          <h3>${safe(exam.title)}</h3>

          <p>${safe(exam.description || "")}</p>

          <small>
            يبدأ:
            ${formatDate(exam.starts_at)}
          </small>

          <small>
            المدة:
            ${exam.duration_minutes} دقيقة
          </small>

        </div>

        <div class="dashboard-item-side">
          ${action}
        </div>

      </article>
    `;

  }).join("");
}


/* =========================
   GRADES
========================= */

async function loadGrades() {

  const box = document.getElementById("gradesList");

  const { data: examResults } =
    await supabaseClient
      .from("exam_results")
      .select("*")
      .eq("student_id", currentUser.id);

  const { data: submissions } =
    await supabaseClient
      .from("assignment_submissions")
      .select("*")
      .eq("student_id", currentUser.id)
      .not("score", "is", null);

  const total =
    (examResults || []).length +
    (submissions || []).length;

  document.getElementById("gradesCount").textContent = total;

  if (!total) {
    box.innerHTML =
      '<div class="empty">لا توجد درجات حتى الآن.</div>';
    return;
  }

  box.innerHTML = `

    ${(examResults || []).map(r => `
      <article class="grade-item">
        <div>
          <span class="tag">امتحان</span>
          <h3>نتيجة الامتحان</h3>
        </div>

        <strong>${r.score}</strong>
      </article>
    `).join("")}

    ${(submissions || []).map(s => `
      <article class="grade-item">
        <div>
          <span class="tag">واجب</span>
          <h3>درجة الواجب</h3>
        </div>

        <strong>${s.score}</strong>
      </article>
    `).join("")}

  `;
}


/* =========================
   NOTIFICATIONS
========================= */

async function loadNotifications() {

  const box = document.getElementById("notificationsList");

  const { data, error } =
    await supabaseClient
      .from("notifications")
      .select("*")
      .eq("student_id", currentUser.id)
      .order("created_at", { ascending: false });

  if (error || !data?.length) {
    box.innerHTML =
      '<div class="empty">لا توجد إشعارات.</div>';
    return;
  }

  box.innerHTML = data.map(n => `
    <article class="notification-item">

      <div class="notification-icon">🔔</div>

      <div>
        <h3>${safe(n.title)}</h3>
        <p>${safe(n.message || "")}</p>
        <small>${formatDate(n.created_at)}</small>
      </div>

    </article>
  `).join("");
}


/* =========================
   COURSE REQUEST
========================= */

async function requestCourse(courseId) {

  const { data: course } =
    await supabaseClient
      .from("courses")
      .select("title")
      .eq("id", courseId)
      .single();

  const { error } =
    await supabaseClient
      .from("course_requests")
      .upsert({
        student_id: currentUser.id,
        course_id: courseId,
        status: "pending"
      }, {
        onConflict: "student_id,course_id"
      });

  if (error) {
    alert("حصلت مشكلة: " + error.message);
    return;
  }

  const msg = encodeURIComponent(
    `مرحباً، أنا ${currentUser.user_metadata?.full_name || currentUser.email} وأريد الاشتراك في كورس: ${course?.title || ""}. تم التحويل على رقم ${CONTACT_NUMBER}. حسابي في المنصة: ${currentUser.email}.`
  );

  window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`,
    "_blank"
  );

  alert("تم تسجيل طلبك.");

  init();
}


/* =========================
   HELPERS
========================= */

function formatDate(date) {

  if (!date) return "غير محدد";

  return new Date(date).toLocaleString("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}


function safe(s) {

  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));

}


function safeAttr(s) {

  return safe(s).replace(/javascript:/gi, "");
}


document.getElementById("logout").onclick = async () => {

  await supabaseClient.auth.signOut();

  location.href = "index.html";

};


init();
