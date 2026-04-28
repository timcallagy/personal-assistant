import { NextResponse } from 'next/server';

const API_URL = (process.env['NEXT_PUBLIC_API_URL'] ?? 'https://mail.babblo.app')
  .replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
const BASE_PATH = '/golf';

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Round Details — Lola's Golf Tracker</title>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body { font-family: 'Poppins', sans-serif; background: #1a3d14; min-height: 100vh; display: flex; justify-content: center; }
    .app { width: 100%; max-width: 600px; min-height: 100vh; background: #f0f7ee; }
    .header { background: #2d5a27; color: white; padding: 22px 20px 18px; border-radius: 0 0 24px 24px; }
    .header h1 { font-family: 'Dancing Script', cursive; font-size: 26px; }
    .header .sub { font-size: 13px; opacity: 0.8; margin-top: 4px; }
    .back-btn { display: inline-block; font-size: 13px; color: rgba(255,255,255,0.8); text-decoration: none; margin-bottom: 10px; }
    .back-btn:hover { color: white; }
    .content { padding: 16px; }
    .summary-card {
      background: white; border-radius: 16px; padding: 18px;
      margin-bottom: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
    .summary-item .label { font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-item .value { font-size: 18px; font-weight: 700; color: #2d5a27; margin-top: 2px; }
    .summary-item .value.big { font-size: 28px; }
    .badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; }
    .badge-complete { background: #e8f5e9; color: #2d5a27; }
    .badge-progress { background: #fff8e1; color: #c8850a; }
    .section-title { font-size: 15px; font-weight: 700; color: #555; margin: 4px 0 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .hole-card { background: white; border-radius: 14px; margin-bottom: 10px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.07); }
    .hole-header { background: #2d5a27; color: white; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; }
    .hole-header .hole-num { font-size: 15px; font-weight: 700; }
    .hole-header .hole-total { font-size: 15px; font-weight: 700; }
    .club-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 10px 14px; border-bottom: 1px solid #f0f0f0; }
    .club-row:last-child { border-bottom: none; }
    .quality-dot { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; }
    .q-good { background: #e8f5e9; }
    .q-ok   { background: #fff8e1; }
    .q-bad  { background: #ffe5e5; }
    .q-putt { background: #e3f2fd; }
    .club-name { flex: 1; font-size: 14px; font-weight: 600; color: #333; }
    .club-shots { font-size: 13px; color: #777; white-space: nowrap; }
    .club-extras { width: 100%; padding-left: 40px; font-size: 12px; color: #888; display: flex; gap: 10px; flex-wrap: wrap; }
    .dir { color: #2d5a27; font-weight: 600; }
    .comment { font-style: italic; }
    .loading { text-align: center; padding: 48px 20px; color: #555; }
    .error { background: #ffe5e5; border-radius: 12px; padding: 16px; margin: 16px 0; color: #c0392b; font-size: 14px; text-align: center; }
  </style>
  <script>window.GOLF_API_URL='${API_URL}';window.GOLF_BASE_PATH='${BASE_PATH}';</script>
</head>
<body>
<div class="app">
  <div class="header">
    <a class="back-btn" href="${BASE_PATH}/stats">← Back to all rounds</a>
    <h1 id="header-title">Round Details</h1>
    <div class="sub" id="header-sub"></div>
  </div>
  <div class="content">
    <div id="state-loading" class="loading">Loading round…</div>
    <div id="state-error" class="error" style="display:none"></div>
    <div id="state-content" style="display:none"></div>
  </div>
</div>
<script>
  var API = window.GOLF_API_URL || '';
  var BASE = window.GOLF_BASE_PATH || '';
  var token = localStorage.getItem('golf_token');

  if (!token) { window.location.replace(BASE || '/'); }
  else {
    var parts = window.location.pathname.split('/').filter(Boolean);
    var roundId = parts[parts.length - 1];
    loadRound(roundId);
  }

  async function loadRound(id) {
    try {
      var res = await fetch(API + '/api/v1/golf/all-rounds/' + id, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (res.status === 401) {
        localStorage.removeItem('golf_token');
        window.location.replace(BASE || '/');
        return;
      }
      if (res.status === 404) {
        showError('Round not found.');
        return;
      }
      var json = await res.json();
      var round = json.data;

      var courseHoles = [];
      try {
        var holesRes = await fetch(API + '/api/v1/golf/courses/' + encodeURIComponent(round.course) + '/holes', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (holesRes.ok) {
          var holesJson = await holesRes.json();
          courseHoles = holesJson.data || [];
        }
      } catch (e) { /* no hole data — par/SI columns stay blank */ }

      renderRound(round, courseHoles);
    } catch (e) {
      showError('Could not load round. Please try again.');
    }
  }

  function renderRound(r, courseHoles) {
    hide('state-loading');
    courseHoles = courseHoles || [];
    var name = cap(r.user ? r.user.username : 'Unknown');
    var date = new Date(r.playedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    var played = Array.isArray(r.holeData) ? r.holeData.length : 0;
    var holesStr = r.status === 'complete' ? r.holes + ' holes' : played + '/' + r.holes + ' holes';
    var complete = r.status === 'complete';

    document.getElementById('header-title').textContent = name + ' · ' + r.course;
    document.getElementById('header-sub').textContent = date;

    var html = '<div class="summary-card">' +
      '<span class="badge ' + (complete ? 'badge-complete' : 'badge-progress') + '">' +
        (complete ? 'Complete' : 'In Progress') +
      '</span>' +
      '<div class="summary-grid">' +
        '<div class="summary-item"><div class="label">Total shots</div><div class="value big">' + r.totalShots + '</div></div>' +
        '<div class="summary-item"><div class="label">Holes played</div><div class="value big">' + holesStr + '</div></div>' +
        '<div class="summary-item"><div class="label">Course</div><div class="value" style="font-size:14px">' + r.course + '</div></div>' +
        '<div class="summary-item"><div class="label">Date</div><div class="value" style="font-size:14px">' + date + '</div></div>' +
      '</div>' +
    '</div>';

    if (r.holeData && r.holeData.length > 0) {
      html += '<div class="section-title">Hole by Hole</div>';
      r.holeData.forEach(function(hole, i) {
        var holeNum = i + 1;
        var holeInfo = courseHoles.find(function(h) { return h.holeNumber === holeNum; });
        var parSiHtml = holeInfo
          ? '<div style="font-size:11px;opacity:0.75;margin-top:2px;">Par ' + holeInfo.par + ' · SI ' + holeInfo.strokeIndex + '</div>'
          : '';
        html += '<div class="hole-card">' +
          '<div class="hole-header">' +
            '<div><div class="hole-num">Hole ' + holeNum + '</div>' + parSiHtml + '</div>' +
            '<div class="hole-total">' + hole.total + (hole.total === 1 ? ' shot' : ' shots') + '</div>' +
          '</div>';

        if (hole.shots) {
          // New per-shot format
          hole.shots.forEach(function(s) {
            if (s.club === 'Putter') {
              var resultLabel = s.result === 'in' ? 'In!' : s.result === 'short' ? 'Short' : s.result === 'far' ? 'Far' : 'Putt';
              html += '<div class="club-row">' +
                '<div class="quality-dot q-putt">⛳</div>' +
                '<div class="club-name">Putter</div>' +
                '<div class="club-shots">' + resultLabel + '</div>' +
              '</div>';
            } else {
              var qClass = s.quality === 'good' ? 'q-good' : s.quality === 'bad' ? 'q-bad' : 'q-ok';
              var qIcon  = s.quality === 'good' ? '✓' : s.quality === 'bad' ? '✗' : '~';
              html += '<div class="club-row">' +
                '<div class="quality-dot ' + qClass + '">' + qIcon + '</div>' +
                '<div class="club-name">' + s.club + '</div>' +
                '<div class="club-shots">1 shot</div>';
              if (s.direction || s.comment) {
                html += '<div class="club-extras">';
                if (s.direction) html += '<span class="dir">' + cap(s.direction) + '</span>';
                if (s.comment)   html += '<span class="comment">"' + s.comment + '"</span>';
                html += '</div>';
              }
              html += '</div>';
            }
          });
        } else {
          // Legacy per-club format
          (hole.clubs || []).forEach(function(c) {
            var qClass = c.quality === 'good' ? 'q-good' : c.quality === 'bad' ? 'q-bad' : 'q-ok';
            var qIcon  = c.quality === 'good' ? '✓' : c.quality === 'bad' ? '✗' : '~';
            html += '<div class="club-row">' +
              '<div class="quality-dot ' + qClass + '">' + qIcon + '</div>' +
              '<div class="club-name">' + c.club + '</div>' +
              '<div class="club-shots">' + c.shots + (c.shots === 1 ? ' shot' : ' shots') + '</div>';
            if (c.direction || c.comment) {
              html += '<div class="club-extras">';
              if (c.direction) html += '<span class="dir">' + cap(c.direction) + '</span>';
              if (c.comment)   html += '<span class="comment">"' + c.comment + '"</span>';
              html += '</div>';
            }
            html += '</div>';
          });
          if (hole.putts > 0) {
            html += '<div class="club-row">' +
              '<div class="quality-dot q-putt">⛳</div>' +
              '<div class="club-name">Putter</div>' +
              '<div class="club-shots">' + hole.putts + (hole.putts === 1 ? ' putt' : ' putts') + '</div>' +
            '</div>';
          }
        }

        html += '</div>';
      });
    }

    var content = document.getElementById('state-content');
    content.innerHTML = html;
    show('state-content');
  }

  function showError(msg) {
    hide('state-loading');
    var el = document.getElementById('state-error');
    el.textContent = msg;
    show('state-error');
  }

  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function show(id) { document.getElementById(id).style.display = ''; }
  function hide(id) { document.getElementById(id).style.display = 'none'; }
</script>
</body>
</html>`;

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  void params; // ID is read client-side from window.location
  return new NextResponse(HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
