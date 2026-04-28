function toggleSection(bodyId, btnId, color) {
  var body = document.getElementById(bodyId);
  var btn  = document.getElementById(btnId);
  if (!body || !btn) return;
  var opening = body.style.display === 'none';
  body.style.display = opening ? 'block' : 'none';
  btn.textContent = opening ? '－' : '＋';
  if (opening && bodyId === 'settingBody') {
    setTimeout(function() {
      var blade = document.getElementById('blade');
      if (blade) { blade.focus(); blade.select(); }
    }, 50);
  }
  if (opening && bodyId === 'jobBody') {
    setTimeout(function() {
      var jc = document.getElementById('jobClient');
      if (jc) { jc.focus(); jc.select(); }
    }, 50);
  }
}
