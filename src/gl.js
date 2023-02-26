var canvas;
var gl;

var screenWidth = 512;
var screenHeight = 512;

const vertexCode = 
	"#version 300 es\n" +
	
	"layout (location = 0) in vec2 inPos;\n" +
	"layout (location = 1) in vec2 inTexCoord;\n" +
	"layout (location = 2) in vec4 inColor;\n" +
	
	"out vec2 texCoord;\n" +
	"out vec4 color;\n" +
	"uniform mat4 uProjection;\n" +
	
	"void main(void)\n" +
	"{\n" +
	"	texCoord = inTexCoord;\n" +
	"	color = inColor;\n" +
	"	gl_Position = uProjection * vec4(inPos, 0.0, 1.0);\n" +
	"}";

const fragCode = 
	"#version 300 es\n" +
	"precision highp float;\n" +
	
	"in vec2 texCoord;\n" +
	"in vec4 color;\n" +
	"out vec4 fragColor;\n" +
	"uniform sampler2D uTexture;\n" +
	
	"void main(void)\n" +
	"{\n" +
	"	fragColor = texture(uTexture, texCoord) * color;\n" +
	"}";

var shader;
var ortho;
var shaderTexture;
var shaderProjection;

const SPRITE_BUF_COUNT = 512 * 6 * 8;
var spriteVertBuf;
var spriteVertices = new Float32Array(SPRITE_BUF_COUNT);
var spriteVertCount = 0;
var spriteQueue = new Map();

const bgColor = [0, 0, 0];

class Texture
{
	texture;
	width = 0;
	height = 0;
	
	constructor(url, loadCallback)
	{
		var texture = gl.createTexture();
		this.texture = texture;
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		
		this.width = 1;
		this.height = 1;
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			this.width,
			this.height,
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			new Uint8Array([255, 0, 0, 255])
		);
		
		var image = new Image();
		image.crossOrigin = "anonymous";
		image.src = url;
		image.onload = () => {
			this.width = image.width;
			this.height = image.height;
			
			gl.bindTexture(gl.TEXTURE_2D, this.texture);
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGBA,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				image);

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			
			loadCallback();
		};
	}
	
	destroy()
	{
		gl.deleteTexture(this.texture);
	}
}

function initGL()
{
	canvas = document.getElementById("engine-canvas");
	gl = canvas.getContext("webgl2", { alpha: false, premultipliedAlpha: false });
	
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		
	shader = compileShader(vertexCode, fragCode);
	gl.useProgram(shader);
	
	shaderTexture = gl.getUniformLocation(shader, "uTexture");
	shaderProjection = gl.getUniformLocation(shader, "uProjection");
	
	var inPos = gl.getAttribLocation(shader, "inPos");
	var inTexCoord = gl.getAttribLocation(shader, "inTexCoord");
	var inColor = gl.getAttribLocation(shader, "inColor");
	
	spriteVertBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, spriteVertBuf);
	gl.bufferData(gl.ARRAY_BUFFER, spriteVertices, gl.STATIC_DRAW);
	gl.vertexAttribPointer(inPos, 2, gl.FLOAT, false, 8 * 4, 0 * 4);
	gl.vertexAttribPointer(inTexCoord, 2, gl.FLOAT, false, 8 * 4, 2 * 4);
	gl.vertexAttribPointer(inColor, 4, gl.FLOAT, false, 8 * 4, 4 * 4);
	gl.enableVertexAttribArray(inPos);
	gl.enableVertexAttribArray(inTexCoord);
	gl.enableVertexAttribArray(inColor);
}

function compileShader(vertexCode, fragCode)
{
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, vertexCode);
	gl.compileShader(vertexShader);
	
	var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragShader, fragCode);
	gl.compileShader(fragShader);
	
	var program = gl.createProgram();
	gl.attachShader(program, vertexShader); 
	gl.attachShader(program, fragShader);
	gl.linkProgram(program);
	
	gl.deleteShader(vertexShader);
	gl.deleteShader(fragShader);
	
	return program;
}

