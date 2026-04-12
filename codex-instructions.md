# TORIAI 印刷カート UI — Codex Instructions

## Context

This is the TORIAI steel cutting optimizer web app. The UI uses a custom design system defined in `toriai-theme.css`. Key design rules:
- All colors via CSS custom properties: `--ink` (text), `--bg` (background), `--line` (borders), `--ink2/3` (muted text), `--bg2/3` (subtle backgrounds), `--hp` / `--sp` (hover/selected purple-tinted BG — **bg only, never text/border**)
- No hardcoded color values in HTML — everything must use CSS vars
- Dark mode: `html[data-theme="dark"]` overrides
- All style overrides go in `toriai-theme.css` with `!important` to beat `style.css`

---

## Change 1 — 印刷カート modal HTML (`index.html`)

Replace the `#cartModal` block (everything from `<!-- カートモーダル -->` to the closing `</div>`) with the following clean structure:

```html
<!-- カートモーダル -->
<div id="cartModal">
  <div class="cart-modal-inner">
    <div class="cart-modal-hd">
      <div class="cart-modal-hd-left">
        <span class="cart-modal-title">🛒 印刷カート</span>
        <span id="cartModalCount" class="cart-modal-count"></span>
      </div>
      <div class="cart-modal-hd-right">
        <button class="cart-danger-btn" onclick="cartClearAll()">全クリア</button>
        <button class="cart-close-btn" onclick="closeCartModal()">閉じる</button>
      </div>
    </div>
    <div class="cart-modal-body">
      <!-- 保存リスト -->
      <div class="cart-section" id="cartItemsSection">
        <div class="cart-section-title">保存された取り合い</div>
        <div id="cartItemsList"></div>
      </div>
      <!-- 出力アクション -->
      <div class="cart-section" id="cartActions">
        <div class="cart-section-title">出力</div>
        <div class="cart-actions-grid">
          <button class="cart-action-btn cart-action-primary" onclick="cartDoPrint()">🖨 印刷</button>
          <button class="cart-action-btn" disabled>CSV出力</button>
          <button class="cart-action-btn" disabled>見積書PDF</button>
          <button class="cart-action-btn" disabled>発注明細作成</button>
        </div>
      </div>
    </div>
  </div>
</div>
```

Key structural changes:
- Removed all inline `style=""` attributes from the header — use classes instead
- Removed the `cart-project-placeholder` dev note div (the "※将来：…" text)
- Fixed div nesting — previously `cart-modal-body` closed early and `cart-section` divs sat outside it
- Added `cart-modal-hd-left` / `cart-modal-hd-right` wrapper divs
- Added `cart-modal-title` class to title span; `cart-modal-count` class to count span
- Added `cart-close-btn` class to the close button
- `cart-action-primary` class added to the 印刷 button (full-width CTA)
- Output grid now has 4 buttons: 印刷 (primary, spans full width), then 3 disabled in a row

---

## Change 2 — 印刷カート modal CSS (`toriai-theme.css`)

Append the following section at the end of `toriai-theme.css`:

