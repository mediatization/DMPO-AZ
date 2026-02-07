const { app, BrowserWindow, ipcMain, dialog, ipcRenderer, shell } = require("electron");
const fs = require("fs");
const Storage = require("@azure/storage-blob");
const { timePassedFromDate } = require("./util");
const checkInternetConnected = require('check-internet-connected');
const bcrypt = require('bcryptjs');
const os = require('os');
const { Downloader } = require("./downloader");
const crypto = require('crypto');
const { createWorker } = require('tesseract.js');
const { resolve } = require("path");
const spawn = require("child_process").spawn;
const QRCode = require("qrcode");
const { exec } = require('child_process');
const path = require('path');

let decryptionQueue = []
let censoringQueue = []

const downloader = new Downloader()

let settings = {}
if (fs.existsSync("default-settings.json")) {
    settings = JSON.parse(fs.readFileSync("default-settings.json"))
}
console.log(settings);

let PASSPHRASE = "16charpassphrase" // MUST BE 16 CHARACTERS
const AZURE_ACC_NAME = settings.accountName
const AZURE_ACC_URL = settings.accountUrl
const AZURE_ACC_KEY = settings.accountKey

// Create the BlobServiceClient object with connection string
const blobServiceClient = new Storage.BlobServiceClient(AZURE_ACC_URL, new Storage.StorageSharedKeyCredential( AZURE_ACC_NAME, AZURE_ACC_KEY));

const pythonPath = resolve("../censoring-scripts/venv/Scripts/python.exe")
const scriptPath = resolve("../censoring-scripts/main.py")

const CANCENSOR = fs.existsSync(pythonPath) && fs.existsSync(scriptPath)


let data = [];
let win;
let win1;
let win2;
// (Reverted) decrypted files will be written directly into ./decrypted/<prefix>/

function createWindow() {
    win = new BrowserWindow({
        width: 1600,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
    });
    /*
    win.addEventListener('beforeunload', (event) => {
        if (win1)
            win1.close()
        if (win2)
            win2.close()
    }); 
    */
    win.loadFile("dashboard/index.html");
    win.setMenu(null)
}

app.whenReady().then(createWindow);


app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

const getUserData = () => {
    if (!fs.existsSync("keys")) return []
    const files = fs.readdirSync("keys");
    const data = files.map(f => fs.readFileSync(`keys/${f}`))
    return data.map(d => JSON.parse(d))
}

async function listBlobs(containerName)
{
    var toReturn = []
    console.log("Listing blobs of container: " + containerName)
    // Attempt listing; handle network/Azure errors gracefully.
    try {
        containerClient = blobServiceClient.getContainerClient(containerName)
        exists = await containerClient.exists()
    } catch (e) {
        console.log('Azure listing failed for container', containerName, e)
        return []
    }
    console.log("Container " + containerName + " exists? " + exists)
    if (exists == true)
    {
        for await (const blob of containerClient.listBlobsFlat({ includeMetadata: false, includeSnapshots: false, includeTags: false,
            includeVersions: false}))
        {
            toReturn.push(containerClient.getBlobClient(blob.name))
        }
    }
    else
    {
        toReturn  = []
    }
    return toReturn;
}

const fetchData = async (event = null) => {
    // Fetches and combines user and image data

    const userData = getUserData();
    console.log("Calling fetchData...")

    // This check is needed to ensure the decrypted key is correct when printed below after deciphering
    const res = await waitForPassphrase()
    if (!res)
        return null

    // For each user, attempt to list blobs only if online. If offline, return empty list for that user.
    var imageData = []
    for (ud of userData)
    {
        // Get the decrypted key
        var key = decipher({encryptedKey: ud.encryptedKey, iv: ud.iv});

        containerName = ud.hashedKey.slice(0, 8)
        console.log("Fetched A User Data:")
        console.log("\tUser Name: " + ud.name)
        console.log("\tContainer Name: " + containerName)
        console.log("\tHashed Key: " + ud.hashedKey)
        console.log("\tKey: " + key)
        console.log("\tEncrypted key: " + ud.encryptedKey)
        console.log("\tiv: " + ud.iv)

        var toReturn = []
        try {
            console.log("\tAccessing container " + containerName + " ...")
            containerClient = blobServiceClient.getContainerClient(containerName)
            exists = await containerClient.exists()
            console.log("\tContainer " + containerName + " exists? " + exists)
            if (exists == true)
            {
                for await (const blob of containerClient.listBlobsFlat({ includeMetadata: false, includeSnapshots: false, includeTags: false,
                    includeVersions: false}))
                {
                    toReturn.push(containerClient.getBlobClient(blob.name))
                }
            }
            else
            {
                toReturn  = []
            }
        } catch (e) {
            // Network or Azure errors will be handled here; don't treat transient offline as permanent.
            console.log('\tAzure access failed for container', containerName, e)
            toReturn = []
        }
        imageData.push(toReturn);
    }

    if (event) event.sender.send("update-status", "Processing data..") 
    if (event) event.sender.send("update-cancensor", CANCENSOR) 

    console.log("Logging image data from Azure...")
    // For each object v, with inde i
    imageData.forEach((v, i) => {
        if (v != null)
        {
            console.log("\tIMAGE DATA")
            userData[i].numberInBucket = v.length;
            if (v.length > 0) {
                const filename = v[v.length - 1]?.name
                const dC = filename?.split("_")
                // Grab year, month, day, hours, minutes, seconds all from filename
                userData[i].timeSince = timePassedFromDate(new Date(dC[0], dC[1]-1, dC[2], dC[3], dC[4], dC[5]))
            }
        }
        else
        {
            console.log("\tNULL DATA")
        }
    })
    console.log("Finished logging image data.")

    return Object.values(userData)
};

