const urlInput = document.getElementById('serverUrl')
const saveBtn = document.getElementById('save')
const statusEl = document.getElementById('status')
const pendingSection = document.getElementById('pending-section')

chrome.storage.sync.get('serverUrl', (d) => {
  urlInput.value = d.serverUrl || 'http://134.122.118.9:3001'
  loadPending(urlInput.value)
})

saveBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim().replace(/\/$/, '')
  chrome.storage.sync.set({ serverUrl: url })
  try {
    const r = await fetch(`${url}/api/health`)
    if (r.ok) {
      statusEl.textContent = '✓ Connected'
      statusEl.className = 'ok'
      loadPending(url)
    } else {
      statusEl.textContent = '✗ Server not reachable'
      statusEl.className = 'err'
    }
  } catch {
    statusEl.textContent = '✗ Cannot connect to server'
    statusEl.className = 'err'
  }
})

async function loadPending(url) {
  try {
    const r = await fetch(`${url}/api/pending-fill`, { cache: 'no-store' })
    if (!r.ok) { pendingSection.innerHTML = ''; return }
    const data = await r.json()
    if (data && data.listing_title) {
      pendingSection.innerHTML = `
        <div style="font-size:12px;color:#9ca3af;margin-bottom:6px">Pending Application</div>
        <div class="pending-box">
          <div class="pending-title">${data.listing_title}</div>
          <div class="pending-org">${data.listing_org || ''}</div>
        </div>
        <button class="clear-btn" id="clear-btn">Clear Pending</button>
      `
      document.getElementById('clear-btn').addEventListener('click', async () => {
        await fetch(`${url}/api/pending-fill`, { method: 'DELETE' })
        pendingSection.innerHTML = '<div style="font-size:12px;color:#6b7280">No pending application.</div>'
      })
    } else {
      pendingSection.innerHTML = '<div style="font-size:12px;color:#6b7280">No pending application.<br>Click "Apply & Track" in ApplyAI to queue one.</div>'
    }
  } catch {
    pendingSection.innerHTML = ''
  }
}
