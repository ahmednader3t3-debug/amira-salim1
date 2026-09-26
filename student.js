const CONTACT_NUMBER = "01068980363";
const WHATSAPP_NUMBER = "201068980363";

let currentUser = null;


async function init() {

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
    user.email;

  document.getElementById("welcome").textContent =
    "أهلاً بك، " + name;

  document.getElementById("profileName").textContent =
    name;

  document.getElementById("profileEmail").textContent =
    user.email;

  await loadCourses();

}


/* =========================
   COURSES
========================= */

async function loadCourses() {

  const box =
    document.getElementById("studentCourses");

  const {
    data: courses,
    error
  } = await supabaseClient
    .from("courses")
    .select("*")
    .eq("is_visible", true)
    .order("created_at", {
      ascending: false
    });

  if (error) {

    box.innerHTML =
      `<div class="empty">
        حصلت مشكلة في تحميل الكورسات.
      </div>`;

    return;
  }

  if (!courses?.length) {

    box.innerHTML =
      `<div class="empty">
        لا توجد كورسات متاحة حاليًا.
      </div>`;

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
      (enrollments || [])
        .map(x => x.course_id)
    );


  const requested =
    new Map(
      (requests || [])
        .map(x => [
          x.course_id,
          x.status
        ])
    );


  box.innerHTML =
    courses.map(course => {

      const isEnrolled =
        enrolled.has(course.id);

      const status =
        requested.get(course.id);


      let action = "";


      if (isEnrolled) {

        action = `
          <button
            class="course-btn"
            onclick="openCourse('${course.id}')">
            فتح الكورس
          </button>
        `;

      }

      else if (status === "pending") {

        action = `
          <div class="pending">
            طلب الاشتراك قيد المراجعة.
          </div>
        `;

      }

      else {

        action = `
          <button
            class="course-btn"
            onclick="requestCourse('${course.id}')">
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

          ${
            Number(course.price) > 0
            ? `
              <strong>
                السعر:
                ${safe(course.price)} جنيه
              </strong>
            `
            : ""
          }

          <div style="margin-top:15px">
            ${action}
          </div>

        </article>

      `;

    }).join("");

}


/* =========================
   OPEN COURSE
========================= */

async function openCourse(courseId) {

  const {
    data: course
  } = await supabaseClient
    .from("courses")
    .select("id,title")
    .eq("id", courseId)
    .single();


  if (!course) return;


  document.getElementById(
    "lecturesSection"
  ).style.display = "block";


  document.getElementById(
    "selectedCourseTitle"
  ).textContent =
    course.title;


  const {
    data: lectures,
    error
  } = await supabaseClient
    .from("lectures")
    .select("*")
    .eq("course_id", courseId)
    .order("lecture_order", {
      ascending: true
    });


  const box =
    document.getElementById(
      "lecturesList"
    );


  if (error) {

    box.innerHTML =
      `<div class="empty">
        حصلت مشكلة في تحميل المحاضرات.
      </div>`;

    return;
  }


  if (!lectures?.length) {

    box.innerHTML =
      `<div class="empty">
        لا توجد محاضرات مضافة للكورس حاليًا.
      </div>`;

    return;
  }


  box.innerHTML =
    lectures.map((lecture, index) => {

      return `

        <div class="course"
             style="margin-bottom:20px">

          <span class="tag">
            المحاضرة ${index + 1}
          </span>

          ${
            lecture.is_free
            ? `
              <span class="tag">
                🆓 مجانية
              </span>
            `
            : ""
          }

          <h3>
            ${safe(lecture.title)}
          </h3>

          <p>
            ${safe(lecture.description || "")}
          </p>


          <div
            style="
              display:flex;
              flex-wrap:wrap;
              gap:10px;
              margin-top:15px;
            ">

            ${
              lecture.video_url
              ? `
                <a
                  class="course-btn"
                  href="${safeAttr(lecture.video_url)}"
                  target="_blank"
                  rel="noopener">
                  ▶ مشاهدة المحاضرة
                </a>
              `
              : ""
            }


            ${
              lecture.pdf_url
              ? `
                <a
                  class="course-btn"
                  href="${safeAttr(lecture.pdf_url)}"
                  target="_blank"
                  rel="noopener">
                  📄 فتح PDF
                </a>
              `
              : ""
            }


            <button
              class="course-btn"
              onclick="openExam('${lecture.id}')">
              📝 امتحان المحاضرة
            </button>

          </div>

        </div>

      `;

    }).join("");

}


/* =========================
   EXAM
========================= */

async function openExam(lectureId) {

  const {
    data: exam,
    error
  } = await supabaseClient
    .from("lecture_exams")
    .select("*")
    .eq("lecture_id", lectureId)
    .maybeSingle();


  if (error || !exam) {

    alert(
      "لسه امتحان المحاضرة دي مش مضاف."
    );

    return;
  }


  if (!exam.exam_url) {

    alert(
      "الامتحان موجود لكن رابط الامتحان لسه مش مضاف."
    );

    return;
  }


  window.open(
    exam.exam_url,
    "_blank",
    "noopener"
  );

}


/* =========================
   COURSE REQUEST
========================= */

async function requestCourse(courseId) {

  const {
    data: course
  } = await supabaseClient
    .from("courses")
    .select("title,price")
    .eq("id", courseId)
    .single();


  const {
    error
  } = await supabaseClient
    .from("course_requests")
    .upsert(
      {
        student_id: currentUser.id,
        course_id: courseId,
        status: "pending"
      },
      {
        onConflict:
          "student_id,course_id"
      }
    );


  if (error) {

    alert(
      "حصلت مشكلة: " +
      error.message
    );

    return;
  }


  const message =
    encodeURIComponent(
      `مرحباً، أنا ${
        currentUser.user_metadata?.full_name ||
        currentUser.email
      } وأريد الاشتراك في كورس: ${
        course?.title || ""
      }.
      
السعر: ${
        course?.price || 0
      } جنيه.

حسابي في المنصة:
${currentUser.email}`
    );


  window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`,
    "_blank"
  );


  alert(
    "تم تسجيل طلب الاشتراك. سيتم تفعيل الكورس بعد مراجعة التحويل."
  );


  await loadCourses();

}


/* =========================
   PROFILE
========================= */

document
  .getElementById("profileBtn")
  .addEventListener("click", () => {

    const panel =
      document.getElementById(
        "profilePanel"
      );

    panel.style.display =
      panel.style.display === "none"
      ? "block"
      : "none";

    if (panel.style.display === "block") {

      panel.scrollIntoView({
        behavior: "smooth"
      });

    }

  });


/* =========================
   LOGOUT
========================= */

document
  .getElementById("logout")
  .addEventListener(
    "click",
    async () => {

      await supabaseClient.auth.signOut();

      location.href =
        "index.html";

    }
  );


/* =========================
   SECURITY HELPERS
========================= */

function safe(value) {

  return String(value)
    .replace(
      /[&<>"']/g,
      char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char]
    );

}


function safeAttr(value) {

  return safe(value)
    .replace(
      /javascript:/gi,
      ""
    );

}


init();