ipcMain.handle("fetch-data", async (event, args) => {
    data = getUserData();
    try {
        data = await fetchData(event);
    }
    catch (err) {
        console.log('err', err)
    }
    event.sender.send("update-status", "Checking local folders..")
    data = await updateLocalFiles(data)

    event.sender.send("update-security-settings", { enforceSecurityCleanup: !!settings.enforceSecurityCleanup });
   
    event.sender.send("update-data", data)
    event.sender.send("update-status", "Updated")
    return data
});

ipcMain.handle("download-images", async (event, args) => {
    console.log("Downloading from ", args.hashedKey)
    blobs = await listBlobs(args.hashedKey.slice(0, 8))
    console.log("Number of images to download from container, " + args.hashedKey.slice(0,8) + " : " + blobs.length)
    downloader.addFilesToQueue(blobs)
    downloader.printQueue()
    // set the current key and total so progress can be tracked
    downloader.setCurrentKey(args.hashedKey.slice(0,8), blobs.length)
    // register a progress callback that forwards progress to renderer
    downloader.setProgressCallback((key, downloaded, total) => {
        try {
            /*
                DEBUG NOTES:
                THIS IS THE BASE ON WHICH YOU SHOULD BUILD THE DECRYPTION PROGRESS BAR!
            */
            win.webContents.send('download-progress', { key, downloaded, total, username: args.name || args.username })
        } catch (e) {
            console.error('send download-progress failed', e)
        }
    })
    downloader.startDownloading()
});

const getFiles = (folderPath, username) => (new Promise((resolve) => {
    fs.readdir(`./${folderPath}/${username}`, (err, files) => {
        resolve(err ? [] : files.filter(f => !f.endsWith(".json")))
    })
}))


const watch = async (data, folderPath, name) => {
    if (!data)
        return null
    const userFolders = fs.existsSync(`./${folderPath}`) ? fs.readdirSync(`./${folderPath}`, { withFileTypes:true }).filter(f => f.isDirectory()).map(f => f.name) : []
    const userFiles = await Promise.all(userFolders.map(un => getFiles(folderPath, un)))
    const userNumFiles = userFolders.reduce((a, f, i) => ({ ...a, [f]: userFiles[i].length }), {})
    const dataWithNumFiles = data.map((d) => {
        if (d.hashedKey) {
            val = (userFolders.includes(d.hashedKey.slice(0, 8))) ? userNumFiles[d.hashedKey.slice(0, 8)] : 0
            d[name] = val
        }
        return d
    })
    const usersNotInData = userFolders.filter(u => !(data.map(d => d.hashedKey.slice(0, 8)).includes(u)))
    return [
        ...dataWithNumFiles,
        ...usersNotInData.map(u => ({ username: u, [name]: userNumFiles[u]}))
    ]
}

const updateLocalFiles = async (data) => {
    if (data == null)
        return null
    data = await watch(data, "encrypted", "downloadedCount")
    data = await watch(data, "decrypted", "decryptedCount")
    data = await watch(data, "cleaned_automated", "cleanedAutomatedCount")
    data = await watch(data, "final", "finalCount")
    return data
}

