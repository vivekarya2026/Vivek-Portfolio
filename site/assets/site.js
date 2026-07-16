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

  function reveal(el) {
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

    var item = el.querySelector(".hero-rotate-item");
    if (item) {
      item.style.transition =
        "transform 1.4s cubic-bezier(0.16, 1, 0.3, 1)";
      item.style.setProperty(
        "transform",
        "translate3d(0px, 0px, 0px) scale3d(1, 1, 1)",
        "important",
      );
      item.style.setProperty(
        "-webkit-transform",
        "translate3d(0px, 0px, 0px) scale3d(1, 1, 1)",
        "important",
      );
    }
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

  function scan() {
    var seen = typeof WeakSet !== "undefined" ? new WeakSet() : null;
    var els = targetsFromIx2();
    Array.prototype.forEach.call(
      document.querySelectorAll(
        ".hero-rotate-image, a.work-card-item[data-w-id]",
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
      // IX2 sometimes starts then stalls mid-tween (~0.05–0.2 opacity).
      if (parseFloat(window.getComputedStyle(el).opacity) >= 0.95) return;
      if (!nearViewport(layoutRect(el))) return;
      reveal(el);
    });
  }

  function start() {
    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      scan();
      if (tries >= 25) window.clearInterval(timer);
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
