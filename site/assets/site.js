/*
 * site.js — unstick Webflow IX2 scroll-into-view reveals.
 *
 * IX2 writes an initial translateY (often 85%+) before the scroll trigger.
 * On short viewports that moves the element off-screen, so SCROLL_INTO_VIEW
 * never fires and content stays at opacity:0. When a target's layout box
 * (ignoring transform) is near the viewport, force the end visual state.
 */
(function () {
  "use strict";

  var revealed = typeof WeakSet !== "undefined" ? new WeakSet() : null;

  function layoutRect(el) {
    var prevTransform = el.style.transform;
    var prevWebkit = el.style.webkitTransform;
    el.style.transform = "none";
    el.style.webkitTransform = "none";
    var rect = el.getBoundingClientRect();
    el.style.transform = prevTransform;
    el.style.webkitTransform = prevWebkit;
    return rect;
  }

  function nearViewport(rect) {
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    var margin = vh * 0.35;
    return rect.top < vh + margin && rect.bottom > -margin;
  }

  // Home work-list hover previews are CSS-driven (IX2 hover data missing).
  // Hero flip is handled by completeHeroEntrance() instead of a blunt reveal.
  function shouldSkip(el) {
    if (!el || !el.closest) return true;
    return Boolean(
      el.closest(
        ".hero-rotate-base, .hero-rotate-image, .hero-rotate-item, .list-image, .list-image-height, .home-work-cms .work-list-item",
      ),
    );
  }

  var heroDone = false;

  /**
   * About-page hero starts at opacity:0 / translateY(85%) — IX2 often
   * never fires SCROLL_INTO_VIEW because the element is pushed off-screen.
   * Replay the intended end state as a fallback.
   * Homepage hero (.homeimage) is left alone — IX2 handles its flip natively.
   */
  function completeHeroEntrance() {
    if (heroDone) return;

    var end =
      "translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
    var ease = "cubic-bezier(0.16, 1, 0.3, 1)";

    function play(el, delayMs) {
      if (!el) return;
      el.style.transition =
        "opacity 0.5s ease, transform 1.8s " + ease + " " + delayMs + "ms";
      void el.offsetWidth;
      el.style.setProperty("opacity", "1", "important");
      el.style.setProperty("transform", end, "important");
      el.style.setProperty("-webkit-transform", end, "important");
    }

    var imgs = document.querySelectorAll(".hero-rotate-image:not(.homeimage)");
    if (!imgs.length) {
      heroDone = true;
      return;
    }

    var anyRevealed = false;
    Array.prototype.forEach.call(imgs, function (img) {
      var opacity = parseFloat(window.getComputedStyle(img).opacity);
      if (opacity > 0.95 && translateY(img) <= 8) return;
      if (!nearViewport(layoutRect(img))) return;
      anyRevealed = true;
      play(img, 0);
      play(img.querySelector(".hero-rotate-item"), 200);
    });

    if (anyRevealed) heroDone = true;
  }

  function reveal(el) {
    if (shouldSkip(el)) return;
    if (revealed) {
      if (revealed.has(el)) return;
      revealed.add(el);
    }

    el.style.transition =
      "opacity 0.45s ease, transform 1.4s cubic-bezier(0.16, 1, 0.3, 1)";
    // !important so IX2 inline tweens cannot pull opacity back to 0.
    el.style.setProperty("opacity", "1", "important");
    el.style.setProperty(
      "transform",
      "translate3d(0px, 0px, 0px) scale3d(1, 1, 1)",
      "important",
    );
    el.style.setProperty(
      "-webkit-transform",
      "translate3d(0px, 0px, 0px) scale3d(1, 1, 1)",
      "important",
    );
  }

  function targetsFromIx2() {
    var out = [];
    var Webflow = window.Webflow;
    if (!Webflow || typeof Webflow.require !== "function") return out;

    var ix2;
    try {
      ix2 = Webflow.require("ix2");
    } catch (err) {
      return out;
    }
    if (!ix2 || !ix2.store) return out;

    var state = ix2.store.getState();
    var events = (state.ixData && state.ixData.events) || {};
    var pageId = document.documentElement.getAttribute("data-wf-page");

    Object.keys(events).forEach(function (key) {
      var ev = events[key];
      if (!ev || ev.eventTypeId !== "SCROLL_INTO_VIEW") return;
      var targetId = ev.target && ev.target.id;
      if (!targetId || targetId.indexOf("|") === -1) return;
      var parts = targetId.split("|");
      if (pageId && parts[0] !== pageId) return;
      // CMS/list items reuse one data-w-id — reveal every match.
      var matches = document.querySelectorAll('[data-w-id="' + parts[1] + '"]');
      Array.prototype.forEach.call(matches, function (el) {
        out.push(el);
      });
    });

    return out;
  }

  function translateY(el) {
    var t = window.getComputedStyle(el).transform;
    if (!t || t === "none") return 0;
    var m = t.match(/^matrix\((.+)\)$/);
    if (m) {
      var parts = m[1].split(",");
      return Math.abs(parseFloat(parts[5]) || 0);
    }
    var m3 = t.match(/^matrix3d\((.+)\)$/);
    if (m3) {
      var p3 = m3[1].split(",");
      return Math.abs(parseFloat(p3[13]) || 0);
    }
    return 0;
  }

  function isStuck(el) {
    var opacity = parseFloat(window.getComputedStyle(el).opacity);
    // IX2 often stalls mid-tween at low opacity, OR leaves letters
    // at opacity:1 with a large translateY inside overflow:hidden clips.
    if (opacity < 0.95) return true;
    return translateY(el) > 8;
  }

  function revealLetters(root) {
    var letters = root.querySelectorAll(
      '.row-title-text [class*="letter-"], [split-text] [class*="letter-"], .loader-step-one [class*="letter-"], .loader-step-two [class*="letter-"]',
    );
    var idx = 0;
    Array.prototype.forEach.call(letters, function (letter) {
      if (translateY(letter) <= 8) return;
      var delay = idx * 120;
      idx += 1;
      letter.style.transition =
        "transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) " + delay + "ms";
      letter.style.setProperty(
        "transform",
        "translate3d(0px, 0px, 0px) scale3d(1, 1, 1)",
        "important",
      );
      letter.style.setProperty(
        "-webkit-transform",
        "translate3d(0px, 0px, 0px) scale3d(1, 1, 1)",
        "important",
      );
    });
  }

  function scan() {
    var seen = typeof WeakSet !== "undefined" ? new WeakSet() : null;
    var els = targetsFromIx2();
    Array.prototype.forEach.call(
      document.querySelectorAll(
        "a.work-card-item[data-w-id], .row-title-block, .home-hero-intro, .loader-step-one, .loader-step-two",
      ),
      function (el) {
        els.push(el);
      },
    );

    els.forEach(function (el) {
      if (seen) {
        if (seen.has(el)) return;
        seen.add(el);
      }
      if (shouldSkip(el)) return;
      if (!nearViewport(layoutRect(el))) return;
      if (isStuck(el)) reveal(el);
      // Always try to unstick clipped letter spans in this section.
      revealLetters(el);
    });

    // Catch letter spans whose parent wasn't an IX2 target.
    Array.prototype.forEach.call(
      document.querySelectorAll(".row-title-block, .home-hero-intro"),
      function (block) {
        if (!nearViewport(layoutRect(block))) return;
        revealLetters(block);
      },
    );
  }

  function start() {
    var intro = document.querySelector(".home-hero-intro");
    if (intro) intro.style.zIndex = "1";

    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      if (tries >= 2) completeHeroEntrance();
      if (tries >= 4) scan();
      if (tries >= 50) window.clearInterval(timer);
    }, 120);

    window.addEventListener(
      "scroll",
      function () {
        scan();
      },
      { passive: true },
    );
    window.addEventListener("resize", scan);
  }

  if (window.Webflow && typeof window.Webflow.push === "function") {
    window.Webflow.push(start);
  } else if (document.readyState === "complete") {
    start();
  } else {
    window.addEventListener("load", start);
  }

  // Contact form → CMS /api/contact (URL from data-contact-api on the form)
  function bindContactForm() {
    var form = document.querySelector("form[data-contact-api]");
    if (!form || form.getAttribute("data-contact-bound") === "1") return;
    form.setAttribute("data-contact-bound", "1");

    var api = form.getAttribute("data-contact-api");
    if (!api) return;

    var submitBtn = form.querySelector('[type="submit"]');
    var status = document.createElement("div");
    status.setAttribute("role", "status");
    status.style.cssText =
      "margin-top:1rem;font-size:0.875rem;line-height:1.4;display:none";
    form.appendChild(status);

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var texts = form.querySelectorAll('input[type="text"]');
      var emailInput = form.querySelector('input[type="email"]');
      var messageInput = form.querySelector("textarea");

      var payload = {
        first_name: texts[0] ? String(texts[0].value || "").trim() : "",
        last_name: texts[1] ? String(texts[1].value || "").trim() : "",
        email: emailInput ? String(emailInput.value || "").trim() : "",
        message: messageInput ? String(messageInput.value || "").trim() : "",
        website: "", // honeypot
      };

      status.style.display = "block";
      status.style.color = "#fff";
      status.textContent = "Sending…";
      if (submitBtn) submitBtn.disabled = true;

      fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok && data && data.ok, error: data && data.error };
          });
        })
        .then(function (result) {
          if (result.ok) {
            status.textContent = "Thanks — I’ll be in touch within 24 hours.";
            form.reset();
          } else {
            status.textContent =
              result.error || "Something went wrong. Please try again.";
          }
        })
        .catch(function () {
          status.textContent =
            "Couldn't reach the server. Please try again in a moment.";
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindContactForm);
  } else {
    bindContactForm();
  }
})();
