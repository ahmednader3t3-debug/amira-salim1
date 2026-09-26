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

  const rows =
    card.querySelectorAll(
      ".exam-option-row"
    );

  rows.forEach(
    (row, index) => {

      row.dataset.optionIndex =
        index;

      const radio =
        row.querySelector(
          ".exam-option-correct"
        );

      if (radio) {

        radio.name =
          `correct-question-${questionIndex}`;
      }
    }
  );
}function createQuestionCard(
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
    }
  );

  const addOptionBtn =
    card.querySelector(
      ".add-option-btn"
    );

  addOptionBtn.addEventListener(
    "click",
    () => {

      const options =
        card.querySelectorAll(
          ".exam-option-row"
        );

      const option =
        createOptionElement(
          questionIndex,
          options.length
        );

      optionsList.appendChild(
        option
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
          ".exam-question-header h3"
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
    }
  );
}


if (addQuestionBtn) {

  addQuestionBtn.addEventListener(
    "click",
    () => {

      if (!questionsBuilder) {
        return;
      }

      const questionIndex =
        getQuestionCards().length;

      const card =
        createQuestionCard(
          questionIndex
        );

      questionsBuilder.appendChild(
        card
      );
    }
  );
}
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
        !Number.isInteger(durationMinutes) ||
        durationMinutes < 1 ||
        durationMinutes > 600
      ) {

        showFullExamMsg(
          "مدة الامتحان لازم تكون من 1 إلى 600 دقيقة.",
          true
        );

        return;
      }

      const cards =
        getQuestionCards();

      if (!cards.length) {

        showFullExamMsg(
          "أضف سؤالًا واحدًا على الأقل.",
          true
        );

        return;
      }

      const questions = [];

      for (
        let questionIndex = 0;
        questionIndex < cards.length;
        questionIndex++
      ) {

        const card =
          cards[questionIndex];

        const questionText =
          card
            .querySelector(
              ".exam-question-text"
            )
            ?.value
            .trim();

        if (!questionText) {

          showFullExamMsg(
            `اكتب نص السؤال رقم ${questionIndex + 1}.`,
            true
          );

          return;
        }

        const optionRows =
          Array.from(
            card.querySelectorAll(
              ".exam-option-row"
            )
          );

        if (optionRows.length < 2) {

          showFullExamMsg(
            `السؤال رقم ${questionIndex + 1} لازم يحتوي على اختيارين على الأقل.`,
            true
          );

          return;
        }

        const options = [];

        let correctCount = 0;

        optionRows.forEach(
          row => {

            const text =
              row
                .querySelector(
                  ".exam-option-text"
                )
                ?.value
                .trim();

            const isCorrect =
              row
                .querySelector(
                  ".exam-option-correct"
                )
                ?.checked === true;

            if (isCorrect) {
              correctCount++;
            }

            options.push({
              text,
              is_correct: isCorrect
            });
          }
        );

        if (
          options.some(
            option => !option.text
          )
        ) {

          showFullExamMsg(
            `كل الاختيارات في السؤال رقم ${questionIndex + 1} لازم تكون مكتوبة.`,
            true
          );

          return;
        }

        if (correctCount !== 1) {

          showFullExamMsg(
            `السؤال رقم ${questionIndex + 1} لازم يكون له إجابة صحيحة واحدة فقط.`,
            true
          );

          return;
        }

        questions.push({
          question_text: questionText,
          options
        });
      }

      const button =
        fullExamForm.querySelector(
          'button[type="submit"]'
        );

      if (button) {
        button.disabled = true;
        button.textContent =
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
                Number.isFinite(maxScore)
                  ? maxScore
                  : 100,

              p_questions:
                questions
            }
          );

        if (error) {
          throw error;
        }

        let examId = null;

        if (typeof data === "string") {
          examId = data;
        } else if (
          data &&
          typeof data === "object"
        ) {

          if (
            typeof data.id === "string"
          ) {
            examId = data.id;
          } else if (
            Array.isArray(data) &&
            data.length &&
            typeof data[0]?.id === "string"
          ) {
            examId = data[0].id;
          }
        }

        if (!examId) {

          const { data: latestExam, error: latestError } =
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

          if (latestError) {
            throw latestError;
          }

          examId =
            latestExam?.id || null;
        }

        if (!examId) {
          throw new Error(
            "تم إنشاء الامتحان لكن لم أستطع تحديد رقم الامتحان لتسجيل مدة الامتحان."
          );
        }

        const { error: durationError } =
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
          `✅ تم إنشاء الامتحان بنجاح — مدة الامتحان ${durationMinutes} دقيقة.`
        );

        fullExamForm.reset();

        if (durationInput) {
          durationInput.value = 30;
        }

        if (questionsBuilder) {
          questionsBuilder.innerHTML = "";
        }

        const firstQuestion =
          createQuestionCard(0);

        if (questionsBuilder) {
          questionsBuilder.appendChild(
            firstQuestion
          );
        }

        await refreshAll();

      } catch (error) {

        console.error(
          "Create exam error:",
          error
        );

        showFullExamMsg(
          "حصل خطأ أثناء إنشاء الامتحان: " +
          error.message,
          true
        );

      } finally {

        if (button) {
          button.disabled = false;
          button.textContent =
            "إنشاء الامتحان";
        }
      }
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

    container.innerHTML = `
      <div class="empty-state">
        لا توجد امتحانات حتى الآن.
      </div>
    `;

    return;
  }

  container.innerHTML = "";

  exams.forEach(
    exam => {

      const item =
        document.createElement(
          "div"
        );

      item.className =
        "admin-item";

      const duration =
        Number(
          exam.duration_minutes
        ) || 30;

      item.innerHTML = `
        <div class="admin-item-info">

          <h3>
            ${escapeHtml(
              exam.title || "بدون عنوان"
            )}
          </h3>

          <p>
            المحاضرة:
            ${escapeHtml(
              exam.lectures?.title ||
              "غير محددة"
            )}
          </p>

          <p>
            الكورس:
            ${escapeHtml(
              exam.lectures?.courses?.title ||
              "غير محدد"
            )}
          </p>

          <p>
            الدرجة النهائية:
            ${Number(
              exam.max_score
            ) || 0}
          </p>

          <p>
            مدة الامتحان:
            ${duration} دقيقة
          </p>

        </div>

        <div class="admin-item-actions">

          <button
            type="button"
            class="btn danger-btn delete-exam-btn"
            data-id="${exam.id}"
          >
            حذف الامتحان
          </button>

        </div>
      `;

      container.appendChild(
        item
      );
    }
  );

  container
    .querySelectorAll(
      ".delete-exam-btn"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          async () => {

            const id =
              button.dataset.id;

            if (!id) return;

            const confirmed =
              confirm(
                "هل أنت متأكد من حذف الامتحان؟ سيتم حذف الأسئلة والاختيارات والنتائج المرتبطة به."
              );

            if (!confirmed) {
              return;
            }

            button.disabled = true;

            try {

              const { error } =
                await supabaseClient
                  .from(
                    "lecture_exams"
                  )
                  .delete()
                  .eq(
                    "id",
                    id
                  );

              if (error) {
                throw error;
              }

              showAdminMsg(
                "تم حذف الامتحان بنجاح."
              );

              await refreshAll();

            } catch (error) {

              console.error(error);

              showAdminMsg(
                "تعذر حذف الامتحان: " +
                error.message,
                true
              );

              button.disabled = false;
            }
          }
        );
      }
    );
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

    container.innerHTML = `
      <div class="empty-state">
        لا توجد محاضرات حتى الآن.
      </div>
    `;

    return;
  }

  container.innerHTML = "";

  lectures.forEach(
    lecture => {

      const item =
        document.createElement(
          "div"
        );

      item.className =
        "admin-item";

      item.innerHTML = `
        <div class="admin-item-info">

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
            السنة الدراسية:
            ${lecture.courses?.academic_year || "-"}
          </p>

          <p>
            ترتيب المحاضرة:
            ${lecture.lecture_order || 1}
          </p>

          <p>
            ${lecture.is_free
              ? "🆓 مجانية"
              : "🔒 مدفوعة"}
          </p>

        </div>

        <div class="admin-item-actions">

          ${
            lecture.video_url
              ? `
                <a
                  class="btn secondary-btn"
                  href="${lecture.video_url}"
                  target="_blank"
                  rel="noopener"
                >
                  مشاهدة الفيديو
                </a>
              `
              : ""
          }

          ${
            lecture.pdf_url
              ? `
                <a
                  class="btn secondary-btn"
                  href="${lecture.pdf_url}"
                  target="_blank"
                  rel="noopener"
                >
                  فتح PDF
                </a>
              `
              : ""
          }

          <button
            type="button"
            class="btn danger-btn delete-lecture-btn"
            data-id="${lecture.id}"
          >
            حذف
          </button>

        </div>
      `;

      container.appendChild(
        item
      );
    }
  );

  container
    .querySelectorAll(
      ".delete-lecture-btn"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          async () => {

            const id =
              button.dataset.id;

            if (!id) return;

            const confirmed =
              confirm(
                "هل أنت متأكد من حذف المحاضرة؟"
              );

            if (!confirmed) {
              return;
            }

            button.disabled = true;

            try {

              const {
                data: lecture,
                error: lectureError
              } =
                await supabaseClient
                  .from("lectures")
                  .select(
                    "video_url,pdf_url"
                  )
                  .eq(
                    "id",
                    id
                  )
                  .maybeSingle();

              if (lectureError) {
                throw lectureError;
              }

              if (lecture?.video_url) {

                await removeStorageFile(
                  "lecture-videos",
                  lecture.video_url
                );
              }

              if (lecture?.pdf_url) {

                await removeStorageFile(
                  "lecture-pdfs",
                  lecture.pdf_url
                );
              }

              const { error } =
                await supabaseClient
                  .from("lectures")
                  .delete()
                  .eq(
                    "id",
                    id
                  );

              if (error) {
                throw error;
              }

              showAdminMsg(
                "تم حذف المحاضرة."
              );

              await refreshAll();

            } catch (error) {

              console.error(error);

              showAdminMsg(
                "تعذر حذف المحاضرة: " +
                error.message,
                true
              );

              button.disabled = false;
            }
          }
        );
      }
    );
}


