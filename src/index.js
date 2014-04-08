var $ = require('jquery');
var SimplexNoise = require('simplex-noise');
var Vector2 = require('vecmath').Vector2;
var smoothstep = require('interpolation').smoothstep;
var lerp = require('interpolation').lerp;




$(function() {

	console.log("TEST")

	var canvas = $("<canvas>").appendTo(document.body)[0];
	var context = canvas.getContext("2d");

	var width = 256,
		height = 256;
	
	canvas.width = width;
	canvas.height = height;

	var simplex = new SimplexNoise();


	function Particle(x, y, vx, vy) {
		this.position = new Vector2(x, y);
		this.velocity = new Vector2(vx, vy);
	}

	Particle.prototype.reset = function() {
		this.velocity.set(0, 0);
		// this.position.set(-width + Math.random()*width, Math.random()*height);

		// this.velocity.set(Math.random()*2-1, Math.random()*2-1);
		this.position.set(Math.random()*width, Math.random()*height);
		return this;
	}

	var particles = [],
		count = 5000;

	for (var i=0; i<count; i++) {
		particles.push(new Particle().reset());
	}

	var tmp = new Vector2();
	var tmp2 = new Vector2();

	var noiseSize = 256,
		noiseMap = new Float32Array(noiseSize*noiseSize);
	var noiseOff = 0;
	var step = 0;


	var imageData = new Float32Array(noiseSize*noiseSize);

	var image = new Image();
	image.onload = handleImage;
	image.src = "img/lenna4.png";

	var mouse = new Vector2();

	var bgImagePixels;

	function handleImage() {
		var cnv = document.createElement("canvas");
		cnv.width = image.width;
		cnv.height = image.height;
		var ctx = cnv.getContext("2d");
		ctx.drawImage(image, 0, 0);
		var imgData = ctx.getImageData(0, 0, image.width, image.height);
		bgImagePixels = imgData.data;

		requestAnimationFrame(render);
	}

	window.addEventListener("mousemove", function(ev) {
		mouse.x = ev.clientX;
		mouse.y = ev.clientY;
	}, false);

	function getImageData(image, output) {//assume power of two !!
		var cnv = document.createElement("canvas");


		var size = Math.sqrt(output.length);

		cnv.width = cnv.height = size;
		var ctx = cnv.getContext("2d");

		ctx.drawImage(image, 0, 0, size, size);
		var imgData = ctx.getImageData(0, 0, size, size);
		var pix = imgData.data;

		for (var i=0; i<size*size; i++) {
			var n = pix[i*4]/255;
			output[i] = n;
		}

		// ctx.putImageData(imgData, 0, 0);
		// document.body.appendChild(cnv);

		return output;
	}

	function updateNoise() {
		for (var i=0; i<noiseMap.length; i++) {
			var x = i % noiseSize,
			    y = ~~( i / noiseSize );

			var zoom = 1;
			noiseMap[i] = simplex.noise3D(x/noiseSize * zoom, y/noiseSize * zoom, noiseOff);

			// var d = tmp.set(x, y).sub(mouse).div(tmp2.set(noiseSize, noiseSize)).length();

			// noiseMap[i] = lerp(1.0, noiseMap[i], smoothstep(0.0, 0.3, d));

			// var n = simplex.noise3D(x/noiseSize * zoom, y/noiseSize * zoom, noiseOff) * 10;

			// var px = ~~(x + n) % noiseSize,
			// 	py = ~~(y + n) % noiseSize,
			// 	pi = px + (py * noiseSize);

			// zoom = 25;
			// n = simplex.noise3D(x/noiseSize * zoom, y/noiseSize * zoom, noiseOff);
			// noiseMap[i] = n/2 * ((1-imageData[pi])*4);

			// noiseMap[i] = simplex.noise2D(x/noiseSize * zoom + noiseOff, y/noiseSize * zoom + noiseOff);
			// noiseMap[i] = seamlessNoise(simplex, x/noiseSize*zoom + noiseOff, y/noiseSize*zoom + noiseOff, zoom);
		}
	}
	updateNoise();

	function seamlessNoise(simplex, s, t, scale) {
		var cx=0,cy=0,cz=0,cw=0;

        // Generate the 4d coordinates that wrap around seamlessly
        var r = scale / (2 * Math.PI);
        var axy = 2 * Math.PI * s / scale;        
        var x = r * Math.cos(axy);
        var y = r * Math.sin(axy);
        
        var azw = 2 * Math.PI * t / scale;        
        var z = r * Math.cos(azw);
        var w = r * Math.sin(azw);

        return simplex.noise4D(cx + x, cy + y, cz + z, cw + w);
	}

	function render() {
		// requestAnimationFrame(render);
		step++;

		if (step % 5 === 0) {
			noiseOff+=.01;
			updateNoise();
		}

		context.globalAlpha = 1;
		context.fillStyle = 'white';
		context.fillRect(0, 0, width, height);
		// context.globalCompositeOperation = 'color-dodge';


		// context.clearRect(0, 0, width, height);
	 // 	context.fillStyle = 'black';
		// for (var i=0; i<noiseMap.length; i++) {
		// 	var x = i % noiseSize,
		// 	    y = ~~( i / noiseSize );

		// 	var zoom = 10;
		// 	//context.globalAlpha = simplex.noise3D(x/noiseSize * zoom, y/noiseSize * zoom, noiseOff) / 2 + 0.5;

		// 	// context.globalAlpha *= simplex.noise2D(x/noiseSize * zoom + noiseOff, y/noiseSize * zoom + noiseOff) / 2 + 0.5;
		// 	// noiseMap[i] = seamlessNoise(simplex, x/noiseSize*zoom + noiseOff, y/noiseSize*zoom + noiseOff, zoom);

		//     context.globalAlpha = noiseMap[i%noiseMap.length]/2+.5;
		// 	context.fillRect(x, y, 1, 1);
	 //    }

	 	context.fillStyle = 'black';
	 	context.globalAlpha = 1;
	 	
	 	// context.drawImage(image, 0, 0);

		for (var i=0; i<particles.length; i++) {
			var p = particles[i];

			// p.position.add(p.velocity);

			//distance from mouse
			var d = tmp.copy(p.position).sub(mouse).div(tmp2.set(noiseSize, noiseSize)).length();
			var mouseDist = smoothstep(0.0, 0.2, d);

			tmp.copy(mouse).sub(p.position);
			tmp2.copy(p.velocity).sub(tmp);

			tmp2.scale((1-mouseDist) * 0.08);
			p.velocity.sub(tmp2);

			
			

			// //repel a bit from mouse
			// if (d < .15){
			// 	tmp.copy(mouse).sub(p.position);
			// 	tmp.scale(0.05);



			// 	// tmp.normalize();
			// 	// tmp.scale(d);
			// 	// p.velocity.sub( tmp );
			// 	// p.velocity.scale(d);
			// }

			//add in our motion
			var px = ~~p.position.x,
				py = ~~p.position.y;

			//determine index from noise map to sample from
			px = px % noiseSize;
			py = py % noiseSize;

			var noise = noiseMap[ px + (py * noiseSize) ];


			var angle = noise * Math.PI * 2;
			
			tmp.set( Math.cos(angle), Math.sin(angle) );
			p.velocity.add(tmp);

			 p.velocity.normalize();




			// if (p.position.x > width || p.position.x < 0 || p.position.y > height || p.position.y < 0 ) {
			// 	p.reset();
			// }

			if (/*p.position.x < 0 || */p.position.x > width || p.position.y > height || p.position.y < 0) {
				p.reset();
			}

			// context.fillStyle = 'hsl(360, 
			var rot = (noise/2+0.5);
			var md = smoothstep(0.0, 0.5, d);
			var hue = (noiseOff % 50)/50 * rot;

			var pxIndex = (px + (py * noiseSize))*4;
			var red = bgImagePixels[ pxIndex ],
				green = bgImagePixels[ pxIndex + 1],
				blue = bgImagePixels[pxIndex + 2];

			// console.log(pxIndex, px, py);break;
			// if (red)
				debugger;
			context.strokeStyle = 'rgb('+red+', '+green+', '+blue+')';

				
			// context.strokeStyle = 'hsl('+lerp(160, 320, rot)+', '+lerp(0.7, 1, rot*md)*100+'%, '+lerp(0.45, 0.55, rot)*100+'%)';

			// var s = lerp(1, 4, smoothstep(0, 1, d));
			var s = 2;
			// context.fillRect(p.position.x-s/2, p.position.y-s/2, s, s);

		 	context.beginPath();
			context.moveTo(p.position.x, p.position.y);

			var lineSize = (noise/2+0.5)*30;
			tmp.copy(p.position);
			tmp2.copy(p.velocity).scale(lineSize);
			tmp.add(tmp2);
			context.lineTo(tmp.x, tmp.y);
			context.stroke();
			context.globalAlpha = 0.5;
			context.lineWidth = lineSize/5 * (px/noiseSize);
			context.lineCap = 'round';
		}

	}

});