const triggerUpdateLocalFiles = async () => {
    try {
        // fetch fresh user/image data and then update local file counts
        let d = getUserData();
        d = await fetchData();
        d = await updateLocalFiles(d);
        data = d;
        if (win && win.webContents) {
            win.webContents.send("update-data", data)
        }
    } catch (e) {
        console.error('triggerUpdateLocalFiles error', e)
    }
}

ipcMain.handle("is-online", async (event, args) => { 
    try {
        await checkInternetConnected()
        return true
    } catch (e) {
        return false
    }
})

const isOnline = async () => {
    try {
        return await checkInternetConnected()
    } catch (e) {
        return false
    }
}

ipcMain.handle("decrypt-for-user", async (event, args) => {
    // Don't allow decrypt while online
    if (settings.enforceSecurityCleanup) {
        try {
            await checkInternetConnected()
            dialog.showErrorBox("Online Error", "Cannot decrypt while connected to the internet")
            decryptionQueue = []
            return;
        } catch (e) {
            // offline -> proceed
        }
    }
    // *** MODIFICATION END ***

    // Queue the decryption request and process sequentially
    decryptionQueue.push([event, args])
    if (decryptionQueue.length === 1) {
        decrypt(event, args)
    }
});

const decrypt = async (event, args) => {
    // Proceed with decryption regardless of network status (original behavior)
    const res = await waitForPassphrase()
    if (!res)
        return

    const key = decipher({encryptedKey: args.encryptedKey, iv: args.iv})
    const javaPath = settings.javaPath || "java.exe"
    const decryptorPath = resolve("./Decryptor.class")

    // DEBUG CONSOLE LOG, REMOVE LATER
    console.log("<----------------------ATTENTION--------------------------->")
    console.log("Args: ")
    console.log(args)
    /*
        DEBUG NOTES:
        This is where the process of actually decrypting the filenames and contents(?) actually takes place.
        It's less important to what I'm implementing that I understand too much of the specifics of the
        encryption itself, but what's worth noting is that in my testing the "ATTENTION" print only happens once.
        Need to figure out how to send the number of files to be encrypted to the page.js script, so tha the progress
        bar's math functions can actually work.
    */

    console.log("Hashed Key: " + args.hashedKey.slice(0,8))
    console.log("Encrypted Key: " + args.encryptedKey)
    console.log("IV: " + args.iv)
    console.log("Key: " + key)

    if (!fs.existsSync(decryptorPath)) {
        dialog.showErrorBox("Missing decryptor class", "Decryptor.class missing.")
        return
    }

    const folderName = resolve(`./encrypted/${args.hashedKey.slice(0, 8)}/`)
    // Reverted behavior: write decrypted files directly into ./decrypted/<prefix>/
    const prefix = args.hashedKey.slice(0, 8)
    const destFolderName = resolve(`./decrypted/${prefix}/`)

    if (!fs.existsSync(folderName)) {
        dialog.showErrorBox("Missing folder error", `Missing folder "${folderName}"`)
        return
    }

    if (!fs.existsSync(destFolderName))
        fs.mkdirSync(destFolderName, { recursive: true })

    let process = spawn(javaPath, [`Decryptor`, `${key}`, `${folderName}`, destFolderName], )
    event.sender.send("update-status", "Started decrypting..")
    process.stdout.on("data", data => console.log("data", data.toString()))
    // process.stdout.on("data", data => {})
    process.stderr.on("data", data => {
        dialog.showErrorBox("Script Error", data.toString())
    })
    process.on("exit", code => {
        console.log('code', code)
        decryptionQueue.shift()
        if (decryptionQueue.length > 0) {
            decrypt(decryptionQueue[0][0], decryptionQueue[0][1], past)
        }
        /*
        //if we want decryption and database registration to happen at the same
        //time, will have to revisit
        else {
            addToDb(destFolderName);
            
        }
        */
        if (code == 0 && args.acensor) {
            event.sender.send("start-automated-censoring", args)
        }
        triggerUpdateLocalFiles()
    })
}

