// 取り合いタブ オンボーディングモーダル
// 初回起動時 / バージョンアップ時に自動表示し、操作方法を 5 ページで案内する。

var TORIAI_ONBOARDING_KEY = 'toriai_calc_onboarding_seen_version';
var TORIAI_ONBOARDING_VERSION = (typeof TORIAI_CHANGELOG !== 'undefined' && TORIAI_CHANGELOG[0])
  ? TORIAI_CHANGELOG[0].version
  : '';
var _calcOnboardingPage = 0;
var _calcOnboardingCompleted = false;
var _calcOnboardingForced = false;
var _calcOnboardingTotal = 5;

function hasSeenCalcOnboarding() {
  try {
    return (localStorage.getItem(TORIAI_ONBOARDING_KEY) || '') === TORIAI_ONBOARDING_VERSION;
  } catch (e) {
    return false;
  }
}

function markCalcOnboardingSeen() {
  try {
    localStorage.setItem(TORIAI_ONBOARDING_KEY, TORIAI_ONBOARDING_VERSION);
  } catch (e) {}
}

function renderCalcOnboarding() {
  var pages = document.querySelectorAll('#calcOnboardingModal .onboarding-page');
  var actions = document.getElementById('onboardingActions');
  Array.prototype.forEach.call(pages, function(page, idx) {
    page.classList.toggle('is-active', idx === _calcOnboardingPage);
  });
  if (actions) actions.classList.toggle('is-complete', _calcOnboardingPage === _calcOnboardingTotal - 1);
}

function openCalcOnboarding(forceLocked) {
  var modal = document.getElementById('calcOnboardingModal');
  if (!modal) return;
  _calcOnboardingPage = 0;
  _calcOnboardingCompleted = hasSeenCalcOnboarding();
  _calcOnboardingForced = !!forceLocked && !_calcOnboardingCompleted;
  renderCalcOnboarding();
  modal.classList.add('show');
  if (typeof closeHeaderMenu === 'function') closeHeaderMenu();
}

function closeCalcOnboarding() {
  if (_calcOnboardingForced && !_calcOnboardingCompleted) return;
  var modal = document.getElementById('calcOnboardingModal');
  if (modal) modal.classList.remove('show');
}

function moveCalcOnboarding(step) {
  var next = _calcOnboardingPage + step;
  if (next < 0) next = 0;
  if (next > _calcOnboardingTotal - 1) next = _calcOnboardingTotal - 1;
  if (next === _calcOnboardingPage) return;
  _calcOnboardingPage = next;
  if (_calcOnboardingPage === _calcOnboardingTotal - 1 && !_calcOnboardingCompleted) {
    _calcOnboardingCompleted = true;
    _calcOnboardingForced = false;
    markCalcOnboardingSeen();
  }
  renderCalcOnboarding();
}

function startCalcFromOnboarding() {
  closeCalcOnboarding();
  if (typeof goPage === 'function') goPage('c');
}

function showCalcOnboardingIfNeeded() {
  if (hasSeenCalcOnboarding()) return;
  setTimeout(function() {
    openCalcOnboarding(true);
  }, 280);
}

// モーダル群（onboarding / changelog / header menu）の共通 keyboard ハンドラ
document.addEventListener('keydown', function(e) {
  var onboardingOpen = document.getElementById('calcOnboardingModal') &&
    document.getElementById('calcOnboardingModal').classList.contains('show');
  if (e.key === 'Escape') {
    if (typeof closeHeaderMenu === 'function') closeHeaderMenu();
    if (typeof closeChangelog === 'function') closeChangelog();
    closeCalcOnboarding();
  }
  if (onboardingOpen && e.key === 'ArrowRight') {
    e.preventDefault();
    moveCalcOnboarding(1);
  }
  if (onboardingOpen && e.key === 'ArrowLeft') {
    e.preventDefault();
    moveCalcOnboarding(-1);
  }
});
