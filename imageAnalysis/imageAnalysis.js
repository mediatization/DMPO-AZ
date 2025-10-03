const electron = require('electron');
import { createWorker } from 'tesseract.js';

const test = async () => {
    console.log("hello world");
    document.getElementById("testDiv").appendChild(document.createTextNode("Hello world"));
}

// function main() {
//     electron.ipcRenderer.invoke("fetch-data", { full: true });
//     ipcRenderer.invoke("open-onboard-window" );
// }
// main();

/*
document.getElementById("testDiv").appendChild(document.createTextNode("Hello world"));

async function performOCR(imagePath) {
  const worker = await createWorker('eng'); // 'eng' for English language
  const { data: { text } } = await worker.recognize(imagePath);
  console.log(text);
  await worker.terminate();
  return text;
}

const fileInput = document.getElementById("imageSelector");

fileInput.addEventListener("change", (event) => {

    console.log("hello world");
    document.getElementById("testDiv").appendChild(document.createTextNode("Hello world"));

    const fileList = event.target.files; 

    for (const file of fileList) {
        console.log(`File Name: ${file.name}`);
        console.log(`File Size: ${file.size} bytes`);
        console.log(`File Type: ${file.type}`);
        //performOCR(file.name);
        
    }

    document.getElementById("testDiv").appendChild(document.createTextNode("Hello world"));
});

function test() {

    document.getElementById("testDiv").appendChild(document.createTextNode("Hello world"));

    console.log("hello world 2");
    const fileList = document.getElementById("imageSelector").files; // This is a FileList object

    // You can iterate through the FileList like an array
    for (const file of fileList) {
        console.log(`File Name: ${file.name}`);
        console.log(`File Size: ${file.size} bytes`);
        console.log(`File Type: ${file.type}`);
        performOCR(file.name);
        // Further processing of each file can be done here
    }  


    document.getElementById("testDiv").appendChild(document.createTextNode("Hello world"));
}
*/