//currently defunct, if we want image decryption and storing to database to happen on homepage may be useful
const addToDb = async (folderPath) => {
    console.log("adding to db!");

    // create worker 
    const worker = await createWorker({
        workerPath: path.join(__dirname, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js'),
        corePath: path.join(__dirname, 'node_modules', 'tesseract.js-core'),
        langPath: path.join(__dirname, '.'), 
        //logger: m => console.log(m),
        gzip: false,
        workerBlobURL: false
    });

    // proper load/init sequence for Node
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');

    try {
        const files = await fs.promises.readdir(folderPath);
        for (const file of files) {
            const fullPath = path.join(folderPath, file);
            const stats = await fs.promises.stat(fullPath);
            if (!stats.isFile()) continue;

            console.log('Found file:', fullPath);
            // run recognition on this file (synchronously per file)
            try {
                const { data: { text } } = await worker.recognize(fullPath);
                console.log('OCR result for', file, '\n', text);
                // ... do DB insert or whatever you need here ...
            } catch (ocrErr) {
                console.error('OCR failure for', fullPath, ocrErr);
            }
        }
    } catch (err) {
        console.error('Error reading directory or files:', err);
    } finally {
        await worker.terminate();
    }
};

ipcMain.handle("censor-for-user", async (event, args) => {
    // Queue the censoring request (no online gating)
    censoringQueue.push(args)
    if (censoringQueue.length === 1) {
        censor(args)
    }

});

const censor = (args) => {
    console.log("Censoring (A) for user", args)

    const pythonPath = resolve("../censoring-scripts/venv/Scripts/python.exe")
    const scriptPath = resolve("../censoring-scripts/main.py")

    if (!fs.existsSync(pythonPath) || !fs.existsSync(scriptPath)) {
        dialog.showMessageBoxSync({
            message: "Automated Censoring module not detected! Please ensure the censoring-scripts folder is in the same folder as the manager's folder.",
            type: "error"
        })
        return
    }

    const folderName = resolve(`./decrypted/${args.hashedKey.slice(0, 8)}/`)
    const destFolderName = resolve(`./cleaned_automated/${args.hashedKey.slice(0, 8)}/`)

    if (!fs.existsSync(destFolderName)) 
        fs.mkdirSync(destFolderName, { recursive: true  })

    // event.sender.send("update-status", "Started automated censoring..")
    console.log("ACENSORING TO", scriptPath, folderName, destFolderName)
    let process = spawn(pythonPath, [scriptPath, folderName, destFolderName])
    process.stdout.on("data", data => console.log("data", data.toString()))
    process.stderr.on("data", data => dialog.showErrorBox("Script Error", data.toString()))
    process.on("exit", code => {
        console.log('code', code)
        censoringQueue.shift()
        if (censoringQueue.length > 0) {
            censor(censoringQueue[0])
        }
        triggerUpdateLocalFiles()
    })

}

ipcMain.handle("open-in-explorer", async (event, args) => {
    console.log("Opening in explorer", args)
    // spawn("explorer.exe", [resolve(args)], )
    shell.openPath(resolve(args))

})

// Open decrypted folder for a user prefix
ipcMain.handle("open-decrypted", async (event, args) => {
    const prefix = args.prefix || args
    const dir = resolve(`./decrypted/${prefix}/`)
    if (fs.existsSync(dir)) return shell.openPath(dir)
    return null
})

// Clear out decrypted folder contents on quit/crash so decrypted files only persist while app is open
const cleanupEphemeral = () => {
    try {
        const base = resolve('./decrypted/')
        if (!fs.existsSync(base)) return
        fs.readdirSync(base, { withFileTypes: true }).forEach(d => {
            if (d.isDirectory()) {
                const p = resolve(base, d.name)
                try { fs.rmdirSync(p, { recursive: true }) } catch (e) {}
            }
        })
    } catch (e) {
        console.error('cleanupEphemeral error', e)
    }
}

app.on('before-quit', () => {
    if (settings.enforceSecurityCleanup) {
        cleanupEphemeral()
    }
})

process.on('SIGINT', () => { 
    if (settings.enforceSecurityCleanup) {
        cleanupEphemeral(); 
    }
    process.exit(0) 
})
process.on('uncaughtException', (err) => { 
    console.error('uncaughtException', err); 
    if (settings.enforceSecurityCleanup) {
        cleanupEphemeral(); 
    }
    process.exit(1) 
})
// *** MODIFICATION END ***


ipcMain.handle("open-image-analysis", async (event, args) => {
    const res = await waitForPassphrase()
    if (!res)
        return
    win1 = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
    });
    win1.loadFile("imageAnalysis/imageAnalysis.html");
    win1.menuBarVisible = false;
})

ipcMain.handle("open-onboard-window", async (event, args) => {
    const res = await waitForPassphrase()
    if (!res)
        return
    win1 = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
    });
    win1.loadFile("onboarding/onboarding.html");
    win1.menuBarVisible = false;
})
 
