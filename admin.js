/* =========================================================
   DR AMIRA SALIM
   ADMIN DASHBOARD
========================================================= */


/* =========================================================
   ELEMENTS
========================================================= */

const adminMsg = document.getElementById("adminMsg");

const coursesCount =
  document.getElementById("coursesCount");

const lecturesCount =
  document.getElementById("lecturesCount");

const examsCount =
  document.getElementById("examsCount");

const requestsCount =
  document.getElementById("requestsCount");


/* =========================================================
   MESSAGE
========================================================= */

function showAdminMsg(message, error = false) {

  if (!adminMsg) return;

  adminMsg.textContent = message;

  adminMsg.className =
    "msg " + (error ? "error" : "ok");
}


/* =========================================================
   AUTH CHECK
========================================================= */

async function checkAdmin() {

  const {
    data: { user },
    error
  } = await supabaseClient.auth.getUser();

  if (error || !user) {

    location.href = "login.html";

    return null;
  }


  const { data: profile } =
    await supabaseClient
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("id", user.id)
      .maybeSingle();


  if (!profile || profile.role !== "admin") {

    location.href = "student.html";

    return null;
  }


  return user;
}


/* =========================================================
   LOAD COURSES
========================================================= */

async function loadCourses() {

  const { data, error } =
    await supabaseClient
      .from("courses")
      .select("*")
      .order("created_at", {
        ascending: false
      });


  if (error) {

    console.error(error);

    showAdminMsg(
      "حصل خطأ أثناء تحميل الكورسات.",
      true
    );

    return [];
  }


  coursesCount.textContent =
    data?.length || 0;


  const lectureCourse =
    document.getElementById("lectureCourse");

  const accessCourse =
    document.getElementById("accessCourse");


  if (lectureCourse) {

    lectureCourse.innerHTML =
      `<option value="">اختر الكورس</option>`;

    data.forEach(course => {

      const option =
        document.createElement("option");

      option.value = course.id;

      option.textContent =
        `${course.title} — السنة ${course.academic_year}`;

      lectureCourse.appendChild(option);

    });

  }


  if (accessCourse) {

    accessCourse.innerHTML =
      `<option value="">اختر الكورس</option>`;

    data.forEach(course => {

      const option =
        document.createElement("option");

      option.value = course.id;

      option.textContent =
        `${course.title} — السنة ${course.academic_year}`;

      accessCourse.appendChild(option);

    });

  }


  renderCourses(data || []);

  return data || [];
}


/* =========================================================
   CREATE COURSE
========================================================= */

const courseForm =
  document.getElementById("courseForm");


if (courseForm) {

  courseForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const title =
        document.getElementById("courseTitle")
          .value.trim();

      const description =
        document.getElementById("courseDescription")
          .value.trim();

      const price =
        Number(
          document.getElementById("coursePrice")
            .value
        );

      const academicYear =
        Number(
          document.getElementById("courseYear")
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
        Number.isNaN(price)
      ) {

        showAdminMsg(
          "راجع بيانات الكورس.",
          true
        );

        return;
      }


      showAdminMsg(
        "جاري إضافة الكورس..."
      );


      const { error } =
        await supabaseClient
          .from("courses")
          .insert({
            title,
            description,
            price,
            academic_year: academicYear,
            image_url: imageUrl || null,
            is_visible: isVisible
          });


      if (error) {

        console.error(error);

        showAdminMsg(
          error.message,
          true
        );

        return;
      }


      showAdminMsg(
        "✅ تم إضافة الكورس بنجاح."
      );


      courseForm.reset();

      document.getElementById(
        "courseVisible"
      ).checked = true;


      await refreshAll();

    }
  );

}


/* =========================================================
   STORAGE UPLOAD
========================================================= */

