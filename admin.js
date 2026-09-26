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

      const imageInput =
        document.getElementById("courseImage");

      const imageFile =
        imageInput?.files?.[0] || null;

      if (imageFile) {
        if (!imageFile.type.startsWith("image/")) {
          showAdminMsg(
            "اختار ملف صورة فقط.",
            true
          );
          return;
        }

        if (imageFile.size > 5 * 1024 * 1024) {
          showAdminMsg(
            "حجم صورة الكورس لازم يكون أقل من 5MB.",
            true
          );
          return;
        }
      }

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

      const { data: insertedCourse, error } =
        await supabaseClient
          .from("courses")
          .insert({
            title,
            description,
            price,
            academic_year: academicYear,
            image_url: null,
            is_visible: isVisible
          })
          .select("id")
          .single();

      if (error) {

        console.error(error);

        showAdminMsg(
          error.message,
          true
        );

        return;
      }

      try {
        if (imageFile && insertedCourse?.id) {
          const imageUrl = await uploadFile(
            "course-images",
            imageFile,
            "courses"
          );

          const { error: imageUpdateError } =
            await supabaseClient
              .from("courses")
              .update({
                image_url: imageUrl
              })
              .eq(
                "id",
                insertedCourse.id
              );

          if (imageUpdateError) {
            await supabaseClient
              .from("courses")
              .delete()
              .eq("id", insertedCourse.id);

            throw imageUpdateError;
          }
        }
      } catch (uploadError) {
        console.error(uploadError);

        showAdminMsg(
          "تم إلغاء إضافة الكورس لأن رفع الصورة فشل: " +
            uploadError.message,
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
  optionIndex
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
        index === optionIndex;
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


function createQuestionCard(index) {

  const card =
    document.createElement("div");

  card.className =
    "exam-question-card";

  card.dataset.questionIndex =
    index;

  card.innerHTML = `
    <div class="question-card-header">
      <h4>
        السؤال
        <span class="question-number">
          ${index + 1}
        </span>
      </h4>

      <button
        type="button"
        class="btn danger-btn remove-question-btn"
      >
        حذف السؤال
      </button>
    </div>

    <textarea
      class="exam-question-text"
      placeholder="اكتب نص السؤال"
      rows="3"
    ></textarea>

    <div class="exam-options-container"></div>

    <button
      type="button"
      class="btn secondary-btn add-option-btn"
    >
      إضافة اختيار
    </button>
  `;

  const optionsContainer =
    card.querySelector(
      ".exam-options-container"
    );

  const addOptionBtn =
    card.querySelector(
      ".add-option-btn"
    );

  const removeQuestionBtn =
    card.querySelector(
      ".remove-question-btn"
    );

  for (
    let optionIndex = 0;
    optionIndex < 2;
    optionIndex++
  ) {

    optionsContainer.appendChild(
      createOptionElement(
        index,
        optionIndex
      )
    );
  }

  addOptionBtn.addEventListener(
    "click",
    () => {

      const currentOptions =
        optionsContainer.querySelectorAll(
          ".exam-option-row"
        );

      const newIndex =
        currentOptions.length;

      optionsContainer.appendChild(
        createOptionElement(
          Number(
            card.dataset.questionIndex
          ),
          newIndex
        )
      );

      renumberOptions(card);
    }
  );

  removeQuestionBtn.addEventListener(
    "click",
    () => {

      const cards =
        getQuestionCards();

      if (cards.length <= 1) {

        showFullExamMsg(
          "لازم يكون فيه سؤال واحد على الأقل.",
          true
        );

        return;
      }

      card.remove();

      renumberQuestions();

      showFullExamMsg("");
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

      const number =
        card.querySelector(
          ".question-number"
        );

      if (number) {
        number.textContent =
          index + 1;
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
              text,
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
        question: questionText,
        options
      };
    }
  );
}


if (addQuestionBtn) {

  addQuestionBtn.addEventListener(
    "click",
    addExamQuestion
  );
}


if (
  questionsBuilder &&
  !questionsBuilder.children.length
) {
  addExamQuestion();
}
/* =========================================================
   CREATE FULL EXAM
========================================================= */

if (fullExamForm) {

  fullExamForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      showFullExamMsg(
        "جاري إنشاء الامتحان..."
      );

      const lectureId =
        document
          .getElementById("examLecture")
          ?.value;

      const title =
        document
          .getElementById("examTitle")
          ?.value
          .trim();

      const description =
        document
          .getElementById("examDescription")
          ?.value
          .trim();

      const maxScore =
        Number(
          document
            .getElementById("examMaxScore")
            ?.value
        );

      const durationInput =
        document.getElementById(
          "examDuration"
        );

      const durationMinutes =
        Number(
          durationInput?.value
        );

      if (!lectureId || !title) {

        showFullExamMsg(
          "اختار المحاضرة واكتب اسم الامتحان.",
          true
        );

        return;
      }

      if (
        !Number.isFinite(maxScore) ||
        maxScore <= 0
      ) {

        showFullExamMsg(
          "اكتب الدرجة النهائية بشكل صحيح.",
          true
        );

        return;
      }

      if (
        !Number.isInteger(durationMinutes) ||
        durationMinutes < 1 ||
        durationMinutes > 600
      ) {

        showFullExamMsg(
          "مدة الامتحان لازم تكون بين 1 و600 دقيقة.",
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

      const submitBtn =
        fullExamForm.querySelector(
          'button[type="submit"]'
        );

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent =
          "جاري إنشاء الامتحان...";
      }

      try {

        const { data, error } =
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

        let examId = null;

        if (data) {

          if (typeof data === "string") {
            examId = data;
          }

          else if (
            typeof data === "object"
          ) {
            examId =
              data.id ||
              data.exam_id ||
              data[0]?.id ||
              data[0]?.exam_id ||
              null;
          }
        }

        /*
          لو الـ RPC مش بيرجع الـ ID،
          نجيب آخر امتحان للمحاضرة
          بنفس العنوان.
        */

        if (!examId) {

          const {
            data: latestExam,
            error: latestExamError
          } =
            await supabaseClient
              .from("lecture_exams")
              .select("id")
              .eq(
                "lecture_id",
                lectureId
              )
              .eq(
                "title",
                title
              )
              .order(
                "created_at",
                {
                  ascending: false
                }
              )
              .limit(1)
              .maybeSingle();

          if (latestExamError) {
            throw latestExamError;
          }

          examId =
            latestExam?.id || null;
        }

        if (!examId) {
          throw new Error(
            "تم إنشاء الامتحان لكن لم أستطع تحديد رقمه لتسجيل مدة الامتحان."
          );
        }

        const {
          error: durationError
        } =
          await supabaseClient
            .from("lecture_exams")
            .update({
              duration_minutes:
                durationMinutes
            })
            .eq(
              "id",
              examId
            );

        if (durationError) {
          throw durationError;
        }

        showFullExamMsg(
          "✅ تم إنشاء الامتحان بنجاح."
        );

        fullExamForm.reset();

        if (durationInput) {
          durationInput.value = 30;
        }

        resetExamBuilder();

        await refreshAll();

      } catch (error) {

        console.error(error);

        showFullExamMsg(
          "حصل خطأ أثناء إنشاء الامتحان: " +
            error.message,
          true
        );

      } finally {

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent =
            "إنشاء الامتحان";
        }
      }
    }
  );
}


