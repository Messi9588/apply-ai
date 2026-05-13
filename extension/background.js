// Set default server URL on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get('serverUrl', (data) => {
    if (!data.serverUrl) {
      chrome.storage.sync.set({ serverUrl: 'http://134.122.118.9:3001' })
    }
  })
})
