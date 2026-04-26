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

  let roundSaved = false;

  // Wait for the page to fully load before patching functions
  window.addEventListener('load', function () {
    // Patch showScorecard: save the round when the scorecard is shown
    const _showScorecard = window.showScorecard;
    window.showScorecard = function () {
      _showScorecard.call(this);
      if (!roundSaved && window.G && G.allHoleData && G.allHoleData.length > 0) {
        roundSaved = true;
        saveRound();
      }
    };

    // Patch newGame: reset saved flag so the next round can be saved
    const _newGame = window.newGame;
    window.newGame = function () {
      roundSaved = false;
      _newGame.call(this);
    };
  });

  async function saveRound() {
    try {
      const totalShots = G.allHoleData.reduce(function (sum, h) { return sum + h.total; }, 0);
      const res = await fetch(API + '/api/v1/golf/rounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({
          course: G.course,
          holes: G.holes,
          totalShots: totalShots,
          holeData: G.allHoleData,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(function () { return {}; });
        if (res.status === 401) {
          // Token expired — clear and redirect to login
          localStorage.removeItem('golf_token');
          localStorage.removeItem('golf_username');
          window.location.replace(BASE || '/');
        } else {
          console.warn('[Golf] Round save failed:', json.error?.message || res.status);
        }
      }
    } catch (err) {
      console.warn('[Golf] Round save error:', err);
    }
  }
})();
