async function guard(){const {data:{user}}=await supabaseClient.auth.getUser();if(!user)return location.href="login.html";const {data:p,error}=await supabaseClient.from("profiles").select("role").eq("id",user.id).single();if(error||p?.role!=="admin"){document.getElementById("adminMsg").textContent="هذا الحساب ليس حساب مدير.";document.querySelector("main").innerHTML=document.querySelector("main").innerHTML+'<p><a href="student.html">العودة للوحة الطالب</a></p>';return}loadCourses();loadUsers();loadRequests()}
async function loadCourses(){const {data}=await supabaseClient.from("courses").select("*").order("created_at",{ascending:false});document.getElementById("adminCourses").innerHTML=(data||[]).map(c=>`<div class="admin-row"><span><b>${escapeHtml(c.title)}</b><small>${escapeHtml(c.description||"")}</small></span><button onclick="removeCourse('${c.id}')">حذف</button></div>`).join("")||"لا يوجد كورسات."}
async function loadUsers(){const {data}=await supabaseClient.from("profiles").select("*").order("created_at",{ascending:false});document.getElementById("users").innerHTML=(data||[]).map(u=>`<div class="admin-row"><span><b>${escapeHtml(u.full_name||"بدون اسم")}</b><small>${escapeHtml(u.email||"")}</small></span><select onchange="setRole('${u.id}',this.value)"><option value="student" ${u.role==="student"?"selected":""}>طالب</option><option value="admin" ${u.role==="admin"?"selected":""}>مدير</option></select></div>`).join("")}
async function loadRequests(){
 const {data,error}=await supabaseClient.from("course_requests").select("id,status,created_at,profiles(full_name,email),courses(title)").order("created_at",{ascending:false});
 const box=document.getElementById("requests");
 if(error){box.innerHTML='<div class="empty">شغّل تحديث قاعدة البيانات الموجود في supabase.sql أولاً.</div>';return}
 box.innerHTML=(data||[]).map(r=>`<div class="admin-row request-row"><span><b>${escapeHtml(r.profiles?.full_name||"بدون اسم")}</b><small>الحساب: ${escapeHtml(r.profiles?.email||"")} — الكورس: ${escapeHtml(r.courses?.title||"")} — ${new Date(r.created_at).toLocaleString("ar-EG")}</small></span><span class="request-actions"><strong class="status ${r.status}">${r.status==="pending"?"قيد المراجعة":r.status==="approved"?"مفعّل":"مرفوض"}</strong>${r.status!=="approved"?`<button class="approve" onclick="approveRequest('${r.id}')">تفعيل</button>`:""}${r.status!=="rejected"?`<button onclick="rejectRequest('${r.id}')">رفض</button>`:""}</span></div>`).join("")||'<div class="empty">لا توجد طلبات اشتراك.</div>';
}
async function approveRequest(id){
 const {data:r,error}=await supabaseClient.from("course_requests").select("student_id,course_id").eq("id",id).single();if(error)return alert(error.message);
 const {error:enrollError}=await supabaseClient.from("enrollments").upsert({student_id:r.student_id,course_id:r.course_id},{onConflict:"student_id,course_id"});
 if(enrollError)return alert(enrollError.message);
 await supabaseClient.from("course_requests").update({status:"approved"}).eq("id",id);loadRequests();
}
async function rejectRequest(id){await supabaseClient.from("course_requests").update({status:"rejected"}).eq("id",id);loadRequests()}
document.getElementById("courseForm").onsubmit=async e=>{e.preventDefault();const {error}=await supabaseClient.from("courses").insert({title:title.value,description:description.value,video_url:video_url.value||null});document.getElementById("adminMsg").textContent=error?error.message:"تمت إضافة الكورس.";if(!error){e.target.reset();loadCourses()}}
async function removeCourse(id){if(!confirm("حذف الكورس؟"))return;await supabaseClient.from("courses").delete().eq("id",id);loadCourses()}
async function setRole(id,role){await supabaseClient.from("profiles").update({role}).eq("id",id)}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
document.getElementById("logout").onclick=async()=>{await supabaseClient.auth.signOut();location.href="index.html"};guard();
