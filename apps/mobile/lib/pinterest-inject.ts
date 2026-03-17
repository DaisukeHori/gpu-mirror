export const PINTEREST_INJECT_SCRIPT = `
(function() {
  if (window.__revolInjected) return;
  window.__revolInjected = true;

  let longPressTimer = null;

  function getImageFromElement(el) {
    if (el.tagName === 'IMG') return el.src;
    const img = el.querySelector('img');
    if (img) return img.src;
    const bg = window.getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none') {
      const match = bg.match(/url\\(["']?(.+?)["']?\\)/);
      return match ? match[1] : null;
    }
    return null;
  }

  function findPinImage(el) {
    let current = el;
    for (let i = 0; i < 10; i++) {
      if (!current) break;
      const src = getImageFromElement(current);
      if (src && (src.includes('pinimg.com') || src.includes('pinterest'))) {
        return src.replace(/\\/[0-9]+x[0-9]*\\//, '/originals/').replace(/\\/[0-9]+x\\//, '/originals/');
      }
      current = current.parentElement;
    }
    return null;
  }

  document.addEventListener('touchstart', function(e) {
    const target = e.target;
    longPressTimer = setTimeout(function() {
      const imageUrl = findPinImage(target);
      if (imageUrl) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'long_press_image',
          url: imageUrl,
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

  const observer = new MutationObserver(function() {
    const url = window.location.href;
    if (url.includes('/pin/')) {
      const images = document.querySelectorAll('img[src*="pinimg.com"]');
      let largest = null;
      let maxArea = 0;
      images.forEach(function(img) {
        const area = img.naturalWidth * img.naturalHeight;
        if (area > maxArea) {
          maxArea = area;
          largest = img;
        }
      });
      if (largest) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'pin_detail',
          url: largest.src.replace(/\\/[0-9]+x[0-9]*\\//, '/originals/').replace(/\\/[0-9]+x\\//, '/originals/'),
        }));
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
true;
`;
