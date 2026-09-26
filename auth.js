const loginForm=document.getElementById("loginForm"),signupForm=document.getElementById("signupForm"),msg=document.getElementById("msg");
function showMsg(t,error=false){if(msg){msg.textContent=t;msg.className="msg "+(error?"error":"ok")}}
if(loginForm) loginForm.addEventListener("submit",async e=>{e.preventDefault();showMsg("جاري تسجيل الدخول...");const {data,error}=await supabaseClient.auth.signInWithPassword({email:email.value,password:password.value});if(error)return showMsg("بيانات الدخول غير صحيحة أو الحساب غير مفعّل.",true);location.href="student.html";});
if(signupForm) signupForm.addEventListener("submit",async e=>{
  e.preventDefault();

  showMsg("جاري إنشاء الحساب...");

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const name = document.getElementById("name").value;

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name
      },
      emailRedirectTo: "https://ahmednader3t3-debug.github.io/amira-salim1/"
    }
  });

  if(error) return showMsg(error.message, true);

  showMsg("تم إنشاء الحساب. راجع بريدك الإلكتروني لتأكيد الحساب.");
});
