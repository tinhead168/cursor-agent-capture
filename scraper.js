(() => {
  const allText = document.body.innerText;

  // ── 1. AGENT NAME — last match on page = composer label at bottom ──
  let agentName = 'Unknown_Agent';
  const agentMatch = allText.match(/(Codex|Opus)\s+\d+\.\d+\s+(?:High|Medium|Low)/ig);
  if (agentMatch && agentMatch.length > 0) {
    agentName = agentMatch[agentMatch.length - 1];
  }
  const safeAgent = agentName.replace(/\s+/g, '-');

  // ── 2. CHAT CONTENT — all .prose nodes ──
  let chatContent = '';
  const proseNodes = document.querySelectorAll('.prose');
  if (proseNodes.length > 0) {
    chatContent = Array.from(proseNodes).map(n => n.innerText).join('\n\n---\n\n');
  }
  if (!chatContent) chatContent = '⚠️ No prose content found';

  // ── 3. FILES CHANGED + PER-FILE STATS ──
  const fileStats = [];
  const filesBlockMatch = allText.match(/(\d+)\s+Files?\s+Changed[\s\S]*?(?=Add a follow|$)/i);
  if (filesBlockMatch) {
    const lines = filesBlockMatch[0].split('\n').map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^[A-Za-z0-9_\-]+\.[a-zA-Z]{1,5}$/.test(line)) {
        const entry = { file: line, added: null, removed: null };
        const nextLine = lines[i + 1] || '';
        const addMatch = nextLine.match(/\+(\d+)/);
        const remMatch = nextLine.match(/-(\d+)/);
        if (addMatch) entry.added = `+${addMatch[1]}`;
        if (remMatch) entry.removed = `-${remMatch[1]}`;
        if (addMatch && !remMatch) {
          const lineAfter = lines[i + 2] || '';
          const remMatch2 = lineAfter.match(/^-(\d+)$/);
          if (remMatch2) entry.removed = `-${remMatch2[1]}`;
        }
        fileStats.push(entry);
      }
    }
  }

  // Deduplicate
  const seen = new Set();
  const uniqueFiles = fileStats.filter(f => {
    if (seen.has(f.file)) return false;
    seen.add(f.file);
    return true;
  });

  // ── 4. TILE STATS — total +N -N and file count from tile header ──
  let totalAdded = null, totalRemoved = null, tileFileCount = null;
  const tilePattern = allText.match(/(Codex|Opus)\s+\d+\.\d+\s+(?:High|Medium|Low)\s*\n\s*(\+\d+)\s+(-\d+)\s+(\d+)\s+files?/ig);
  if (tilePattern) {
    const agentFirst = agentName.split(/\s/)[0];
    const ours = tilePattern.find(t => t.toLowerCase().includes(agentFirst.toLowerCase()));
    if (ours) {
      const m = ours.match(/(\+\d+)\s+(-\d+)\s+(\d+)\s+files?/i);
      if (m) { totalAdded = m[1]; totalRemoved = m[2]; tileFileCount = m[3]; }
    }
  }

  // ── 5. WORK TIME ──
  let workTime = null;
  const timeMatch = allText.match(/Worked\s+for\s+([0-9]+m\s+[0-9]+s)/i);
  if (timeMatch) workTime = timeMatch[1].trim();

  // ── 6. GIT INFO ──
  const gitBranch = allText.match(/(?:pushed to|branch)[:\s]*((?:origin\/)?cursor\/[\w\-]+)/i)?.[1] || null;
  const commitMsg = allText.match(/(?:Commit message[^:]*:\s*\n?\s*)((?:fix|feat|chore):[^\n]+)/i)?.[1]?.trim() || null;
  const commitHash = allText.match(/Commit:\s*([a-f0-9]{7,40})/i)?.[1] || null;

  // ── 7. PAYLOAD ──
  const payload = {
    agentName,
    url: location.href,
    capturedAt: new Date().toISOString(),
    workTime,
    totalAdded,
    totalRemoved,
    filesChangedCount: uniqueFiles.length || tileFileCount || null,
    filesList: uniqueFiles,
    gitBranch,
    commitHash,
    commitMessage: commitMsg,
    chatContent
  };

  // ── 8. DOWNLOAD ──
  const ts = new Date().toISOString().slice(0, 16).replace(/[:.]/g, '-');
  const filename = `${safeAgent}_${ts}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  // ── 9. VISUAL TOAST ON PAGE ──
  const toast = document.createElement('div');
  toast.innerHTML = `✅ <strong>${agentName}</strong> captured — ${uniqueFiles.length} files`;
  Object.assign(toast.style, {
    position: 'fixed', bottom: '24px', right: '24px', zIndex: '999999',
    background: '#16a34a', color: 'white', padding: '12px 20px',
    borderRadius: '8px', fontSize: '14px', fontFamily: '-apple-system, sans-serif',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)', transition: 'opacity 0.3s',
  });
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2500);
})();
