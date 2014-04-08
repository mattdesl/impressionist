var canvas, context;

module.exports.getImageData = function(image, width, height) {
	if (!canvas) {
		canvas = document.createElement("canvas");
		context = canvas.getContext("2d");
	}

	width = (width||width===0) ? width : image.width;
	height = (height||height===0) ? height : image.height;

	canvas.width = width;
	canvas.height = height;
	
	context.globalAlpha = 1;
	context.clearRect(0, 0, width, height);
	context.drawImage(image, 0, 0, width, height);

	var imgData = context.getImageData(0, 0, width, height);
	return imgData;
};

module.exports.release = function() {
	if (canvas) {
		canvas = null;
		context = null;
	}	
};
