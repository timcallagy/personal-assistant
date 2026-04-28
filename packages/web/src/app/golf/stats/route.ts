import { NextResponse } from 'next/server';

const API_URL = (process.env['NEXT_PUBLIC_API_URL'] ?? 'https://mail.babblo.app')
  .replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
const BASE_PATH = '/golf';

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Round History — Lola's Golf Tracker</title>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body { font-family: 'Poppins', sans-serif; background: #1a3d14; min-height: 100vh; display: flex; justify-content: center; }
    .app { width: 100%; max-width: 600px; min-height: 100vh; background: #f0f7ee; }
    .header { background: #2d5a27; color: white; padding: 22px 20px 18px; text-align: center; border-radius: 0 0 24px 24px; }
    .header h1 { font-family: 'Dancing Script', cursive; font-size: 28px; }
    .header .sub { font-size: 13px; opacity: 0.8; margin-top: 4px; }
    .toolbar { display: flex; justify-content: flex-end; padding: 12px 16px 0; }
    .toggle-btn {
      font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 700;
      padding: 7px 14px; border: none; border-radius: 10px; cursor: pointer;
      background: #e8f5e9; color: #2d5a27; transition: background .15s;
    }
    .toggle-btn.showing-archived { background: #fff8e1; color: #c8850a; }
    .content { padding: 12px 16px 16px; }
    .round-card {
      display: block; text-decoration: none; background: white; border-radius: 16px;
      padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      transition: transform 0.1s; color: inherit; position: relative;
    }
    .round-card:active { transform: scale(0.98); }
    .round-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
    .round-player { font-size: 17px; font-weight: 700; color: #2d5a27; text-transform: capitalize; }
    .badge { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; }
    .badge-complete { background: #e8f5e9; color: #2d5a27; }
    .badge-progress { background: #fff8e1; color: #c8850a; }
    .round-course { font-size: 15px; color: #333; margin-bottom: 8px; }
    .round-meta { display: flex; gap: 14px; font-size: 13px; color: #777; flex-wrap: wrap; align-items: center; }
    .round-score { font-weight: 700; color: #2d5a27; }
    .archive-btn {
      font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 700;
      padding: 5px 11px; border: none; border-radius: 8px; cursor: pointer;
      background: #f0f0f0; color: #888; margin-left: auto; flex-shrink: 0;
      transition: background .15s;
    }
    .archive-btn:hover { background: #e0e0e0; color: #555; }
    .archive-btn.unarchive { background: #fff8e1; color: #c8850a; }
    .archive-btn.unarchive:hover { background: #fdecc4; }
    .empty { text-align: center; padding: 48px 20px; color: #888; font-size: 15px; }
    .loading { text-align: center; padding: 48px 20px; color: #555; font-size: 15px; }
    .error { background: #ffe5e5; border-radius: 12px; padding: 16px; margin: 16px 0; color: #c0392b; font-size: 14px; text-align: center; }
  </style>
  <script>window.GOLF_API_URL='${API_URL}';window.GOLF_BASE_PATH='${BASE_PATH}';</script>
</head>
<body>
<div class="app">
  <div class="header">
    <h1>⛳ Round History</h1>
    <div class="sub" id="header-sub">All players · All rounds</div>
  </div>
  <div class="toolbar">
    <button class="toggle-btn" id="toggle-archived-btn" onclick="toggleArchived()">Show Archived</button>
  </div>
  <div class="content">
    <div id="state-loading" class="loading">Loading rounds…</div>
    <div id="state-error" class="error" style="display:none"></div>
    <div id="state-empty" class="empty" style="display:none">No rounds yet. Go play some golf!</div>
    <div id="rounds-list" style="display:none"></div>
  </div>
</div>
<script>
  var API = window.GOLF_API_URL || '';
  var BASE = window.GOLF_BASE_PATH || '';
  var token = localStorage.getItem('golf_token');
  var showingArchived = false;

  if (!token) { window.location.replace(BASE || '/'); }
  else { loadRounds(); }

  function toggleArchived() {
    showingArchived = !showingArchived;
    var btn = document.getElementById('toggle-archived-btn');
    btn.textContent = showingArchived ? 'Show Active' : 'Show Archived';
    btn.classList.toggle('showing-archived', showingArchived);
    document.getElementById('header-sub').textContent = showingArchived
      ? 'All players · Archived rounds'
      : 'All players · All rounds';
    hide('rounds-list');
    hide('state-empty');
    show('state-loading');
    loadRounds();
  }

  async function loadRounds() {
    try {
      var url = API + '/api/v1/golf/all-rounds' + (showingArchived ? '?archived=true' : '');
      var res = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (res.status === 401) {
        localStorage.removeItem('golf_token');
        window.location.replace(BASE || '/');
        return;
      }
      var json = await res.json();
      renderRounds(json.data || []);
    } catch (e) {
      hide('state-loading');
      show('state-error');
      document.getElementById('state-error').textContent = 'Could not load rounds. Please try again.';
    }
  }

  function renderRounds(rounds) {
    hide('state-loading');
    if (!rounds.length) { show('state-empty'); return; }
    var list = document.getElementById('rounds-list');
    list.style.display = '';
    list.innerHTML = rounds.map(function(r) {
      var played = Array.isArray(r.holeData) ? r.holeData.length : 0;
      var holesStr = r.status === 'complete' ? r.holes + ' holes' : played + '/' + r.holes + ' holes';
      var date = new Date(r.playedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      var name = cap(r.user ? r.user.username : 'Unknown');
      var complete = r.status === 'complete';
      var archived = r.archived;
      return '<div class="round-card">' +
        '<a href="' + BASE + '/stats/' + r.id + '" style="display:block;text-decoration:none;color:inherit;">' +
          '<div class="round-top">' +
            '<div class="round-player">' + name + '</div>' +
            '<span class="badge ' + (complete ? 'badge-complete' : 'badge-progress') + '">' +
              (complete ? 'Complete' : 'In Progress') +
            '</span>' +
          '</div>' +
          '<div class="round-course">' + r.course + '</div>' +
        '</a>' +
        '<div class="round-meta">' +
          '<span>' + date + '</span>' +
          '<span>' + holesStr + '</span>' +
          '<span class="round-score">' + r.totalShots + ' shots</span>' +
          '<button class="archive-btn' + (archived ? ' unarchive' : '') + '" onclick="archiveRound(' + r.id + ',' + !archived + ',this)">' +
            (archived ? 'Unarchive' : 'Archive') +
          '</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  async function archiveRound(id, archive, btn) {
    btn.disabled = true;
    btn.textContent = '…';
    try {
      var res = await fetch(API + '/api/v1/golf/rounds/' + id, {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: archive })
      });
      if (res.ok) {
        // Remove card from current view
        var card = btn.closest('.round-card');
        card.style.transition = 'opacity .2s';
        card.style.opacity = '0';
        setTimeout(function() { card.remove(); }, 200);
      } else {
        btn.disabled = false;
        btn.textContent = archive ? 'Archive' : 'Unarchive';
        alert('Could not update round. Please try again.');
      }
    } catch (e) {
      btn.disabled = false;
      btn.textContent = archive ? 'Archive' : 'Unarchive';
      alert('Could not update round. Please try again.');
    }
  }

  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function show(id) { document.getElementById(id).style.display = ''; }
  function hide(id) { document.getElementById(id).style.display = 'none'; }
</script>
</body>
</html>`;

export async function GET() {
  return new NextResponse(HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