/* =========================================================
   LOAD COURSES
========================================================= */

async function loadCourses() {

  const { data, error } =
    await supabaseClient
      .from("courses")
      .select("*")
      .order(
        "academic_year",
        {
          ascending: true
        }
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

  if (coursesCount) {
    coursesCount.textContent =
      data?.length || 0;
  }

  renderCourses(
    data || []
  );

  populateCourseSelects(
    data || []
  );

  return data || [];
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

    container.innerHTML = `
      <div class="empty-state">
        لا توجد كورسات حتى الآن.
      </div>
    `;

    return;
  }

  container.innerHTML = "";

  courses.forEach(
    course => {

      const item =
        document.createElement(
          "div"
        );

      item.className =
        "admin-item";

      const image =
        course.image_url
          ? `
            <img
              src="${course.image_url}"
              alt=""
              class="course-admin-image"
            >
          `
          : "";

      item.innerHTML = `
        <div class="admin-item-info">

          ${image}

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
            الحالة:
            ${
              course.is_visible
                ? "ظاهر"
                : "مخفي"
            }
          </p>

        </div>

        <div class="admin-item-actions">

          <button
            type="button"
            class="btn secondary-btn toggle-course-btn"
            data-id="${course.id}"
            data-visible="${course.is_visible}"
          >
            ${
              course.is_visible
                ? "إخفاء"
                : "إظهار"
            }
          </button>

          <button
            type="button"
            class="btn danger-btn delete-course-btn"
            data-id="${course.id}"
          >
            حذف
          </button>

        </div>
      `;

      container.appendChild(
        item
      );
    }
  );

  container
    .querySelectorAll(
      ".toggle-course-btn"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          async () => {

            const id =
              button.dataset.id;

            const visible =
              button.dataset.visible ===
              "true";

            button.disabled = true;

            try {

              const { error } =
                await supabaseClient
                  .from("courses")
                  .update({
                    is_visible:
                      !visible
                  })
                  .eq(
                    "id",
                    id
                  );

              if (error) {
                throw error;
              }

              await refreshAll();

            } catch (error) {

              console.error(error);

              showAdminMsg(
                "تعذر تعديل حالة الكورس: " +
                error.message,
                true
              );

              button.disabled = false;
            }
          }
        );
      }
    );

  container
    .querySelectorAll(
      ".delete-course-btn"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          async () => {

            const id =
              button.dataset.id;

            if (!id) return;

            const confirmed =
              confirm(
                "هل أنت متأكد من حذف الكورس؟ سيتم حذف المحاضرات والامتحانات المرتبطة به."
              );

            if (!confirmed) {
              return;
            }

            button.disabled = true;

            try {

              const {
                data: course,
                error: courseError
              } =
                await supabaseClient
                  .from("courses")
                  .select(
                    "image_url"
                  )
                  .eq(
                    "id",
                    id
                  )
                  .maybeSingle();

              if (courseError) {
                throw courseError;
              }

              if (course?.image_url) {

                await removeStorageFile(
                  "course-images",
                  course.image_url
                );
              }

              await removeStorageFolder(
                "lecture-videos",
                id
              );

              const { error } =
                await supabaseClient
                  .from("courses")
                  .delete()
                  .eq(
                    "id",
                    id
                  );

              if (error) {
                throw error;
              }

              showAdminMsg(
                "تم حذف الكورس بنجاح."
              );

              await refreshAll();

            } catch (error) {

              console.error(error);

              showAdminMsg(
                "تعذر حذف الكورس: " +
                error.message,
                true
              );

              button.disabled = false;
            }
          }
        );
      }
    );
}