function multiplyMatrices(a, b)
{
	var a00 = a[(0 * 4) + 0];
	var a01 = a[(0 * 4) + 1];
	var a02 = a[(0 * 4) + 2];
	var a03 = a[(0 * 4) + 3];
	var a10 = a[(1 * 4) + 0];
	var a11 = a[(1 * 4) + 1];
	var a12 = a[(1 * 4) + 2];
	var a13 = a[(1 * 4) + 3];
	var a20 = a[(2 * 4) + 0];
	var a21 = a[(2 * 4) + 1];
	var a22 = a[(2 * 4) + 2];
	var a23 = a[(2 * 4) + 3];
	var a30 = a[(3 * 4) + 0];
	var a31 = a[(3 * 4) + 1];
	var a32 = a[(3 * 4) + 2];
	var a33 = a[(3 * 4) + 3];
	
	var b00 = b[(0 * 4) + 0];
	var b01 = b[(0 * 4) + 1];
	var b02 = b[(0 * 4) + 2];
	var b03 = b[(0 * 4) + 3];
	var b10 = b[(1 * 4) + 0];
	var b11 = b[(1 * 4) + 1];
	var b12 = b[(1 * 4) + 2];
	var b13 = b[(1 * 4) + 3];
	var b20 = b[(2 * 4) + 0];
	var b21 = b[(2 * 4) + 1];
	var b22 = b[(2 * 4) + 2];
	var b23 = b[(2 * 4) + 3];
	var b30 = b[(3 * 4) + 0];
	var b31 = b[(3 * 4) + 1];
	var b32 = b[(3 * 4) + 2];
	var b33 = b[(3 * 4) + 3];
	
	return [
		(b00 * a00) + (b01 * a10) + (b02 * a20) + (b03 * a30),
		(b00 * a01) + (b01 * a11) + (b02 * a21) + (b03 * a31),
		(b00 * a02) + (b01 * a12) + (b02 * a22) + (b03 * a32),
		(b00 * a03) + (b01 * a13) + (b02 * a23) + (b03 * a33),
		(b10 * a00) + (b11 * a10) + (b12 * a20) + (b13 * a30),
		(b10 * a01) + (b11 * a11) + (b12 * a21) + (b13 * a31),
		(b10 * a02) + (b11 * a12) + (b12 * a22) + (b13 * a32),
		(b10 * a03) + (b11 * a13) + (b12 * a23) + (b13 * a33),
		(b20 * a00) + (b21 * a10) + (b22 * a20) + (b23 * a30),
		(b20 * a01) + (b21 * a11) + (b22 * a21) + (b23 * a31),
		(b20 * a02) + (b21 * a12) + (b22 * a22) + (b23 * a32),
		(b20 * a03) + (b21 * a13) + (b22 * a23) + (b23 * a33),
		(b30 * a00) + (b31 * a10) + (b32 * a20) + (b33 * a30),
		(b30 * a01) + (b31 * a11) + (b32 * a21) + (b33 * a31),
		(b30 * a02) + (b31 * a12) + (b32 * a22) + (b33 * a32),
		(b30 * a03) + (b31 * a13) + (b32 * a23) + (b33 * a33)
	];
}

function multMatrixVector(a, b)
{
	var a00 = a[(0 * 4) + 0];
	var a01 = a[(0 * 4) + 1];
	var a02 = a[(0 * 4) + 2];
	var a03 = a[(0 * 4) + 3];
	var a10 = a[(1 * 4) + 0];
	var a11 = a[(1 * 4) + 1];
	var a12 = a[(1 * 4) + 2];
	var a13 = a[(1 * 4) + 3];
	var a20 = a[(2 * 4) + 0];
	var a21 = a[(2 * 4) + 1];
	var a22 = a[(2 * 4) + 2];
	var a23 = a[(2 * 4) + 3];
	var a30 = a[(3 * 4) + 0];
	var a31 = a[(3 * 4) + 1];
	var a32 = a[(3 * 4) + 2];
	var a33 = a[(3 * 4) + 3];
	
	var bx = b[0];
	var by = b[1];
	var bz = b[2];
	var bw = b[3];
	
	return [
		(bx * a00) + (by * a10) + (bz * a20) + (bw * a30),
		(bx * a01) + (by * a11) + (bz * a21) + (bw * a31),
		(bx * a02) + (by * a12) + (bz * a22) + (bw * a32),
		(bx * a03) + (by * a13) + (bz * a23) + (bw * a33),
	];
}

function orthoProjection(width, height)
{
	return [2 / width, 0, 0, 0,
			0, -2 / height, 0, 0,
			0, 0, 1, 0,
			-1, 1, 0, 1];
}

function translateMatrix(x, y)
{
	return [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		x, y, 0, 1,
	];
}

function rotateMatrix(angle)
{
	c = Math.cos(angle);
	var s = Math.sin(angle);
	return [
		c, s, 0, 0,
		-s, c, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	];
}

function scaleMatrix(x, y)
{
	return [
		x, 0, 0, 0,
		0, y, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	];
}

function setBGColor(r, g, b)
{
	bgColor[0] = r;
	bgColor[1] = g;
	bgColor[2] = b;
}

function renderGL()
{
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clearColor(bgColor[0], bgColor[1], bgColor[2], 1);
	gl.clear(gl.COLOR_BUFFER_BIT);

	ortho = orthoProjection(screenWidth, screenHeight);
	gl.uniformMatrix4fv(shaderProjection, false, ortho);

	gl.bindBuffer(gl.ARRAY_BUFFER, spriteVertBuf);

	for (entry of spriteQueue.entries()) {
		for (var j = 0; j < entry[1].length; ++j) {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, entry[0].texture);
			gl.uniform1i(shaderTexture, 0);

			addSpriteVertices(entry[1][j][0], entry[0], entry[1][j][1],
				entry[1][j][2], entry[1][j][3], entry[1][j][4], entry[1][j][5], entry[1][j][6],
				entry[1][j][7]);
		}
		flushSpriteVertices();
	}
	spriteQueue.clear();
}

