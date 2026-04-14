const { ipcRenderer } = require('electron');

async function load() {
  const s = await ipcRenderer.invoke('get-settings')
  if (!s) return
  document.getElementById('accountName').value = s.accountName || ''
  document.getElementById('accountUrl').value = s.accountUrl || ''
  document.getElementById('accountKey').value = s.accountKey || ''
  document.getElementById('appFolder').value = s.appFolder || ''
  document.getElementById('uploadAddress').value = s.uploadAddress || ''
  document.getElementById('javaPath').value = s.javaPath || ''
}

document.getElementById('save').onclick = async () => {
  const obj = {
    accountName: document.getElementById('accountName').value || null,
    accountUrl: document.getElementById('accountUrl').value || null,
    accountKey: document.getElementById('accountKey').value || null,
    appFolder: document.getElementById('appFolder').value || null,
    uploadAddress: document.getElementById('uploadAddress').value || null,
    javaPath: document.getElementById('javaPath').value || null,
  }
  try {
    await ipcRenderer.invoke('save-settings', obj)
    document.getElementById('status').innerText = 'Saved.'
    setTimeout(() => document.getElementById('status').innerText = '', 2000)
  } catch (e) {
    document.getElementById('status').innerText = 'Save failed'
  }
}

document.getElementById('close').onclick = () => {
  window.close()
}

load()
