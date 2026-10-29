// Quizci en app installable : service worker + invitation à installer.
// Script classique (pas de module), chargé avec "defer" sur toutes les pages.
(function () {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () {
        // Échec silencieux : le site reste utilisable normalement.
      });
    });
  }

  var DISMISS_KEY = "quizci_pwa_dismissed";
  var path = location.pathname.replace(/\/+$/, "");
  // Pas d'invitation sur l'écran projeté ni sur l'admin.
  if (path === "/host" || path === "/host.html" || path === "/admin" || path === "/admin.html") return;

  var standalone =
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    window.navigator.standalone === true;
  if (standalone) return;

  function dismissed() {
    try { return !!localStorage.getItem(DISMISS_KEY); } catch (e) { return false; }
  }
  function remember() {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch (e) {}
  }
  if (dismissed()) return;

  var banner = null;

  function injectStyle() {
    if (document.getElementById("pwa-style")) return;
    var s = document.createElement("style");
    s.id = "pwa-style";
    s.textContent =
      ".pwa-bar{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:9999;" +
      "max-width:420px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:12px;border-radius:18px;" +
      "background:#2e1a73;color:#fff;border:1px solid rgba(255,255,255,.14);box-shadow:0 12px 32px rgba(0,0,0,.4);" +
      "font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}" +
      ".pwa-bar img{width:44px;height:44px;border-radius:12px;flex:none}" +
      ".pwa-bar .t{flex:1;min-width:0;font-size:.82rem;line-height:1.3;color:#bdb4ea}" +
      ".pwa-bar .t b{display:block;color:#fff;font-size:.95rem}" +
      ".pwa-bar button{border:0;font-family:inherit;cursor:pointer}" +
      ".pwa-bar .go{flex:none;background:#ff8a1f;color:#fff;font-weight:700;font-size:.9rem;padding:10px 16px;border-radius:12px}" +
      ".pwa-bar .x{flex:none;background:transparent;color:#bdb4ea;font-size:1.3rem;line-height:1;padding:4px 6px}";
    document.head.appendChild(s);
  }

  function show(html, onAction) {
    if (banner) return;
    injectStyle();
    banner = document.createElement("div");
    banner.className = "pwa-bar";
    banner.setAttribute("role", "dialog");
    banner.innerHTML =
      '<img src="/icon-192.png" alt="">' + html + '<button type="button" class="x" aria-label="Fermer">&times;</button>';
    banner.querySelector(".x").addEventListener("click", function () {
      remember();
      hide();
    });
    var go = banner.querySelector(".go");
    if (go && onAction) go.addEventListener("click", onAction);
    document.body.appendChild(banner);
  }

  function hide() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
  }

  // Chrome / Android / ordinateur : bouton d'installation natif.
  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    show(
      '<div class="t"><b>Installer Quizci</b>Accès direct depuis ton écran d’accueil</div>' +
        '<button type="button" class="go">Installer</button>',
      function () {
        if (!deferred) return;
        deferred.prompt();
        deferred.userChoice.then(function () {
          deferred = null;
          hide();
        });
      }
    );
  });
  window.addEventListener("appinstalled", function () {
    deferred = null;
    hide();
  });

  // iPhone / iPad (Safari) : pas de bouton natif, on explique le geste.
  var ua = navigator.userAgent;
  var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua);
  if (isIOS && isSafari) {
    window.addEventListener("load", function () {
      setTimeout(function () {
        show(
          '<div class="t"><b>Installer Quizci</b>Touche <span aria-label="Partager">⬆︎ Partager</span> puis « Sur l’écran d’accueil »</div>'
        );
      }, 2500);
    });
  }
})();
