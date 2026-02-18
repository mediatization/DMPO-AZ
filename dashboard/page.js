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

    const table = document.createElement("table")
    table.className = "data-table"

    const headerContainer = document.createElement("thead")
    const header = document.createElement("tr")
    header.appendChild(createNode("th", "Username", "username-label"))
    header.appendChild(createNode("th", "Progress", "progress-label"))
    header.appendChild(createNode("th", "Last Capture", "time-label"))
    header.appendChild(createNode("th", "In Bucket", "number"))
    header.appendChild(createNode("th", "Downloaded", "number downloaded-col"))
    header.appendChild(createNode("th", "Decrypted", "number"))

    // Combined header for batch actions (Download All + Build All)
    const actionsHeader = createNode("th", "")
    actionsHeader.className = 'actions-col'
    const downloadAllBtn = createNode("p", "Download All", "button default-hidden")
    downloadAllBtn.onclick = async () => {
        console.log("downloading all")
        try {
            const promises = data.map(user => ipcRenderer.invoke("download-images", user))
            await Promise.all(promises)
            setDownloadNotif('Download All: Success', 4000)
        } catch (err) {
            console.error('download all failed', err)
            setDownloadNotif('Download All: Failed', 6000)
        } finally {
            ipcRenderer.invoke("fetch-data", { full: true })
        }
    }
    const buildAllBtn = createNode("p", "Build All", "button default-hidden")
    buildAllBtn.onclick = async() => {
        console.log("building all")
        let askForPassphrase = true 
        data.forEach(user => {
            ipcRenderer.invoke("build-for-user", user, askForPassphrase)
            askForPassphrase = false
        })
    }
    actionsHeader.appendChild(downloadAllBtn)
    actionsHeader.appendChild(buildAllBtn)

    // append actions header directly (spacer removed to give space to progress)
    header.appendChild(actionsHeader)

    headerContainer.appendChild(header)
    table.appendChild(headerContainer)
    
    const tableBody = document.createElement("tbody")
    for (let user of data) {
        const tr = document.createElement("tr")

    // username
    tr.appendChild(createNode("td", user.name, "username-label"))

        // progress cell: show progress bar if present for this user's key
        const keyPrefix = user.hashedKey ? user.hashedKey.slice(0,8) : (user.username || '')
    const progCell = document.createElement('td')
    progCell.className = 'progress-cell'
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
        } else {
            progCell.textContent = ''
        }
        tr.appendChild(progCell)

        console.log('timSince', user)
        const timeLabel = createNode("td", user.lastImageAddedOn == "N.A." ? "" : user.timeSince, "time-label")
        timeLabel.onmouseenter = () => {
            if (user.lastImageAddedOn && user.lastImageAddedOn !== "N.A.") {
                timeLabel.textContent = user.lastImageAddedOn
            }
        }
        timeLabel.onmouseleave = () => {
            // only reset to timeSince if there was a timeSince value
            if (user.timeSince) timeLabel.textContent = user.timeSince
        }
        timeLabel.style = "width: 140px;"
        tr.appendChild(timeLabel)

    tr.appendChild(createNode("td", user.numberInBucket == 0 ? "" : user.numberInBucket, "number"))
        
    const downloadedCount = createNode("td", user.downloadedCount == 0 ? "" : user.downloadedCount, "number clickable downloaded-col")
        downloadedCount.onclick = () => {
            ipcRenderer.invoke("open-in-explorer", "./encrypted/" + user.hashedKey.slice(0, 8))
        }
        tr.appendChild(downloadedCount)

    const decryptedCount = createNode("td", user.decryptedCount == 0 ? "" : user.decryptedCount, "number clickable")
        decryptedCount.onclick = () => {
            ipcRenderer.invoke("open-decrypted", { prefix: user.hashedKey.slice(0, 8) })
        }
        tr.appendChild(decryptedCount)


        const actionsTd = createNode("td", null, "actions-col")

        // Download
        let dlBtn = createNode("p", "Download", "button default-hidden")
        dlBtn.onclick = async () => {
            console.log("downloading")
            try {
                await ipcRenderer.invoke("download-images", user)
                setDownloadNotif(`${user.name}: Download Success`, 4000)
            } catch (err) {
                console.error('download failed for user', user, err)
                setDownloadNotif(`${user.name}: Download Failed`, 6000)
            } finally {
                ipcRenderer.invoke("fetch-data", { full: true })
            }
        }
        actionsTd.appendChild(dlBtn)

        // Build
        let buildBtn = createNode("p", "Build", "button default-hidden")
        buildBtn.onclick = () => {
            console.log("building for user")
            ipcRenderer.invoke("build-for-user", user, true)
        }
        actionsTd.appendChild(buildBtn)

        // Decrypt
        let decBtn = createNode("p", "Decrypt", "button default-hidden")
        decBtn.onclick = () => {
            console.log("decrypting user")
            ipcRenderer.invoke("decrypt-for-user", user)
        }
        actionsTd.appendChild(decBtn)

        // Remove
        let removeBtn = createNode("p", "Remove", "button default-hidden")
        removeBtn.onclick = async () => {
            try {
                await ipcRenderer.invoke("remove-user", user)
            } catch (e) { console.error('remove-user failed', e) }
            ipcRenderer.invoke("fetch-data", { full: true })
        }
        actionsTd.appendChild(removeBtn)

        // Clear Bucket
        let clearBtn = createNode("p", "Clear Bucket", "button default-hidden")
        clearBtn.onclick = async () => {
            console.log("clearing bucket")
            try {
                await ipcRenderer.invoke("clear-bucket", user)
            } catch (e) { console.error('clear-bucket failed', e) }
            ipcRenderer.invoke("fetch-data", { full: true })
        }
        actionsTd.appendChild(clearBtn)

        tr.appendChild(actionsTd)
        tableBody.appendChild(tr)
    }

    table.appendChild(tableBody)

    // wrap table in a scrollable container so the table can auto-size to content
    const wrapper = document.createElement('div')
    wrapper.className = 'tableFixHead'
    wrapper.appendChild(table)
    mainBody.appendChild(wrapper)
}

main()