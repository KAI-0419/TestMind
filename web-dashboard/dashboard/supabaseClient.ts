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

const API_URL = "http://localhost:5001/analyze";

// ✅ 분석 결과 조회 함수
// supabaseClient.ts
export const fetchLatestAnalysis = async (
  id: string,
  isGuest = false
): Promise<any> => {
  try {
    const res = await fetch(`${API_URL}?user_id=${encodeURIComponent(id)}`);
    if (!res.ok) {
      if (!isGuest) {
        const guestId = localStorage.getItem("user_id");
        if (guestId) return fetchLatestAnalysis(guestId, true);
      }
      return null;
    }
    const { result } = await res.json();
    return Array.isArray(result) ? result[0] : result;
  } catch (err) {
    console.error(err);
    return null;
  }
};


export { supabase };
