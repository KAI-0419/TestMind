const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const getLatestAnalysisFromDB = async (user_id) => {
  const { data, error } = await supabase
    .from("gpt_results")
    .select("*")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false })
    .limit(1)

  console.log("📥 getLatestAnalysisFromDB 결과:", { data, error });

  if (error) {
    return null;
  }

  return data;
};

const saveAnalysisResult = async (
  user_id,
  lang,
  summary,
  keywords,
  personality,
  result,
  lowconfidence
) => {
  const payload = {
    user_id,
    lang,
    summary: summary || "",
    keywords: Array.isArray(keywords) ? keywords : [],
    personality: personality || null,
    result: result || null,
    lowconfidence: !!lowconfidence,
  };

  console.log("🟡 insert payload:", payload);

  const { data, error } = await supabase
  .from("gpt_results")
  .upsert(payload, { returning: "representation" });

  console.log("📤 GPT_results insert 결과:", { data, error });

  if (error) {
    console.error("❌ 분석 중 오류:", JSON.stringify(error, null, 2));
    throw new Error(
      "Supabase 분석 결과 저장 실패: " +
        (error.message || JSON.stringify(error))
    );
  }

  return data;
};

const saveVideoList = async (
  user_id,
  lang,
  summary,
  keywords,
  personality,
  result,
  lowconfidence
) => {
  const { data, error } = await supabase
    .from("videos")
    .insert([
      { user_id, lang, summary, keywords, personality, result, lowconfidence },
    ]);

  console.log("🟡 insert payload:", {
    user_id,
    lang,
    summary,
    keywords,
    personality,
    result,
    lowconfidence,
  });

  console.log("📥 videos insert 결과:", { data, error });

  if (error) {
    throw new Error(
      "Supabase 영상 저장 실패: " + (error.message || JSON.stringify(error))
    );
  }
};

const mergeGuestRows = async (guestId, uuid) => {
  const { error } = await supabase
    .from("gpt_results")
    .update({ user_id: uuid })
    .eq("user_id", guestId);
  if (error) {
    throw new Error(
      "Supabase merge failed: " + (error.message || JSON.stringify(error))
    );
  }
  return true;
};

module.exports = {
  saveAnalysisResult,
  saveVideoList,
  getLatestAnalysisFromDB,
  mergeGuestRows,
};
