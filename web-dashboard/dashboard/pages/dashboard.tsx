import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ReportCard from "../components/ReportCard";
import { fetchLatestAnalysis, supabase } from "../supabaseClient";

export type Analysis = {
  personality?: string;
  summary?: string;
  keywords?: string[] | string;
  result?:
    | string
    | {
        summary?: string;
        personality?: string;
        keywords?: string[] | string;
        result?: string;
      };
  lowconfidence?: boolean;
  lang?: string;
};

export function Dashboard({ analysis }: { analysis: Analysis | null }) {
  if (!analysis) {
    return <p className="text-gray-500">분석 결과가 없습니다.</p>;
  }

  const isKo = analysis.lang === "ko";
  const { lowconfidence } = analysis;

  // ✅ result 필드를 안전하게 파싱
  let parsed: {
    result?: string;
    summary?: string;
    personality?: string;
    keywords?: string[] | string;
  } = {
    result: "-",
    summary: "-",
    personality: "-",
    keywords: "-",
  };

  if (typeof analysis.result === "string") {
    parsed = {
      result: analysis.result,
      summary: analysis.summary,
      personality: analysis.personality,
      keywords: analysis.keywords,
    };
  } else if (typeof analysis.result === "object" && analysis.result !== null) {
    parsed = {
      result:
        typeof analysis.result.result === "string"
          ? analysis.result.result
          : "",
      summary: analysis.result.summary || analysis.summary,
      personality: analysis.result.personality || analysis.personality,
      keywords: analysis.result.keywords || analysis.keywords,
    };
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">📊 Mindtap 분석 리포트</h1>
      {lowconfidence && (
        <div className="bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 p-4 rounded-md mb-6">
          {isKo
            ? "🧘 좋아요 영상 수가 아직 충분하지 않아 분석 결과가 일반적일 수 있습니다."
            : "🧘 The number of liked videos is low, so the analysis may be general."}
        </div>
      )}
      <ReportCard
        title={isKo ? "1. 성격 분석" : "1. Personality"}
        content={parsed.personality || "-"}
      />
      <ReportCard
        title={isKo ? "2. 요약" : "2. Summary"}
        content={parsed.summary || "-"}
      />
      <ReportCard
        title={isKo ? "3. 주요 키워드" : "3. Keywords"}
        content={
          <ul className="list-disc pl-5 space-y-1">
            {(Array.isArray(parsed.keywords)
              ? parsed.keywords
              : [parsed.keywords || ""]
            ).map((k, i) => (
              <li key={i}>🔹 {k}</li>
            ))}
          </ul>
        }
      />
      <ReportCard
        title={isKo ? "4. GPT 원문 응답" : "4. GPT Full Response"}
        content={parsed.result || "-"}
      />
    </div>
  );
}

const DashboardPage = () => {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserAndData = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      const primaryId = user?.id || "";
      const latest = await fetchLatestAnalysis(primaryId);

      if (error || !user) {
        setUserId(null);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const result = await fetchLatestAnalysis(user.id);
      console.log("FRONT에서 받아온 분석결과:", result);

      if (result) {
        setAnalysis({
          personality: result.personality ?? "",
          summary: result.summary ?? "",
          keywords: result.keywords ?? [],
          result: result.result ?? "",
          lowconfidence: result.lowconfidence ?? false,
          lang: result.lang ?? "ko",
        });
      }
      setLoading(false);
    };

    loadUserAndData();
  }, []);

  if (loading) return <p className="text-center mt-10">로딩 중...</p>;

  if (!userId)
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-4">로그인이 필요합니다.</p>
        <Link to="/login">로그인 페이지로 이동</Link>
      </div>
    );

  return (
    <div className="p-4">
      <Dashboard analysis={analysis} />
    </div>
  );
};

export default DashboardPage;
