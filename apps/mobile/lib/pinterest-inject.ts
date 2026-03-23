export const PINTEREST_INJECT_SCRIPT = `
(function() {
  if (window.__revolInjectedInitialized) return;

  function init() {
    if (window.__revolInjectedInitialized || !document.body) return;
    window.__revolInjectedInitialized = true;

    let longPressTimer = null;
    var AUTH_HINTS = [
      'pinterest へようこそ',
      'welcome to pinterest',
      'ログインしてもっと見る',
      'log in to see more',
      'メールアドレスで続行',
      'continue with email',
      'google で続ける',
      'continue with google',
      'ログイン',
      'log in',
      'download the pinterest app',
      'pinterest アプリをダウンロードする'
    ];

    var style = document.createElement('style');
    style.innerHTML = [
      '* { -webkit-user-select: none !important; user-select: none !important; }',
      'a, img, video { -webkit-touch-callout: none !important; }',
      '#credential_picker_container, .grecaptcha-badge, .fb_dialog, .fb_dialog_mobile { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }'
    ].join('\\n');
    (document.head || document.documentElement).appendChild(style);

    document.addEventListener('contextmenu', function(e) {
      e.preventDefault();
    }, true);

    function normalizeText(value) {
      return String(value || '').toLowerCase().replace(/\\s+/g, ' ').trim();
    }

    function hideElement(el) {
      if (!el || !el.style) return;
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
      el.setAttribute('aria-hidden', 'true');
    }

    function removeElement(el) {
      if (!el) return;
      if (typeof el.remove === 'function') {
        el.remove();
        return;
      }
      hideElement(el);
    }

    function removeFixedAncestor(el, maxSteps) {
      var current = el;
      for (var i = 0; i < (maxSteps || 6) && current; i += 1) {
        var parent = current.parentElement;
        if (!parent) break;
        var style = window.getComputedStyle(parent);
        if (style.position === 'fixed' || style.position === 'sticky' || parseInt(style.zIndex || '0', 10) > 600) {
          removeElement(parent);
        }
        current = parent;
      }
    }

    function removeBySelector(selector) {
      document.querySelectorAll(selector).forEach(function(node) {
        removeElement(node);
        removeFixedAncestor(node, 8);
      });
    }

    function findElementByText(texts) {
      var nodes = document.querySelectorAll('button, div, span, a, h1, h2, h3');
      for (var i = 0; i < nodes.length; i += 1) {
        var node = nodes[i];
        var text = normalizeText(node.innerText || node.textContent);
        for (var j = 0; j < texts.length; j += 1) {
          if (text.indexOf(normalizeText(texts[j])) >= 0) {
            return node;
          }
        }
      }
      return null;
    }

    function looksLikeAuthPrompt(el) {
      if (!el) return false;
      var text = normalizeText(el.innerText || el.textContent);
      if (!text) return false;
      var hits = 0;
      AUTH_HINTS.forEach(function(keyword) {
        if (text.indexOf(keyword) >= 0) hits += 1;
      });
      return hits >= 1;
    }

    function containsAuthControls(el) {
      if (!el || typeof el.querySelector !== 'function') return false;
      return Boolean(
        el.querySelector('[data-test-id="passwordInputField"]') ||
        el.querySelector('input[type="password"]') ||
        el.querySelector('#credential_picker_container') ||
        el.querySelector('iframe[title*="Google"]') ||
        el.querySelector('button[aria-label*="ログイン"]') ||
        el.querySelector('button[aria-label*="Log in"]')
      );
    }

    function dismissAuthPrompt() {
      removeBySelector('#credential_picker_container');
      removeBySelector('[data-test-id="unauth-header"]');
      removeBySelector('[data-test-id="unauth-header-logo"]');
      removeBySelector('.grecaptcha-badge');
      removeBySelector('.fb_dialog');
      removeBySelector('.fb_dialog_mobile');

      var passwordField = document.querySelector('[data-test-id="passwordInputField"], input[type="password"]');
      if (passwordField) {
        removeFixedAncestor(passwordField, 12);
      }

      var continueButton = findElementByText([
        'メールアドレスで続行',
        'google で続ける',
        'pinterest アプリをダウンロードする',
        'ログインしてもっと見る',
        'pinterest へようこそ',
      ]);
      if (continueButton) {
        removeFixedAncestor(continueButton, 12);
      }

      var candidates = document.querySelectorAll(
        'div[role="dialog"], [data-test-id*="signup"], [data-test-id*="login"], [data-test-id*="auth"], [data-test-id*="unauth"], [id*="signup"], [id*="login"], [id*="auth"]'
      );

      candidates.forEach(function(node) {
        if (!node) return;
        var isAuthDialog =
          looksLikeAuthPrompt(node) ||
          containsAuthControls(node) ||
          node.id === 'credential_picker_container' ||
          normalizeText(node.getAttribute('aria-label')).indexOf('google') >= 0;

        if (!isAuthDialog) return;
        removeElement(node);

        var closeButton = node.querySelector('.euRXRl, button[aria-label*="閉じる"], button[aria-label*="close"], [data-test-id*="close"]');
        if (closeButton && typeof closeButton.click === 'function') {
          closeButton.click();
        }

        var parent = node.parentElement;
        for (var i = 0; i < 4 && parent; i += 1) {
          var parentStyle = window.getComputedStyle(parent);
          if (parentStyle.position === 'fixed' || parentStyle.position === 'sticky' || parseInt(parentStyle.zIndex || '0', 10) > 100) {
            removeElement(parent);
            parent = parent.parentElement;
            continue;
          }
          break;
        }
      });

      document.documentElement.style.overflow = 'auto';
      document.body.style.overflow = 'auto';
      document.documentElement.style.removeProperty('position');
      document.body.style.removeProperty('position');
      document.body.style.removeProperty('touch-action');
      document.body.style.removeProperty('pointer-events');
      document.documentElement.style.removeProperty('pointer-events');
    }

    function isVideoElement(el) {
      if (!el) return false;
      if (el.tagName === 'VIDEO') return true;
      var parent = el.parentElement;
      if (parent && parent.tagName === 'VIDEO') return true;
      if (parent && parent.querySelector && parent.querySelector(':scope > video')) return true;
      return false;
    }

    function getImageFromElement(el) {
      if (el.tagName === 'IMG') return el.src;
      var img = typeof el.querySelector === 'function' ? el.querySelector('img') : null;
      if (img) return img.src;
      var bg = window.getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none') {
        var match = bg.match(/url\\(["']?(.+?)["']?\\)/);
        return match ? match[1] : null;
      }
      return null;
    }

    function findPinImage(el) {
      var current = el;
      for (var i = 0; i < 10; i++) {
        if (!current) break;
        var src = getImageFromElement(current);
        if (src && src.indexOf('pinimg.com') >= 0 && src.indexOf('.mp4') === -1 && src.indexOf('.m3u8') === -1) {
          return src.replace(/\\/[0-9]+x[0-9]*\\//, '/originals/').replace(/\\/[0-9]+x\\//, '/originals/');
        }
        current = current.parentElement;
      }
      return null;
    }

    document.addEventListener('touchstart', function(e) {
      var target = e.target;
      if (isVideoElement(target)) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'unsupported_video'
        }));
        return;
      }
      longPressTimer = setTimeout(function() {
        var imageUrl = findPinImage(target);
        if (imageUrl) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'long_press_image',
            url: imageUrl,
          }));
        } else {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'unsupported_video'
          }));
        }
      }, 500);
    }, { passive: true });

    document.addEventListener('touchend', function() {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }, { passive: true });

    document.addEventListener('touchmove', function() {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }, { passive: true });

    var observer = new MutationObserver(function() {
      dismissAuthPrompt();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    dismissAuthPrompt();
    setInterval(dismissAuthPrompt, 500);

    // Detect blank/white page after auth prompt removal and notify RN
    setInterval(function() {
      var images = document.querySelectorAll('img[src*="pinimg.com"]');
      var hasVisibleContent = images.length > 0 ||
        document.querySelector('[data-test-id="pin"]') ||
        document.querySelector('[data-test-id="pinGrid"]') ||
        document.querySelector('[data-test-id="search-guide"]');
      var bodyText = (document.body.innerText || '').trim();
      if (!hasVisibleContent && bodyText.length < 20 && document.readyState === 'complete') {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'blank_page_detected'
        }));
      }
    }, 2000);
  }

  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init, { once: true });
    setTimeout(init, 250);
    setTimeout(init, 1000);
  }
})();
true;
`;
