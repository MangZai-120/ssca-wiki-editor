/**
 * i18n — 轻量国际化模块
 * localStorage 存储语言偏好，键 "lang"
 */
(function () {
  "use strict";
  var _dict = {};
  var _ready = false;
  var _cbs = [];

  function getLang() {
    var lang = localStorage.getItem("lang") || "zh_CN";
    document.cookie = "lang=" + lang + ";path=/;max-age=31536000;SameSite=Lax";
    return lang;
  }

  function setLang(lang) {
    localStorage.setItem("lang", lang);
    document.cookie = "lang=" + lang + ";path=/;max-age=31536000;SameSite=Lax";
    location.reload();
  }

  function t(key) {
    var s = _dict[key];
    if (s === undefined) return key;
    var args = Array.prototype.slice.call(arguments, 1);
    return s.replace(/\{(\d+)\}/g, function (_, i) {
      return args[parseInt(i)] !== undefined ? args[parseInt(i)] : _;
    });
  }

  function applyDOM() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (_dict[key] !== undefined) el.innerHTML = _dict[key];
    });
    document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-title");
      if (_dict[key] !== undefined) el.title = t(key);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      if (_dict[key] !== undefined) el.placeholder = t(key);
    });
    // update lang select
    var sel = document.getElementById("lang-select");
    if (sel) sel.value = getLang();
  }

  function load(cb) {
    var lang = getLang();
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/static/lang/" + lang + ".json?_=" + Date.now());
    xhr.onload = function () {
      if (xhr.status === 200) {
        try { _dict = JSON.parse(xhr.responseText); } catch (e) { _dict = {}; }
      }
      _ready = true;
      applyDOM();
      if (cb) cb();
      _cbs.forEach(function (fn) { fn(); });
    };
    xhr.onerror = function () { _ready = true; if (cb) cb(); };
    xhr.send();
  }

  function onReady(fn) {
    if (_ready) fn();
    else _cbs.push(fn);
  }

  window.i18n = {
    t: t,
    getLang: getLang,
    setLang: setLang,
    load: load,
    applyDOM: applyDOM,
    onReady: onReady
  };
  window.t = t;
})();