/* =========================================================
   COURSE SELECTS
========================================================= */

function populateCourseSelects(
  courses
) {

  const selects = [
    document.getElementById(
      "lectureCourse"
    ),
    document.getElementById(
      "accessCourse"
    )
  ];

  selects.forEach(
    select => {

      if (!select) return;

      const currentValue =
        select.value;

      select.innerHTML = `
        <option value="">
          اختر الكورس
        </option>
      `;

      courses.forEach(
        course => {

          const option =
            document.createElement(
              "option"
            );

          option.value =
            course.id;

          option.textContent =
            `${course.title} — السنة ${course.academic_year}`;

          select.appendChild(
            option
          );
        }
      );

      if (
        currentValue &&
        courses.some(
          course =>
            course.id ===
            currentValue
        )
      ) {
        select.value =
          currentValue;
      }
    }
  );
}


/* =========================================================
   ACCESS MANAGEMENT
========================================================= */

async function loadAccessLectures() {

  const courseId =
    document.getElementById(
      "accessCourse"
    )?.value;

  const lectureSelect =
    document.getElementById(
      "accessLecture"
    );

  if (!lectureSelect) {
    return;
  }

  lectureSelect.innerHTML = `
    <option value="">
      اختر المحاضرة
    </option>
  `;

  if (!courseId) {
    return;
  }

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
        `${lecture.lecture_order || 1}. ${lecture.title}`;

      lectureSelect.appendChild(
        option
      );
    }
  );
}