/* =========================================================
   STUDENTS
========================================================= */

async function loadStudents() {

  const { data, error } =
    await supabaseClient
      .from("profiles")
      .select(
        "id,full_name,email,academic_year,role,created_at"
      )
      .eq(
        "role",
        "student"
      )
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

  renderStudents(
    data || []
  );

  return data || [];
}


/* =========================================================
   OPEN COURSE ACCESS
========================================================= */

const accessForm =
  document.getElementById(
    "accessForm"
  );

if (accessForm) {

  accessForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const lectureId =
        document
          .getElementById(
            "accessLecture"
          )
          ?.value;

      const studentId =
        document
          .getElementById(
            "accessStudent"
          )
          ?.value;

      if (!lectureId || !studentId) {

        showAdminMsg(
          "اختار الطالب والمحاضرة.",
          true
        );

        return;
      }

      try {

        const { error } =
          await supabaseClient
            .from("lecture_access")
            .upsert(
              {
                lecture_id:
                  lectureId,

                student_id:
                  studentId,

                granted_by:
                  (
                    await supabaseClient.auth.getUser()
                  ).data.user.id
              },
              {
                onConflict:
                  "lecture_id,student_id"
              }
            );

        if (error) {
          throw error;
        }

        showAdminMsg(
          "✅ تم فتح المحاضرة للطالب."
        );

        accessForm.reset();

        if (accessCourse) {
          await loadAccessLectures();
        }

        await loadLectureAccess();

      } catch (error) {

        console.error(error);

        showAdminMsg(
          "حصل خطأ: " +
            error.message,
          true
        );
      }
    }
  );
}


