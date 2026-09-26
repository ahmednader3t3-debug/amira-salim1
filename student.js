const CONTACT_NUMBER="01068980363";
const WHATSAPP_NUMBER="201068980363";
async function init(){
 const {data:{user}}=await supabaseClient.auth.getUser();
 if(!user)return location.href="login.html";
 document.getElementById("welcome").textContent="أهلاً بك، "+(user.user_metadata?.full_name||user.email);
 const {data:courses,error}=await supabaseClient.from("courses").select("*").order("created_at",{ascending:false});
 const {data:enrollments}=await supabaseClient.from("enrollments").select("course_id").eq("student_id",user.id);
 const {data:requests}=await supabaseClient.from("course_requests").select("course_id,status").eq("student_id",user.id);
 const enrolled=new Set((enrollments||[]).map(x=>x.course_id));
 const requested=new Map((requests||[]).map(x=>[x.course_id,x.status]));
 const box=document.getElementById("studentCourses");
 if(error||!courses?.length){box.innerHTML='<div class="empty">لا توجد كورسات حاليًا.</div>';return}
 box.innerHTML=courses.map(c=>{
   const status=requested.get(c.id);
   let action="";
   if(enrolled.has(c.id)) action=c.video_url?`<a class="course-btn" target="_blank" href="${safeAttr(c.video_url)}">فتح المحاضرة</a>`:'<div class="approved">تم تفعيل الكورس لك.</div>';
   else if(status==="pending") action='<div class="pending">طلبك قيد المراجعة بعد التحويل.</div>';
   else if(status==="rejected") action=`<button class="course-btn" onclick="requestCourse('${c.id}')">إعادة طلب الكورس</button>`;
   else action=`<button class="course-btn" onclick="requestCourse('${c.id}')">الاشتراك في الكورس</button>`;
   return `<article class="course"><div class="course-icon">🩺</div><span class="tag">دورة تدريبية</span><h3>${safe(c.title)}</h3><p>${safe(c.description||"")}</p>${action}</article>`
 }).join("");
 document.getElementById("paymentInfo").innerHTML=`<b>طريقة الاشتراك:</b><br>حوّل قيمة الكورس إلى رقم التواصل <strong>${CONTACT_NUMBER}</strong>، وبعد التحويل اضغط زر الاشتراك في الكورس وأرسل رسالة تأكيد على واتساب. بعد مراجعة التحويل، سيتم تفعيل الكورس لك.`;
}
async function requestCourse(courseId){
 const {data:{user}}=await supabaseClient.auth.getUser();
 const {data:course}=await supabaseClient.from("courses").select("title").eq("id",courseId).single();
 const {error}=await supabaseClient.from("course_requests").upsert({student_id:user.id,course_id:courseId,status:"pending"},{onConflict:"student_id,course_id"});
 if(error){alert("حصلت مشكلة: "+error.message);return}
 const msg=encodeURIComponent(`مرحباً، أنا ${user.user_metadata?.full_name||user.email} وأريد الاشتراك في كورس: ${course?.title||""}. تم التحويل على رقم ${CONTACT_NUMBER}. حسابي في المنصة: ${user.email}.`);
 window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`,"_blank");
 alert("تم تسجيل طلبك. بعد مراجعة التحويل سيتم تفعيل الكورس لك.");
 init();
}
function safe(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function safeAttr(s){return safe(s).replace(/javascript:/gi,"")}
document.getElementById("logout").onclick=async()=>{await supabaseClient.auth.signOut();location.href="index.html"};init();
