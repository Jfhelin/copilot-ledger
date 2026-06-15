// Dependency-free hash router for the Copilot Behavior Lab shell.
//
// Hash routing is deliberate: the app is deployed to a GitHub Pages project
// path (e.g. /copilot-ledger/) where there is no server-side rewrite, so deep
// links and refreshes on path-based routes would 404. Everything after `#`
// stays client-side.
//
// Route shape:  #/<path>?<query>
//   #/                     -> { path: "/",            params: {} }
//   #/experiments/foo      -> { path: "/experiments/foo", params: {} }
//   #/analyze?src=foo.json -> { path: "/analyze", params: { src: "foo.json" } }
//
// `?embed=1` and `?export=` live in the real query string (location.search) and
// are handled separately in App.jsx; they never collide with the hash query.

import { useEffect, useState } from "react";

export function parseHash(hash) {
  var raw = (hash || "").replace(/^#/, "");
  if (!raw) raw = "/";
  if (raw[0] !== "/") raw = "/" + raw;
  var qIndex = raw.indexOf("?");
  var path = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
  var query = qIndex >= 0 ? raw.slice(qIndex + 1) : "";
  // Normalise a trailing slash (except for the root "/").
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  var params = {};
  new URLSearchParams(query).forEach(function (value, key) { params[key] = value; });
  return { path: path, params: params };
}

// Build an href string for a route. Query values are encoded.
export function hrefFor(path, params) {
  var clean = path || "/";
  if (clean[0] !== "/") clean = "/" + clean;
  var search = "";
  if (params) {
    var usp = new URLSearchParams();
    Object.keys(params).forEach(function (key) {
      if (params[key] != null) usp.set(key, String(params[key]));
    });
    var str = usp.toString();
    if (str) search = "?" + str;
  }
  return "#" + clean + search;
}

export function navigate(path, params) {
  if (typeof window === "undefined") return;
  window.location.hash = hrefFor(path, params).slice(1);
}

export function useHashRoute() {
  var initial = typeof window === "undefined" ? "" : window.location.hash;
  var state = useState(function () { return parseHash(initial); });
  var route = state[0];
  var setRoute = state[1];

  useEffect(function () {
    function onHashChange() { setRoute(parseHash(window.location.hash)); }
    window.addEventListener("hashchange", onHashChange);
    // Sync once in case the hash changed between initial render and mount.
    onHashChange();
    return function () { window.removeEventListener("hashchange", onHashChange); };
  }, []);

  return route;
}