async function uploadFile(
  bucket,
  file,
  folder
) {

  if (!file) return null;


  const extension =
    file.name.includes(".")
      ? file.name
          .split(".")
          .pop()
          .toLowerCase()
      : "";


  const safeName =
    file.name
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );


  const uniqueName =
    `${Date.now()}-${crypto.randomUUID()}-${safeName}`;


  const path =
    `${folder}/${uniqueName}`;


  const { error } =
    await supabaseClient.storage
      .from(bucket)
      .upload(
        path,
        file,
        {
          cacheControl: "3600",
          upsert: false
        }
      );


  if (error) {

    console.error(error);

    throw error;
  }


  const { data } =
    supabaseClient.storage
      .from(bucket)
      .getPublicUrl(path);


  return data.publicUrl;
}


/* =========================================================
   CREATE LECTURE
========================================================= */

const lectureForm =
  document.getElementById("lectureForm");


if (lectureForm) {

  lectureForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const courseId =
        document.getElementById(
          "lectureCourse"
        ).value;

      const title =
        document.getElementById(
          "lectureTitle"
        ).value.trim();

      const description =
        document.getElementById(
          "lectureDescription"
        ).value.trim();

      const lectureOrder =
        Number(
          document.getElementById(
            "lectureOrder"
          ).value
        );

      const isFree =
        document.getElementById(
          "lectureFree"
        ).checked;


      const videoInput =
        document.getElementById(
          "lectureVideo"
        );

      const pdfInput =
        document.getElementById(
          "lecturePdf"
        );


      const videoFile =
        videoInput.files[0] || null;

      const pdfFile =
        pdfInput.files[0] || null;


      if (!courseId || !title) {

        showAdminMsg(
          "اختار الكورس واكتب اسم المحاضرة.",
          true
        );

        return;
      }


      const button =
        document.getElementById(
          "lectureSubmitBtn"
        );


      button.disabled = true;

      button.textContent =
        "جاري رفع الملفات...";


      try {

        const videoUrl =
          await uploadFile(
            "lecture-videos",
            videoFile,
            courseId
          );


        const pdfUrl =
          await uploadFile(
            "lecture-pdfs",
            pdfFile,
            courseId
          );


        const { error } =
          await supabaseClient
            .from("lectures")
            .insert({

              course_id: courseId,

              title,

              description,

              video_url: videoUrl,

              pdf_url: pdfUrl,

              is_free: isFree,

              lecture_order: lectureOrder

            });


        if (error) {

          throw error;
        }


        showAdminMsg(
          "✅ تم إضافة المحاضرة بنجاح."
        );


        lectureForm.reset();


        document.getElementById(
          "lectureOrder"
        ).value = 1;


        await refreshAll();


      } catch (error) {

        console.error(error);

        showAdminMsg(
          "حصل خطأ: " + error.message,
          true
        );

      } finally {

        button.disabled = false;

        button.textContent =
          "إضافة المحاضرة";

      }

    }
  );

}


/* =========================================================
   LOAD LECTURES
========================================================= */

async function loadLectures() {

  const { data, error } =
    await supabaseClient
      .from("lectures")
      .select(`
        *,
        courses (
          title,
          academic_year
        )
      `)
      .order("lecture_order", {
        ascending: true
      });


  if (error) {

    console.error(error);

    return [];

  }


  lecturesCount.textContent =
    data?.length || 0;


  renderLectures(data || []);


  const examLecture =
    document.getElementById(
      "examLecture"
    );


  if (examLecture) {

    examLecture.innerHTML =
      `<option value="">
        اختر المحاضرة
      </option>`;


    data.forEach(lecture => {

      const option =
        document.createElement("option");

      option.value =
        lecture.id;

      option.textContent =
        `${lecture.courses?.title || "كورس"} — ${lecture.title}`;

      examLecture.appendChild(option);

    });

  }


  return data || [];
}


/* =========================================================
   ACCESS LECTURES
========================================================= */

const accessCourse =
  document.getElementById("accessCourse");


if (accessCourse) {

  accessCourse.addEventListener(
    "change",
    loadAccessLectures
  );

}


