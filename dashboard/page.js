const { dialog } = require('electron');
const electron = require('electron');
const { ipcRenderer } = require('electron/renderer');

let data = [];

let enforceSecurityCleanup = false; // Default to true

// track per-key download progress: { '<key>': { downloaded, total } }
let downloadProgress = {}

// small helper used in a few places
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

// download notification management so messages persist across refreshes
let downloadNotifTimeout = null
function setDownloadNotif(text, duration = 3000) {
    const el = document.getElementById("download-notif")
    if (!el) return
    // show text and keep visible for `duration` ms
    el.innerText = text
    el.style.display = "inline-block"
    if (downloadNotifTimeout) {
        clearTimeout(downloadNotifTimeout)
    }
    downloadNotifTimeout = setTimeout(() => {
        el.innerText = ""
        el.style.display = "none"
        downloadNotifTimeout = null
    }, duration)
}

function main() {
    electron.ipcRenderer.invoke("fetch-data", { full: true })
    document.getElementById("refresh-button").onclick = () => {
        electron.ipcRenderer.invoke("fetch-data", { full: true })
    }
    document.getElementById("onboard-button").onclick = () => {
        ipcRenderer.invoke("open-onboard-window" )
    }
    document.getElementById("image-analysis").onclick = () => {
        ipcRenderer.invoke("open-image-analysis" )
    }    
    document.getElementById("onboard-button").style.display = "block";

    ipcRenderer.on("update-security-settings", (e, args) => { 
        enforceSecurityCleanup = args.enforceSecurityCleanup;
    });


    ipcRenderer.on("update-data", (e, args) => { 
        data = args
        render()
    })
    // download progress events from main
    ipcRenderer.on('download-progress', (e, args) => {
        // args: { key, downloaded, total, username }
        if (!args || !args.key) return
        downloadProgress[args.key] = { downloaded: args.downloaded, total: args.total, username: args.username }
        render()
    })
    ipcRenderer.on("update-status", (e, args) => { 
        const usersCount = document.getElementById("users-count")
        usersCount.innerText = args
    })

    document.getElementById("reset-button").onclick = () => {
        electron.ipcRenderer.invoke("reset-timer")
    }
    ipcRenderer.on("updateDisplay", (e,args) => {
        document.getElementById("timer-display").textContent = formatTime(args.remainingTime);
        if (args.remainingTime > 0)
        {
            //
        }
        else
        {
            //
        }
    })
    ipcRenderer.on("correct-notif", async(e,args) => {
        document.getElementById("passphrase-notif").innerText = "ALERT: Passphrase Correct"
        document.getElementById("passphrase-notif").style.display = "inline-block"
        await delay(3000)
        document.getElementById("passphrase-notif").innerText = ""
        document.getElementById("passphrase-notif").style.display = "none"
    })
    ipcRenderer.on("incorrect-notif", (e,args) => {
        document.getElementById("passphrase-notif").innerText = "ALERT: Passphrase Incorrect"
        document.getElementById("passphrase-notif").style.display = "inline-block"
    })
    ipcRenderer.on("new-good-pass-notif", async(e,args) => {
        document.getElementById("passphrase-notif").innerText = "ALERT: Set New Passphrase"
        document.getElementById("passphrase-notif").style.display = "inline-block"
        await delay(3000)
        document.getElementById("passphrase-notif").innerText = ""
        document.getElementById("passphrase-notif").style.display = "none"
    })
    ipcRenderer.on("new-bad-pass-notif", (e,args) => {
        document.getElementById("passphrase-notif").innerText = "ALERT: Bad New Passphrase"
        document.getElementById("passphrase-notif").style.display = "inline-block"
    })
    ipcRenderer.on("build-notif-start", (e,args) => {
        document.getElementById("build-notif").innerText = "ALERT: Building"
        document.getElementById("build-notif").style.display = "inline-block"
    })
    ipcRenderer.on("build-notif-failure", async(e,args) => {
        document.getElementById("build-notif").innerText = "ALERT: Build Failed"
        document.getElementById("build-notif").style.display = "inline-block"
        await delay(5000)
        document.getElementById("build-notif").innerText = ""
        document.getElementById("build-notif").style.display = "none"
    })
    ipcRenderer.on("build-notif-success", async(e,args) => {
        document.getElementById("build-notif").innerText = "ALERT: Build Success"
        document.getElementById("build-notif").style.display = "inline-block"
        await delay(5000)
        document.getElementById("build-notif").innerText = ""
        document.getElementById("build-notif").style.display = "none"
    })
    setInterval(() => { 
        electron.ipcRenderer.invoke("is-online")
        .then(online => {
            if (enforceSecurityCleanup && online && data.some(d => (d.decryptedCount && d.decryptedCount != 0) || (d.cleanedAutomatedCount && d.cleanedAutomatedCount != 0))) {
                document.getElementById("online-warning").innerText = "WARNING: Decrypted images detected while online"
                document.getElementById("online-warning").style.display = "inline-block"
                document.getElementById("decrypt-all-button").style.display = "none"
            } else {
                document.getElementById("online-warning").innerText = ""
                document.getElementById("online-warning").style.display = "none"
                document.getElementById("decrypt-all-button").style.display = "inline-block"
            }
        }) 
    }, 5000)
}


