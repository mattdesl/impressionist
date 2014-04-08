var Class = require('klasse');
var SimplexNoise = require('simplex-noise');
var lerp = require('interpolation').lerp;
var sampling = require('./sampling');

var PRNG = function () {
    this.seed = 1;
    this.random = function() { return (this.gen() / 2147483647); };
    this.gen = function() { return this.seed = (this.seed * 16807) % 2147483647; };
};

var rand = undefined;

//we can use a deterministic random generator if we want...
//rand = new PRNG();

var simplex = new SimplexNoise(rand);

var NoiseMap = new Class({

    initialize: function(size) {
        if (!size)
            throw "no size specified to NoiseMap";

        this.size = size;   
        this.scale = 20;
        this.offset = 0;
        this.smooth = true;
        this.seamless = false;

        this.data = new Float32Array(this.size * this.size);
    },
    
    seamlessNoise: function(s, t, scale, cx, cy, cz, cw) {
        // Generate the 4d coordinates that wrap around seamlessly
        var r = scale / (2 * Math.PI);
        var axy = 2 * Math.PI * s / scale;        
        var x = r * Math.cos(axy);
        var y = r * Math.sin(axy);
        
        var azw = 2 * Math.PI * t / scale;        
        var z = r * Math.cos(azw);
        var w = r * Math.sin(azw);

        return simplex.noise4D(cx + x, cy + y, cz + z, cw + w);
    },

    generate: function() {
        var noiseMap = this.data,
            noiseSize = this.size,
            noiseOff = this.offset,
            seamless = this.seamless,
            zoom = this.scale;

        for (var i=0; i<noiseMap.length; i++) {
            var x = i % noiseSize,
                y = ~~( i / noiseSize );

            if (seamless)
                noiseMap[i] = this.seamlessNoise(x/noiseSize*zoom + noiseOff, y/noiseSize*zoom + noiseOff, zoom, 0, 0, 0, 0);
            else
                noiseMap[i] = simplex.noise3D(x/noiseSize * zoom, y/noiseSize * zoom, noiseOff);
        }
    },

    sample: function(x, y) {
        if (this.smooth)
            return sampling.bilinear(this.data, this.size, x, y);
        else
            return sampling.nearest(this.data, this.size, x, y);
    },
});


module.exports = NoiseMap;