function drawSprite(sprites, texture, frame, x, y, scaleX, scaleY, angle, color)
{
	if (!spriteQueue.has(texture)) {
		spriteQueue.set(texture, new Array());
	}
	spriteQueue.get(texture).push([sprites, frame, x, y, scaleX, scaleY, angle, color]);
}

function addSpriteVertices(sprites, texture, frame, x, y, scaleX, scaleY, angle, color)
{
	var transform = multiplyMatrices(
						translateMatrix(x, y),
						rotateMatrix(angle * Math.PI / 180));
	transform = multiplyMatrices(transform,
						scaleMatrix(scaleX, scaleY));
	transform = multiplyMatrices(transform,
						translateMatrix(-sprites[frame][4], -sprites[frame][5]));
						
	var xt0 = sprites[frame][0] / texture.width;
	var yt0 = sprites[frame][1] / texture.height;
	var xt1 = (sprites[frame][0] + sprites[frame][2]) / texture.width;
	var yt1 = (sprites[frame][1] + sprites[frame][3]) / texture.height;
	
	var point0 = multMatrixVector(transform, [0, 0, 0, 1]);
	var point1 = multMatrixVector(transform, [sprites[frame][2], 0, 0, 1]);
	var point2 = multMatrixVector(transform, [0, sprites[frame][3], 0, 1]);
	var point3 = multMatrixVector(transform, [sprites[frame][2], sprites[frame][3], 0, 1]);
	
	spriteVertices[spriteVertCount++] = point0[0];
	spriteVertices[spriteVertCount++] = point0[1];
	spriteVertices[spriteVertCount++] = xt0;
	spriteVertices[spriteVertCount++] = yt0;
	spriteVertices[spriteVertCount++] = color[0];
	spriteVertices[spriteVertCount++] = color[1];
	spriteVertices[spriteVertCount++] = color[2];
	spriteVertices[spriteVertCount++] = color[3];
	
	spriteVertices[spriteVertCount++] = point1[0];
	spriteVertices[spriteVertCount++] = point1[1];
	spriteVertices[spriteVertCount++] = xt1;
	spriteVertices[spriteVertCount++] = yt0;
	spriteVertices[spriteVertCount++] = color[0];
	spriteVertices[spriteVertCount++] = color[1];
	spriteVertices[spriteVertCount++] = color[2];
	spriteVertices[spriteVertCount++] = color[3];
	
	spriteVertices[spriteVertCount++] = point2[0];
	spriteVertices[spriteVertCount++] = point2[1];
	spriteVertices[spriteVertCount++] = xt0;
	spriteVertices[spriteVertCount++] = yt1;
	spriteVertices[spriteVertCount++] = color[0];
	spriteVertices[spriteVertCount++] = color[1];
	spriteVertices[spriteVertCount++] = color[2];
	spriteVertices[spriteVertCount++] = color[3];
	
	spriteVertices[spriteVertCount] = spriteVertices[spriteVertCount++ - 8];
	spriteVertices[spriteVertCount] = spriteVertices[spriteVertCount++ - 8];
	spriteVertices[spriteVertCount] = spriteVertices[spriteVertCount++ - 8];
	spriteVertices[spriteVertCount] = spriteVertices[spriteVertCount++ - 8];
	spriteVertices[spriteVertCount++] = color[0];
	spriteVertices[spriteVertCount++] = color[1];
	spriteVertices[spriteVertCount++] = color[2];
	spriteVertices[spriteVertCount++] = color[3];
	
	spriteVertices[spriteVertCount++] = point3[0];
	spriteVertices[spriteVertCount++] = point3[1];
	spriteVertices[spriteVertCount++] = xt1;
	spriteVertices[spriteVertCount++] = yt1;
	spriteVertices[spriteVertCount++] = color[0];
	spriteVertices[spriteVertCount++] = color[1];
	spriteVertices[spriteVertCount++] = color[2];
	spriteVertices[spriteVertCount++] = color[3];
	
	spriteVertices[spriteVertCount] = spriteVertices[spriteVertCount++ - 32];
	spriteVertices[spriteVertCount] = spriteVertices[spriteVertCount++ - 32];
	spriteVertices[spriteVertCount] = spriteVertices[spriteVertCount++ - 32];
	spriteVertices[spriteVertCount] = spriteVertices[spriteVertCount++ - 32];
	spriteVertices[spriteVertCount++] = color[0];
	spriteVertices[spriteVertCount++] = color[1];
	spriteVertices[spriteVertCount++] = color[2];
	spriteVertices[spriteVertCount++] = color[3];
	
	if (spriteVertCount >= SPRITE_BUF_COUNT) {
		flushSpriteVertices();
	}
}

function flushSpriteVertices()
{
	if (spriteVertCount > 0) {
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, spriteVertices);
		gl.drawArrays(gl.TRIANGLES, 0, spriteVertCount / 8);
		spriteVertCount = 0;
	}
}
