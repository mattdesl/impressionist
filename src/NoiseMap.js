var Class = require('klasse');

var SimplexNoise = require('simplex-noise');
var Vector2 = require('vecmath').Vector2;
var smoothstep = require('interpolation').smoothstep;
var lerp = require('interpolation').lerp;

var NoiseMap = new Class({

	initialize: function(size, random) {
		this.size = size;
		this.data = new Float32Array(size);
		this.simplex = new SimplexNoise(random);
	},


})