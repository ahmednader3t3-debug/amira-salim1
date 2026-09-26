const examLoading =
  document.getElementById("examLoading");

const examContent =
  document.getElementById("examContent");

const examError =
  document.getElementById("examError");

const examErrorText =
  document.getElementById("examErrorText");

const examTitle =
  document.getElementById("examTitle");

const examDescription =
  document.getElementById("examDescription");

const lectureTitle =
  document.getElementById("lectureTitle");

const maxScore =
  document.getElementById("maxScore");

const questionsContainer =
  document.getElementById("questionsContainer");

const examForm =
  document.getElementById("examForm");

const submitExamBtn =
  document.getElementById("submitExamBtn");

const resultContent =
  document.getElementById("resultContent");

const resultScore =
  document.getElementById("resultScore");

const resultMaxScore =
  document.getElementById("resultMaxScore");

const resultPercentage =
  document.getElementById("resultPercentage");

const resultMessage =
  document.getElementById("resultMessage");

const themeBtn =
  document.getElementById("themeBtn");


const params =
  new URLSearchParams(window.location.search);

const examId =
  params.get("id");

let currentUser = null;
let currentExam = null;
let currentQuestions = [];


// =====================================
// Dark Mode
// =====================================

function applyTheme() {

  const theme =
    localStorage.getItem("theme");

  document.body.classList.toggle(
    "dark",
    theme === "dark"
  );
}

applyTheme();


if (themeBtn) {

  themeBtn.addEventListener("click", () => {

    document.body.classList.toggle("dark");

    localStorage.setItem(
      "theme",
      document.body.classList.contains("dark")
        ? "dark"
        : "light"
    );

  });

}


// =====================================
// إظهار الخطأ
// =====================================

function showError(message) {

  examLoading.style.display = "none";

  examContent.style.display = "none";

  resultContent.style.display = "none";

  examError.style.display = "block";

  examErrorText.textContent = message;
}


// =====================================
// المستخدم الحالي
// =====================================

async function getCurrentUser() {

  const {
    data,
    error
  } = await supabaseClient.auth.getUser();

  if (error || !data.user) {

    location.href = "login.html";

    return null;
  }

  return data.user;
}


// =====================================
// التأكد هل الطالب حل الاختبار قبل كده
// =====================================

async function getPreviousResult() {

  const {
    data,
    error
  } = await supabaseClient
    .from("exam_results")
    .select(
      "id, score, submitted_at, feedback"
    )
    .eq("exam_id", examId)
    .eq("student_id", currentUser.id)
    .maybeSingle();

  if (error) {

    console.error(error);

    return null;
  }

  return data;
}


// =====================================
// تحميل الاختبار
// =====================================

