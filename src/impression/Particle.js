var Vector2 = require('vecmath').Vector2;

function Particle(x, y, vx, vy) {
	this.position = new Vector2(x, y);
	this.velocity = new Vector2(vx, vy);
	this.size = 0;
	this.speed = Math.random();
	this.brightness = Math.random();
}


Particle.prototype.random = function() {
	// this.velocity.set(Math.random()*2-1, Math.random()*2-1);
	this.size = Math.random();
	return this;
}
Particle.prototype.reset = function(width, height) {
	width=width||0;
	height=height||0;

	this.size = 0;
	this.brightness = Math.random();

	// this.velocity.set(Math.random()*2-1, Math.random()*2-1);
	this.velocity.set(0, 0);
	this.position.set(Math.random()*width, Math.random()*height);
	return this;
}

module.exports = Particle;