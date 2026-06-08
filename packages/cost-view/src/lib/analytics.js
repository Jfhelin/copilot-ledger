// Privacy-friendly pageview tracking via GoatCounter (cookieless, no consent
// banner needed). The site uses hash routing under a GitHub Pages project path,
// so GoatCounter's on-load auto-count is disabled (window.goatcounter.no_onload
// in index.html) and we send each hash route path manually instead.
//
// The count.js script loads async, so it may not be present yet on the initial
// pageview. trackPageview retries a few times before giving up silently and
// never throws — important because it also runs in jsdom tests where the script
// never loads at all.

var MAX_ATTEMPTS = 10;
var RETRY_MS = 300;

export function trackPageview(path) {
  if (typeof window === "undefined") return;
  var clean = path || "/";
  var attempts = 0;

  function attempt() {
    var gc = window.goatcounter;
    if (gc && typeof gc.count === "function") {
      gc.count({ path: clean });
      return;
    }
    attempts += 1;
    if (attempts >= MAX_ATTEMPTS) return;
    setTimeout(attempt, RETRY_MS);
  }

  attempt();
}