async function loadExam() {

  if (!examId) {

    showError(
      "رابط الاختبار غير صحيح."
    );

    return;
  }


  currentUser =
    await getCurrentUser();

  if (!currentUser) return;


  const previousResult =
    await getPreviousResult();


  if (previousResult) {

    showPreviousResult(
      previousResult
    );

    return;
  }


  const {
    data: exam,
    error: examErrorResult
  } =
    await supabaseClient
      .from("lecture_exams")
      .select(`
        id,
        title,
        description,
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


  if (examErrorResult) {

    console.error(examErrorResult);

    showError(
      "حدث خطأ أثناء تحميل بيانات الاختبار."
    );

    return;
  }


  if (!exam) {

    showError(
      "الاختبار غير موجود أو غير متاح."
    );

    return;
  }


  currentExam = exam;


  const {
    data: questions,
    error: questionsError
  } =
    await supabaseClient
      .from("exam_questions")
      .select(`
        id,
        question_text,
        question_order,
        exam_options (
          id,
          option_text,
          option_order
        )
      `)
      .eq("exam_id", examId)
      .order("question_order", {
        ascending: true
      });


  if (questionsError) {

    console.error(questionsError);

    showError(
      "حدث خطأ أثناء تحميل أسئلة الاختبار."
    );

    return;
  }


  if (!questions || !questions.length) {

    showError(
      "لم تتم إضافة أسئلة لهذا الاختبار بعد."
    );

    return;
  }


  currentQuestions =
    questions;


  renderExam();
}


// =====================================
// عرض الاختبار
// =====================================

function renderExam() {

  examTitle.textContent =
    currentExam.title || "اختبار";

  examDescription.textContent =
    currentExam.description || "";

  lectureTitle.textContent =
    currentExam.lectures?.title || "—";

  maxScore.textContent =
    currentExam.max_score;


  questionsContainer.innerHTML =
    currentQuestions.map(
      (question, index) => `

        <div class="question-card">

          <div class="question-number">
            السؤال ${index + 1}
          </div>

          <h3>
            ${escapeHtml(
              question.question_text
            )}
          </h3>

          <div class="options-list">

            ${
              question.exam_options
                .sort(
                  (a, b) =>
                    a.option_order -
                    b.option_order
                )
                .map(
                  option => `

                    <label class="exam-option">

                      <input
                        type="radio"
                        name="question_${question.id}"
                        value="${option.id}"
                        required
                      >

                      <span>
                        ${escapeHtml(
                          option.option_text
                        )}
                      </span>

                    </label>

                  `
                )
                .join("")
            }

          </div>

        </div>

      `
    )
    .join("");


  examLoading.style.display = "none";

  examError.style.display = "none";

  examContent.style.display = "block";
}


// =====================================
// إرسال الاختبار
// =====================================

examForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    if (
      !currentUser ||
      !currentExam ||
      !currentQuestions.length
    ) {
      return;
    }


    const confirmed =
      confirm(
        "هل أنت متأكد من إرسال الاختبار؟ لن تتمكن من إرساله مرة أخرى."
      );


    if (!confirmed) {
      return;
    }


    submitExamBtn.disabled = true;

    submitExamBtn.textContent =
      "جاري التصحيح...";


    // التأكد مرة أخيرة من عدم وجود نتيجة سابقة

    const previousResult =
      await getPreviousResult();


    if (previousResult) {

      showPreviousResult(
        previousResult
      );

      return;
    }


    // تحميل الإجابات الصحيحة

    const questionIds =
      currentQuestions.map(
        question => question.id
      );


    const {
      data: correctOptions,
      error
    } =
      await supabaseClient
        .from("exam_options")
        .select(
          "id, question_id, is_correct"
        )
        .in(
          "question_id",
          questionIds
        );


    if (error) {

      console.error(error);

      alert(
        "حدث خطأ أثناء تصحيح الاختبار."
      );

      submitExamBtn.disabled = false;

      submitExamBtn.textContent =
        "إرسال الاختبار";

      return;
    }


    // حساب عدد الإجابات الصحيحة

    let correctCount = 0;


    currentQuestions.forEach(
      question => {

        const selected =
          document.querySelector(
            `input[name="question_${question.id}"]:checked`
          );


        if (!selected) {
          return;
        }


        const correct =
          correctOptions.find(
            option =>
              option.question_id ===
                question.id &&
              option.is_correct === true
          );


        if (
          correct &&
          correct.id === selected.value
        ) {

          correctCount++;

        }

      }
    );


    const totalQuestions =
      currentQuestions.length;


    const maxScore =
      Number(currentExam.max_score);


    const score =
      totalQuestions > 0
        ? (correctCount / totalQuestions) *
          maxScore
        : 0;


    const roundedScore =
      Math.round(score * 100) / 100;


    // حفظ النتيجة

    const {
      error: insertError
    } =
      await supabaseClient
        .from("exam_results")
        .insert({

          exam_id: currentExam.id,

          student_id: currentUser.id,

          score: roundedScore,

          feedback:
            `أجبت ${correctCount} من ${totalQuestions} إجابة صحيحة.`

        });


    if (insertError) {

      console.error(insertError);

      alert(
        "حدث خطأ أثناء حفظ النتيجة."
      );

      submitExamBtn.disabled = false;

      submitExamBtn.textContent =
        "إرسال الاختبار";

      return;
    }


    showResult(
      roundedScore,
      maxScore,
      correctCount,
      totalQuestions
    );

  }
);


// =====================================
// عرض النتيجة
// =====================================

function showResult(
  score,
  maxScore,
  correctCount,
  totalQuestions
) {

  const percentage =
    maxScore > 0
      ? Math.round(
          (score / maxScore) * 100
        )
      : 0;


  resultScore.textContent =
    score;

  resultMaxScore.textContent =
    maxScore;

  resultPercentage.textContent =
    `${percentage}%`;


  resultMessage.textContent =
    `إجابات صحيحة: ${correctCount} من ${totalQuestions}`;


  examContent.style.display = "none";

  examError.style.display = "none";

  resultContent.style.display = "block";
}


// =====================================
// عرض نتيجة سابقة
// =====================================

function showPreviousResult(result) {

  const score =
    Number(result.score || 0);

  const maxScore =
    Number(
      currentExam?.max_score || 0
    );


  resultScore.textContent =
    score;

  resultMaxScore.textContent =
    maxScore;


  const percentage =
    maxScore > 0
      ? Math.round(
          (score / maxScore) * 100
        )
      : 0;


  resultPercentage.textContent =
    `${percentage}%`;


  resultMessage.textContent =
    "لقد سبق لك إرسال هذا الاختبار.";


  examLoading.style.display = "none";

  examContent.style.display = "none";

  examError.style.display = "none";

  resultContent.style.display = "block";
}


// =====================================
// حماية النصوص
// =====================================

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// =====================================
// تشغيل
// =====================================

loadExam();