//might be dead code? only place this gets called is in the only function inside
//onboarding.js which appears to not be called anywhere
ipcMain.handle("register", async (event, args) => {
    const { name } = args;

    if (!name) {
        console.log("Missing name on registration");
        return;
    }
    
    const key = crypto.randomBytes(32); 
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv("aes-128-gcm", Buffer.from(PASSPHRASE), iv);
    const encryptedKey = cipher.update(key).toString("hex");

    const hash = crypto.createHash("sha256");
    hash.update(key);
    const hashedKey = hash.digest("hex")

    fs.mkdirSync("keys", { recursive: true });
    fs.writeFileSync(`keys/${hashedKey}`, JSON.stringify({
        encryptedKey, hashedKey, iv: iv.toString("hex"), name
    }, null, 4));

    const qrcode = await QRCode.toDataURL(key.toString("hex"), { width: 1000 });

    decipher({ encryptedKey: encryptedKey, iv: iv.toString("hex")})

    // refresh dashboard so the new user appears immediately
    try {
        await triggerUpdateLocalFiles()
    } catch (e) {
        console.error('triggerUpdateLocalFiles after register failed', e)
    }

    return { encryptedKey, hashedKey, qrcode }
})


const decipher = ({ encryptedKey, iv}) => {
    const _iv = Buffer.from(iv, "hex")
    const _key = Buffer.from(encryptedKey, "hex")
    const decipher = crypto.createDecipheriv("aes-128-gcm", Buffer.from(PASSPHRASE), _iv);
    const key = decipher.update(_key).toString("hex")
    return key
}

ipcMain.handle("remove-user", async (event, args) => {
    const { hashedKey } = args;
    const encryptedPath = "encrypted/" + hashedKey.slice(0, 8) + "/"
    if (fs.existsSync(encryptedPath)) fs.rmdirSync(encryptedPath, { recursive: true });
    const decryptedPath = "decrypted/" + hashedKey.slice(0, 8) + "/"
    if (fs.existsSync(decryptedPath)) fs.rmdirSync(decryptedPath, { recursive: true });
    const censoredPath = "cleaned_automated/" + hashedKey.slice(0, 8) + "/"
    if (fs.existsSync(censoredPath)) fs.rmdirSync(censoredPath, { recursive: true });
    const finalPath = "final/" + hashedKey.slice(0, 8) + "/"
    if (fs.existsSync(finalPath)) fs.rmdirSync(finalPath, { recursive: true });
    fs.unlinkSync("keys/" + hashedKey);

    // refresh dashboard data after removal
    try {
        await triggerUpdateLocalFiles()
    } catch (e) {
        console.error('triggerUpdateLocalFiles after remove-user failed', e)
    }
})

const deleteFiles = async (files) => (
    new Promise((resolve) => { 
        const options = {
            deleteSnapshots: 'include' // or 'only'
        }
        let numLeft = files.length
        files.forEach((f, i) => {
            setTimeout(() => {
                console.log("Deleting", f.name)
                f.delete(options, async () => {
                    numLeft --; 
                    if (numLeft == 0) {
                        resolve()
                    }
                })
            }, Math.floor(i/500)*2000)
        })
    })
)

ipcMain.handle("clear-bucket", async (event, args) => {
    console.log("Clearing bucket of user", args)
    const username = args.hashedKey.slice(0, 8)
    const files = await listBlobs(username)
    const numFiles = files.length
    const response = dialog.showMessageBoxSync(BrowserWindow.getAllWindows()[0], { 
        message: `Are you sure you want to clear the user ${username}'s container with ${numFiles} images?`, 
        buttons:[ "Yes", "No"], 
        type: "warning"
    })
    if (response == 0)  {
        await deleteFiles(files)
        // ensure dashboard reflects cleared bucket
        try {
            await triggerUpdateLocalFiles()
        } catch (e) {
            console.error('triggerUpdateLocalFiles after clear-bucket failed', e)
            // fallback: compute and send once
            data = await fetchData()
            data = await updateLocalFiles(data)
            event.sender.send("update-data", data)
        }
    }
});