```css
/* ── 32. 印刷カート modal redesign ─────────────────────────── */

/* Overlay: flex-center when shown (JS sets display:block inline → override) */
#cartModal[style*="block"] {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
#cartModal {
  padding: 20px 16px !important;
}

/* Modal box */
.cart-modal-inner {
  max-width: 520px !important;
  width: 100% !important;
  margin: 0 !important;
  background: var(--bg) !important;
  border-radius: 18px !important;
  overflow: hidden !important;
  box-shadow: 0 20px 60px rgba(0,0,0,.18) !important;
  display: flex !important;
  flex-direction: column !important;
  max-height: calc(100vh - 48px) !important;
}

/* Header */
.cart-modal-hd {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 18px 22px !important;
  background: var(--bg) !important;
  border-bottom: 1px solid var(--line) !important;
  flex-shrink: 0 !important;
}
.cart-modal-hd-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cart-modal-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: .01em;
}
.cart-modal-count {
  font-size: 11px;
  color: var(--ink3);
  background: var(--bg2);
  padding: 2px 9px;
  border-radius: 99px;
  border: 1px solid var(--line);
  font-weight: 600;
}
.cart-modal-count:empty { display: none; }
.cart-modal-hd-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Body scroll area */
.cart-modal-body {
  overflow-y: auto !important;
  flex: 1 1 auto !important;
  max-height: none !important;
  padding: 0 !important;
}

/* Sections */
.cart-section {
  padding: 18px 22px !important;
  margin: 0 !important;
  border-bottom: 1px solid var(--line) !important;
}
.cart-section:last-child {
  border-bottom: none !important;
}
.cart-section-title {
  font-size: 10.5px !important;
  font-weight: 700 !important;
  color: var(--ink3) !important;
  text-transform: uppercase !important;
  letter-spacing: .09em !important;
  margin-bottom: 14px !important;
}

/* Output action grid: 3 cols, print button spans all 3 */
.cart-actions-grid {
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 8px !important;
}
.cart-action-btn {
  padding: 11px 14px !important;
  border-radius: 10px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  border: 1.5px solid var(--line) !important;
  background: var(--bg) !important;
  color: var(--ink) !important;
  cursor: pointer !important;
  font-family: inherit !important;
  text-align: center !important;
  transition: background .15s, border-color .15s !important;
}
.cart-action-btn:hover:not(:disabled) {
  background: var(--hp) !important;
  border-color: #ccc !important;
}
/* Primary print CTA — full width, solid dark */
.cart-action-primary {
  grid-column: span 3 !important;
  background: var(--ink) !important;
  color: #fff !important;
  border-color: var(--ink) !important;
  font-size: 14px !important;
  padding: 13px !important;
  letter-spacing: .02em !important;
}
.cart-action-primary:hover:not(:disabled) {
  background: #333 !important;
  border-color: #333 !important;
  color: #fff !important;
}
.cart-action-btn:disabled {
  opacity: 0.3 !important;
  cursor: not-allowed !important;
}

/* Cart items */
.cart-item {
  padding: 12px 0 !important;
  border-bottom: 1px solid var(--line) !important;
  margin: 0 !important;
}
.cart-item:last-child {
  border-bottom: none !important;
}
.cart-item-del {
  background: none !important;
  border: 1.5px solid var(--line) !important;
  color: var(--ink3) !important;
  border-radius: 8px !important;
  padding: 4px 10px !important;
  cursor: pointer !important;
  font-size: 11px !important;
  flex-shrink: 0 !important;
  font-family: inherit !important;
  transition: border-color .15s, color .15s !important;
}
.cart-item-del:hover {
  border-color: #f87171 !important;
  color: #f87171 !important;
}

/* 全クリア button */
.cart-danger-btn {
  background: none !important;
  border: 1.5px solid var(--line) !important;
  color: #e55 !important;
  border-radius: 9px !important;
  padding: 7px 14px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  font-family: inherit !important;
  transition: background .15s, border-color .15s !important;
}
.cart-danger-btn:hover {
  background: #fff4f4 !important;
  border-color: #e55 !important;
}

/* Close btn — neutral; also overrides cart-danger-btn if applied by normalizeInterfaceChrome */
.cart-close-btn,
.cart-close-btn.cart-danger-btn {
  background: none !important;
  border: 1.5px solid var(--line) !important;
  color: var(--ink2) !important;
  border-radius: 9px !important;
  padding: 7px 14px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  cursor: pointer !important;
  font-family: inherit !important;
  transition: background .15s, border-color .15s !important;
}
.cart-close-btn:hover,
.cart-close-btn.cart-danger-btn:hover {
  background: var(--bg2) !important;
  border-color: #aaa !important;
  color: var(--ink) !important;
}

/* Dark mode */
html[data-theme="dark"] .cart-action-primary {
  background: #e8e8f0 !important;
  color: #111 !important;
  border-color: #e8e8f0 !important;
}
html[data-theme="dark"] .cart-action-primary:hover:not(:disabled) {
  background: #fff !important;
  border-color: #fff !important;
}
html[data-theme="dark"] .cart-modal-count {
  background: var(--bg2) !important;
  border-color: var(--line) !important;
  color: var(--ink3) !important;
}
html[data-theme="dark"] .cart-danger-btn:hover {
  background: rgba(255,80,80,.1) !important;
}
html[data-theme="dark"] .cart-close-btn:hover,
html[data-theme="dark"] .cart-close-btn.cart-danger-btn:hover {
  background: var(--bg2) !important;
}
```

---

## Change 3 — Service worker version bump (`service-worker.js`)

Update the cache name to force all clients to reload:

```js
// Before:
const CACHE_NAME = 'steel-optimizer-v21';

// After:
const CACHE_NAME = 'steel-optimizer-v22';
```

---

## Notes for Codex

- The `normalizeInterfaceChrome()` function in `main.js` (runs on DOMContentLoaded) searches for specific selectors and renames text / adds classes. It targets `#cartModal button[onclick="cartClearAll()"]` to add `.cart-danger-btn`, and `#cartModal button[onclick="closeCartModal()"]` to also add `.cart-danger-btn`. The `.cart-close-btn` CSS rules have higher specificity to neutralize the red color for the close button.
- `openCartModal()` sets `element.style.display = 'block'` inline. The CSS uses `#cartModal[style*="block"]` attribute selector to override this to `display: flex` for centering.
- `renderCartModal()` targets `#cartItemsList` (or `#cartModalBody` as fallback). The new HTML keeps `#cartItemsList` inside `.cart-modal-body` → `#cartItemsSection`.
- The `cartModalCount` span shows the number of items in the cart — text is set by `updateCartBadge()` in `main.js`.
