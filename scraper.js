(() => {
  var allText = document.body.innerText;

  // ── 1. AGENT NAME — last match = composer label ──
  var agentName = 'Unknown_Agent';
  var agentMatch = allText.match(/([\w][\w\-]*[\s\-]+\d+\.?\d*\s+(?:High|Medium|Low))/ig);
  if (agentMatch && agentMatch.length > 0) {
    agentName = agentMatch[agentMatch.length - 1].trim();
  }
  var safeAgent = agentName.replace(/\s+/g, '-');

  // ── 2. TASK NAME — header span or first meaningful line ──
  var taskName = null;
  // Try the page header element first (most reliable)
  var headerEl = document.querySelector('[class*="text-lg"][class*="font-medium"]');
  if (headerEl && headerEl.textContent.trim().length > 2) {
    taskName = headerEl.textContent.trim();
  }
  // Fallback: first non-UI line of page text
  if (!taskName) {
    var fLines = allText.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
    var skipSet = {'new agent':1, 'dashboard':1, 'automations':1, 'agents':1, 'yesterday':1, 'search':1, 'view pr':1, 'chat':1, 'diff':1};
    for (var li = 0; li < Math.min(fLines.length, 10); li++) {
      var fl = fLines[li];
      if (fl.length > 3 && fl.length < 120 && !skipSet[fl.toLowerCase()]) {
        taskName = fl; break;
      }
    }
  }

  // ── 3. CHAT CONTENT — ALL .prose nodes joined ──
  var chatContent = '';
  var proseNodes = document.querySelectorAll('.prose');
  if (proseNodes.length > 0) {
    chatContent = Array.from(proseNodes)
      .map(function(n) { return n.innerText.trim(); })
      .filter(function(t) { return t.length > 0; })
      .join('\n\n---\n\n');
  }

  // ── 4. FILES — grab ALL file-tree nodes in DOM order, group by label ──
  var uniqueFiles = [];

  // Collect every file-tree-related span in document order
  var allTreeNodes = document.querySelectorAll(
    '[class*="file-tree-entry__label"], [class*="file-tree-entry__diff-add"], [class*="file-tree-entry__diff-del"], [class*="file-tree-entry__deleted"]'
  );

  if (allTreeNodes.length > 0) {
    var current = null;
    var entries = [];
    allTreeNodes.forEach(function(node) {
      var cls = node.className || '';
      var txt = node.textContent.trim();
      if (cls.indexOf('__label') > -1) {
        // New file
        if (current) entries.push(current);
        current = { file: txt, added: null, removed: null };
      } else if (current) {
        if (cls.indexOf('diff-add') > -1 && !current.added) {
          current.added = txt.startsWith('+') ? txt : '+' + txt;
        }
        if (cls.indexOf('diff-del') > -1 && !current.removed) {
          current.removed = txt.startsWith('-') ? txt : '-' + txt;
        }
        if ((cls.indexOf('deleted') > -1 || txt === 'Deleted') && !current.removed) {
          current.removed = 'Deleted';
        }
      }
    });
    if (current) entries.push(current);

    var seenA = {};
    uniqueFiles = entries.filter(function(f) { if (seenA[f.file]) return false; seenA[f.file] = 1; return true; });
  }

  // Fallback: innerText — LAST "Files Changed" block
  if (uniqueFiles.length === 0) {
    var positions = [];
    var reFC = /\d+\s+Files?\s+Changed/ig;
    var mFC;
    while ((mFC = reFC.exec(allText)) !== null) positions.push(mFC.index);
    if (positions.length > 0) {
      var lastPos = positions[positions.length - 1];
      var blockMatch = allText.slice(lastPos).match(/\d+\s+Files?\s+Changed([\s\S]*?)(?=Add a follow|$)/i);
      if (blockMatch) {
        var bLines = blockMatch[1].split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
        var fStats = [];
        for (var bi = 0; bi < bLines.length; bi++) {
          var bLine = bLines[bi];
          if (/\.\w{1,5}$/.test(bLine) && !/^\+/.test(bLine) && !/^-\d/.test(bLine)) {
            var ent = { file: bLine, added: null, removed: null };
            for (var bj = 1; bj <= 2; bj++) {
              var nxt = bLines[bi + bj] || '';
              if (/^\+\d+$/.test(nxt) && !ent.added) ent.added = nxt;
              if (/^-\d+$/.test(nxt) && !ent.removed) ent.removed = nxt;
              if (nxt === 'Deleted') ent.removed = 'Deleted';
            }
            fStats.push(ent);
          }
        }
        var seenB = {};
        uniqueFiles = fStats.filter(function(f) { if (seenB[f.file]) return false; seenB[f.file] = 1; return true; });
      }
    }
  }

  // ── 5. TOTAL STATS ──
  var totalAdded = null, totalRemoved = null;
  var insDelMatch = allText.match(/(\d+)\s+insertions?,?\s*(\d+)\s+deletions?/i);
  if (insDelMatch) {
    totalAdded = '+' + insDelMatch[1]; totalRemoved = '-' + insDelMatch[2];
  }
  if (!totalAdded) {
    var statMatch = allText.match(/(\+\d+)\s+(-\d+)/);
    if (statMatch) { totalAdded = statMatch[1]; totalRemoved = statMatch[2]; }
  }

  // ── 6. WORK TIME ──
  var workTime = null;
  var timeMatch = allText.match(/Work(?:ing|ed)\s+for\s+(\d+[hms][\d\s hms]*)/i);
  if (timeMatch) workTime = timeMatch[1].trim();

  // ── 7. STATUS ──
  var status = 'unknown';
  if (/Working for/i.test(allText)) status = 'running';
  else if (/Worked for/i.test(allText) || /Task completed/i.test(allText)) status = 'completed';

  // ── 8. GIT ──
  var gitBranch = (allText.match(/cursor\/[\w\-]+-[a-f0-9]{4}/) || [null])[0];
  var commitHash = (allText.match(/\b([a-f0-9]{7})\b(?=\s+on branch|\s+contains)/i) || (allText.match(/Commit:\s*([a-f0-9]{7,40})/i)) || [null, null])[1];
  var commitMsg = (allText.match(/((?:fix|feat|chore|refactor|build|ci|docs|style|test|perf):\s*[^\n]+)/i) || [null, null])[1];
  if (commitMsg) commitMsg = commitMsg.trim();

  // ── 9. PR — brute force every <a> on the page ──
  var prNumber = null, prUrl = null;
  try {
    var allLinks = document.getElementsByTagName('a');
    for (var ai = 0; ai < allLinks.length; ai++) {
      var href = '';
      try { href = allLinks[ai].href || allLinks[ai].getAttribute('href') || ''; } catch(e) {}
      if (href.indexOf('/pull/') > -1) {
        prUrl = href;
        var prM = href.match(/\/pull\/(\d+)/);
        if (prM) prNumber = '#' + prM[1];
        break;
      }
    }
  } catch(e) {}
  // Fallback: scan text
  if (!prNumber) {
    var prText = allText.match(/#(\d{1,5})\s*[↗↑→⬀]/);
    if (prText) prNumber = '#' + prText[1];
  }
  // Fallback 2: "Mark as ready" area often has "#NNN" nearby
  if (!prNumber) {
    var prText2 = allText.match(/(?:pipeline|improve|provenance|fix|feat)[^\n]*?#(\d{1,5})/i);
    if (prText2) prNumber = '#' + prText2[1];
  }
  var prTitle = (allText.match(/PR title[^:]*:\s*([^\n]+)/i) || [null, null])[1];
  if (prTitle) prTitle = prTitle.trim();

  // ── 10. PAYLOAD ──
  var payload = {
    agentName: agentName,
    url: location.href,
    capturedAt: new Date().toISOString(),
    taskName: taskName,
    status: status,
    workTime: workTime,
    totalAdded: totalAdded,
    totalRemoved: totalRemoved,
    filesChangedCount: uniqueFiles.length || null,
    filesList: uniqueFiles,
    gitBranch: gitBranch,
    commitHash: commitHash,
    commitMessage: commitMsg,
    prNumber: prNumber,
    prUrl: prUrl,
    prTitle: prTitle,
    chatContent: chatContent
  };

  // ── 11. DOWNLOAD ──
  var ts = new Date().toISOString().slice(0, 16).replace(/[:.]/g, '-');
  var filename = safeAgent + '_' + ts + '.json';
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  // ── 12. TOAST ──
  var toast = document.createElement('div');
  var toastMsg = '✅ <strong>' + agentName + '</strong> — ' + (uniqueFiles.length || 0) + ' files';
  if (status === 'running') toastMsg += ' (still running)';
  toast.innerHTML = toastMsg;
  Object.assign(toast.style, {
    position: 'fixed', bottom: '24px', right: '24px', zIndex: '999999',
    background: status === 'running' ? '#d97706' : '#16a34a', color: 'white', padding: '12px 20px',
    borderRadius: '8px', fontSize: '14px', fontFamily: '-apple-system, sans-serif',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)', transition: 'opacity 0.3s',
  });
  document.body.appendChild(toast);
  setTimeout(function() { toast.style.opacity = '0'; setTimeout(function() { toast.remove(); }, 300); }, 2500);
})();
