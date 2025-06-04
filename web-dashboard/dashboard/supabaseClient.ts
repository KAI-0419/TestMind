import { createClient } from "@supabase/supabase-js";

const FALLBACK_URL = "https://ezignffwsoppghpxnbxp.supabase.co";
const FALLBACK_KEY = "anon_key_placeholder";

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const splitUserIds = (id: string) => {
  if (!id) return { user_id: null, guest_id: null };
  return id.startsWith("guest_")
    ? { user_id: null, guest_id: id }
    : { user_id: id, guest_id: null };
};

// ✅ 분석 결과 조회 함수
export const fetchLatestAnalysis = async (
  id: string,
  isGuest = false
): Promise<any> => {
  try {
    const res = await fetch(`http://localhost:5001/analyze?user_id=${id}`);
    if (res.ok) {
      const { result } = await res.json();
      if (result) return result;
    }
  } catch (err) {
    console.warn("backend fetch failed", err);
  }

  const { user_id, guest_id } = splitUserIds(id);
  const column = user_id ? "user_id" : "guest_id";
  const value = user_id || guest_id;
  const { data, error } = await supabase
    .from("gpt_results")
    .select("*")
    .eq(column, value)
    .order("created_at", { ascending: false })
    .limit(1);

  if ((!data || !data.length) && !isGuest) {
    const guestId = localStorage.getItem("user_id");
    if (guestId) return fetchLatestAnalysis(guestId, true);
  }

  if (error) console.error(error);
  return data?.[0] || null;
};


export { supabase };
