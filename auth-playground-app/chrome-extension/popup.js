/**
 * Popup script – shows connection status and request statistics.
 */

const statusEl = document.getElementById('status');
const statusTextEl = document.getElementById('statusText');
const totalEl = document.getElementById('totalCount');
const successEl = document.getElementById('successCount');
const failedEl = document.getElementById('failedCount');

async function refresh() {
  try {
    const stats = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
    totalEl.textContent = stats.total;
    successEl.textContent = stats.success;
    failedEl.textContent = stats.failed;

    statusEl.classList.remove('inactive');
    statusEl.classList.add('active');
    statusTextEl.textContent = 'Bridge active';
  } catch {
    statusEl.classList.remove('active');
    statusEl.classList.add('inactive');
    statusTextEl.textContent = 'Service worker unavailable';
  }
}

refresh();
// Auto-refresh while the popup is open
setInterval(refresh, 2000);
