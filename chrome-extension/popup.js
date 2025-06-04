const SERVER_URL = "http://localhost:5001/analyze";
const SUPABASE_URL = "https://ezignffwsoppghpxnbxp.supabase.co";
const LOCAL_DASHBOARD_URL = "http://localhost";

const messages = {
  en: {
    notSupportedLiked:
      "This extension can only be used on the <strong>'Liked Videos'</strong> page.<br>Please open the page on YouTube and try again!",
    none: "No liked videos found on this page.",
    mainTitle: "🧠 Mindtap",
    statusInit:
      "Mindtap analyzes your liked YouTube videos to uncover hidden patterns in your personality, preferences, and behavior.",
    startAnalysis: "🧠 Start Analysis",
    collecting: "📦 Collecting videos...",
    progress: "% completed",
    completed: "🎉 Analysis completed! Now analyzing your MBTI...",
    gptAnalyzing: "🧠 GPT is analyzing. Please wait...",
    noData: "❗ No video data to analyze.",
    doneTitle: "🎉 Analysis Completed!",
    doneSummary: "Your MBTI analysis is complete. Check the result below.",
    viewResult: "View Result",
    gptFailed: "❗ GPT analysis failed.",
    howItWorks: "ℹ️ How It Works",
    paused: "Resume",
    resumed: "Pause",
    keepResult:
      "Previous analysis result loaded. Refresh YouTube to analyze again.",
  },
  ko: {
    notSupportedLiked:
      "이 확장은 <strong>'좋아요 표시한 동영상'</strong> 페이지에서만 사용할 수 있어요.<br>유튜브에서 해당 페이지를 연 후 다시 시도해 주세요!",
    none: "아직 좋아요한 동영상이 없습니다.",
    mainTitle: "🧠 Mindtap",
    statusInit:
      "Mindtap은 당신이 좋아요를 누른 유튜브 영상들을 분석해 당신의 성격과 취향 속 숨겨진 패턴을 찾아냅니다.",
    startAnalysis: "🧠 분석 시작하기",
    collecting: "📦 영상 수집 중이에요...",
    progress: "% 완료",
    completed: "🎉 영상 수집이 완료되었습니다! 이제 MBTI 분석을 시작합니다...",
    gptAnalyzing: "🧠 GPT가 분석 중입니다. 잠시만 기다려주세요...",
    noData: "❗ 분석할 영상 데이터가 없습니다.",
    doneTitle: "🎉 분석 완료!",
    doneSummary: "당신의 MBTI 분석이 완료되었어요. 결과를 확인해보세요.",
    viewResult: "결과 보기",
    gptFailed: "❗ GPT 분석에 실패했습니다.",
    howItWorks: "ℹ️ 서비스 소개",
    paused: "이어하기",
    resumed: "일시정지",
    keepResult:
      "이전 분석 결과가 있습니다. YouTube를 새로고침하면 재분석 가능합니다.",
  },
};

const userLang = navigator.language || navigator.userLanguage || "en";
const lang = userLang.startsWith("ko") ? "ko" : "en";
const t = messages[lang];

let elements = {};
let progressSnapshot = { percent: 0, timeLeft: 0 };
let state = { analyzing: false, paused: false, gptAnalyzed: false };
let userId = null;

function generateGuestId() {
  const id =
    "guest_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("user_id", id);
  const cookieConfig = {
    name: "guest_id",
    value: id,
    expirationDate: Date.now() / 1000 + 60 * 60 * 24 * 365,
    sameSite: "no_restriction",
  };
  chrome.cookies.set({ ...cookieConfig, url: SUPABASE_URL });
  chrome.cookies.set({ ...cookieConfig, url: LOCAL_DASHBOARD_URL });
  return id;
}

async function getUserId() {
  const savedId = localStorage.getItem("user_id");
  if (savedId) {
    userId = savedId;
  } else {
    let cookie = await chrome.cookies.get({ url: SUPABASE_URL, name: "guest_id" });
    if (!cookie || !cookie.value) {
      cookie = await chrome.cookies.get({ url: LOCAL_DASHBOARD_URL, name: "guest_id" });
    }
    if (cookie && cookie.value) {
      userId = cookie.value;
      localStorage.setItem("user_id", userId);
    } else {
      userId = generateGuestId();
    }
  }
  console.log("📌 사용자 ID:", userId);
}

