(() => {
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  // Smooth scroll for anchor buttons
  document.addEventListener("click", (e) => {
    const a = e.target.closest?.("a[data-scroll]");
    if (!a) return;

    const href = a.getAttribute("href");
    if (!href || !href.startsWith("#")) return;

    const target = document.querySelector(href);
    if (!target) return;

    e.preventDefault();
    target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  });

  // Parallax background
  if (!prefersReducedMotion) {
    let latest = 0;
    let ticking = false;

    const update = () => {
      ticking = false;
      document.documentElement.style.setProperty("--scroll-y", String(latest));
    };

    window.addEventListener("scroll", () => {
      latest = window.scrollY || 0;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });

    // Initial value
    latest = window.scrollY || 0;
    document.documentElement.style.setProperty("--scroll-y", String(latest));
  }

  // Reveal + story progress
  const revealEls = Array.from(document.querySelectorAll(".reveal"));
  const storyItems = Array.from(document.querySelectorAll(".storyItem"));

  const typewriterEls = Array.from(document.querySelectorAll(".typewriter[data-type]"));

  // Prepare typewriter spans
  const twStore = new WeakMap();
  const prepareTypewriter = (el) => {
    if (twStore.has(el)) return;
    const raw = el.textContent?.replace(/\s+/g, " ").trimEnd() ?? "";

    // Replace content with spans per character (supports Kazakh Cyrillic)
    el.textContent = "";
    const frag = document.createDocumentFragment();
    const chars = [];

    for (const ch of raw) {
      const span = document.createElement("span");
      span.className = "char";
      span.setAttribute("aria-hidden", "true");
      if (ch === " ") {
        span.innerHTML = "&nbsp;";
      } else {
        span.textContent = ch;
      }
      frag.appendChild(span);
      chars.push(span);
    }

    el.appendChild(frag);
    twStore.set(el, { chars, typed: false });
  };

  const playTypewriter = (el) => {
    const store = twStore.get(el);
    if (!store || store.typed) return;
    store.typed = true;

    const { chars } = store;
    if (!chars.length) return;

    // Duration scales with text length, capped for premium feel
    const durationMs = Math.min(4200, Math.max(1400, chars.length * 22));
    const stepMs = durationMs / chars.length;

    let start = null;
    let revealed = 0;

    const tick = (t) => {
      if (start === null) start = t;
      const elapsed = t - start;
      const shouldBe = Math.min(chars.length, Math.floor(elapsed / stepMs) + 1);

      while (revealed < shouldBe) {
        const span = chars[revealed];
        span.classList.add("is-visible");
        revealed++;
      }

      if (revealed < chars.length) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  };

  // Prepare all typewriters upfront (fast & deterministic)
  for (const el of typewriterEls) prepareTypewriter(el);

  const markVisible = (entry) => {
    if (!entry.isIntersecting) return;

    const target = entry.target;
    if (target.classList.contains("reveal")) {
      target.classList.add("is-visible");
    }

    // Story dot fill state
    if (target.classList.contains("storyItem")) {
      target.classList.add("is-visible");
      const para = target.querySelector(".typewriter[data-type]");
      if (para) playTypewriter(para);
    } else {
      // For non-story reveal elements that might be typewriter
      const maybe = target.querySelector?.(".typewriter[data-type]");
      if (maybe) playTypewriter(maybe);
    }
  };

  if (prefersReducedMotion) {
    for (const el of revealEls) el.classList.add("is-visible");
    for (const item of storyItems) item.classList.add("is-visible");
    for (const el of typewriterEls) playTypewriter(el);
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) markVisible(entry);
      },
      { root: null, threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
    );

    for (const el of revealEls) io.observe(el);
    for (const item of storyItems) io.observe(item);
  }

  // Music toggle
  const audio = document.getElementById("bgAudio");
  const musicToggle = document.getElementById("musicToggle");
  if (audio && musicToggle) {
    let isPlaying = false;

    const setBtn = (on) => {
      musicToggle.setAttribute("aria-pressed", String(on));
      musicToggle.textContent = on ? "Музыка: On" : "Музыка: Off";
    };

    setBtn(false);

    musicToggle.addEventListener("click", async () => {
      if (isPlaying) {
        audio.pause();
        isPlaying = false;
        setBtn(false);
        return;
      }

      // Try play; if the file is missing, user still has graceful UI
      audio.volume = 0.35;
      audio.loop = true;
      try {
        await audio.play();
        isPlaying = true;
        setBtn(true);
      } catch {
        // If autoplay/play is blocked or asset missing:
        isPlaying = false;
        setBtn(false);
        musicToggle.textContent = "Музыка: жоқ/қолжетімсіз";
        musicToggle.disabled = true;
      }
    });
  }

  // Countdown timer (optional but enabled by default)
  const countdownEl = document.getElementById("countdown");
  if (countdownEl) {
    const eventDate = new Date("2026-07-11T18:30:00+06:00"); // Almaty time (+06)

    const pad2 = (n) => String(n).padStart(2, "0");

    const render = (diffMs) => {
      if (diffMs <= 0) {
        countdownEl.textContent = "Басталды";
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      countdownEl.textContent = `${days} күн  ${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
    };

    const tick = () => {
      const now = new Date();
      const diff = eventDate.getTime() - now.getTime();
      render(diff);
    };

    tick();
    setInterval(tick, 1000);
  }

  // Video fallback: if hero.mp4 missing, keep gradient-only background
  const bgVideo = document.getElementById("bgVideo");
  if (bgVideo) {
    const hideOnError = () => {
      bgVideo.style.display = "none";
    };
    bgVideo.addEventListener("error", hideOnError);
  }
})();