const build = (key, args) =>
{
    win.webContents.send("build-notif-start")

    dmpoPath = __dirname
    // Path for App folder (root folder, not subfolder)
    appPath = settings.appFolder
    if (!fs.existsSync(appPath)) {
        console.log("ERROR: failed to find path %s for app folder", appPath)
        win.webContents.send("build-notif-failure")
        return
    }
    // Path for Constants file
    console.log(os.platform);
    if (os.platform === 'win32') {
        constantsPath = appPath + "\\app\\src\\main\\java\\com\\example\\screenlife2\\Constants.java";
    }
    else {
        constantsPath = appPath + "\\app\\src\\main\\java\\com\\example\\screenlife2\\Constants.java";
    }
    
    if (!fs.existsSync(constantsPath)) {
        console.log("ERROR: failed to find path %s for constants file", constantsPath)
        win.webContents.send("build-notif-failure")
        return
    }
    // Path for Keys folder
    keysPath = dmpoPath + "/keys"
    if (!fs.existsSync(keysPath)) {
        console.log("ERROR: failed to find path %s for keys folder", constantsPath)
        win.webContents.send("build-notif-failure")
        return
    }
    fs.writeFile(constantsPath, constants(settings.uploadAddress, key, args.hashedKey), (err) => {
        if (err) {
            console.error('Error occurred writing new values to Constants.java:', err);
            win.webContents.send("build-notif-failure")
        } else {
            console.log('Wrote new values to Constants.java');
            // Build the app apks
            console.log("Starting build for hashed key: " + args.hashedKey.slice(0,8))
            // Build
            const projectDir = appPath
            const buildType = 'debug'
            const destinationDir = './apk_output/' + args.hashedKey.slice(0,8)
            // Run gradle with explicit assemble task for both platforms
            const gradleCmd = process.platform === 'win32' ? '.\\gradlew.bat assembleDebug' : './gradlew assembleDebug';
            const apkPath = path.join(projectDir, 'app', 'build', 'outputs', 'apk', buildType, `app-${buildType}.apk`);
            const destPath = path.join(destinationDir, `app-${buildType}-${args.hashedKey.slice(0,8)}.apk`);

            // Try to make gradlew executable on *nix (non-fatal)
            const gradlewLocal = path.join(projectDir, 'gradlew')
            if (process.platform !== 'win32' && fs.existsSync(gradlewLocal)) {
                fs.chmod(gradlewLocal, 0o775, (err) => {
                    if (err) console.warn('chmod gradlew failed (non-fatal):', err.message)
                    else console.log('The permissions for gradle were changed')
                })
            }

            // Step 1: Run Gradle build (increase maxBuffer to avoid truncation)
            console.log(`Running: ${gradleCmd}`);
            exec(gradleCmd, { cwd: projectDir, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
                if (error) {
                    console.error('Gradle build failed:', stderr || error.message);
                    win.webContents.send("build-notif-failure")
                    return;
                }

                console.log('Build process finished. Verifying APK output...')

                // Primary expected path
                let finalApk = fs.existsSync(apkPath) ? apkPath : null

                // Fallback: scan outputs folder for any .apk and pick newest
                if (!finalApk) {
                    const outputsDir = path.join(projectDir, 'app', 'build', 'outputs', 'apk')
                    if (fs.existsSync(outputsDir)) {
                        const found = []
                        const walk = (dir) => {
                            const entries = fs.readdirSync(dir, { withFileTypes: true })
                            for (const ent of entries) {
                                const p = path.join(dir, ent.name)
                                if (ent.isDirectory()) walk(p)
                                else if (ent.isFile() && p.endsWith('.apk')) found.push(p)
                            }
                        }
                        walk(outputsDir)
                        if (found.length > 0) {
                            found.sort((a,b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
                            finalApk = found[0]
                        }
                    }
                }

                if (!finalApk) {
                    console.error('APK not found (checked expected locations).')
                    win.webContents.send("build-notif-failure")
                    return
                }

                try {
                    fs.mkdirSync(destinationDir, { recursive: true });
                    fs.copyFileSync(finalApk, destPath);
                    console.log('APK copied to:', destPath);
                    win.webContents.send("build-notif-success")
                } catch (copyErr) {
                    console.error('Failed to copy APK:', copyErr)
                    win.webContents.send("build-notif-failure")
                }
            });
        }
    });
}

const constants = (upload_address, key, hashed_key) =>
{
    return ("package com.example.screenlife2;\n" + "public class Constants {\n" + 
    "\tpublic final static String UPLOAD_ADDRESS = \"" + upload_address +"\";\n" +
    "\tpublic final static int BATCH_SIZE = 10;\n" +
    "\tpublic static final int AUTO_UPLOAD_COUNT = 600; //30 min worth of capturing\n" +
    "\t// This is the decrypted key (or just 'key' in the DMPO, not the 'encrypted key')\n" +
    "\tpublic static final String USER_KEY = \"" + key + "\";\n" +
    "\t// This is the hashed key, (not the plain 'hash' in the DMPO, but the 'hashed key')\n" +
    "\tpublic static final String USER_HASH = \"" + hashed_key  + "\";\n" +
    "}")
}

ipcMain.handle("build-for-user", async (event, args, doWait) => {
    console.log("Building for user", args)
    if (doWait)
    {
        if (!await waitForPassphrase())
        {
            console.log("Canceling build, incorrect password")
            return
        }
    }
    build(decipher(args), args)
})

ipcMain.handle("check-passphrase", async (event, args) => {
    return new Promise(async (resolve) => {

        passNew = args.passphrase
        console.log("Called check-passphrase")
        
        //TODO: give better error feedback?
        //also apparently deleting password hash just lets us make a new password
        //maybe add a security check to delete all existing users if password_hash gets deleted
        if (!passNew) {
            console.log("Missing passphrase");
            resolve(false)
        }
        else if (passNew.length < 16) {
            dialog.showErrorBox("Passphrase Error", "Please submit the project's passphrase before attempting decryption")
            console.log("Exiting fetch data due to passphrase warning.")
            decryptionQueue = [];
            resolve(false)
        }
        else
        {
            const past = await loadPassphrase()
            if (past)
            {
                if (!bcrypt.compareSync(passNew, past)) {
                    dialog.showErrorBox("Passphrase Error", "Incorrect passphrase. To reset the passphrase for a new project, delete the 'passphrase_hash' file.")
                    console.log("Exiting fetch data due to passphrase warning.")
                    decryptionQueue = [];
                    win.webContents.send("incorrect-notif")
                    resolve(false)
                }
                else
                {
                    console.log("check-passphrase returned true")
                    win.webContents.send("correct-notif")
                    resolve(true)
                    PASSPHRASE = passNew
                }
            }
            else
            {
                console.log("No passphrase file")
                const newPass = await setPassphrase(event, args)
                if (newPass)
                {
                    console.log("check-passphrase returned true")
                    win.webContents.send("new-good-pass-notif")
                    resolve(true)
                }
                else
                {
                    decryptionQueue = [];
                    win.webContents.send("new-bad-pass-notif")
                    resolve(false)
                }
            }
        }
    })
})

const waitForPassphrase = async () => {
    return new Promise((resolve) => {
        console.log("Called waitForPassphrase")

        if (timerInterval)
        {
            resolve(true)
            return
        }

        win2 = new BrowserWindow({
            width: 400,
            height: 300,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }    
        });

        win2.loadFile('passphrase/passphrase.html');
        win2.menuBarVisible = false;

        returned = false

        ipcMain.once('passphrase-correct', async(event, args) => {
            console.log("Called passphrase-correct")
            returned = true
            win2.close()
            startTimer()
            resolve(true)
        });

        win2.on('closed', () => {
            if (!returned)
            {
                // This event is emitted after the window has been closed
                console.log("Passsphrase window closed early");
                win.webContents.send("incorrect-notif")
                resolve(false)
            }
          });
    });
}

const loadPassphrase = async () =>
{
    return new Promise((resolve) => {
        if (fs.existsSync("password_hash")){
            const past = fs.readFileSync("password_hash", "utf8");
            console.log("Loaded password correctly: " + past)
            resolve(past)
        }
        else{
            console.log("No password file to load.")
            resolve("")
        }
    })
}

// Compute a simple integrity signature (sha256 of the password_hash contents)
const computeHashOfFile = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) return "";
        const v = fs.readFileSync(filePath, 'utf8')
        const h = crypto.createHash('sha256')
        h.update(v)
        return h.digest('hex')
    }
    catch (e) {
        console.error('computeHashOfFile error', e)
        return ""
    }
}

