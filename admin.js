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

  if (coursesCount) {
    coursesCount.textContent =
      data?.length || 0;
  }

  const lectureCourse =
    document.getElementById("lectureCourse");

  const accessCourse =
    document.getElementById("accessCourse");

  if (lectureCourse) {

    lectureCourse.innerHTML =
      `<option value="">اختر الكورس</option>`;

    (data || []).forEach(course => {

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

    (data || []).forEach(course => {

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
        document
          .getElementById("courseTitle")
          .value
          .trim();

      const description =
        document
          .getElementById("courseDescription")
          .value
          .trim();

      const price =
        Number(
          document
            .getElementById("coursePrice")
            .value
        );

      const academicYear =
        Number(
          document
            .getElementById("courseYear")
            .value
        );

      const imageUrl =
        document
          .getElementById("courseImage")
          .value
          .trim();

      const isVisible =
        document
          .getElementById("courseVisible")
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

      const visibleInput =
        document.getElementById(
          "courseVisible"
        );

      if (visibleInput) {
        visibleInput.checked = true;
      }

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
   STORAGE DELETE HELPERS
========================================================= */

function getStoragePathFromUrl(
  bucket,
  publicUrl
) {

  if (!publicUrl) return null;

  const marker =
    `/storage/v1/object/public/${bucket}/`;

  const index =
    publicUrl.indexOf(marker);

  if (index === -1) {
    return null;
  }

  return decodeURIComponent(
    publicUrl.substring(
      index + marker.length
    )
  );
}


async function removeStorageFile(
  bucket,
  publicUrl
) {

  const path =
    getStoragePathFromUrl(
      bucket,
      publicUrl
    );

  if (!path) return;

  const { error } =
    await supabaseClient.storage
      .from(bucket)
      .remove([path]);

  if (error) {
    console.warn(
      `Could not remove ${bucket}:`,
      error
    );
  }
}


async function removeStorageFolder(
  bucket,
  folder
) {

  let offset = 0;
  const limit = 100;

  while (true) {

    const {
      data,
      error
    } =
      await supabaseClient.storage
        .from(bucket)
        .list(
          folder,
          {
            limit,
            offset
          }
        );

    if (error) {
      console.warn(
        `Could not list ${bucket}/${folder}:`,
        error
      );

      return;
    }

    if (!data || !data.length) {
      break;
    }

    const paths =
      data
        .filter(item => item.name)
        .map(
          item =>
            `${folder}/${item.name}`
        );

    if (paths.length) {

      const {
        error: removeError
      } =
        await supabaseClient.storage
          .from(bucket)
          .remove(paths);

      if (removeError) {
        console.warn(
          `Could not remove files from ${bucket}:`,
          removeError
        );
      }
    }

    if (data.length < limit) {
      break;
    }

    offset += limit;
  }
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
        document
          .getElementById("lectureCourse")
          .value;

      const title =
        document
          .getElementById("lectureTitle")
          .value
          .trim();

      const description =
        document
          .getElementById("lectureDescription")
          .value
          .trim();

      const lectureOrder =
        Number(
          document
            .getElementById("lectureOrder")
            .value
        );

      const isFree =
        document
          .getElementById("lectureFree")
          .checked;

      const videoInput =
        document.getElementById(
          "lectureVideo"
        );

      const pdfInput =
        document.getElementById(
          "lecturePdf"
        );

      const videoFile =
        videoInput?.files?.[0] || null;

      const pdfFile =
        pdfInput?.files?.[0] || null;

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

      if (button) {
        button.disabled = true;
        button.textContent =
          "جاري رفع الملفات...";
      }

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
              lecture_order:
                Number.isFinite(lectureOrder)
                  ? lectureOrder
                  : 1
            });

        if (error) {
          throw error;
        }

        showAdminMsg(
          "✅ تم إضافة المحاضرة بنجاح."
        );

        lectureForm.reset();

        const orderInput =
          document.getElementById(
            "lectureOrder"
          );

        if (orderInput) {
          orderInput.value = 1;
        }

        await refreshAll();

      } catch (error) {

        console.error(error);

        showAdminMsg(
          "حصل خطأ: " + error.message,
          true
        );

      } finally {

        if (button) {
          button.disabled = false;
          button.textContent =
            "إضافة المحاضرة";
        }
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
      .order(
        "lecture_order",
        {
          ascending: true
        }
      );

  if (error) {

    console.error(error);

    return [];
  }

  if (lecturesCount) {
    lecturesCount.textContent =
      data?.length || 0;
  }

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

    (data || []).forEach(
      lecture => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          lecture.id;

        option.textContent =
          `${lecture.courses?.title || "كورس"} — ${lecture.title}`;

        examLecture.appendChild(
          option
        );
      }
    );
  }

  return data || [];
}


/* =========================================================
   ACCESS LECTURES
========================================================= */

const accessCourse =
  document.getElementById(
    "accessCourse"
  );

if (accessCourse) {

  accessCourse.addEventListener(
    "change",
    loadAccessLectures
  );
}


async function loadAccessLectures() {

  if (!accessCourse) return;

  const courseId =
    accessCourse.value;

  const select =
    document.getElementById(
      "accessLecture"
    );

  if (!select) return;

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
        document.createElement(
          "option"
        );

      option.value =
        lecture.id;

      option.textContent =
        `${lecture.lecture_order}. ${lecture.title}`;

      select.appendChild(
        option
      );
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
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  if (error) {

    console.error(error);

    return [];
  }

  if (examsCount) {
    examsCount.textContent =
      data?.length || 0;
  }

  renderExams(data || []);

  return data || [];
}


/* =========================================================
   FULL EXAM BUILDER
========================================================= */

const fullExamForm =
  document.getElementById(
    "fullExamForm"
  );

const questionsBuilder =
  document.getElementById(
    "questionsBuilder"
  );

const addQuestionBtn =
  document.getElementById(
    "addQuestionBtn"
  );

const fullExamMsg =
  document.getElementById(
    "fullExamMsg"
  );


function showFullExamMsg(
  message,
  error = false
) {

  if (!fullExamMsg) return;

  fullExamMsg.textContent =
    message;

  fullExamMsg.className =
    "msg " + (error ? "error" : "ok");
}


function getQuestionCards() {

  if (!questionsBuilder) {
    return [];
  }

  return Array.from(
    questionsBuilder.querySelectorAll(
      ".exam-question-card"
    )
  );
}


function createOptionElement(
  questionIndex,
  optionIndex
) {

  const option =
    document.createElement("div");

  option.className =
    "exam-option-row";

  option.dataset.optionIndex =
    optionIndex;

  option.innerHTML = `
    <input
      type="radio"
      name="correct-question-${questionIndex}"
      class="exam-option-correct"
      title="الإجابة الصحيحة"
    >

    <input
      type="text"
      class="exam-option-text"
      placeholder="اكتب الاختيار"
      autocomplete="off"
    >

    <button
      type="button"
      class="btn danger-btn remove-option-btn"
    >
      حذف
    </button>
  `;

  const radio =
    option.querySelector(
      ".exam-option-correct"
    );

  radio.addEventListener(
    "change",
    () => {
      updateCorrectOption(
        questionIndex,
        optionIndex
      );
    }
  );

  const removeBtn =
    option.querySelector(
      ".remove-option-btn"
    );

  removeBtn.addEventListener(
    "click",
    () => {

      const card =
        getQuestionCards()
          .find(
            item =>
              Number(
                item.dataset.questionIndex
              ) === questionIndex
          );

      if (!card) return;

      const options =
        card.querySelectorAll(
          ".exam-option-row"
        );

      if (options.length <= 2) {

        showFullExamMsg(
          "كل سؤال لازم يكون فيه اختيارين على الأقل.",
          true
        );

        return;
      }

      option.remove();

      renumberOptions(card);
    }
  );

  return option;
}


function updateCorrectOption(
  questionIndex,
  selectedOptionIndex
) {

  const card =
    getQuestionCards()
      .find(
        item =>
          Number(
            item.dataset.questionIndex
          ) === questionIndex
      );

  if (!card) return;

  const radios =
    card.querySelectorAll(
      ".exam-option-correct"
    );

  radios.forEach(
    (radio, index) => {
      radio.checked =
        index === selectedOptionIndex;
    }
  );
}


function renumberOptions(card) {

  const questionIndex =
    Number(
      card.dataset.questionIndex
    );

  const options =
    card.querySelectorAll(
      ".exam-option-row"
    );

  options.forEach(
    (option, index) => {

      option.dataset.optionIndex =
        index;

      const radio =
        option.querySelector(
          ".exam-option-correct"
        );

      if (radio) {
        radio.name =
          `correct-question-${questionIndex}`;
      }
    }
  );
}


function createQuestionCard(
  questionIndex
) {

  const card =
    document.createElement("div");

  card.className =
    "admin-item exam-question-card";

  card.dataset.questionIndex =
    questionIndex;

  card.innerHTML = `
    <div class="exam-question-header">

      <h3>
        السؤال ${questionIndex + 1}
      </h3>

      <button
        type="button"
        class="btn danger-btn remove-question-btn"
      >
        حذف السؤال
      </button>

    </div>

    <div class="form-group">

      <label>
        نص السؤال
      </label>

      <textarea
        class="exam-question-text"
        rows="3"
        placeholder="اكتب السؤال هنا..."
        required
      ></textarea>

    </div>

    <div class="exam-options-area">

      <h4>
        الاختيارات
      </h4>

      <p>
        اختار دائرة واحدة فقط كإجابة صحيحة.
      </p>

      <div class="exam-options-list"></div>

      <button
        type="button"
        class="btn secondary-btn add-option-btn"
      >
        + إضافة اختيار
      </button>

    </div>
  `;

  const optionsList =
    card.querySelector(
      ".exam-options-list"
    );

  optionsList.appendChild(
    createOptionElement(
      questionIndex,
      0
    )
  );

  optionsList.appendChild(
    createOptionElement(
      questionIndex,
      1
    )
  );

  const removeQuestionBtn =
    card.querySelector(
      ".remove-question-btn"
    );

  removeQuestionBtn.addEventListener(
    "click",
    () => {

      const cards =
        getQuestionCards();

      if (cards.length <= 1) {

        showFullExamMsg(
          "لازم الامتحان يحتوي على سؤال واحد على الأقل.",
          true
        );

        return;
      }

      card.remove();

      renumberQuestions();

      showFullExamMsg("");
    }
  );

  const addOptionButton =
    card.querySelector(
      ".add-option-btn"
    );

  addOptionButton.addEventListener(
    "click",
    () => {

      const options =
        card.querySelectorAll(
          ".exam-option-row"
        );

      const optionIndex =
        options.length;

      optionsList.appendChild(
        createOptionElement(
          Number(
            card.dataset.questionIndex
          ),
          optionIndex
        )
      );

      renumberOptions(card);
    }
  );

  return card;
}


function renumberQuestions() {

  const cards =
    getQuestionCards();

  cards.forEach(
    (card, index) => {

      card.dataset.questionIndex =
        index;

      const heading =
        card.querySelector(
          "h3"
        );

      if (heading) {
        heading.textContent =
          `السؤال ${index + 1}`;
      }

      const radios =
        card.querySelectorAll(
          ".exam-option-correct"
        );

      radios.forEach(
        radio => {
          radio.name =
            `correct-question-${index}`;
        }
      );

      renumberOptions(card);
    }
  );
}


function addExamQuestion() {

  if (!questionsBuilder) return;

  const index =
    getQuestionCards().length;

  const card =
    createQuestionCard(index);

  questionsBuilder.appendChild(
    card
  );

  renumberQuestions();
}


function resetExamBuilder() {

  if (!questionsBuilder) return;

  questionsBuilder.innerHTML = "";

  addExamQuestion();
}


function collectExamQuestions() {

  const cards =
    getQuestionCards();

  if (!cards.length) {
    throw new Error(
      "لازم تضيف سؤال واحد على الأقل."
    );
  }

  return cards.map(
    (card, questionIndex) => {

      const questionText =
        card.querySelector(
          ".exam-question-text"
        )?.value
          .trim();

      if (!questionText) {
        throw new Error(
          `اكتب نص السؤال رقم ${questionIndex + 1}.`
        );
      }

      const optionRows =
        Array.from(
          card.querySelectorAll(
            ".exam-option-row"
          )
        );

      if (optionRows.length < 2) {
        throw new Error(
          `السؤال ${questionIndex + 1} لازم يحتوي على اختيارين على الأقل.`
        );
      }

      const options =
        optionRows.map(
          (row, optionIndex) => {

            const text =
              row.querySelector(
                ".exam-option-text"
              )?.value
                .trim();

            const correct =
              row.querySelector(
                ".exam-option-correct"
              )?.checked || false;

            if (!text) {
              throw new Error(
                `اكتب الاختيار رقم ${optionIndex + 1} في السؤال ${questionIndex + 1}.`
              );
            }

            return {
              option_text: text,
              option_order:
                optionIndex + 1,
              is_correct: correct
            };
          }
        );

      const correctCount =
        options.filter(
          option =>
            option.is_correct
        ).length;

      if (correctCount !== 1) {
        throw new Error(
          `السؤال ${questionIndex + 1} لازم يكون له إجابة صحيحة واحدة فقط.`
        );
      }

      return {
        question_text: questionText,
        question_order:
          questionIndex + 1,
        options
      };
    }
  );
}


if (addQuestionBtn) {

  addQuestionBtn.addEventListener(
    "click",
    () => {
      addExamQuestion();
      showFullExamMsg("");
    }
  );
}


if (fullExamForm) {

  fullExamForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const lectureId =
        document.getElementById(
          "examLecture"
        )?.value;

      const title =
        document.getElementById(
          "examTitle"
        )?.value
          .trim();

      const description =
        document.getElementById(
          "examDescription"
        )?.value
          .trim();

      const maxScore =
        Number(
          document.getElementById(
            "examMaxScore"
          )?.value
        );

      if (!lectureId) {

        showFullExamMsg(
          "اختار المحاضرة الأول.",
          true
        );

        return;
      }

      if (!title) {

        showFullExamMsg(
          "اكتب اسم الامتحان.",
          true
        );

        return;
      }

      if (
        !Number.isFinite(maxScore) ||
        maxScore <= 0
      ) {

        showFullExamMsg(
          "اكتب درجة صحيحة أكبر من صفر.",
          true
        );

        return;
      }

      let questions;

      try {

        questions =
          collectExamQuestions();

      } catch (error) {

        showFullExamMsg(
          error.message,
          true
        );

        return;
      }

      const submitButton =
        document.getElementById(
          "fullExamSubmitBtn"
        );

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent =
          "جاري إنشاء الامتحان...";
      }

      showFullExamMsg(
        "جاري إنشاء الامتحان بالأسئلة والاختيارات..."
      );

      try {

        const {
          data,
          error
        } =
          await supabaseClient.rpc(
            "create_full_exam",
            {
              p_lecture_id:
                lectureId,

              p_title:
                title,

              p_description:
                description || null,

              p_max_score:
                maxScore,

              p_questions:
                questions
            }
          );

        if (error) {
          throw error;
        }

        console.log(
          "Created exam:",
          data
        );

        showFullExamMsg(
          "✅ تم إنشاء الامتحان بكل الأسئلة والاختيارات بنجاح."
        );

        fullExamForm.reset();

        const scoreInput =
          document.getElementById(
            "examMaxScore"
          );

        if (scoreInput) {
          scoreInput.value = 100;
        }

        resetExamBuilder();

        await loadExams();

      } catch (error) {

        console.error(error);

        showFullExamMsg(
          "حصل خطأ أثناء إنشاء الامتحان: " +
            error.message,
          true
        );

      } finally {

        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent =
            "إنشاء الامتحان كاملًا";
        }
      }
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

  (data || []).forEach(
    student => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        student.id;

      option.textContent =
        `${student.full_name || "بدون اسم"} — ${student.email || ""}`;

      select.appendChild(
        option
      );
    }
  );
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
    )?.value;

  const courseId =
    document.getElementById(
      "accessCourse"
    )?.value;

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
          student_id:
            studentId,

          course_id:
            courseId
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
    )?.value;

  const lectureId =
    document.getElementById(
      "accessLecture"
    )?.value;

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
          student_id:
            studentId,

          lecture_id:
            lectureId
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

  data.forEach(
    item => {

      const tr =
        document.createElement(
          "tr"
        );

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
    }
  );
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

  if (requestsCount) {

    requestsCount.textContent =
      (data || []).filter(
        request =>
          request.status === "pending"
      ).length;
  }

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

  data.forEach(
    request => {

      const tr =
        document.createElement(
          "tr"
        );

      let statusText =
        "قيد الانتظار";

      if (
        request.status ===
        "approved"
      ) {
        statusText =
          "تمت الموافقة";
      }

      if (
        request.status ===
        "rejected"
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
            request.status ===
            "pending"

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
    }
  );
}


