const { BlobClient } = require("@azure/storage-blob");
const fs = require("fs");

class Downloader {
    constructor() {
        this.queue = [];
        this.maxNumDownloads = 1000;
        this.downloading = false
        this.currentKey = "";
        this.currentTotal = 0;
        this.currentDownloaded = 0;
        this.progressCallback = null;
    }

    setCurrentKey(newKey)
    {
        this.currentKey = newKey;
        this.currentDownloaded = 0;
        this.currentTotal = 0;
    }

    setCurrentKey(newKey, total) {
        this.currentKey = newKey;
        this.currentDownloaded = 0;
        this.currentTotal = total || 0;
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
            await ensureDownload(file, this.currentKey);
            this.currentDownloaded = (this.currentDownloaded || 0) + 1
            if (this.progressCallback) {
                try { this.progressCallback(this.currentKey, this.currentDownloaded, this.currentTotal) } catch(e) { console.error('progress callback', e) }
            }
        }
        this.downloading = false
    }
}

const exists = async (destPath) => {
    return new Promise((resolve, reject) => {
        fs.stat(destPath, (err, stats) => {
            if (!err && stats.size > 0) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
};

// New with azure download
const ensureDownload = async (file, key) => {
    return new Promise((resolve, reject) => {
        fs.mkdir(
            `./encrypted/${key}`,
            { recursive: true },
            async () => {
                const path = `./encrypted/${key}/${file.name}`;
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