// Delete all user-related local data: keys and local folders storing images
const deleteAllUserData = () => {
    console.log('Deleting all user keys and local data due to password_hash change or removal')
    try {
        if (fs.existsSync('keys')) {
            fs.readdirSync('keys').forEach(f => {
                try { fs.unlinkSync(`keys/${f}`) } catch (e) {}
            })
            try { fs.rmdirSync('keys') } catch (e) {}
        }

        const folders = ['encrypted','decrypted','cleaned_automated','final','apk_output']
        folders.forEach(folder => {
            if (fs.existsSync(folder)) {
                fs.readdirSync(folder).forEach(sub => {
                    const p = `${folder}/${sub}`
                    try { fs.rmdirSync(p, { recursive: true }) } catch (e) {}
                })
            }
        })
    } catch (e) {
        console.error('deleteAllUserData error', e)
    }
}

// Check integrity of password_hash against a sidecar file 'password_hash.meta'.
// Behavior:
// - If meta exists: enforce it. If password_hash is removed or its contents differ -> purge and remove meta.
// - If meta does NOT exist: initialize it from password_hash (if present) and do NOT purge on first-run.
const checkPasswordIntegrity = () => {
    try {
        const metaPath = 'password_hash.meta'
        const currentSig = computeHashOfFile('password_hash')
        const metaExists = fs.existsSync(metaPath)
        let metaSig = ''
        if (metaExists) {
            metaSig = fs.readFileSync(metaPath, 'utf8')
        }

        if (metaExists) {
            // If meta exists and either the password_hash was removed or changed, purge
            if (currentSig === '' || currentSig !== metaSig) {
                if (fs.existsSync('keys') || fs.existsSync('encrypted') || fs.existsSync('decrypted')) {
                    deleteAllUserData()
                }
                try { fs.unlinkSync(metaPath) } catch (e) {}
            }
        } else {
            // Meta missing: if password_hash exists, initialize meta; if password_hash also missing, purge
            if (currentSig !== '') {
                // initialize meta from existing password_hash
                try { fs.writeFileSync(metaPath, currentSig) } catch (e) { console.error('Failed to initialize password_hash.meta', e) }
            } else {
                // both meta and password_hash missing -> purge
                if (fs.existsSync('keys') || fs.existsSync('encrypted') || fs.existsSync('decrypted')) {
                    deleteAllUserData()
                }
            }
        }
    } catch (e) {
        console.error('checkPasswordIntegrity error', e)
    }
}

