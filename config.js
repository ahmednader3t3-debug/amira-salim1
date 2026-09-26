const SUPABASE_URL = "https://neszadjpuihphuokdchc.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_IxTvOCk4q6DPz6e8hVUB1g_-_U_Kd-N";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const CONTACT_NUMBER = "01065461397";
const WHATSAPP_NUMBER = "201065461397";

const WHATSAPP_MESSAGE =
  "السلام عليكم د. أميرة سليم، أريد الاستفسار عن الكورسات.";

function whatsappUrl(extraMessage = "") {
  const message = extraMessage
    ? `${WHATSAPP_MESSAGE}\n${extraMessage}`
    : WHATSAPP_MESSAGE;

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
