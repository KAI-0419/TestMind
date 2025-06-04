const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.analyzeVideosWithGPT = async (videoIds, lang = "ko") => {
  const prompt = `- 유저가 좋아요 표시한 유튜브 영상 ID 목록입니다:\n${videoIds.join(", ")}\n\n이 목록을 기반으로 사용자의 성향, 성격 키워드, 요약, MBTI 유형 등을 ${lang === "en" ? "English" : "Korean"}으로 분석해주세요. 분석 결과는 다음 JSON 형식으로 출력해주세요:

{
  "summary": "...",
  "keywords": ["...", "..."],
  "personality": "...",
  "result": "...",
  "lowconfidence": true or false
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.choices[0].message.content;

  try {
    const parsed = JSON.parse(content);
    return {
      summary: parsed.summary || "",
      keywords: parsed.keywords || [],
      personality: parsed.personality || null,
      result: parsed.result || content,
      lowconfidence: !!parsed.lowconfidence,
    };
  } catch (err) {
    console.warn("⚠️ GPT 응답이 JSON이 아님. fallback 적용");
    return {
      summary: content.slice(0, 200),
      keywords: [],
      personality: null,
      result: content,
      lowconfidence: true,
    };
  }
};