/* =========================================================
   LOAD LECTURE ACCESS
========================================================= */

async function loadLectureAccess() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("lecture_access")
      .select(`
        *,
        profiles (
          full_name,
          email
        ),
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

  renderLectureAccess(
    data || []
  );

  return data || [];
}


/* =========================================================
   DELETE LECTURE ACCESS
========================================================= */

async function deleteLectureAccess(
  accessId
) {

  if (!accessId) return;

  const confirmed =
    confirm(
      "هل تريد إلغاء فتح هذه المحاضرة للطالب؟"
    );

  if (!confirmed) return;

  const { error } =
    await supabaseClient
      .from("lecture_access")
      .delete()
      .eq(
        "id",
        accessId
      );

  if (error) {

    console.error(error);

    showAdminMsg(
      "حصل خطأ أثناء إلغاء الصلاحية.",
      true
    );

    return;
  }

  showAdminMsg(
    "تم إلغاء صلاحية المحاضرة."
  );

  await loadLectureAccess();
}


/* =========================================================
   COURSE REQUESTS
========================================================= */

async function loadRequests() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("course_requests")
      .select(`
        *,
        profiles (
          id,
          full_name,
          email,
          academic_year
        ),
        courses (
          id,
          title,
          academic_year,
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

    return [];
  }

  const requests =
    data || [];

  if (requestsCount) {
    requestsCount.textContent =
      requests.filter(
        request =>
          request.status === "pending"
      ).length;
  }

  renderRequests(
    requests
  );

  return requests;
}


/* =========================================================
   APPROVE REQUEST
========================================================= */

async function approveRequest(
  requestId
) {

  if (!requestId) return;

  const confirmed =
    confirm(
      "هل تريد الموافقة على طلب الكورس؟"
    );

  if (!confirmed) return;

  try {

    const {
      data: request,
      error: requestError
    } =
      await supabaseClient
        .from("course_requests")
        .select(`
          *,
          courses (
            id,
            title
          )
        `)
        .eq(
          "id",
          requestId
        )
        .maybeSingle();

    if (requestError) {
      throw requestError;
    }

    if (!request) {
      throw new Error(
        "طلب الكورس غير موجود."
      );
    }

    const studentId =
      request.student_id;

    const courseId =
      request.course_id;

    if (!studentId || !courseId) {
      throw new Error(
        "بيانات الطلب ناقصة."
      );
    }

    const {
      data: existingEnrollment,
      error: enrollmentCheckError
    } =
      await supabaseClient
        .from("enrollments")
        .select("id")
        .eq(
          "student_id",
          studentId
        )
        .eq(
          "course_id",
          courseId
        )
        .maybeSingle();

    if (enrollmentCheckError) {
      throw enrollmentCheckError;
    }

    if (!existingEnrollment) {

      const {
        error: enrollmentError
      } =
        await supabaseClient
          .from("enrollments")
          .insert({
            student_id:
              studentId,

            course_id:
              courseId
          });

      if (enrollmentError) {
        throw enrollmentError;
      }
    }

    const {
      error: updateError
    } =
      await supabaseClient
        .from("course_requests")
        .update({
          status:
            "approved",

          reviewed_at:
            new Date().toISOString(),

          reviewed_by:
            (
              await supabaseClient.auth.getUser()
            ).data.user.id
        })
        .eq(
          "id",
          requestId
        );

    if (updateError) {
      throw updateError;
    }

    showAdminMsg(
      "✅ تمت الموافقة على الطلب."
    );

    await refreshAll();

  } catch (error) {

    console.error(error);

    showAdminMsg(
      "حصل خطأ أثناء الموافقة: " +
        error.message,
      true
    );
  }
}


/* =========================================================
   REJECT REQUEST
========================================================= */

async function rejectRequest(
  requestId
) {

  if (!requestId) return;

  const confirmed =
    confirm(
      "هل تريد رفض طلب الكورس؟"
    );

  if (!confirmed) return;

  const {
    error
  } =
    await supabaseClient
      .from("course_requests")
      .update({
        status:
          "rejected",

        reviewed_at:
          new Date().toISOString(),

        reviewed_by:
          (
            await supabaseClient.auth.getUser()
          ).data.user.id
      })
      .eq(
        "id",
        requestId
      );

  if (error) {

    console.error(error);

    showAdminMsg(
      "حصل خطأ أثناء رفض الطلب.",
      true
    );

    return;
  }

  showAdminMsg(
    "تم رفض الطلب."
  );

  await refreshAll();
}


