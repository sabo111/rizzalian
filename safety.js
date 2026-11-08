// Report / block / unmatch helpers. Load after the page script (uses its supabaseClient).
(function () {
  const REASONS = [
    ['harassment', 'Harassment or abusive messages'],
    ['fake', 'Fake profile or impersonation'],
    ['inappropriate', 'Inappropriate photos or content'],
    ['spam', 'Spam or scam'],
    ['underage', 'Seems underage'],
    ['other', 'Something else'],
  ];

  const style = document.createElement('style');
  style.textContent = `
    .safety-overlay{position:fixed;inset:0;z-index:4000;background:rgba(0,10,41,.8);display:flex;align-items:center;justify-content:center;padding:16px}
    .safety-overlay[hidden]{display:none}
    .safety-box{background:#fff;color:#0a1e66;border-radius:18px;padding:22px;width:min(380px,100%);display:flex;flex-direction:column;gap:12px}
    .safety-box select,.safety-box textarea{width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:10px;font:inherit}
    .safety-box textarea{height:80px;resize:none}
    .safety-box label{font-size:14px;display:flex;gap:8px;align-items:center}
    .safety-buttons{display:flex;gap:10px}
    .safety-buttons button{flex:1;padding:10px;border:2px solid #facc15;border-radius:24px;background:#fff;color:#0a1e66;font-weight:600;cursor:pointer}
    .safety-buttons button[type=submit]{background:#facc15}`;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'safety-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <form class="safety-box" id="reportForm">
      <h3>Report <span id="reportName"></span></h3>
      <select id="reportReason" required>
        <option value="" disabled selected>Choose a reason</option>
        ${REASONS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}
      </select>
      <textarea id="reportDetails" maxlength="500" placeholder="Details (optional)"></textarea>
      <label><input type="checkbox" id="reportAlsoBlock" checked> Also block this person</label>
      <div class="safety-buttons">
        <button type="button" id="reportCancel">Cancel</button>
        <button type="submit">Send report</button>
      </div>
    </form>`;
  document.body.appendChild(overlay);

  const $ = (id) => overlay.querySelector('#' + id);
  const myId = async () => (await supabaseClient.auth.getSession()).data.session?.user.id;

  async function insertBlock(me, userId) {
    const { error } = await supabaseClient.from('blocks').insert([{ blocker_id: me, blocked_id: userId }]);
    if (error && error.code !== '23505') { alert('Could not block: ' + error.message); return false; }
    return true;
  }

  // resolves { done, blocked }
  function report(userId, name, matchId) {
    return new Promise((resolve) => {
      $('reportName').textContent = name;
      $('reportForm').reset();
      overlay.hidden = false;

      const close = (result) => {
        overlay.hidden = true;
        $('reportForm').onsubmit = null;
        $('reportCancel').onclick = null;
        resolve(result);
      };
      $('reportCancel').onclick = () => close({ done: false, blocked: false });
      $('reportForm').onsubmit = async (e) => {
        e.preventDefault();
        const me = await myId();
        const { error } = await supabaseClient.from('reports').insert([{
          reporter_id: me,
          reported_id: userId,
          match_id: matchId || null,
          reason: $('reportReason').value,
          details: $('reportDetails').value.trim() || null,
        }]);
        if (error && error.code !== '23505') { alert('Could not send report: ' + error.message); return; }
        let blocked = false;
        if ($('reportAlsoBlock').checked) blocked = await insertBlock(me, userId);
        alert('Thanks. Your report was sent to the moderators.');
        close({ done: true, blocked });
      };
    });
  }

  async function block(userId, name) {
    if (!confirm(`Block ${name}? You won't see each other anymore, and any match and chat will be deleted.`)) return false;
    return insertBlock(await myId(), userId);
  }

  async function unmatch(matchId, name) {
    if (!confirm(`Unmatch ${name}? The chat will be deleted.`)) return false;
    const { error } = await supabaseClient.rpc('unmatch', { p_match_id: matchId });
    if (error) { alert('Could not unmatch: ' + error.message); return false; }
    return true;
  }

  window.Safety = { report, block, unmatch };
})();
