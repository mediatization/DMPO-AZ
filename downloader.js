const { BlobClient } = require("@azure/storage-blob");
const fs = require("fs");

class Downloader {
    constructor() {
        this.queue = [];
        this.maxNumDownloads = 1000;
        this.downloading = false;
        this.currentName = "";
        this.currentKey = "";
        this.currentTotal = 0;
        this.currentDownloaded = 0;
        this.progressCallback = null;
    }


    setCurrentInfo(newKey, newName, total) {
        this.currentKey = newKey;
        this.currentName = newName
        this.currentDownloaded = 0;
        this.currentTotal = total;
    }

    setProgressCallback(cb) {
        this.progressCallback = cb
    }

    addFilesToQueue(files) {
        this.queue = [...this.queue, ...files];
    }

    printQueue() {
        console.log(`${this.queue.length} items in queue`);
    }

    async startDownloading() {
        for (let i = 0; i < this.maxNumDownloads; i++) {
            this.downloadProcess();
        }
    }

    async downloadProcess() {
        if (this.downloading) {
            return;
        }
        this.downloading = true
        while (this.queue.length > 0) {
            const file = this.queue.shift()
            await ensureDownload(file, this.currentName);
            this.currentDownloaded = (this.currentDownloaded || 0) + 1
            if (this.progressCallback) {
                try { this.progressCallback(this.currentKey, this.currentDownloaded, this.currentTotal) } catch(e) { console.error('progress callback', e) }
            }
        }
        this.downloading = false
    }
}

// New with azure download
const ensureDownload = async (file, name) => {
    return new Promise((resolve, reject) => {
        fs.mkdir(
            `./encrypted/${name}`,
            { recursive: true },
            async () => {
                const path = `./encrypted/${name}/${file.name}`;
                fs.stat(path, (err, stats) => {
                    if (!err && stats.size > 0) {
                        resolve(true);
                    }
                });
                await file.downloadToFile(path),
                resolve(true);
            }
        );
    });
};

module.exports = { Downloader };