async function loadAccessLectures() {

  const courseId =
    accessCourse.value;


  const select =
    document.getElementById(
      "accessLecture"
    );


  select.innerHTML =
    `<option value="">
      اختر المحاضرة
    </option>`;


  if (!courseId) return;


  const { data, error } =
    await supabaseClient
      .from("lectures")
      .select(
        "id,title,lecture_order"
      )
      .eq(
        "course_id",
        courseId
      )
      .order(
        "lecture_order",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(error);

    return;
  }


  (data || []).forEach(
    lecture => {

      const option =
        document.createElement("option");

      option.value =
        lecture.id;

      option.textContent =
        `${lecture.lecture_order}. ${lecture.title}`;

      select.appendChild(option);

    }
  );

}


/* =========================================================
   LOAD EXAMS
========================================================= */

async function loadExams() {

  const { data, error } =
    await supabaseClient
      .from("lecture_exams")
      .select(`
        *,
        lectures (
          title,
          course_id,
          courses (
            title
          )
        )
      `)
      .order("created_at", {
        ascending: false
      });


  if (error) {

    console.error(error);

    return [];

  }


  examsCount.textContent =
    data?.length || 0;


  renderExams(data || []);


  const questionExam =
    document.getElementById(
      "questionExam"
    );


  if (questionExam) {

    questionExam.innerHTML =
      `<option value="">
        اختر الامتحان
      </option>`;


    data.forEach(exam => {

      const option =
        document.createElement("option");

      option.value =
        exam.id;

      option.textContent =
        `${exam.lectures?.courses?.title || ""} — ${exam.title}`;

      questionExam.appendChild(option);

    });

  }


  return data || [];
}


/* =========================================================
   CREATE EXAM
========================================================= */

const examForm =
  document.getElementById("examForm");


if (examForm) {

  examForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const lectureId =
        document.getElementById(
          "examLecture"
        ).value;

      const title =
        document.getElementById(
          "examTitle"
        ).value.trim();

      const description =
        document.getElementById(
          "examDescription"
        ).value.trim();

      const maxScore =
        Number(
          document.getElementById(
            "examMaxScore"
          ).value
        );


      if (!lectureId || !title) {

        showAdminMsg(
          "اختار المحاضرة واكتب اسم الامتحان.",
          true
        );

        return;
      }


      const { error } =
        await supabaseClient
          .from("lecture_exams")
          .insert({

            lecture_id: lectureId,

            title,

            description,

            max_score: maxScore

          });


      if (error) {

        console.error(error);

        showAdminMsg(
          error.message,
          true
        );

        return;
      }


      showAdminMsg(
        "✅ تم إنشاء الامتحان."
      );


      examForm.reset();


      document.getElementById(
        "examTitle"
      ).value =
        "اختبار المحاضرة";


      document.getElementById(
        "examMaxScore"
      ).value = 100;


      await refreshAll();

    }
  );

}


/* =========================================================
   QUESTIONS
========================================================= */

const questionForm =
  document.getElementById(
    "questionForm"
  );


if (questionForm) {

  questionForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const examId =
        document.getElementById(
          "questionExam"
        ).value;

      const questionText =
        document.getElementById(
          "questionText"
        ).value.trim();

      const questionOrder =
        Number(
          document.getElementById(
            "questionOrder"
          ).value
        );


      if (!examId || !questionText) {

        showAdminMsg(
          "اختار الامتحان واكتب السؤال.",
          true
        );

        return;
      }


      const { error } =
        await supabaseClient
          .from("exam_questions")
          .insert({

            exam_id: examId,

            question_text: questionText,

            question_order:
              questionOrder

          });


      if (error) {

        console.error(error);

        showAdminMsg(
          error.message,
          true
        );

        return;
      }


      showAdminMsg(
        "✅ تم إضافة السؤال."
      );


      questionForm.reset();


      document.getElementById(
        "questionOrder"
      ).value = 1;


      await loadQuestions();

    }
  );

}


/* =========================================================
   LOAD QUESTIONS
========================================================= */

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
      .order("question_order", {
        ascending: true
      });


  if (error) {

    console.error(error);

    return [];

  }


  const optionQuestion =
    document.getElementById(
      "optionQuestion"
    );


  if (optionQuestion) {

    optionQuestion.innerHTML =
      `<option value="">
        اختر السؤال
      </option>`;


    data.forEach(question => {

      const option =
        document.createElement("option");

      option.value =
        question.id;

      option.textContent =
        `${question.lecture_exams?.title || "امتحان"} — ${question.question_text}`;

      optionQuestion.appendChild(option);

    });

  }


  return data || [];
}