// Run integrity check now that helpers are defined
checkPasswordIntegrity()

const setPassphrase = async (event, args) => {
    const { passphrase } = args;
    const cur = await new Promise((resolve, reject) => {
        bcrypt.hash(passphrase, 13, (err, hash) => {
            if (err) reject(err)
            resolve(hash)
        });
    })
    if (passphrase.length !== 16) {
        dialog.showErrorBox("Passphrase Error", "Passphrase must be 16 characters long")
        return false;
    }
    fs.writeFileSync("password_hash", cur);
    // write a sidecar meta file containing a signature of the password_hash contents
    try {
        const sig = computeHashOfFile('password_hash')
        fs.writeFileSync('password_hash.meta', sig)
    } catch (e) {
        console.error('Failed to write password_hash.meta', e)
    }
    PASSPHRASE = passphrase
    return true;
}


let countdownDuration = 20 * 60; // 20 minutes in seconds
let remainingTime = countdownDuration;
let timerInterval = null;

ipcMain.handle("reset-timer", (event, args) =>{
    clearInterval(timerInterval)
    timerInterval = null
    remainingTime = countdownDuration
    startTimer() // Restart the timer immediately after resetting
    win.webContents.send("updateDisplay", {remainingTime: remainingTime})
})

function startTimer() {
  if (timerInterval) return; // Prevent multiple intervals

  timerInterval = setInterval(() => {
    if (remainingTime > 0) {
      remainingTime--;
      win.webContents.send("updateDisplay", {remainingTime: remainingTime})
    } else {
      clearInterval(timerInterval);
      timerInterval = null;
      win.webContents.send("updateDisplay", {remainingTime: remainingTime})
    }
  }, 1000);
}

// 1. Press Build Button // DONE
// 2. Run Build function // DONE
//  2a. Call waitForPassphrase // DONE
    // 2a1. Open window // DONE
    // 2a2. On button click: check password // DONE
    // 2a3. If password correct, return true // DONE
    // 2a4. If passsword wrong, yield return and try again. // DONE
    // 2a5. If exit, return false // DONE (see below)
//  2b. If waitForPassphrase was true: build // DONE
//  2c. If waitForPassphrase was false: cancel build // DONE

// Get rid of password input in top right // DONE
// Strip out PASSPHRASE instances // DONE
// Add callback for window termination during passphrase check // DONE

// Consider if we want password for downloading files // WE DO, DONE

// Add countdown to resubmit passphrase // DONE
// Add check for countdown when doing special actions // DONE
// Add notification for incorrect password and correct password // DONE
// Verify that build, decrypt, and build all wait for open-passphrase-window and submit-passphrase to  // DONE
    // BUILD // DONE
    // DECRYPT // DONE
    // BUILD ALL // DONE
    // ONBOARD PARTICIPANT // DONE
    // FETCH DATA // DONE
// Make APKs build to different subfolders // DONE
// Add notification for buidling // DONE
// Change default settings for DMPO // DONE
// Add check to close auxillary windows when closing main window ***