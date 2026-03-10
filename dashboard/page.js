const { dialog } = require('electron');
const electron = require('electron');
const { ipcRenderer } = require('electron/renderer');

let data = [];

let enforceSecurityCleanup = false;

// central status notification management (replaces download-notif)
let statusNotifTimeout = null
function setStatusNotif(text, duration = 3000) {
    const el = document.getElementById("status-notif")
    if (!el) return
    el.innerText = String(text || '')
    el.style.display = 'inline-block'
    if (statusNotifTimeout) {
        clearTimeout(statusNotifTimeout)
    }
    statusNotifTimeout = setTimeout(() => {
        el.innerText = ''
        el.style.display = 'none'
        statusNotifTimeout = null
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

    const ob = document.getElementById("onboard-button");
    if (ob) ob.classList.add('default-muted');
    const ia = document.getElementById("image-analysis");
    if (ia) ia.classList.add('default-muted');

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
        // Show progress in the alert/status section
        const el = document.getElementById("status-notif")
        if (!el) return
        const downloaded = Number(args.downloaded || 0)
        const total = Number(args.total || 0)
        const percent = total > 0 ? Math.round((downloaded / total) * 100) : 0

        // build inline progress display
        el.style.display = 'inline-block'
        el.innerHTML = ''
        const title = document.createElement('div')
        title.style.fontWeight = '600'
        title.style.marginBottom = '6px'
        title.textContent = args.username ? `${args.username}: Downloading` : 'Downloading'

        const outer = document.createElement('div')
        outer.className = 'progress-outer'
        outer.style.width = '200px'
        const inner = document.createElement('div')
        inner.className = 'progress-inner'
        inner.style.width = percent + '%'
        outer.appendChild(inner)

        const info = document.createElement('div')
        info.className = 'progress-text'
        info.textContent = total > 0 ? `${downloaded}/${total} (${percent}%)` : `${downloaded}`

        el.appendChild(title)
        el.appendChild(outer)
        el.appendChild(info)

        // When finished show a brief success message and clear the progress UI
        if (total > 0 && downloaded >= total) {
            setTimeout(() => {
                setStatusNotif(args.username ? `${args.username}: Download Complete` : 'Download Complete', 4000)
            }, 300)
        }
    })

    //expects an object with format {message:string, duration:int}
    ipcRenderer.on("update-status", (e, args) => {
        try {
            // accept either a plain string or an object { message, duration }
            const msg = args.message || ''
            const dur = Number(args.duration) || 3000
            setStatusNotif(msg, dur)
            return
        } catch (e) {
            console.error('update-status routing failed', e)
        }
    })

    document.getElementById("reset-button").onclick = () => {
        electron.ipcRenderer.invoke("reset-timer")
    }

    ipcRenderer.on("updateDisplay", (e,args) => {
        document.getElementById("timer-display").textContent = formatTime(args.remainingTime);
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

    const mainBody = document.getElementById("main")
    mainBody.textContent = ""

    // create a flex-based container
    const container = document.createElement('div')
    container.className = 'data-container data-table'

    // header row
    const headerRow = createNode('div', null, 'row header-row')
    headerRow.appendChild(createNode('div', 'Username', 'username-label cell header-cell'))
    headerRow.appendChild(createNode('div', 'Last Capture', 'time-label cell header-cell'))
    headerRow.appendChild(createNode('div', 'In Bucket', 'number cell header-cell'))
    headerRow.appendChild(createNode('div', 'Downloaded', 'number downloaded-col cell header-cell'))
    headerRow.appendChild(createNode('div', 'Decrypted', 'number cell header-cell'))

    container.appendChild(headerRow)

    // rows
    for (let user of data) {
        const row = createNode('div', null, 'row')

        // username
        row.appendChild(createNode('div', user.name, 'username-label cell'))

        // (progress column removed) -- progress shown in header alerts

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

        let buildBtn = createNode('p', 'Build', 'button default-hidden')
        buildBtn.onclick = () => {
            console.log('building for user')
            ipcRenderer.invoke('build-for-user', user, true)
        }
        actionsDiv.appendChild(buildBtn)

        let dlBtn = createNode('p', 'Download', 'button default-hidden')
        dlBtn.onclick = async () => {
            console.log('downloading')
                try {
                    await ipcRenderer.invoke('download-images', user)
                    setStatusNotif(`${user.name}: Download Success`, 4000)
                } catch (err) {
                    console.error('download failed for user', user, err)
                    setStatusNotif(`${user.name}: Download Failed`, 6000)
                } finally {
                ipcRenderer.invoke('fetch-data', { full: true })
            }
        }
        actionsDiv.appendChild(dlBtn)

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