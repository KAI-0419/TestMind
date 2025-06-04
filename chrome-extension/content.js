(() => {
  if (window.__YTA_INJECTED__) return;
  window.__YTA_INJECTED__ = true;

  const userLang = navigator.language || navigator.userLanguage;
  const lang = userLang.startsWith("ko") ? "ko" : "en";

  let paused = false,
    scrollInterval = null,
    collectedVideos = [],
    prevCount = 0,
    stillCount = 0;
  let startedAt = null,
    totalVideosTarget = 10000,
    sampleStartCount = 0,
    sampleStartTime = 0,
    avgTimePerVideo = 0.05;
  let sampleInitialized = false,
    lastScrollPos = 0,
    consecutiveScrollFailures = 0,
    lastProgressSentAt = 0;
  const maxNoChangeTries = 5,
    maxScrollFailures = 3;

  function getLikedVideosTotalCount() {
    const statsElem = document.querySelector('#stats .style-scope.ytd-playlist-sidebar-primary-info-renderer');
    if (!statsElem) return null;
    const text = statsElem.innerText || statsElem.textContent || '';
    const match = text.replace(/,/g,'').match(/(\d+)[^\d]*(개|videos?)/i);
    return match ? parseInt(match[1], 10) : null;
  }

  function isOnLikedVideosPage() {
    return (
      window.location.pathname === "/playlist" &&
      window.location.search.includes("list=LL")
    );
  }

  function getCurrentTabName() {
    const chip = document.querySelector(
      'yt-chip-cloud-chip-renderer[aria-selected="true"], yt-chip-cloud-chip-renderer.iron-selected'
    );
    if (!chip) return "";
    const btn = chip.querySelector('button[aria-selected="true"], button');
    return btn ? btn.textContent?.trim() : chip.textContent?.trim();
  }

  function getAllVideoElements() {
    return Array.from(document.querySelectorAll("ytd-playlist-video-renderer"))
      .map((el) => {
        const a = el.querySelector("a#thumbnail");
        const title =
          el.querySelector("#video-title")?.textContent?.trim() || "No Title";
        const channel =
          el.querySelector("#channel-name")?.innerText?.trim() || null;
        if (!a || !a.href) return null;
        const type = a.href.includes("/shorts/") ? "shorts" : "video";
        return { title, href: a.href, channel, type };
      })
      .filter(Boolean);
  }

  function getShortsTabVideos() {
    return Array.from(document.querySelectorAll("ytd-rich-item-renderer"))
      .map((el) => {
        const a = el.querySelector('a[href^="/shorts/"]');
        if (!a) return null;
        const title =
          a.getAttribute("title") ||
          el.querySelector('span[role="text"]')?.textContent?.trim() ||
          a.textContent?.trim() ||
          "No Title";
        return { title, href: a.href, channel: null, type: "shorts" };
      })
      .filter(Boolean);
  }

  function getNoTabVideosSmart() {
    const videoEls = document.querySelectorAll("ytd-playlist-video-renderer");
    if (!videoEls.length) return [];
    let shortsCount = 0,
      normalCount = 0;
    const videos = [];
    videoEls.forEach((el) => {
      const a = el.querySelector("a#thumbnail");
      if (!a || !a.href) return;
      const title =
        el.querySelector("#video-title")?.textContent?.trim() || "No Title";
      const channel =
        el.querySelector("#channel-name")?.innerText?.trim() || null;
      if (a.href.includes("/shorts/")) {
        shortsCount++;
        videos.push({ title, href: a.href, channel, type: "shorts" });
      } else {
        normalCount++;
        videos.push({ title, href: a.href, channel, type: "video" });
      }
    });
    if (shortsCount && shortsCount === videos.length) {
      const shortsVideos = getShortsTabVideos();
      return shortsVideos.length ? shortsVideos : videos;
    }
    return videos;
  }

  function isTabPresent() {
    return document.querySelectorAll("yt-chip-cloud-chip-renderer").length > 0;
  }

  function collectVideosAuto() {
  if (!isOnLikedVideosPage()) return [];

  if (isTabPresent()) {
    const tabName = getCurrentTabName().toLowerCase();
    if (tabName.includes("shorts")) return getShortsTabVideos();
    return getAllVideoElements();
  }

  // ✅ 탭이 없고 Shorts만 있는 경우에도 확실히 수집
  const fallback = getNoTabVideosSmart();
  if (fallback.length > 0) return fallback;

  // ✅ Shorts 단독 fallback 시도
  const shortsOnly = getShortsTabVideos();
  return shortsOnly;
}

  function handleCompletion() {
    if (scrollInterval) clearTimeout(scrollInterval);
    scrollInterval = null;
    chrome.runtime.sendMessage({
      action: "updateProgress",
      percent: 100,
      remaining: 0,
      timeLeft: 0,
      collected: collectedVideos.length,
      total: Math.min(totalVideosTarget, collectedVideos.length),
      isComplete: true,
    });

    chrome.runtime.sendMessage({
        action: "getScrapedTitles",
        titles: collectedVideos.map(v => v.title),
      });

    setTimeout(() => {
      console.log(
        "✅ Collection completed: " +
          collectedVideos.length +
          (totalVideosTarget ? " / " + totalVideosTarget : "")
      );
    }, 100);
  }

  window.addEventListener('beforeunload', () => {
    chrome.storage.local.remove(['mbtiResult', 'analysisState', 'progressSnapshot']);
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "resetAnalysis") {
      paused = false;
      if (scrollInterval) clearTimeout(scrollInterval);
      scrollInterval = null;
      collectedVideos = [];
      prevCount = 0;
      stillCount = 0;
      startedAt = null;
      sampleStartCount = 0;
      sampleStartTime = 0;
      avgTimePerVideo = 0.05;
      sampleInitialized = false;
      lastScrollPos = 0;
      consecutiveScrollFailures = 0;
      lastProgressSentAt = 0;
      sendResponse?.({ ok: true });
      return true;
    }
    if (request.action === "checkHasVideos") {
      if (!isOnLikedVideosPage()) {
        sendResponse?.({ error: "not-liked-videos-page" });
        return true;
      }
      const videos = collectVideosAuto();
      if (videos.length === 0) {
        sendResponse?.({ error: "no_liked_videos" });
      } else {
        sendResponse?.({ ok: true });
      }
      return true;
    }
    if (request.action === "pauseAnalysis") {
      paused = true;
      if (scrollInterval) {
        clearTimeout(scrollInterval);
        scrollInterval = null;
      }
      sendResponse?.({ ok: true });
      return true;
    }
    if (request.action === "startAnalysis") {
      if (!isOnLikedVideosPage()) {
        sendResponse?.({ error: "not-liked-videos-page" });
        return true;
      }
      if (paused) {
        paused = false;
        startScrollAndScrape();
        sendResponse?.({ ok: true });
        return true;
      }
      const videos = collectVideosAuto();
      if (videos.length === 0) {
        sendResponse?.({ error: "no_liked_videos" });
        return true;
      }
      if (!scrollInterval) {
        paused = false;
        startScrollAndScrape();
      }
      sendResponse?.({ ok: true });
      return true;
    }
    if (request.action === "getScrapedVideos") {
      const videos = collectedVideos.map((v) => ({
        title: v.title,
        videoUrl: v.href,
        channelName: v.channel || "Unknown",
      }));
      console.log("수집된 영상 데이터: ", videos);
      sendResponse({ videos });
      return true;
    }
  });

  function startScrollAndScrape() {
    // 분석 시작 전 총 좋아요 영상 수 자동 세팅
    const detectedTotal = getLikedVideosTotalCount();
    if (detectedTotal && detectedTotal > 0) totalVideosTarget = detectedTotal;

    collectedVideos = [];
    prevCount = 0;
    stillCount = 0;
    startedAt = Date.now();
    sampleStartCount = 0;
    sampleStartTime = 0;
    avgTimePerVideo = 0.5;
    sampleInitialized = false;
    lastScrollPos = 0;
    consecutiveScrollFailures = 0;
    lastProgressSentAt = 0;

    function collectLoop() {
      if (paused) {
        if (scrollInterval) clearTimeout(scrollInterval);
        scrollInterval = null;
        return;
      }
      let videoList = collectVideosAuto();
      let nowCount = videoList.length;
      collectedVideos = videoList;

      if (collectedVideos.length > totalVideosTarget)
        totalVideosTarget = collectedVideos.length;

      let percent = Math.min(
        100,
        Math.round((collectedVideos.length / totalVideosTarget) * 100)
      );
      let remainVideos = Math.max(
        0,
        totalVideosTarget - collectedVideos.length
      );
      let elapsed = (Date.now() - startedAt) / 1000;
      if (!sampleInitialized && (collectedVideos.length >= 30 || elapsed > 8)) {
        sampleStartCount = collectedVideos.length;
        sampleStartTime = elapsed;
        if (sampleStartCount > 0) {
          avgTimePerVideo = sampleStartTime / sampleStartCount;
          avgTimePerVideo = Math.min(Math.max(avgTimePerVideo, 0.2), 0.8);
        }
        sampleInitialized = true;
      }
      let estSeconds = sampleInitialized
        ? Math.max(1, Math.round(remainVideos * avgTimePerVideo))
        : Math.min(300, Math.round(remainVideos * 0.5));
      estSeconds = Math.min(estSeconds, 600);

      const now = Date.now();
      if (now - lastProgressSentAt > 100) {
        let percent = Math.min(
          100,
          (collectedVideos.length / totalVideosTarget) * 100
        );
        percent = Math.round(percent * 10) / 10;
        chrome.runtime.sendMessage({
          action: "updateProgress",
          percent,
          remaining: remainVideos,
          timeLeft: estSeconds,
          collected: collectedVideos.length,
          total: totalVideosTarget,
        });
        lastProgressSentAt = now;
      }

      if (nowCount === prevCount) {
        stillCount++;
      } else {
        stillCount = 0;
        prevCount = nowCount;
      }
      const isComplete =
        collectedVideos.length >= totalVideosTarget ||
        (stillCount >= maxNoChangeTries && collectedVideos.length > 0);

      if (!isComplete && !paused) {
        smartScroll();
        let scrollDelay;
        if (collectedVideos.length > 800) scrollDelay = 400;
        else if (collectedVideos.length > 500) scrollDelay = 600;
        else if (collectedVideos.length > 300) scrollDelay = 800;
        else scrollDelay = 1000;
        scrollInterval = setTimeout(collectLoop, scrollDelay);
      } else {
        handleCompletion();
      }
    }
    collectLoop();
  }

  function smartScroll() {
    const currentPos = window.scrollY;
    const pageHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    const remainingDistance = pageHeight - (currentPos + viewportHeight);
    if (remainingDistance < viewportHeight) {
      window.scrollBy(0, viewportHeight * 0.8);
    } else if (remainingDistance < viewportHeight * 3) {
      window.scrollBy(0, viewportHeight * 6);
    } else if (remainingDistance < viewportHeight * 6) {
      window.scrollBy(0, viewportHeight * 12);
    } else {
      window.scrollBy(0, viewportHeight * 20);
    }
    if (isScrollStuck()) {
      consecutiveScrollFailures++;
      if (consecutiveScrollFailures >= maxScrollFailures) {
        window.scrollTo(0, currentPos + viewportHeight * 5);
        consecutiveScrollFailures = 0;
      }
    } else {
      consecutiveScrollFailures = 0;
    }
  }

  function isScrollStuck() {
    const currentPos = window.scrollY;
    const isStuck = currentPos === lastScrollPos;
    lastScrollPos = currentPos;
    return isStuck;
  }
})();