// Dra. Zharick Tobar — Skin & Hair Clinic. Small, dependency-free interaction layer.
(function () {
  "use strict";

  // Promo bar (dismissible per browser tab; reappears on a fresh visit)
  var promoBar = document.querySelector("[data-promo-bar]");
  var promoClose = document.querySelector("[data-promo-close]");
  if (promoBar) {
    var promoDismissed = false;
    try { promoDismissed = sessionStorage.getItem("promoBarDismissed") === "1"; } catch (e) {}
    if (promoDismissed) { promoBar.remove(); }
  }
  if (promoClose && promoBar) {
    promoClose.addEventListener("click", function () {
      promoBar.remove();
      try { sessionStorage.setItem("promoBarDismissed", "1"); } catch (e) {}
    });
  }

  // Mobile menu
  var toggle = document.querySelector("[data-menu-toggle]");
  var closeBtn = document.querySelector("[data-menu-close]");
  var menu = document.querySelector("[data-mobile-menu]");
  if (toggle && menu) {
    toggle.addEventListener("click", function () { menu.classList.add("is-open"); });
  }
  if (closeBtn && menu) {
    closeBtn.addEventListener("click", function () { menu.classList.remove("is-open"); });
  }
  if (menu) {
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { menu.classList.remove("is-open"); });
    });
  }

  // Hide the floating WhatsApp button and FAQ chat launcher while the hero
  // (which has its own WhatsApp CTA) is on screen, so the corner never gets
  // crowded with duplicate/early affordances.
  var hero = document.querySelector(".hero");
  var floatCta = document.querySelector(".float-cta");
  var faqChatEl = document.querySelector("[data-faq-chat]");
  var floaters = [floatCta, faqChatEl].filter(Boolean);
  // Each floater fades in/out as a whole (opacity), but pointer-events is
  // toggled on its actual clickable surface, not the wrapper. .faq-chat is a
  // flex column that also contains the closed FAQ panel — invisible
  // (opacity:0 in CSS) but still taking up its full ~360x560px of layout
  // space above the fab. Setting `pointerEvents: "auto"` on that wrapper
  // (as this used to do) re-armed that whole invisible panel area as soon as
  // the hero scrolled out of view, so it silently ate taps meant for
  // whatever was scrolled underneath it — catalog cards, video reels, etc.
  // That, not the video files, was why taps near it looked dead on mobile.
  // Toggling pointer-events on the fab button alone keeps the widget
  // clickable without reintroducing that invisible hit box.
  var floaterHitTargets = floaters.map(function (el) {
    return el === faqChatEl ? el.querySelector(".faq-fab") || el : el;
  });
  if (hero && floaters.length && "IntersectionObserver" in window) {
    floaters.forEach(function (el) { el.style.opacity = "0"; });
    floaterHitTargets.forEach(function (el) { if (el) el.style.pointerEvents = "none"; });
    var heroObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var visible = !entry.isIntersecting;
          floaters.forEach(function (el) { el.style.opacity = visible ? "1" : "0"; });
          floaterHitTargets.forEach(function (el) {
            if (el) el.style.pointerEvents = visible ? "auto" : "none";
          });
        });
      },
      { threshold: 0.15 }
    );
    heroObserver.observe(hero);
  }

  // Hero carousel: autoplay + dot/arrow navigation, mandatory first-view
  // visual per the site's design brief. Respects reduced-motion (no
  // autoplay) and pauses on hover/focus/interaction.
  var carousel = document.querySelector("[data-carousel]");
  if (carousel) {
    var slides = Array.prototype.slice.call(carousel.querySelectorAll("[data-carousel-slide]"));
    var dots = Array.prototype.slice.call(carousel.querySelectorAll("[data-carousel-goto]"));
    var prevBtn = carousel.querySelector("[data-carousel-prev]");
    var nextBtn = carousel.querySelector("[data-carousel-next]");
    var current = slides.findIndex(function (s) { return s.classList.contains("is-active"); });
    if (current < 0) current = 0;
    var autoplayMs = 6000;
    var timer = null;
    var carouselReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var goTo = function (index) {
      var next = (index + slides.length) % slides.length;
      slides[current].classList.remove("is-active");
      dots[current] && dots[current].classList.remove("is-active");
      dots[current] && dots[current].setAttribute("aria-selected", "false");
      current = next;
      slides[current].classList.add("is-active");
      dots[current] && dots[current].classList.add("is-active");
      dots[current] && dots[current].setAttribute("aria-selected", "true");
    };

    var stopAutoplay = function () { if (timer) { clearInterval(timer); timer = null; } };
    var startAutoplay = function () {
      if (carouselReduceMotion || slides.length < 2) return;
      stopAutoplay();
      timer = setInterval(function () { goTo(current + 1); }, autoplayMs);
    };

    if (prevBtn) prevBtn.addEventListener("click", function () { goTo(current - 1); startAutoplay(); });
    if (nextBtn) nextBtn.addEventListener("click", function () { goTo(current + 1); startAutoplay(); });
    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () { goTo(i); startAutoplay(); });
    });
    carousel.addEventListener("mouseenter", stopAutoplay);
    carousel.addEventListener("mouseleave", startAutoplay);
    carousel.addEventListener("focusin", stopAutoplay);
    carousel.addEventListener("focusout", startAutoplay);

    startAutoplay();
  }

  // Pricing catalog tabs (mirrors the real site's own category-tab pattern)
  var catalogTabs = document.querySelectorAll(".catalog-tab");
  if (catalogTabs.length) {
    catalogTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var targetId = tab.getAttribute("data-tab-target");
        catalogTabs.forEach(function (t) {
          var active = t === tab;
          t.classList.toggle("is-active", active);
          t.setAttribute("aria-selected", active ? "true" : "false");
        });
        document.querySelectorAll(".catalog-panel").forEach(function (panel) {
          panel.classList.toggle("is-active", panel.id === targetId);
        });
      });
    });
  }

  // Reel cards: tap to play/pause the preview clip in place. Unmute BEFORE
  // calling play() (not after) — flipping `muted` while a play() request is
  // still pending is what makes some mobile browsers silently drop the
  // request, which looks exactly like "the video doesn't load."
  document.querySelectorAll(".reel").forEach(function (card) {
    var video = card.querySelector("video");
    if (!video) return;
    card.addEventListener("click", function () {
      if (video.paused) {
        card.classList.add("is-playing");
        video.muted = false;
        var playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(function () {
            // Some mobile browsers still refuse unmuted playback even from
            // a tap. Retry muted rather than leaving the tap looking dead.
            video.muted = true;
            video.play().catch(function () {});
          });
        }
      } else {
        video.pause();
        card.classList.remove("is-playing");
      }
    });
  });

  // FAQ chat widget: a static, rule-based accordion (no backend) that opens
  // from a floating icon and hands off to WhatsApp for anything else.
  var faqChat = document.querySelector("[data-faq-chat]");
  if (faqChat) {
    var faqToggle = faqChat.querySelector("[data-faq-toggle]");
    var faqClose = faqChat.querySelector("[data-faq-close]");
    var faqPanel = faqChat.querySelector("[data-faq-panel]");

    var setFaqOpen = function (open) {
      faqChat.classList.toggle("is-open", open);
      if (faqToggle) faqToggle.setAttribute("aria-expanded", open ? "true" : "false");
    };

    if (faqToggle) {
      faqToggle.addEventListener("click", function () {
        setFaqOpen(!faqChat.classList.contains("is-open"));
      });
    }
    if (faqClose) {
      faqClose.addEventListener("click", function () { setFaqOpen(false); });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setFaqOpen(false);
    });
    document.addEventListener("click", function (e) {
      if (faqChat.classList.contains("is-open") && !faqChat.contains(e.target)) {
        setFaqOpen(false);
      }
    });

    faqChat.querySelectorAll(".faq-item").forEach(function (item) {
      var q = item.querySelector(".faq-q");
      if (!q) return;
      q.addEventListener("click", function () {
        var willOpen = !item.classList.contains("is-open");
        faqChat.querySelectorAll(".faq-item.is-open").forEach(function (other) {
          if (other !== item) {
            other.classList.remove("is-open");
            other.querySelector(".faq-q").setAttribute("aria-expanded", "false");
          }
        });
        item.classList.toggle("is-open", willOpen);
        q.setAttribute("aria-expanded", willOpen ? "true" : "false");
      });
    });

    if (faqPanel) {
      faqPanel.addEventListener("click", function (e) { e.stopPropagation(); });
    }
  }

  // Manual light/dark theme toggle, layered on top of the OS-level
  // prefers-color-scheme default. A stored choice in localStorage wins over
  // the system setting (see the inline head script that applies it before
  // first paint); with no stored choice the site still follows the OS.
  var themeToggles = document.querySelectorAll("[data-theme-toggle]");
  if (themeToggles.length) {
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
    var isEnglish = document.documentElement.lang.indexOf("en") === 0;

    var currentTheme = function () {
      var explicit = document.documentElement.getAttribute("data-theme");
      if (explicit === "light" || explicit === "dark") return explicit;
      return prefersDark.matches ? "dark" : "light";
    };

    var applyLabels = function () {
      var isDark = currentTheme() === "dark";
      var label = isEnglish
        ? (isDark ? "Switch to light mode" : "Switch to dark mode")
        : (isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
      themeToggles.forEach(function (btn) { btn.setAttribute("aria-label", label); });
    };
    applyLabels();

    themeToggles.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = currentTheme() === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        try { localStorage.setItem("theme", next); } catch (e) {}
        applyLabels();
      });
    });

    if (prefersDark.addEventListener) {
      prefersDark.addEventListener("change", function () {
        if (!document.documentElement.getAttribute("data-theme")) applyLabels();
      });
    }
  }

  // Scroll reveal via IntersectionObserver (no scroll listeners)
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion && "IntersectionObserver" in window) {
    var revealEls = document.querySelectorAll("[data-reveal]");
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      el.classList.add("is-visible");
    });
  }
})();
