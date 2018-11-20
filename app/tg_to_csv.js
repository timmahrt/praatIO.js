
function loadFromLocal (file, handler) {
    let reader = new FileReader();
    reader.onload = function(fd) {
	let data = fd.target.result;
	handler(file, data);
	};
    reader.readAsText(file);
}

function tgLoaded (file, data) {
    console.log(file.name);
    let outputFn = file.name.split('.')[0] + '.csv';
    let tg = readTextgrid(data);
    let csv = tgToCsv(tg, 'Vowel', ['Word', 'Vowel', 'Syllableid', 'Stress', 'Error']);
    document.getElementById('displayarea').innerText = csv;
    download(csv, outputFn, 'text/plain');
}

function download(content, fileName, contentType) {
    // https://stackoverflow.com/questions/34156282/how-do-i-save-json-to-local-text-file
    var a = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

function tgToCsv (tg, pivotTierName, tierNameArray) {

  let table = [tierNameArray, ];
  tier = tg.tierDict[pivotTierName];
  for (let i = 0; i < tier.entryList.length; i++) {
    let start = tier.entryList[i][0];
    let stop = tier.entryList[i][1];
    let label = tier.entryList[i][2];
    
    let subTG = tg.crop(start, stop, 'truncated', false);
    
    let row = [];
    for (let j = 0; j < tierNameArray.length; j++) {
      let subLabel = '';
      if (subTG.tierNameList.includes(tierNameArray[j])) {
        let subTier = subTG.tierDict[tierNameArray[j]];
        subLabel = subTier.entryList[0][2];
      }
      row.push(subLabel);
    }
    table.push(row);
  }

  table = table.map(row => row.join(','));
  let csv = table.join('\n');

  return csv;
}

var dropzone = document.getElementById("dropzone");

  dropzone.ondrop = function(event) {
    event.preventDefault();
    this.className = "dropzone";

    console.log(event.dataTransfer.files[0]);

    var fileInput = document.getElementById('dropzone');
    var fileDisplayArea = document.getElementById('displayarea');
        
    var files = event.dataTransfer.files;

    for (var i = 0; i < files.length; i++) {
      var name = files[i].name;
    
      if (name.toLowerCase().includes('.textgrid')) {
        loadFromLocal(files[i], tgLoaded)
      }
    }
  }

  dropzone.ondragover = function() {
    this.className = "dropzone dragover";
    return false;
  };

  dropzone.ondragleave = function() {
    this.className = "dropzone";
    return false;
  };