function formatTime(seconds) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }

function createNode(type, text, className) {
    const temp = document.createElement(type)
    if (text != null) temp.textContent = text
    if (className != null) temp.className = className
    return temp
}

function render() {
    console.log("DATA", data)
    const usersCount = document.getElementById("users-count")
    usersCount.innerText = `${data.length} users loaded.`

    const mainBody = document.getElementById("main")
    mainBody.textContent = ""

    // create a flex-based container
    const container = document.createElement('div')
    container.className = 'data-container data-table'

    // header row
    const headerRow = createNode('div', null, 'row header-row')
    headerRow.appendChild(createNode('div', 'Username', 'username-label cell header-cell'))
    headerRow.appendChild(createNode('div', 'Progress', 'progress-label cell header-cell'))
    headerRow.appendChild(createNode('div', 'Last Capture', 'time-label cell header-cell'))
    headerRow.appendChild(createNode('div', 'In Bucket', 'number cell header-cell'))
    headerRow.appendChild(createNode('div', 'Downloaded', 'number downloaded-col cell header-cell'))
    headerRow.appendChild(createNode('div', 'Decrypted', 'number cell header-cell'))

    const actionsHeader = createNode('div', null, 'actions-col cell header-cell')
    const downloadAllBtn = createNode('p', 'Download All', 'button default-hidden')
    downloadAllBtn.onclick = async () => {
        console.log('downloading all')
        try {
            const promises = data.map(user => ipcRenderer.invoke('download-images', user))
            await Promise.all(promises)
            setDownloadNotif('Download All: Success', 4000)
        } catch (err) {
            console.error('download all failed', err)
            setDownloadNotif('Download All: Failed', 6000)
        } finally {
            ipcRenderer.invoke('fetch-data', { full: true })
        }
    }
    const buildAllBtn = createNode('p', 'Build All', 'button default-hidden')
    buildAllBtn.onclick = async() => {
        console.log('building all')
        let askForPassphrase = true
        data.forEach(user => {
            ipcRenderer.invoke('build-for-user', user, askForPassphrase)
            askForPassphrase = false
        })
    }
    actionsHeader.appendChild(downloadAllBtn)
    actionsHeader.appendChild(buildAllBtn)
    headerRow.appendChild(actionsHeader)

    container.appendChild(headerRow)

    // rows
    for (let user of data) {
        const row = createNode('div', null, 'row')

        // username
        row.appendChild(createNode('div', user.name, 'username-label cell'))

        // progress
        const keyPrefix = user.hashedKey ? user.hashedKey.slice(0,8) : (user.username || '')
        const progCell = createNode('div', null, 'progress-cell cell')
        const progData = downloadProgress[keyPrefix]
        if (progData && progData.total > 0) {
            const percent = Math.round((progData.downloaded / progData.total) * 100)
            const barOuter = document.createElement('div')
            barOuter.className = 'progress-outer'
            const barInner = document.createElement('div')
            barInner.className = 'progress-inner'
            barInner.style.width = percent + '%'
            barOuter.appendChild(barInner)
            const text = document.createElement('div')
            text.className = 'progress-text'
            text.textContent = `${progData.downloaded}/${progData.total} (${percent}%)`
            progCell.appendChild(barOuter)
            progCell.appendChild(text)
        }
        row.appendChild(progCell)

        const timeDiv = createNode('div', user.lastImageAddedOn == 'N.A.' ? '' : user.timeSince, 'time-label cell')
        timeDiv.onmouseenter = () => {
            if (user.lastImageAddedOn && user.lastImageAddedOn !== 'N.A.') {
                timeDiv.textContent = user.lastImageAddedOn
            }
        }
        timeDiv.onmouseleave = () => {
            if (user.timeSince) timeDiv.textContent = user.timeSince
        }
        row.appendChild(timeDiv)

        row.appendChild(createNode('div', user.numberInBucket == 0 ? '' : user.numberInBucket, 'number cell'))

        const downloadedCount = createNode('div', user.downloadedCount == 0 ? '' : user.downloadedCount, 'number clickable downloaded-col cell')
        downloadedCount.onclick = () => {
            ipcRenderer.invoke('open-in-explorer', './encrypted/' + user.hashedKey.slice(0, 8))
        }
        row.appendChild(downloadedCount)

        const decryptedCount = createNode('div', user.decryptedCount == 0 ? '' : user.decryptedCount, 'number clickable cell')
        decryptedCount.onclick = () => {
            ipcRenderer.invoke('open-decrypted', { prefix: user.hashedKey.slice(0, 8) })
        }
        row.appendChild(decryptedCount)

        const actionsDiv = createNode('div', null, 'actions-col cell')

        let dlBtn = createNode('p', 'Download', 'button default-hidden')
        dlBtn.onclick = async () => {
            console.log('downloading')
            try {
                await ipcRenderer.invoke('download-images', user)
                setDownloadNotif(`${user.name}: Download Success`, 4000)
            } catch (err) {
                console.error('download failed for user', user, err)
                setDownloadNotif(`${user.name}: Download Failed`, 6000)
            } finally {
                ipcRenderer.invoke('fetch-data', { full: true })
            }
        }
        actionsDiv.appendChild(dlBtn)

        let buildBtn = createNode('p', 'Build', 'button default-hidden')
        buildBtn.onclick = () => {
            console.log('building for user')
            ipcRenderer.invoke('build-for-user', user, true)
        }
        actionsDiv.appendChild(buildBtn)

        let decBtn = createNode('p', 'Decrypt', 'button default-hidden')
        decBtn.onclick = () => {
            console.log('decrypting user')
            ipcRenderer.invoke('decrypt-for-user', user)
        }
        actionsDiv.appendChild(decBtn)

        let removeBtn = createNode('p', 'Remove', 'button default-hidden')
        removeBtn.onclick = async () => {
            try {
                await ipcRenderer.invoke('remove-user', user)
            } catch (e) { console.error('remove-user failed', e) }
            ipcRenderer.invoke('fetch-data', { full: true })
        }
        actionsDiv.appendChild(removeBtn)

        let clearBtn = createNode('p', 'Clear Bucket', 'button default-hidden')
        clearBtn.onclick = async () => {
            console.log('clearing bucket')
            try {
                await ipcRenderer.invoke('clear-bucket', user)
            } catch (e) { console.error('clear-bucket failed', e) }
            ipcRenderer.invoke('fetch-data', { full: true })
        }
        actionsDiv.appendChild(clearBtn)

        row.appendChild(actionsDiv)
        container.appendChild(row)
    }

    const wrapper = document.createElement('div')
    wrapper.className = 'tableFixHead'
    wrapper.appendChild(container)
    mainBody.appendChild(wrapper)
}

main()