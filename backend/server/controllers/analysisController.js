const { analyzeVideosWithGPT } = require("../services/gptService");
const {
  saveAnalysisResult,
  saveVideoList,
} = require("../utils/supabaseClient");
const { getLatestAnalysisFromDB } = require("../utils/supabaseClient"); // 🧠 supabase에서 함수 불러오기

exports.getLatestAnalysis = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: "Missing user_id" });
    }

    const latestResult = await getLatestAnalysisFromDB(user_id);

    if (!latestResult) {
      return res.status(404).json({ error: "분석 결과가 존재하지 않습니다." });
    }

    res.status(200).json({ result: latestResult });
  } catch (err) {
    console.error("❌ 분석 결과 조회 중 오류:", err);
    res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

exports.analyzeAndSave = async (req, res) => {
  try {
    const { videoIds, user_id, lang } = req.body;
    console.log("📨 요청 도착:", { user_id, lang, videoIds });

    if (!videoIds || !user_id || !Array.isArray(videoIds)) {
      return res.status(400).json({ error: "Missing or invalid parameters" });
    }

    const gptResult = await analyzeVideosWithGPT(videoIds, lang);
    console.log("✅ GPT 분석 결과:", gptResult);

    const saved = await saveAnalysisResult(
      user_id,
      lang,
      gptResult.summary,
      gptResult.keywords,
      gptResult.personality,
      gptResult.result,
      gptResult.lowconfidence
    );

    console.log("✅ 저장 성공:", saved);
    res.status(200).json({ message: "Analysis completed successfully", result: gptResult });

  } catch (err) {
    console.error("❌ 서버 처리 중 오류:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
};