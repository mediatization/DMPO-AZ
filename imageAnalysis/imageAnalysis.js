const {webUtils} = require('electron');
const {createWorker} = require('tesseract.js');
const path = require('path');

async function performOCR(imagePath) {

  //const worker = await createWorker(`C:\\Users\\cellaz\\Documents\\GitHub\\DMPO-AZ\\imageAnalysis\\eng.traineddata`);
  
  const worker = await createWorker("eng", 1, {
    //temporary solution, eventually do this without absolute paths
    workerPath: path.join(__dirname, '../node_modules/tesseract.js/dist/worker.min.js'),
    corePath: path.join(__dirname, '../node_modules/tesseract.js-core/'),
    langPath: path.join(__dirname, './'), // directory containing eng.traineddata
    logger: m => console.log(m),
    // Disable gzip since the eng.traineddata file we are using is already uncompressed
    gzip: false,
    workerBlobURL: false
  });
  
  const { data: { text } } = await worker.recognize(imagePath);
  console.log(text);
  await worker.terminate();

}

document.getElementById("imageSelector").addEventListener("change", (event) => {
    
    const fileList = event.target.files; 

    for (const file of fileList) {
      const filePath = webUtils.getPathForFile(file);
      console.log(file, filePath, __dirname);
      performOCR(filePath);
    }
});


