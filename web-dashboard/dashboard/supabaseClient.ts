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
// supabaseClient.ts
export const fetchLatestAnalysis = async (id: string, isGuest = false): Promise<any> => {
  let query = supabase.from("gpt_results").select("*").eq("user_id", id);
  // guest_id 로 시작하면 public 테이블에 당연히 있음
  // 로그인 사용자는 일반 uuid
  const { data, error } = await query.order("created_at", { ascending: false }).limit(1);
  if (!data?.length && !isGuest) {
      // 👉 guest-id로도 검색
      const guestId = localStorage.getItem("user_id");
      if (guestId) return fetchLatestAnalysis(guestId, true);
  }
  if (error) console.error(error);
  return data?.[0] || null;
};


export { supabase };