/* =========================================================
   CREATE OPTION
========================================================= */

const optionForm =
  document.getElementById(
    "optionForm"
  );


if (optionForm) {

  optionForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const questionId =
        document.getElementById(
          "optionQuestion"
        ).value;

      const optionText =
        document.getElementById(
          "optionText"
        ).value.trim();

      const optionOrder =
        Number(
          document.getElementById(
            "optionOrder"
          ).value
        );

      const isCorrect =
        document.getElementById(
          "optionCorrect"
        ).checked;


      if (!questionId || !optionText) {

        showAdminMsg(
          "اختار السؤال واكتب الاختيار.",
          true
        );

        return;
      }


      const { error } =
        await supabaseClient
          .from("exam_options")
          .insert({

            question_id: questionId,

            option_text: optionText,

            is_correct: isCorrect,

            option_order:
              optionOrder

          });


      if (error) {

        console.error(error);

        showAdminMsg(
          error.message,
          true
        );

        return;
      }


      showAdminMsg(
        "✅ تم إضافة الاختيار."
      );


      optionForm.reset();


      document.getElementById(
        "optionOrder"
      ).value = 1;


      await loadQuestions();

    }
  );

}


/* =========================================================
   STUDENTS
========================================================= */

async function loadStudents() {

  const select =
    document.getElementById(
      "accessStudent"
    );


  if (!select) return;


  const { data, error } =
    await supabaseClient
      .from("profiles")
      .select(
        "id,full_name,email,role"
      )
      .eq(
        "role",
        "student"
      )
      .order(
        "full_name",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(error);

    return;
  }


  select.innerHTML =
    `<option value="">
      اختر الطالب
    </option>`;


  (data || []).forEach(student => {

    const option =
      document.createElement("option");

    option.value =
      student.id;

    option.textContent =
      `${student.full_name || "بدون اسم"} — ${student.email || ""}`;

    select.appendChild(option);

  });

}


/* =========================================================
   OPEN FULL COURSE
========================================================= */

const openCourseAccessBtn =
  document.getElementById(
    "openCourseAccessBtn"
  );


if (openCourseAccessBtn) {

  openCourseAccessBtn.addEventListener(
    "click",
    openFullCourse
  );

}


async function openFullCourse() {

  const studentId =
    document.getElementById(
      "accessStudent"
    ).value;

  const courseId =
    document.getElementById(
      "accessCourse"
    ).value;


  if (!studentId || !courseId) {

    showAccessMsg(
      "اختار الطالب والكورس الأول.",
      true
    );

    return;
  }


  showAccessMsg(
    "جاري فتح الكورس..."
  );


  const { error } =
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


  if (error) {

    console.error(error);

    showAccessMsg(
      error.message,
      true
    );

    return;
  }


  showAccessMsg(
    "✅ تم فتح الكورس بالكامل للطالب."
  );

}


/* =========================================================
   OPEN SINGLE LECTURE
========================================================= */

const openLectureAccessBtn =
  document.getElementById(
    "openLectureAccessBtn"
  );


if (openLectureAccessBtn) {

  openLectureAccessBtn.addEventListener(
    "click",
    openSingleLecture
  );

}


async function openSingleLecture() {

  const studentId =
    document.getElementById(
      "accessStudent"
    ).value;

  const lectureId =
    document.getElementById(
      "accessLecture"
    ).value;


  if (!studentId || !lectureId) {

    showAccessMsg(
      "اختار الطالب والمحاضرة الأول.",
      true
    );

    return;
  }


  showAccessMsg(
    "جاري فتح المحاضرة..."
  );


  const { error } =
    await supabaseClient
      .from("lecture_access")
      .upsert(
        {
          student_id: studentId,
          lecture_id: lectureId
        },
        {
          onConflict:
            "student_id,lecture_id"
        }
      );


  if (error) {

    console.error(error);

    showAccessMsg(
      error.message,
      true
    );

    return;
  }


  showAccessMsg(
    "✅ تم فتح المحاضرة فقط للطالب."
  );


  await loadLectureAccess();

}


