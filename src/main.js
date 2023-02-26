var bgTexture = null;
var bgSprites;
var bgScroll;
var bgAutoScroll = [];

var loaded = false;
var cameraX = 0;

function engineAppInit()
{
	addScrollSectVals(32, 0.125, 1, 0, 1);
	addScrollSectVals(32, 0.125, 0.75, 0, 1);
	addScrollSectVals(24, 0.125, 0.5, 0, 1);
	addScrollSectVals(8, 0.125, 0.25, 0, 1);
	addScrollSectVals(48, 0.125, 0, 0, 1);
	addScrollSectVals(64, 0.25, 0, 0, 1);
	addScrollSectVals(128, 0.25, 0, 0.003, 1);
	
	bgTexture = new Texture("res/bg.png", function() {
		initScroll();
	});
	
	document.getElementById("img-upload").addEventListener('change', function() {
		if (this.files && this.files[0]) {
			loaded = false;
			var imgURL = URL.createObjectURL(this.files[0]);
			if (bgTexture != null) {
				bgTexture.destroy();
			}
			bgTexture = new Texture(imgURL, function() {
				URL.revokeObjectURL(imgURL);
				initScroll();
			});
		}
	});
}

function engineAppUpdate()
{
	var height = Math.min(bgTexture.height,
		Math.max(32, Math.floor(parseFloat(document.getElementById("canvas-height").value))));
	document.getElementById("canvas-container").style = "max-height: " + (height + 4).toString() + "px;";
	
	if (loaded) {
		updateScroll();
	}
}

function initScroll()
{
	bgSprites = [];
	bgScroll = [];
	cameraX = 0;
	
	for (var i = 0; i < bgTexture.height; ++i) {
		bgSprites.push([0, i, bgTexture.width, 1, 0, 0]);
		bgScroll.push(0);
	}
	
	screenHeight = bgTexture.height;
	document.getElementById("camera-speed").value = "3";
	document.getElementById("canvas-height").max = screenHeight;
	document.getElementById("canvas-height").value = screenHeight;
	canvas.width = screenWidth;
	canvas.height = screenHeight;
	
	loaded = true;
}

function updateScroll()
{
	var table = document.getElementById("scroll-sect-entries");
	
	var line = 0;
	for (var i = 0; i < table.childNodes.length && line < bgScroll.length; ++i) {
		var row = table.childNodes[i];
		
		var size = Math.max(1, Math.floor(parseFloat(row.childNodes[0].childNodes[0].value)));
		var factor = parseFloat(row.childNodes[1].childNodes[0].value);
		var autoSpeed = parseFloat(row.childNodes[2].childNodes[0].value);
		var accum = parseFloat(row.childNodes[3].childNodes[0].value);
		var accumBlk = Math.max(1, Math.floor(parseFloat(row.childNodes[4].childNodes[0].value)));

		for (var j = 0; j < size && line < bgScroll.length; ++j) {
			bgScroll[line++] = (cameraX * factor) + bgAutoScroll[i];
			if ((j + 1) % accumBlk == 0) {
				factor += accum;
			}
		}
		bgAutoScroll[i] += autoSpeed;
	}
	while (line < bgScroll.length) {
		bgScroll[line++] = 0;
	}
	
	cameraX += parseFloat(document.getElementById("camera-speed").value);
	
	for (var i = 0; i < bgTexture.height; ++i) {
		var off = bgScroll[i] % bgTexture.width;
		for (var x = -off; x < screenWidth + bgTexture.width; x += bgTexture.width) {
			drawSprite(bgSprites, bgTexture, i,
				x, i, 1, 1, 0, [1, 1, 1, 1]);
		}
	}
}

function addScrollSect()
{
	addScrollSectVals(32, 1, 0, 0, 1);
}

function addScrollSectVals(size, factor, autoSpeed, accum, accumBlk)
{
	var table = document.getElementById("scroll-sect-entries");
	var row = document.createElement("tr");
	
	var idx = table.childNodes.length;
	bgAutoScroll.push(0);
	
	var sizeCol = document.createElement("td");
	var factorCol = document.createElement("td");
	var autoSpeedCol = document.createElement("td");
	var accumCol = document.createElement("td");
	var accumBlkCol = document.createElement("td");
	var removeCol = document.createElement("td");
	removeCol.classList.add("scroll-remove");
	
	var sizeBox = document.createElement("input");
	sizeBox.classList.add("scroll-flex-element");
	sizeBox.value = size.toString();
	sizeBox.min = "1";
	sizeBox.type = "number";
	sizeCol.appendChild(sizeBox);
	
	var factorBox = document.createElement("input");
	factorBox.classList.add("scroll-flex-element");
	factorBox.value = factor.toString();
	factorBox.step = "0.025";
	factorBox.type = "number";
	factorCol.appendChild(factorBox);
	
	var autoSpeedBox = document.createElement("input");
	autoSpeedBox.classList.add("scroll-flex-element");
	autoSpeedBox.value = autoSpeed.toString();
	autoSpeedBox.step = "0.025";
	autoSpeedBox.type = "number";
	autoSpeedCol.appendChild(autoSpeedBox);
	
	var accumBox = document.createElement("input");
	accumBox.classList.add("scroll-flex-element");
	accumBox.value = accum.toString();
	accumBox.step = "0.0005";
	accumBox.type = "number";
	accumCol.appendChild(accumBox);
	
	var accumBlkBox = document.createElement("input");
	accumBlkBox.classList.add("scroll-flex-element");
	accumBlkBox.value = accumBlk.toString();
	accumBlkBox.min = "1";
	accumBlkBox.type = "number";
	accumBlkCol.appendChild(accumBlkBox);
	
	var removeButton = document.createElement("button");
	removeButton.classList.add("scroll-flex-element");
	removeButton.innerText = "-";
	removeButton.onclick = function() {
		bgAutoScroll.splice(idx, 1);
		
		sizeBox.remove();
		factorBox.remove();
		autoSpeedBox.remove();
		accumBox.remove();
		accumBlkCol.remove();
		removeButton.remove();
		
		sizeCol.remove();
		factorCol.remove();
		autoSpeedCol.remove();
		accumCol.remove();
		accumBlkCol.remove();
		removeCol.remove();
		
		row.remove();
	};
	removeCol.appendChild(removeButton);
	
	row.appendChild(sizeCol);
	row.appendChild(factorCol);
	row.appendChild(autoSpeedCol);
	row.appendChild(accumCol);
	row.appendChild(accumBlkCol);
	row.appendChild(removeCol);
	table.appendChild(row);
}

function clearScrollSects()
{
	var table = document.getElementById("scroll-sect-entries");
	while (table.childNodes.length > 1) {
		var cols = table.childNodes[1].childNodes;
		while (cols.length > 0) {
			cols[0].childNodes[0].remove();
			cols[0].remove();
		}
		table.childNodes[1].remove();
	}
	bgAutoScroll = [];
}

engineRun();
