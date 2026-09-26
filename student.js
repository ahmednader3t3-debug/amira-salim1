<!doctype html>
<html lang="ar" dir="rtl">

<head>

<meta charset="utf-8">

<meta name="viewport"
      content="width=device-width,initial-scale=1">

<title>لوحة الطالب | أميرة سليم</title>

<link rel="stylesheet" href="style.css">

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

</head>


<body>


<header class="header">

  <div class="container nav">

    <!-- LOGO -->
    <a class="brand" href="student.html">

      <span class="logo">
        AS
      </span>

      <span>
        <b>أميرة سليم</b>
        <small>NURSING ACADEMY</small>
      </span>

    </a>


    <div>

      <button
        id="logout"
        class="btn small">

        تسجيل الخروج

      </button>

    </div>

  </div>

</header>


<main class="section">

<div class="container">


<!-- HEADER -->

<div class="dashboard-head">

  <span class="eyebrow">
    لوحة الطالب
  </span>

  <h1 id="welcome">
    أهلاً بك
  </h1>

  <p>
    تابع كورساتك وواجباتك وامتحاناتك ودرجاتك من مكان واحد.
  </p>

</div>


<!-- STATS -->

<div class="dashboard-stats">


  <div class="dashboard-stat">

    <span>📚</span>

    <b id="coursesCount">
      0
    </b>

    <small>
      الكورسات
    </small>

  </div>


  <div class="dashboard-stat">

    <span>📝</span>

    <b id="assignmentsCount">
      0
    </b>

    <small>
      الواجبات
    </small>

  </div>


  <div class="dashboard-stat">

    <span>🧪</span>

    <b id="examsCount">
      0
    </b>

    <small>
      الامتحانات
    </small>

  </div>


  <div class="dashboard-stat">

    <span>📊</span>

    <b id="gradesCount">
      0
    </b>

    <small>
      الدرجات
    </small>

  </div>


</div>


<!-- PAYMENT -->

<div
  id="paymentInfo"
  class="payment-box">
</div>


<!-- COURSES -->

<section class="dashboard-section">

  <div class="dashboard-title">

    <div>

      <span class="eyebrow">
        EDUCATION
      </span>

      <h2>
        كورساتي
      </h2>

    </div>

  </div>


  <div
    id="studentCourses"
    class="grid">

  </div>

</section>


<!-- ASSIGNMENTS -->

<section class="dashboard-section">

  <div class="dashboard-title">

    <div>

      <span class="eyebrow">
        TASKS
      </span>

      <h2>
        الواجبات
      </h2>

    </div>

  </div>


  <div
    id="assignmentsList"
    class="dashboard-list">

    <div class="loading">
      جاري تحميل الواجبات...
    </div>

  </div>

</section>


<!-- EXAMS -->

<section class="dashboard-section">

  <div class="dashboard-title">

    <div>

      <span class="eyebrow">
        EXAMS
      </span>

      <h2>
        الامتحانات
      </h2>

    </div>

  </div>


  <div
    id="examsList"
    class="dashboard-list">

    <div class="loading">
      جاري تحميل الامتحانات...
    </div>

  </div>

</section>


<!-- GRADES -->

<section class="dashboard-section">

  <div class="dashboard-title">

    <div>

      <span class="eyebrow">
        RESULTS
      </span>

      <h2>
        درجاتي
      </h2>

    </div>

  </div>


  <div
    id="gradesList"
    class="dashboard-list">

    <div class="loading">
      جاري تحميل الدرجات...
    </div>

  </div>

</section>


<!-- NOTIFICATIONS -->

<section class="dashboard-section">

  <div class="dashboard-title">

    <div>

      <span class="eyebrow">
        NOTIFICATIONS
      </span>

      <h2>
        الإشعارات
      </h2>

    </div>

  </div>


  <div
    id="notificationsList"
    class="dashboard-list">

    <div class="loading">
      جاري تحميل الإشعارات...
    </div>

  </div>

</section>


</div>

</main>


<script src="config.js"></script>

<script src="student.js"></script>


</body>

</html>
