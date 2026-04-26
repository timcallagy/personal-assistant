(function () {
  'use strict';

  const API = window.GOLF_API_URL || '';
  const BASE = window.GOLF_BASE_PATH || '';
  const token = localStorage.getItem('golf_token');

  // Redirect to login if not authenticated
  if (!token) {
    window.location.replace(BASE || '/');
    return;
  }

  var currentRoundId = null;

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
  }

  function handleUnauthorized() {
    localStorage.removeItem('golf_token');
    localStorage.removeItem('golf_username');
    window.location.replace(BASE || '/');
  }

  // Create a draft round at the start of the game
  async function createDraftRound() {
    try {
      var res = await fetch(API + '/api/v1/golf/rounds', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          course: G.course,
          holes: G.holes,
          totalShots: 0,
          holeData: [],
          status: 'in_progress',
        }),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      var json = await res.json();
      if (json.success) currentRoundId = json.data.id;
    } catch (err) {
      console.warn('[Golf] Failed to create draft round:', err);
    }
  }

  // Update the draft round after each hole is finished
  async function updateDraftRound() {
    if (!currentRoundId) return;
    try {
      var totalShots = G.allHoleData.reduce(function (s, h) { return s + h.total; }, 0);
      var res = await fetch(API + '/api/v1/golf/rounds/' + currentRoundId, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          totalShots: totalShots,
          holeData: G.allHoleData,
          status: 'in_progress',
        }),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) {
        var json = await res.json().catch(function () { return {}; });
        console.warn('[Golf] Failed to update round:', json.error?.message || res.status);
      }
    } catch (err) {
      console.warn('[Golf] Failed to update round:', err);
    }
  }

  // Mark the round as complete when the scorecard is shown
  async function completeRound() {
    if (!currentRoundId) return;
    try {
      var totalShots = G.allHoleData.reduce(function (s, h) { return s + h.total; }, 0);
      var res = await fetch(API + '/api/v1/golf/rounds/' + currentRoundId, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          totalShots: totalShots,
          holeData: G.allHoleData,
          status: 'complete',
        }),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
    } catch (err) {
      console.warn('[Golf] Failed to complete round:', err);
    }
  }

  window.addEventListener('load', function () {
    // Patch startGame: create a draft round in the DB when the game begins
    var _startGame = window.startGame;
    window.startGame = function () {
      _startGame.call(this);
      currentRoundId = null;
      createDraftRound();
    };

    // Patch finishHole: save completed hole data to the draft round
    var _finishHole = window.finishHole;
    window.finishHole = function () {
      _finishHole.call(this);
      updateDraftRound();
    };

    // Patch showScorecard: mark the round as complete
    var _showScorecard = window.showScorecard;
    window.showScorecard = function () {
      _showScorecard.call(this);
      completeRound();
    };

    // Patch newGame: reset round tracking for the next game
    var _newGame = window.newGame;
    window.newGame = function () {
      currentRoundId = null;
      _newGame.call(this);
    };
  });
})();
