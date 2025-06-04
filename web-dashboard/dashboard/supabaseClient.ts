import { createClient } from "@supabase/supabase-js";

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ✅ 분석 결과 조회 함수
export const fetchLatestAnalysis = async (
  id: string,
  isGuest = false
): Promise<any> => {
  let query = supabase.from("gpt_results").select("*").eq("user_id", id);
  const { data, error } = await query
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