function cacheElements() {
  elements = {
    mainTitle: document.getElementById("mainTitle"),
    statusText: document.getElementById("statusText"),
    startBtn: document.getElementById("start"),
    mainUI: document.getElementById("main-ui"),
    unsupported: document.getElementById("unsupported"),
    notSupportedText: document.getElementById("notSupportedText"),
    progressBar: document.getElementById("progressBar"),
    progressLabel: document.getElementById("progressLabel"),
    loading: document.getElementById("loading"),
    resultDiv: document.getElementById("result"),
  };
}

function initializeUI() {
  elements.mainTitle.textContent = t.mainTitle;
  elements.statusText.textContent = t.statusInit;
  elements.startBtn.textContent = t.startAnalysis;
}

function saveAnalysisState() {
  chrome.storage.local.set({ analysisState: state, progressSnapshot });
}

function loadAnalysisState(callback) {
  chrome.storage.local.get(["analysisState", "progressSnapshot"], (data) => {
    if (data.analysisState) Object.assign(state, data.analysisState);
    if (data.progressSnapshot) progressSnapshot = data.progressSnapshot;
    if (callback) callback();
  });
}

function showResult(gptResult) {
  elements.resultDiv.style.display = "block";
  elements.resultDiv.innerHTML = "";

  const titleElem = document.createElement("h2");
  titleElem.textContent = t.doneTitle;
  elements.resultDiv.appendChild(titleElem);

  const contentElem = document.createElement("p");
  contentElem.style.textAlign = "left";
  contentElem.style.whiteSpace = "pre-line";

  let resultObj = gptResult;
  if (
    resultObj &&
    typeof resultObj === "object" &&
    resultObj.result &&
    typeof resultObj.result === "object"
  ) {
    resultObj = resultObj.result;
  }

  if (typeof resultObj === "object" && resultObj !== null) {
    contentElem.textContent =
      `📌 Summary:\n${resultObj.summary || "-"}\n\n` +
      `🧠 Personality:\n${resultObj.personality || "-"}\n\n` +
      `🔑 Keywords:\n${
        Array.isArray(resultObj.keywords) ? resultObj.keywords.join(", ") : "-"
      }\n\n` +
      `🧩 Result:\n${resultObj.result || "-"}`;
  } else if (typeof resultObj === "string") {
    contentElem.textContent = resultObj;
  } else {
    contentElem.textContent = t.gptFailed;
  }
  elements.resultDiv.appendChild(contentElem);

  elements.loading.textContent = "";
  elements.startBtn.style.display = "none";
  elements.progressBar.style.width = "100%";
  elements.progressLabel.textContent = "100" + t.progress;
  elements.statusText.textContent = t.keepResult;
}

function handleProgressUpdate(msg) {
  const percent = typeof msg.percent === "number" ? msg.percent : 0;
  progressSnapshot.percent = percent;
  progressSnapshot.timeLeft = msg.timeLeft || 0;
  elements.progressBar.style.width = percent + "%";
  elements.progressLabel.textContent = percent.toFixed(1) + t.progress;
  saveAnalysisState();
  if (msg.isComplete || percent >= 100) completeAnalysis();
  else updateEstimatedTime(msg.timeLeft || 0);
}

function updateEstimatedTime(timeLeft) {
  const min = Math.floor(timeLeft / 60);
  const sec = Math.round(timeLeft % 60);
  const timeStr =
    timeLeft >= 60
      ? lang === "ko"
        ? `예상 소요: ${min}분 ${sec}초`
        : `Estimated time: ${min}m ${sec}s`
      : lang === "ko"
      ? `예상 소요: ${sec}초`
      : `Estimated time: ${sec}s`;
  elements.statusText.textContent = timeStr;
}

function completeAnalysis() {
  elements.statusText.textContent = t.completed;
  elements.startBtn.style.display = "none";
  state.analyzing = false;
  state.paused = false;
  saveAnalysisState();
  if (!state.gptAnalyzed) {
    state.gptAnalyzed = true;
    saveAnalysisState();
    elements.loading.textContent = t.gptAnalyzing;
    elements.resultDiv.style.display = "none";
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "getScrapedVideos" },
        processVideos
      );
    });
  }
}