/* =========================================================
   DELETE COURSE
========================================================= */

async function deleteCourse(
  courseId,
  imageUrl = null
) {

  if (!courseId) return;

  const confirmed =
    confirm(
      "⚠️ حذف الكورس سيحذف المحاضرات والامتحانات المرتبطة به. هل أنت متأكد؟"
    );

  if (!confirmed) return;

  showAdminMsg(
    "جاري حذف الكورس..."
  );

  try {

    /*
      حذف صورة الكورس أولًا
    */

    if (imageUrl) {
      await removeStorageFile(
        "course-images",
        imageUrl
      );
    }

    /*
      الحذف من قاعدة البيانات
      يعتمد على ON DELETE CASCADE
    */

    const {
      error
    } =
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
      "✅ تم حذف الكورس."
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
  lectureId,
  videoUrl = null,
  pdfUrl = null
) {

  if (!lectureId) return;

  const confirmed =
    confirm(
      "هل أنت متأكد من حذف المحاضرة؟"
    );

  if (!confirmed) return;

  showAdminMsg(
    "جاري حذف المحاضرة..."
  );

  try {

    if (videoUrl) {

      await removeStorageFile(
        "lecture-videos",
        videoUrl
      );
    }

    if (pdfUrl) {

      await removeStorageFile(
        "lecture-pdfs",
        pdfUrl
      );
    }

    const {
      error
    } =
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
      "✅ تم حذف المحاضرة."
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
   DELETE EXAM
========================================================= */

async function deleteExam(
  examId
) {

  if (!examId) return;

  const confirmed =
    confirm(
      "هل أنت متأكد من حذف الامتحان بكل أسئلته ونتائجه؟"
    );

  if (!confirmed) return;

  const {
    error
  } =
    await supabaseClient
      .from("lecture_exams")
      .delete()
      .eq(
        "id",
        examId
      );

  if (error) {

    console.error(error);

    showAdminMsg(
      "حصل خطأ أثناء حذف الامتحان.",
      true
    );

    return;
  }

  showAdminMsg(
    "✅ تم حذف الامتحان."
  );

  await refreshAll();
}


/* =========================================================
   RENDER COURSES
========================================================= */

function renderCourses(
  courses
) {

  const container =
    document.getElementById(
      "coursesList"
    );

  if (!container) return;

  if (!courses.length) {

    container.innerHTML =
      `
        <div class="empty-state">
          لا توجد كورسات حتى الآن.
        </div>
      `;

    return;
  }

  container.innerHTML =
    courses
      .map(
        course => {

          const image =
            course.image_url
              ? `
                <img
                  src="${escapeHtml(course.image_url)}"
                  alt="${escapeHtml(course.title)}"
                  class="course-admin-image"
                >
              `
              : `
                <div class="course-admin-image placeholder">
                  لا توجد صورة
                </div>
              `;

          return `
            <div class="admin-card course-card">

              ${image}

              <div class="admin-card-content">

                <h3>
                  ${escapeHtml(course.title)}
                </h3>

                <p>
                  السنة:
                  ${escapeHtml(
                    String(
                      course.academic_year
                    )
                  )}
                </p>

                <p>
                  السعر:
                  ${escapeHtml(
                    String(
                      course.price ?? 0
                    )
                  )}
                </p>

                <p>
                  الحالة:
                  ${
                    course.is_visible
                      ? "ظاهر"
                      : "مخفي"
                  }
                </p>

                <div class="admin-actions">

                  <button
                    type="button"
                    class="btn danger-btn"
                    onclick="deleteCourse(
                      '${course.id}',
                      '${escapeJs(
                        course.image_url || ""
                      )}'
                    )"
                  >
                    حذف الكورس
                  </button>

                </div>

              </div>

            </div>
          `;
        }
      )
      .join("");
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
      `
        <div class="empty-state">
          لا توجد محاضرات حتى الآن.
        </div>
      `;

    return;
  }

  container.innerHTML =
    lectures
      .map(
        lecture => {

          return `
            <div class="admin-card">

              <div class="admin-card-content">

                <h3>
                  ${escapeHtml(
                    lecture.title
                  )}
                </h3>

                <p>
                  الكورس:
                  ${escapeHtml(
                    lecture.courses?.title ||
                    "غير محدد"
                  )}
                </p>

                <p>
                  ترتيب المحاضرة:
                  ${escapeHtml(
                    String(
                      lecture.lecture_order ??
                      1
                    )
                  )}
                </p>

                <p>
                  ${
                    lecture.is_free
                      ? "🟢 مجانية"
                      : "🔒 مدفوعة"
                  }
                </p>

                <div class="admin-actions">

                  <button
                    type="button"
                    class="btn danger-btn"
                    onclick="deleteLecture(
                      '${lecture.id}',
                      '${escapeJs(
                        lecture.video_url || ""
                      )}',
                      '${escapeJs(
                        lecture.pdf_url || ""
                      )}'
                    )"
                  >
                    حذف المحاضرة
                  </button>

                </div>

              </div>

            </div>
          `;
        }
      )
      .join("");
}


/* =========================================================
   RENDER EXAMS
========================================================= */

function renderExams(
  exams
) {

  const container =
    document.getElementById(
      "examsList"
    );

  if (!container) return;

  if (!exams.length) {

    container.innerHTML =
      `
        <div class="empty-state">
          لا توجد امتحانات حتى الآن.
        </div>
      `;

    return;
  }

  container.innerHTML =
    exams
      .map(
        exam => {

          return `
            <div class="admin-card">

              <div class="admin-card-content">

                <h3>
                  ${escapeHtml(
                    exam.title
                  )}
                </h3>

                <p>
                  الكورس:
                  ${escapeHtml(
                    exam.lectures?.courses?.title ||
                    "غير محدد"
                  )}
                </p>

                <p>
                  المحاضرة:
                  ${escapeHtml(
                    exam.lectures?.title ||
                    "غير محددة"
                  )}
                </p>

                <p>
                  الدرجة:
                  ${escapeHtml(
                    String(
                      exam.max_score ?? 0
                    )
                  )}
                </p>

                <p>
                  مدة الامتحان:
                  ${escapeHtml(
                    String(
                      exam.duration_minutes ??
                      30
                    )
                  )}
                  دقيقة
                </p>

                <div class="admin-actions">

                  <button
                    type="button"
                    class="btn danger-btn"
                    onclick="deleteExam(
                      '${exam.id}'
                    )"
                  >
                    حذف الامتحان
                  </button>

                </div>

              </div>

            </div>
          `;
        }
      )
      .join("");
}
// ===============================
// STUDENTS
// ===============================

async function loadStudents() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadStudents:", error);
    return;
  }

  renderStudents(data || []);
}