async function loadStudents() {

  const container =
    document.getElementById(
      "studentsList"
    );

  if (!container) {
    return;
  }

  const { data, error } =
    await supabaseClient
      .from("profiles")
      .select(
        "id,full_name,academic_year,role,created_at"
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  if (error) {

    console.error(error);

    return;
  }

  if (studentsCount) {
    studentsCount.textContent =
      data?.length || 0;
  }

  if (!data?.length) {

    container.innerHTML = `
      <div class="empty-state">
        لا يوجد طلاب حتى الآن.
      </div>
    `;

    return;
  }

  container.innerHTML = "";

  data.forEach(
    student => {

      const item =
        document.createElement(
          "div"
        );

      item.className =
        "admin-item";

      item.innerHTML = `
        <div class="admin-item-info">

          <h3>
            ${escapeHtml(
              student.full_name ||
              "بدون اسم"
            )}
          </h3>

          <p>
            السنة:
            ${student.academic_year || "-"}
          </p>

          <p>
            النوع:
            ${student.role || "student"}
          </p>

        </div>
      `;

      container.appendChild(
        item
      );
    }
  );
}


/* =========================================================
   COURSE REQUESTS
========================================================= */

async function loadCourseRequests() {

  const container =
    document.getElementById(
      "requestsList"
    );

  if (!container) {
    return;
  }

  const { data, error } =
    await supabaseClient
      .from("course_requests")
      .select(`
        *,
        profiles (
          full_name,
          academic_year
        ),
        courses (
          title
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

    return;
  }

  if (!data?.length) {

    container.innerHTML = `
      <div class="empty-state">
        لا توجد طلبات كورسات.
      </div>
    `;

    return;
  }

  container.innerHTML = "";

  data.forEach(
    request => {

      const item =
        document.createElement(
          "div"
        );

      item.className =
        "admin-item";

      item.innerHTML = `
        <div class="admin-item-info">

          <h3>
            ${escapeHtml(
              request.profiles?.full_name ||
              "طالب"
            )}
          </h3>

          <p>
            الكورس:
            ${escapeHtml(
              request.courses?.title ||
              "غير محدد"
            )}
          </p>

          <p>
            الحالة:
            ${escapeHtml(
              request.status ||
              "pending"
            )}
          </p>

        </div>

        <div class="admin-item-actions">

          ${
            request.status === "pending"
              ? `
                <button
                  type="button"
                  class="btn approve-request-btn"
                  data-id="${request.id}"
                >
                  قبول
                </button>

                <button
                  type="button"
                  class="btn danger-btn reject-request-btn"
                  data-id="${request.id}"
                >
                  رفض
                </button>
              `
              : ""
          }

        </div>
      `;

      container.appendChild(
        item
      );
    }
  );

  container
    .querySelectorAll(
      ".approve-request-btn"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          async () => {

            const id =
              button.dataset.id;

            try {

              const {
                data: request,
                error: requestError
              } =
                await supabaseClient
                  .from(
                    "course_requests"
                  )
                  .select(
                    "student_id,course_id"
                  )
                  .eq(
                    "id",
                    id
                  )
                  .maybeSingle();

              if (requestError) {
                throw requestError;
              }

              if (!request) {
                throw new Error(
                  "الطلب غير موجود."
                );
              }

              const {
                error: enrollmentError
              } =
                await supabaseClient
                  .from(
                    "enrollments"
                  )
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

              if (
                enrollmentError
              ) {
                throw enrollmentError;
              }

              const {
                error: statusError
              } =
                await supabaseClient
                  .from(
                    "course_requests"
                  )
                  .update({
                    status:
                      "approved"
                  })
                  .eq(
                    "id",
                    id
                  );

              if (statusError) {
                throw statusError;
              }

              showAdminMsg(
                "تم قبول الطلب."
              );

              await refreshAll();

            } catch (error) {

              console.error(error);

              showAdminMsg(
                "تعذر قبول الطلب: " +
                error.message,
                true
              );
            }
          }
        );
      }
    );

  container
    .querySelectorAll(
      ".reject-request-btn"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          async () => {

            const id =
              button.dataset.id;

            try {

              const { error } =
                await supabaseClient
                  .from(
                    "course_requests"
                  )
                  .update({
                    status:
                      "rejected"
                  })
                  .eq(
                    "id",
                    id
                  );

              if (error) {
                throw error;
              }

              showAdminMsg(
                "تم رفض الطلب."
              );

              await refreshAll();

            } catch (error) {

              console.error(error);

              showAdminMsg(
                "تعذر رفض الطلب: " +
                error.message,
                true
              );
            }
          }
        );
      }
    );
}


/* =========================================================
   GENERAL REFRESH
========================================================= */

async function refreshAll() {

  try {

    await Promise.all([
      loadCourses(),
      loadLectures(),
      loadExams(),
      loadStudents(),
      loadCourseRequests()
    ]);

  } catch (error) {

    console.error(
      "Refresh error:",
      error
    );
  }
}


/* =========================================================
   AUTH CHECK
========================================================= */

async function checkAdmin() {

  const {
    data: {
      session
    }
  } =
    await supabaseClient.auth.getSession();

  if (!session?.user) {

    location.href =
      "index.html";

    return false;
  }

  const {
    data: profile,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select("role")
      .eq(
        "id",
        session.user.id
      )
      .maybeSingle();

  if (
    error ||
    profile?.role !== "admin"
  ) {

    location.href =
      "student.html";

    return false;
  }

  return true;
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
        "index.html";
    }
  );
}


/* =========================================================
   INITIALIZE
========================================================= */

(async function initAdmin() {

  const isAdmin =
    await checkAdmin();

  if (!isAdmin) {
    return;
  }

  await refreshAll();

  const durationInput =
    document.getElementById(
      "examDuration"
    );

  if (
    durationInput &&
    !durationInput.value
  ) {
    durationInput.value = 30;
  }

  if (
    questionsBuilder &&
    !getQuestionCards().length
  ) {

    questionsBuilder.innerHTML =
      "";

    questionsBuilder.appendChild(
      createQuestionCard(0)
    );
  }

})();
   
