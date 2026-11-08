// Unmatch helper. Load after the page script (uses its supabaseClient).
// Reporting and blocking have been removed.
(function () {
  async function unmatch(matchId, name) {
    if (!confirm(`Unmatch ${name}? The chat will be deleted.`)) return false;
    const { error } = await supabaseClient.rpc('unmatch', { p_match_id: matchId });
    if (error) { alert('Could not unmatch: ' + error.message); return false; }
    return true;
  }

  window.Safety = { unmatch };
})();