function renderStudents(students) {
  const container = document.getElementById("studentsList");
  if (!container) return;

  if (!students.length) {
    container.innerHTML = `
      <div class="empty-state">
        لا يوجد طلاب حتى الآن.
      </div>
    `;
    return;
  }

  container.innerHTML = students
    .map((student) => {
      const name = escapeHtml(
        student.full_name || student.email || "طالب"
      );

      const email = escapeHtml(student.email || "-");
      const year = student.academic_year
        ? `الفرقة ${student.academic_year}`
        : "غير محدد";

      const role =
        student.role === "admin"
          ? "مدير"
          : "طالب";

      return `
        <div class="student-card">
          <div class="student-info">
            <h3>${name}</h3>
            <p>${email}</p>
            <span>${year}</span>
            <span>${role}</span>
          </div>
        </div>
      `;
    })
    .join("");
}


// ===============================
// LECTURE ACCESS
// ===============================

async function loadLectureAccess() {
  const { data, error } = await supabaseClient
    .from("lecture_access")
    .select(`
      *,
      profiles (
        id,
        full_name,
        email
      ),
      lectures (
        id,
        title
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadLectureAccess:", error);
    return;
  }

  renderLectureAccess(data || []);
}

function renderLectureAccess(rows) {
  const container = document.getElementById("lectureAccessList");
  if (!container) return;

  if (!rows.length) {
    container.innerHTML = `
      <div class="empty-state">
        لا توجد صلاحيات محاضرات.
      </div>
    `;
    return;
  }

  container.innerHTML = rows
    .map((row) => {
      const studentName = escapeHtml(
        row.profiles?.full_name ||
        row.profiles?.email ||
        "طالب"
      );

      const lectureTitle = escapeHtml(
        row.lectures?.title || "محاضرة"
      );

      return `
        <div class="access-card">
          <div>
            <strong>${studentName}</strong>
            <p>${lectureTitle}</p>
          </div>

          <button
            class="btn btn-danger"
            onclick="deleteLectureAccess('${escapeJs(row.id)}')"
          >
            حذف
          </button>
        </div>
      `;
    })
    .join("");
}

async function deleteLectureAccess(id) {
  if (!confirm("هل تريد حذف صلاحية هذا الطالب؟")) {
    return;
  }

  const { error } = await supabaseClient
    .from("lecture_access")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadLectureAccess();
}


// ===============================
// COURSE REQUESTS
// ===============================

async function loadRequests() {
  const { data, error } = await supabaseClient
    .from("course_requests")
    .select(`
      *,
      profiles (
        id,
        full_name,
        email
      ),
      courses (
        id,
        title
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadRequests:", error);
    return;
  }

  renderRequests(data || []);
}

function renderRequests(requests) {
  const container = document.getElementById("requestsList");
  if (!container) return;

  if (!requests.length) {
    container.innerHTML = `
      <div class="empty-state">
        لا توجد طلبات اشتراك.
      </div>
    `;
    return;
  }

  container.innerHTML = requests
    .map((request) => {
      const studentName = escapeHtml(
        request.profiles?.full_name ||
        request.profiles?.email ||
        "طالب"
      );

      const courseTitle = escapeHtml(
        request.courses?.title || "كورس"
      );

      const status = request.status || "pending";

      let statusText = "قيد الانتظار";

      if (status === "approved") {
        statusText = "مقبول";
      } else if (status === "rejected") {
        statusText = "مرفوض";
      }

      return `
        <div class="request-card">

          <div class="request-info">
            <h3>${studentName}</h3>
            <p>${courseTitle}</p>
            <span class="request-status">
              ${statusText}
            </span>
          </div>

          ${
            status === "pending"
              ? `
                <div class="request-actions">

                  <button
                    class="btn btn-success"
                    onclick="approveRequest('${escapeJs(
                      request.id
                    )}')"
                  >
                    قبول
                  </button>

                  <button
                    class="btn btn-danger"
                    onclick="rejectRequest('${escapeJs(
                      request.id
                    )}')"
                  >
                    رفض
                  </button>

                </div>
              `
              : ""
          }

        </div>
      `;
    })
    .join("");
}

