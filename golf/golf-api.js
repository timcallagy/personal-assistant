(function () {
  'use strict';

  var API   = window.GOLF_API_URL  || '';
  var BASE  = window.GOLF_BASE_PATH || '';
  var token = localStorage.getItem('golf_token');

  if (!token) { window.location.replace(BASE || '/'); return; }

  // ─── Undo / Redo ─────────────────────────────────────────────────────────────
  var undoStack = [];
  var redoStack = [];
  var suppressSnap = false;
  var MAX_UNDO = 30;

  function snap() {
    return {
      G:       JSON.parse(JSON.stringify(G)),
      dir:     currentDirection,
      phase:   activePhase(),
      screen:  activeScreen(),
      comment: (document.getElementById('shot-comment') || {}).value || '',
    };
  }

  function push() {
    if (suppressSnap) return;
    undoStack.push(snap());
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack = [];
    refreshUndoUI();
  }

  function activePhase() {
    if (notHidden('phase-putt')) return 'putt';
    if (notHidden('phase-shot')) return 'shot';
    return 'club';
  }

  function activeScreen() {
    var screens = ['game', 'hole-done', 'scorecard', 'setup'];
    for (var i = 0; i < screens.length; i++) {
      var el = document.getElementById('screen-' + screens[i]);
      if (el && el.classList.contains('active')) return screens[i];
    }
    return 'game';
  }

  function notHidden(id) {
    var el = document.getElementById(id);
    return el && !el.classList.contains('hidden');
  }

  function restoreSnap(s) {
    // Restore G (mutate existing object so all golf.html closures see it)
    Object.keys(s.G).forEach(function (k) { G[k] = s.G[k]; });
    // Restore direction
    currentDirection = s.dir;
    ['left', 'straight', 'right'].forEach(function (d) {
      var el = document.getElementById('dir-' + d);
      if (el) el.classList.toggle('picked', d === currentDirection);
    });
    // Restore comment
    var c = document.getElementById('shot-comment');
    if (c) c.value = s.comment || '';
    // Re-render game header and tallies
    refreshGameTop();
    buildProgress();
    drawTally('shot-tally-marks', G.shots);
    drawTally('putt-tally-marks', G.putts);
    // Show correct screen
    if (s.screen === 'hole-done') {
      restoreHoleDoneScreen();
    } else {
      show('screen-game');
      setPhase(s.phase);
      if (s.phase === 'shot') {
        var b = document.getElementById('g-club-badge');
        if (b) b.textContent = 'Club: ' + G.currentClub;
      }
      if (s.phase === 'club') filterClubs();
    }
    // Sync to DB (fire and forget)
    updateDraftRound();
    refreshUndoUI();
  }

  function restoreHoleDoneScreen() {
    var lastHole = G.allHoleData[G.allHoleData.length - 1];
    var total = lastHole ? lastHole.total : 0;
    document.getElementById('hd-title').textContent = 'Hole ' + G.hole + ' Complete!';
    document.getElementById('hd-score').textContent = total + (total === 1 ? ' shot' : ' shots');
    var icon, msg;
    if      (total <= 2) { icon = '★★★'; msg = 'Incredible — hole in one territory!'; }
    else if (total <= 3) { icon = '★★';  msg = 'Brilliant round!'; }
    else if (total <= 5) { icon = '★';   msg = 'Well played!'; }
    else if (total <= 7) { icon = 'A';   msg = 'Good effort!'; }
    else                 { icon = 'B';   msg = 'Keep practising — you will get there!'; }
    document.getElementById('hd-icon').textContent = icon;
    document.getElementById('hd-msg').textContent  = msg;
    document.getElementById('hd-next-btn').textContent = G.hole >= G.holes ? 'Finish Round!' : 'Next Hole';
    show('screen-hole-done');
  }

  function setPhase(phase) {
    ['club', 'shot', 'putt'].forEach(function (p) {
      var el = document.getElementById('phase-' + p);
      if (el) el.classList.toggle('hidden', p !== phase);
    });
  }

  window._golfUndo = function () {
    if (!undoStack.length) return;
    redoStack.push(snap());
    restoreSnap(undoStack.pop());
  };

  window._golfRedo = function () {
    if (!redoStack.length) return;
    undoStack.push(snap());
    restoreSnap(redoStack.pop());
  };

  function refreshUndoUI() {
    setDisabled('golf-undo-btn',    !undoStack.length);
    setDisabled('golf-undo-btn-hd', !undoStack.length);
    setDisabled('golf-redo-btn',    !redoStack.length);
  }

  function setDisabled(id, val) {
    var el = document.getElementById(id);
    if (el) el.disabled = val;
  }

  // ─── Inject undo/redo buttons ─────────────────────────────────────────────────
  window.addEventListener('load', function () {
    injectUndoUI();
    patchFunctions();
  });

  function injectUndoUI() {
    // Shared button style
    var s = document.createElement('style');
    s.textContent =
      '#golf-undo-btn:disabled,#golf-redo-btn:disabled,#golf-undo-btn-hd:disabled{opacity:.3;cursor:default}' +
      '.golf-undo-bar{display:flex;justify-content:flex-end;gap:8px;padding:4px 12px 2px}' +
      '.golf-undo-bar button{font-family:Poppins,sans-serif;font-size:13px;font-weight:700;' +
        'padding:6px 14px;border:none;border-radius:10px;cursor:pointer;' +
        'background:#e8f5e9;color:#2d5a27;transition:background .15s}' +
      '.golf-undo-bar button:not(:disabled):active{background:#c8e6c9}';
    document.head.appendChild(s);

    // Undo/redo bar on game screen (above progress dots)
    var bar = document.createElement('div');
    bar.className = 'golf-undo-bar';
    bar.innerHTML =
      '<button id="golf-undo-btn" disabled onclick="window._golfUndo()">↩ Undo</button>' +
      '<button id="golf-redo-btn" disabled onclick="window._golfRedo()">Redo ↪</button>';
    var progress = document.getElementById('progress');
    if (progress && progress.parentNode) progress.parentNode.insertBefore(bar, progress);

    // Undo-only bar on hole-done screen (above Next Hole button)
    var hdBar = document.createElement('div');
    hdBar.className = 'golf-undo-bar';
    hdBar.innerHTML = '<button id="golf-undo-btn-hd" disabled onclick="window._golfUndo()">↩ Undo last shot</button>';
    var nextBtn = document.getElementById('hd-next-btn');
    if (nextBtn && nextBtn.parentNode) nextBtn.parentNode.insertBefore(hdBar, nextBtn);
  }

  // ─── Patch golf.html functions ────────────────────────────────────────────────
  function patchFunctions() {

    // addShot — tap tally bar directly
    var _addShot = window.addShot;
    window.addShot = function () { push(); _addShot.call(this); };

    // recordShot — quality button (sets quality then calls addShot)
    var _recordShot = window.recordShot;
    window.recordShot = function (quality) {
      push(); suppressSnap = true;
      _recordShot.call(this, quality);
      suppressSnap = false;
    };

    // addPutt — tap putt tally bar
    var _addPutt = window.addPutt;
    window.addPutt = function () { push(); _addPutt.call(this); };

    // recordPutt — putt result button (may call finishHole via timeout)
    var _recordPutt = window.recordPutt;
    window.recordPutt = function (result) {
      push(); suppressSnap = true;
      _recordPutt.call(this, result);
      suppressSnap = false;
    };

    // pickDirection — direction button
    var _pickDirection = window.pickDirection;
    window.pickDirection = function (dir) { push(); _pickDirection.call(this, dir); };

    // pickClub — club selection
    var _pickClub = window.pickClub;
    window.pickClub = function (club) { push(); _pickClub.call(this, club); };

    // goNextClub — "Choose next club"
    var _goNextClub = window.goNextClub;
    window.goNextClub = function () { push(); _goNextClub.call(this); };

    // goToPutting — "On the green!"
    var _goToPutting = window.goToPutting;
    window.goToPutting = function () { push(); _goToPutting.call(this); };

    // finishHole — after a hole is completed, update DB
    var _finishHole = window.finishHole;
    window.finishHole = function () {
      _finishHole.call(this);
      refreshUndoUI();
      updateDraftRound();
    };

    // showScorecard — progress view mid-round, complete view when all holes done
    var _showScorecard = window.showScorecard;
    window.showScorecard = function () {
      _showScorecard.call(this);
      var isComplete = G.allHoleData.length >= G.holes;
      var btn = document.querySelector('#screen-scorecard .btn-gold');
      if (!btn) return;
      if (isComplete) {
        btn.textContent = 'Play Again!';
        btn.onclick     = window.newGame;
        completeRound();
      } else {
        btn.textContent = '← Back to hole';
        btn.className   = 'btn btn-green';
        btn.onclick     = function () { show('screen-hole-done'); };
      }
    };

    // startGame — new game resets stacks and creates draft round in DB
    var _startGame = window.startGame;
    window.startGame = function () {
      _startGame.call(this);
      undoStack = []; redoStack = [];
      currentRoundId = null;
      refreshUndoUI();
      createDraftRound();
    };

    // newGame — reset everything
    var _newGame = window.newGame;
    window.newGame = function () {
      undoStack = []; redoStack = [];
      currentRoundId = null;
      refreshUndoUI();
      _newGame.call(this);
    };
  }

  // ─── Round persistence ────────────────────────────────────────────────────────
  var currentRoundId = null;

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
  }

  function handleUnauthorized() {
    localStorage.removeItem('golf_token');
    localStorage.removeItem('golf_username');
    window.location.replace(BASE || '/');
  }

  async function createDraftRound() {
    try {
      var res = await fetch(API + '/api/v1/golf/rounds', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ course: G.course, holes: G.holes, totalShots: 0, holeData: [], status: 'in_progress' }),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      var json = await res.json();
      if (json.success) currentRoundId = json.data.id;
    } catch (e) { console.warn('[Golf] createDraftRound:', e); }
  }

  async function updateDraftRound() {
    if (!currentRoundId) return;
    try {
      var shots = G.allHoleData.reduce(function (s, h) { return s + h.total; }, 0);
      var res = await fetch(API + '/api/v1/golf/rounds/' + currentRoundId, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ totalShots: shots, holeData: G.allHoleData, status: 'in_progress' }),
      });
      if (res.status === 401) { handleUnauthorized(); }
    } catch (e) { console.warn('[Golf] updateDraftRound:', e); }
  }

  async function completeRound() {
    if (!currentRoundId) return;
    try {
      var shots = G.allHoleData.reduce(function (s, h) { return s + h.total; }, 0);
      var res = await fetch(API + '/api/v1/golf/rounds/' + currentRoundId, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ totalShots: shots, holeData: G.allHoleData, status: 'complete' }),
      });
      if (res.status === 401) { handleUnauthorized(); }
    } catch (e) { console.warn('[Golf] completeRound:', e); }
  }
})();
