(() => {
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  // Smooth scroll for internal anchor links
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

  // Subtle parallax for background video
  if (!prefersReducedMotion) {
    let latest = 0;
    let ticking = false;

    const update = () => {
      ticking = false;
      document.documentElement.style.setProperty("--scroll-y", String(latest));
    };

    window.addEventListener(
      "scroll",
      () => {
        latest = window.scrollY || 0;
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true },
    );

    update();
  }

  // Reveal observer
  const revealEls = Array.from(document.querySelectorAll(".reveal"));
  const typeEls = Array.from(document.querySelectorAll("[data-type]"));

  const twStore = new WeakMap();

  const prepareTypewriter = (el) => {
    if (twStore.has(el)) return;
    const raw = (el.textContent ?? "").replace(/\s+/g, " ").trim();

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

    const durationMs = Math.min(4200, Math.max(1300, chars.length * 20));
    const stepMs = durationMs / chars.length;

    let start = null;
    let revealed = 0;

    const tick = (t) => {
      if (start === null) start = t;
      const elapsed = t - start;
      const shouldBe = Math.min(chars.length, Math.floor(elapsed / stepMs) + 1);

      while (revealed < shouldBe) {
        chars[revealed].classList.add("is-visible");
        revealed++;
      }

      if (revealed < chars.length) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  if (prefersReducedMotion) {
    for (const el of revealEls) el.classList.add("is-visible");
    for (const el of typeEls) {
      prepareTypewriter(el);
      playTypewriter(el);
    }
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target;
          if (target.classList.contains("reveal")) target.classList.add("is-visible");
          if (target.hasAttribute?.("data-type")) {
            prepareTypewriter(target);
            playTypewriter(target);
          }
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -12% 0px" },
    );

    for (const el of revealEls) io.observe(el);
    for (const el of typeEls) io.observe(el);
  }

  // Countdown timer: days | hours | minutes
  const cdDays = document.getElementById("cdDays");
  const cdHours = document.getElementById("cdHours");
  const cdMinutes = document.getElementById("cdMinutes");

  const renderCountdown = (diffMs) => {
    if (!cdDays || !cdHours || !cdMinutes) return;
    if (diffMs <= 0) {
      cdDays.textContent = "0";
      cdHours.textContent = "0";
      cdMinutes.textContent = "0";
      return;
    }

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    cdDays.textContent = String(days);
    cdHours.textContent = String(hours).padStart(2, "0");
    cdMinutes.textContent = String(minutes).padStart(2, "0");
  };

  const eventDate = new Date("2026-07-11T18:30:00+06:00"); // Almaty (+06)
  const tickCountdown = () => {
    const diff = eventDate.getTime() - Date.now();
    renderCountdown(diff);
  };

  tickCountdown();
  setInterval(tickCountdown, 1000);

  // Music toggle (optional)
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
        audio.currentTime = 0;
        isPlaying = false;
        setBtn(false);
        return;
      }

      audio.volume = 0.35;
      audio.loop = true;
      try {
        await audio.play();
        isPlaying = true;
        setBtn(true);
      } catch {
        isPlaying = false;
        setBtn(false);
        musicToggle.textContent = "Музыка: unavailable";
        musicToggle.disabled = true;
      }
    });
  }

  // Video fallback: if video asset missing, hide to avoid noisy errors.
  const heroVideo = document.getElementById("heroVideo");
  if (heroVideo) {
    heroVideo.addEventListener("error", () => {
      heroVideo.style.display = "none";
    });
  }
  const finalVideo = document.getElementById("finalVideo");
  if (finalVideo) {
    finalVideo.addEventListener("error", () => {
      finalVideo.style.display = "none";
    });
  }

  // RSVP: Supabase REST API (optional). If not configured -> localStorage fallback.
  // Configure (anon key only + RLS table) in the block below.
  const RSVP = {
    // Supabase:
    // supabaseUrl: "https://YOUR_PROJECT.supabase.co",
    // supabaseAnonKey: "YOUR_ANON_KEY",
    // table: "rsvp",
    supabaseUrl: "",
    supabaseAnonKey: "",
    table: "rsvp",
  };

  const form = document.getElementById("rsvpForm");
  const statusEl = document.getElementById("rsvpStatus");
  if (form && statusEl) {
    const setStatus = (text) => {
      statusEl.textContent = text;
    };

    const sanitizePhone = (v) => (v ?? "").toString().replace(/[^\d+]/g, "").trim();

    const isValidPhone = (v) => {
      const digits = (v ?? "").toString().replace(/\D/g, "");
      return digits.length >= 7;
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = document.getElementById("rsvpSubmit");
      const name = form.elements.namedItem("name")?.value?.trim() ?? "";
      const phoneRaw = form.elements.namedItem("phone")?.value ?? "";
      const phone = sanitizePhone(phoneRaw);
      const attend = form.elements.namedItem("attend")?.value ?? "";
      const peopleCount = form.elements.namedItem("peopleCount")?.value ?? "";

      if (!name) {
        setStatus("Атыңызды енгізіңіз.");
        return;
      }

      if (!isValidPhone(phone)) {
        setStatus("Телефонды дұрыс енгізіңіз.");
        return;
      }

      if (attend !== "yes" && attend !== "no") {
        setStatus("Жауапты таңдаңыз (Иә/Жоқ).");
        return;
      }

      const payload = {
        name,
        phone,
        attend, // "yes" | "no"
        people_count: peopleCount === "" ? null : Number(peopleCount),
        created_at: new Date().toISOString(),
      };

      try {
        if (submitBtn) submitBtn.disabled = true;
        setStatus("Жіберілуде...");

        // 1) Supabase insert if configured
        if (RSVP.supabaseUrl && RSVP.supabaseAnonKey) {
          const url = `${RSVP.supabaseUrl}/rest/v1/${RSVP.table}`;
          const res = await fetch(url, {
            method: "POST",
            headers: {
              apikey: RSVP.supabaseAnonKey,
              Authorization: `Bearer ${RSVP.supabaseAnonKey}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify([payload]),
          });
          if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
        } else {
          // 2) Local fallback (keeps user flow intact)
          const key = "uzatu_rsvp_queue";
          const prev = [];
          try {
            const current = localStorage.getItem(key);
            if (current) prev.push(...JSON.parse(current));
          } catch {
            // ignore
          }
          prev.push(payload);
          localStorage.setItem(key, JSON.stringify(prev));
        }

        setStatus("Рақмет! Сіздің жауабыңыз қабылданды");
        form.reset();
      } catch (err) {
        setStatus("Қате болды. Қайта жіберіп көріңіз.");
        if (submitBtn) submitBtn.disabled = false;
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
})();

