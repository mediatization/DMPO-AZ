const electron = require('electron');

const submitPassphrase = async() => {
    const passphrase = document.getElementById("part-passphrase").value
	const res = await electron.ipcRenderer.invoke("check-passphrase", { passphrase })
    if (res)
        electron.ipcRenderer.send("passphrase-correct")
}