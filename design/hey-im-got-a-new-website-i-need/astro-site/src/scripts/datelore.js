/* ============================================================================
   DateLore — interaction layer (vanilla JS, no dependencies, Astro-safe)

   Progressive enhancement: every feature is opt-in via data-attributes, so a
   page without these hooks renders fine and a page with them lights up.

   Hooks:
     Birthday calculator
       [data-bday-form]            form wrapper
       [data-bday-input]           <input type="date">
       [data-bday-results]         container revealed on submit (optional)
       [data-bday-out="years|days|hours|weekday|zodiac|chinese|generation|
                       countdown|pretty"]   text targets to fill

     Daily quiz
       [data-quiz]                 quiz wrapper (data-quiz="<id>")
       [data-quiz-opt]             option <button>, with data-correct="true|false"
       [data-quiz-answer]          element holding the correct year/label text
       [data-quiz-streak]          streak counter target
       [data-quiz-reveal]          hidden explanation block, shown after answer

     Share / copy
       [data-share]                button → navigator.share() or clipboard
       [data-share-url]            optional explicit URL (defaults to location)
   ========================================================================== */
(function () {
  "use strict";

  /* ---------------------------------------------------------------- helpers */
  var DAY = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  var ZODIAC = [
    { sign: "Capricorn",   glyph: "♑", from: [12,22], to: [1,19] },
    { sign: "Aquarius",    glyph: "♒", from: [1,20],  to: [2,18] },
    { sign: "Pisces",      glyph: "♓", from: [2,19],  to: [3,20] },
    { sign: "Aries",       glyph: "♈", from: [3,21],  to: [4,19] },
    { sign: "Taurus",      glyph: "♉", from: [4,20],  to: [5,20] },
    { sign: "Gemini",      glyph: "♊", from: [5,21],  to: [6,20] },
    { sign: "Cancer",      glyph: "♋", from: [6,21],  to: [7,22] },
    { sign: "Leo",         glyph: "♌", from: [7,23],  to: [8,22] },
    { sign: "Virgo",       glyph: "♍", from: [8,23],  to: [9,22] },
    { sign: "Libra",       glyph: "♎", from: [9,23],  to: [10,22] },
    { sign: "Scorpio",     glyph: "♏", from: [10,23], to: [11,21] },
    { sign: "Sagittarius", glyph: "♐", from: [11,22], to: [12,21] }
  ];
  var CHINESE = ["Monkey","Rooster","Dog","Pig","Rat","Ox","Tiger","Rabbit","Dragon","Snake","Horse","Goat"];

  function zodiacFor(month, day) {
    for (var i = 0; i < ZODIAC.length; i++) {
      var z = ZODIAC[i];
      if ((month === z.from[0] && day >= z.from[1]) || (month === z.to[0] && day <= z.to[1])) {
        return z;
      }
    }
    return ZODIAC[0];
  }
  function chineseFor(year) { return CHINESE[year % 12]; }
  function generationFor(y) {
    if (y <= 1927) return "Greatest Generation";
    if (y <= 1945) return "Silent Generation";
    if (y <= 1964) return "Baby Boomer";
    if (y <= 1980) return "Generation X";
    if (y <= 1996) return "Millennial";
    if (y <= 2012) return "Generation Z";
    return "Generation Alpha";
  }
  function ordinal(n) {
    var s = ["th","st","nd","rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function fmtNum(n) { return n.toLocaleString("en-US"); }
  function setOut(scope, key, value) {
    var el = scope.querySelector('[data-bday-out="' + key + '"]');
    if (el) el.textContent = value;
  }

  /* --------------------------------------------------------- birthday calc */
  function computeBirthday(scope, dateStr) {
    var parts = dateStr.split("-");
    if (parts.length !== 3) return false;
    var by = +parts[0], bm = +parts[1], bd = +parts[2];
    var birth = new Date(by, bm - 1, bd);
    if (isNaN(birth.getTime()) || birth.getMonth() !== bm - 1) return false;

    var now = new Date();
    if (birth > now) return false;

    // exact age in years
    var years = now.getFullYear() - by;
    var hadBirthday = (now.getMonth() > bm - 1) ||
                      (now.getMonth() === bm - 1 && now.getDate() >= bd);
    if (!hadBirthday) years--;

    var ms = now - birth;
    var totalDays = Math.floor(ms / 86400000);
    var totalHours = Math.floor(ms / 3600000);

    // next birthday countdown
    var next = new Date(now.getFullYear(), bm - 1, bd);
    if (next < now) next = new Date(now.getFullYear() + 1, bm - 1, bd);
    var daysToNext = Math.ceil((next - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);

    var z = zodiacFor(bm, bd);
    var monthName = birth.toLocaleString("en-US", { month: "long" });

    setOut(scope, "years",      fmtNum(years));
    setOut(scope, "days",       fmtNum(totalDays));
    setOut(scope, "hours",      fmtNum(totalHours));
    setOut(scope, "weekday",    DAY[birth.getDay()]);
    setOut(scope, "zodiac",     z.glyph + " " + z.sign);
    setOut(scope, "chinese",    "Year of the " + chineseFor(by));
    setOut(scope, "generation", generationFor(by));
    setOut(scope, "countdown",  daysToNext === 0 ? "Today!" : fmtNum(daysToNext));
    setOut(scope, "pretty",     monthName + " " + ordinal(bd) + ", " + by);

    var results = scope.querySelector("[data-bday-results]");
    if (results) { results.hidden = false; }
    return true;
  }

  function wireBirthday() {
    document.querySelectorAll("[data-bday-form]").forEach(function (form) {
      var input = form.querySelector("[data-bday-input]");
      var scope = form.closest("[data-bday-scope]") || document;
      if (!input) return;
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var ok = computeBirthday(scope, input.value);
        input.setAttribute("aria-invalid", ok ? "false" : "true");
        if (!ok) {
          var err = scope.querySelector("[data-bday-error]");
          if (err) err.hidden = false;
        } else {
          var err2 = scope.querySelector("[data-bday-error]");
          if (err2) err2.hidden = true;
        }
      });
    });
  }

  /* ----------------------------------------------------------------- quiz */
  function streakKey(id) { return "datelore:streak:" + (id || "daily"); }
  function getStreak(id) {
    try { return parseInt(localStorage.getItem(streakKey(id)) || "0", 10) || 0; }
    catch (_) { return 0; }
  }
  function setStreak(id, n) {
    try { localStorage.setItem(streakKey(id), String(n)); } catch (_) {}
  }

  function wireQuiz() {
    document.querySelectorAll("[data-quiz]").forEach(function (quiz) {
      var id = quiz.getAttribute("data-quiz") || "daily";
      var opts = Array.prototype.slice.call(quiz.querySelectorAll("[data-quiz-opt]"));
      var streakEl = quiz.querySelector("[data-quiz-streak]");
      var reveal = quiz.querySelector("[data-quiz-reveal]");
      var answered = false;

      if (streakEl) streakEl.textContent = getStreak(id);

      opts.forEach(function (opt) {
        opt.addEventListener("click", function () {
          if (answered) return;
          answered = true;
          var correct = opt.getAttribute("data-correct") === "true";

          opts.forEach(function (o) {
            o.disabled = true;
            if (o.getAttribute("data-correct") === "true") o.classList.add("is-correct");
          });
          if (!correct) opt.classList.add("is-wrong");

          var s = correct ? getStreak(id) + 1 : 0;
          setStreak(id, s);
          if (streakEl) streakEl.textContent = s;

          if (reveal) {
            reveal.hidden = false;
            var verdict = reveal.querySelector("[data-quiz-verdict]");
            if (verdict) verdict.textContent = correct ? "Correct!" : "Not quite — streak reset.";
          }
        });
      });
    });
  }

  /* ---------------------------------------------------------------- share */
  function flash(btn, msg) {
    var prev = btn.getAttribute("data-label") || btn.textContent;
    btn.setAttribute("data-label", prev);
    btn.textContent = msg;
    setTimeout(function () { btn.textContent = btn.getAttribute("data-label"); }, 1600);
  }
  function wireShare() {
    document.querySelectorAll("[data-share]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var url = btn.getAttribute("data-share-url") || location.href;
        var title = btn.getAttribute("data-share-title") || document.title;
        if (navigator.share) {
          navigator.share({ title: title, url: url }).catch(function () {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(function () { flash(btn, "Link copied ✓"); })
            .catch(function () { flash(btn, url); });
        } else {
          flash(btn, "Copy: " + url);
        }
      });
    });
  }

  /* ----------------------------------------------- header quick-date jump */
  function wireQuickDate() {
    document.querySelectorAll("[data-quick-date]").forEach(function (input) {
      input.addEventListener("change", function () {
        if (!input.value) return;
        var p = input.value.split("-");
        // Maps to a day page route like /day/05-31 (Astro-friendly slug)
        window.location.href = "/day/" + p[1] + "-" + p[2];
      });
    });
  }

  /* ------------------------------------------------------------------ init */
  function init() {
    wireBirthday();
    wireQuiz();
    wireShare();
    wireQuickDate();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