/* =========================================================
   ACCESS MESSAGE
========================================================= */

function showAccessMsg(
  message,
  error = false
) {

  const element =
    document.getElementById(
      "accessMsg"
    );


  if (!element) return;


  element.textContent =
    message;

  element.className =
    "msg " + (error ? "error" : "ok");

}


/* =========================================================
   LOAD LECTURE ACCESS
========================================================= */

async function loadLectureAccess() {

  const table =
    document.getElementById(
      "lectureAccessTable"
    );


  if (!table) return;


  table.innerHTML =
    `<tr>
      <td colspan="5">
        جاري التحميل...
      </td>
    </tr>`;


  const { data, error } =
    await supabaseClient
      .from("lecture_access")
      .select(`
        id,
        created_at,
        student_id,
        lecture_id,

        profiles:student_id (
          full_name,
          email
        ),

        lectures:lecture_id (
          title,
          course_id,

          courses:course_id (
            title
          )
        )
      `)
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(error);

    table.innerHTML =
      `<tr>
        <td colspan="5">
          حصل خطأ أثناء تحميل الصلاحيات.
        </td>
      </tr>`;

    return;
  }


  if (!data?.length) {

    table.innerHTML =
      `<tr>
        <td colspan="5">
          لا توجد صلاحيات لمحاضرات حاليًا.
        </td>
      </tr>`;

    return;
  }


  table.innerHTML = "";


  data.forEach(item => {

    const tr =
      document.createElement("tr");


    const student =
      item.profiles?.full_name ||
      item.profiles?.email ||
      "طالب";


    const lecture =
      item.lectures?.title ||
      "محاضرة";


    const course =
      item.lectures?.courses?.title ||
      "كورس";


    const date =
      new Date(
        item.created_at
      ).toLocaleDateString(
        "ar-EG"
      );


    tr.innerHTML = `

      <td>
        ${escapeHtml(student)}
      </td>

      <td>
        ${escapeHtml(lecture)}
      </td>

      <td>
        ${escapeHtml(course)}
      </td>

      <td>
        ${date}
      </td>

      <td>

        <button
          class="btn danger-btn"
          type="button"
          onclick="removeLectureAccess('${item.id}')"
        >
          سحب الوصول
        </button>

      </td>

    `;


    table.appendChild(tr);

  });

}


/* =========================================================
   REMOVE LECTURE ACCESS
========================================================= */

async function removeLectureAccess(id) {

  const confirmed =
    confirm(
      "هل أنت متأكد من سحب صلاحية هذه المحاضرة؟"
    );


  if (!confirmed) return;


  const { error } =
    await supabaseClient
      .from("lecture_access")
      .delete()
      .eq(
        "id",
        id
      );


  if (error) {

    console.error(error);

    showAccessMsg(
      error.message,
      true
    );

    return;
  }


  showAccessMsg(
    "✅ تم سحب صلاحية المحاضرة."
  );


  await loadLectureAccess();

}


/* =========================================================
   REQUESTS
========================================================= */