async function approveRequest(id) {
  const { data: request, error: requestError } =
    await supabaseClient
      .from("course_requests")
      .select("student_id, course_id")
      .eq("id", id)
      .maybeSingle();

  if (requestError || !request) {
    alert(requestError?.message || "الطلب غير موجود.");
    return;
  }

  const { error: updateError } = await supabaseClient
    .from("course_requests")
    .update({
      status: "approved"
    })
    .eq("id", id);

  if (updateError) {
    alert(updateError.message);
    return;
  }

  const { error: enrollmentError } =
    await supabaseClient
      .from("enrollments")
      .upsert(
        {
          student_id: request.student_id,
          course_id: request.course_id
        },
        {
          onConflict: "student_id,course_id"
        }
      );

  if (enrollmentError) {
    alert(enrollmentError.message);
    return;
  }

  await Promise.all([
    loadRequests(),
    loadCourses()
  ]);
}

async function rejectRequest(id) {
  const { error } = await supabaseClient
    .from("course_requests")
    .update({
      status: "rejected"
    })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadRequests();
}


// ===============================
// ESCAPE HELPERS
// ===============================

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeJs(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}


// ===============================
// THEME
// ===============================

const themeToggle = document.getElementById("themeToggle");

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const isDark =
      document.body.classList.contains("dark");

    localStorage.setItem(
      "admin-theme",
      isDark ? "dark" : "light"
    );
  });
}

const savedTheme = localStorage.getItem("admin-theme");

if (savedTheme === "dark") {
  document.body.classList.add("dark");
}


// ===============================
// LOGOUT
// ===============================

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    const confirmed = confirm(
      "هل تريد تسجيل الخروج؟"
    );

    if (!confirmed) return;

    await supabaseClient.auth.signOut();

    location.href = "index.html";
  });
}


// ===============================
// REFRESH ALL
// ===============================

async function refreshAll() {
  await Promise.all([
    loadCourses(),
    loadLectures(),
    loadExams(),
    loadStudents(),
    loadLectureAccess(),
    loadRequests()
  ]);
}


// ===============================
// INITIALIZATION
// ===============================

(async () => {
  const user = await checkAdmin();

  if (!user) {
    return;
  }

  await refreshAll();
})();
