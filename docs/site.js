// Bolivar Coffee draft: open-now status in Georgia time, today's hours,
// the café chooser for ordering, and the phone action bar.
(function () {
  "use strict";

  var root = document.documentElement;
  var params = new URLSearchParams(location.search);
  if (params.has("still")) root.classList.add("still");
  if (params.has("og")) root.classList.add("og");

  // Both cafés keep the same hours, 24-hour clock, by day (0 = Sunday).
  var HOURS = { 0: [8, 17], 1: [7, 18], 2: [7, 18], 3: [7, 18], 4: [7, 18], 5: [7, 18], 6: [8, 17] };
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function clock(h) { return (h % 12 || 12) + (h < 12 ? " AM" : " PM"); }

  function georgiaNow() {
    try {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23"
      }).formatToParts(new Date());
      var get = function (type) {
        for (var i = 0; i < parts.length; i++) if (parts[i].type === type) return parts[i].value;
        return "";
      };
      var day = DAYS.indexOf(get("weekday"));
      if (day < 0) throw new Error("weekday");
      return { day: day, mins: (parseInt(get("hour"), 10) % 24) * 60 + parseInt(get("minute"), 10) };
    } catch (e) {
      var d = new Date();
      return { day: d.getDay(), mins: d.getHours() * 60 + d.getMinutes() };
    }
  }

  // What to say right now: open until, opens later today, or opens tomorrow.
  function state(now) {
    var today = HOURS[now.day];
    if (now.mins >= today[0] * 60 && now.mins < today[1] * 60) {
      return { open: true, short: "Open · until " + clock(today[1]), until: clock(today[1]) };
    }
    if (now.mins < today[0] * 60) {
      return { open: false, short: "Closed · opens " + clock(today[0]), opens: clock(today[0]) };
    }
    var next = HOURS[(now.day + 1) % 7][0];
    return { open: false, short: "Closed · opens " + clock(next) + " tomorrow", opens: clock(next) + " tomorrow" };
  }

  function each(selector, fn) { Array.prototype.forEach.call(document.querySelectorAll(selector), fn); }

  function refresh() {
    var now = georgiaNow();
    var s = state(now);

    each("[data-status]", function (el) {
      el.classList.toggle("is-open", s.open);
      el.querySelector(".status-text").textContent = s.open ? "Open now · until " + s.until : "Closed · opens " + s.opens;
    });
    each("[data-status-long]", function (el) {
      el.classList.toggle("is-open", s.open);
      el.textContent = s.open
        ? "Both cafés are open now, until " + s.until + "."
        : "Both cafés are closed now. They open at " + s.opens + ".";
    });
    each("[data-cafe-status]", function (el) {
      el.classList.toggle("is-open", s.open);
      el.textContent = s.short;
    });
    each("[data-order-today]", function (el) {
      el.textContent = s.open ? "Open now, until " + s.until : "Order ahead: opens " + s.opens;
    });

    each(".is-today", function (n) { n.classList.remove("is-today"); });
    each('[data-day="' + now.day + '"]', function (n) { n.classList.add("is-today"); });
  }

  // Order buttons open the café chooser; without it they lead to the cafés section.
  var dialog = document.getElementById("order");
  if (dialog && typeof dialog.showModal === "function") {
    each("[data-order]", function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        dialog.showModal();
      });
    });
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) dialog.close();
    });
    if (params.has("order")) dialog.showModal(); // for the review screenshots
  }

  // The phone action bar shows once the hero's buttons scroll away.
  var dock = document.querySelector(".dock");
  var heroActions = document.querySelector(".hero .actions");
  if (dock && heroActions && "IntersectionObserver" in window) {
    root.classList.add("dock-auto");
    dock.setAttribute("inert", "");
    new IntersectionObserver(function (entries) {
      var heroInView = entries[0].isIntersecting;
      dock.classList.toggle("is-shown", !heroInView);
      if (heroInView) dock.setAttribute("inert", ""); else dock.removeAttribute("inert");
    }, { rootMargin: "0px 0px -72px 0px" }).observe(heroActions);
  }

  refresh();
  setInterval(refresh, 60000);
})();