async function loadRequests() {

  const table =
    document.getElementById(
      "requestsTable"
    );


  if (!table) return;


  const { data, error } =
    await supabaseClient
      .from("course_requests")
      .select(`
        id,
        status,
        created_at,
        student_id,
        course_id,

        profiles:student_id (
          full_name,
          email
        ),

        courses:course_id (
          title,
          price
        )
      `)
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(error);

    table.innerHTML =
      `<tr>
        <td colspan="5">
          حصل خطأ أثناء تحميل الطلبات.
        </td>
      </tr>`;

    return;
  }


  requestsCount.textContent =
    (data || []).filter(
      request =>
        request.status === "pending"
    ).length;


  if (!data?.length) {

    table.innerHTML =
      `<tr>
        <td colspan="5">
          لا توجد طلبات.
        </td>
      </tr>`;

    return;
  }


  table.innerHTML = "";


  data.forEach(request => {

    const tr =
      document.createElement("tr");


    let statusText =
      "قيد الانتظار";


    if (
      request.status === "approved"
    ) {

      statusText =
        "تمت الموافقة";

    }


    if (
      request.status === "rejected"
    ) {

      statusText =
        "مرفوض";

    }


    const date =
      new Date(
        request.created_at
      ).toLocaleDateString(
        "ar-EG"
      );


    tr.innerHTML = `

      <td>
        ${escapeHtml(
          request.profiles?.full_name ||
          request.profiles?.email ||
          "طالب"
        )}
      </td>

      <td>
        ${escapeHtml(
          request.courses?.title ||
          "كورس"
        )}
      </td>

      <td>
        ${statusText}
      </td>

      <td>
        ${date}
      </td>

      <td>

        ${
          request.status === "pending"

          ? `

            <button
              class="btn success-btn"
              type="button"
              onclick="approveRequest('${request.id}')"
            >
              موافقة
            </button>

            <button
              class="btn danger-btn"
              type="button"
              onclick="rejectRequest('${request.id}')"
            >
              رفض
            </button>

          `

          : "—"
        }

      </td>

    `;


    table.appendChild(tr);

  });

}


/* =========================================================
   APPROVE REQUEST
========================================================= */

async function approveRequest(id) {

  const { data: request, error } =
    await supabaseClient
      .from("course_requests")
      .select(
        "id,student_id,course_id,status"
      )
      .eq(
        "id",
        id
      )
      .maybeSingle();


  if (error || !request) {

    showAdminMsg(
      "لم يتم العثور على الطلب.",
      true
    );

    return;
  }


  const { error: enrollmentError } =
    await supabaseClient
      .from("enrollments")
      .upsert(
        {
          student_id:
            request.student_id,

          course_id:
            request.course_id
        },
        {
          onConflict:
            "student_id,course_id"
        }
      );


  if (enrollmentError) {

    console.error(
      enrollmentError
    );

    showAdminMsg(
      enrollmentError.message,
      true
    );

    return;
  }


  const { error: updateError } =
    await supabaseClient
      .from("course_requests")
      .update({
        status: "approved",
        updated_at: new Date().toISOString()
      })
      .eq(
        "id",
        id
      );


  if (updateError) {

    console.error(updateError);

    showAdminMsg(
      updateError.message,
      true
    );

    return;
  }


  showAdminMsg(
    "✅ تمت الموافقة وفتح الكورس للطالب."
  );


  await refreshAll();

}


/* =========================================================
   REJECT REQUEST
========================================================= */

async function rejectRequest(id) {

  const confirmed =
    confirm(
      "هل أنت متأكد من رفض الطلب؟"
    );


  if (!confirmed) return;


  const { error } =
    await supabaseClient
      .from("course_requests")
      .update({
        status: "rejected",
        updated_at:
          new Date().toISOString()
      })
      .eq(
        "id",
        id
      );


  if (error) {

    console.error(error);

    showAdminMsg(
      error.message,
      true
    );

    return;
  }


  showAdminMsg(
    "تم رفض الطلب."
  );


  await loadRequests();

}


/* =========================================================
   RENDER COURSES
========================================================= */

function renderCourses(courses) {

  const container =
    document.getElementById(
      "coursesList"
    );


  if (!container) return;


  if (!courses.length) {

    container.innerHTML =
      "<p>لا توجد كورسات.</p>";

    return;
  }


  container.innerHTML = "";


  courses.forEach(course => {

    const card =
      document.createElement(
        "div"
      );

    card.className =
      "admin-item";


    card.innerHTML = `

      <div>

        <h3>
          ${escapeHtml(course.title)}
        </h3>

        <p>
          السنة الدراسية:
          ${course.academic_year}
        </p>

        <p>
          السعر:
          ${course.price} جنيه
        </p>

        <p>
          الحالة:
          ${
            course.is_visible
              ? "ظاهر للطلاب"
              : "مخفي"
          }
        </p>

      </div>

    `;


    container.appendChild(card);

  });

}


