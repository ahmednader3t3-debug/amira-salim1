const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const msg = document.getElementById("msg");

function showMsg(text, error = false) {
  if (!msg) return;

  msg.textContent = text;
  msg.className = "msg " + (error ? "error" : "ok");
}


// =========================
// LOGIN
// =========================

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    showMsg("جاري تسجيل الدخول...");

    const email = document
      .getElementById("email")
      .value
      .trim();

    const password = document.getElementById("password").value;

    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      showMsg(
        "بيانات الدخول غير صحيحة أو الحساب غير مفعّل.",
        true
      );
      return;
    }

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.role === "admin") {
      location.href = "admin.html";
    } else {
      location.href = "student.html";
    }
  });
}


// =========================
// SIGN UP
// =========================

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    showMsg("جاري إنشاء الحساب...");

    const name = document
      .getElementById("name")
      .value
      .trim();

    const email = document
      .getElementById("email")
      .value
      .trim();

    const password =
      document.getElementById("password").value;

    const academicYear = Number(
      document.getElementById("academicYear").value
    );

    if (
      !name ||
      !email ||
      password.length < 6 ||
      ![1, 2, 3].includes(academicYear)
    ) {
      showMsg(
        "راجع الاسم والإيميل والباسورد والسنة الدراسية.",
        true
      );
      return;
    }

    const { error } = await supabaseClient.auth.signUp({
      email,
      password,

      options: {
        data: {
          full_name: name,
          academic_year: academicYear
        },

        emailRedirectTo:
          "https://ahmednader3t3-debug.github.io/amira-salim1/"
      }
    });

    if (error) {
      showMsg(error.message, true);
      return;
    }

    showMsg(
      "تم إنشاء الحساب. راجع بريدك الإلكتروني لتأكيد الحساب."
    );
  });
}
