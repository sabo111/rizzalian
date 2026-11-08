// Shows the Statistics button in the footer only for admins.
// Cosmetic only: the real protection is the admin-only RLS policy on the stats tables.
(async function () {
  try {
    const btn = document.getElementById('statsNavBtn');
    if (!btn || typeof supabaseClient === 'undefined') return;
    const { data } = await supabaseClient.rpc('is_admin');
    if (data === true) btn.style.display = '';
  } catch (err) {
    console.error('Admin check failed:', err);
  }
})();