/* =========================================================
   RENDER LECTURES
========================================================= */

function renderLectures(lectures) {

  const container =
    document.getElementById(
      "lecturesList"
    );


  if (!container) return;


  if (!lectures.length) {

    container.innerHTML =
      "<p>لا توجد محاضرات.</p>";

    return;
  }


  container.innerHTML = "";


  lectures.forEach(lecture => {

    const card =
      document.createElement(
        "div"
      );

    card.className =
      "admin-item";


    card.innerHTML = `

      <div>

        <h3>
          ${escapeHtml(
            lecture.title
          )}
        </h3>

        <p>
          الكورس:
          ${escapeHtml(
            lecture.courses?.title ||
            "—"
          )}
        </p>

        <p>
          الترتيب:
          ${lecture.lecture_order}
        </p>

        <p>
          الحالة:
          ${
            lecture.is_free
              ? "مجانية"
              : "مدفوعة"
          }
        </p>

        <p>
          فيديو:
          ${
            lecture.video_url
              ? "متوفر"
              : "غير موجود"
          }
        </p>

        <p>
          PDF:
          ${
            lecture.pdf_url
              ? "متوفر"
              : "غير موجود"
          }
        </p>

      </div>

    `;


    container.appendChild(card);

  });

}


/* =========================================================
   RENDER EXAMS
========================================================= */

function renderExams(exams) {

  const container =
    document.getElementById(
      "examsList"
    );


  if (!container) return;


  if (!exams.length) {

    container.innerHTML =
      "<p>لا توجد امتحانات.</p>";

    return;
  }


  container.innerHTML = "";


  exams.forEach(exam => {

    const card =
      document.createElement(
        "div"
      );

    card.className =
      "admin-item";


    card.innerHTML = `

      <div>

        <h3>
          ${escapeHtml(
            exam.title
          )}
        </h3>

        <p>
          الكورس:
          ${escapeHtml(
            exam.lectures?.courses?.title ||
            "—"
          )}
        </p>

        <p>
          المحاضرة:
          ${escapeHtml(
            exam.lectures?.title ||
            "—"
          )}
        </p>

        <p>
          الدرجة:
          ${exam.max_score}
        </p>

      </div>

    `;


    container.appendChild(card);

  });

}


/* =========================================================
   HTML SECURITY
========================================================= */

function escapeHtml(value) {

  if (value === null ||
      value === undefined) {

    return "";

  }


  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


/* =========================================================
   THEME
========================================================= */

const themeToggle =
  document.getElementById(
    "themeToggle"
  );


function applyTheme() {

  const saved =
    localStorage.getItem(
      "amira_theme"
    );


  if (saved === "dark") {

    document.body.classList.add(
      "dark"
    );

    if (themeToggle) {
      themeToggle.textContent =
        "☀️";
    }

  } else {

    document.body.classList.remove(
      "dark"
    );

    if (themeToggle) {
      themeToggle.textContent =
        "🌙";
    }

  }

}


applyTheme();


if (themeToggle) {

  themeToggle.addEventListener(
    "click",
    () => {

      const dark =
        document.body.classList.toggle(
          "dark"
        );


      localStorage.setItem(
        "amira_theme",
        dark
          ? "dark"
          : "light"
      );


      themeToggle.textContent =
        dark
          ? "☀️"
          : "🌙";

    }
  );

}


/* =========================================================
   LOGOUT
========================================================= */

const logoutBtn =
  document.getElementById(
    "logoutBtn"
  );


if (logoutBtn) {

  logoutBtn.addEventListener(
    "click",
    async () => {

      await supabaseClient.auth.signOut();

      location.href =
        "login.html";

    }
  );

}


/* =========================================================
   REFRESH EVERYTHING
========================================================= */

async function refreshAll() {

  await loadCourses();

  await loadLectures();

  await loadExams();

  await loadQuestions();

  await loadRequests();

  await loadStudents();

  await loadLectureAccess();

}


/* =========================================================
   START
========================================================= */

(async function initAdmin() {

  const user =
    await checkAdmin();


  if (!user) return;


  await refreshAll();

})();