/* =========================================================
   APPROVE REQUEST
========================================================= */

async function approveRequest(id) {

  const {
    data: request,
    error
  } =
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

  const {
    error: enrollmentError
  } =
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

  const {
    error: updateError
  } =
    await supabaseClient
      .from("course_requests")
      .update({
        status:
          "approved",

        updated_at:
          new Date().toISOString()
      })
      .eq(
        "id",
        id
      );

  if (updateError) {

    console.error(
      updateError
    );

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
        status:
          "rejected",

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
   DELETE COURSE
========================================================= */

async function deleteCourse(courseId) {

  if (!courseId) return;

  const confirmed =
    confirm(
      "⚠️ هل أنت متأكد من حذف الكورس؟\n\nسيتم حذف الكورس وكل المحاضرات والامتحانات والأسئلة والاختيارات والصلاحيات والطلبات المرتبطة به."
    );

  if (!confirmed) return;

  showAdminMsg(
    "جاري حذف الكورس..."
  );

  try {

    /*
      حذف ملفات الكورس من Storage أولًا.
      الملفات الخاصة بالمحاضرات محفوظة داخل مجلد courseId.
    */

    await removeStorageFolder(
      "lecture-videos",
      courseId
    );

    await removeStorageFolder(
      "lecture-pdfs",
      courseId
    );

    const { error } =
      await supabaseClient
        .from("courses")
        .delete()
        .eq(
          "id",
          courseId
        );

    if (error) {
      throw error;
    }

    showAdminMsg(
      "✅ تم حذف الكورس وكل البيانات المرتبطة به."
    );

    await refreshAll();

  } catch (error) {

    console.error(error);

    showAdminMsg(
      "حصل خطأ أثناء حذف الكورس: " +
        error.message,
      true
    );
  }
}


/* =========================================================
   DELETE LECTURE
========================================================= */

async function deleteLecture(
  lectureId
) {

  if (!lectureId) return;

  const confirmed =
    confirm(
      "⚠️ هل أنت متأكد من حذف المحاضرة؟\n\nسيتم حذف المحاضرة والامتحانات والأسئلة والاختيارات والنتائج والصلاحيات المرتبطة بها."
    );

  if (!confirmed) return;

  showAdminMsg(
    "جاري حذف المحاضرة..."
  );

  try {

    /*
      نجيب روابط الملفات قبل حذف المحاضرة
      عشان نقدر نمسحها من Storage.
    */

    const {
      data: lecture,
      error: lectureError
    } =
      await supabaseClient
        .from("lectures")
        .select(
          "id,video_url,pdf_url"
        )
        .eq(
          "id",
          lectureId
        )
        .maybeSingle();

    if (lectureError) {
      throw lectureError;
    }

    if (lecture) {

      if (lecture.video_url) {

        await removeStorageFile(
          "lecture-videos",
          lecture.video_url
        );
      }

      if (lecture.pdf_url) {

        await removeStorageFile(
          "lecture-pdfs",
          lecture.pdf_url
        );
      }
    }

    const { error } =
      await supabaseClient
        .from("lectures")
        .delete()
        .eq(
          "id",
          lectureId
        );

    if (error) {
      throw error;
    }

    showAdminMsg(
      "✅ تم حذف المحاضرة وكل البيانات المرتبطة بها."
    );

    await refreshAll();

  } catch (error) {

    console.error(error);

    showAdminMsg(
      "حصل خطأ أثناء حذف المحاضرة: " +
        error.message,
      true
    );
  }
}


/* =========================================================
   MAKE DELETE FUNCTIONS GLOBAL
========================================================= */

window.deleteCourse =
  deleteCourse;

window.deleteLecture =
  deleteLecture;

window.approveRequest =
  approveRequest;

window.rejectRequest =
  rejectRequest;

window.removeLectureAccess =
  removeLectureAccess;


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

  courses.forEach(
    course => {

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
              course.title
            )}
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

        <div class="admin-actions">

          <button
            class="btn danger-btn"
            type="button"
            onclick="deleteCourse('${course.id}')"
          >
            حذف الكورس
          </button>

        </div>
      `;

      container.appendChild(
        card
      );
    }
  );
}


/* =========================================================
   RENDER LECTURES
========================================================= */

function renderLectures(
  lectures
) {

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

  lectures.forEach(
    lecture => {

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

        <div class="admin-actions">

          <button
            class="btn danger-btn"
            type="button"
            onclick="deleteLecture('${lecture.id}')"
          >
            حذف المحاضرة
          </button>

        </div>
      `;

      container.appendChild(
        card
      );
    }
  );
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

  exams.forEach(
    exam => {

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

      container.appendChild(
        card
      );
    }
  );
}


/* =========================================================
   HTML SECURITY
========================================================= */

function escapeHtml(value) {

  if (
    value === null ||
    value === undefined
  ) {
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

  /*
    لو صفحة الامتحان الجديدة موجودة،
    نبدأ بسؤال واحد فيه اختيارين.
  */

  if (
    questionsBuilder &&
    !questionsBuilder.children.length
  ) {
    addExamQuestion();
  }

  await refreshAll();

})();
