const {webUtils } = require('electron');
const { createWorker } = require('tesseract.js');


async function performOCR(imagePath) {

  //const worker = await createWorker(`C:\\Users\\cellaz\\Documents\\GitHub\\DMPO-AZ\\imageAnalysis\\eng.traineddata`);
  
  const worker = createWorker({
    cachePath: __dirname,
    logger: m => console.log(m),
  });
  
  await worker.loadLanguage('eng');
  await worker.initialize('eng');

  const ret = await worker.recognize(imagePath);
  console.log(ret.data.text);
  await worker.terminate();

}

document.getElementById("imageSelector").addEventListener("change", (event) => {
    
    const fileList = event.target.files; 

    for (const file of fileList) {
      const path = webUtils.getPathForFile(file);
      console.log(file, path, __dirname);
      performOCR(path);
        
    }
});