async function sendToServer(videoList) {
  try {
    const videoIds = videoList
      .map((v) => {
        const url = v.videoUrl || v.href || "";
        const match = url.match(
          /(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/
        );
        return match ? match[1] : null;
      })
      .filter(Boolean);

    const headers = { "Content-Type": "application/json" };
    if (userId.startsWith("guest_")) headers["X-Guest-Id"] = userId;

    const response = await fetch(SERVER_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ user_id: userId, videoIds, lang }),
    });

    if (!response.ok) throw new Error("Server error");
    return await response.json();
  } catch (err) {
    console.error("❌ Backend 전송 실패:", err);
    return null;
  }
}

let alreadySent = false;

function processVideos(response) {
  if (alreadySent) return;
  alreadySent = true;

  const videos = response?.videos || [];
  if (!videos.length) {
    elements.statusText.textContent = t.noData;
    return;
  }

  elements.loading.textContent = t.gptAnalyzing;
  sendToServer(videos).then((result) => {
    chrome.storage.local.set({ mbtiResult: result }, () => showResult(result));
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  await getUserId();
  cacheElements();

  elements.mainUI.style.display = "none";
  elements.unsupported.style.display = "none";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0].url;
    if (!url || !url.includes("playlist?list=LL")) {
      elements.unsupported.style.display = "block";
      elements.notSupportedText.innerHTML = t.notSupportedLiked;
      return;
    }

    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: "checkHasVideos" },
      (res2) => {
        if (
          chrome.runtime.lastError ||
          !res2 ||
          res2.error === "not-liked-videos-page"
        ) {
          elements.unsupported.style.display = "block";
          elements.notSupportedText.innerHTML = t.notSupportedLiked;
          return;
        }

        if (res2?.error === "no_liked_videos") {
          elements.unsupported.style.display = "block";
          elements.notSupportedText.innerHTML = t.none;
          return;
        }

        elements.mainUI.style.display = "block";
        initializeUI();

        loadAnalysisState(() => {
          chrome.storage.local.get("mbtiResult", (data) => {
            if (data.mbtiResult) {
              showResult(data.mbtiResult);
              return;
            }

            if (state.analyzing) {
              elements.startBtn.textContent = state.paused
                ? t.paused
                : t.resumed;
              elements.statusText.textContent = state.paused
                ? lang === "ko"
                  ? "일시정지됨"
                  : "Paused"
                : t.collecting;
              elements.startBtn.style.display = "";
              elements.resultDiv.style.display = "none";
              elements.progressBar.style.width = progressSnapshot.percent + "%";
              elements.progressLabel.textContent =
                progressSnapshot.percent.toFixed(1) + t.progress;
              if (progressSnapshot.percent < 100 && progressSnapshot.timeLeft)
                updateEstimatedTime(progressSnapshot.timeLeft);
            } else {
              initializeUI();
              elements.resultDiv.style.display = "none";
              elements.progressBar.style.width = "0%";
              elements.progressLabel.textContent = "";
            }
          });
        });
      }
    );
  });

  elements.startBtn.addEventListener("click", () => {
    if (!state.analyzing) {
      chrome.storage.local.remove(
        ["mbtiResult", "analysisState", "progressSnapshot"],
        () => {
          state = { analyzing: true, paused: false, gptAnalyzed: false };
          progressSnapshot = { percent: 0, timeLeft: 0 };
          saveAnalysisState();
          elements.startBtn.textContent = t.resumed;
          elements.statusText.textContent = t.collecting;
          elements.resultDiv.style.display = "none";
          elements.loading.textContent = "";
          elements.progressBar.style.width = "0%";
          elements.progressLabel.textContent = "";
          chrome.runtime.sendMessage({ action: "resetAnalysis" }, () => {
            chrome.runtime.sendMessage({ action: "startAnalysis" });
          });
        }
      );
    } else {
      state.paused = !state.paused;
      saveAnalysisState();
      elements.startBtn.textContent = state.paused ? t.paused : t.resumed;
      elements.statusText.textContent = state.paused
        ? lang === "ko"
          ? "일시정지됨"
          : "Paused"
        : t.collecting;
      chrome.runtime.sendMessage({
        action: state.paused ? "pauseAnalysis" : "startAnalysis",
      });
    }
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "updateProgress") handleProgressUpdate(msg);
    if (msg.action === "getScrapedVideos") processVideos(msg);
  });
});
