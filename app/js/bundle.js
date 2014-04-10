(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/** Utility function for linear interpolation. */
module.exports.lerp = function(v0, v1, t) {
    return v0*(1-t)+v1*t;
};

/** Utility function for Hermite interpolation. */
module.exports.smoothstep = function(v0, v1, t) {
    // Scale, bias and saturate x to 0..1 range
    t = Math.max(0.0, Math.min(1.0, (t - v0)/(v1 - v0) ));
    // Evaluate polynomial
    return t*t*(3 - 2*t);
};
},{}],2:[function(require,module,exports){
function hasGetterOrSetter(def) {
	return (!!def.get && typeof def.get === "function") || (!!def.set && typeof def.set === "function");
}

function getProperty(definition, k, isClassDescriptor) {
	//This may be a lightweight object, OR it might be a property
	//that was defined previously.
	
	//For simple class descriptors we can just assume its NOT previously defined.
	var def = isClassDescriptor 
				? definition[k] 
				: Object.getOwnPropertyDescriptor(definition, k);

	if (!isClassDescriptor && def.value && typeof def.value === "object") {
		def = def.value;
	}


	//This might be a regular property, or it may be a getter/setter the user defined in a class.
	if ( def && hasGetterOrSetter(def) ) {
		if (typeof def.enumerable === "undefined")
			def.enumerable = true;
		if (typeof def.configurable === "undefined")
			def.configurable = true;
		return def;
	} else {
		return false;
	}
}

function hasNonConfigurable(obj, k) {
	var prop = Object.getOwnPropertyDescriptor(obj, k);
	if (!prop)
		return false;

	if (prop.value && typeof prop.value === "object")
		prop = prop.value;

	if (prop.configurable === false) 
		return true;

	return false;
}

//TODO: On create, 
//		On mixin, 

function extend(ctor, definition, isClassDescriptor, extend) {
	for (var k in definition) {
		if (!definition.hasOwnProperty(k))
			continue;

		var def = getProperty(definition, k, isClassDescriptor);

		if (def !== false) {
			//If Extends is used, we will check its prototype to see if 
			//the final variable exists.
			
			var parent = extend || ctor;
			if (hasNonConfigurable(parent.prototype, k)) {

				//just skip the final property
				if (Class.ignoreFinals)
					continue;

				//We cannot re-define a property that is configurable=false.
				//So we will consider them final and throw an error. This is by
				//default so it is clear to the developer what is happening.
				//You can set ignoreFinals to true if you need to extend a class
				//which has configurable=false; it will simply not re-define final properties.
				throw new Error("cannot override final property '"+k
							+"', set Class.ignoreFinals = true to skip");
			}

			Object.defineProperty(ctor.prototype, k, def);
		} else {
			ctor.prototype[k] = definition[k];
		}

	}
}

/**
 */
function mixin(myClass, mixins) {
	if (!mixins)
		return;

	if (!Array.isArray(mixins))
		mixins = [mixins];

	for (var i=0; i<mixins.length; i++) {
		extend(myClass, mixins[i].prototype || mixins[i]);
	}
}

/**
 * Creates a new class with the given descriptor.
 * The constructor, defined by the name `initialize`,
 * is an optional function. If unspecified, an anonymous
 * function will be used which calls the parent class (if
 * one exists). 
 *
 * You can also use `Extends` and `Mixins` to provide subclassing
 * and inheritance.
 *
 * @class  Class
 * @constructor
 * @param {Object} definition a dictionary of functions for the class
 * @example
 *
 * 		var MyClass = new Class({
 * 		
 * 			initialize: function() {
 * 				this.foo = 2.0;
 * 			},
 *
 * 			bar: function() {
 * 				return this.foo + 5;
 * 			}
 * 		});
 */
function Class(definition) {
	if (!definition)
		definition = {};

	//The variable name here dictates what we see in Chrome debugger
	var initialize;
	var Extends;

	if (definition.initialize) {
		if (typeof definition.initialize !== "function")
			throw new Error("initialize must be a function");
		initialize = definition.initialize;

		//Usually we should avoid "delete" in V8 at all costs.
		//However, its unlikely to make any performance difference
		//here since we only call this on class creation (i.e. not object creation).
		delete definition.initialize;
	} else {
		if (definition.Extends) {
			var base = definition.Extends;
			initialize = function () {
				base.apply(this, arguments);
			}; 
		} else {
			initialize = function () {}; 
		}
	}

	if (definition.Extends) {
		initialize.prototype = Object.create(definition.Extends.prototype);
		initialize.prototype.constructor = initialize;
		//for getOwnPropertyDescriptor to work, we need to act
		//directly on the Extends (or Mixin)
		Extends = definition.Extends;
		delete definition.Extends;
	} else {
		initialize.prototype.constructor = initialize;
	}

	//Grab the mixins, if they are specified...
	var mixins = null;
	if (definition.Mixins) {
		mixins = definition.Mixins;
		delete definition.Mixins;
	}

	//First, mixin if we can.
	mixin(initialize, mixins);

	//Now we grab the actual definition which defines the overrides.
	extend(initialize, definition, true, Extends);

	return initialize;
};

Class.extend = extend;
Class.mixin = mixin;
Class.ignoreFinals = false;

module.exports = Class;
},{}],3:[function(require,module,exports){
/*
 * raf.js
 * https://github.com/ngryman/raf.js
 *
 * original requestAnimationFrame polyfill by Erik Möller
 * inspired from paul_irish gist and post
 *
 * Copyright (c) 2013 ngryman
 * Licensed under the MIT license.
 */

(function(window) {
	var lastTime = 0,
		vendors = ['webkit', 'moz'],
		requestAnimationFrame = window.requestAnimationFrame,
		cancelAnimationFrame = window.cancelAnimationFrame,
		i = vendors.length;

	// try to un-prefix existing raf
	while (--i >= 0 && !requestAnimationFrame) {
		requestAnimationFrame = window[vendors[i] + 'RequestAnimationFrame'];
		cancelAnimationFrame = window[vendors[i] + 'CancelAnimationFrame'];
	}

	// polyfill with setTimeout fallback
	// heavily inspired from @darius gist mod: https://gist.github.com/paulirish/1579671#comment-837945
	if (!requestAnimationFrame || !cancelAnimationFrame) {
		requestAnimationFrame = function(callback) {
			var now = Date.now(), nextTime = Math.max(lastTime + 16, now);
			return setTimeout(function() {
				callback(lastTime = nextTime);
			}, nextTime - now);
		};

		cancelAnimationFrame = clearTimeout;
	}

	// export to window
	window.requestAnimationFrame = requestAnimationFrame;
	window.cancelAnimationFrame = cancelAnimationFrame;
}(window));
},{}],4:[function(require,module,exports){
/*
 * A fast javascript implementation of simplex noise by Jonas Wagner
 *
 * Based on a speed-improved simplex noise algorithm for 2D, 3D and 4D in Java.
 * Which is based on example code by Stefan Gustavson (stegu@itn.liu.se).
 * With Optimisations by Peter Eastman (peastman@drizzle.stanford.edu).
 * Better rank ordering method by Stefan Gustavson in 2012.
 *
 *
 * Copyright (C) 2012 Jonas Wagner
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */
(function () {

var F2 = 0.5 * (Math.sqrt(3.0) - 1.0),
    G2 = (3.0 - Math.sqrt(3.0)) / 6.0,
    F3 = 1.0 / 3.0,
    G3 = 1.0 / 6.0,
    F4 = (Math.sqrt(5.0) - 1.0) / 4.0,
    G4 = (5.0 - Math.sqrt(5.0)) / 20.0;


function SimplexNoise(random) {
    if (!random) random = Math.random;
    this.p = new Uint8Array(256);
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (var i = 0; i < 256; i++) {
        this.p[i] = random() * 256;
    }
    for (i = 0; i < 512; i++) {
        this.perm[i] = this.p[i & 255];
        this.permMod12[i] = this.perm[i] % 12;
    }

}
SimplexNoise.prototype = {
    grad3: new Float32Array([1, 1, 0,
                            - 1, 1, 0,
                            1, - 1, 0,

                            - 1, - 1, 0,
                            1, 0, 1,
                            - 1, 0, 1,

                            1, 0, - 1,
                            - 1, 0, - 1,
                            0, 1, 1,

                            0, - 1, 1,
                            0, 1, - 1,
                            0, - 1, - 1]),
    grad4: new Float32Array([0, 1, 1, 1, 0, 1, 1, - 1, 0, 1, - 1, 1, 0, 1, - 1, - 1,
                            0, - 1, 1, 1, 0, - 1, 1, - 1, 0, - 1, - 1, 1, 0, - 1, - 1, - 1,
                            1, 0, 1, 1, 1, 0, 1, - 1, 1, 0, - 1, 1, 1, 0, - 1, - 1,
                            - 1, 0, 1, 1, - 1, 0, 1, - 1, - 1, 0, - 1, 1, - 1, 0, - 1, - 1,
                            1, 1, 0, 1, 1, 1, 0, - 1, 1, - 1, 0, 1, 1, - 1, 0, - 1,
                            - 1, 1, 0, 1, - 1, 1, 0, - 1, - 1, - 1, 0, 1, - 1, - 1, 0, - 1,
                            1, 1, 1, 0, 1, 1, - 1, 0, 1, - 1, 1, 0, 1, - 1, - 1, 0,
                            - 1, 1, 1, 0, - 1, 1, - 1, 0, - 1, - 1, 1, 0, - 1, - 1, - 1, 0]),
    noise2D: function (xin, yin) {
        var permMod12 = this.permMod12,
            perm = this.perm,
            grad3 = this.grad3;
        var n0, n1, n2; // Noise contributions from the three corners
        // Skew the input space to determine which simplex cell we're in
        var s = (xin + yin) * F2; // Hairy factor for 2D
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var t = (i + j) * G2;
        var X0 = i - t; // Unskew the cell origin back to (x,y) space
        var Y0 = j - t;
        var x0 = xin - X0; // The x,y distances from the cell origin
        var y0 = yin - Y0;
        // For the 2D case, the simplex shape is an equilateral triangle.
        // Determine which simplex we are in.
        var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
        if (x0 > y0) {
            i1 = 1;
            j1 = 0;
        } // lower triangle, XY order: (0,0)->(1,0)->(1,1)
        else {
            i1 = 0;
            j1 = 1;
        } // upper triangle, YX order: (0,0)->(0,1)->(1,1)
        // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
        // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
        // c = (3-sqrt(3))/6
        var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
        var y1 = y0 - j1 + G2;
        var x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords
        var y2 = y0 - 1.0 + 2.0 * G2;
        // Work out the hashed gradient indices of the three simplex corners
        var ii = i & 255;
        var jj = j & 255;
        // Calculate the contribution from the three corners
        var t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) n0 = 0.0;
        else {
            var gi0 = permMod12[ii + perm[jj]] * 3;
            t0 *= t0;
            n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0); // (x,y) of grad3 used for 2D gradient
        }
        var t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) n1 = 0.0;
        else {
            var gi1 = permMod12[ii + i1 + perm[jj + j1]] * 3;
            t1 *= t1;
            n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1);
        }
        var t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) n2 = 0.0;
        else {
            var gi2 = permMod12[ii + 1 + perm[jj + 1]] * 3;
            t2 *= t2;
            n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2);
        }
        // Add contributions from each corner to get the final noise value.
        // The result is scaled to return values in the interval [-1,1].
        return 70.0 * (n0 + n1 + n2);
    },
    // 3D simplex noise
    noise3D: function (xin, yin, zin) {
        var permMod12 = this.permMod12,
            perm = this.perm,
            grad3 = this.grad3;
        var n0, n1, n2, n3; // Noise contributions from the four corners
        // Skew the input space to determine which simplex cell we're in
        var s = (xin + yin + zin) * F3; // Very nice and simple skew factor for 3D
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var k = Math.floor(zin + s);
        var t = (i + j + k) * G3;
        var X0 = i - t; // Unskew the cell origin back to (x,y,z) space
        var Y0 = j - t;
        var Z0 = k - t;
        var x0 = xin - X0; // The x,y,z distances from the cell origin
        var y0 = yin - Y0;
        var z0 = zin - Z0;
        // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
        // Determine which simplex we are in.
        var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
        var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
        if (x0 >= y0) {
            if (y0 >= z0) {
                i1 = 1;
                j1 = 0;
                k1 = 0;
                i2 = 1;
                j2 = 1;
                k2 = 0;
            } // X Y Z order
            else if (x0 >= z0) {
                i1 = 1;
                j1 = 0;
                k1 = 0;
                i2 = 1;
                j2 = 0;
                k2 = 1;
            } // X Z Y order
            else {
                i1 = 0;
                j1 = 0;
                k1 = 1;
                i2 = 1;
                j2 = 0;
                k2 = 1;
            } // Z X Y order
        }
        else { // x0<y0
            if (y0 < z0) {
                i1 = 0;
                j1 = 0;
                k1 = 1;
                i2 = 0;
                j2 = 1;
                k2 = 1;
            } // Z Y X order
            else if (x0 < z0) {
                i1 = 0;
                j1 = 1;
                k1 = 0;
                i2 = 0;
                j2 = 1;
                k2 = 1;
            } // Y Z X order
            else {
                i1 = 0;
                j1 = 1;
                k1 = 0;
                i2 = 1;
                j2 = 1;
                k2 = 0;
            } // Y X Z order
        }
        // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
        // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
        // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
        // c = 1/6.
        var x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords
        var y1 = y0 - j1 + G3;
        var z1 = z0 - k1 + G3;
        var x2 = x0 - i2 + 2.0 * G3; // Offsets for third corner in (x,y,z) coords
        var y2 = y0 - j2 + 2.0 * G3;
        var z2 = z0 - k2 + 2.0 * G3;
        var x3 = x0 - 1.0 + 3.0 * G3; // Offsets for last corner in (x,y,z) coords
        var y3 = y0 - 1.0 + 3.0 * G3;
        var z3 = z0 - 1.0 + 3.0 * G3;
        // Work out the hashed gradient indices of the four simplex corners
        var ii = i & 255;
        var jj = j & 255;
        var kk = k & 255;
        // Calculate the contribution from the four corners
        var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
        if (t0 < 0) n0 = 0.0;
        else {
            var gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
            t0 *= t0;
            n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0 + grad3[gi0 + 2] * z0);
        }
        var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
        if (t1 < 0) n1 = 0.0;
        else {
            var gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
            t1 *= t1;
            n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1 + grad3[gi1 + 2] * z1);
        }
        var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
        if (t2 < 0) n2 = 0.0;
        else {
            var gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
            t2 *= t2;
            n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2 + grad3[gi2 + 2] * z2);
        }
        var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
        if (t3 < 0) n3 = 0.0;
        else {
            var gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
            t3 *= t3;
            n3 = t3 * t3 * (grad3[gi3] * x3 + grad3[gi3 + 1] * y3 + grad3[gi3 + 2] * z3);
        }
        // Add contributions from each corner to get the final noise value.
        // The result is scaled to stay just inside [-1,1]
        return 32.0 * (n0 + n1 + n2 + n3);
    },
    // 4D simplex noise, better simplex rank ordering method 2012-03-09
    noise4D: function (x, y, z, w) {
        var permMod12 = this.permMod12,
            perm = this.perm,
            grad4 = this.grad4;

        var n0, n1, n2, n3, n4; // Noise contributions from the five corners
        // Skew the (x,y,z,w) space to determine which cell of 24 simplices we're in
        var s = (x + y + z + w) * F4; // Factor for 4D skewing
        var i = Math.floor(x + s);
        var j = Math.floor(y + s);
        var k = Math.floor(z + s);
        var l = Math.floor(w + s);
        var t = (i + j + k + l) * G4; // Factor for 4D unskewing
        var X0 = i - t; // Unskew the cell origin back to (x,y,z,w) space
        var Y0 = j - t;
        var Z0 = k - t;
        var W0 = l - t;
        var x0 = x - X0; // The x,y,z,w distances from the cell origin
        var y0 = y - Y0;
        var z0 = z - Z0;
        var w0 = w - W0;
        // For the 4D case, the simplex is a 4D shape I won't even try to describe.
        // To find out which of the 24 possible simplices we're in, we need to
        // determine the magnitude ordering of x0, y0, z0 and w0.
        // Six pair-wise comparisons are performed between each possible pair
        // of the four coordinates, and the results are used to rank the numbers.
        var rankx = 0;
        var ranky = 0;
        var rankz = 0;
        var rankw = 0;
        if (x0 > y0) rankx++;
        else ranky++;
        if (x0 > z0) rankx++;
        else rankz++;
        if (x0 > w0) rankx++;
        else rankw++;
        if (y0 > z0) ranky++;
        else rankz++;
        if (y0 > w0) ranky++;
        else rankw++;
        if (z0 > w0) rankz++;
        else rankw++;
        var i1, j1, k1, l1; // The integer offsets for the second simplex corner
        var i2, j2, k2, l2; // The integer offsets for the third simplex corner
        var i3, j3, k3, l3; // The integer offsets for the fourth simplex corner
        // simplex[c] is a 4-vector with the numbers 0, 1, 2 and 3 in some order.
        // Many values of c will never occur, since e.g. x>y>z>w makes x<z, y<w and x<w
        // impossible. Only the 24 indices which have non-zero entries make any sense.
        // We use a thresholding to set the coordinates in turn from the largest magnitude.
        // Rank 3 denotes the largest coordinate.
        i1 = rankx >= 3 ? 1 : 0;
        j1 = ranky >= 3 ? 1 : 0;
        k1 = rankz >= 3 ? 1 : 0;
        l1 = rankw >= 3 ? 1 : 0;
        // Rank 2 denotes the second largest coordinate.
        i2 = rankx >= 2 ? 1 : 0;
        j2 = ranky >= 2 ? 1 : 0;
        k2 = rankz >= 2 ? 1 : 0;
        l2 = rankw >= 2 ? 1 : 0;
        // Rank 1 denotes the second smallest coordinate.
        i3 = rankx >= 1 ? 1 : 0;
        j3 = ranky >= 1 ? 1 : 0;
        k3 = rankz >= 1 ? 1 : 0;
        l3 = rankw >= 1 ? 1 : 0;
        // The fifth corner has all coordinate offsets = 1, so no need to compute that.
        var x1 = x0 - i1 + G4; // Offsets for second corner in (x,y,z,w) coords
        var y1 = y0 - j1 + G4;
        var z1 = z0 - k1 + G4;
        var w1 = w0 - l1 + G4;
        var x2 = x0 - i2 + 2.0 * G4; // Offsets for third corner in (x,y,z,w) coords
        var y2 = y0 - j2 + 2.0 * G4;
        var z2 = z0 - k2 + 2.0 * G4;
        var w2 = w0 - l2 + 2.0 * G4;
        var x3 = x0 - i3 + 3.0 * G4; // Offsets for fourth corner in (x,y,z,w) coords
        var y3 = y0 - j3 + 3.0 * G4;
        var z3 = z0 - k3 + 3.0 * G4;
        var w3 = w0 - l3 + 3.0 * G4;
        var x4 = x0 - 1.0 + 4.0 * G4; // Offsets for last corner in (x,y,z,w) coords
        var y4 = y0 - 1.0 + 4.0 * G4;
        var z4 = z0 - 1.0 + 4.0 * G4;
        var w4 = w0 - 1.0 + 4.0 * G4;
        // Work out the hashed gradient indices of the five simplex corners
        var ii = i & 255;
        var jj = j & 255;
        var kk = k & 255;
        var ll = l & 255;
        // Calculate the contribution from the five corners
        var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0;
        if (t0 < 0) n0 = 0.0;
        else {
            var gi0 = (perm[ii + perm[jj + perm[kk + perm[ll]]]] % 32) * 4;
            t0 *= t0;
            n0 = t0 * t0 * (grad4[gi0] * x0 + grad4[gi0 + 1] * y0 + grad4[gi0 + 2] * z0 + grad4[gi0 + 3] * w0);
        }
        var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1 - w1 * w1;
        if (t1 < 0) n1 = 0.0;
        else {
            var gi1 = (perm[ii + i1 + perm[jj + j1 + perm[kk + k1 + perm[ll + l1]]]] % 32) * 4;
            t1 *= t1;
            n1 = t1 * t1 * (grad4[gi1] * x1 + grad4[gi1 + 1] * y1 + grad4[gi1 + 2] * z1 + grad4[gi1 + 3] * w1);
        }
        var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2 - w2 * w2;
        if (t2 < 0) n2 = 0.0;
        else {
            var gi2 = (perm[ii + i2 + perm[jj + j2 + perm[kk + k2 + perm[ll + l2]]]] % 32) * 4;
            t2 *= t2;
            n2 = t2 * t2 * (grad4[gi2] * x2 + grad4[gi2 + 1] * y2 + grad4[gi2 + 2] * z2 + grad4[gi2 + 3] * w2);
        }
        var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3 - w3 * w3;
        if (t3 < 0) n3 = 0.0;
        else {
            var gi3 = (perm[ii + i3 + perm[jj + j3 + perm[kk + k3 + perm[ll + l3]]]] % 32) * 4;
            t3 *= t3;
            n3 = t3 * t3 * (grad4[gi3] * x3 + grad4[gi3 + 1] * y3 + grad4[gi3 + 2] * z3 + grad4[gi3 + 3] * w3);
        }
        var t4 = 0.6 - x4 * x4 - y4 * y4 - z4 * z4 - w4 * w4;
        if (t4 < 0) n4 = 0.0;
        else {
            var gi4 = (perm[ii + 1 + perm[jj + 1 + perm[kk + 1 + perm[ll + 1]]]] % 32) * 4;
            t4 *= t4;
            n4 = t4 * t4 * (grad4[gi4] * x4 + grad4[gi4 + 1] * y4 + grad4[gi4 + 2] * z4 + grad4[gi4 + 3] * w4);
        }
        // Sum up and scale the result to cover the range [-1,1]
        return 27.0 * (n0 + n1 + n2 + n3 + n4);
    }


};

// amd
if (typeof define !== 'undefined' && define.amd) define(function(){return SimplexNoise;});
// browser
else if (typeof window !== 'undefined') window.SimplexNoise = SimplexNoise;
//common js
if (typeof exports !== 'undefined') exports.SimplexNoise = SimplexNoise;
// nodejs
if (typeof module !== 'undefined') {
    module.exports = SimplexNoise;
}

})();

},{}],5:[function(require,module,exports){
var ARRAY_TYPE = typeof Float32Array !== "undefined" ? Float32Array : Array;

function Matrix3(m) {
    this.val = new ARRAY_TYPE(9);

    if (m) { //assume Matrix3 with val
        this.copy(m);
    } else { //default to identity
        this.idt();
    }
}

var mat3 = Matrix3.prototype;

mat3.clone = function() {
    return new Matrix3(this);
};

mat3.set = function(otherMat) {
    return this.copy(otherMat);
};

mat3.copy = function(otherMat) {
    var out = this.val,
        a = otherMat.val; 
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return this;
};

mat3.fromMat4 = function(m) {
    var a = m.val,
        out = this.val;
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[4];
    out[4] = a[5];
    out[5] = a[6];
    out[6] = a[8];
    out[7] = a[9];
    out[8] = a[10];
    return this;
};

mat3.fromArray = function(a) {
    var out = this.val;
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return this;
};

mat3.identity = function() {
    var out = this.val;
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return this;
};

mat3.transpose = function() {
    var a = this.val,
        a01 = a[1], 
        a02 = a[2], 
        a12 = a[5];
    a[1] = a[3];
    a[2] = a[6];
    a[3] = a01;
    a[5] = a[7];
    a[6] = a02;
    a[7] = a12;
    return this;
};

mat3.invert = function() {
    var a = this.val,
        a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b01 = a22 * a11 - a12 * a21,
        b11 = -a22 * a10 + a12 * a20,
        b21 = a21 * a10 - a11 * a20,

        // Calculate the determinant
        det = a00 * b01 + a01 * b11 + a02 * b21;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    a[0] = b01 * det;
    a[1] = (-a22 * a01 + a02 * a21) * det;
    a[2] = (a12 * a01 - a02 * a11) * det;
    a[3] = b11 * det;
    a[4] = (a22 * a00 - a02 * a20) * det;
    a[5] = (-a12 * a00 + a02 * a10) * det;
    a[6] = b21 * det;
    a[7] = (-a21 * a00 + a01 * a20) * det;
    a[8] = (a11 * a00 - a01 * a10) * det;
    return this;
};

mat3.adjoint = function() {
    var a = this.val,
        a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8];

    a[0] = (a11 * a22 - a12 * a21);
    a[1] = (a02 * a21 - a01 * a22);
    a[2] = (a01 * a12 - a02 * a11);
    a[3] = (a12 * a20 - a10 * a22);
    a[4] = (a00 * a22 - a02 * a20);
    a[5] = (a02 * a10 - a00 * a12);
    a[6] = (a10 * a21 - a11 * a20);
    a[7] = (a01 * a20 - a00 * a21);
    a[8] = (a00 * a11 - a01 * a10);
    return this;
};

mat3.determinant = function() {
    var a = this.val,
        a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8];

    return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
};

mat3.multiply = function(otherMat) {
    var a = this.val,
        b = otherMat.val,
        a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b00 = b[0], b01 = b[1], b02 = b[2],
        b10 = b[3], b11 = b[4], b12 = b[5],
        b20 = b[6], b21 = b[7], b22 = b[8];

    a[0] = b00 * a00 + b01 * a10 + b02 * a20;
    a[1] = b00 * a01 + b01 * a11 + b02 * a21;
    a[2] = b00 * a02 + b01 * a12 + b02 * a22;

    a[3] = b10 * a00 + b11 * a10 + b12 * a20;
    a[4] = b10 * a01 + b11 * a11 + b12 * a21;
    a[5] = b10 * a02 + b11 * a12 + b12 * a22;

    a[6] = b20 * a00 + b21 * a10 + b22 * a20;
    a[7] = b20 * a01 + b21 * a11 + b22 * a21;
    a[8] = b20 * a02 + b21 * a12 + b22 * a22;
    return this;
};

mat3.translate = function(v) {
    var a = this.val,
        x = v.x, y = v.y;
    a[6] = x * a[0] + y * a[3] + a[6];
    a[7] = x * a[1] + y * a[4] + a[7];
    a[8] = x * a[2] + y * a[5] + a[8];
    return this;
};

mat3.rotate = function(rad) {
    var a = this.val,
        a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],

        s = Math.sin(rad),
        c = Math.cos(rad);

    a[0] = c * a00 + s * a10;
    a[1] = c * a01 + s * a11;
    a[2] = c * a02 + s * a12;

    a[3] = c * a10 - s * a00;
    a[4] = c * a11 - s * a01;
    a[5] = c * a12 - s * a02;
    return this;
};

mat3.scale = function(v) {
    var a = this.val,
        x = v.x, 
        y = v.y;

    a[0] = x * a[0];
    a[1] = x * a[1];
    a[2] = x * a[2];

    a[3] = y * a[3];
    a[4] = y * a[4];
    a[5] = y * a[5];
    return this;
};

mat3.fromQuat = function(q) {
    var x = q.x, y = q.y, z = q.z, w = q.w,
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2,

        out = this.val;

    out[0] = 1 - (yy + zz);
    out[3] = xy + wz;
    out[6] = xz - wy;

    out[1] = xy - wz;
    out[4] = 1 - (xx + zz);
    out[7] = yz + wx;

    out[2] = xz + wy;
    out[5] = yz - wx;
    out[8] = 1 - (xx + yy);
    return this;
};

mat3.normalFromMat4 = function(m) {
    var a = m.val,
        out = this.val,

        a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;

    out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;

    out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    return this;
};

mat3.mul = mat3.multiply;

mat3.idt = mat3.identity;

//This is handy for Pool utilities, to "reset" a
//shared object to its default state
mat3.reset = mat3.idt;

mat3.toString = function() {
    var a = this.val;
    return 'Matrix3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + 
                    a[3] + ', ' + a[4] + ', ' + a[5] + ', ' + 
                    a[6] + ', ' + a[7] + ', ' + a[8] + ')';
};

mat3.str = mat3.toString;

module.exports = Matrix3;
},{}],6:[function(require,module,exports){
var ARRAY_TYPE = typeof Float32Array !== "undefined" ? Float32Array : Array;
var EPSILON = 0.000001;

function Matrix4(m) {
    this.val = new ARRAY_TYPE(16);

    if (m) { //assume Matrix4 with val
        this.copy(m);
    } else { //default to identity
        this.idt();
    }
}

var mat4 = Matrix4.prototype;

mat4.clone = function() {
    return new Matrix4(this);
};

mat4.set = function(otherMat) {
    return this.copy(otherMat);
};

mat4.copy = function(otherMat) {
    var out = this.val,
        a = otherMat.val; 
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return this;
};

mat4.fromArray = function(a) {
    var out = this.val;
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return this;
};

mat4.identity = function() {
    var out = this.val;
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return this;
};

mat4.transpose = function() {
    var a = this.val,
        a01 = a[1], a02 = a[2], a03 = a[3],
        a12 = a[6], a13 = a[7],
        a23 = a[11];

    a[1] = a[4];
    a[2] = a[8];
    a[3] = a[12];
    a[4] = a01;
    a[6] = a[9];
    a[7] = a[13];
    a[8] = a02;
    a[9] = a12;
    a[11] = a[14];
    a[12] = a03;
    a[13] = a13;
    a[14] = a23;
    return this;
};

mat4.invert = function() {
    var a = this.val,
        a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    a[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    a[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    a[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    a[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    a[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    a[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    a[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    a[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    a[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    a[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    a[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    a[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    a[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    a[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    a[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    a[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return this;
};

mat4.adjoint = function() {
    var a = this.val,
        a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    a[0]  =  (a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22));
    a[1]  = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
    a[2]  =  (a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12));
    a[3]  = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
    a[4]  = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
    a[5]  =  (a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22));
    a[6]  = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
    a[7]  =  (a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12));
    a[8]  =  (a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21));
    a[9]  = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
    a[10] =  (a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11));
    a[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
    a[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
    a[13] =  (a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21));
    a[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
    a[15] =  (a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11));
    return this;
};

mat4.determinant = function () {
    var a = this.val,
        a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32;

    // Calculate the determinant
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
};

mat4.multiply = function(otherMat) {
    var a = this.val,
        b = otherMat.val,
        a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    // Cache only the current line of the second matrix
    var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];  
    a[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    a[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    a[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    a[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    a[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    a[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    a[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    a[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    a[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    a[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    a[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    a[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    a[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    a[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    a[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    a[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    return this;
};

mat4.translate = function(v) {
    var x = v.x, y = v.y, z = v.z,
        a = this.val;
    a[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    a[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    a[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    a[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    return this;
};

mat4.scale = function(v) {
    var x = v.x, y = v.y, z = v.z, a = this.val;

    a[0] = a[0] * x;
    a[1] = a[1] * x;
    a[2] = a[2] * x;
    a[3] = a[3] * x;
    a[4] = a[4] * y;
    a[5] = a[5] * y;
    a[6] = a[6] * y;
    a[7] = a[7] * y;
    a[8] = a[8] * z;
    a[9] = a[9] * z;
    a[10] = a[10] * z;
    a[11] = a[11] * z;
    a[12] = a[12];
    a[13] = a[13];
    a[14] = a[14];
    a[15] = a[15];
    return this;
};

mat4.rotate = function (rad, axis) {
    var a = this.val,
        x = axis.x, y = axis.y, z = axis.z,
        len = Math.sqrt(x * x + y * y + z * z),
        s, c, t,
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23,
        b00, b01, b02,
        b10, b11, b12,
        b20, b21, b22;

    if (Math.abs(len) < EPSILON) { return null; }
    
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;

    a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
    a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
    a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

    // Construct the elements of the rotation matrix
    b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
    b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
    b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

    // Perform rotation-specific matrix multiplication
    a[0] = a00 * b00 + a10 * b01 + a20 * b02;
    a[1] = a01 * b00 + a11 * b01 + a21 * b02;
    a[2] = a02 * b00 + a12 * b01 + a22 * b02;
    a[3] = a03 * b00 + a13 * b01 + a23 * b02;
    a[4] = a00 * b10 + a10 * b11 + a20 * b12;
    a[5] = a01 * b10 + a11 * b11 + a21 * b12;
    a[6] = a02 * b10 + a12 * b11 + a22 * b12;
    a[7] = a03 * b10 + a13 * b11 + a23 * b12;
    a[8] = a00 * b20 + a10 * b21 + a20 * b22;
    a[9] = a01 * b20 + a11 * b21 + a21 * b22;
    a[10] = a02 * b20 + a12 * b21 + a22 * b22;
    a[11] = a03 * b20 + a13 * b21 + a23 * b22;
    return this;
};

mat4.rotateX = function(rad) {
    var a = this.val,
        s = Math.sin(rad),
        c = Math.cos(rad),
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    // Perform axis-specific matrix multiplication
    a[4] = a10 * c + a20 * s;
    a[5] = a11 * c + a21 * s;
    a[6] = a12 * c + a22 * s;
    a[7] = a13 * c + a23 * s;
    a[8] = a20 * c - a10 * s;
    a[9] = a21 * c - a11 * s;
    a[10] = a22 * c - a12 * s;
    a[11] = a23 * c - a13 * s;
    return this;
};

mat4.rotateY = function(rad) {
    var a = this.val,
        s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    // Perform axis-specific matrix multiplication
    a[0] = a00 * c - a20 * s;
    a[1] = a01 * c - a21 * s;
    a[2] = a02 * c - a22 * s;
    a[3] = a03 * c - a23 * s;
    a[8] = a00 * s + a20 * c;
    a[9] = a01 * s + a21 * c;
    a[10] = a02 * s + a22 * c;
    a[11] = a03 * s + a23 * c;
    return this;
};

mat4.rotateZ = function (rad) {
    var a = this.val,
        s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];

    // Perform axis-specific matrix multiplication
    a[0] = a00 * c + a10 * s;
    a[1] = a01 * c + a11 * s;
    a[2] = a02 * c + a12 * s;
    a[3] = a03 * c + a13 * s;
    a[4] = a10 * c - a00 * s;
    a[5] = a11 * c - a01 * s;
    a[6] = a12 * c - a02 * s;
    a[7] = a13 * c - a03 * s;
    return this;
};

mat4.fromRotationTranslation = function (q, v) {
    // Quaternion math
    var out = this.val,
        x = q.x, y = q.y, z = q.z, w = q.w,
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v.x;
    out[13] = v.y;
    out[14] = v.z;
    out[15] = 1;
    return this;
};

mat4.fromQuat = function (q) {
    var out = this.val,
        x = q.x, y = q.y, z = q.z, w = q.w,
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;

    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;

    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;

    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;

    return this;
};


/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {Matrix4} this for chaining
 */
mat4.frustum = function (left, right, bottom, top, near, far) {
    var out = this.val,
        rl = 1 / (right - left),
        tb = 1 / (top - bottom),
        nf = 1 / (near - far);
    out[0] = (near * 2) * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = (near * 2) * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (far * near * 2) * nf;
    out[15] = 0;
    return this;
};


/**
 * Generates a perspective projection matrix with the given bounds
 *
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {Matrix4} this for chaining
 */
mat4.perspective = function (fovy, aspect, near, far) {
    var out = this.val,
        f = 1.0 / Math.tan(fovy / 2),
        nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) * nf;
    out[15] = 0;
    return this;
};

/**
 * Generates a orthogonal projection matrix with the given bounds
 *
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {Matrix4} this for chaining
 */
mat4.ortho = function (left, right, bottom, top, near, far) {
    var out = this.val,
        lr = 1 / (left - right),
        bt = 1 / (bottom - top),
        nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return this;
};

/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * @param {Vector3} eye Position of the viewer
 * @param {Vector3} center Point the viewer is looking at
 * @param {Vector3} up vec3 pointing up
 * @returns {Matrix4} this for chaining
 */
mat4.lookAt = function (eye, center, up) {
    var out = this.val,

        x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
        eyex = eye.x,
        eyey = eye.y,
        eyez = eye.z,
        upx = up.x,
        upy = up.y,
        upz = up.z,
        centerx = center.x,
        centery = center.y,
        centerz = center.z;

    if (Math.abs(eyex - centerx) < EPSILON &&
        Math.abs(eyey - centery) < EPSILON &&
        Math.abs(eyez - centerz) < EPSILON) {
        return this.identity();
    }

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;

    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
        x0 = 0;
        x1 = 0;
        x2 = 0;
    } else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;

    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
        y0 = 0;
        y1 = 0;
        y2 = 0;
    } else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }

    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;

    return this;
};


mat4.mul = mat4.multiply;

mat4.idt = mat4.identity;

//This is handy for Pool utilities, to "reset" a
//shared object to its default state
mat4.reset = mat4.idt;

mat4.toString = function () {
    var a = this.val;
    return 'Matrix4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' +
                    a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' +
                    a[8] + ', ' + a[9] + ', ' + a[10] + ', ' + a[11] + ', ' + 
                    a[12] + ', ' + a[13] + ', ' + a[14] + ', ' + a[15] + ')';
};

mat4.str = mat4.toString;

module.exports = Matrix4;

},{}],7:[function(require,module,exports){
var Vector3 = require('./Vector3');
var Matrix3 = require('./Matrix3');
var common = require('./common');

//some shared 'private' arrays
var s_iNext = (typeof Int8Array !== 'undefined' ? new Int8Array([1,2,0]) : [1,2,0]);
var tmp = (typeof Float32Array !== 'undefined' ? new Float32Array([0,0,0]) : [0,0,0]);

var xUnitVec3 = new Vector3(1, 0, 0);
var yUnitVec3 = new Vector3(0, 1, 0);
var tmpvec = new Vector3();

var tmpMat3 = new Matrix3();

function Quaternion(x, y, z, w) {
	if (typeof x === "object") {
        this.x = x.x||0;
        this.y = x.y||0;
        this.z = x.z||0;
        this.w = x.w||0;
    } else {
        this.x = x||0;
        this.y = y||0;
        this.z = z||0;
        this.w = w||0;
    }
}

var quat = Quaternion.prototype;

//mixin common functions
for (var k in common) {
    quat[k] = common[k];
}

quat.rotationTo = function(a, b) {
    var dot = a.x * b.x + a.y * b.y + a.z * b.z; //a.dot(b)
    if (dot < -0.999999) {
        if (tmpvec.copy(xUnitVec3).cross(a).len() < 0.000001)
            tmpvec.copy(yUnitVec3).cross(a);
        
        tmpvec.normalize();
        return this.setAxisAngle(tmpvec, Math.PI);
    } else if (dot > 0.999999) {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.w = 1;
        return this;
    } else {
        tmpvec.copy(a).cross(b);
        this.x = tmpvec.x;
        this.y = tmpvec.y;
        this.z = tmpvec.z;
        this.w = 1 + dot;
        return this.normalize();
    }
};

quat.setAxes = function(view, right, up) {
    var m = tmpMat3.val;
    m[0] = right.x;
    m[3] = right.y;
    m[6] = right.z;

    m[1] = up.x;
    m[4] = up.y;
    m[7] = up.z;

    m[2] = -view.x;
    m[5] = -view.y;
    m[8] = -view.z;

    return this.fromMat3(tmpMat3).normalize();
};

quat.identity = function() {
    this.x = this.y = this.z = 0;
    this.w = 1;
    return this;
};

quat.setAxisAngle = function(axis, rad) {
    rad = rad * 0.5;
    var s = Math.sin(rad);
    this.x = s * axis.x;
    this.y = s * axis.y;
    this.z = s * axis.z;
    this.w = Math.cos(rad);
    return this;
};

quat.multiply = function(b) {
    var ax = this.x, ay = this.y, az = this.z, aw = this.w,
        bx = b.x, by = b.y, bz = b.z, bw = b.w;

    this.x = ax * bw + aw * bx + ay * bz - az * by;
    this.y = ay * bw + aw * by + az * bx - ax * bz;
    this.z = az * bw + aw * bz + ax * by - ay * bx;
    this.w = aw * bw - ax * bx - ay * by - az * bz;
    return this;
};

quat.slerp = function (b, t) {
    // benchmarks:
    //    http://jsperf.com/quaternion-slerp-implementations

    var ax = this.x, ay = this.y, az = this.y, aw = this.y,
        bx = b.x, by = b.y, bz = b.z, bw = b.w;

    var        omega, cosom, sinom, scale0, scale1;

    // calc cosine
    cosom = ax * bx + ay * by + az * bz + aw * bw;
    // adjust signs (if necessary)
    if ( cosom < 0.0 ) {
        cosom = -cosom;
        bx = - bx;
        by = - by;
        bz = - bz;
        bw = - bw;
    }
    // calculate coefficients
    if ( (1.0 - cosom) > 0.000001 ) {
        // standard case (slerp)
        omega  = Math.acos(cosom);
        sinom  = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
    } else {        
        // "from" and "to" quaternions are very close 
        //  ... so we can do a linear interpolation
        scale0 = 1.0 - t;
        scale1 = t;
    }
    // calculate final values
    this.x = scale0 * ax + scale1 * bx;
    this.y = scale0 * ay + scale1 * by;
    this.z = scale0 * az + scale1 * bz;
    this.w = scale0 * aw + scale1 * bw;
    return this;
};

quat.invert = function() {
    var a0 = this.x, a1 = this.y, a2 = this.z, a3 = this.w,
        dot = a0*a0 + a1*a1 + a2*a2 + a3*a3,
        invDot = dot ? 1.0/dot : 0;
    
    // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

    this.x = -a0*invDot;
    this.y = -a1*invDot;
    this.z = -a2*invDot;
    this.w = a3*invDot;
    return this;
};

quat.conjugate = function() {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
};

quat.rotateX = function (rad) {
    rad *= 0.5; 

    var ax = this.x, ay = this.y, az = this.z, aw = this.w,
        bx = Math.sin(rad), bw = Math.cos(rad);

    this.x = ax * bw + aw * bx;
    this.y = ay * bw + az * bx;
    this.z = az * bw - ay * bx;
    this.w = aw * bw - ax * bx;
    return this;
};

quat.rotateY = function (rad) {
    rad *= 0.5; 

    var ax = this.x, ay = this.y, az = this.z, aw = this.w,
        by = Math.sin(rad), bw = Math.cos(rad);

    this.x = ax * bw - az * by;
    this.y = ay * bw + aw * by;
    this.z = az * bw + ax * by;
    this.w = aw * bw - ay * by;
    return this;
};

quat.rotateZ = function (rad) {
    rad *= 0.5; 

    var ax = this.x, ay = this.y, az = this.z, aw = this.w,
        bz = Math.sin(rad), bw = Math.cos(rad);

    this.x = ax * bw + ay * bz;
    this.y = ay * bw - ax * bz;
    this.z = az * bw + aw * bz;
    this.w = aw * bw - az * bz;
    return this;
};

quat.calculateW = function () {
    var x = this.x, y = this.y, z = this.z;

    this.x = x;
    this.y = y;
    this.z = z;
    this.w = -Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
    return this;
};

quat.fromMat3 = function(mat) {
    // benchmarks:
    //    http://jsperf.com/typed-array-access-speed
    //    http://jsperf.com/conversion-of-3x3-matrix-to-quaternion

    // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
    // article "Quaternion Calculus and Fast Animation".
    var m = mat.val,
        fTrace = m[0] + m[4] + m[8];
    var fRoot;

    if ( fTrace > 0.0 ) {
        // |w| > 1/2, may as well choose w > 1/2
        fRoot = Math.sqrt(fTrace + 1.0);  // 2w
        this.w = 0.5 * fRoot;
        fRoot = 0.5/fRoot;  // 1/(4w)
        this.x = (m[7]-m[5])*fRoot;
        this.y = (m[2]-m[6])*fRoot;
        this.z = (m[3]-m[1])*fRoot;
    } else {
        // |w| <= 1/2
        var i = 0;
        if ( m[4] > m[0] )
          i = 1;
        if ( m[8] > m[i*3+i] )
          i = 2;
        var j = s_iNext[i];
        var k = s_iNext[j];
            
        //This isn't quite as clean without array access...
        fRoot = Math.sqrt(m[i*3+i]-m[j*3+j]-m[k*3+k] + 1.0);
        tmp[i] = 0.5 * fRoot;

        fRoot = 0.5 / fRoot;
        tmp[j] = (m[j*3+i] + m[i*3+j]) * fRoot;
        tmp[k] = (m[k*3+i] + m[i*3+k]) * fRoot;

        this.x = tmp[0];
        this.y = tmp[1];
        this.z = tmp[2];
        this.w = (m[k*3+j] - m[j*3+k]) * fRoot;
    }
    
    return this;
};

quat.idt = quat.identity;

quat.sub = quat.subtract;

quat.mul = quat.multiply;

quat.len = quat.length;

quat.lenSq = quat.lengthSq;

//This is handy for Pool utilities, to "reset" a
//shared object to its default state
quat.reset = quat.idt;


quat.toString = function() {
    return 'Quaternion(' + this.x + ', ' + this.y + ', ' + this.z + ', ' + this.w + ')';
};

quat.str = quat.toString;

module.exports = Quaternion;
},{"./Matrix3":5,"./Vector3":9,"./common":11}],8:[function(require,module,exports){
function Vector2(x, y) {
	if (typeof x === "object") {
        this.x = x.x||0;
        this.y = x.y||0;
    } else {
        this.x = x||0;
        this.y = y||0;
    }
}

//shorthand it for better minification
var vec2 = Vector2.prototype;

/**
 * Returns a new instance of Vector2 with
 * this vector's components. 
 * @return {Vector2} a clone of this vector
 */
vec2.clone = function() {
    return new Vector2(this.x, this.y);
};

/**
 * Copies the x, y components from the specified
 * Vector. Any undefined components from `otherVec`
 * will default to zero.
 * 
 * @param  {otherVec} the other Vector2 to copy
 * @return {Vector2}  this, for chaining
 */
vec2.copy = function(otherVec) {
    this.x = otherVec.x||0;
    this.y = otherVec.y||0;
    return this;
};

/**
 * A convenience function to set the components of
 * this vector as x and y. Falsy or undefined
 * parameters will default to zero.
 *
 * You can also pass a vector object instead of
 * individual components, to copy the object's components.
 * 
 * @param {Number} x the x component
 * @param {Number} y the y component
 * @return {Vector2}  this, for chaining
 */
vec2.set = function(x, y) {
    if (typeof x === "object") {
        this.x = x.x||0;
        this.y = x.y||0;
    } else {
        this.x = x||0;
        this.y = y||0;
    }
    return this;
};

vec2.add = function(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
};

vec2.subtract = function(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
};

vec2.multiply = function(v) {
    this.x *= v.x;
    this.y *= v.y;
    return this;
};

vec2.scale = function(s) {
    this.x *= s;
    this.y *= s;
    return this;
};

vec2.divide = function(v) {
    this.x /= v.x;
    this.y /= v.y;
    return this;
};

vec2.negate = function() {
    this.x = -this.x;
    this.y = -this.y;
    return this;
};

vec2.distance = function(v) {
    var dx = v.x - this.x,
        dy = v.y - this.y;
    return Math.sqrt(dx*dx + dy*dy);
};

vec2.distanceSq = function(v) {
    var dx = v.x - this.x,
        dy = v.y - this.y;
    return dx*dx + dy*dy;
};

vec2.length = function() {
    var x = this.x,
        y = this.y;
    return Math.sqrt(x*x + y*y);
};

vec2.lengthSq = function() {
    var x = this.x,
        y = this.y;
    return x*x + y*y;
};

vec2.normalize = function() {
    var x = this.x,
        y = this.y;
    var len = x*x + y*y;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
        this.x = x*len;
        this.y = y*len;
    }
    return this;
};

vec2.dot = function(v) {
    return this.x * v.x + this.y * v.y;
};

//Unlike Vector3, this returns a scalar
//http://allenchou.net/2013/07/cross-product-of-2d-vectors/
vec2.cross = function(v) {
    return this.x * v.y - this.y * v.x;
};

vec2.lerp = function(v, t) {
    var ax = this.x,
        ay = this.y;
    t = t||0;
    this.x = ax + t * (v.x - ax);
    this.y = ay + t * (v.y - ay);
    return this;
};

vec2.transformMat3 = function(mat) {
    var x = this.x, y = this.y, m = mat.val;
    this.x = m[0] * x + m[2] * y + m[4];
    this.y = m[1] * x + m[3] * y + m[5];
    return this;
};

vec2.transformMat4 = function(mat) {
    var x = this.x, 
        y = this.y,
        m = mat.val;
    this.x = m[0] * x + m[4] * y + m[12];
    this.y = m[1] * x + m[5] * y + m[13];
    return this;
};

vec2.reset = function() {
    this.x = 0;
    this.y = 0;
    return this;
};

vec2.sub = vec2.subtract;

vec2.mul = vec2.multiply;

vec2.div = vec2.divide;

vec2.dist = vec2.distance;

vec2.distSq = vec2.distanceSq;

vec2.len = vec2.length;

vec2.lenSq = vec2.lengthSq;

vec2.toString = function() {
    return 'Vector2(' + this.x + ', ' + this.y + ')';
};

vec2.random = function(scale) {
    scale = scale || 1.0;
    var r = Math.random() * 2.0 * Math.PI;
    this.x = Math.cos(r) * scale;
    this.y = Math.sin(r) * scale;
    return this;
};

vec2.str = vec2.toString;

module.exports = Vector2;
},{}],9:[function(require,module,exports){
function Vector3(x, y, z) {
    if (typeof x === "object") {
        this.x = x.x||0;
        this.y = x.y||0;
        this.z = x.z||0;
    } else {
        this.x = x||0;
        this.y = y||0;
        this.z = z||0;
    }
}

//shorthand it for better minification
var vec3 = Vector3.prototype;

vec3.clone = function() {
    return new Vector3(this.x, this.y, this.z);
};

vec3.copy = function(otherVec) {
    this.x = otherVec.x;
    this.y = otherVec.y;
    this.z = otherVec.z;
    return this;
};

vec3.set = function(x, y, z) {
    if (typeof x === "object") {
        this.x = x.x||0;
        this.y = x.y||0;
        this.z = x.z||0;
    } else {
        this.x = x||0;
        this.y = y||0;
        this.z = z||0;
    }
    return this;
};

vec3.add = function(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
};

vec3.subtract = function(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
};

vec3.multiply = function(v) {
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    return this;
};

vec3.scale = function(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
};

vec3.divide = function(v) {
    this.x /= v.x;
    this.y /= v.y;
    this.z /= v.z;
    return this;
};

vec3.negate = function() {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
};

vec3.distance = function(v) {
    var dx = v.x - this.x,
        dy = v.y - this.y,
        dz = v.z - this.z;
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
};

vec3.distanceSq = function(v) {
    var dx = v.x - this.x,
        dy = v.y - this.y,
        dz = v.z - this.z;
    return dx*dx + dy*dy + dz*dz;
};

vec3.length = function() {
    var x = this.x,
        y = this.y,
        z = this.z;
    return Math.sqrt(x*x + y*y + z*z);
};

vec3.lengthSq = function() {
    var x = this.x,
        y = this.y,
        z = this.z;
    return x*x + y*y + z*z;
};

vec3.normalize = function() {
    var x = this.x,
        y = this.y,
        z = this.z;
    var len = x*x + y*y + z*z;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
        this.x = x*len;
        this.y = y*len;
        this.z = z*len;
    }
    return this;
};

vec3.dot = function(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
};

vec3.cross = function(v) {
    var ax = this.x, ay = this.y, az = this.z,
        bx = v.x, by = v.y, bz = v.z;

    this.x = ay * bz - az * by;
    this.y = az * bx - ax * bz;
    this.z = ax * by - ay * bx;
    return this;
};

vec3.lerp = function(v, t) {
    var ax = this.x,
        ay = this.y,
        az = this.z;
    t = t||0;
    this.x = ax + t * (v.x - ax);
    this.y = ay + t * (v.y - ay);
    this.z = az + t * (v.z - az);
    return this;
};

vec3.transformMat4 = function(mat) {
    var x = this.x, y = this.y, z = this.z, m = mat.val;
    this.x = m[0] * x + m[4] * y + m[8] * z + m[12];
    this.y = m[1] * x + m[5] * y + m[9] * z + m[13];
    this.z = m[2] * x + m[6] * y + m[10] * z + m[14];
    return this;
};

vec3.transformMat3 = function(mat) {
    var x = this.x, y = this.y, z = this.z, m = mat.val;
    this.x = x * m[0] + y * m[3] + z * m[6];
    this.y = x * m[1] + y * m[4] + z * m[7];
    this.z = x * m[2] + y * m[5] + z * m[8];
    return this;
};

vec3.transformQuat = function(q) {
    // benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations
    var x = this.x, y = this.y, z = this.z,
        qx = q.x, qy = q.y, qz = q.z, qw = q.w,

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z;

    // calculate result * inverse quat
    this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return this;
};

/**
 * Multiplies this Vector3 by the specified matrix, 
 * applying a W divide. This is useful for projection,
 * e.g. unprojecting a 2D point into 3D space.
 *
 * @method  prj
 * @param {Matrix4} the 4x4 matrix to multiply with 
 * @return {Vector3} this object for chaining
 */
vec3.project = function(mat) {
    var x = this.x,
        y = this.y,
        z = this.z,
        m = mat.val,
        a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3],
        a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7],
        a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11],
        a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];

    var l_w = 1 / (x * a03 + y * a13 + z * a23 + a33);

    this.x = (x * a00 + y * a10 + z * a20 + a30) * l_w; 
    this.y = (x * a01 + y * a11 + z * a21 + a31) * l_w; 
    this.z = (x * a02 + y * a12 + z * a22 + a32) * l_w;
    return this;
};

/**
 * Unproject this point from 2D space to 3D space.
 * The point should have its x and y properties set to
 * 2D screen space, and the z either at 0 (near plane)
 * or 1 (far plane). The provided matrix is assumed to already
 * be combined, i.e. projection * view * model.
 *
 * After this operation, this vector's (x, y, z) components will
 * represent the unprojected 3D coordinate.
 * 
 * @param  {Vector4} viewport          screen x, y, width and height in pixels
 * @param  {Matrix4} invProjectionView combined projection and view matrix
 * @return {Vector3}                   this object, for chaining
 */
vec3.unproject = function(viewport, invProjectionView) {
    var viewX = viewport.x,
        viewY = viewport.y,
        viewWidth = viewport.z,
        viewHeight = viewport.w;
    
    var x = this.x, 
        y = this.y,
        z = this.z;

    x = x - viewX;
    y = viewHeight - y - 1;
    y = y - viewY;

    this.x = (2 * x) / viewWidth - 1;
    this.y = (2 * y) / viewHeight - 1;
    this.z = 2 * z - 1;

    return this.project(invProjectionView);
};

vec3.random = function(scale) {
    scale = scale || 1.0;

    var r = Math.random() * 2.0 * Math.PI;
    var z = (Math.random() * 2.0) - 1.0;
    var zScale = Math.sqrt(1.0-z*z) * scale;
    
    this.x = Math.cos(r) * zScale;
    this.y = Math.sin(r) * zScale;
    this.z = z * scale;
    return this;
};

vec3.reset = function() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    return this;
};


vec3.sub = vec3.subtract;

vec3.mul = vec3.multiply;

vec3.div = vec3.divide;

vec3.dist = vec3.distance;

vec3.distSq = vec3.distanceSq;

vec3.len = vec3.length;

vec3.lenSq = vec3.lengthSq;

vec3.toString = function() {
    return 'Vector3(' + this.x + ', ' + this.y + ', ' + this.z + ')';
};

vec3.str = vec3.toString;

module.exports = Vector3;
},{}],10:[function(require,module,exports){
var common = require('./common');

function Vector4(x, y, z, w) {
	if (typeof x === "object") {
        this.x = x.x||0;
        this.y = x.y||0;
        this.z = x.z||0;
        this.w = x.w||0;
    } else {
        this.x = x||0;
        this.y = y||0;
        this.z = z||0;
        this.w = w||0;
    }
}

//shorthand it for better minification
var vec4 = Vector4.prototype;

//mixin common functions
for (var k in common) {
    vec4[k] = common[k];
}

vec4.clone = function() {
    return new Vector4(this.x, this.y, this.z, this.w);
};

vec4.multiply = function(v) {
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    this.w *= v.w;
    return this;
};

vec4.divide = function(v) {
    this.x /= v.x;
    this.y /= v.y;
    this.z /= v.z;
    this.w /= v.w;
    return this;
};

vec4.distance = function(v) {
    var dx = v.x - this.x,
        dy = v.y - this.y,
        dz = v.z - this.z,
        dw = v.w - this.w;
    return Math.sqrt(dx*dx + dy*dy + dz*dz + dw*dw);
};

vec4.distanceSq = function(v) {
    var dx = v.x - this.x,
        dy = v.y - this.y,
        dz = v.z - this.z,
        dw = v.w - this.w;
    return dx*dx + dy*dy + dz*dz + dw*dw;
};

vec4.negate = function() {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    this.w = -this.w;
    return this;
};

vec4.transformMat4 = function(mat) {
    var m = mat.val, x = this.x, y = this.y, z = this.z, w = this.w;
    this.x = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
    this.y = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
    this.z = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
    this.w = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
    return this;
};

//// TODO: is this really the same as Vector3 ??
///  Also, what about this:
///  http://molecularmusings.wordpress.com/2013/05/24/a-faster-quaternion-vector-multiplication/
vec4.transformQuat = function(q) {
    // benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations
    var x = this.x, y = this.y, z = this.z,
        qx = q.x, qy = q.y, qz = q.z, qw = q.w,

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z;

    // calculate result * inverse quat
    this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return this;
};

vec4.random = function(scale) {
    scale = scale || 1.0;

    //Not spherical; should fix this for more uniform distribution
    this.x = (Math.random() * 2 - 1) * scale;
    this.y = (Math.random() * 2 - 1) * scale;
    this.z = (Math.random() * 2 - 1) * scale;
    this.w = (Math.random() * 2 - 1) * scale;
    return this;
};

vec4.reset = function() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.w = 0;
    return this;
};

vec4.sub = vec4.subtract;

vec4.mul = vec4.multiply;

vec4.div = vec4.divide;

vec4.dist = vec4.distance;

vec4.distSq = vec4.distanceSq;

vec4.len = vec4.length;

vec4.lenSq = vec4.lengthSq;

vec4.toString = function() {
    return 'Vector4(' + this.x + ', ' + this.y + ', ' + this.z + ', ' + this.w + ')';
};

vec4.str = vec4.toString;

module.exports = Vector4;
},{"./common":11}],11:[function(require,module,exports){
//common vec4 functions
module.exports = {
    
/**
 * Copies the x, y, z, w components from the specified
 * Vector. Unlike most other operations, this function
 * will default undefined components on `otherVec` to zero.
 * 
 * @method  copy
 * @param  {otherVec} the other Vector4 to copy
 * @return {Vector}  this, for chaining
 */


/**
 * A convenience function to set the components of
 * this vector as x, y, z, w. Falsy or undefined
 * parameters will default to zero.
 *
 * You can also pass a vector object instead of
 * individual components, to copy the object's components.
 * 
 * @method  set
 * @param {Number} x the x component
 * @param {Number} y the y component
 * @param {Number} z the z component
 * @param {Number} w the w component
 * @return {Vector2}  this, for chaining
 */

/**
 * Adds the components of the other Vector4 to
 * this vector.
 * 
 * @method add
 * @param  {Vector4} otherVec other vector, right operand
 * @return {Vector2}  this, for chaining
 */

/**
 * Subtracts the components of the other Vector4
 * from this vector. Aliased as `sub()`
 * 
 * @method  subtract
 * @param  {Vector4} otherVec other vector, right operand
 * @return {Vector2}  this, for chaining
 */

/**
 * Multiplies the components of this Vector4
 * by a scalar amount.
 *
 * @method  scale
 * @param {Number} s the scale to multiply by
 * @return {Vector4} this, for chaining
 */

/**
 * Returns the magnitude (length) of this vector.
 *
 * Aliased as `len()`
 * 
 * @method  length
 * @return {Number} the length of this vector
 */

/**
 * Returns the squared magnitude (length) of this vector.
 *
 * Aliased as `lenSq()`
 * 
 * @method  lengthSq
 * @return {Number} the squared length of this vector
 */

/**
 * Normalizes this vector to a unit vector.
 * @method normalize
 * @return {Vector4}  this, for chaining
 */

/**
 * Returns the dot product of this vector
 * and the specified Vector4.
 * 
 * @method dot
 * @return {Number} the dot product
 */
    copy: function(otherVec) {
        this.x = otherVec.x||0;
        this.y = otherVec.y||0;
        this.z = otherVec.z||0;
        this.w = otherVec.w||0;
        return this;
    },

    set: function(x, y, z, w) {
        if (typeof x === "object") {
            this.x = x.x||0;
            this.y = x.y||0;
            this.z = x.z||0;
            this.w = x.w||0;
        } else {
            this.x = x||0;
            this.y = y||0;
            this.z = z||0;
            this.w = w||0;

        }
        return this;
    },

    add: function(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        this.w += v.w;
        return this;
    },

    subtract: function(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        this.w -= v.w;
        return this;
    },

    scale: function(s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        this.w *= s;
        return this;
    },


    length: function() {
        var x = this.x,
            y = this.y,
            z = this.z,
            w = this.w;
        return Math.sqrt(x*x + y*y + z*z + w*w);
    },

    lengthSq: function() {
        var x = this.x,
            y = this.y,
            z = this.z,
            w = this.w;
        return x*x + y*y + z*z + w*w;
    },

    normalize: function() {
        var x = this.x,
            y = this.y,
            z = this.z,
            w = this.w;
        var len = x*x + y*y + z*z + w*w;
        if (len > 0) {
            len = 1 / Math.sqrt(len);
            this.x = x*len;
            this.y = y*len;
            this.z = z*len;
            this.w = w*len;
        }
        return this;
    },

    dot: function(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
    },

    lerp: function(v, t) {
        var ax = this.x,
            ay = this.y,
            az = this.z,
            aw = this.w;
        t = t||0;
        this.x = ax + t * (v.x - ax);
        this.y = ay + t * (v.y - ay);
        this.z = az + t * (v.z - az);
        this.w = aw + t * (v.w - aw);
        return this;
    }
};
},{}],12:[function(require,module,exports){
module.exports = {
    Vector2: require('./Vector2'),
    Vector3: require('./Vector3'),
    Vector4: require('./Vector4'),
    Matrix3: require('./Matrix3'),
    Matrix4: require('./Matrix4'),
    Quaternion: require('./Quaternion')
};
},{"./Matrix3":5,"./Matrix4":6,"./Quaternion":7,"./Vector2":8,"./Vector3":9,"./Vector4":10}],13:[function(require,module,exports){
var $ = (window.$);
var SimplexNoise = require('simplex-noise');
var Vector2 = require('vecmath').Vector2;

var smoothstep = require('interpolation').smoothstep;
var lerp = require('interpolation').lerp;

var NoiseMap = require('./util/NoiseMap');
var imagedata = require('./util/imagedata');

var Particle = require('./impression').Particle;

var dat = (window.dat);

var tmp = new Vector2();
var tmp2 = new Vector2();
var raf = require('raf.js');


//polyfill
if (!navigator.getUserMedia)
    navigator.getUserMedia = navigator.getUserMedia 
                        || navigator.webkitGetUserMedia 
                        || navigator.mozGetUserMedia 
                        || navigator.msGetUserMedia;
if (!window.URL)
    window.URL = window.URL 
                    || window.webkitURL 
                    || window.mozURL 
                    || window.msURL;


$(function() {
	// var canvas = $("<canvas>").appendTo(document.body)[0];
	var canvas = $("<canvas>")[0];
	var width = 900,
		height = 535;

	var minimal = !!$(document.body).data("minimal");

	var previewCanvas = $("<canvas>").appendTo(document.body)[0],
		previewWidth = Math.max(256, ~~(width/1)),
		previewHeight = ~~(previewWidth * 1/(width/height)),
		previewContext = previewCanvas.getContext("2d");

	previewCanvas.width = previewWidth;
	previewCanvas.height = previewHeight;

	canvas.width = width;
	canvas.height = height;


	var context = canvas.getContext("2d");
	var noiseSize = 256;
	var noise = new NoiseMap(noiseSize);
	noise.scale = 3.2;
	// noise.seamless = true;
	noise.smoothing = true;
	noise.generate();


	var image = new Image();
	image.onload = handleImageLoad;
	image.src = minimal ? "img/sun.png" : "img/skyline2.png";


	var imagePixels;

	var options = {
		scale: noise.scale,
		shift: false,
		painting: true,

		//stroke options
		count: 500,
		length: 33,
		thickness: 12.0,
		speed: 1.0,
		life: 1.0, 
		alpha: 0.25,
		round: true,
		motion: true,
		angle: 1,

		//color
		useOriginal: true,
		hue: 70,
		saturation: 1.0,
		lightness: 1.0,
		grain: minimal ? .5 : .7,
		darken: !minimal,
		

		background: minimal ? '#f1f0e2' : '#2f2f2f',
		clear: clear,
		animate: animateIn,
		viewOriginal: false,
		exportImage: saveImage.bind(this)
	};

	var noiseOverlay = $('<div>').appendTo(document.body).addClass('noise overlay').css({
		width: previewWidth,
		height: previewHeight,
		opacity: options.grain*0.2
	});
	$(document.body).css('background', '#252525');

	var originalImage = $(image).clone().appendTo(document.body).css({
		visibility: 'hidden'
	}).addClass('overlay original').css({
		width: previewWidth,
		height: previewHeight
	});

	
	var gui;
	setupGUI();


	var particles = [],
		count = 500,
		step = 0,
		time = 0,
		mouse = new Vector2();

	var video, playing=false;
	loadVideo();

	var startTime = Date.now(), webcamTimer = 0,
		webcamDelay = 500;

	setupParticles();

	animateIn();

	if (minimal) {
		$('#text').html('generative painting in the impressionist style<p>by Matt DesLauriers</p>')
			.css("top", 10).css("color", "#2f2f2f").css("z-index", 1000);
		$('.dg.ac').hide();
		$('canvas, div.noise').on("tap mousedown", function(ev) {
			ev.preventDefault();
			clear();

			options.painting = false;
			previewContext.drawImage(canvas, 0, 0, previewWidth, previewHeight);
			noise.randomize();
			options.scale = Math.random()*2+1
			TweenLite.delayedCall(0.5, function() {
				options.painting = true;
				animateIn();
			}.bind(this));
		}).on('touchmove', function(ev) {
			// ev.preventDefault()
		});

		// window.addEventListener("orientationchange", function() {
		// 	window.scrollTo(0, 0);
		// })
	}
	if (window.devicePixelRatio === 2) {
		$('div.noise').css("background-size", "128px 128px");
	}

	function handleImageLoad() {
		imagePixels = imagedata.getImageData(image).data;
				
		// context.fillStyle = '#ebebeb';
		clearRect();


		// context.globalAlpha = 1;
		// context.drawImage(image, 0, 0);

		requestAnimationFrame(render);
	}

	function updateAnimation() {

		//wtf dat.gui...
		for (var k in gui.__folders.stroke.__controllers) {
			gui.__folders.stroke.__controllers[k].updateDisplay();
		}
		for (var k in gui.__folders.color.__controllers) {
			gui.__folders.color.__controllers[k].updateDisplay();
		}
	}

	function saveImage() {
		// options.painting = false;

		// for (var k in gui.__folders.canvas.__controllers) {
		// 	gui.__folders.canvas.__controllers[k].updateDisplay();
		// }
		
		var dataURL = canvas.toDataURL("image/png");

		var displayWidth = width,
			displayHeight = height;
		var imageWindow = window.open("", "fractalLineImage",
                              "left=0,top=0,width="+800+",height="+500+",toolbar=0,resizable=0");
		imageWindow.document.write("<title>Export Image</title>")
		imageWindow.document.write("<img id='exportImage'"
		                             + " alt=''"
		                             + " height='" + displayHeight + "'"
		                             + " width='"  + displayWidth  + "'"
		                             + " style='position:absolute;left:0;top:0'/>");
		imageWindow.document.close();
		var exportImage = imageWindow.document.getElementById("exportImage");
		exportImage.src = dataURL;
	}

	function animateIn() {
		TweenLite.killTweensOf(options);
		updateAnimation();

		// TweenLite.to(options, 1.0, {
		// 	grain: 1.0,
		// 	onUpdate: updateGrain.bind(this),
		// });
	
		if (minimal) //god this code is getting nasty..
            animateIn2();
        else
            animateIn1();
	}

    function animateIn1() {
		TweenLite.killTweensOf(options);
		updateAnimation();

		// TweenLite.to(options, 1.0, {
		// 	grain: 1.0,
		// 	onUpdate: updateGrain.bind(this),
		// });

		TweenLite.fromTo(options, 1.0, {
			thickness: 30,
		}, {
			thickness: 20,
			ease: Expo.easeOut,
			delay: 2.0,
		})
		TweenLite.fromTo(options, 3.0, {
			length: 23,
			alpha: 0.3,
			life: 0.7,
			// round: true,
			speed: 1,
		}, {
			life: 0.5,
			alpha: 0.2,
			length: 70,
			speed: 0.6,
			delay: 1.0,
			// ease: Expo.easeOut,
			onUpdate: updateAnimation.bind(this)
		});
		TweenLite.to(options, 3.0, {
			thickness: 7.0,
			length: 30,
			// onComplete: function() {
			// 	options.round = true;
			// },
			delay: 4.0,
		});
		TweenLite.to(options, 1.0, {
			length: 10,
			delay: 6.0,
		})
	}

	function animateIn2() {
		var start = 0.0;
		TweenLite.fromTo(options, 1.0, {
			thickness: 40,

		}, {
			thickness: 10,
			ease: Expo.easeOut,
			delay: start+2.0,
		})
		TweenLite.fromTo(options, 3.0, {
			length: 23,
			alpha: 0.3,
			life: 0.7,
			// round: true,
			speed: 1,
		}, {
			life: 0.5,
			alpha: 0.2,
			length: 90,
			speed: 0.6,
			delay: start+1.0,
			// ease: Expo.easeOut,
			onUpdate: updateAnimation.bind(this)
		});
		TweenLite.to(options, 3.0, {
			thickness: 5.0,
			length: 40,
			// onComplete: function() {
			// 	options.round = true;
			// },
			delay: start+4.0,
		});
		TweenLite.to(options, 1.0, {
			length: 30,
			delay: start+6.0,
		})
		TweenLite.to(options, 1.0, {
			thickness: 3,
			delay: start+7.0,
		});
		TweenLite.to(options, 1.0, {
			thickness: 3,
			delay: start+7.0,
		});
	}

	function setupParticles() {
		particles.length = 0;
		for (var i=0; i<count; i++) {
			particles.push(new Particle().reset(width, height).random());
		}
	}

	function updateGrain() {
		noiseOverlay.css('opacity', options.grain*0.2);
	}

	function setupGUI() {
		gui = new dat.GUI();

		var motion = gui.addFolder('noise');	
		motion.add(options, 'shift');
		var noiseScale = motion.add(options, 'scale', 0.1, 5);

		noiseScale.onFinishChange(function(value) {
			noise.scale = options.scale;
			noise.generate();
		});

		var stroke = gui.addFolder('stroke');
		stroke.add(options, 'count', 1, 1500).onFinishChange(function(value) {
			count = ~~value;
			setupParticles();
		});

		stroke.add(options, 'length', 0.1, 100.0);
		stroke.add(options, 'thickness', 0.1, 50.0);
		stroke.add(options, 'life', 0.0, 1.0);
		stroke.add(options, 'speed', 0.0, 1.0);
		stroke.add(options, 'alpha', 0.0, 1.0);
		stroke.add(options, 'angle', 0.0, 2.0);
		stroke.add(options, 'round');
		stroke.add(options, 'motion');
		stroke.open();

		var color = gui.addFolder('color');
		color.add(options, 'useOriginal');
		color.add(options, 'darken');
		color.add(options, 'hue', 0, 360);
		color.add(options, 'saturation', 0, 1.0);
		color.add(options, 'lightness', 0, 1.0);
		color.add(options, 'grain', 0, 1.0).onFinishChange(updateGrain.bind(this));
		color.open();

		var canvas = gui.addFolder('canvas');

		canvas.add(options, 'painting');
		canvas.addColor(options, 'background');
		canvas.add(options, 'viewOriginal').onFinishChange(function(value) {
			originalImage.css('visibility', value ? 'visible' : 'hidden');
		});
		canvas.add(options, 'animate');
		canvas.add(options, 'clear');
		canvas.add(options, 'exportImage');
		canvas.open();



	}

	function clearRect() {
		context.globalAlpha = 1.0;
		context.fillStyle = options.background;
		context.fillRect(0, 0, width, height);
	}

	function clear() {
		TweenLite.killTweensOf(options);
		clearRect();
		setupParticles();
	}

    function loadVideo() {
    	//console.log("TRYING");
        if (navigator.getUserMedia && window.URL && window.URL.createObjectURL) {
        	//console.log("HELLOOOO");
            //create a <video> element
            video = document.createElement("video");
            video.setAttribute("autoplay", "");
            video.width = width;
            video.height = height;
            video.style.background = "black";
            // document.body.appendChild(video);

            video.addEventListener("play", function() {
            	playing = true;
            	clear();
            	animateIn();
            }, true);

            console.log("GETTING VIDEO");

            //disabled for now.
            // navigator.getUserMedia({video: true}, function(stream) {
            //     video.src = window.URL.createObjectURL(stream);
            //     hasVideo = true;

            // }, function() {
            //     //err handling...
            // });

        }
    }
//more failed experiments..
	window.addEventListener("mousemove", function(ev) {
		mouse.set(ev.clientX, ev.clientY);
	});


    var strokeCount = 0;
	function render() {
		requestAnimationFrame(render);

		var now = Date.now();
		var delta = now - startTime;
		startTime = now;
		
		time+=0.1;
		step++;



		if (!options.painting )
			return;

		webcamTimer += delta;
		if (webcamTimer > webcamDelay && playing) {
			// console.log("TEST");
			webcamTimer = 0;
			imagePixels = imagedata.getImageData(video).data;
		}

		// if (step % 100 === 0) 
		// 	console.log(strokeCount);

		if (options.shift && step % 20 === 0) {
			noise.offset+=.01;
			noise.generate();
		}

		// context.globalAlpha = 0.1;
		// context.fillStyle = 'white';
		// context.fillRect(0, 0, width, height);

		// context.clearRect(0, 0, width, height);
		var imageWidth = image.width;

		// for (var y=0; y<height; y++) {
		// 	for (var x=0; x<width; x++) {
		// 		var sampleWidth = width,
		// 			sampleHeight = width;

		// 		var pxIndex = (x + (y * imageWidth))*4;
		// 		var red = imagePixels[ pxIndex ],
		// 			green = imagePixels[ pxIndex + 1],
		// 			blue = imagePixels[pxIndex + 2];
		// 		context.fillStyle = 'rgb('+red+', '+green+', '+blue+')';

		// 		// var n = noise.sample(x*(noiseSize/sampleWidth), y*(noiseSize/sampleHeight));
		// 		// context.fillStyle = 'hsl(0, 0%, '+((n/2+0.5)*100)+'%)';
		// 		context.fillRect(x, y, 1, 1);
		// 	}
		// }
		

		for (var i=0; i<particles.length; i++) {
			var p = particles[i];

			if (p.motion)
				p.position.add(p.velocity);

			//add in our motion
			var px = ~~p.position.x,
				py = ~~p.position.y;

			var sampleWidth = width,
				sampleHeight = width;

			var n = noise.sample(px*(noiseSize/sampleWidth), py*(noiseSize/sampleHeight));

			var angle = n * Math.PI * 2 * options.angle;
			
			tmp.set( Math.cos(angle), Math.sin(angle) );
			p.velocity.add(tmp);
			p.velocity.normalize();

			// if (p.position.x > width || p.position.x < 0 || p.position.y > height || p.position.y < 0 ) {
			// 	p.reset();
			// }

			if (/*p.position.x < 0 || */p.position.x > width || p.position.y > height || p.position.y < 0) {
				p.reset();
			}

			var rot = (n/2+0.5);
			var hue = (noise.offset % 50)/50 * rot;

			var imgX = px,
				imgY = py;
			// var imgX =px-(mouse.x),
			// 	imgY = py-(mouse.y);
			var pxIndex = (imgX + (imgY * imageWidth))*4;
			var red = imagePixels[ pxIndex ],
				green = imagePixels[ pxIndex + 1],
				blue = imagePixels[pxIndex + 2];

			// var alpha = Math.sin(time*0.1)*100+100;
			var alpha = options.hue;

			// CIE luminance for the RGB
			var val = 0.2126 * (red/255) + 0.7152 * (green/255) + 0.0722 * (blue/255);
			

			var brightness = options.darken ? val : 1.0;
			
			// context.strokeStyle = 'hsl('+lerp(alpha, alpha-100, rot)+', '+(1-red/255)*lerp(0.7, 1, rot)*100+'%, '+lerp(0.45, 0.55, rot)*100+'%)';
			if (options.useOriginal)
				context.strokeStyle = 'rgb('+~~(red*brightness)+', '+~~(green*brightness)+', '+~~(blue*brightness)+')';
			else
				context.strokeStyle = 'hsl('+lerp(alpha, alpha-100, rot)+', '+(1-val)*lerp(0.2, 0.9, rot)*options.saturation*100+'%, '+(val)*lerp(0.45, 1, rot)*brightness*options.lightness*100+'%)';

			var s = 2;

			// context.fillStyle = 'black';
			// context.fillRect(p.position.x, p.position.y, 1, 1);

		 	context.beginPath();
			context.moveTo(p.position.x, p.position.y);
			var lineSize = (options.length*(n/2+0.5)*p.size);
			tmp.copy(p.position);
			tmp2.copy(p.velocity).scale(lineSize);
			tmp.add(tmp2);
			context.lineTo(tmp.x, tmp.y);
			context.stroke();
			context.globalAlpha = options.alpha;
			context.lineWidth = options.thickness*(n/2+0.5);
			context.lineCap = options.round ? 'round' : 'square';

			p.size += 0.1 * options.speed * p.speed;
			if (p.size >= options.life) {
				p.reset(width, height).random();	
			}
			
		}

		// strokeCount += particles.length;


		previewContext.drawImage(canvas, 0, 0, previewWidth, previewHeight);
	}
});
},{"./impression":15,"./util/NoiseMap":16,"./util/imagedata":17,"interpolation":1,"raf.js":3,"simplex-noise":4,"vecmath":12}],14:[function(require,module,exports){
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
},{"vecmath":12}],15:[function(require,module,exports){
module.exports = {
	Particle: require('./Particle')
};
},{"./Particle":14}],16:[function(require,module,exports){
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

var NoiseMap = new Class({

    initialize: function(size) {
        if (!size)
            throw "no size specified to NoiseMap";

        this.simplex = new SimplexNoise(rand);
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

        return this.simplex.noise4D(cx + x, cy + y, cz + z, cw + w);
    },

    randomize: function() {
        this.simplex = new SimplexNoise(rand);
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
                noiseMap[i] = this.simplex.noise3D(x/noiseSize * zoom, y/noiseSize * zoom, noiseOff);
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
},{"./sampling":18,"interpolation":1,"klasse":2,"simplex-noise":4}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
var lerp = require('interpolation').lerp;
var smoothstep = require('interpolation').smoothstep;

module.exports.nearest = function(data, size, x, y) {
    var px = ~~x % size,
        py = ~~y % size;
    return data[ px + (py * size) ];
};

module.exports.bilinear = function(data, size, x, y) {
    //bilinear interpolation 
    //http://www.scratchapixel.com/lessons/3d-advanced-lessons/noise-part-1/creating-a-simple-2d-noise/
    var xi = Math.floor( x );
    var yi = Math.floor( y );
 
    var tx = x - xi;
    var ty = y - yi;

    var mask = size-1;
 
    var rx0 = xi & mask;
    var rx1 = ( rx0 + 1 ) & mask;
    var ry0 = yi & mask;
    var ry1 = ( ry0 + 1 ) & mask;
 
    /// random values at the corners of the cell using permutation table
    var c00 = data[ (ry0 * size + rx0) ];
    var c10 = data[ (ry0 * size + rx1) ];
    var c01 = data[ (ry1 * size + rx0) ];
    var c11 = data[ (ry1 * size + rx1) ];

    /// remapping of tx and ty using the Smoothstep function
    var sx = smoothstep( 0, 1, tx );
    var sy = smoothstep( 0, 1, ty );
 
    /// linearly interpolate values along the x axis
    var nx0 = lerp( c00, c10, sx );
    var nx1 = lerp( c01, c11, sx );
    
    /// linearly interpolate the nx0/nx1 along they y axis
    var v = lerp( nx0, nx1, sy );
    return v;
}; 
},{"interpolation":1}]},{},[13])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvcHJvamVjdHMvaW1wcmVzc2lvbmlzdC9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvbm9kZV9tb2R1bGVzL2ludGVycG9sYXRpb24vaW5kZXguanMiLCIvcHJvamVjdHMvaW1wcmVzc2lvbmlzdC9ub2RlX21vZHVsZXMva2xhc3NlL2luZGV4LmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvbm9kZV9tb2R1bGVzL3JhZi5qcy9yYWYuanMiLCIvcHJvamVjdHMvaW1wcmVzc2lvbmlzdC9ub2RlX21vZHVsZXMvc2ltcGxleC1ub2lzZS9zaW1wbGV4LW5vaXNlLmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvbm9kZV9tb2R1bGVzL3ZlY21hdGgvbGliL01hdHJpeDMuanMiLCIvcHJvamVjdHMvaW1wcmVzc2lvbmlzdC9ub2RlX21vZHVsZXMvdmVjbWF0aC9saWIvTWF0cml4NC5qcyIsIi9wcm9qZWN0cy9pbXByZXNzaW9uaXN0L25vZGVfbW9kdWxlcy92ZWNtYXRoL2xpYi9RdWF0ZXJuaW9uLmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvbm9kZV9tb2R1bGVzL3ZlY21hdGgvbGliL1ZlY3RvcjIuanMiLCIvcHJvamVjdHMvaW1wcmVzc2lvbmlzdC9ub2RlX21vZHVsZXMvdmVjbWF0aC9saWIvVmVjdG9yMy5qcyIsIi9wcm9qZWN0cy9pbXByZXNzaW9uaXN0L25vZGVfbW9kdWxlcy92ZWNtYXRoL2xpYi9WZWN0b3I0LmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvbm9kZV9tb2R1bGVzL3ZlY21hdGgvbGliL2NvbW1vbi5qcyIsIi9wcm9qZWN0cy9pbXByZXNzaW9uaXN0L25vZGVfbW9kdWxlcy92ZWNtYXRoL2xpYi9pbmRleC5qcyIsIi9wcm9qZWN0cy9pbXByZXNzaW9uaXN0L3NyYy9mYWtlXzI3MTQyYzkwLmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvc3JjL2ltcHJlc3Npb24vUGFydGljbGUuanMiLCIvcHJvamVjdHMvaW1wcmVzc2lvbmlzdC9zcmMvaW1wcmVzc2lvbi9pbmRleC5qcyIsIi9wcm9qZWN0cy9pbXByZXNzaW9uaXN0L3NyYy91dGlsL05vaXNlTWFwLmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvc3JjL3V0aWwvaW1hZ2VkYXRhLmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvc3JjL3V0aWwvc2FtcGxpbmcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0WkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1cUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1akJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiogVXRpbGl0eSBmdW5jdGlvbiBmb3IgbGluZWFyIGludGVycG9sYXRpb24uICovXG5tb2R1bGUuZXhwb3J0cy5sZXJwID0gZnVuY3Rpb24odjAsIHYxLCB0KSB7XG4gICAgcmV0dXJuIHYwKigxLXQpK3YxKnQ7XG59O1xuXG4vKiogVXRpbGl0eSBmdW5jdGlvbiBmb3IgSGVybWl0ZSBpbnRlcnBvbGF0aW9uLiAqL1xubW9kdWxlLmV4cG9ydHMuc21vb3Roc3RlcCA9IGZ1bmN0aW9uKHYwLCB2MSwgdCkge1xuICAgIC8vIFNjYWxlLCBiaWFzIGFuZCBzYXR1cmF0ZSB4IHRvIDAuLjEgcmFuZ2VcbiAgICB0ID0gTWF0aC5tYXgoMC4wLCBNYXRoLm1pbigxLjAsICh0IC0gdjApLyh2MSAtIHYwKSApKTtcbiAgICAvLyBFdmFsdWF0ZSBwb2x5bm9taWFsXG4gICAgcmV0dXJuIHQqdCooMyAtIDIqdCk7XG59OyIsImZ1bmN0aW9uIGhhc0dldHRlck9yU2V0dGVyKGRlZikge1xuXHRyZXR1cm4gKCEhZGVmLmdldCAmJiB0eXBlb2YgZGVmLmdldCA9PT0gXCJmdW5jdGlvblwiKSB8fCAoISFkZWYuc2V0ICYmIHR5cGVvZiBkZWYuc2V0ID09PSBcImZ1bmN0aW9uXCIpO1xufVxuXG5mdW5jdGlvbiBnZXRQcm9wZXJ0eShkZWZpbml0aW9uLCBrLCBpc0NsYXNzRGVzY3JpcHRvcikge1xuXHQvL1RoaXMgbWF5IGJlIGEgbGlnaHR3ZWlnaHQgb2JqZWN0LCBPUiBpdCBtaWdodCBiZSBhIHByb3BlcnR5XG5cdC8vdGhhdCB3YXMgZGVmaW5lZCBwcmV2aW91c2x5LlxuXHRcblx0Ly9Gb3Igc2ltcGxlIGNsYXNzIGRlc2NyaXB0b3JzIHdlIGNhbiBqdXN0IGFzc3VtZSBpdHMgTk9UIHByZXZpb3VzbHkgZGVmaW5lZC5cblx0dmFyIGRlZiA9IGlzQ2xhc3NEZXNjcmlwdG9yIFxuXHRcdFx0XHQ/IGRlZmluaXRpb25ba10gXG5cdFx0XHRcdDogT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihkZWZpbml0aW9uLCBrKTtcblxuXHRpZiAoIWlzQ2xhc3NEZXNjcmlwdG9yICYmIGRlZi52YWx1ZSAmJiB0eXBlb2YgZGVmLnZhbHVlID09PSBcIm9iamVjdFwiKSB7XG5cdFx0ZGVmID0gZGVmLnZhbHVlO1xuXHR9XG5cblxuXHQvL1RoaXMgbWlnaHQgYmUgYSByZWd1bGFyIHByb3BlcnR5LCBvciBpdCBtYXkgYmUgYSBnZXR0ZXIvc2V0dGVyIHRoZSB1c2VyIGRlZmluZWQgaW4gYSBjbGFzcy5cblx0aWYgKCBkZWYgJiYgaGFzR2V0dGVyT3JTZXR0ZXIoZGVmKSApIHtcblx0XHRpZiAodHlwZW9mIGRlZi5lbnVtZXJhYmxlID09PSBcInVuZGVmaW5lZFwiKVxuXHRcdFx0ZGVmLmVudW1lcmFibGUgPSB0cnVlO1xuXHRcdGlmICh0eXBlb2YgZGVmLmNvbmZpZ3VyYWJsZSA9PT0gXCJ1bmRlZmluZWRcIilcblx0XHRcdGRlZi5jb25maWd1cmFibGUgPSB0cnVlO1xuXHRcdHJldHVybiBkZWY7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGhhc05vbkNvbmZpZ3VyYWJsZShvYmosIGspIHtcblx0dmFyIHByb3AgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iaiwgayk7XG5cdGlmICghcHJvcClcblx0XHRyZXR1cm4gZmFsc2U7XG5cblx0aWYgKHByb3AudmFsdWUgJiYgdHlwZW9mIHByb3AudmFsdWUgPT09IFwib2JqZWN0XCIpXG5cdFx0cHJvcCA9IHByb3AudmFsdWU7XG5cblx0aWYgKHByb3AuY29uZmlndXJhYmxlID09PSBmYWxzZSkgXG5cdFx0cmV0dXJuIHRydWU7XG5cblx0cmV0dXJuIGZhbHNlO1xufVxuXG4vL1RPRE86IE9uIGNyZWF0ZSwgXG4vL1x0XHRPbiBtaXhpbiwgXG5cbmZ1bmN0aW9uIGV4dGVuZChjdG9yLCBkZWZpbml0aW9uLCBpc0NsYXNzRGVzY3JpcHRvciwgZXh0ZW5kKSB7XG5cdGZvciAodmFyIGsgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmICghZGVmaW5pdGlvbi5oYXNPd25Qcm9wZXJ0eShrKSlcblx0XHRcdGNvbnRpbnVlO1xuXG5cdFx0dmFyIGRlZiA9IGdldFByb3BlcnR5KGRlZmluaXRpb24sIGssIGlzQ2xhc3NEZXNjcmlwdG9yKTtcblxuXHRcdGlmIChkZWYgIT09IGZhbHNlKSB7XG5cdFx0XHQvL0lmIEV4dGVuZHMgaXMgdXNlZCwgd2Ugd2lsbCBjaGVjayBpdHMgcHJvdG90eXBlIHRvIHNlZSBpZiBcblx0XHRcdC8vdGhlIGZpbmFsIHZhcmlhYmxlIGV4aXN0cy5cblx0XHRcdFxuXHRcdFx0dmFyIHBhcmVudCA9IGV4dGVuZCB8fCBjdG9yO1xuXHRcdFx0aWYgKGhhc05vbkNvbmZpZ3VyYWJsZShwYXJlbnQucHJvdG90eXBlLCBrKSkge1xuXG5cdFx0XHRcdC8vanVzdCBza2lwIHRoZSBmaW5hbCBwcm9wZXJ0eVxuXHRcdFx0XHRpZiAoQ2xhc3MuaWdub3JlRmluYWxzKVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXG5cdFx0XHRcdC8vV2UgY2Fubm90IHJlLWRlZmluZSBhIHByb3BlcnR5IHRoYXQgaXMgY29uZmlndXJhYmxlPWZhbHNlLlxuXHRcdFx0XHQvL1NvIHdlIHdpbGwgY29uc2lkZXIgdGhlbSBmaW5hbCBhbmQgdGhyb3cgYW4gZXJyb3IuIFRoaXMgaXMgYnlcblx0XHRcdFx0Ly9kZWZhdWx0IHNvIGl0IGlzIGNsZWFyIHRvIHRoZSBkZXZlbG9wZXIgd2hhdCBpcyBoYXBwZW5pbmcuXG5cdFx0XHRcdC8vWW91IGNhbiBzZXQgaWdub3JlRmluYWxzIHRvIHRydWUgaWYgeW91IG5lZWQgdG8gZXh0ZW5kIGEgY2xhc3Ncblx0XHRcdFx0Ly93aGljaCBoYXMgY29uZmlndXJhYmxlPWZhbHNlOyBpdCB3aWxsIHNpbXBseSBub3QgcmUtZGVmaW5lIGZpbmFsIHByb3BlcnRpZXMuXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcImNhbm5vdCBvdmVycmlkZSBmaW5hbCBwcm9wZXJ0eSAnXCIra1xuXHRcdFx0XHRcdFx0XHQrXCInLCBzZXQgQ2xhc3MuaWdub3JlRmluYWxzID0gdHJ1ZSB0byBza2lwXCIpO1xuXHRcdFx0fVxuXG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoY3Rvci5wcm90b3R5cGUsIGssIGRlZik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGN0b3IucHJvdG90eXBlW2tdID0gZGVmaW5pdGlvbltrXTtcblx0XHR9XG5cblx0fVxufVxuXG4vKipcbiAqL1xuZnVuY3Rpb24gbWl4aW4obXlDbGFzcywgbWl4aW5zKSB7XG5cdGlmICghbWl4aW5zKVxuXHRcdHJldHVybjtcblxuXHRpZiAoIUFycmF5LmlzQXJyYXkobWl4aW5zKSlcblx0XHRtaXhpbnMgPSBbbWl4aW5zXTtcblxuXHRmb3IgKHZhciBpPTA7IGk8bWl4aW5zLmxlbmd0aDsgaSsrKSB7XG5cdFx0ZXh0ZW5kKG15Q2xhc3MsIG1peGluc1tpXS5wcm90b3R5cGUgfHwgbWl4aW5zW2ldKTtcblx0fVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgY2xhc3Mgd2l0aCB0aGUgZ2l2ZW4gZGVzY3JpcHRvci5cbiAqIFRoZSBjb25zdHJ1Y3RvciwgZGVmaW5lZCBieSB0aGUgbmFtZSBgaW5pdGlhbGl6ZWAsXG4gKiBpcyBhbiBvcHRpb25hbCBmdW5jdGlvbi4gSWYgdW5zcGVjaWZpZWQsIGFuIGFub255bW91c1xuICogZnVuY3Rpb24gd2lsbCBiZSB1c2VkIHdoaWNoIGNhbGxzIHRoZSBwYXJlbnQgY2xhc3MgKGlmXG4gKiBvbmUgZXhpc3RzKS4gXG4gKlxuICogWW91IGNhbiBhbHNvIHVzZSBgRXh0ZW5kc2AgYW5kIGBNaXhpbnNgIHRvIHByb3ZpZGUgc3ViY2xhc3NpbmdcbiAqIGFuZCBpbmhlcml0YW5jZS5cbiAqXG4gKiBAY2xhc3MgIENsYXNzXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7T2JqZWN0fSBkZWZpbml0aW9uIGEgZGljdGlvbmFyeSBvZiBmdW5jdGlvbnMgZm9yIHRoZSBjbGFzc1xuICogQGV4YW1wbGVcbiAqXG4gKiBcdFx0dmFyIE15Q2xhc3MgPSBuZXcgQ2xhc3Moe1xuICogXHRcdFxuICogXHRcdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gKiBcdFx0XHRcdHRoaXMuZm9vID0gMi4wO1xuICogXHRcdFx0fSxcbiAqXG4gKiBcdFx0XHRiYXI6IGZ1bmN0aW9uKCkge1xuICogXHRcdFx0XHRyZXR1cm4gdGhpcy5mb28gKyA1O1xuICogXHRcdFx0fVxuICogXHRcdH0pO1xuICovXG5mdW5jdGlvbiBDbGFzcyhkZWZpbml0aW9uKSB7XG5cdGlmICghZGVmaW5pdGlvbilcblx0XHRkZWZpbml0aW9uID0ge307XG5cblx0Ly9UaGUgdmFyaWFibGUgbmFtZSBoZXJlIGRpY3RhdGVzIHdoYXQgd2Ugc2VlIGluIENocm9tZSBkZWJ1Z2dlclxuXHR2YXIgaW5pdGlhbGl6ZTtcblx0dmFyIEV4dGVuZHM7XG5cblx0aWYgKGRlZmluaXRpb24uaW5pdGlhbGl6ZSkge1xuXHRcdGlmICh0eXBlb2YgZGVmaW5pdGlvbi5pbml0aWFsaXplICE9PSBcImZ1bmN0aW9uXCIpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJpbml0aWFsaXplIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcblx0XHRpbml0aWFsaXplID0gZGVmaW5pdGlvbi5pbml0aWFsaXplO1xuXG5cdFx0Ly9Vc3VhbGx5IHdlIHNob3VsZCBhdm9pZCBcImRlbGV0ZVwiIGluIFY4IGF0IGFsbCBjb3N0cy5cblx0XHQvL0hvd2V2ZXIsIGl0cyB1bmxpa2VseSB0byBtYWtlIGFueSBwZXJmb3JtYW5jZSBkaWZmZXJlbmNlXG5cdFx0Ly9oZXJlIHNpbmNlIHdlIG9ubHkgY2FsbCB0aGlzIG9uIGNsYXNzIGNyZWF0aW9uIChpLmUuIG5vdCBvYmplY3QgY3JlYXRpb24pLlxuXHRcdGRlbGV0ZSBkZWZpbml0aW9uLmluaXRpYWxpemU7XG5cdH0gZWxzZSB7XG5cdFx0aWYgKGRlZmluaXRpb24uRXh0ZW5kcykge1xuXHRcdFx0dmFyIGJhc2UgPSBkZWZpbml0aW9uLkV4dGVuZHM7XG5cdFx0XHRpbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRiYXNlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdFx0XHR9OyBcblx0XHR9IGVsc2Uge1xuXHRcdFx0aW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHt9OyBcblx0XHR9XG5cdH1cblxuXHRpZiAoZGVmaW5pdGlvbi5FeHRlbmRzKSB7XG5cdFx0aW5pdGlhbGl6ZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKGRlZmluaXRpb24uRXh0ZW5kcy5wcm90b3R5cGUpO1xuXHRcdGluaXRpYWxpemUucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gaW5pdGlhbGl6ZTtcblx0XHQvL2ZvciBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IgdG8gd29yaywgd2UgbmVlZCB0byBhY3Rcblx0XHQvL2RpcmVjdGx5IG9uIHRoZSBFeHRlbmRzIChvciBNaXhpbilcblx0XHRFeHRlbmRzID0gZGVmaW5pdGlvbi5FeHRlbmRzO1xuXHRcdGRlbGV0ZSBkZWZpbml0aW9uLkV4dGVuZHM7XG5cdH0gZWxzZSB7XG5cdFx0aW5pdGlhbGl6ZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBpbml0aWFsaXplO1xuXHR9XG5cblx0Ly9HcmFiIHRoZSBtaXhpbnMsIGlmIHRoZXkgYXJlIHNwZWNpZmllZC4uLlxuXHR2YXIgbWl4aW5zID0gbnVsbDtcblx0aWYgKGRlZmluaXRpb24uTWl4aW5zKSB7XG5cdFx0bWl4aW5zID0gZGVmaW5pdGlvbi5NaXhpbnM7XG5cdFx0ZGVsZXRlIGRlZmluaXRpb24uTWl4aW5zO1xuXHR9XG5cblx0Ly9GaXJzdCwgbWl4aW4gaWYgd2UgY2FuLlxuXHRtaXhpbihpbml0aWFsaXplLCBtaXhpbnMpO1xuXG5cdC8vTm93IHdlIGdyYWIgdGhlIGFjdHVhbCBkZWZpbml0aW9uIHdoaWNoIGRlZmluZXMgdGhlIG92ZXJyaWRlcy5cblx0ZXh0ZW5kKGluaXRpYWxpemUsIGRlZmluaXRpb24sIHRydWUsIEV4dGVuZHMpO1xuXG5cdHJldHVybiBpbml0aWFsaXplO1xufTtcblxuQ2xhc3MuZXh0ZW5kID0gZXh0ZW5kO1xuQ2xhc3MubWl4aW4gPSBtaXhpbjtcbkNsYXNzLmlnbm9yZUZpbmFscyA9IGZhbHNlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENsYXNzOyIsIi8qXG4gKiByYWYuanNcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9uZ3J5bWFuL3JhZi5qc1xuICpcbiAqIG9yaWdpbmFsIHJlcXVlc3RBbmltYXRpb25GcmFtZSBwb2x5ZmlsbCBieSBFcmlrIE3DtmxsZXJcbiAqIGluc3BpcmVkIGZyb20gcGF1bF9pcmlzaCBnaXN0IGFuZCBwb3N0XG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEzIG5ncnltYW5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiAqL1xuXG4oZnVuY3Rpb24od2luZG93KSB7XG5cdHZhciBsYXN0VGltZSA9IDAsXG5cdFx0dmVuZG9ycyA9IFsnd2Via2l0JywgJ21veiddLFxuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUsXG5cdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUsXG5cdFx0aSA9IHZlbmRvcnMubGVuZ3RoO1xuXG5cdC8vIHRyeSB0byB1bi1wcmVmaXggZXhpc3RpbmcgcmFmXG5cdHdoaWxlICgtLWkgPj0gMCAmJiAhcmVxdWVzdEFuaW1hdGlvbkZyYW1lKSB7XG5cdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbaV0gKyAnUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XG5cdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdmVuZG9yc1tpXSArICdDYW5jZWxBbmltYXRpb25GcmFtZSddO1xuXHR9XG5cblx0Ly8gcG9seWZpbGwgd2l0aCBzZXRUaW1lb3V0IGZhbGxiYWNrXG5cdC8vIGhlYXZpbHkgaW5zcGlyZWQgZnJvbSBAZGFyaXVzIGdpc3QgbW9kOiBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9wYXVsaXJpc2gvMTU3OTY3MSNjb21tZW50LTgzNzk0NVxuXHRpZiAoIXJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCAhY2FuY2VsQW5pbWF0aW9uRnJhbWUpIHtcblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuXHRcdFx0dmFyIG5vdyA9IERhdGUubm93KCksIG5leHRUaW1lID0gTWF0aC5tYXgobGFzdFRpbWUgKyAxNiwgbm93KTtcblx0XHRcdHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjYWxsYmFjayhsYXN0VGltZSA9IG5leHRUaW1lKTtcblx0XHRcdH0sIG5leHRUaW1lIC0gbm93KTtcblx0XHR9O1xuXG5cdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBjbGVhclRpbWVvdXQ7XG5cdH1cblxuXHQvLyBleHBvcnQgdG8gd2luZG93XG5cdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XG5cdHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IGNhbmNlbEFuaW1hdGlvbkZyYW1lO1xufSh3aW5kb3cpKTsiLCIvKlxuICogQSBmYXN0IGphdmFzY3JpcHQgaW1wbGVtZW50YXRpb24gb2Ygc2ltcGxleCBub2lzZSBieSBKb25hcyBXYWduZXJcbiAqXG4gKiBCYXNlZCBvbiBhIHNwZWVkLWltcHJvdmVkIHNpbXBsZXggbm9pc2UgYWxnb3JpdGhtIGZvciAyRCwgM0QgYW5kIDREIGluIEphdmEuXG4gKiBXaGljaCBpcyBiYXNlZCBvbiBleGFtcGxlIGNvZGUgYnkgU3RlZmFuIEd1c3RhdnNvbiAoc3RlZ3VAaXRuLmxpdS5zZSkuXG4gKiBXaXRoIE9wdGltaXNhdGlvbnMgYnkgUGV0ZXIgRWFzdG1hbiAocGVhc3RtYW5AZHJpenpsZS5zdGFuZm9yZC5lZHUpLlxuICogQmV0dGVyIHJhbmsgb3JkZXJpbmcgbWV0aG9kIGJ5IFN0ZWZhbiBHdXN0YXZzb24gaW4gMjAxMi5cbiAqXG4gKlxuICogQ29weXJpZ2h0IChDKSAyMDEyIEpvbmFzIFdhZ25lclxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZ1xuICogYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4gKiBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbiAqIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbiAqIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0b1xuICogcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvXG4gKiB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmVcbiAqIGluY2x1ZGVkIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsXG4gKiBFWFBSRVNTIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0ZcbiAqIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EXG4gKiBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFXG4gKiBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OXG4gKiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT05cbiAqIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuICpcbiAqL1xuKGZ1bmN0aW9uICgpIHtcblxudmFyIEYyID0gMC41ICogKE1hdGguc3FydCgzLjApIC0gMS4wKSxcbiAgICBHMiA9ICgzLjAgLSBNYXRoLnNxcnQoMy4wKSkgLyA2LjAsXG4gICAgRjMgPSAxLjAgLyAzLjAsXG4gICAgRzMgPSAxLjAgLyA2LjAsXG4gICAgRjQgPSAoTWF0aC5zcXJ0KDUuMCkgLSAxLjApIC8gNC4wLFxuICAgIEc0ID0gKDUuMCAtIE1hdGguc3FydCg1LjApKSAvIDIwLjA7XG5cblxuZnVuY3Rpb24gU2ltcGxleE5vaXNlKHJhbmRvbSkge1xuICAgIGlmICghcmFuZG9tKSByYW5kb20gPSBNYXRoLnJhbmRvbTtcbiAgICB0aGlzLnAgPSBuZXcgVWludDhBcnJheSgyNTYpO1xuICAgIHRoaXMucGVybSA9IG5ldyBVaW50OEFycmF5KDUxMik7XG4gICAgdGhpcy5wZXJtTW9kMTIgPSBuZXcgVWludDhBcnJheSg1MTIpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMjU2OyBpKyspIHtcbiAgICAgICAgdGhpcy5wW2ldID0gcmFuZG9tKCkgKiAyNTY7XG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCA1MTI7IGkrKykge1xuICAgICAgICB0aGlzLnBlcm1baV0gPSB0aGlzLnBbaSAmIDI1NV07XG4gICAgICAgIHRoaXMucGVybU1vZDEyW2ldID0gdGhpcy5wZXJtW2ldICUgMTI7XG4gICAgfVxuXG59XG5TaW1wbGV4Tm9pc2UucHJvdG90eXBlID0ge1xuICAgIGdyYWQzOiBuZXcgRmxvYXQzMkFycmF5KFsxLCAxLCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0gMSwgMSwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAxLCAtIDEsIDAsXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAtIDEsIC0gMSwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAxLCAwLCAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0gMSwgMCwgMSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDEsIDAsIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAtIDEsIDAsIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLCAxLCAxLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMCwgLSAxLCAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDAsIDEsIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLCAtIDEsIC0gMV0pLFxuICAgIGdyYWQ0OiBuZXcgRmxvYXQzMkFycmF5KFswLCAxLCAxLCAxLCAwLCAxLCAxLCAtIDEsIDAsIDEsIC0gMSwgMSwgMCwgMSwgLSAxLCAtIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMCwgLSAxLCAxLCAxLCAwLCAtIDEsIDEsIC0gMSwgMCwgLSAxLCAtIDEsIDEsIDAsIC0gMSwgLSAxLCAtIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMSwgMCwgMSwgMSwgMSwgMCwgMSwgLSAxLCAxLCAwLCAtIDEsIDEsIDEsIDAsIC0gMSwgLSAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0gMSwgMCwgMSwgMSwgLSAxLCAwLCAxLCAtIDEsIC0gMSwgMCwgLSAxLCAxLCAtIDEsIDAsIC0gMSwgLSAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDEsIDEsIDAsIDEsIDEsIDEsIDAsIC0gMSwgMSwgLSAxLCAwLCAxLCAxLCAtIDEsIDAsIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAtIDEsIDEsIDAsIDEsIC0gMSwgMSwgMCwgLSAxLCAtIDEsIC0gMSwgMCwgMSwgLSAxLCAtIDEsIDAsIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAxLCAxLCAxLCAwLCAxLCAxLCAtIDEsIDAsIDEsIC0gMSwgMSwgMCwgMSwgLSAxLCAtIDEsIDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLSAxLCAxLCAxLCAwLCAtIDEsIDEsIC0gMSwgMCwgLSAxLCAtIDEsIDEsIDAsIC0gMSwgLSAxLCAtIDEsIDBdKSxcbiAgICBub2lzZTJEOiBmdW5jdGlvbiAoeGluLCB5aW4pIHtcbiAgICAgICAgdmFyIHBlcm1Nb2QxMiA9IHRoaXMucGVybU1vZDEyLFxuICAgICAgICAgICAgcGVybSA9IHRoaXMucGVybSxcbiAgICAgICAgICAgIGdyYWQzID0gdGhpcy5ncmFkMztcbiAgICAgICAgdmFyIG4wLCBuMSwgbjI7IC8vIE5vaXNlIGNvbnRyaWJ1dGlvbnMgZnJvbSB0aGUgdGhyZWUgY29ybmVyc1xuICAgICAgICAvLyBTa2V3IHRoZSBpbnB1dCBzcGFjZSB0byBkZXRlcm1pbmUgd2hpY2ggc2ltcGxleCBjZWxsIHdlJ3JlIGluXG4gICAgICAgIHZhciBzID0gKHhpbiArIHlpbikgKiBGMjsgLy8gSGFpcnkgZmFjdG9yIGZvciAyRFxuICAgICAgICB2YXIgaSA9IE1hdGguZmxvb3IoeGluICsgcyk7XG4gICAgICAgIHZhciBqID0gTWF0aC5mbG9vcih5aW4gKyBzKTtcbiAgICAgICAgdmFyIHQgPSAoaSArIGopICogRzI7XG4gICAgICAgIHZhciBYMCA9IGkgLSB0OyAvLyBVbnNrZXcgdGhlIGNlbGwgb3JpZ2luIGJhY2sgdG8gKHgseSkgc3BhY2VcbiAgICAgICAgdmFyIFkwID0gaiAtIHQ7XG4gICAgICAgIHZhciB4MCA9IHhpbiAtIFgwOyAvLyBUaGUgeCx5IGRpc3RhbmNlcyBmcm9tIHRoZSBjZWxsIG9yaWdpblxuICAgICAgICB2YXIgeTAgPSB5aW4gLSBZMDtcbiAgICAgICAgLy8gRm9yIHRoZSAyRCBjYXNlLCB0aGUgc2ltcGxleCBzaGFwZSBpcyBhbiBlcXVpbGF0ZXJhbCB0cmlhbmdsZS5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIHdoaWNoIHNpbXBsZXggd2UgYXJlIGluLlxuICAgICAgICB2YXIgaTEsIGoxOyAvLyBPZmZzZXRzIGZvciBzZWNvbmQgKG1pZGRsZSkgY29ybmVyIG9mIHNpbXBsZXggaW4gKGksaikgY29vcmRzXG4gICAgICAgIGlmICh4MCA+IHkwKSB7XG4gICAgICAgICAgICBpMSA9IDE7XG4gICAgICAgICAgICBqMSA9IDA7XG4gICAgICAgIH0gLy8gbG93ZXIgdHJpYW5nbGUsIFhZIG9yZGVyOiAoMCwwKS0+KDEsMCktPigxLDEpXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaTEgPSAwO1xuICAgICAgICAgICAgajEgPSAxO1xuICAgICAgICB9IC8vIHVwcGVyIHRyaWFuZ2xlLCBZWCBvcmRlcjogKDAsMCktPigwLDEpLT4oMSwxKVxuICAgICAgICAvLyBBIHN0ZXAgb2YgKDEsMCkgaW4gKGksaikgbWVhbnMgYSBzdGVwIG9mICgxLWMsLWMpIGluICh4LHkpLCBhbmRcbiAgICAgICAgLy8gYSBzdGVwIG9mICgwLDEpIGluIChpLGopIG1lYW5zIGEgc3RlcCBvZiAoLWMsMS1jKSBpbiAoeCx5KSwgd2hlcmVcbiAgICAgICAgLy8gYyA9ICgzLXNxcnQoMykpLzZcbiAgICAgICAgdmFyIHgxID0geDAgLSBpMSArIEcyOyAvLyBPZmZzZXRzIGZvciBtaWRkbGUgY29ybmVyIGluICh4LHkpIHVuc2tld2VkIGNvb3Jkc1xuICAgICAgICB2YXIgeTEgPSB5MCAtIGoxICsgRzI7XG4gICAgICAgIHZhciB4MiA9IHgwIC0gMS4wICsgMi4wICogRzI7IC8vIE9mZnNldHMgZm9yIGxhc3QgY29ybmVyIGluICh4LHkpIHVuc2tld2VkIGNvb3Jkc1xuICAgICAgICB2YXIgeTIgPSB5MCAtIDEuMCArIDIuMCAqIEcyO1xuICAgICAgICAvLyBXb3JrIG91dCB0aGUgaGFzaGVkIGdyYWRpZW50IGluZGljZXMgb2YgdGhlIHRocmVlIHNpbXBsZXggY29ybmVyc1xuICAgICAgICB2YXIgaWkgPSBpICYgMjU1O1xuICAgICAgICB2YXIgamogPSBqICYgMjU1O1xuICAgICAgICAvLyBDYWxjdWxhdGUgdGhlIGNvbnRyaWJ1dGlvbiBmcm9tIHRoZSB0aHJlZSBjb3JuZXJzXG4gICAgICAgIHZhciB0MCA9IDAuNSAtIHgwICogeDAgLSB5MCAqIHkwO1xuICAgICAgICBpZiAodDAgPCAwKSBuMCA9IDAuMDtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgZ2kwID0gcGVybU1vZDEyW2lpICsgcGVybVtqal1dICogMztcbiAgICAgICAgICAgIHQwICo9IHQwO1xuICAgICAgICAgICAgbjAgPSB0MCAqIHQwICogKGdyYWQzW2dpMF0gKiB4MCArIGdyYWQzW2dpMCArIDFdICogeTApOyAvLyAoeCx5KSBvZiBncmFkMyB1c2VkIGZvciAyRCBncmFkaWVudFxuICAgICAgICB9XG4gICAgICAgIHZhciB0MSA9IDAuNSAtIHgxICogeDEgLSB5MSAqIHkxO1xuICAgICAgICBpZiAodDEgPCAwKSBuMSA9IDAuMDtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgZ2kxID0gcGVybU1vZDEyW2lpICsgaTEgKyBwZXJtW2pqICsgajFdXSAqIDM7XG4gICAgICAgICAgICB0MSAqPSB0MTtcbiAgICAgICAgICAgIG4xID0gdDEgKiB0MSAqIChncmFkM1tnaTFdICogeDEgKyBncmFkM1tnaTEgKyAxXSAqIHkxKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdDIgPSAwLjUgLSB4MiAqIHgyIC0geTIgKiB5MjtcbiAgICAgICAgaWYgKHQyIDwgMCkgbjIgPSAwLjA7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGdpMiA9IHBlcm1Nb2QxMltpaSArIDEgKyBwZXJtW2pqICsgMV1dICogMztcbiAgICAgICAgICAgIHQyICo9IHQyO1xuICAgICAgICAgICAgbjIgPSB0MiAqIHQyICogKGdyYWQzW2dpMl0gKiB4MiArIGdyYWQzW2dpMiArIDFdICogeTIpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEFkZCBjb250cmlidXRpb25zIGZyb20gZWFjaCBjb3JuZXIgdG8gZ2V0IHRoZSBmaW5hbCBub2lzZSB2YWx1ZS5cbiAgICAgICAgLy8gVGhlIHJlc3VsdCBpcyBzY2FsZWQgdG8gcmV0dXJuIHZhbHVlcyBpbiB0aGUgaW50ZXJ2YWwgWy0xLDFdLlxuICAgICAgICByZXR1cm4gNzAuMCAqIChuMCArIG4xICsgbjIpO1xuICAgIH0sXG4gICAgLy8gM0Qgc2ltcGxleCBub2lzZVxuICAgIG5vaXNlM0Q6IGZ1bmN0aW9uICh4aW4sIHlpbiwgemluKSB7XG4gICAgICAgIHZhciBwZXJtTW9kMTIgPSB0aGlzLnBlcm1Nb2QxMixcbiAgICAgICAgICAgIHBlcm0gPSB0aGlzLnBlcm0sXG4gICAgICAgICAgICBncmFkMyA9IHRoaXMuZ3JhZDM7XG4gICAgICAgIHZhciBuMCwgbjEsIG4yLCBuMzsgLy8gTm9pc2UgY29udHJpYnV0aW9ucyBmcm9tIHRoZSBmb3VyIGNvcm5lcnNcbiAgICAgICAgLy8gU2tldyB0aGUgaW5wdXQgc3BhY2UgdG8gZGV0ZXJtaW5lIHdoaWNoIHNpbXBsZXggY2VsbCB3ZSdyZSBpblxuICAgICAgICB2YXIgcyA9ICh4aW4gKyB5aW4gKyB6aW4pICogRjM7IC8vIFZlcnkgbmljZSBhbmQgc2ltcGxlIHNrZXcgZmFjdG9yIGZvciAzRFxuICAgICAgICB2YXIgaSA9IE1hdGguZmxvb3IoeGluICsgcyk7XG4gICAgICAgIHZhciBqID0gTWF0aC5mbG9vcih5aW4gKyBzKTtcbiAgICAgICAgdmFyIGsgPSBNYXRoLmZsb29yKHppbiArIHMpO1xuICAgICAgICB2YXIgdCA9IChpICsgaiArIGspICogRzM7XG4gICAgICAgIHZhciBYMCA9IGkgLSB0OyAvLyBVbnNrZXcgdGhlIGNlbGwgb3JpZ2luIGJhY2sgdG8gKHgseSx6KSBzcGFjZVxuICAgICAgICB2YXIgWTAgPSBqIC0gdDtcbiAgICAgICAgdmFyIFowID0gayAtIHQ7XG4gICAgICAgIHZhciB4MCA9IHhpbiAtIFgwOyAvLyBUaGUgeCx5LHogZGlzdGFuY2VzIGZyb20gdGhlIGNlbGwgb3JpZ2luXG4gICAgICAgIHZhciB5MCA9IHlpbiAtIFkwO1xuICAgICAgICB2YXIgejAgPSB6aW4gLSBaMDtcbiAgICAgICAgLy8gRm9yIHRoZSAzRCBjYXNlLCB0aGUgc2ltcGxleCBzaGFwZSBpcyBhIHNsaWdodGx5IGlycmVndWxhciB0ZXRyYWhlZHJvbi5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIHdoaWNoIHNpbXBsZXggd2UgYXJlIGluLlxuICAgICAgICB2YXIgaTEsIGoxLCBrMTsgLy8gT2Zmc2V0cyBmb3Igc2Vjb25kIGNvcm5lciBvZiBzaW1wbGV4IGluIChpLGosaykgY29vcmRzXG4gICAgICAgIHZhciBpMiwgajIsIGsyOyAvLyBPZmZzZXRzIGZvciB0aGlyZCBjb3JuZXIgb2Ygc2ltcGxleCBpbiAoaSxqLGspIGNvb3Jkc1xuICAgICAgICBpZiAoeDAgPj0geTApIHtcbiAgICAgICAgICAgIGlmICh5MCA+PSB6MCkge1xuICAgICAgICAgICAgICAgIGkxID0gMTtcbiAgICAgICAgICAgICAgICBqMSA9IDA7XG4gICAgICAgICAgICAgICAgazEgPSAwO1xuICAgICAgICAgICAgICAgIGkyID0gMTtcbiAgICAgICAgICAgICAgICBqMiA9IDE7XG4gICAgICAgICAgICAgICAgazIgPSAwO1xuICAgICAgICAgICAgfSAvLyBYIFkgWiBvcmRlclxuICAgICAgICAgICAgZWxzZSBpZiAoeDAgPj0gejApIHtcbiAgICAgICAgICAgICAgICBpMSA9IDE7XG4gICAgICAgICAgICAgICAgajEgPSAwO1xuICAgICAgICAgICAgICAgIGsxID0gMDtcbiAgICAgICAgICAgICAgICBpMiA9IDE7XG4gICAgICAgICAgICAgICAgajIgPSAwO1xuICAgICAgICAgICAgICAgIGsyID0gMTtcbiAgICAgICAgICAgIH0gLy8gWCBaIFkgb3JkZXJcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGkxID0gMDtcbiAgICAgICAgICAgICAgICBqMSA9IDA7XG4gICAgICAgICAgICAgICAgazEgPSAxO1xuICAgICAgICAgICAgICAgIGkyID0gMTtcbiAgICAgICAgICAgICAgICBqMiA9IDA7XG4gICAgICAgICAgICAgICAgazIgPSAxO1xuICAgICAgICAgICAgfSAvLyBaIFggWSBvcmRlclxuICAgICAgICB9XG4gICAgICAgIGVsc2UgeyAvLyB4MDx5MFxuICAgICAgICAgICAgaWYgKHkwIDwgejApIHtcbiAgICAgICAgICAgICAgICBpMSA9IDA7XG4gICAgICAgICAgICAgICAgajEgPSAwO1xuICAgICAgICAgICAgICAgIGsxID0gMTtcbiAgICAgICAgICAgICAgICBpMiA9IDA7XG4gICAgICAgICAgICAgICAgajIgPSAxO1xuICAgICAgICAgICAgICAgIGsyID0gMTtcbiAgICAgICAgICAgIH0gLy8gWiBZIFggb3JkZXJcbiAgICAgICAgICAgIGVsc2UgaWYgKHgwIDwgejApIHtcbiAgICAgICAgICAgICAgICBpMSA9IDA7XG4gICAgICAgICAgICAgICAgajEgPSAxO1xuICAgICAgICAgICAgICAgIGsxID0gMDtcbiAgICAgICAgICAgICAgICBpMiA9IDA7XG4gICAgICAgICAgICAgICAgajIgPSAxO1xuICAgICAgICAgICAgICAgIGsyID0gMTtcbiAgICAgICAgICAgIH0gLy8gWSBaIFggb3JkZXJcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGkxID0gMDtcbiAgICAgICAgICAgICAgICBqMSA9IDE7XG4gICAgICAgICAgICAgICAgazEgPSAwO1xuICAgICAgICAgICAgICAgIGkyID0gMTtcbiAgICAgICAgICAgICAgICBqMiA9IDE7XG4gICAgICAgICAgICAgICAgazIgPSAwO1xuICAgICAgICAgICAgfSAvLyBZIFggWiBvcmRlclxuICAgICAgICB9XG4gICAgICAgIC8vIEEgc3RlcCBvZiAoMSwwLDApIGluIChpLGosaykgbWVhbnMgYSBzdGVwIG9mICgxLWMsLWMsLWMpIGluICh4LHkseiksXG4gICAgICAgIC8vIGEgc3RlcCBvZiAoMCwxLDApIGluIChpLGosaykgbWVhbnMgYSBzdGVwIG9mICgtYywxLWMsLWMpIGluICh4LHkseiksIGFuZFxuICAgICAgICAvLyBhIHN0ZXAgb2YgKDAsMCwxKSBpbiAoaSxqLGspIG1lYW5zIGEgc3RlcCBvZiAoLWMsLWMsMS1jKSBpbiAoeCx5LHopLCB3aGVyZVxuICAgICAgICAvLyBjID0gMS82LlxuICAgICAgICB2YXIgeDEgPSB4MCAtIGkxICsgRzM7IC8vIE9mZnNldHMgZm9yIHNlY29uZCBjb3JuZXIgaW4gKHgseSx6KSBjb29yZHNcbiAgICAgICAgdmFyIHkxID0geTAgLSBqMSArIEczO1xuICAgICAgICB2YXIgejEgPSB6MCAtIGsxICsgRzM7XG4gICAgICAgIHZhciB4MiA9IHgwIC0gaTIgKyAyLjAgKiBHMzsgLy8gT2Zmc2V0cyBmb3IgdGhpcmQgY29ybmVyIGluICh4LHkseikgY29vcmRzXG4gICAgICAgIHZhciB5MiA9IHkwIC0gajIgKyAyLjAgKiBHMztcbiAgICAgICAgdmFyIHoyID0gejAgLSBrMiArIDIuMCAqIEczO1xuICAgICAgICB2YXIgeDMgPSB4MCAtIDEuMCArIDMuMCAqIEczOyAvLyBPZmZzZXRzIGZvciBsYXN0IGNvcm5lciBpbiAoeCx5LHopIGNvb3Jkc1xuICAgICAgICB2YXIgeTMgPSB5MCAtIDEuMCArIDMuMCAqIEczO1xuICAgICAgICB2YXIgejMgPSB6MCAtIDEuMCArIDMuMCAqIEczO1xuICAgICAgICAvLyBXb3JrIG91dCB0aGUgaGFzaGVkIGdyYWRpZW50IGluZGljZXMgb2YgdGhlIGZvdXIgc2ltcGxleCBjb3JuZXJzXG4gICAgICAgIHZhciBpaSA9IGkgJiAyNTU7XG4gICAgICAgIHZhciBqaiA9IGogJiAyNTU7XG4gICAgICAgIHZhciBrayA9IGsgJiAyNTU7XG4gICAgICAgIC8vIENhbGN1bGF0ZSB0aGUgY29udHJpYnV0aW9uIGZyb20gdGhlIGZvdXIgY29ybmVyc1xuICAgICAgICB2YXIgdDAgPSAwLjYgLSB4MCAqIHgwIC0geTAgKiB5MCAtIHowICogejA7XG4gICAgICAgIGlmICh0MCA8IDApIG4wID0gMC4wO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBnaTAgPSBwZXJtTW9kMTJbaWkgKyBwZXJtW2pqICsgcGVybVtra11dXSAqIDM7XG4gICAgICAgICAgICB0MCAqPSB0MDtcbiAgICAgICAgICAgIG4wID0gdDAgKiB0MCAqIChncmFkM1tnaTBdICogeDAgKyBncmFkM1tnaTAgKyAxXSAqIHkwICsgZ3JhZDNbZ2kwICsgMl0gKiB6MCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHQxID0gMC42IC0geDEgKiB4MSAtIHkxICogeTEgLSB6MSAqIHoxO1xuICAgICAgICBpZiAodDEgPCAwKSBuMSA9IDAuMDtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgZ2kxID0gcGVybU1vZDEyW2lpICsgaTEgKyBwZXJtW2pqICsgajEgKyBwZXJtW2trICsgazFdXV0gKiAzO1xuICAgICAgICAgICAgdDEgKj0gdDE7XG4gICAgICAgICAgICBuMSA9IHQxICogdDEgKiAoZ3JhZDNbZ2kxXSAqIHgxICsgZ3JhZDNbZ2kxICsgMV0gKiB5MSArIGdyYWQzW2dpMSArIDJdICogejEpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0MiA9IDAuNiAtIHgyICogeDIgLSB5MiAqIHkyIC0gejIgKiB6MjtcbiAgICAgICAgaWYgKHQyIDwgMCkgbjIgPSAwLjA7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGdpMiA9IHBlcm1Nb2QxMltpaSArIGkyICsgcGVybVtqaiArIGoyICsgcGVybVtrayArIGsyXV1dICogMztcbiAgICAgICAgICAgIHQyICo9IHQyO1xuICAgICAgICAgICAgbjIgPSB0MiAqIHQyICogKGdyYWQzW2dpMl0gKiB4MiArIGdyYWQzW2dpMiArIDFdICogeTIgKyBncmFkM1tnaTIgKyAyXSAqIHoyKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdDMgPSAwLjYgLSB4MyAqIHgzIC0geTMgKiB5MyAtIHozICogejM7XG4gICAgICAgIGlmICh0MyA8IDApIG4zID0gMC4wO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBnaTMgPSBwZXJtTW9kMTJbaWkgKyAxICsgcGVybVtqaiArIDEgKyBwZXJtW2trICsgMV1dXSAqIDM7XG4gICAgICAgICAgICB0MyAqPSB0MztcbiAgICAgICAgICAgIG4zID0gdDMgKiB0MyAqIChncmFkM1tnaTNdICogeDMgKyBncmFkM1tnaTMgKyAxXSAqIHkzICsgZ3JhZDNbZ2kzICsgMl0gKiB6Myk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQWRkIGNvbnRyaWJ1dGlvbnMgZnJvbSBlYWNoIGNvcm5lciB0byBnZXQgdGhlIGZpbmFsIG5vaXNlIHZhbHVlLlxuICAgICAgICAvLyBUaGUgcmVzdWx0IGlzIHNjYWxlZCB0byBzdGF5IGp1c3QgaW5zaWRlIFstMSwxXVxuICAgICAgICByZXR1cm4gMzIuMCAqIChuMCArIG4xICsgbjIgKyBuMyk7XG4gICAgfSxcbiAgICAvLyA0RCBzaW1wbGV4IG5vaXNlLCBiZXR0ZXIgc2ltcGxleCByYW5rIG9yZGVyaW5nIG1ldGhvZCAyMDEyLTAzLTA5XG4gICAgbm9pc2U0RDogZnVuY3Rpb24gKHgsIHksIHosIHcpIHtcbiAgICAgICAgdmFyIHBlcm1Nb2QxMiA9IHRoaXMucGVybU1vZDEyLFxuICAgICAgICAgICAgcGVybSA9IHRoaXMucGVybSxcbiAgICAgICAgICAgIGdyYWQ0ID0gdGhpcy5ncmFkNDtcblxuICAgICAgICB2YXIgbjAsIG4xLCBuMiwgbjMsIG40OyAvLyBOb2lzZSBjb250cmlidXRpb25zIGZyb20gdGhlIGZpdmUgY29ybmVyc1xuICAgICAgICAvLyBTa2V3IHRoZSAoeCx5LHosdykgc3BhY2UgdG8gZGV0ZXJtaW5lIHdoaWNoIGNlbGwgb2YgMjQgc2ltcGxpY2VzIHdlJ3JlIGluXG4gICAgICAgIHZhciBzID0gKHggKyB5ICsgeiArIHcpICogRjQ7IC8vIEZhY3RvciBmb3IgNEQgc2tld2luZ1xuICAgICAgICB2YXIgaSA9IE1hdGguZmxvb3IoeCArIHMpO1xuICAgICAgICB2YXIgaiA9IE1hdGguZmxvb3IoeSArIHMpO1xuICAgICAgICB2YXIgayA9IE1hdGguZmxvb3IoeiArIHMpO1xuICAgICAgICB2YXIgbCA9IE1hdGguZmxvb3IodyArIHMpO1xuICAgICAgICB2YXIgdCA9IChpICsgaiArIGsgKyBsKSAqIEc0OyAvLyBGYWN0b3IgZm9yIDREIHVuc2tld2luZ1xuICAgICAgICB2YXIgWDAgPSBpIC0gdDsgLy8gVW5za2V3IHRoZSBjZWxsIG9yaWdpbiBiYWNrIHRvICh4LHkseix3KSBzcGFjZVxuICAgICAgICB2YXIgWTAgPSBqIC0gdDtcbiAgICAgICAgdmFyIFowID0gayAtIHQ7XG4gICAgICAgIHZhciBXMCA9IGwgLSB0O1xuICAgICAgICB2YXIgeDAgPSB4IC0gWDA7IC8vIFRoZSB4LHkseix3IGRpc3RhbmNlcyBmcm9tIHRoZSBjZWxsIG9yaWdpblxuICAgICAgICB2YXIgeTAgPSB5IC0gWTA7XG4gICAgICAgIHZhciB6MCA9IHogLSBaMDtcbiAgICAgICAgdmFyIHcwID0gdyAtIFcwO1xuICAgICAgICAvLyBGb3IgdGhlIDREIGNhc2UsIHRoZSBzaW1wbGV4IGlzIGEgNEQgc2hhcGUgSSB3b24ndCBldmVuIHRyeSB0byBkZXNjcmliZS5cbiAgICAgICAgLy8gVG8gZmluZCBvdXQgd2hpY2ggb2YgdGhlIDI0IHBvc3NpYmxlIHNpbXBsaWNlcyB3ZSdyZSBpbiwgd2UgbmVlZCB0b1xuICAgICAgICAvLyBkZXRlcm1pbmUgdGhlIG1hZ25pdHVkZSBvcmRlcmluZyBvZiB4MCwgeTAsIHowIGFuZCB3MC5cbiAgICAgICAgLy8gU2l4IHBhaXItd2lzZSBjb21wYXJpc29ucyBhcmUgcGVyZm9ybWVkIGJldHdlZW4gZWFjaCBwb3NzaWJsZSBwYWlyXG4gICAgICAgIC8vIG9mIHRoZSBmb3VyIGNvb3JkaW5hdGVzLCBhbmQgdGhlIHJlc3VsdHMgYXJlIHVzZWQgdG8gcmFuayB0aGUgbnVtYmVycy5cbiAgICAgICAgdmFyIHJhbmt4ID0gMDtcbiAgICAgICAgdmFyIHJhbmt5ID0gMDtcbiAgICAgICAgdmFyIHJhbmt6ID0gMDtcbiAgICAgICAgdmFyIHJhbmt3ID0gMDtcbiAgICAgICAgaWYgKHgwID4geTApIHJhbmt4Kys7XG4gICAgICAgIGVsc2UgcmFua3krKztcbiAgICAgICAgaWYgKHgwID4gejApIHJhbmt4Kys7XG4gICAgICAgIGVsc2UgcmFua3orKztcbiAgICAgICAgaWYgKHgwID4gdzApIHJhbmt4Kys7XG4gICAgICAgIGVsc2UgcmFua3crKztcbiAgICAgICAgaWYgKHkwID4gejApIHJhbmt5Kys7XG4gICAgICAgIGVsc2UgcmFua3orKztcbiAgICAgICAgaWYgKHkwID4gdzApIHJhbmt5Kys7XG4gICAgICAgIGVsc2UgcmFua3crKztcbiAgICAgICAgaWYgKHowID4gdzApIHJhbmt6Kys7XG4gICAgICAgIGVsc2UgcmFua3crKztcbiAgICAgICAgdmFyIGkxLCBqMSwgazEsIGwxOyAvLyBUaGUgaW50ZWdlciBvZmZzZXRzIGZvciB0aGUgc2Vjb25kIHNpbXBsZXggY29ybmVyXG4gICAgICAgIHZhciBpMiwgajIsIGsyLCBsMjsgLy8gVGhlIGludGVnZXIgb2Zmc2V0cyBmb3IgdGhlIHRoaXJkIHNpbXBsZXggY29ybmVyXG4gICAgICAgIHZhciBpMywgajMsIGszLCBsMzsgLy8gVGhlIGludGVnZXIgb2Zmc2V0cyBmb3IgdGhlIGZvdXJ0aCBzaW1wbGV4IGNvcm5lclxuICAgICAgICAvLyBzaW1wbGV4W2NdIGlzIGEgNC12ZWN0b3Igd2l0aCB0aGUgbnVtYmVycyAwLCAxLCAyIGFuZCAzIGluIHNvbWUgb3JkZXIuXG4gICAgICAgIC8vIE1hbnkgdmFsdWVzIG9mIGMgd2lsbCBuZXZlciBvY2N1ciwgc2luY2UgZS5nLiB4Pnk+ej53IG1ha2VzIHg8eiwgeTx3IGFuZCB4PHdcbiAgICAgICAgLy8gaW1wb3NzaWJsZS4gT25seSB0aGUgMjQgaW5kaWNlcyB3aGljaCBoYXZlIG5vbi16ZXJvIGVudHJpZXMgbWFrZSBhbnkgc2Vuc2UuXG4gICAgICAgIC8vIFdlIHVzZSBhIHRocmVzaG9sZGluZyB0byBzZXQgdGhlIGNvb3JkaW5hdGVzIGluIHR1cm4gZnJvbSB0aGUgbGFyZ2VzdCBtYWduaXR1ZGUuXG4gICAgICAgIC8vIFJhbmsgMyBkZW5vdGVzIHRoZSBsYXJnZXN0IGNvb3JkaW5hdGUuXG4gICAgICAgIGkxID0gcmFua3ggPj0gMyA/IDEgOiAwO1xuICAgICAgICBqMSA9IHJhbmt5ID49IDMgPyAxIDogMDtcbiAgICAgICAgazEgPSByYW5reiA+PSAzID8gMSA6IDA7XG4gICAgICAgIGwxID0gcmFua3cgPj0gMyA/IDEgOiAwO1xuICAgICAgICAvLyBSYW5rIDIgZGVub3RlcyB0aGUgc2Vjb25kIGxhcmdlc3QgY29vcmRpbmF0ZS5cbiAgICAgICAgaTIgPSByYW5reCA+PSAyID8gMSA6IDA7XG4gICAgICAgIGoyID0gcmFua3kgPj0gMiA/IDEgOiAwO1xuICAgICAgICBrMiA9IHJhbmt6ID49IDIgPyAxIDogMDtcbiAgICAgICAgbDIgPSByYW5rdyA+PSAyID8gMSA6IDA7XG4gICAgICAgIC8vIFJhbmsgMSBkZW5vdGVzIHRoZSBzZWNvbmQgc21hbGxlc3QgY29vcmRpbmF0ZS5cbiAgICAgICAgaTMgPSByYW5reCA+PSAxID8gMSA6IDA7XG4gICAgICAgIGozID0gcmFua3kgPj0gMSA/IDEgOiAwO1xuICAgICAgICBrMyA9IHJhbmt6ID49IDEgPyAxIDogMDtcbiAgICAgICAgbDMgPSByYW5rdyA+PSAxID8gMSA6IDA7XG4gICAgICAgIC8vIFRoZSBmaWZ0aCBjb3JuZXIgaGFzIGFsbCBjb29yZGluYXRlIG9mZnNldHMgPSAxLCBzbyBubyBuZWVkIHRvIGNvbXB1dGUgdGhhdC5cbiAgICAgICAgdmFyIHgxID0geDAgLSBpMSArIEc0OyAvLyBPZmZzZXRzIGZvciBzZWNvbmQgY29ybmVyIGluICh4LHkseix3KSBjb29yZHNcbiAgICAgICAgdmFyIHkxID0geTAgLSBqMSArIEc0O1xuICAgICAgICB2YXIgejEgPSB6MCAtIGsxICsgRzQ7XG4gICAgICAgIHZhciB3MSA9IHcwIC0gbDEgKyBHNDtcbiAgICAgICAgdmFyIHgyID0geDAgLSBpMiArIDIuMCAqIEc0OyAvLyBPZmZzZXRzIGZvciB0aGlyZCBjb3JuZXIgaW4gKHgseSx6LHcpIGNvb3Jkc1xuICAgICAgICB2YXIgeTIgPSB5MCAtIGoyICsgMi4wICogRzQ7XG4gICAgICAgIHZhciB6MiA9IHowIC0gazIgKyAyLjAgKiBHNDtcbiAgICAgICAgdmFyIHcyID0gdzAgLSBsMiArIDIuMCAqIEc0O1xuICAgICAgICB2YXIgeDMgPSB4MCAtIGkzICsgMy4wICogRzQ7IC8vIE9mZnNldHMgZm9yIGZvdXJ0aCBjb3JuZXIgaW4gKHgseSx6LHcpIGNvb3Jkc1xuICAgICAgICB2YXIgeTMgPSB5MCAtIGozICsgMy4wICogRzQ7XG4gICAgICAgIHZhciB6MyA9IHowIC0gazMgKyAzLjAgKiBHNDtcbiAgICAgICAgdmFyIHczID0gdzAgLSBsMyArIDMuMCAqIEc0O1xuICAgICAgICB2YXIgeDQgPSB4MCAtIDEuMCArIDQuMCAqIEc0OyAvLyBPZmZzZXRzIGZvciBsYXN0IGNvcm5lciBpbiAoeCx5LHosdykgY29vcmRzXG4gICAgICAgIHZhciB5NCA9IHkwIC0gMS4wICsgNC4wICogRzQ7XG4gICAgICAgIHZhciB6NCA9IHowIC0gMS4wICsgNC4wICogRzQ7XG4gICAgICAgIHZhciB3NCA9IHcwIC0gMS4wICsgNC4wICogRzQ7XG4gICAgICAgIC8vIFdvcmsgb3V0IHRoZSBoYXNoZWQgZ3JhZGllbnQgaW5kaWNlcyBvZiB0aGUgZml2ZSBzaW1wbGV4IGNvcm5lcnNcbiAgICAgICAgdmFyIGlpID0gaSAmIDI1NTtcbiAgICAgICAgdmFyIGpqID0gaiAmIDI1NTtcbiAgICAgICAgdmFyIGtrID0gayAmIDI1NTtcbiAgICAgICAgdmFyIGxsID0gbCAmIDI1NTtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRoZSBjb250cmlidXRpb24gZnJvbSB0aGUgZml2ZSBjb3JuZXJzXG4gICAgICAgIHZhciB0MCA9IDAuNiAtIHgwICogeDAgLSB5MCAqIHkwIC0gejAgKiB6MCAtIHcwICogdzA7XG4gICAgICAgIGlmICh0MCA8IDApIG4wID0gMC4wO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBnaTAgPSAocGVybVtpaSArIHBlcm1bamogKyBwZXJtW2trICsgcGVybVtsbF1dXV0gJSAzMikgKiA0O1xuICAgICAgICAgICAgdDAgKj0gdDA7XG4gICAgICAgICAgICBuMCA9IHQwICogdDAgKiAoZ3JhZDRbZ2kwXSAqIHgwICsgZ3JhZDRbZ2kwICsgMV0gKiB5MCArIGdyYWQ0W2dpMCArIDJdICogejAgKyBncmFkNFtnaTAgKyAzXSAqIHcwKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdDEgPSAwLjYgLSB4MSAqIHgxIC0geTEgKiB5MSAtIHoxICogejEgLSB3MSAqIHcxO1xuICAgICAgICBpZiAodDEgPCAwKSBuMSA9IDAuMDtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgZ2kxID0gKHBlcm1baWkgKyBpMSArIHBlcm1bamogKyBqMSArIHBlcm1ba2sgKyBrMSArIHBlcm1bbGwgKyBsMV1dXV0gJSAzMikgKiA0O1xuICAgICAgICAgICAgdDEgKj0gdDE7XG4gICAgICAgICAgICBuMSA9IHQxICogdDEgKiAoZ3JhZDRbZ2kxXSAqIHgxICsgZ3JhZDRbZ2kxICsgMV0gKiB5MSArIGdyYWQ0W2dpMSArIDJdICogejEgKyBncmFkNFtnaTEgKyAzXSAqIHcxKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdDIgPSAwLjYgLSB4MiAqIHgyIC0geTIgKiB5MiAtIHoyICogejIgLSB3MiAqIHcyO1xuICAgICAgICBpZiAodDIgPCAwKSBuMiA9IDAuMDtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgZ2kyID0gKHBlcm1baWkgKyBpMiArIHBlcm1bamogKyBqMiArIHBlcm1ba2sgKyBrMiArIHBlcm1bbGwgKyBsMl1dXV0gJSAzMikgKiA0O1xuICAgICAgICAgICAgdDIgKj0gdDI7XG4gICAgICAgICAgICBuMiA9IHQyICogdDIgKiAoZ3JhZDRbZ2kyXSAqIHgyICsgZ3JhZDRbZ2kyICsgMV0gKiB5MiArIGdyYWQ0W2dpMiArIDJdICogejIgKyBncmFkNFtnaTIgKyAzXSAqIHcyKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdDMgPSAwLjYgLSB4MyAqIHgzIC0geTMgKiB5MyAtIHozICogejMgLSB3MyAqIHczO1xuICAgICAgICBpZiAodDMgPCAwKSBuMyA9IDAuMDtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgZ2kzID0gKHBlcm1baWkgKyBpMyArIHBlcm1bamogKyBqMyArIHBlcm1ba2sgKyBrMyArIHBlcm1bbGwgKyBsM11dXV0gJSAzMikgKiA0O1xuICAgICAgICAgICAgdDMgKj0gdDM7XG4gICAgICAgICAgICBuMyA9IHQzICogdDMgKiAoZ3JhZDRbZ2kzXSAqIHgzICsgZ3JhZDRbZ2kzICsgMV0gKiB5MyArIGdyYWQ0W2dpMyArIDJdICogejMgKyBncmFkNFtnaTMgKyAzXSAqIHczKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdDQgPSAwLjYgLSB4NCAqIHg0IC0geTQgKiB5NCAtIHo0ICogejQgLSB3NCAqIHc0O1xuICAgICAgICBpZiAodDQgPCAwKSBuNCA9IDAuMDtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgZ2k0ID0gKHBlcm1baWkgKyAxICsgcGVybVtqaiArIDEgKyBwZXJtW2trICsgMSArIHBlcm1bbGwgKyAxXV1dXSAlIDMyKSAqIDQ7XG4gICAgICAgICAgICB0NCAqPSB0NDtcbiAgICAgICAgICAgIG40ID0gdDQgKiB0NCAqIChncmFkNFtnaTRdICogeDQgKyBncmFkNFtnaTQgKyAxXSAqIHk0ICsgZ3JhZDRbZ2k0ICsgMl0gKiB6NCArIGdyYWQ0W2dpNCArIDNdICogdzQpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFN1bSB1cCBhbmQgc2NhbGUgdGhlIHJlc3VsdCB0byBjb3ZlciB0aGUgcmFuZ2UgWy0xLDFdXG4gICAgICAgIHJldHVybiAyNy4wICogKG4wICsgbjEgKyBuMiArIG4zICsgbjQpO1xuICAgIH1cblxuXG59O1xuXG4vLyBhbWRcbmlmICh0eXBlb2YgZGVmaW5lICE9PSAndW5kZWZpbmVkJyAmJiBkZWZpbmUuYW1kKSBkZWZpbmUoZnVuY3Rpb24oKXtyZXR1cm4gU2ltcGxleE5vaXNlO30pO1xuLy8gYnJvd3NlclxuZWxzZSBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHdpbmRvdy5TaW1wbGV4Tm9pc2UgPSBTaW1wbGV4Tm9pc2U7XG4vL2NvbW1vbiBqc1xuaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykgZXhwb3J0cy5TaW1wbGV4Tm9pc2UgPSBTaW1wbGV4Tm9pc2U7XG4vLyBub2RlanNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gU2ltcGxleE5vaXNlO1xufVxuXG59KSgpO1xuIiwidmFyIEFSUkFZX1RZUEUgPSB0eXBlb2YgRmxvYXQzMkFycmF5ICE9PSBcInVuZGVmaW5lZFwiID8gRmxvYXQzMkFycmF5IDogQXJyYXk7XG5cbmZ1bmN0aW9uIE1hdHJpeDMobSkge1xuICAgIHRoaXMudmFsID0gbmV3IEFSUkFZX1RZUEUoOSk7XG5cbiAgICBpZiAobSkgeyAvL2Fzc3VtZSBNYXRyaXgzIHdpdGggdmFsXG4gICAgICAgIHRoaXMuY29weShtKTtcbiAgICB9IGVsc2UgeyAvL2RlZmF1bHQgdG8gaWRlbnRpdHlcbiAgICAgICAgdGhpcy5pZHQoKTtcbiAgICB9XG59XG5cbnZhciBtYXQzID0gTWF0cml4My5wcm90b3R5cGU7XG5cbm1hdDMuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IE1hdHJpeDModGhpcyk7XG59O1xuXG5tYXQzLnNldCA9IGZ1bmN0aW9uKG90aGVyTWF0KSB7XG4gICAgcmV0dXJuIHRoaXMuY29weShvdGhlck1hdCk7XG59O1xuXG5tYXQzLmNvcHkgPSBmdW5jdGlvbihvdGhlck1hdCkge1xuICAgIHZhciBvdXQgPSB0aGlzLnZhbCxcbiAgICAgICAgYSA9IG90aGVyTWF0LnZhbDsgXG4gICAgb3V0WzBdID0gYVswXTtcbiAgICBvdXRbMV0gPSBhWzFdO1xuICAgIG91dFsyXSA9IGFbMl07XG4gICAgb3V0WzNdID0gYVszXTtcbiAgICBvdXRbNF0gPSBhWzRdO1xuICAgIG91dFs1XSA9IGFbNV07XG4gICAgb3V0WzZdID0gYVs2XTtcbiAgICBvdXRbN10gPSBhWzddO1xuICAgIG91dFs4XSA9IGFbOF07XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQzLmZyb21NYXQ0ID0gZnVuY3Rpb24obSkge1xuICAgIHZhciBhID0gbS52YWwsXG4gICAgICAgIG91dCA9IHRoaXMudmFsO1xuICAgIG91dFswXSA9IGFbMF07XG4gICAgb3V0WzFdID0gYVsxXTtcbiAgICBvdXRbMl0gPSBhWzJdO1xuICAgIG91dFszXSA9IGFbNF07XG4gICAgb3V0WzRdID0gYVs1XTtcbiAgICBvdXRbNV0gPSBhWzZdO1xuICAgIG91dFs2XSA9IGFbOF07XG4gICAgb3V0WzddID0gYVs5XTtcbiAgICBvdXRbOF0gPSBhWzEwXTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDMuZnJvbUFycmF5ID0gZnVuY3Rpb24oYSkge1xuICAgIHZhciBvdXQgPSB0aGlzLnZhbDtcbiAgICBvdXRbMF0gPSBhWzBdO1xuICAgIG91dFsxXSA9IGFbMV07XG4gICAgb3V0WzJdID0gYVsyXTtcbiAgICBvdXRbM10gPSBhWzNdO1xuICAgIG91dFs0XSA9IGFbNF07XG4gICAgb3V0WzVdID0gYVs1XTtcbiAgICBvdXRbNl0gPSBhWzZdO1xuICAgIG91dFs3XSA9IGFbN107XG4gICAgb3V0WzhdID0gYVs4XTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDMuaWRlbnRpdHkgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgb3V0ID0gdGhpcy52YWw7XG4gICAgb3V0WzBdID0gMTtcbiAgICBvdXRbMV0gPSAwO1xuICAgIG91dFsyXSA9IDA7XG4gICAgb3V0WzNdID0gMDtcbiAgICBvdXRbNF0gPSAxO1xuICAgIG91dFs1XSA9IDA7XG4gICAgb3V0WzZdID0gMDtcbiAgICBvdXRbN10gPSAwO1xuICAgIG91dFs4XSA9IDE7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQzLnRyYW5zcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhID0gdGhpcy52YWwsXG4gICAgICAgIGEwMSA9IGFbMV0sIFxuICAgICAgICBhMDIgPSBhWzJdLCBcbiAgICAgICAgYTEyID0gYVs1XTtcbiAgICBhWzFdID0gYVszXTtcbiAgICBhWzJdID0gYVs2XTtcbiAgICBhWzNdID0gYTAxO1xuICAgIGFbNV0gPSBhWzddO1xuICAgIGFbNl0gPSBhMDI7XG4gICAgYVs3XSA9IGExMjtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDMuaW52ZXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGEgPSB0aGlzLnZhbCxcbiAgICAgICAgYTAwID0gYVswXSwgYTAxID0gYVsxXSwgYTAyID0gYVsyXSxcbiAgICAgICAgYTEwID0gYVszXSwgYTExID0gYVs0XSwgYTEyID0gYVs1XSxcbiAgICAgICAgYTIwID0gYVs2XSwgYTIxID0gYVs3XSwgYTIyID0gYVs4XSxcblxuICAgICAgICBiMDEgPSBhMjIgKiBhMTEgLSBhMTIgKiBhMjEsXG4gICAgICAgIGIxMSA9IC1hMjIgKiBhMTAgKyBhMTIgKiBhMjAsXG4gICAgICAgIGIyMSA9IGEyMSAqIGExMCAtIGExMSAqIGEyMCxcblxuICAgICAgICAvLyBDYWxjdWxhdGUgdGhlIGRldGVybWluYW50XG4gICAgICAgIGRldCA9IGEwMCAqIGIwMSArIGEwMSAqIGIxMSArIGEwMiAqIGIyMTtcblxuICAgIGlmICghZGV0KSB7IFxuICAgICAgICByZXR1cm4gbnVsbDsgXG4gICAgfVxuICAgIGRldCA9IDEuMCAvIGRldDtcblxuICAgIGFbMF0gPSBiMDEgKiBkZXQ7XG4gICAgYVsxXSA9ICgtYTIyICogYTAxICsgYTAyICogYTIxKSAqIGRldDtcbiAgICBhWzJdID0gKGExMiAqIGEwMSAtIGEwMiAqIGExMSkgKiBkZXQ7XG4gICAgYVszXSA9IGIxMSAqIGRldDtcbiAgICBhWzRdID0gKGEyMiAqIGEwMCAtIGEwMiAqIGEyMCkgKiBkZXQ7XG4gICAgYVs1XSA9ICgtYTEyICogYTAwICsgYTAyICogYTEwKSAqIGRldDtcbiAgICBhWzZdID0gYjIxICogZGV0O1xuICAgIGFbN10gPSAoLWEyMSAqIGEwMCArIGEwMSAqIGEyMCkgKiBkZXQ7XG4gICAgYVs4XSA9IChhMTEgKiBhMDAgLSBhMDEgKiBhMTApICogZGV0O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0My5hZGpvaW50ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGEgPSB0aGlzLnZhbCxcbiAgICAgICAgYTAwID0gYVswXSwgYTAxID0gYVsxXSwgYTAyID0gYVsyXSxcbiAgICAgICAgYTEwID0gYVszXSwgYTExID0gYVs0XSwgYTEyID0gYVs1XSxcbiAgICAgICAgYTIwID0gYVs2XSwgYTIxID0gYVs3XSwgYTIyID0gYVs4XTtcblxuICAgIGFbMF0gPSAoYTExICogYTIyIC0gYTEyICogYTIxKTtcbiAgICBhWzFdID0gKGEwMiAqIGEyMSAtIGEwMSAqIGEyMik7XG4gICAgYVsyXSA9IChhMDEgKiBhMTIgLSBhMDIgKiBhMTEpO1xuICAgIGFbM10gPSAoYTEyICogYTIwIC0gYTEwICogYTIyKTtcbiAgICBhWzRdID0gKGEwMCAqIGEyMiAtIGEwMiAqIGEyMCk7XG4gICAgYVs1XSA9IChhMDIgKiBhMTAgLSBhMDAgKiBhMTIpO1xuICAgIGFbNl0gPSAoYTEwICogYTIxIC0gYTExICogYTIwKTtcbiAgICBhWzddID0gKGEwMSAqIGEyMCAtIGEwMCAqIGEyMSk7XG4gICAgYVs4XSA9IChhMDAgKiBhMTEgLSBhMDEgKiBhMTApO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0My5kZXRlcm1pbmFudCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhID0gdGhpcy52YWwsXG4gICAgICAgIGEwMCA9IGFbMF0sIGEwMSA9IGFbMV0sIGEwMiA9IGFbMl0sXG4gICAgICAgIGExMCA9IGFbM10sIGExMSA9IGFbNF0sIGExMiA9IGFbNV0sXG4gICAgICAgIGEyMCA9IGFbNl0sIGEyMSA9IGFbN10sIGEyMiA9IGFbOF07XG5cbiAgICByZXR1cm4gYTAwICogKGEyMiAqIGExMSAtIGExMiAqIGEyMSkgKyBhMDEgKiAoLWEyMiAqIGExMCArIGExMiAqIGEyMCkgKyBhMDIgKiAoYTIxICogYTEwIC0gYTExICogYTIwKTtcbn07XG5cbm1hdDMubXVsdGlwbHkgPSBmdW5jdGlvbihvdGhlck1hdCkge1xuICAgIHZhciBhID0gdGhpcy52YWwsXG4gICAgICAgIGIgPSBvdGhlck1hdC52YWwsXG4gICAgICAgIGEwMCA9IGFbMF0sIGEwMSA9IGFbMV0sIGEwMiA9IGFbMl0sXG4gICAgICAgIGExMCA9IGFbM10sIGExMSA9IGFbNF0sIGExMiA9IGFbNV0sXG4gICAgICAgIGEyMCA9IGFbNl0sIGEyMSA9IGFbN10sIGEyMiA9IGFbOF0sXG5cbiAgICAgICAgYjAwID0gYlswXSwgYjAxID0gYlsxXSwgYjAyID0gYlsyXSxcbiAgICAgICAgYjEwID0gYlszXSwgYjExID0gYls0XSwgYjEyID0gYls1XSxcbiAgICAgICAgYjIwID0gYls2XSwgYjIxID0gYls3XSwgYjIyID0gYls4XTtcblxuICAgIGFbMF0gPSBiMDAgKiBhMDAgKyBiMDEgKiBhMTAgKyBiMDIgKiBhMjA7XG4gICAgYVsxXSA9IGIwMCAqIGEwMSArIGIwMSAqIGExMSArIGIwMiAqIGEyMTtcbiAgICBhWzJdID0gYjAwICogYTAyICsgYjAxICogYTEyICsgYjAyICogYTIyO1xuXG4gICAgYVszXSA9IGIxMCAqIGEwMCArIGIxMSAqIGExMCArIGIxMiAqIGEyMDtcbiAgICBhWzRdID0gYjEwICogYTAxICsgYjExICogYTExICsgYjEyICogYTIxO1xuICAgIGFbNV0gPSBiMTAgKiBhMDIgKyBiMTEgKiBhMTIgKyBiMTIgKiBhMjI7XG5cbiAgICBhWzZdID0gYjIwICogYTAwICsgYjIxICogYTEwICsgYjIyICogYTIwO1xuICAgIGFbN10gPSBiMjAgKiBhMDEgKyBiMjEgKiBhMTEgKyBiMjIgKiBhMjE7XG4gICAgYVs4XSA9IGIyMCAqIGEwMiArIGIyMSAqIGExMiArIGIyMiAqIGEyMjtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDMudHJhbnNsYXRlID0gZnVuY3Rpb24odikge1xuICAgIHZhciBhID0gdGhpcy52YWwsXG4gICAgICAgIHggPSB2LngsIHkgPSB2Lnk7XG4gICAgYVs2XSA9IHggKiBhWzBdICsgeSAqIGFbM10gKyBhWzZdO1xuICAgIGFbN10gPSB4ICogYVsxXSArIHkgKiBhWzRdICsgYVs3XTtcbiAgICBhWzhdID0geCAqIGFbMl0gKyB5ICogYVs1XSArIGFbOF07XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQzLnJvdGF0ZSA9IGZ1bmN0aW9uKHJhZCkge1xuICAgIHZhciBhID0gdGhpcy52YWwsXG4gICAgICAgIGEwMCA9IGFbMF0sIGEwMSA9IGFbMV0sIGEwMiA9IGFbMl0sXG4gICAgICAgIGExMCA9IGFbM10sIGExMSA9IGFbNF0sIGExMiA9IGFbNV0sXG5cbiAgICAgICAgcyA9IE1hdGguc2luKHJhZCksXG4gICAgICAgIGMgPSBNYXRoLmNvcyhyYWQpO1xuXG4gICAgYVswXSA9IGMgKiBhMDAgKyBzICogYTEwO1xuICAgIGFbMV0gPSBjICogYTAxICsgcyAqIGExMTtcbiAgICBhWzJdID0gYyAqIGEwMiArIHMgKiBhMTI7XG5cbiAgICBhWzNdID0gYyAqIGExMCAtIHMgKiBhMDA7XG4gICAgYVs0XSA9IGMgKiBhMTEgLSBzICogYTAxO1xuICAgIGFbNV0gPSBjICogYTEyIC0gcyAqIGEwMjtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDMuc2NhbGUgPSBmdW5jdGlvbih2KSB7XG4gICAgdmFyIGEgPSB0aGlzLnZhbCxcbiAgICAgICAgeCA9IHYueCwgXG4gICAgICAgIHkgPSB2Lnk7XG5cbiAgICBhWzBdID0geCAqIGFbMF07XG4gICAgYVsxXSA9IHggKiBhWzFdO1xuICAgIGFbMl0gPSB4ICogYVsyXTtcblxuICAgIGFbM10gPSB5ICogYVszXTtcbiAgICBhWzRdID0geSAqIGFbNF07XG4gICAgYVs1XSA9IHkgKiBhWzVdO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0My5mcm9tUXVhdCA9IGZ1bmN0aW9uKHEpIHtcbiAgICB2YXIgeCA9IHEueCwgeSA9IHEueSwgeiA9IHEueiwgdyA9IHEudyxcbiAgICAgICAgeDIgPSB4ICsgeCxcbiAgICAgICAgeTIgPSB5ICsgeSxcbiAgICAgICAgejIgPSB6ICsgeixcblxuICAgICAgICB4eCA9IHggKiB4MixcbiAgICAgICAgeHkgPSB4ICogeTIsXG4gICAgICAgIHh6ID0geCAqIHoyLFxuICAgICAgICB5eSA9IHkgKiB5MixcbiAgICAgICAgeXogPSB5ICogejIsXG4gICAgICAgIHp6ID0geiAqIHoyLFxuICAgICAgICB3eCA9IHcgKiB4MixcbiAgICAgICAgd3kgPSB3ICogeTIsXG4gICAgICAgIHd6ID0gdyAqIHoyLFxuXG4gICAgICAgIG91dCA9IHRoaXMudmFsO1xuXG4gICAgb3V0WzBdID0gMSAtICh5eSArIHp6KTtcbiAgICBvdXRbM10gPSB4eSArIHd6O1xuICAgIG91dFs2XSA9IHh6IC0gd3k7XG5cbiAgICBvdXRbMV0gPSB4eSAtIHd6O1xuICAgIG91dFs0XSA9IDEgLSAoeHggKyB6eik7XG4gICAgb3V0WzddID0geXogKyB3eDtcblxuICAgIG91dFsyXSA9IHh6ICsgd3k7XG4gICAgb3V0WzVdID0geXogLSB3eDtcbiAgICBvdXRbOF0gPSAxIC0gKHh4ICsgeXkpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0My5ub3JtYWxGcm9tTWF0NCA9IGZ1bmN0aW9uKG0pIHtcbiAgICB2YXIgYSA9IG0udmFsLFxuICAgICAgICBvdXQgPSB0aGlzLnZhbCxcblxuICAgICAgICBhMDAgPSBhWzBdLCBhMDEgPSBhWzFdLCBhMDIgPSBhWzJdLCBhMDMgPSBhWzNdLFxuICAgICAgICBhMTAgPSBhWzRdLCBhMTEgPSBhWzVdLCBhMTIgPSBhWzZdLCBhMTMgPSBhWzddLFxuICAgICAgICBhMjAgPSBhWzhdLCBhMjEgPSBhWzldLCBhMjIgPSBhWzEwXSwgYTIzID0gYVsxMV0sXG4gICAgICAgIGEzMCA9IGFbMTJdLCBhMzEgPSBhWzEzXSwgYTMyID0gYVsxNF0sIGEzMyA9IGFbMTVdLFxuXG4gICAgICAgIGIwMCA9IGEwMCAqIGExMSAtIGEwMSAqIGExMCxcbiAgICAgICAgYjAxID0gYTAwICogYTEyIC0gYTAyICogYTEwLFxuICAgICAgICBiMDIgPSBhMDAgKiBhMTMgLSBhMDMgKiBhMTAsXG4gICAgICAgIGIwMyA9IGEwMSAqIGExMiAtIGEwMiAqIGExMSxcbiAgICAgICAgYjA0ID0gYTAxICogYTEzIC0gYTAzICogYTExLFxuICAgICAgICBiMDUgPSBhMDIgKiBhMTMgLSBhMDMgKiBhMTIsXG4gICAgICAgIGIwNiA9IGEyMCAqIGEzMSAtIGEyMSAqIGEzMCxcbiAgICAgICAgYjA3ID0gYTIwICogYTMyIC0gYTIyICogYTMwLFxuICAgICAgICBiMDggPSBhMjAgKiBhMzMgLSBhMjMgKiBhMzAsXG4gICAgICAgIGIwOSA9IGEyMSAqIGEzMiAtIGEyMiAqIGEzMSxcbiAgICAgICAgYjEwID0gYTIxICogYTMzIC0gYTIzICogYTMxLFxuICAgICAgICBiMTEgPSBhMjIgKiBhMzMgLSBhMjMgKiBhMzIsXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRoZSBkZXRlcm1pbmFudFxuICAgICAgICBkZXQgPSBiMDAgKiBiMTEgLSBiMDEgKiBiMTAgKyBiMDIgKiBiMDkgKyBiMDMgKiBiMDggLSBiMDQgKiBiMDcgKyBiMDUgKiBiMDY7XG5cbiAgICBpZiAoIWRldCkgeyBcbiAgICAgICAgcmV0dXJuIG51bGw7IFxuICAgIH1cbiAgICBkZXQgPSAxLjAgLyBkZXQ7XG5cbiAgICBvdXRbMF0gPSAoYTExICogYjExIC0gYTEyICogYjEwICsgYTEzICogYjA5KSAqIGRldDtcbiAgICBvdXRbMV0gPSAoYTEyICogYjA4IC0gYTEwICogYjExIC0gYTEzICogYjA3KSAqIGRldDtcbiAgICBvdXRbMl0gPSAoYTEwICogYjEwIC0gYTExICogYjA4ICsgYTEzICogYjA2KSAqIGRldDtcblxuICAgIG91dFszXSA9IChhMDIgKiBiMTAgLSBhMDEgKiBiMTEgLSBhMDMgKiBiMDkpICogZGV0O1xuICAgIG91dFs0XSA9IChhMDAgKiBiMTEgLSBhMDIgKiBiMDggKyBhMDMgKiBiMDcpICogZGV0O1xuICAgIG91dFs1XSA9IChhMDEgKiBiMDggLSBhMDAgKiBiMTAgLSBhMDMgKiBiMDYpICogZGV0O1xuXG4gICAgb3V0WzZdID0gKGEzMSAqIGIwNSAtIGEzMiAqIGIwNCArIGEzMyAqIGIwMykgKiBkZXQ7XG4gICAgb3V0WzddID0gKGEzMiAqIGIwMiAtIGEzMCAqIGIwNSAtIGEzMyAqIGIwMSkgKiBkZXQ7XG4gICAgb3V0WzhdID0gKGEzMCAqIGIwNCAtIGEzMSAqIGIwMiArIGEzMyAqIGIwMCkgKiBkZXQ7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQzLm11bCA9IG1hdDMubXVsdGlwbHk7XG5cbm1hdDMuaWR0ID0gbWF0My5pZGVudGl0eTtcblxuLy9UaGlzIGlzIGhhbmR5IGZvciBQb29sIHV0aWxpdGllcywgdG8gXCJyZXNldFwiIGFcbi8vc2hhcmVkIG9iamVjdCB0byBpdHMgZGVmYXVsdCBzdGF0ZVxubWF0My5yZXNldCA9IG1hdDMuaWR0O1xuXG5tYXQzLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGEgPSB0aGlzLnZhbDtcbiAgICByZXR1cm4gJ01hdHJpeDMoJyArIGFbMF0gKyAnLCAnICsgYVsxXSArICcsICcgKyBhWzJdICsgJywgJyArIFxuICAgICAgICAgICAgICAgICAgICBhWzNdICsgJywgJyArIGFbNF0gKyAnLCAnICsgYVs1XSArICcsICcgKyBcbiAgICAgICAgICAgICAgICAgICAgYVs2XSArICcsICcgKyBhWzddICsgJywgJyArIGFbOF0gKyAnKSc7XG59O1xuXG5tYXQzLnN0ciA9IG1hdDMudG9TdHJpbmc7XG5cbm1vZHVsZS5leHBvcnRzID0gTWF0cml4MzsiLCJ2YXIgQVJSQVlfVFlQRSA9IHR5cGVvZiBGbG9hdDMyQXJyYXkgIT09IFwidW5kZWZpbmVkXCIgPyBGbG9hdDMyQXJyYXkgOiBBcnJheTtcbnZhciBFUFNJTE9OID0gMC4wMDAwMDE7XG5cbmZ1bmN0aW9uIE1hdHJpeDQobSkge1xuICAgIHRoaXMudmFsID0gbmV3IEFSUkFZX1RZUEUoMTYpO1xuXG4gICAgaWYgKG0pIHsgLy9hc3N1bWUgTWF0cml4NCB3aXRoIHZhbFxuICAgICAgICB0aGlzLmNvcHkobSk7XG4gICAgfSBlbHNlIHsgLy9kZWZhdWx0IHRvIGlkZW50aXR5XG4gICAgICAgIHRoaXMuaWR0KCk7XG4gICAgfVxufVxuXG52YXIgbWF0NCA9IE1hdHJpeDQucHJvdG90eXBlO1xuXG5tYXQ0LmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBNYXRyaXg0KHRoaXMpO1xufTtcblxubWF0NC5zZXQgPSBmdW5jdGlvbihvdGhlck1hdCkge1xuICAgIHJldHVybiB0aGlzLmNvcHkob3RoZXJNYXQpO1xufTtcblxubWF0NC5jb3B5ID0gZnVuY3Rpb24ob3RoZXJNYXQpIHtcbiAgICB2YXIgb3V0ID0gdGhpcy52YWwsXG4gICAgICAgIGEgPSBvdGhlck1hdC52YWw7IFxuICAgIG91dFswXSA9IGFbMF07XG4gICAgb3V0WzFdID0gYVsxXTtcbiAgICBvdXRbMl0gPSBhWzJdO1xuICAgIG91dFszXSA9IGFbM107XG4gICAgb3V0WzRdID0gYVs0XTtcbiAgICBvdXRbNV0gPSBhWzVdO1xuICAgIG91dFs2XSA9IGFbNl07XG4gICAgb3V0WzddID0gYVs3XTtcbiAgICBvdXRbOF0gPSBhWzhdO1xuICAgIG91dFs5XSA9IGFbOV07XG4gICAgb3V0WzEwXSA9IGFbMTBdO1xuICAgIG91dFsxMV0gPSBhWzExXTtcbiAgICBvdXRbMTJdID0gYVsxMl07XG4gICAgb3V0WzEzXSA9IGFbMTNdO1xuICAgIG91dFsxNF0gPSBhWzE0XTtcbiAgICBvdXRbMTVdID0gYVsxNV07XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQ0LmZyb21BcnJheSA9IGZ1bmN0aW9uKGEpIHtcbiAgICB2YXIgb3V0ID0gdGhpcy52YWw7XG4gICAgb3V0WzBdID0gYVswXTtcbiAgICBvdXRbMV0gPSBhWzFdO1xuICAgIG91dFsyXSA9IGFbMl07XG4gICAgb3V0WzNdID0gYVszXTtcbiAgICBvdXRbNF0gPSBhWzRdO1xuICAgIG91dFs1XSA9IGFbNV07XG4gICAgb3V0WzZdID0gYVs2XTtcbiAgICBvdXRbN10gPSBhWzddO1xuICAgIG91dFs4XSA9IGFbOF07XG4gICAgb3V0WzldID0gYVs5XTtcbiAgICBvdXRbMTBdID0gYVsxMF07XG4gICAgb3V0WzExXSA9IGFbMTFdO1xuICAgIG91dFsxMl0gPSBhWzEyXTtcbiAgICBvdXRbMTNdID0gYVsxM107XG4gICAgb3V0WzE0XSA9IGFbMTRdO1xuICAgIG91dFsxNV0gPSBhWzE1XTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDQuaWRlbnRpdHkgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgb3V0ID0gdGhpcy52YWw7XG4gICAgb3V0WzBdID0gMTtcbiAgICBvdXRbMV0gPSAwO1xuICAgIG91dFsyXSA9IDA7XG4gICAgb3V0WzNdID0gMDtcbiAgICBvdXRbNF0gPSAwO1xuICAgIG91dFs1XSA9IDE7XG4gICAgb3V0WzZdID0gMDtcbiAgICBvdXRbN10gPSAwO1xuICAgIG91dFs4XSA9IDA7XG4gICAgb3V0WzldID0gMDtcbiAgICBvdXRbMTBdID0gMTtcbiAgICBvdXRbMTFdID0gMDtcbiAgICBvdXRbMTJdID0gMDtcbiAgICBvdXRbMTNdID0gMDtcbiAgICBvdXRbMTRdID0gMDtcbiAgICBvdXRbMTVdID0gMTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDQudHJhbnNwb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGEgPSB0aGlzLnZhbCxcbiAgICAgICAgYTAxID0gYVsxXSwgYTAyID0gYVsyXSwgYTAzID0gYVszXSxcbiAgICAgICAgYTEyID0gYVs2XSwgYTEzID0gYVs3XSxcbiAgICAgICAgYTIzID0gYVsxMV07XG5cbiAgICBhWzFdID0gYVs0XTtcbiAgICBhWzJdID0gYVs4XTtcbiAgICBhWzNdID0gYVsxMl07XG4gICAgYVs0XSA9IGEwMTtcbiAgICBhWzZdID0gYVs5XTtcbiAgICBhWzddID0gYVsxM107XG4gICAgYVs4XSA9IGEwMjtcbiAgICBhWzldID0gYTEyO1xuICAgIGFbMTFdID0gYVsxNF07XG4gICAgYVsxMl0gPSBhMDM7XG4gICAgYVsxM10gPSBhMTM7XG4gICAgYVsxNF0gPSBhMjM7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQ0LmludmVydCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhID0gdGhpcy52YWwsXG4gICAgICAgIGEwMCA9IGFbMF0sIGEwMSA9IGFbMV0sIGEwMiA9IGFbMl0sIGEwMyA9IGFbM10sXG4gICAgICAgIGExMCA9IGFbNF0sIGExMSA9IGFbNV0sIGExMiA9IGFbNl0sIGExMyA9IGFbN10sXG4gICAgICAgIGEyMCA9IGFbOF0sIGEyMSA9IGFbOV0sIGEyMiA9IGFbMTBdLCBhMjMgPSBhWzExXSxcbiAgICAgICAgYTMwID0gYVsxMl0sIGEzMSA9IGFbMTNdLCBhMzIgPSBhWzE0XSwgYTMzID0gYVsxNV0sXG5cbiAgICAgICAgYjAwID0gYTAwICogYTExIC0gYTAxICogYTEwLFxuICAgICAgICBiMDEgPSBhMDAgKiBhMTIgLSBhMDIgKiBhMTAsXG4gICAgICAgIGIwMiA9IGEwMCAqIGExMyAtIGEwMyAqIGExMCxcbiAgICAgICAgYjAzID0gYTAxICogYTEyIC0gYTAyICogYTExLFxuICAgICAgICBiMDQgPSBhMDEgKiBhMTMgLSBhMDMgKiBhMTEsXG4gICAgICAgIGIwNSA9IGEwMiAqIGExMyAtIGEwMyAqIGExMixcbiAgICAgICAgYjA2ID0gYTIwICogYTMxIC0gYTIxICogYTMwLFxuICAgICAgICBiMDcgPSBhMjAgKiBhMzIgLSBhMjIgKiBhMzAsXG4gICAgICAgIGIwOCA9IGEyMCAqIGEzMyAtIGEyMyAqIGEzMCxcbiAgICAgICAgYjA5ID0gYTIxICogYTMyIC0gYTIyICogYTMxLFxuICAgICAgICBiMTAgPSBhMjEgKiBhMzMgLSBhMjMgKiBhMzEsXG4gICAgICAgIGIxMSA9IGEyMiAqIGEzMyAtIGEyMyAqIGEzMixcblxuICAgICAgICAvLyBDYWxjdWxhdGUgdGhlIGRldGVybWluYW50XG4gICAgICAgIGRldCA9IGIwMCAqIGIxMSAtIGIwMSAqIGIxMCArIGIwMiAqIGIwOSArIGIwMyAqIGIwOCAtIGIwNCAqIGIwNyArIGIwNSAqIGIwNjtcblxuICAgIGlmICghZGV0KSB7IFxuICAgICAgICByZXR1cm4gbnVsbDsgXG4gICAgfVxuICAgIGRldCA9IDEuMCAvIGRldDtcblxuICAgIGFbMF0gPSAoYTExICogYjExIC0gYTEyICogYjEwICsgYTEzICogYjA5KSAqIGRldDtcbiAgICBhWzFdID0gKGEwMiAqIGIxMCAtIGEwMSAqIGIxMSAtIGEwMyAqIGIwOSkgKiBkZXQ7XG4gICAgYVsyXSA9IChhMzEgKiBiMDUgLSBhMzIgKiBiMDQgKyBhMzMgKiBiMDMpICogZGV0O1xuICAgIGFbM10gPSAoYTIyICogYjA0IC0gYTIxICogYjA1IC0gYTIzICogYjAzKSAqIGRldDtcbiAgICBhWzRdID0gKGExMiAqIGIwOCAtIGExMCAqIGIxMSAtIGExMyAqIGIwNykgKiBkZXQ7XG4gICAgYVs1XSA9IChhMDAgKiBiMTEgLSBhMDIgKiBiMDggKyBhMDMgKiBiMDcpICogZGV0O1xuICAgIGFbNl0gPSAoYTMyICogYjAyIC0gYTMwICogYjA1IC0gYTMzICogYjAxKSAqIGRldDtcbiAgICBhWzddID0gKGEyMCAqIGIwNSAtIGEyMiAqIGIwMiArIGEyMyAqIGIwMSkgKiBkZXQ7XG4gICAgYVs4XSA9IChhMTAgKiBiMTAgLSBhMTEgKiBiMDggKyBhMTMgKiBiMDYpICogZGV0O1xuICAgIGFbOV0gPSAoYTAxICogYjA4IC0gYTAwICogYjEwIC0gYTAzICogYjA2KSAqIGRldDtcbiAgICBhWzEwXSA9IChhMzAgKiBiMDQgLSBhMzEgKiBiMDIgKyBhMzMgKiBiMDApICogZGV0O1xuICAgIGFbMTFdID0gKGEyMSAqIGIwMiAtIGEyMCAqIGIwNCAtIGEyMyAqIGIwMCkgKiBkZXQ7XG4gICAgYVsxMl0gPSAoYTExICogYjA3IC0gYTEwICogYjA5IC0gYTEyICogYjA2KSAqIGRldDtcbiAgICBhWzEzXSA9IChhMDAgKiBiMDkgLSBhMDEgKiBiMDcgKyBhMDIgKiBiMDYpICogZGV0O1xuICAgIGFbMTRdID0gKGEzMSAqIGIwMSAtIGEzMCAqIGIwMyAtIGEzMiAqIGIwMCkgKiBkZXQ7XG4gICAgYVsxNV0gPSAoYTIwICogYjAzIC0gYTIxICogYjAxICsgYTIyICogYjAwKSAqIGRldDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDQuYWRqb2ludCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhID0gdGhpcy52YWwsXG4gICAgICAgIGEwMCA9IGFbMF0sIGEwMSA9IGFbMV0sIGEwMiA9IGFbMl0sIGEwMyA9IGFbM10sXG4gICAgICAgIGExMCA9IGFbNF0sIGExMSA9IGFbNV0sIGExMiA9IGFbNl0sIGExMyA9IGFbN10sXG4gICAgICAgIGEyMCA9IGFbOF0sIGEyMSA9IGFbOV0sIGEyMiA9IGFbMTBdLCBhMjMgPSBhWzExXSxcbiAgICAgICAgYTMwID0gYVsxMl0sIGEzMSA9IGFbMTNdLCBhMzIgPSBhWzE0XSwgYTMzID0gYVsxNV07XG5cbiAgICBhWzBdICA9ICAoYTExICogKGEyMiAqIGEzMyAtIGEyMyAqIGEzMikgLSBhMjEgKiAoYTEyICogYTMzIC0gYTEzICogYTMyKSArIGEzMSAqIChhMTIgKiBhMjMgLSBhMTMgKiBhMjIpKTtcbiAgICBhWzFdICA9IC0oYTAxICogKGEyMiAqIGEzMyAtIGEyMyAqIGEzMikgLSBhMjEgKiAoYTAyICogYTMzIC0gYTAzICogYTMyKSArIGEzMSAqIChhMDIgKiBhMjMgLSBhMDMgKiBhMjIpKTtcbiAgICBhWzJdICA9ICAoYTAxICogKGExMiAqIGEzMyAtIGExMyAqIGEzMikgLSBhMTEgKiAoYTAyICogYTMzIC0gYTAzICogYTMyKSArIGEzMSAqIChhMDIgKiBhMTMgLSBhMDMgKiBhMTIpKTtcbiAgICBhWzNdICA9IC0oYTAxICogKGExMiAqIGEyMyAtIGExMyAqIGEyMikgLSBhMTEgKiAoYTAyICogYTIzIC0gYTAzICogYTIyKSArIGEyMSAqIChhMDIgKiBhMTMgLSBhMDMgKiBhMTIpKTtcbiAgICBhWzRdICA9IC0oYTEwICogKGEyMiAqIGEzMyAtIGEyMyAqIGEzMikgLSBhMjAgKiAoYTEyICogYTMzIC0gYTEzICogYTMyKSArIGEzMCAqIChhMTIgKiBhMjMgLSBhMTMgKiBhMjIpKTtcbiAgICBhWzVdICA9ICAoYTAwICogKGEyMiAqIGEzMyAtIGEyMyAqIGEzMikgLSBhMjAgKiAoYTAyICogYTMzIC0gYTAzICogYTMyKSArIGEzMCAqIChhMDIgKiBhMjMgLSBhMDMgKiBhMjIpKTtcbiAgICBhWzZdICA9IC0oYTAwICogKGExMiAqIGEzMyAtIGExMyAqIGEzMikgLSBhMTAgKiAoYTAyICogYTMzIC0gYTAzICogYTMyKSArIGEzMCAqIChhMDIgKiBhMTMgLSBhMDMgKiBhMTIpKTtcbiAgICBhWzddICA9ICAoYTAwICogKGExMiAqIGEyMyAtIGExMyAqIGEyMikgLSBhMTAgKiAoYTAyICogYTIzIC0gYTAzICogYTIyKSArIGEyMCAqIChhMDIgKiBhMTMgLSBhMDMgKiBhMTIpKTtcbiAgICBhWzhdICA9ICAoYTEwICogKGEyMSAqIGEzMyAtIGEyMyAqIGEzMSkgLSBhMjAgKiAoYTExICogYTMzIC0gYTEzICogYTMxKSArIGEzMCAqIChhMTEgKiBhMjMgLSBhMTMgKiBhMjEpKTtcbiAgICBhWzldICA9IC0oYTAwICogKGEyMSAqIGEzMyAtIGEyMyAqIGEzMSkgLSBhMjAgKiAoYTAxICogYTMzIC0gYTAzICogYTMxKSArIGEzMCAqIChhMDEgKiBhMjMgLSBhMDMgKiBhMjEpKTtcbiAgICBhWzEwXSA9ICAoYTAwICogKGExMSAqIGEzMyAtIGExMyAqIGEzMSkgLSBhMTAgKiAoYTAxICogYTMzIC0gYTAzICogYTMxKSArIGEzMCAqIChhMDEgKiBhMTMgLSBhMDMgKiBhMTEpKTtcbiAgICBhWzExXSA9IC0oYTAwICogKGExMSAqIGEyMyAtIGExMyAqIGEyMSkgLSBhMTAgKiAoYTAxICogYTIzIC0gYTAzICogYTIxKSArIGEyMCAqIChhMDEgKiBhMTMgLSBhMDMgKiBhMTEpKTtcbiAgICBhWzEyXSA9IC0oYTEwICogKGEyMSAqIGEzMiAtIGEyMiAqIGEzMSkgLSBhMjAgKiAoYTExICogYTMyIC0gYTEyICogYTMxKSArIGEzMCAqIChhMTEgKiBhMjIgLSBhMTIgKiBhMjEpKTtcbiAgICBhWzEzXSA9ICAoYTAwICogKGEyMSAqIGEzMiAtIGEyMiAqIGEzMSkgLSBhMjAgKiAoYTAxICogYTMyIC0gYTAyICogYTMxKSArIGEzMCAqIChhMDEgKiBhMjIgLSBhMDIgKiBhMjEpKTtcbiAgICBhWzE0XSA9IC0oYTAwICogKGExMSAqIGEzMiAtIGExMiAqIGEzMSkgLSBhMTAgKiAoYTAxICogYTMyIC0gYTAyICogYTMxKSArIGEzMCAqIChhMDEgKiBhMTIgLSBhMDIgKiBhMTEpKTtcbiAgICBhWzE1XSA9ICAoYTAwICogKGExMSAqIGEyMiAtIGExMiAqIGEyMSkgLSBhMTAgKiAoYTAxICogYTIyIC0gYTAyICogYTIxKSArIGEyMCAqIChhMDEgKiBhMTIgLSBhMDIgKiBhMTEpKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDQuZGV0ZXJtaW5hbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGEgPSB0aGlzLnZhbCxcbiAgICAgICAgYTAwID0gYVswXSwgYTAxID0gYVsxXSwgYTAyID0gYVsyXSwgYTAzID0gYVszXSxcbiAgICAgICAgYTEwID0gYVs0XSwgYTExID0gYVs1XSwgYTEyID0gYVs2XSwgYTEzID0gYVs3XSxcbiAgICAgICAgYTIwID0gYVs4XSwgYTIxID0gYVs5XSwgYTIyID0gYVsxMF0sIGEyMyA9IGFbMTFdLFxuICAgICAgICBhMzAgPSBhWzEyXSwgYTMxID0gYVsxM10sIGEzMiA9IGFbMTRdLCBhMzMgPSBhWzE1XSxcblxuICAgICAgICBiMDAgPSBhMDAgKiBhMTEgLSBhMDEgKiBhMTAsXG4gICAgICAgIGIwMSA9IGEwMCAqIGExMiAtIGEwMiAqIGExMCxcbiAgICAgICAgYjAyID0gYTAwICogYTEzIC0gYTAzICogYTEwLFxuICAgICAgICBiMDMgPSBhMDEgKiBhMTIgLSBhMDIgKiBhMTEsXG4gICAgICAgIGIwNCA9IGEwMSAqIGExMyAtIGEwMyAqIGExMSxcbiAgICAgICAgYjA1ID0gYTAyICogYTEzIC0gYTAzICogYTEyLFxuICAgICAgICBiMDYgPSBhMjAgKiBhMzEgLSBhMjEgKiBhMzAsXG4gICAgICAgIGIwNyA9IGEyMCAqIGEzMiAtIGEyMiAqIGEzMCxcbiAgICAgICAgYjA4ID0gYTIwICogYTMzIC0gYTIzICogYTMwLFxuICAgICAgICBiMDkgPSBhMjEgKiBhMzIgLSBhMjIgKiBhMzEsXG4gICAgICAgIGIxMCA9IGEyMSAqIGEzMyAtIGEyMyAqIGEzMSxcbiAgICAgICAgYjExID0gYTIyICogYTMzIC0gYTIzICogYTMyO1xuXG4gICAgLy8gQ2FsY3VsYXRlIHRoZSBkZXRlcm1pbmFudFxuICAgIHJldHVybiBiMDAgKiBiMTEgLSBiMDEgKiBiMTAgKyBiMDIgKiBiMDkgKyBiMDMgKiBiMDggLSBiMDQgKiBiMDcgKyBiMDUgKiBiMDY7XG59O1xuXG5tYXQ0Lm11bHRpcGx5ID0gZnVuY3Rpb24ob3RoZXJNYXQpIHtcbiAgICB2YXIgYSA9IHRoaXMudmFsLFxuICAgICAgICBiID0gb3RoZXJNYXQudmFsLFxuICAgICAgICBhMDAgPSBhWzBdLCBhMDEgPSBhWzFdLCBhMDIgPSBhWzJdLCBhMDMgPSBhWzNdLFxuICAgICAgICBhMTAgPSBhWzRdLCBhMTEgPSBhWzVdLCBhMTIgPSBhWzZdLCBhMTMgPSBhWzddLFxuICAgICAgICBhMjAgPSBhWzhdLCBhMjEgPSBhWzldLCBhMjIgPSBhWzEwXSwgYTIzID0gYVsxMV0sXG4gICAgICAgIGEzMCA9IGFbMTJdLCBhMzEgPSBhWzEzXSwgYTMyID0gYVsxNF0sIGEzMyA9IGFbMTVdO1xuXG4gICAgLy8gQ2FjaGUgb25seSB0aGUgY3VycmVudCBsaW5lIG9mIHRoZSBzZWNvbmQgbWF0cml4XG4gICAgdmFyIGIwICA9IGJbMF0sIGIxID0gYlsxXSwgYjIgPSBiWzJdLCBiMyA9IGJbM107ICBcbiAgICBhWzBdID0gYjAqYTAwICsgYjEqYTEwICsgYjIqYTIwICsgYjMqYTMwO1xuICAgIGFbMV0gPSBiMCphMDEgKyBiMSphMTEgKyBiMiphMjEgKyBiMyphMzE7XG4gICAgYVsyXSA9IGIwKmEwMiArIGIxKmExMiArIGIyKmEyMiArIGIzKmEzMjtcbiAgICBhWzNdID0gYjAqYTAzICsgYjEqYTEzICsgYjIqYTIzICsgYjMqYTMzO1xuXG4gICAgYjAgPSBiWzRdOyBiMSA9IGJbNV07IGIyID0gYls2XTsgYjMgPSBiWzddO1xuICAgIGFbNF0gPSBiMCphMDAgKyBiMSphMTAgKyBiMiphMjAgKyBiMyphMzA7XG4gICAgYVs1XSA9IGIwKmEwMSArIGIxKmExMSArIGIyKmEyMSArIGIzKmEzMTtcbiAgICBhWzZdID0gYjAqYTAyICsgYjEqYTEyICsgYjIqYTIyICsgYjMqYTMyO1xuICAgIGFbN10gPSBiMCphMDMgKyBiMSphMTMgKyBiMiphMjMgKyBiMyphMzM7XG5cbiAgICBiMCA9IGJbOF07IGIxID0gYls5XTsgYjIgPSBiWzEwXTsgYjMgPSBiWzExXTtcbiAgICBhWzhdID0gYjAqYTAwICsgYjEqYTEwICsgYjIqYTIwICsgYjMqYTMwO1xuICAgIGFbOV0gPSBiMCphMDEgKyBiMSphMTEgKyBiMiphMjEgKyBiMyphMzE7XG4gICAgYVsxMF0gPSBiMCphMDIgKyBiMSphMTIgKyBiMiphMjIgKyBiMyphMzI7XG4gICAgYVsxMV0gPSBiMCphMDMgKyBiMSphMTMgKyBiMiphMjMgKyBiMyphMzM7XG5cbiAgICBiMCA9IGJbMTJdOyBiMSA9IGJbMTNdOyBiMiA9IGJbMTRdOyBiMyA9IGJbMTVdO1xuICAgIGFbMTJdID0gYjAqYTAwICsgYjEqYTEwICsgYjIqYTIwICsgYjMqYTMwO1xuICAgIGFbMTNdID0gYjAqYTAxICsgYjEqYTExICsgYjIqYTIxICsgYjMqYTMxO1xuICAgIGFbMTRdID0gYjAqYTAyICsgYjEqYTEyICsgYjIqYTIyICsgYjMqYTMyO1xuICAgIGFbMTVdID0gYjAqYTAzICsgYjEqYTEzICsgYjIqYTIzICsgYjMqYTMzO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0NC50cmFuc2xhdGUgPSBmdW5jdGlvbih2KSB7XG4gICAgdmFyIHggPSB2LngsIHkgPSB2LnksIHogPSB2LnosXG4gICAgICAgIGEgPSB0aGlzLnZhbDtcbiAgICBhWzEyXSA9IGFbMF0gKiB4ICsgYVs0XSAqIHkgKyBhWzhdICogeiArIGFbMTJdO1xuICAgIGFbMTNdID0gYVsxXSAqIHggKyBhWzVdICogeSArIGFbOV0gKiB6ICsgYVsxM107XG4gICAgYVsxNF0gPSBhWzJdICogeCArIGFbNl0gKiB5ICsgYVsxMF0gKiB6ICsgYVsxNF07XG4gICAgYVsxNV0gPSBhWzNdICogeCArIGFbN10gKiB5ICsgYVsxMV0gKiB6ICsgYVsxNV07XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQ0LnNjYWxlID0gZnVuY3Rpb24odikge1xuICAgIHZhciB4ID0gdi54LCB5ID0gdi55LCB6ID0gdi56LCBhID0gdGhpcy52YWw7XG5cbiAgICBhWzBdID0gYVswXSAqIHg7XG4gICAgYVsxXSA9IGFbMV0gKiB4O1xuICAgIGFbMl0gPSBhWzJdICogeDtcbiAgICBhWzNdID0gYVszXSAqIHg7XG4gICAgYVs0XSA9IGFbNF0gKiB5O1xuICAgIGFbNV0gPSBhWzVdICogeTtcbiAgICBhWzZdID0gYVs2XSAqIHk7XG4gICAgYVs3XSA9IGFbN10gKiB5O1xuICAgIGFbOF0gPSBhWzhdICogejtcbiAgICBhWzldID0gYVs5XSAqIHo7XG4gICAgYVsxMF0gPSBhWzEwXSAqIHo7XG4gICAgYVsxMV0gPSBhWzExXSAqIHo7XG4gICAgYVsxMl0gPSBhWzEyXTtcbiAgICBhWzEzXSA9IGFbMTNdO1xuICAgIGFbMTRdID0gYVsxNF07XG4gICAgYVsxNV0gPSBhWzE1XTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDQucm90YXRlID0gZnVuY3Rpb24gKHJhZCwgYXhpcykge1xuICAgIHZhciBhID0gdGhpcy52YWwsXG4gICAgICAgIHggPSBheGlzLngsIHkgPSBheGlzLnksIHogPSBheGlzLnosXG4gICAgICAgIGxlbiA9IE1hdGguc3FydCh4ICogeCArIHkgKiB5ICsgeiAqIHopLFxuICAgICAgICBzLCBjLCB0LFxuICAgICAgICBhMDAsIGEwMSwgYTAyLCBhMDMsXG4gICAgICAgIGExMCwgYTExLCBhMTIsIGExMyxcbiAgICAgICAgYTIwLCBhMjEsIGEyMiwgYTIzLFxuICAgICAgICBiMDAsIGIwMSwgYjAyLFxuICAgICAgICBiMTAsIGIxMSwgYjEyLFxuICAgICAgICBiMjAsIGIyMSwgYjIyO1xuXG4gICAgaWYgKE1hdGguYWJzKGxlbikgPCBFUFNJTE9OKSB7IHJldHVybiBudWxsOyB9XG4gICAgXG4gICAgbGVuID0gMSAvIGxlbjtcbiAgICB4ICo9IGxlbjtcbiAgICB5ICo9IGxlbjtcbiAgICB6ICo9IGxlbjtcblxuICAgIHMgPSBNYXRoLnNpbihyYWQpO1xuICAgIGMgPSBNYXRoLmNvcyhyYWQpO1xuICAgIHQgPSAxIC0gYztcblxuICAgIGEwMCA9IGFbMF07IGEwMSA9IGFbMV07IGEwMiA9IGFbMl07IGEwMyA9IGFbM107XG4gICAgYTEwID0gYVs0XTsgYTExID0gYVs1XTsgYTEyID0gYVs2XTsgYTEzID0gYVs3XTtcbiAgICBhMjAgPSBhWzhdOyBhMjEgPSBhWzldOyBhMjIgPSBhWzEwXTsgYTIzID0gYVsxMV07XG5cbiAgICAvLyBDb25zdHJ1Y3QgdGhlIGVsZW1lbnRzIG9mIHRoZSByb3RhdGlvbiBtYXRyaXhcbiAgICBiMDAgPSB4ICogeCAqIHQgKyBjOyBiMDEgPSB5ICogeCAqIHQgKyB6ICogczsgYjAyID0geiAqIHggKiB0IC0geSAqIHM7XG4gICAgYjEwID0geCAqIHkgKiB0IC0geiAqIHM7IGIxMSA9IHkgKiB5ICogdCArIGM7IGIxMiA9IHogKiB5ICogdCArIHggKiBzO1xuICAgIGIyMCA9IHggKiB6ICogdCArIHkgKiBzOyBiMjEgPSB5ICogeiAqIHQgLSB4ICogczsgYjIyID0geiAqIHogKiB0ICsgYztcblxuICAgIC8vIFBlcmZvcm0gcm90YXRpb24tc3BlY2lmaWMgbWF0cml4IG11bHRpcGxpY2F0aW9uXG4gICAgYVswXSA9IGEwMCAqIGIwMCArIGExMCAqIGIwMSArIGEyMCAqIGIwMjtcbiAgICBhWzFdID0gYTAxICogYjAwICsgYTExICogYjAxICsgYTIxICogYjAyO1xuICAgIGFbMl0gPSBhMDIgKiBiMDAgKyBhMTIgKiBiMDEgKyBhMjIgKiBiMDI7XG4gICAgYVszXSA9IGEwMyAqIGIwMCArIGExMyAqIGIwMSArIGEyMyAqIGIwMjtcbiAgICBhWzRdID0gYTAwICogYjEwICsgYTEwICogYjExICsgYTIwICogYjEyO1xuICAgIGFbNV0gPSBhMDEgKiBiMTAgKyBhMTEgKiBiMTEgKyBhMjEgKiBiMTI7XG4gICAgYVs2XSA9IGEwMiAqIGIxMCArIGExMiAqIGIxMSArIGEyMiAqIGIxMjtcbiAgICBhWzddID0gYTAzICogYjEwICsgYTEzICogYjExICsgYTIzICogYjEyO1xuICAgIGFbOF0gPSBhMDAgKiBiMjAgKyBhMTAgKiBiMjEgKyBhMjAgKiBiMjI7XG4gICAgYVs5XSA9IGEwMSAqIGIyMCArIGExMSAqIGIyMSArIGEyMSAqIGIyMjtcbiAgICBhWzEwXSA9IGEwMiAqIGIyMCArIGExMiAqIGIyMSArIGEyMiAqIGIyMjtcbiAgICBhWzExXSA9IGEwMyAqIGIyMCArIGExMyAqIGIyMSArIGEyMyAqIGIyMjtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDQucm90YXRlWCA9IGZ1bmN0aW9uKHJhZCkge1xuICAgIHZhciBhID0gdGhpcy52YWwsXG4gICAgICAgIHMgPSBNYXRoLnNpbihyYWQpLFxuICAgICAgICBjID0gTWF0aC5jb3MocmFkKSxcbiAgICAgICAgYTEwID0gYVs0XSxcbiAgICAgICAgYTExID0gYVs1XSxcbiAgICAgICAgYTEyID0gYVs2XSxcbiAgICAgICAgYTEzID0gYVs3XSxcbiAgICAgICAgYTIwID0gYVs4XSxcbiAgICAgICAgYTIxID0gYVs5XSxcbiAgICAgICAgYTIyID0gYVsxMF0sXG4gICAgICAgIGEyMyA9IGFbMTFdO1xuXG4gICAgLy8gUGVyZm9ybSBheGlzLXNwZWNpZmljIG1hdHJpeCBtdWx0aXBsaWNhdGlvblxuICAgIGFbNF0gPSBhMTAgKiBjICsgYTIwICogcztcbiAgICBhWzVdID0gYTExICogYyArIGEyMSAqIHM7XG4gICAgYVs2XSA9IGExMiAqIGMgKyBhMjIgKiBzO1xuICAgIGFbN10gPSBhMTMgKiBjICsgYTIzICogcztcbiAgICBhWzhdID0gYTIwICogYyAtIGExMCAqIHM7XG4gICAgYVs5XSA9IGEyMSAqIGMgLSBhMTEgKiBzO1xuICAgIGFbMTBdID0gYTIyICogYyAtIGExMiAqIHM7XG4gICAgYVsxMV0gPSBhMjMgKiBjIC0gYTEzICogcztcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDQucm90YXRlWSA9IGZ1bmN0aW9uKHJhZCkge1xuICAgIHZhciBhID0gdGhpcy52YWwsXG4gICAgICAgIHMgPSBNYXRoLnNpbihyYWQpLFxuICAgICAgICBjID0gTWF0aC5jb3MocmFkKSxcbiAgICAgICAgYTAwID0gYVswXSxcbiAgICAgICAgYTAxID0gYVsxXSxcbiAgICAgICAgYTAyID0gYVsyXSxcbiAgICAgICAgYTAzID0gYVszXSxcbiAgICAgICAgYTIwID0gYVs4XSxcbiAgICAgICAgYTIxID0gYVs5XSxcbiAgICAgICAgYTIyID0gYVsxMF0sXG4gICAgICAgIGEyMyA9IGFbMTFdO1xuXG4gICAgLy8gUGVyZm9ybSBheGlzLXNwZWNpZmljIG1hdHJpeCBtdWx0aXBsaWNhdGlvblxuICAgIGFbMF0gPSBhMDAgKiBjIC0gYTIwICogcztcbiAgICBhWzFdID0gYTAxICogYyAtIGEyMSAqIHM7XG4gICAgYVsyXSA9IGEwMiAqIGMgLSBhMjIgKiBzO1xuICAgIGFbM10gPSBhMDMgKiBjIC0gYTIzICogcztcbiAgICBhWzhdID0gYTAwICogcyArIGEyMCAqIGM7XG4gICAgYVs5XSA9IGEwMSAqIHMgKyBhMjEgKiBjO1xuICAgIGFbMTBdID0gYTAyICogcyArIGEyMiAqIGM7XG4gICAgYVsxMV0gPSBhMDMgKiBzICsgYTIzICogYztcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDQucm90YXRlWiA9IGZ1bmN0aW9uIChyYWQpIHtcbiAgICB2YXIgYSA9IHRoaXMudmFsLFxuICAgICAgICBzID0gTWF0aC5zaW4ocmFkKSxcbiAgICAgICAgYyA9IE1hdGguY29zKHJhZCksXG4gICAgICAgIGEwMCA9IGFbMF0sXG4gICAgICAgIGEwMSA9IGFbMV0sXG4gICAgICAgIGEwMiA9IGFbMl0sXG4gICAgICAgIGEwMyA9IGFbM10sXG4gICAgICAgIGExMCA9IGFbNF0sXG4gICAgICAgIGExMSA9IGFbNV0sXG4gICAgICAgIGExMiA9IGFbNl0sXG4gICAgICAgIGExMyA9IGFbN107XG5cbiAgICAvLyBQZXJmb3JtIGF4aXMtc3BlY2lmaWMgbWF0cml4IG11bHRpcGxpY2F0aW9uXG4gICAgYVswXSA9IGEwMCAqIGMgKyBhMTAgKiBzO1xuICAgIGFbMV0gPSBhMDEgKiBjICsgYTExICogcztcbiAgICBhWzJdID0gYTAyICogYyArIGExMiAqIHM7XG4gICAgYVszXSA9IGEwMyAqIGMgKyBhMTMgKiBzO1xuICAgIGFbNF0gPSBhMTAgKiBjIC0gYTAwICogcztcbiAgICBhWzVdID0gYTExICogYyAtIGEwMSAqIHM7XG4gICAgYVs2XSA9IGExMiAqIGMgLSBhMDIgKiBzO1xuICAgIGFbN10gPSBhMTMgKiBjIC0gYTAzICogcztcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDQuZnJvbVJvdGF0aW9uVHJhbnNsYXRpb24gPSBmdW5jdGlvbiAocSwgdikge1xuICAgIC8vIFF1YXRlcm5pb24gbWF0aFxuICAgIHZhciBvdXQgPSB0aGlzLnZhbCxcbiAgICAgICAgeCA9IHEueCwgeSA9IHEueSwgeiA9IHEueiwgdyA9IHEudyxcbiAgICAgICAgeDIgPSB4ICsgeCxcbiAgICAgICAgeTIgPSB5ICsgeSxcbiAgICAgICAgejIgPSB6ICsgeixcblxuICAgICAgICB4eCA9IHggKiB4MixcbiAgICAgICAgeHkgPSB4ICogeTIsXG4gICAgICAgIHh6ID0geCAqIHoyLFxuICAgICAgICB5eSA9IHkgKiB5MixcbiAgICAgICAgeXogPSB5ICogejIsXG4gICAgICAgIHp6ID0geiAqIHoyLFxuICAgICAgICB3eCA9IHcgKiB4MixcbiAgICAgICAgd3kgPSB3ICogeTIsXG4gICAgICAgIHd6ID0gdyAqIHoyO1xuXG4gICAgb3V0WzBdID0gMSAtICh5eSArIHp6KTtcbiAgICBvdXRbMV0gPSB4eSArIHd6O1xuICAgIG91dFsyXSA9IHh6IC0gd3k7XG4gICAgb3V0WzNdID0gMDtcbiAgICBvdXRbNF0gPSB4eSAtIHd6O1xuICAgIG91dFs1XSA9IDEgLSAoeHggKyB6eik7XG4gICAgb3V0WzZdID0geXogKyB3eDtcbiAgICBvdXRbN10gPSAwO1xuICAgIG91dFs4XSA9IHh6ICsgd3k7XG4gICAgb3V0WzldID0geXogLSB3eDtcbiAgICBvdXRbMTBdID0gMSAtICh4eCArIHl5KTtcbiAgICBvdXRbMTFdID0gMDtcbiAgICBvdXRbMTJdID0gdi54O1xuICAgIG91dFsxM10gPSB2Lnk7XG4gICAgb3V0WzE0XSA9IHYuejtcbiAgICBvdXRbMTVdID0gMTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDQuZnJvbVF1YXQgPSBmdW5jdGlvbiAocSkge1xuICAgIHZhciBvdXQgPSB0aGlzLnZhbCxcbiAgICAgICAgeCA9IHEueCwgeSA9IHEueSwgeiA9IHEueiwgdyA9IHEudyxcbiAgICAgICAgeDIgPSB4ICsgeCxcbiAgICAgICAgeTIgPSB5ICsgeSxcbiAgICAgICAgejIgPSB6ICsgeixcblxuICAgICAgICB4eCA9IHggKiB4MixcbiAgICAgICAgeHkgPSB4ICogeTIsXG4gICAgICAgIHh6ID0geCAqIHoyLFxuICAgICAgICB5eSA9IHkgKiB5MixcbiAgICAgICAgeXogPSB5ICogejIsXG4gICAgICAgIHp6ID0geiAqIHoyLFxuICAgICAgICB3eCA9IHcgKiB4MixcbiAgICAgICAgd3kgPSB3ICogeTIsXG4gICAgICAgIHd6ID0gdyAqIHoyO1xuXG4gICAgb3V0WzBdID0gMSAtICh5eSArIHp6KTtcbiAgICBvdXRbMV0gPSB4eSArIHd6O1xuICAgIG91dFsyXSA9IHh6IC0gd3k7XG4gICAgb3V0WzNdID0gMDtcblxuICAgIG91dFs0XSA9IHh5IC0gd3o7XG4gICAgb3V0WzVdID0gMSAtICh4eCArIHp6KTtcbiAgICBvdXRbNl0gPSB5eiArIHd4O1xuICAgIG91dFs3XSA9IDA7XG5cbiAgICBvdXRbOF0gPSB4eiArIHd5O1xuICAgIG91dFs5XSA9IHl6IC0gd3g7XG4gICAgb3V0WzEwXSA9IDEgLSAoeHggKyB5eSk7XG4gICAgb3V0WzExXSA9IDA7XG5cbiAgICBvdXRbMTJdID0gMDtcbiAgICBvdXRbMTNdID0gMDtcbiAgICBvdXRbMTRdID0gMDtcbiAgICBvdXRbMTVdID0gMTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuXG4vKipcbiAqIEdlbmVyYXRlcyBhIGZydXN0dW0gbWF0cml4IHdpdGggdGhlIGdpdmVuIGJvdW5kc1xuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBsZWZ0IExlZnQgYm91bmQgb2YgdGhlIGZydXN0dW1cbiAqIEBwYXJhbSB7TnVtYmVyfSByaWdodCBSaWdodCBib3VuZCBvZiB0aGUgZnJ1c3R1bVxuICogQHBhcmFtIHtOdW1iZXJ9IGJvdHRvbSBCb3R0b20gYm91bmQgb2YgdGhlIGZydXN0dW1cbiAqIEBwYXJhbSB7TnVtYmVyfSB0b3AgVG9wIGJvdW5kIG9mIHRoZSBmcnVzdHVtXG4gKiBAcGFyYW0ge051bWJlcn0gbmVhciBOZWFyIGJvdW5kIG9mIHRoZSBmcnVzdHVtXG4gKiBAcGFyYW0ge051bWJlcn0gZmFyIEZhciBib3VuZCBvZiB0aGUgZnJ1c3R1bVxuICogQHJldHVybnMge01hdHJpeDR9IHRoaXMgZm9yIGNoYWluaW5nXG4gKi9cbm1hdDQuZnJ1c3R1bSA9IGZ1bmN0aW9uIChsZWZ0LCByaWdodCwgYm90dG9tLCB0b3AsIG5lYXIsIGZhcikge1xuICAgIHZhciBvdXQgPSB0aGlzLnZhbCxcbiAgICAgICAgcmwgPSAxIC8gKHJpZ2h0IC0gbGVmdCksXG4gICAgICAgIHRiID0gMSAvICh0b3AgLSBib3R0b20pLFxuICAgICAgICBuZiA9IDEgLyAobmVhciAtIGZhcik7XG4gICAgb3V0WzBdID0gKG5lYXIgKiAyKSAqIHJsO1xuICAgIG91dFsxXSA9IDA7XG4gICAgb3V0WzJdID0gMDtcbiAgICBvdXRbM10gPSAwO1xuICAgIG91dFs0XSA9IDA7XG4gICAgb3V0WzVdID0gKG5lYXIgKiAyKSAqIHRiO1xuICAgIG91dFs2XSA9IDA7XG4gICAgb3V0WzddID0gMDtcbiAgICBvdXRbOF0gPSAocmlnaHQgKyBsZWZ0KSAqIHJsO1xuICAgIG91dFs5XSA9ICh0b3AgKyBib3R0b20pICogdGI7XG4gICAgb3V0WzEwXSA9IChmYXIgKyBuZWFyKSAqIG5mO1xuICAgIG91dFsxMV0gPSAtMTtcbiAgICBvdXRbMTJdID0gMDtcbiAgICBvdXRbMTNdID0gMDtcbiAgICBvdXRbMTRdID0gKGZhciAqIG5lYXIgKiAyKSAqIG5mO1xuICAgIG91dFsxNV0gPSAwO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuXG4vKipcbiAqIEdlbmVyYXRlcyBhIHBlcnNwZWN0aXZlIHByb2plY3Rpb24gbWF0cml4IHdpdGggdGhlIGdpdmVuIGJvdW5kc1xuICpcbiAqIEBwYXJhbSB7bnVtYmVyfSBmb3Z5IFZlcnRpY2FsIGZpZWxkIG9mIHZpZXcgaW4gcmFkaWFuc1xuICogQHBhcmFtIHtudW1iZXJ9IGFzcGVjdCBBc3BlY3QgcmF0aW8uIHR5cGljYWxseSB2aWV3cG9ydCB3aWR0aC9oZWlnaHRcbiAqIEBwYXJhbSB7bnVtYmVyfSBuZWFyIE5lYXIgYm91bmQgb2YgdGhlIGZydXN0dW1cbiAqIEBwYXJhbSB7bnVtYmVyfSBmYXIgRmFyIGJvdW5kIG9mIHRoZSBmcnVzdHVtXG4gKiBAcmV0dXJucyB7TWF0cml4NH0gdGhpcyBmb3IgY2hhaW5pbmdcbiAqL1xubWF0NC5wZXJzcGVjdGl2ZSA9IGZ1bmN0aW9uIChmb3Z5LCBhc3BlY3QsIG5lYXIsIGZhcikge1xuICAgIHZhciBvdXQgPSB0aGlzLnZhbCxcbiAgICAgICAgZiA9IDEuMCAvIE1hdGgudGFuKGZvdnkgLyAyKSxcbiAgICAgICAgbmYgPSAxIC8gKG5lYXIgLSBmYXIpO1xuICAgIG91dFswXSA9IGYgLyBhc3BlY3Q7XG4gICAgb3V0WzFdID0gMDtcbiAgICBvdXRbMl0gPSAwO1xuICAgIG91dFszXSA9IDA7XG4gICAgb3V0WzRdID0gMDtcbiAgICBvdXRbNV0gPSBmO1xuICAgIG91dFs2XSA9IDA7XG4gICAgb3V0WzddID0gMDtcbiAgICBvdXRbOF0gPSAwO1xuICAgIG91dFs5XSA9IDA7XG4gICAgb3V0WzEwXSA9IChmYXIgKyBuZWFyKSAqIG5mO1xuICAgIG91dFsxMV0gPSAtMTtcbiAgICBvdXRbMTJdID0gMDtcbiAgICBvdXRbMTNdID0gMDtcbiAgICBvdXRbMTRdID0gKDIgKiBmYXIgKiBuZWFyKSAqIG5mO1xuICAgIG91dFsxNV0gPSAwO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZW5lcmF0ZXMgYSBvcnRob2dvbmFsIHByb2plY3Rpb24gbWF0cml4IHdpdGggdGhlIGdpdmVuIGJvdW5kc1xuICpcbiAqIEBwYXJhbSB7bnVtYmVyfSBsZWZ0IExlZnQgYm91bmQgb2YgdGhlIGZydXN0dW1cbiAqIEBwYXJhbSB7bnVtYmVyfSByaWdodCBSaWdodCBib3VuZCBvZiB0aGUgZnJ1c3R1bVxuICogQHBhcmFtIHtudW1iZXJ9IGJvdHRvbSBCb3R0b20gYm91bmQgb2YgdGhlIGZydXN0dW1cbiAqIEBwYXJhbSB7bnVtYmVyfSB0b3AgVG9wIGJvdW5kIG9mIHRoZSBmcnVzdHVtXG4gKiBAcGFyYW0ge251bWJlcn0gbmVhciBOZWFyIGJvdW5kIG9mIHRoZSBmcnVzdHVtXG4gKiBAcGFyYW0ge251bWJlcn0gZmFyIEZhciBib3VuZCBvZiB0aGUgZnJ1c3R1bVxuICogQHJldHVybnMge01hdHJpeDR9IHRoaXMgZm9yIGNoYWluaW5nXG4gKi9cbm1hdDQub3J0aG8gPSBmdW5jdGlvbiAobGVmdCwgcmlnaHQsIGJvdHRvbSwgdG9wLCBuZWFyLCBmYXIpIHtcbiAgICB2YXIgb3V0ID0gdGhpcy52YWwsXG4gICAgICAgIGxyID0gMSAvIChsZWZ0IC0gcmlnaHQpLFxuICAgICAgICBidCA9IDEgLyAoYm90dG9tIC0gdG9wKSxcbiAgICAgICAgbmYgPSAxIC8gKG5lYXIgLSBmYXIpO1xuICAgIG91dFswXSA9IC0yICogbHI7XG4gICAgb3V0WzFdID0gMDtcbiAgICBvdXRbMl0gPSAwO1xuICAgIG91dFszXSA9IDA7XG4gICAgb3V0WzRdID0gMDtcbiAgICBvdXRbNV0gPSAtMiAqIGJ0O1xuICAgIG91dFs2XSA9IDA7XG4gICAgb3V0WzddID0gMDtcbiAgICBvdXRbOF0gPSAwO1xuICAgIG91dFs5XSA9IDA7XG4gICAgb3V0WzEwXSA9IDIgKiBuZjtcbiAgICBvdXRbMTFdID0gMDtcbiAgICBvdXRbMTJdID0gKGxlZnQgKyByaWdodCkgKiBscjtcbiAgICBvdXRbMTNdID0gKHRvcCArIGJvdHRvbSkgKiBidDtcbiAgICBvdXRbMTRdID0gKGZhciArIG5lYXIpICogbmY7XG4gICAgb3V0WzE1XSA9IDE7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdlbmVyYXRlcyBhIGxvb2stYXQgbWF0cml4IHdpdGggdGhlIGdpdmVuIGV5ZSBwb3NpdGlvbiwgZm9jYWwgcG9pbnQsIGFuZCB1cCBheGlzXG4gKlxuICogQHBhcmFtIHtWZWN0b3IzfSBleWUgUG9zaXRpb24gb2YgdGhlIHZpZXdlclxuICogQHBhcmFtIHtWZWN0b3IzfSBjZW50ZXIgUG9pbnQgdGhlIHZpZXdlciBpcyBsb29raW5nIGF0XG4gKiBAcGFyYW0ge1ZlY3RvcjN9IHVwIHZlYzMgcG9pbnRpbmcgdXBcbiAqIEByZXR1cm5zIHtNYXRyaXg0fSB0aGlzIGZvciBjaGFpbmluZ1xuICovXG5tYXQ0Lmxvb2tBdCA9IGZ1bmN0aW9uIChleWUsIGNlbnRlciwgdXApIHtcbiAgICB2YXIgb3V0ID0gdGhpcy52YWwsXG5cbiAgICAgICAgeDAsIHgxLCB4MiwgeTAsIHkxLCB5MiwgejAsIHoxLCB6MiwgbGVuLFxuICAgICAgICBleWV4ID0gZXllLngsXG4gICAgICAgIGV5ZXkgPSBleWUueSxcbiAgICAgICAgZXlleiA9IGV5ZS56LFxuICAgICAgICB1cHggPSB1cC54LFxuICAgICAgICB1cHkgPSB1cC55LFxuICAgICAgICB1cHogPSB1cC56LFxuICAgICAgICBjZW50ZXJ4ID0gY2VudGVyLngsXG4gICAgICAgIGNlbnRlcnkgPSBjZW50ZXIueSxcbiAgICAgICAgY2VudGVyeiA9IGNlbnRlci56O1xuXG4gICAgaWYgKE1hdGguYWJzKGV5ZXggLSBjZW50ZXJ4KSA8IEVQU0lMT04gJiZcbiAgICAgICAgTWF0aC5hYnMoZXlleSAtIGNlbnRlcnkpIDwgRVBTSUxPTiAmJlxuICAgICAgICBNYXRoLmFicyhleWV6IC0gY2VudGVyeikgPCBFUFNJTE9OKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmlkZW50aXR5KCk7XG4gICAgfVxuXG4gICAgejAgPSBleWV4IC0gY2VudGVyeDtcbiAgICB6MSA9IGV5ZXkgLSBjZW50ZXJ5O1xuICAgIHoyID0gZXlleiAtIGNlbnRlcno7XG5cbiAgICBsZW4gPSAxIC8gTWF0aC5zcXJ0KHowICogejAgKyB6MSAqIHoxICsgejIgKiB6Mik7XG4gICAgejAgKj0gbGVuO1xuICAgIHoxICo9IGxlbjtcbiAgICB6MiAqPSBsZW47XG5cbiAgICB4MCA9IHVweSAqIHoyIC0gdXB6ICogejE7XG4gICAgeDEgPSB1cHogKiB6MCAtIHVweCAqIHoyO1xuICAgIHgyID0gdXB4ICogejEgLSB1cHkgKiB6MDtcbiAgICBsZW4gPSBNYXRoLnNxcnQoeDAgKiB4MCArIHgxICogeDEgKyB4MiAqIHgyKTtcbiAgICBpZiAoIWxlbikge1xuICAgICAgICB4MCA9IDA7XG4gICAgICAgIHgxID0gMDtcbiAgICAgICAgeDIgPSAwO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGxlbiA9IDEgLyBsZW47XG4gICAgICAgIHgwICo9IGxlbjtcbiAgICAgICAgeDEgKj0gbGVuO1xuICAgICAgICB4MiAqPSBsZW47XG4gICAgfVxuXG4gICAgeTAgPSB6MSAqIHgyIC0gejIgKiB4MTtcbiAgICB5MSA9IHoyICogeDAgLSB6MCAqIHgyO1xuICAgIHkyID0gejAgKiB4MSAtIHoxICogeDA7XG5cbiAgICBsZW4gPSBNYXRoLnNxcnQoeTAgKiB5MCArIHkxICogeTEgKyB5MiAqIHkyKTtcbiAgICBpZiAoIWxlbikge1xuICAgICAgICB5MCA9IDA7XG4gICAgICAgIHkxID0gMDtcbiAgICAgICAgeTIgPSAwO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGxlbiA9IDEgLyBsZW47XG4gICAgICAgIHkwICo9IGxlbjtcbiAgICAgICAgeTEgKj0gbGVuO1xuICAgICAgICB5MiAqPSBsZW47XG4gICAgfVxuXG4gICAgb3V0WzBdID0geDA7XG4gICAgb3V0WzFdID0geTA7XG4gICAgb3V0WzJdID0gejA7XG4gICAgb3V0WzNdID0gMDtcbiAgICBvdXRbNF0gPSB4MTtcbiAgICBvdXRbNV0gPSB5MTtcbiAgICBvdXRbNl0gPSB6MTtcbiAgICBvdXRbN10gPSAwO1xuICAgIG91dFs4XSA9IHgyO1xuICAgIG91dFs5XSA9IHkyO1xuICAgIG91dFsxMF0gPSB6MjtcbiAgICBvdXRbMTFdID0gMDtcbiAgICBvdXRbMTJdID0gLSh4MCAqIGV5ZXggKyB4MSAqIGV5ZXkgKyB4MiAqIGV5ZXopO1xuICAgIG91dFsxM10gPSAtKHkwICogZXlleCArIHkxICogZXlleSArIHkyICogZXlleik7XG4gICAgb3V0WzE0XSA9IC0oejAgKiBleWV4ICsgejEgKiBleWV5ICsgejIgKiBleWV6KTtcbiAgICBvdXRbMTVdID0gMTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuXG5tYXQ0Lm11bCA9IG1hdDQubXVsdGlwbHk7XG5cbm1hdDQuaWR0ID0gbWF0NC5pZGVudGl0eTtcblxuLy9UaGlzIGlzIGhhbmR5IGZvciBQb29sIHV0aWxpdGllcywgdG8gXCJyZXNldFwiIGFcbi8vc2hhcmVkIG9iamVjdCB0byBpdHMgZGVmYXVsdCBzdGF0ZVxubWF0NC5yZXNldCA9IG1hdDQuaWR0O1xuXG5tYXQ0LnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhID0gdGhpcy52YWw7XG4gICAgcmV0dXJuICdNYXRyaXg0KCcgKyBhWzBdICsgJywgJyArIGFbMV0gKyAnLCAnICsgYVsyXSArICcsICcgKyBhWzNdICsgJywgJyArXG4gICAgICAgICAgICAgICAgICAgIGFbNF0gKyAnLCAnICsgYVs1XSArICcsICcgKyBhWzZdICsgJywgJyArIGFbN10gKyAnLCAnICtcbiAgICAgICAgICAgICAgICAgICAgYVs4XSArICcsICcgKyBhWzldICsgJywgJyArIGFbMTBdICsgJywgJyArIGFbMTFdICsgJywgJyArIFxuICAgICAgICAgICAgICAgICAgICBhWzEyXSArICcsICcgKyBhWzEzXSArICcsICcgKyBhWzE0XSArICcsICcgKyBhWzE1XSArICcpJztcbn07XG5cbm1hdDQuc3RyID0gbWF0NC50b1N0cmluZztcblxubW9kdWxlLmV4cG9ydHMgPSBNYXRyaXg0O1xuIiwidmFyIFZlY3RvcjMgPSByZXF1aXJlKCcuL1ZlY3RvcjMnKTtcbnZhciBNYXRyaXgzID0gcmVxdWlyZSgnLi9NYXRyaXgzJyk7XG52YXIgY29tbW9uID0gcmVxdWlyZSgnLi9jb21tb24nKTtcblxuLy9zb21lIHNoYXJlZCAncHJpdmF0ZScgYXJyYXlzXG52YXIgc19pTmV4dCA9ICh0eXBlb2YgSW50OEFycmF5ICE9PSAndW5kZWZpbmVkJyA/IG5ldyBJbnQ4QXJyYXkoWzEsMiwwXSkgOiBbMSwyLDBdKTtcbnZhciB0bXAgPSAodHlwZW9mIEZsb2F0MzJBcnJheSAhPT0gJ3VuZGVmaW5lZCcgPyBuZXcgRmxvYXQzMkFycmF5KFswLDAsMF0pIDogWzAsMCwwXSk7XG5cbnZhciB4VW5pdFZlYzMgPSBuZXcgVmVjdG9yMygxLCAwLCAwKTtcbnZhciB5VW5pdFZlYzMgPSBuZXcgVmVjdG9yMygwLCAxLCAwKTtcbnZhciB0bXB2ZWMgPSBuZXcgVmVjdG9yMygpO1xuXG52YXIgdG1wTWF0MyA9IG5ldyBNYXRyaXgzKCk7XG5cbmZ1bmN0aW9uIFF1YXRlcm5pb24oeCwgeSwgeiwgdykge1xuXHRpZiAodHlwZW9mIHggPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgdGhpcy54ID0geC54fHwwO1xuICAgICAgICB0aGlzLnkgPSB4Lnl8fDA7XG4gICAgICAgIHRoaXMueiA9IHguenx8MDtcbiAgICAgICAgdGhpcy53ID0geC53fHwwO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMueCA9IHh8fDA7XG4gICAgICAgIHRoaXMueSA9IHl8fDA7XG4gICAgICAgIHRoaXMueiA9IHp8fDA7XG4gICAgICAgIHRoaXMudyA9IHd8fDA7XG4gICAgfVxufVxuXG52YXIgcXVhdCA9IFF1YXRlcm5pb24ucHJvdG90eXBlO1xuXG4vL21peGluIGNvbW1vbiBmdW5jdGlvbnNcbmZvciAodmFyIGsgaW4gY29tbW9uKSB7XG4gICAgcXVhdFtrXSA9IGNvbW1vbltrXTtcbn1cblxucXVhdC5yb3RhdGlvblRvID0gZnVuY3Rpb24oYSwgYikge1xuICAgIHZhciBkb3QgPSBhLnggKiBiLnggKyBhLnkgKiBiLnkgKyBhLnogKiBiLno7IC8vYS5kb3QoYilcbiAgICBpZiAoZG90IDwgLTAuOTk5OTk5KSB7XG4gICAgICAgIGlmICh0bXB2ZWMuY29weSh4VW5pdFZlYzMpLmNyb3NzKGEpLmxlbigpIDwgMC4wMDAwMDEpXG4gICAgICAgICAgICB0bXB2ZWMuY29weSh5VW5pdFZlYzMpLmNyb3NzKGEpO1xuICAgICAgICBcbiAgICAgICAgdG1wdmVjLm5vcm1hbGl6ZSgpO1xuICAgICAgICByZXR1cm4gdGhpcy5zZXRBeGlzQW5nbGUodG1wdmVjLCBNYXRoLlBJKTtcbiAgICB9IGVsc2UgaWYgKGRvdCA+IDAuOTk5OTk5KSB7XG4gICAgICAgIHRoaXMueCA9IDA7XG4gICAgICAgIHRoaXMueSA9IDA7XG4gICAgICAgIHRoaXMueiA9IDA7XG4gICAgICAgIHRoaXMudyA9IDE7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRtcHZlYy5jb3B5KGEpLmNyb3NzKGIpO1xuICAgICAgICB0aGlzLnggPSB0bXB2ZWMueDtcbiAgICAgICAgdGhpcy55ID0gdG1wdmVjLnk7XG4gICAgICAgIHRoaXMueiA9IHRtcHZlYy56O1xuICAgICAgICB0aGlzLncgPSAxICsgZG90O1xuICAgICAgICByZXR1cm4gdGhpcy5ub3JtYWxpemUoKTtcbiAgICB9XG59O1xuXG5xdWF0LnNldEF4ZXMgPSBmdW5jdGlvbih2aWV3LCByaWdodCwgdXApIHtcbiAgICB2YXIgbSA9IHRtcE1hdDMudmFsO1xuICAgIG1bMF0gPSByaWdodC54O1xuICAgIG1bM10gPSByaWdodC55O1xuICAgIG1bNl0gPSByaWdodC56O1xuXG4gICAgbVsxXSA9IHVwLng7XG4gICAgbVs0XSA9IHVwLnk7XG4gICAgbVs3XSA9IHVwLno7XG5cbiAgICBtWzJdID0gLXZpZXcueDtcbiAgICBtWzVdID0gLXZpZXcueTtcbiAgICBtWzhdID0gLXZpZXcuejtcblxuICAgIHJldHVybiB0aGlzLmZyb21NYXQzKHRtcE1hdDMpLm5vcm1hbGl6ZSgpO1xufTtcblxucXVhdC5pZGVudGl0eSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMueCA9IHRoaXMueSA9IHRoaXMueiA9IDA7XG4gICAgdGhpcy53ID0gMTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnF1YXQuc2V0QXhpc0FuZ2xlID0gZnVuY3Rpb24oYXhpcywgcmFkKSB7XG4gICAgcmFkID0gcmFkICogMC41O1xuICAgIHZhciBzID0gTWF0aC5zaW4ocmFkKTtcbiAgICB0aGlzLnggPSBzICogYXhpcy54O1xuICAgIHRoaXMueSA9IHMgKiBheGlzLnk7XG4gICAgdGhpcy56ID0gcyAqIGF4aXMuejtcbiAgICB0aGlzLncgPSBNYXRoLmNvcyhyYWQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxucXVhdC5tdWx0aXBseSA9IGZ1bmN0aW9uKGIpIHtcbiAgICB2YXIgYXggPSB0aGlzLngsIGF5ID0gdGhpcy55LCBheiA9IHRoaXMueiwgYXcgPSB0aGlzLncsXG4gICAgICAgIGJ4ID0gYi54LCBieSA9IGIueSwgYnogPSBiLnosIGJ3ID0gYi53O1xuXG4gICAgdGhpcy54ID0gYXggKiBidyArIGF3ICogYnggKyBheSAqIGJ6IC0gYXogKiBieTtcbiAgICB0aGlzLnkgPSBheSAqIGJ3ICsgYXcgKiBieSArIGF6ICogYnggLSBheCAqIGJ6O1xuICAgIHRoaXMueiA9IGF6ICogYncgKyBhdyAqIGJ6ICsgYXggKiBieSAtIGF5ICogYng7XG4gICAgdGhpcy53ID0gYXcgKiBidyAtIGF4ICogYnggLSBheSAqIGJ5IC0gYXogKiBiejtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnF1YXQuc2xlcnAgPSBmdW5jdGlvbiAoYiwgdCkge1xuICAgIC8vIGJlbmNobWFya3M6XG4gICAgLy8gICAgaHR0cDovL2pzcGVyZi5jb20vcXVhdGVybmlvbi1zbGVycC1pbXBsZW1lbnRhdGlvbnNcblxuICAgIHZhciBheCA9IHRoaXMueCwgYXkgPSB0aGlzLnksIGF6ID0gdGhpcy55LCBhdyA9IHRoaXMueSxcbiAgICAgICAgYnggPSBiLngsIGJ5ID0gYi55LCBieiA9IGIueiwgYncgPSBiLnc7XG5cbiAgICB2YXIgICAgICAgIG9tZWdhLCBjb3NvbSwgc2lub20sIHNjYWxlMCwgc2NhbGUxO1xuXG4gICAgLy8gY2FsYyBjb3NpbmVcbiAgICBjb3NvbSA9IGF4ICogYnggKyBheSAqIGJ5ICsgYXogKiBieiArIGF3ICogYnc7XG4gICAgLy8gYWRqdXN0IHNpZ25zIChpZiBuZWNlc3NhcnkpXG4gICAgaWYgKCBjb3NvbSA8IDAuMCApIHtcbiAgICAgICAgY29zb20gPSAtY29zb207XG4gICAgICAgIGJ4ID0gLSBieDtcbiAgICAgICAgYnkgPSAtIGJ5O1xuICAgICAgICBieiA9IC0gYno7XG4gICAgICAgIGJ3ID0gLSBidztcbiAgICB9XG4gICAgLy8gY2FsY3VsYXRlIGNvZWZmaWNpZW50c1xuICAgIGlmICggKDEuMCAtIGNvc29tKSA+IDAuMDAwMDAxICkge1xuICAgICAgICAvLyBzdGFuZGFyZCBjYXNlIChzbGVycClcbiAgICAgICAgb21lZ2EgID0gTWF0aC5hY29zKGNvc29tKTtcbiAgICAgICAgc2lub20gID0gTWF0aC5zaW4ob21lZ2EpO1xuICAgICAgICBzY2FsZTAgPSBNYXRoLnNpbigoMS4wIC0gdCkgKiBvbWVnYSkgLyBzaW5vbTtcbiAgICAgICAgc2NhbGUxID0gTWF0aC5zaW4odCAqIG9tZWdhKSAvIHNpbm9tO1xuICAgIH0gZWxzZSB7ICAgICAgICBcbiAgICAgICAgLy8gXCJmcm9tXCIgYW5kIFwidG9cIiBxdWF0ZXJuaW9ucyBhcmUgdmVyeSBjbG9zZSBcbiAgICAgICAgLy8gIC4uLiBzbyB3ZSBjYW4gZG8gYSBsaW5lYXIgaW50ZXJwb2xhdGlvblxuICAgICAgICBzY2FsZTAgPSAxLjAgLSB0O1xuICAgICAgICBzY2FsZTEgPSB0O1xuICAgIH1cbiAgICAvLyBjYWxjdWxhdGUgZmluYWwgdmFsdWVzXG4gICAgdGhpcy54ID0gc2NhbGUwICogYXggKyBzY2FsZTEgKiBieDtcbiAgICB0aGlzLnkgPSBzY2FsZTAgKiBheSArIHNjYWxlMSAqIGJ5O1xuICAgIHRoaXMueiA9IHNjYWxlMCAqIGF6ICsgc2NhbGUxICogYno7XG4gICAgdGhpcy53ID0gc2NhbGUwICogYXcgKyBzY2FsZTEgKiBidztcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnF1YXQuaW52ZXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGEwID0gdGhpcy54LCBhMSA9IHRoaXMueSwgYTIgPSB0aGlzLnosIGEzID0gdGhpcy53LFxuICAgICAgICBkb3QgPSBhMCphMCArIGExKmExICsgYTIqYTIgKyBhMyphMyxcbiAgICAgICAgaW52RG90ID0gZG90ID8gMS4wL2RvdCA6IDA7XG4gICAgXG4gICAgLy8gVE9ETzogV291bGQgYmUgZmFzdGVyIHRvIHJldHVybiBbMCwwLDAsMF0gaW1tZWRpYXRlbHkgaWYgZG90ID09IDBcblxuICAgIHRoaXMueCA9IC1hMCppbnZEb3Q7XG4gICAgdGhpcy55ID0gLWExKmludkRvdDtcbiAgICB0aGlzLnogPSAtYTIqaW52RG90O1xuICAgIHRoaXMudyA9IGEzKmludkRvdDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnF1YXQuY29uanVnYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy54ID0gLXRoaXMueDtcbiAgICB0aGlzLnkgPSAtdGhpcy55O1xuICAgIHRoaXMueiA9IC10aGlzLno7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5xdWF0LnJvdGF0ZVggPSBmdW5jdGlvbiAocmFkKSB7XG4gICAgcmFkICo9IDAuNTsgXG5cbiAgICB2YXIgYXggPSB0aGlzLngsIGF5ID0gdGhpcy55LCBheiA9IHRoaXMueiwgYXcgPSB0aGlzLncsXG4gICAgICAgIGJ4ID0gTWF0aC5zaW4ocmFkKSwgYncgPSBNYXRoLmNvcyhyYWQpO1xuXG4gICAgdGhpcy54ID0gYXggKiBidyArIGF3ICogYng7XG4gICAgdGhpcy55ID0gYXkgKiBidyArIGF6ICogYng7XG4gICAgdGhpcy56ID0gYXogKiBidyAtIGF5ICogYng7XG4gICAgdGhpcy53ID0gYXcgKiBidyAtIGF4ICogYng7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5xdWF0LnJvdGF0ZVkgPSBmdW5jdGlvbiAocmFkKSB7XG4gICAgcmFkICo9IDAuNTsgXG5cbiAgICB2YXIgYXggPSB0aGlzLngsIGF5ID0gdGhpcy55LCBheiA9IHRoaXMueiwgYXcgPSB0aGlzLncsXG4gICAgICAgIGJ5ID0gTWF0aC5zaW4ocmFkKSwgYncgPSBNYXRoLmNvcyhyYWQpO1xuXG4gICAgdGhpcy54ID0gYXggKiBidyAtIGF6ICogYnk7XG4gICAgdGhpcy55ID0gYXkgKiBidyArIGF3ICogYnk7XG4gICAgdGhpcy56ID0gYXogKiBidyArIGF4ICogYnk7XG4gICAgdGhpcy53ID0gYXcgKiBidyAtIGF5ICogYnk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5xdWF0LnJvdGF0ZVogPSBmdW5jdGlvbiAocmFkKSB7XG4gICAgcmFkICo9IDAuNTsgXG5cbiAgICB2YXIgYXggPSB0aGlzLngsIGF5ID0gdGhpcy55LCBheiA9IHRoaXMueiwgYXcgPSB0aGlzLncsXG4gICAgICAgIGJ6ID0gTWF0aC5zaW4ocmFkKSwgYncgPSBNYXRoLmNvcyhyYWQpO1xuXG4gICAgdGhpcy54ID0gYXggKiBidyArIGF5ICogYno7XG4gICAgdGhpcy55ID0gYXkgKiBidyAtIGF4ICogYno7XG4gICAgdGhpcy56ID0gYXogKiBidyArIGF3ICogYno7XG4gICAgdGhpcy53ID0gYXcgKiBidyAtIGF6ICogYno7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5xdWF0LmNhbGN1bGF0ZVcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHggPSB0aGlzLngsIHkgPSB0aGlzLnksIHogPSB0aGlzLno7XG5cbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy56ID0gejtcbiAgICB0aGlzLncgPSAtTWF0aC5zcXJ0KE1hdGguYWJzKDEuMCAtIHggKiB4IC0geSAqIHkgLSB6ICogeikpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxucXVhdC5mcm9tTWF0MyA9IGZ1bmN0aW9uKG1hdCkge1xuICAgIC8vIGJlbmNobWFya3M6XG4gICAgLy8gICAgaHR0cDovL2pzcGVyZi5jb20vdHlwZWQtYXJyYXktYWNjZXNzLXNwZWVkXG4gICAgLy8gICAgaHR0cDovL2pzcGVyZi5jb20vY29udmVyc2lvbi1vZi0zeDMtbWF0cml4LXRvLXF1YXRlcm5pb25cblxuICAgIC8vIEFsZ29yaXRobSBpbiBLZW4gU2hvZW1ha2UncyBhcnRpY2xlIGluIDE5ODcgU0lHR1JBUEggY291cnNlIG5vdGVzXG4gICAgLy8gYXJ0aWNsZSBcIlF1YXRlcm5pb24gQ2FsY3VsdXMgYW5kIEZhc3QgQW5pbWF0aW9uXCIuXG4gICAgdmFyIG0gPSBtYXQudmFsLFxuICAgICAgICBmVHJhY2UgPSBtWzBdICsgbVs0XSArIG1bOF07XG4gICAgdmFyIGZSb290O1xuXG4gICAgaWYgKCBmVHJhY2UgPiAwLjAgKSB7XG4gICAgICAgIC8vIHx3fCA+IDEvMiwgbWF5IGFzIHdlbGwgY2hvb3NlIHcgPiAxLzJcbiAgICAgICAgZlJvb3QgPSBNYXRoLnNxcnQoZlRyYWNlICsgMS4wKTsgIC8vIDJ3XG4gICAgICAgIHRoaXMudyA9IDAuNSAqIGZSb290O1xuICAgICAgICBmUm9vdCA9IDAuNS9mUm9vdDsgIC8vIDEvKDR3KVxuICAgICAgICB0aGlzLnggPSAobVs3XS1tWzVdKSpmUm9vdDtcbiAgICAgICAgdGhpcy55ID0gKG1bMl0tbVs2XSkqZlJvb3Q7XG4gICAgICAgIHRoaXMueiA9IChtWzNdLW1bMV0pKmZSb290O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHx3fCA8PSAxLzJcbiAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICBpZiAoIG1bNF0gPiBtWzBdIClcbiAgICAgICAgICBpID0gMTtcbiAgICAgICAgaWYgKCBtWzhdID4gbVtpKjMraV0gKVxuICAgICAgICAgIGkgPSAyO1xuICAgICAgICB2YXIgaiA9IHNfaU5leHRbaV07XG4gICAgICAgIHZhciBrID0gc19pTmV4dFtqXTtcbiAgICAgICAgICAgIFxuICAgICAgICAvL1RoaXMgaXNuJ3QgcXVpdGUgYXMgY2xlYW4gd2l0aG91dCBhcnJheSBhY2Nlc3MuLi5cbiAgICAgICAgZlJvb3QgPSBNYXRoLnNxcnQobVtpKjMraV0tbVtqKjMral0tbVtrKjMra10gKyAxLjApO1xuICAgICAgICB0bXBbaV0gPSAwLjUgKiBmUm9vdDtcblxuICAgICAgICBmUm9vdCA9IDAuNSAvIGZSb290O1xuICAgICAgICB0bXBbal0gPSAobVtqKjMraV0gKyBtW2kqMytqXSkgKiBmUm9vdDtcbiAgICAgICAgdG1wW2tdID0gKG1bayozK2ldICsgbVtpKjMra10pICogZlJvb3Q7XG5cbiAgICAgICAgdGhpcy54ID0gdG1wWzBdO1xuICAgICAgICB0aGlzLnkgPSB0bXBbMV07XG4gICAgICAgIHRoaXMueiA9IHRtcFsyXTtcbiAgICAgICAgdGhpcy53ID0gKG1bayozK2pdIC0gbVtqKjMra10pICogZlJvb3Q7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiB0aGlzO1xufTtcblxucXVhdC5pZHQgPSBxdWF0LmlkZW50aXR5O1xuXG5xdWF0LnN1YiA9IHF1YXQuc3VidHJhY3Q7XG5cbnF1YXQubXVsID0gcXVhdC5tdWx0aXBseTtcblxucXVhdC5sZW4gPSBxdWF0Lmxlbmd0aDtcblxucXVhdC5sZW5TcSA9IHF1YXQubGVuZ3RoU3E7XG5cbi8vVGhpcyBpcyBoYW5keSBmb3IgUG9vbCB1dGlsaXRpZXMsIHRvIFwicmVzZXRcIiBhXG4vL3NoYXJlZCBvYmplY3QgdG8gaXRzIGRlZmF1bHQgc3RhdGVcbnF1YXQucmVzZXQgPSBxdWF0LmlkdDtcblxuXG5xdWF0LnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICdRdWF0ZXJuaW9uKCcgKyB0aGlzLnggKyAnLCAnICsgdGhpcy55ICsgJywgJyArIHRoaXMueiArICcsICcgKyB0aGlzLncgKyAnKSc7XG59O1xuXG5xdWF0LnN0ciA9IHF1YXQudG9TdHJpbmc7XG5cbm1vZHVsZS5leHBvcnRzID0gUXVhdGVybmlvbjsiLCJmdW5jdGlvbiBWZWN0b3IyKHgsIHkpIHtcblx0aWYgKHR5cGVvZiB4ID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgIHRoaXMueCA9IHgueHx8MDtcbiAgICAgICAgdGhpcy55ID0geC55fHwwO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMueCA9IHh8fDA7XG4gICAgICAgIHRoaXMueSA9IHl8fDA7XG4gICAgfVxufVxuXG4vL3Nob3J0aGFuZCBpdCBmb3IgYmV0dGVyIG1pbmlmaWNhdGlvblxudmFyIHZlYzIgPSBWZWN0b3IyLnByb3RvdHlwZTtcblxuLyoqXG4gKiBSZXR1cm5zIGEgbmV3IGluc3RhbmNlIG9mIFZlY3RvcjIgd2l0aFxuICogdGhpcyB2ZWN0b3IncyBjb21wb25lbnRzLiBcbiAqIEByZXR1cm4ge1ZlY3RvcjJ9IGEgY2xvbmUgb2YgdGhpcyB2ZWN0b3JcbiAqL1xudmVjMi5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgVmVjdG9yMih0aGlzLngsIHRoaXMueSk7XG59O1xuXG4vKipcbiAqIENvcGllcyB0aGUgeCwgeSBjb21wb25lbnRzIGZyb20gdGhlIHNwZWNpZmllZFxuICogVmVjdG9yLiBBbnkgdW5kZWZpbmVkIGNvbXBvbmVudHMgZnJvbSBgb3RoZXJWZWNgXG4gKiB3aWxsIGRlZmF1bHQgdG8gemVyby5cbiAqIFxuICogQHBhcmFtICB7b3RoZXJWZWN9IHRoZSBvdGhlciBWZWN0b3IyIHRvIGNvcHlcbiAqIEByZXR1cm4ge1ZlY3RvcjJ9ICB0aGlzLCBmb3IgY2hhaW5pbmdcbiAqL1xudmVjMi5jb3B5ID0gZnVuY3Rpb24ob3RoZXJWZWMpIHtcbiAgICB0aGlzLnggPSBvdGhlclZlYy54fHwwO1xuICAgIHRoaXMueSA9IG90aGVyVmVjLnl8fDA7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEEgY29udmVuaWVuY2UgZnVuY3Rpb24gdG8gc2V0IHRoZSBjb21wb25lbnRzIG9mXG4gKiB0aGlzIHZlY3RvciBhcyB4IGFuZCB5LiBGYWxzeSBvciB1bmRlZmluZWRcbiAqIHBhcmFtZXRlcnMgd2lsbCBkZWZhdWx0IHRvIHplcm8uXG4gKlxuICogWW91IGNhbiBhbHNvIHBhc3MgYSB2ZWN0b3Igb2JqZWN0IGluc3RlYWQgb2ZcbiAqIGluZGl2aWR1YWwgY29tcG9uZW50cywgdG8gY29weSB0aGUgb2JqZWN0J3MgY29tcG9uZW50cy5cbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IHggdGhlIHggY29tcG9uZW50XG4gKiBAcGFyYW0ge051bWJlcn0geSB0aGUgeSBjb21wb25lbnRcbiAqIEByZXR1cm4ge1ZlY3RvcjJ9ICB0aGlzLCBmb3IgY2hhaW5pbmdcbiAqL1xudmVjMi5zZXQgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgaWYgKHR5cGVvZiB4ID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgIHRoaXMueCA9IHgueHx8MDtcbiAgICAgICAgdGhpcy55ID0geC55fHwwO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMueCA9IHh8fDA7XG4gICAgICAgIHRoaXMueSA9IHl8fDA7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMi5hZGQgPSBmdW5jdGlvbih2KSB7XG4gICAgdGhpcy54ICs9IHYueDtcbiAgICB0aGlzLnkgKz0gdi55O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMi5zdWJ0cmFjdCA9IGZ1bmN0aW9uKHYpIHtcbiAgICB0aGlzLnggLT0gdi54O1xuICAgIHRoaXMueSAtPSB2Lnk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMyLm11bHRpcGx5ID0gZnVuY3Rpb24odikge1xuICAgIHRoaXMueCAqPSB2Lng7XG4gICAgdGhpcy55ICo9IHYueTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzIuc2NhbGUgPSBmdW5jdGlvbihzKSB7XG4gICAgdGhpcy54ICo9IHM7XG4gICAgdGhpcy55ICo9IHM7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMyLmRpdmlkZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICB0aGlzLnggLz0gdi54O1xuICAgIHRoaXMueSAvPSB2Lnk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMyLm5lZ2F0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMueCA9IC10aGlzLng7XG4gICAgdGhpcy55ID0gLXRoaXMueTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzIuZGlzdGFuY2UgPSBmdW5jdGlvbih2KSB7XG4gICAgdmFyIGR4ID0gdi54IC0gdGhpcy54LFxuICAgICAgICBkeSA9IHYueSAtIHRoaXMueTtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KGR4KmR4ICsgZHkqZHkpO1xufTtcblxudmVjMi5kaXN0YW5jZVNxID0gZnVuY3Rpb24odikge1xuICAgIHZhciBkeCA9IHYueCAtIHRoaXMueCxcbiAgICAgICAgZHkgPSB2LnkgLSB0aGlzLnk7XG4gICAgcmV0dXJuIGR4KmR4ICsgZHkqZHk7XG59O1xuXG52ZWMyLmxlbmd0aCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB4ID0gdGhpcy54LFxuICAgICAgICB5ID0gdGhpcy55O1xuICAgIHJldHVybiBNYXRoLnNxcnQoeCp4ICsgeSp5KTtcbn07XG5cbnZlYzIubGVuZ3RoU3EgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgeCA9IHRoaXMueCxcbiAgICAgICAgeSA9IHRoaXMueTtcbiAgICByZXR1cm4geCp4ICsgeSp5O1xufTtcblxudmVjMi5ub3JtYWxpemUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgeCA9IHRoaXMueCxcbiAgICAgICAgeSA9IHRoaXMueTtcbiAgICB2YXIgbGVuID0geCp4ICsgeSp5O1xuICAgIGlmIChsZW4gPiAwKSB7XG4gICAgICAgIGxlbiA9IDEgLyBNYXRoLnNxcnQobGVuKTtcbiAgICAgICAgdGhpcy54ID0geCpsZW47XG4gICAgICAgIHRoaXMueSA9IHkqbGVuO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzIuZG90ID0gZnVuY3Rpb24odikge1xuICAgIHJldHVybiB0aGlzLnggKiB2LnggKyB0aGlzLnkgKiB2Lnk7XG59O1xuXG4vL1VubGlrZSBWZWN0b3IzLCB0aGlzIHJldHVybnMgYSBzY2FsYXJcbi8vaHR0cDovL2FsbGVuY2hvdS5uZXQvMjAxMy8wNy9jcm9zcy1wcm9kdWN0LW9mLTJkLXZlY3RvcnMvXG52ZWMyLmNyb3NzID0gZnVuY3Rpb24odikge1xuICAgIHJldHVybiB0aGlzLnggKiB2LnkgLSB0aGlzLnkgKiB2Lng7XG59O1xuXG52ZWMyLmxlcnAgPSBmdW5jdGlvbih2LCB0KSB7XG4gICAgdmFyIGF4ID0gdGhpcy54LFxuICAgICAgICBheSA9IHRoaXMueTtcbiAgICB0ID0gdHx8MDtcbiAgICB0aGlzLnggPSBheCArIHQgKiAodi54IC0gYXgpO1xuICAgIHRoaXMueSA9IGF5ICsgdCAqICh2LnkgLSBheSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMyLnRyYW5zZm9ybU1hdDMgPSBmdW5jdGlvbihtYXQpIHtcbiAgICB2YXIgeCA9IHRoaXMueCwgeSA9IHRoaXMueSwgbSA9IG1hdC52YWw7XG4gICAgdGhpcy54ID0gbVswXSAqIHggKyBtWzJdICogeSArIG1bNF07XG4gICAgdGhpcy55ID0gbVsxXSAqIHggKyBtWzNdICogeSArIG1bNV07XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMyLnRyYW5zZm9ybU1hdDQgPSBmdW5jdGlvbihtYXQpIHtcbiAgICB2YXIgeCA9IHRoaXMueCwgXG4gICAgICAgIHkgPSB0aGlzLnksXG4gICAgICAgIG0gPSBtYXQudmFsO1xuICAgIHRoaXMueCA9IG1bMF0gKiB4ICsgbVs0XSAqIHkgKyBtWzEyXTtcbiAgICB0aGlzLnkgPSBtWzFdICogeCArIG1bNV0gKiB5ICsgbVsxM107XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMyLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy54ID0gMDtcbiAgICB0aGlzLnkgPSAwO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMi5zdWIgPSB2ZWMyLnN1YnRyYWN0O1xuXG52ZWMyLm11bCA9IHZlYzIubXVsdGlwbHk7XG5cbnZlYzIuZGl2ID0gdmVjMi5kaXZpZGU7XG5cbnZlYzIuZGlzdCA9IHZlYzIuZGlzdGFuY2U7XG5cbnZlYzIuZGlzdFNxID0gdmVjMi5kaXN0YW5jZVNxO1xuXG52ZWMyLmxlbiA9IHZlYzIubGVuZ3RoO1xuXG52ZWMyLmxlblNxID0gdmVjMi5sZW5ndGhTcTtcblxudmVjMi50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAnVmVjdG9yMignICsgdGhpcy54ICsgJywgJyArIHRoaXMueSArICcpJztcbn07XG5cbnZlYzIucmFuZG9tID0gZnVuY3Rpb24oc2NhbGUpIHtcbiAgICBzY2FsZSA9IHNjYWxlIHx8IDEuMDtcbiAgICB2YXIgciA9IE1hdGgucmFuZG9tKCkgKiAyLjAgKiBNYXRoLlBJO1xuICAgIHRoaXMueCA9IE1hdGguY29zKHIpICogc2NhbGU7XG4gICAgdGhpcy55ID0gTWF0aC5zaW4ocikgKiBzY2FsZTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzIuc3RyID0gdmVjMi50b1N0cmluZztcblxubW9kdWxlLmV4cG9ydHMgPSBWZWN0b3IyOyIsImZ1bmN0aW9uIFZlY3RvcjMoeCwgeSwgeikge1xuICAgIGlmICh0eXBlb2YgeCA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICB0aGlzLnggPSB4Lnh8fDA7XG4gICAgICAgIHRoaXMueSA9IHgueXx8MDtcbiAgICAgICAgdGhpcy56ID0geC56fHwwO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMueCA9IHh8fDA7XG4gICAgICAgIHRoaXMueSA9IHl8fDA7XG4gICAgICAgIHRoaXMueiA9IHp8fDA7XG4gICAgfVxufVxuXG4vL3Nob3J0aGFuZCBpdCBmb3IgYmV0dGVyIG1pbmlmaWNhdGlvblxudmFyIHZlYzMgPSBWZWN0b3IzLnByb3RvdHlwZTtcblxudmVjMy5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgVmVjdG9yMyh0aGlzLngsIHRoaXMueSwgdGhpcy56KTtcbn07XG5cbnZlYzMuY29weSA9IGZ1bmN0aW9uKG90aGVyVmVjKSB7XG4gICAgdGhpcy54ID0gb3RoZXJWZWMueDtcbiAgICB0aGlzLnkgPSBvdGhlclZlYy55O1xuICAgIHRoaXMueiA9IG90aGVyVmVjLno7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMzLnNldCA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICBpZiAodHlwZW9mIHggPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgdGhpcy54ID0geC54fHwwO1xuICAgICAgICB0aGlzLnkgPSB4Lnl8fDA7XG4gICAgICAgIHRoaXMueiA9IHguenx8MDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnggPSB4fHwwO1xuICAgICAgICB0aGlzLnkgPSB5fHwwO1xuICAgICAgICB0aGlzLnogPSB6fHwwO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzMuYWRkID0gZnVuY3Rpb24odikge1xuICAgIHRoaXMueCArPSB2Lng7XG4gICAgdGhpcy55ICs9IHYueTtcbiAgICB0aGlzLnogKz0gdi56O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMy5zdWJ0cmFjdCA9IGZ1bmN0aW9uKHYpIHtcbiAgICB0aGlzLnggLT0gdi54O1xuICAgIHRoaXMueSAtPSB2Lnk7XG4gICAgdGhpcy56IC09IHYuejtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzMubXVsdGlwbHkgPSBmdW5jdGlvbih2KSB7XG4gICAgdGhpcy54ICo9IHYueDtcbiAgICB0aGlzLnkgKj0gdi55O1xuICAgIHRoaXMueiAqPSB2Lno7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMzLnNjYWxlID0gZnVuY3Rpb24ocykge1xuICAgIHRoaXMueCAqPSBzO1xuICAgIHRoaXMueSAqPSBzO1xuICAgIHRoaXMueiAqPSBzO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMy5kaXZpZGUgPSBmdW5jdGlvbih2KSB7XG4gICAgdGhpcy54IC89IHYueDtcbiAgICB0aGlzLnkgLz0gdi55O1xuICAgIHRoaXMueiAvPSB2Lno7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMzLm5lZ2F0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMueCA9IC10aGlzLng7XG4gICAgdGhpcy55ID0gLXRoaXMueTtcbiAgICB0aGlzLnogPSAtdGhpcy56O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMy5kaXN0YW5jZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICB2YXIgZHggPSB2LnggLSB0aGlzLngsXG4gICAgICAgIGR5ID0gdi55IC0gdGhpcy55LFxuICAgICAgICBkeiA9IHYueiAtIHRoaXMuejtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KGR4KmR4ICsgZHkqZHkgKyBkeipkeik7XG59O1xuXG52ZWMzLmRpc3RhbmNlU3EgPSBmdW5jdGlvbih2KSB7XG4gICAgdmFyIGR4ID0gdi54IC0gdGhpcy54LFxuICAgICAgICBkeSA9IHYueSAtIHRoaXMueSxcbiAgICAgICAgZHogPSB2LnogLSB0aGlzLno7XG4gICAgcmV0dXJuIGR4KmR4ICsgZHkqZHkgKyBkeipkejtcbn07XG5cbnZlYzMubGVuZ3RoID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHggPSB0aGlzLngsXG4gICAgICAgIHkgPSB0aGlzLnksXG4gICAgICAgIHogPSB0aGlzLno7XG4gICAgcmV0dXJuIE1hdGguc3FydCh4KnggKyB5KnkgKyB6KnopO1xufTtcblxudmVjMy5sZW5ndGhTcSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB4ID0gdGhpcy54LFxuICAgICAgICB5ID0gdGhpcy55LFxuICAgICAgICB6ID0gdGhpcy56O1xuICAgIHJldHVybiB4KnggKyB5KnkgKyB6Kno7XG59O1xuXG52ZWMzLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB4ID0gdGhpcy54LFxuICAgICAgICB5ID0gdGhpcy55LFxuICAgICAgICB6ID0gdGhpcy56O1xuICAgIHZhciBsZW4gPSB4KnggKyB5KnkgKyB6Kno7XG4gICAgaWYgKGxlbiA+IDApIHtcbiAgICAgICAgbGVuID0gMSAvIE1hdGguc3FydChsZW4pO1xuICAgICAgICB0aGlzLnggPSB4KmxlbjtcbiAgICAgICAgdGhpcy55ID0geSpsZW47XG4gICAgICAgIHRoaXMueiA9IHoqbGVuO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzMuZG90ID0gZnVuY3Rpb24odikge1xuICAgIHJldHVybiB0aGlzLnggKiB2LnggKyB0aGlzLnkgKiB2LnkgKyB0aGlzLnogKiB2Lno7XG59O1xuXG52ZWMzLmNyb3NzID0gZnVuY3Rpb24odikge1xuICAgIHZhciBheCA9IHRoaXMueCwgYXkgPSB0aGlzLnksIGF6ID0gdGhpcy56LFxuICAgICAgICBieCA9IHYueCwgYnkgPSB2LnksIGJ6ID0gdi56O1xuXG4gICAgdGhpcy54ID0gYXkgKiBieiAtIGF6ICogYnk7XG4gICAgdGhpcy55ID0gYXogKiBieCAtIGF4ICogYno7XG4gICAgdGhpcy56ID0gYXggKiBieSAtIGF5ICogYng7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMzLmxlcnAgPSBmdW5jdGlvbih2LCB0KSB7XG4gICAgdmFyIGF4ID0gdGhpcy54LFxuICAgICAgICBheSA9IHRoaXMueSxcbiAgICAgICAgYXogPSB0aGlzLno7XG4gICAgdCA9IHR8fDA7XG4gICAgdGhpcy54ID0gYXggKyB0ICogKHYueCAtIGF4KTtcbiAgICB0aGlzLnkgPSBheSArIHQgKiAodi55IC0gYXkpO1xuICAgIHRoaXMueiA9IGF6ICsgdCAqICh2LnogLSBheik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMzLnRyYW5zZm9ybU1hdDQgPSBmdW5jdGlvbihtYXQpIHtcbiAgICB2YXIgeCA9IHRoaXMueCwgeSA9IHRoaXMueSwgeiA9IHRoaXMueiwgbSA9IG1hdC52YWw7XG4gICAgdGhpcy54ID0gbVswXSAqIHggKyBtWzRdICogeSArIG1bOF0gKiB6ICsgbVsxMl07XG4gICAgdGhpcy55ID0gbVsxXSAqIHggKyBtWzVdICogeSArIG1bOV0gKiB6ICsgbVsxM107XG4gICAgdGhpcy56ID0gbVsyXSAqIHggKyBtWzZdICogeSArIG1bMTBdICogeiArIG1bMTRdO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMy50cmFuc2Zvcm1NYXQzID0gZnVuY3Rpb24obWF0KSB7XG4gICAgdmFyIHggPSB0aGlzLngsIHkgPSB0aGlzLnksIHogPSB0aGlzLnosIG0gPSBtYXQudmFsO1xuICAgIHRoaXMueCA9IHggKiBtWzBdICsgeSAqIG1bM10gKyB6ICogbVs2XTtcbiAgICB0aGlzLnkgPSB4ICogbVsxXSArIHkgKiBtWzRdICsgeiAqIG1bN107XG4gICAgdGhpcy56ID0geCAqIG1bMl0gKyB5ICogbVs1XSArIHogKiBtWzhdO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMy50cmFuc2Zvcm1RdWF0ID0gZnVuY3Rpb24ocSkge1xuICAgIC8vIGJlbmNobWFya3M6IGh0dHA6Ly9qc3BlcmYuY29tL3F1YXRlcm5pb24tdHJhbnNmb3JtLXZlYzMtaW1wbGVtZW50YXRpb25zXG4gICAgdmFyIHggPSB0aGlzLngsIHkgPSB0aGlzLnksIHogPSB0aGlzLnosXG4gICAgICAgIHF4ID0gcS54LCBxeSA9IHEueSwgcXogPSBxLnosIHF3ID0gcS53LFxuXG4gICAgICAgIC8vIGNhbGN1bGF0ZSBxdWF0ICogdmVjXG4gICAgICAgIGl4ID0gcXcgKiB4ICsgcXkgKiB6IC0gcXogKiB5LFxuICAgICAgICBpeSA9IHF3ICogeSArIHF6ICogeCAtIHF4ICogeixcbiAgICAgICAgaXogPSBxdyAqIHogKyBxeCAqIHkgLSBxeSAqIHgsXG4gICAgICAgIGl3ID0gLXF4ICogeCAtIHF5ICogeSAtIHF6ICogejtcblxuICAgIC8vIGNhbGN1bGF0ZSByZXN1bHQgKiBpbnZlcnNlIHF1YXRcbiAgICB0aGlzLnggPSBpeCAqIHF3ICsgaXcgKiAtcXggKyBpeSAqIC1xeiAtIGl6ICogLXF5O1xuICAgIHRoaXMueSA9IGl5ICogcXcgKyBpdyAqIC1xeSArIGl6ICogLXF4IC0gaXggKiAtcXo7XG4gICAgdGhpcy56ID0gaXogKiBxdyArIGl3ICogLXF6ICsgaXggKiAtcXkgLSBpeSAqIC1xeDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogTXVsdGlwbGllcyB0aGlzIFZlY3RvcjMgYnkgdGhlIHNwZWNpZmllZCBtYXRyaXgsIFxuICogYXBwbHlpbmcgYSBXIGRpdmlkZS4gVGhpcyBpcyB1c2VmdWwgZm9yIHByb2plY3Rpb24sXG4gKiBlLmcuIHVucHJvamVjdGluZyBhIDJEIHBvaW50IGludG8gM0Qgc3BhY2UuXG4gKlxuICogQG1ldGhvZCAgcHJqXG4gKiBAcGFyYW0ge01hdHJpeDR9IHRoZSA0eDQgbWF0cml4IHRvIG11bHRpcGx5IHdpdGggXG4gKiBAcmV0dXJuIHtWZWN0b3IzfSB0aGlzIG9iamVjdCBmb3IgY2hhaW5pbmdcbiAqL1xudmVjMy5wcm9qZWN0ID0gZnVuY3Rpb24obWF0KSB7XG4gICAgdmFyIHggPSB0aGlzLngsXG4gICAgICAgIHkgPSB0aGlzLnksXG4gICAgICAgIHogPSB0aGlzLnosXG4gICAgICAgIG0gPSBtYXQudmFsLFxuICAgICAgICBhMDAgPSBtWzBdLCBhMDEgPSBtWzFdLCBhMDIgPSBtWzJdLCBhMDMgPSBtWzNdLFxuICAgICAgICBhMTAgPSBtWzRdLCBhMTEgPSBtWzVdLCBhMTIgPSBtWzZdLCBhMTMgPSBtWzddLFxuICAgICAgICBhMjAgPSBtWzhdLCBhMjEgPSBtWzldLCBhMjIgPSBtWzEwXSwgYTIzID0gbVsxMV0sXG4gICAgICAgIGEzMCA9IG1bMTJdLCBhMzEgPSBtWzEzXSwgYTMyID0gbVsxNF0sIGEzMyA9IG1bMTVdO1xuXG4gICAgdmFyIGxfdyA9IDEgLyAoeCAqIGEwMyArIHkgKiBhMTMgKyB6ICogYTIzICsgYTMzKTtcblxuICAgIHRoaXMueCA9ICh4ICogYTAwICsgeSAqIGExMCArIHogKiBhMjAgKyBhMzApICogbF93OyBcbiAgICB0aGlzLnkgPSAoeCAqIGEwMSArIHkgKiBhMTEgKyB6ICogYTIxICsgYTMxKSAqIGxfdzsgXG4gICAgdGhpcy56ID0gKHggKiBhMDIgKyB5ICogYTEyICsgeiAqIGEyMiArIGEzMikgKiBsX3c7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFVucHJvamVjdCB0aGlzIHBvaW50IGZyb20gMkQgc3BhY2UgdG8gM0Qgc3BhY2UuXG4gKiBUaGUgcG9pbnQgc2hvdWxkIGhhdmUgaXRzIHggYW5kIHkgcHJvcGVydGllcyBzZXQgdG9cbiAqIDJEIHNjcmVlbiBzcGFjZSwgYW5kIHRoZSB6IGVpdGhlciBhdCAwIChuZWFyIHBsYW5lKVxuICogb3IgMSAoZmFyIHBsYW5lKS4gVGhlIHByb3ZpZGVkIG1hdHJpeCBpcyBhc3N1bWVkIHRvIGFscmVhZHlcbiAqIGJlIGNvbWJpbmVkLCBpLmUuIHByb2plY3Rpb24gKiB2aWV3ICogbW9kZWwuXG4gKlxuICogQWZ0ZXIgdGhpcyBvcGVyYXRpb24sIHRoaXMgdmVjdG9yJ3MgKHgsIHksIHopIGNvbXBvbmVudHMgd2lsbFxuICogcmVwcmVzZW50IHRoZSB1bnByb2plY3RlZCAzRCBjb29yZGluYXRlLlxuICogXG4gKiBAcGFyYW0gIHtWZWN0b3I0fSB2aWV3cG9ydCAgICAgICAgICBzY3JlZW4geCwgeSwgd2lkdGggYW5kIGhlaWdodCBpbiBwaXhlbHNcbiAqIEBwYXJhbSAge01hdHJpeDR9IGludlByb2plY3Rpb25WaWV3IGNvbWJpbmVkIHByb2plY3Rpb24gYW5kIHZpZXcgbWF0cml4XG4gKiBAcmV0dXJuIHtWZWN0b3IzfSAgICAgICAgICAgICAgICAgICB0aGlzIG9iamVjdCwgZm9yIGNoYWluaW5nXG4gKi9cbnZlYzMudW5wcm9qZWN0ID0gZnVuY3Rpb24odmlld3BvcnQsIGludlByb2plY3Rpb25WaWV3KSB7XG4gICAgdmFyIHZpZXdYID0gdmlld3BvcnQueCxcbiAgICAgICAgdmlld1kgPSB2aWV3cG9ydC55LFxuICAgICAgICB2aWV3V2lkdGggPSB2aWV3cG9ydC56LFxuICAgICAgICB2aWV3SGVpZ2h0ID0gdmlld3BvcnQudztcbiAgICBcbiAgICB2YXIgeCA9IHRoaXMueCwgXG4gICAgICAgIHkgPSB0aGlzLnksXG4gICAgICAgIHogPSB0aGlzLno7XG5cbiAgICB4ID0geCAtIHZpZXdYO1xuICAgIHkgPSB2aWV3SGVpZ2h0IC0geSAtIDE7XG4gICAgeSA9IHkgLSB2aWV3WTtcblxuICAgIHRoaXMueCA9ICgyICogeCkgLyB2aWV3V2lkdGggLSAxO1xuICAgIHRoaXMueSA9ICgyICogeSkgLyB2aWV3SGVpZ2h0IC0gMTtcbiAgICB0aGlzLnogPSAyICogeiAtIDE7XG5cbiAgICByZXR1cm4gdGhpcy5wcm9qZWN0KGludlByb2plY3Rpb25WaWV3KTtcbn07XG5cbnZlYzMucmFuZG9tID0gZnVuY3Rpb24oc2NhbGUpIHtcbiAgICBzY2FsZSA9IHNjYWxlIHx8IDEuMDtcblxuICAgIHZhciByID0gTWF0aC5yYW5kb20oKSAqIDIuMCAqIE1hdGguUEk7XG4gICAgdmFyIHogPSAoTWF0aC5yYW5kb20oKSAqIDIuMCkgLSAxLjA7XG4gICAgdmFyIHpTY2FsZSA9IE1hdGguc3FydCgxLjAteip6KSAqIHNjYWxlO1xuICAgIFxuICAgIHRoaXMueCA9IE1hdGguY29zKHIpICogelNjYWxlO1xuICAgIHRoaXMueSA9IE1hdGguc2luKHIpICogelNjYWxlO1xuICAgIHRoaXMueiA9IHogKiBzY2FsZTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzMucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnggPSAwO1xuICAgIHRoaXMueSA9IDA7XG4gICAgdGhpcy56ID0gMDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblxudmVjMy5zdWIgPSB2ZWMzLnN1YnRyYWN0O1xuXG52ZWMzLm11bCA9IHZlYzMubXVsdGlwbHk7XG5cbnZlYzMuZGl2ID0gdmVjMy5kaXZpZGU7XG5cbnZlYzMuZGlzdCA9IHZlYzMuZGlzdGFuY2U7XG5cbnZlYzMuZGlzdFNxID0gdmVjMy5kaXN0YW5jZVNxO1xuXG52ZWMzLmxlbiA9IHZlYzMubGVuZ3RoO1xuXG52ZWMzLmxlblNxID0gdmVjMy5sZW5ndGhTcTtcblxudmVjMy50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAnVmVjdG9yMygnICsgdGhpcy54ICsgJywgJyArIHRoaXMueSArICcsICcgKyB0aGlzLnogKyAnKSc7XG59O1xuXG52ZWMzLnN0ciA9IHZlYzMudG9TdHJpbmc7XG5cbm1vZHVsZS5leHBvcnRzID0gVmVjdG9yMzsiLCJ2YXIgY29tbW9uID0gcmVxdWlyZSgnLi9jb21tb24nKTtcblxuZnVuY3Rpb24gVmVjdG9yNCh4LCB5LCB6LCB3KSB7XG5cdGlmICh0eXBlb2YgeCA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICB0aGlzLnggPSB4Lnh8fDA7XG4gICAgICAgIHRoaXMueSA9IHgueXx8MDtcbiAgICAgICAgdGhpcy56ID0geC56fHwwO1xuICAgICAgICB0aGlzLncgPSB4Lnd8fDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy54ID0geHx8MDtcbiAgICAgICAgdGhpcy55ID0geXx8MDtcbiAgICAgICAgdGhpcy56ID0genx8MDtcbiAgICAgICAgdGhpcy53ID0gd3x8MDtcbiAgICB9XG59XG5cbi8vc2hvcnRoYW5kIGl0IGZvciBiZXR0ZXIgbWluaWZpY2F0aW9uXG52YXIgdmVjNCA9IFZlY3RvcjQucHJvdG90eXBlO1xuXG4vL21peGluIGNvbW1vbiBmdW5jdGlvbnNcbmZvciAodmFyIGsgaW4gY29tbW9uKSB7XG4gICAgdmVjNFtrXSA9IGNvbW1vbltrXTtcbn1cblxudmVjNC5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgVmVjdG9yNCh0aGlzLngsIHRoaXMueSwgdGhpcy56LCB0aGlzLncpO1xufTtcblxudmVjNC5tdWx0aXBseSA9IGZ1bmN0aW9uKHYpIHtcbiAgICB0aGlzLnggKj0gdi54O1xuICAgIHRoaXMueSAqPSB2Lnk7XG4gICAgdGhpcy56ICo9IHYuejtcbiAgICB0aGlzLncgKj0gdi53O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjNC5kaXZpZGUgPSBmdW5jdGlvbih2KSB7XG4gICAgdGhpcy54IC89IHYueDtcbiAgICB0aGlzLnkgLz0gdi55O1xuICAgIHRoaXMueiAvPSB2Lno7XG4gICAgdGhpcy53IC89IHYudztcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzQuZGlzdGFuY2UgPSBmdW5jdGlvbih2KSB7XG4gICAgdmFyIGR4ID0gdi54IC0gdGhpcy54LFxuICAgICAgICBkeSA9IHYueSAtIHRoaXMueSxcbiAgICAgICAgZHogPSB2LnogLSB0aGlzLnosXG4gICAgICAgIGR3ID0gdi53IC0gdGhpcy53O1xuICAgIHJldHVybiBNYXRoLnNxcnQoZHgqZHggKyBkeSpkeSArIGR6KmR6ICsgZHcqZHcpO1xufTtcblxudmVjNC5kaXN0YW5jZVNxID0gZnVuY3Rpb24odikge1xuICAgIHZhciBkeCA9IHYueCAtIHRoaXMueCxcbiAgICAgICAgZHkgPSB2LnkgLSB0aGlzLnksXG4gICAgICAgIGR6ID0gdi56IC0gdGhpcy56LFxuICAgICAgICBkdyA9IHYudyAtIHRoaXMudztcbiAgICByZXR1cm4gZHgqZHggKyBkeSpkeSArIGR6KmR6ICsgZHcqZHc7XG59O1xuXG52ZWM0Lm5lZ2F0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMueCA9IC10aGlzLng7XG4gICAgdGhpcy55ID0gLXRoaXMueTtcbiAgICB0aGlzLnogPSAtdGhpcy56O1xuICAgIHRoaXMudyA9IC10aGlzLnc7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWM0LnRyYW5zZm9ybU1hdDQgPSBmdW5jdGlvbihtYXQpIHtcbiAgICB2YXIgbSA9IG1hdC52YWwsIHggPSB0aGlzLngsIHkgPSB0aGlzLnksIHogPSB0aGlzLnosIHcgPSB0aGlzLnc7XG4gICAgdGhpcy54ID0gbVswXSAqIHggKyBtWzRdICogeSArIG1bOF0gKiB6ICsgbVsxMl0gKiB3O1xuICAgIHRoaXMueSA9IG1bMV0gKiB4ICsgbVs1XSAqIHkgKyBtWzldICogeiArIG1bMTNdICogdztcbiAgICB0aGlzLnogPSBtWzJdICogeCArIG1bNl0gKiB5ICsgbVsxMF0gKiB6ICsgbVsxNF0gKiB3O1xuICAgIHRoaXMudyA9IG1bM10gKiB4ICsgbVs3XSAqIHkgKyBtWzExXSAqIHogKyBtWzE1XSAqIHc7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLy8vIFRPRE86IGlzIHRoaXMgcmVhbGx5IHRoZSBzYW1lIGFzIFZlY3RvcjMgPz9cbi8vLyAgQWxzbywgd2hhdCBhYm91dCB0aGlzOlxuLy8vICBodHRwOi8vbW9sZWN1bGFybXVzaW5ncy53b3JkcHJlc3MuY29tLzIwMTMvMDUvMjQvYS1mYXN0ZXItcXVhdGVybmlvbi12ZWN0b3ItbXVsdGlwbGljYXRpb24vXG52ZWM0LnRyYW5zZm9ybVF1YXQgPSBmdW5jdGlvbihxKSB7XG4gICAgLy8gYmVuY2htYXJrczogaHR0cDovL2pzcGVyZi5jb20vcXVhdGVybmlvbi10cmFuc2Zvcm0tdmVjMy1pbXBsZW1lbnRhdGlvbnNcbiAgICB2YXIgeCA9IHRoaXMueCwgeSA9IHRoaXMueSwgeiA9IHRoaXMueixcbiAgICAgICAgcXggPSBxLngsIHF5ID0gcS55LCBxeiA9IHEueiwgcXcgPSBxLncsXG5cbiAgICAgICAgLy8gY2FsY3VsYXRlIHF1YXQgKiB2ZWNcbiAgICAgICAgaXggPSBxdyAqIHggKyBxeSAqIHogLSBxeiAqIHksXG4gICAgICAgIGl5ID0gcXcgKiB5ICsgcXogKiB4IC0gcXggKiB6LFxuICAgICAgICBpeiA9IHF3ICogeiArIHF4ICogeSAtIHF5ICogeCxcbiAgICAgICAgaXcgPSAtcXggKiB4IC0gcXkgKiB5IC0gcXogKiB6O1xuXG4gICAgLy8gY2FsY3VsYXRlIHJlc3VsdCAqIGludmVyc2UgcXVhdFxuICAgIHRoaXMueCA9IGl4ICogcXcgKyBpdyAqIC1xeCArIGl5ICogLXF6IC0gaXogKiAtcXk7XG4gICAgdGhpcy55ID0gaXkgKiBxdyArIGl3ICogLXF5ICsgaXogKiAtcXggLSBpeCAqIC1xejtcbiAgICB0aGlzLnogPSBpeiAqIHF3ICsgaXcgKiAtcXogKyBpeCAqIC1xeSAtIGl5ICogLXF4O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjNC5yYW5kb20gPSBmdW5jdGlvbihzY2FsZSkge1xuICAgIHNjYWxlID0gc2NhbGUgfHwgMS4wO1xuXG4gICAgLy9Ob3Qgc3BoZXJpY2FsOyBzaG91bGQgZml4IHRoaXMgZm9yIG1vcmUgdW5pZm9ybSBkaXN0cmlidXRpb25cbiAgICB0aGlzLnggPSAoTWF0aC5yYW5kb20oKSAqIDIgLSAxKSAqIHNjYWxlO1xuICAgIHRoaXMueSA9IChNYXRoLnJhbmRvbSgpICogMiAtIDEpICogc2NhbGU7XG4gICAgdGhpcy56ID0gKE1hdGgucmFuZG9tKCkgKiAyIC0gMSkgKiBzY2FsZTtcbiAgICB0aGlzLncgPSAoTWF0aC5yYW5kb20oKSAqIDIgLSAxKSAqIHNjYWxlO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjNC5yZXNldCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMueCA9IDA7XG4gICAgdGhpcy55ID0gMDtcbiAgICB0aGlzLnogPSAwO1xuICAgIHRoaXMudyA9IDA7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWM0LnN1YiA9IHZlYzQuc3VidHJhY3Q7XG5cbnZlYzQubXVsID0gdmVjNC5tdWx0aXBseTtcblxudmVjNC5kaXYgPSB2ZWM0LmRpdmlkZTtcblxudmVjNC5kaXN0ID0gdmVjNC5kaXN0YW5jZTtcblxudmVjNC5kaXN0U3EgPSB2ZWM0LmRpc3RhbmNlU3E7XG5cbnZlYzQubGVuID0gdmVjNC5sZW5ndGg7XG5cbnZlYzQubGVuU3EgPSB2ZWM0Lmxlbmd0aFNxO1xuXG52ZWM0LnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICdWZWN0b3I0KCcgKyB0aGlzLnggKyAnLCAnICsgdGhpcy55ICsgJywgJyArIHRoaXMueiArICcsICcgKyB0aGlzLncgKyAnKSc7XG59O1xuXG52ZWM0LnN0ciA9IHZlYzQudG9TdHJpbmc7XG5cbm1vZHVsZS5leHBvcnRzID0gVmVjdG9yNDsiLCIvL2NvbW1vbiB2ZWM0IGZ1bmN0aW9uc1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgXG4vKipcbiAqIENvcGllcyB0aGUgeCwgeSwgeiwgdyBjb21wb25lbnRzIGZyb20gdGhlIHNwZWNpZmllZFxuICogVmVjdG9yLiBVbmxpa2UgbW9zdCBvdGhlciBvcGVyYXRpb25zLCB0aGlzIGZ1bmN0aW9uXG4gKiB3aWxsIGRlZmF1bHQgdW5kZWZpbmVkIGNvbXBvbmVudHMgb24gYG90aGVyVmVjYCB0byB6ZXJvLlxuICogXG4gKiBAbWV0aG9kICBjb3B5XG4gKiBAcGFyYW0gIHtvdGhlclZlY30gdGhlIG90aGVyIFZlY3RvcjQgdG8gY29weVxuICogQHJldHVybiB7VmVjdG9yfSAgdGhpcywgZm9yIGNoYWluaW5nXG4gKi9cblxuXG4vKipcbiAqIEEgY29udmVuaWVuY2UgZnVuY3Rpb24gdG8gc2V0IHRoZSBjb21wb25lbnRzIG9mXG4gKiB0aGlzIHZlY3RvciBhcyB4LCB5LCB6LCB3LiBGYWxzeSBvciB1bmRlZmluZWRcbiAqIHBhcmFtZXRlcnMgd2lsbCBkZWZhdWx0IHRvIHplcm8uXG4gKlxuICogWW91IGNhbiBhbHNvIHBhc3MgYSB2ZWN0b3Igb2JqZWN0IGluc3RlYWQgb2ZcbiAqIGluZGl2aWR1YWwgY29tcG9uZW50cywgdG8gY29weSB0aGUgb2JqZWN0J3MgY29tcG9uZW50cy5cbiAqIFxuICogQG1ldGhvZCAgc2V0XG4gKiBAcGFyYW0ge051bWJlcn0geCB0aGUgeCBjb21wb25lbnRcbiAqIEBwYXJhbSB7TnVtYmVyfSB5IHRoZSB5IGNvbXBvbmVudFxuICogQHBhcmFtIHtOdW1iZXJ9IHogdGhlIHogY29tcG9uZW50XG4gKiBAcGFyYW0ge051bWJlcn0gdyB0aGUgdyBjb21wb25lbnRcbiAqIEByZXR1cm4ge1ZlY3RvcjJ9ICB0aGlzLCBmb3IgY2hhaW5pbmdcbiAqL1xuXG4vKipcbiAqIEFkZHMgdGhlIGNvbXBvbmVudHMgb2YgdGhlIG90aGVyIFZlY3RvcjQgdG9cbiAqIHRoaXMgdmVjdG9yLlxuICogXG4gKiBAbWV0aG9kIGFkZFxuICogQHBhcmFtICB7VmVjdG9yNH0gb3RoZXJWZWMgb3RoZXIgdmVjdG9yLCByaWdodCBvcGVyYW5kXG4gKiBAcmV0dXJuIHtWZWN0b3IyfSAgdGhpcywgZm9yIGNoYWluaW5nXG4gKi9cblxuLyoqXG4gKiBTdWJ0cmFjdHMgdGhlIGNvbXBvbmVudHMgb2YgdGhlIG90aGVyIFZlY3RvcjRcbiAqIGZyb20gdGhpcyB2ZWN0b3IuIEFsaWFzZWQgYXMgYHN1YigpYFxuICogXG4gKiBAbWV0aG9kICBzdWJ0cmFjdFxuICogQHBhcmFtICB7VmVjdG9yNH0gb3RoZXJWZWMgb3RoZXIgdmVjdG9yLCByaWdodCBvcGVyYW5kXG4gKiBAcmV0dXJuIHtWZWN0b3IyfSAgdGhpcywgZm9yIGNoYWluaW5nXG4gKi9cblxuLyoqXG4gKiBNdWx0aXBsaWVzIHRoZSBjb21wb25lbnRzIG9mIHRoaXMgVmVjdG9yNFxuICogYnkgYSBzY2FsYXIgYW1vdW50LlxuICpcbiAqIEBtZXRob2QgIHNjYWxlXG4gKiBAcGFyYW0ge051bWJlcn0gcyB0aGUgc2NhbGUgdG8gbXVsdGlwbHkgYnlcbiAqIEByZXR1cm4ge1ZlY3RvcjR9IHRoaXMsIGZvciBjaGFpbmluZ1xuICovXG5cbi8qKlxuICogUmV0dXJucyB0aGUgbWFnbml0dWRlIChsZW5ndGgpIG9mIHRoaXMgdmVjdG9yLlxuICpcbiAqIEFsaWFzZWQgYXMgYGxlbigpYFxuICogXG4gKiBAbWV0aG9kICBsZW5ndGhcbiAqIEByZXR1cm4ge051bWJlcn0gdGhlIGxlbmd0aCBvZiB0aGlzIHZlY3RvclxuICovXG5cbi8qKlxuICogUmV0dXJucyB0aGUgc3F1YXJlZCBtYWduaXR1ZGUgKGxlbmd0aCkgb2YgdGhpcyB2ZWN0b3IuXG4gKlxuICogQWxpYXNlZCBhcyBgbGVuU3EoKWBcbiAqIFxuICogQG1ldGhvZCAgbGVuZ3RoU3FcbiAqIEByZXR1cm4ge051bWJlcn0gdGhlIHNxdWFyZWQgbGVuZ3RoIG9mIHRoaXMgdmVjdG9yXG4gKi9cblxuLyoqXG4gKiBOb3JtYWxpemVzIHRoaXMgdmVjdG9yIHRvIGEgdW5pdCB2ZWN0b3IuXG4gKiBAbWV0aG9kIG5vcm1hbGl6ZVxuICogQHJldHVybiB7VmVjdG9yNH0gIHRoaXMsIGZvciBjaGFpbmluZ1xuICovXG5cbi8qKlxuICogUmV0dXJucyB0aGUgZG90IHByb2R1Y3Qgb2YgdGhpcyB2ZWN0b3JcbiAqIGFuZCB0aGUgc3BlY2lmaWVkIFZlY3RvcjQuXG4gKiBcbiAqIEBtZXRob2QgZG90XG4gKiBAcmV0dXJuIHtOdW1iZXJ9IHRoZSBkb3QgcHJvZHVjdFxuICovXG4gICAgY29weTogZnVuY3Rpb24ob3RoZXJWZWMpIHtcbiAgICAgICAgdGhpcy54ID0gb3RoZXJWZWMueHx8MDtcbiAgICAgICAgdGhpcy55ID0gb3RoZXJWZWMueXx8MDtcbiAgICAgICAgdGhpcy56ID0gb3RoZXJWZWMuenx8MDtcbiAgICAgICAgdGhpcy53ID0gb3RoZXJWZWMud3x8MDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHNldDogZnVuY3Rpb24oeCwgeSwgeiwgdykge1xuICAgICAgICBpZiAodHlwZW9mIHggPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIHRoaXMueCA9IHgueHx8MDtcbiAgICAgICAgICAgIHRoaXMueSA9IHgueXx8MDtcbiAgICAgICAgICAgIHRoaXMueiA9IHguenx8MDtcbiAgICAgICAgICAgIHRoaXMudyA9IHgud3x8MDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMueCA9IHh8fDA7XG4gICAgICAgICAgICB0aGlzLnkgPSB5fHwwO1xuICAgICAgICAgICAgdGhpcy56ID0genx8MDtcbiAgICAgICAgICAgIHRoaXMudyA9IHd8fDA7XG5cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgYWRkOiBmdW5jdGlvbih2KSB7XG4gICAgICAgIHRoaXMueCArPSB2Lng7XG4gICAgICAgIHRoaXMueSArPSB2Lnk7XG4gICAgICAgIHRoaXMueiArPSB2Lno7XG4gICAgICAgIHRoaXMudyArPSB2Lnc7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBzdWJ0cmFjdDogZnVuY3Rpb24odikge1xuICAgICAgICB0aGlzLnggLT0gdi54O1xuICAgICAgICB0aGlzLnkgLT0gdi55O1xuICAgICAgICB0aGlzLnogLT0gdi56O1xuICAgICAgICB0aGlzLncgLT0gdi53O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgc2NhbGU6IGZ1bmN0aW9uKHMpIHtcbiAgICAgICAgdGhpcy54ICo9IHM7XG4gICAgICAgIHRoaXMueSAqPSBzO1xuICAgICAgICB0aGlzLnogKj0gcztcbiAgICAgICAgdGhpcy53ICo9IHM7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cblxuICAgIGxlbmd0aDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB4ID0gdGhpcy54LFxuICAgICAgICAgICAgeSA9IHRoaXMueSxcbiAgICAgICAgICAgIHogPSB0aGlzLnosXG4gICAgICAgICAgICB3ID0gdGhpcy53O1xuICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KHgqeCArIHkqeSArIHoqeiArIHcqdyk7XG4gICAgfSxcblxuICAgIGxlbmd0aFNxOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHggPSB0aGlzLngsXG4gICAgICAgICAgICB5ID0gdGhpcy55LFxuICAgICAgICAgICAgeiA9IHRoaXMueixcbiAgICAgICAgICAgIHcgPSB0aGlzLnc7XG4gICAgICAgIHJldHVybiB4KnggKyB5KnkgKyB6KnogKyB3Knc7XG4gICAgfSxcblxuICAgIG5vcm1hbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB4ID0gdGhpcy54LFxuICAgICAgICAgICAgeSA9IHRoaXMueSxcbiAgICAgICAgICAgIHogPSB0aGlzLnosXG4gICAgICAgICAgICB3ID0gdGhpcy53O1xuICAgICAgICB2YXIgbGVuID0geCp4ICsgeSp5ICsgeip6ICsgdyp3O1xuICAgICAgICBpZiAobGVuID4gMCkge1xuICAgICAgICAgICAgbGVuID0gMSAvIE1hdGguc3FydChsZW4pO1xuICAgICAgICAgICAgdGhpcy54ID0geCpsZW47XG4gICAgICAgICAgICB0aGlzLnkgPSB5KmxlbjtcbiAgICAgICAgICAgIHRoaXMueiA9IHoqbGVuO1xuICAgICAgICAgICAgdGhpcy53ID0gdypsZW47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGRvdDogZnVuY3Rpb24odikge1xuICAgICAgICByZXR1cm4gdGhpcy54ICogdi54ICsgdGhpcy55ICogdi55ICsgdGhpcy56ICogdi56ICsgdGhpcy53ICogdi53O1xuICAgIH0sXG5cbiAgICBsZXJwOiBmdW5jdGlvbih2LCB0KSB7XG4gICAgICAgIHZhciBheCA9IHRoaXMueCxcbiAgICAgICAgICAgIGF5ID0gdGhpcy55LFxuICAgICAgICAgICAgYXogPSB0aGlzLnosXG4gICAgICAgICAgICBhdyA9IHRoaXMudztcbiAgICAgICAgdCA9IHR8fDA7XG4gICAgICAgIHRoaXMueCA9IGF4ICsgdCAqICh2LnggLSBheCk7XG4gICAgICAgIHRoaXMueSA9IGF5ICsgdCAqICh2LnkgLSBheSk7XG4gICAgICAgIHRoaXMueiA9IGF6ICsgdCAqICh2LnogLSBheik7XG4gICAgICAgIHRoaXMudyA9IGF3ICsgdCAqICh2LncgLSBhdyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn07IiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgVmVjdG9yMjogcmVxdWlyZSgnLi9WZWN0b3IyJyksXG4gICAgVmVjdG9yMzogcmVxdWlyZSgnLi9WZWN0b3IzJyksXG4gICAgVmVjdG9yNDogcmVxdWlyZSgnLi9WZWN0b3I0JyksXG4gICAgTWF0cml4MzogcmVxdWlyZSgnLi9NYXRyaXgzJyksXG4gICAgTWF0cml4NDogcmVxdWlyZSgnLi9NYXRyaXg0JyksXG4gICAgUXVhdGVybmlvbjogcmVxdWlyZSgnLi9RdWF0ZXJuaW9uJylcbn07IiwidmFyICQgPSAod2luZG93LiQpO1xudmFyIFNpbXBsZXhOb2lzZSA9IHJlcXVpcmUoJ3NpbXBsZXgtbm9pc2UnKTtcbnZhciBWZWN0b3IyID0gcmVxdWlyZSgndmVjbWF0aCcpLlZlY3RvcjI7XG5cbnZhciBzbW9vdGhzdGVwID0gcmVxdWlyZSgnaW50ZXJwb2xhdGlvbicpLnNtb290aHN0ZXA7XG52YXIgbGVycCA9IHJlcXVpcmUoJ2ludGVycG9sYXRpb24nKS5sZXJwO1xuXG52YXIgTm9pc2VNYXAgPSByZXF1aXJlKCcuL3V0aWwvTm9pc2VNYXAnKTtcbnZhciBpbWFnZWRhdGEgPSByZXF1aXJlKCcuL3V0aWwvaW1hZ2VkYXRhJyk7XG5cbnZhciBQYXJ0aWNsZSA9IHJlcXVpcmUoJy4vaW1wcmVzc2lvbicpLlBhcnRpY2xlO1xuXG52YXIgZGF0ID0gKHdpbmRvdy5kYXQpO1xuXG52YXIgdG1wID0gbmV3IFZlY3RvcjIoKTtcbnZhciB0bXAyID0gbmV3IFZlY3RvcjIoKTtcbnZhciByYWYgPSByZXF1aXJlKCdyYWYuanMnKTtcblxuXG4vL3BvbHlmaWxsXG5pZiAoIW5hdmlnYXRvci5nZXRVc2VyTWVkaWEpXG4gICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSA9IG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgXG4gICAgICAgICAgICAgICAgICAgICAgICB8fCBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhIFxuICAgICAgICAgICAgICAgICAgICAgICAgfHwgbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSBcbiAgICAgICAgICAgICAgICAgICAgICAgIHx8IG5hdmlnYXRvci5tc0dldFVzZXJNZWRpYTtcbmlmICghd2luZG93LlVSTClcbiAgICB3aW5kb3cuVVJMID0gd2luZG93LlVSTCBcbiAgICAgICAgICAgICAgICAgICAgfHwgd2luZG93LndlYmtpdFVSTCBcbiAgICAgICAgICAgICAgICAgICAgfHwgd2luZG93Lm1velVSTCBcbiAgICAgICAgICAgICAgICAgICAgfHwgd2luZG93Lm1zVVJMO1xuXG5cbiQoZnVuY3Rpb24oKSB7XG5cdC8vIHZhciBjYW52YXMgPSAkKFwiPGNhbnZhcz5cIikuYXBwZW5kVG8oZG9jdW1lbnQuYm9keSlbMF07XG5cdHZhciBjYW52YXMgPSAkKFwiPGNhbnZhcz5cIilbMF07XG5cdHZhciB3aWR0aCA9IDkwMCxcblx0XHRoZWlnaHQgPSA1MzU7XG5cblx0dmFyIG1pbmltYWwgPSAhISQoZG9jdW1lbnQuYm9keSkuZGF0YShcIm1pbmltYWxcIik7XG5cblx0dmFyIHByZXZpZXdDYW52YXMgPSAkKFwiPGNhbnZhcz5cIikuYXBwZW5kVG8oZG9jdW1lbnQuYm9keSlbMF0sXG5cdFx0cHJldmlld1dpZHRoID0gTWF0aC5tYXgoMjU2LCB+fih3aWR0aC8xKSksXG5cdFx0cHJldmlld0hlaWdodCA9IH5+KHByZXZpZXdXaWR0aCAqIDEvKHdpZHRoL2hlaWdodCkpLFxuXHRcdHByZXZpZXdDb250ZXh0ID0gcHJldmlld0NhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG5cblx0cHJldmlld0NhbnZhcy53aWR0aCA9IHByZXZpZXdXaWR0aDtcblx0cHJldmlld0NhbnZhcy5oZWlnaHQgPSBwcmV2aWV3SGVpZ2h0O1xuXG5cdGNhbnZhcy53aWR0aCA9IHdpZHRoO1xuXHRjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXG5cblx0dmFyIGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuXHR2YXIgbm9pc2VTaXplID0gMjU2O1xuXHR2YXIgbm9pc2UgPSBuZXcgTm9pc2VNYXAobm9pc2VTaXplKTtcblx0bm9pc2Uuc2NhbGUgPSAzLjI7XG5cdC8vIG5vaXNlLnNlYW1sZXNzID0gdHJ1ZTtcblx0bm9pc2Uuc21vb3RoaW5nID0gdHJ1ZTtcblx0bm9pc2UuZ2VuZXJhdGUoKTtcblxuXG5cdHZhciBpbWFnZSA9IG5ldyBJbWFnZSgpO1xuXHRpbWFnZS5vbmxvYWQgPSBoYW5kbGVJbWFnZUxvYWQ7XG5cdGltYWdlLnNyYyA9IG1pbmltYWwgPyBcImltZy9zdW4ucG5nXCIgOiBcImltZy9za3lsaW5lMi5wbmdcIjtcblxuXG5cdHZhciBpbWFnZVBpeGVscztcblxuXHR2YXIgb3B0aW9ucyA9IHtcblx0XHRzY2FsZTogbm9pc2Uuc2NhbGUsXG5cdFx0c2hpZnQ6IGZhbHNlLFxuXHRcdHBhaW50aW5nOiB0cnVlLFxuXG5cdFx0Ly9zdHJva2Ugb3B0aW9uc1xuXHRcdGNvdW50OiA1MDAsXG5cdFx0bGVuZ3RoOiAzMyxcblx0XHR0aGlja25lc3M6IDEyLjAsXG5cdFx0c3BlZWQ6IDEuMCxcblx0XHRsaWZlOiAxLjAsIFxuXHRcdGFscGhhOiAwLjI1LFxuXHRcdHJvdW5kOiB0cnVlLFxuXHRcdG1vdGlvbjogdHJ1ZSxcblx0XHRhbmdsZTogMSxcblxuXHRcdC8vY29sb3Jcblx0XHR1c2VPcmlnaW5hbDogdHJ1ZSxcblx0XHRodWU6IDcwLFxuXHRcdHNhdHVyYXRpb246IDEuMCxcblx0XHRsaWdodG5lc3M6IDEuMCxcblx0XHRncmFpbjogbWluaW1hbCA/IC41IDogLjcsXG5cdFx0ZGFya2VuOiAhbWluaW1hbCxcblx0XHRcblxuXHRcdGJhY2tncm91bmQ6IG1pbmltYWwgPyAnI2YxZjBlMicgOiAnIzJmMmYyZicsXG5cdFx0Y2xlYXI6IGNsZWFyLFxuXHRcdGFuaW1hdGU6IGFuaW1hdGVJbixcblx0XHR2aWV3T3JpZ2luYWw6IGZhbHNlLFxuXHRcdGV4cG9ydEltYWdlOiBzYXZlSW1hZ2UuYmluZCh0aGlzKVxuXHR9O1xuXG5cdHZhciBub2lzZU92ZXJsYXkgPSAkKCc8ZGl2PicpLmFwcGVuZFRvKGRvY3VtZW50LmJvZHkpLmFkZENsYXNzKCdub2lzZSBvdmVybGF5JykuY3NzKHtcblx0XHR3aWR0aDogcHJldmlld1dpZHRoLFxuXHRcdGhlaWdodDogcHJldmlld0hlaWdodCxcblx0XHRvcGFjaXR5OiBvcHRpb25zLmdyYWluKjAuMlxuXHR9KTtcblx0JChkb2N1bWVudC5ib2R5KS5jc3MoJ2JhY2tncm91bmQnLCAnIzI1MjUyNScpO1xuXG5cdHZhciBvcmlnaW5hbEltYWdlID0gJChpbWFnZSkuY2xvbmUoKS5hcHBlbmRUbyhkb2N1bWVudC5ib2R5KS5jc3Moe1xuXHRcdHZpc2liaWxpdHk6ICdoaWRkZW4nXG5cdH0pLmFkZENsYXNzKCdvdmVybGF5IG9yaWdpbmFsJykuY3NzKHtcblx0XHR3aWR0aDogcHJldmlld1dpZHRoLFxuXHRcdGhlaWdodDogcHJldmlld0hlaWdodFxuXHR9KTtcblxuXHRcblx0dmFyIGd1aTtcblx0c2V0dXBHVUkoKTtcblxuXG5cdHZhciBwYXJ0aWNsZXMgPSBbXSxcblx0XHRjb3VudCA9IDUwMCxcblx0XHRzdGVwID0gMCxcblx0XHR0aW1lID0gMCxcblx0XHRtb3VzZSA9IG5ldyBWZWN0b3IyKCk7XG5cblx0dmFyIHZpZGVvLCBwbGF5aW5nPWZhbHNlO1xuXHRsb2FkVmlkZW8oKTtcblxuXHR2YXIgc3RhcnRUaW1lID0gRGF0ZS5ub3coKSwgd2ViY2FtVGltZXIgPSAwLFxuXHRcdHdlYmNhbURlbGF5ID0gNTAwO1xuXG5cdHNldHVwUGFydGljbGVzKCk7XG5cblx0YW5pbWF0ZUluKCk7XG5cblx0aWYgKG1pbmltYWwpIHtcblx0XHQkKCcjdGV4dCcpLmh0bWwoJ2dlbmVyYXRpdmUgcGFpbnRpbmcgaW4gdGhlIGltcHJlc3Npb25pc3Qgc3R5bGU8cD5ieSBNYXR0IERlc0xhdXJpZXJzPC9wPicpXG5cdFx0XHQuY3NzKFwidG9wXCIsIDEwKS5jc3MoXCJjb2xvclwiLCBcIiMyZjJmMmZcIikuY3NzKFwiei1pbmRleFwiLCAxMDAwKTtcblx0XHQkKCcuZGcuYWMnKS5oaWRlKCk7XG5cdFx0JCgnY2FudmFzLCBkaXYubm9pc2UnKS5vbihcInRhcCBtb3VzZWRvd25cIiwgZnVuY3Rpb24oZXYpIHtcblx0XHRcdGV2LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRjbGVhcigpO1xuXG5cdFx0XHRvcHRpb25zLnBhaW50aW5nID0gZmFsc2U7XG5cdFx0XHRwcmV2aWV3Q29udGV4dC5kcmF3SW1hZ2UoY2FudmFzLCAwLCAwLCBwcmV2aWV3V2lkdGgsIHByZXZpZXdIZWlnaHQpO1xuXHRcdFx0bm9pc2UucmFuZG9taXplKCk7XG5cdFx0XHRvcHRpb25zLnNjYWxlID0gTWF0aC5yYW5kb20oKSoyKzFcblx0XHRcdFR3ZWVuTGl0ZS5kZWxheWVkQ2FsbCgwLjUsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRvcHRpb25zLnBhaW50aW5nID0gdHJ1ZTtcblx0XHRcdFx0YW5pbWF0ZUluKCk7XG5cdFx0XHR9LmJpbmQodGhpcykpO1xuXHRcdH0pLm9uKCd0b3VjaG1vdmUnLCBmdW5jdGlvbihldikge1xuXHRcdFx0Ly8gZXYucHJldmVudERlZmF1bHQoKVxuXHRcdH0pO1xuXG5cdFx0Ly8gd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJvcmllbnRhdGlvbmNoYW5nZVwiLCBmdW5jdGlvbigpIHtcblx0XHQvLyBcdHdpbmRvdy5zY3JvbGxUbygwLCAwKTtcblx0XHQvLyB9KVxuXHR9XG5cdGlmICh3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyA9PT0gMikge1xuXHRcdCQoJ2Rpdi5ub2lzZScpLmNzcyhcImJhY2tncm91bmQtc2l6ZVwiLCBcIjEyOHB4IDEyOHB4XCIpO1xuXHR9XG5cblx0ZnVuY3Rpb24gaGFuZGxlSW1hZ2VMb2FkKCkge1xuXHRcdGltYWdlUGl4ZWxzID0gaW1hZ2VkYXRhLmdldEltYWdlRGF0YShpbWFnZSkuZGF0YTtcblx0XHRcdFx0XG5cdFx0Ly8gY29udGV4dC5maWxsU3R5bGUgPSAnI2ViZWJlYic7XG5cdFx0Y2xlYXJSZWN0KCk7XG5cblxuXHRcdC8vIGNvbnRleHQuZ2xvYmFsQWxwaGEgPSAxO1xuXHRcdC8vIGNvbnRleHQuZHJhd0ltYWdlKGltYWdlLCAwLCAwKTtcblxuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZShyZW5kZXIpO1xuXHR9XG5cblx0ZnVuY3Rpb24gdXBkYXRlQW5pbWF0aW9uKCkge1xuXG5cdFx0Ly93dGYgZGF0Lmd1aS4uLlxuXHRcdGZvciAodmFyIGsgaW4gZ3VpLl9fZm9sZGVycy5zdHJva2UuX19jb250cm9sbGVycykge1xuXHRcdFx0Z3VpLl9fZm9sZGVycy5zdHJva2UuX19jb250cm9sbGVyc1trXS51cGRhdGVEaXNwbGF5KCk7XG5cdFx0fVxuXHRcdGZvciAodmFyIGsgaW4gZ3VpLl9fZm9sZGVycy5jb2xvci5fX2NvbnRyb2xsZXJzKSB7XG5cdFx0XHRndWkuX19mb2xkZXJzLmNvbG9yLl9fY29udHJvbGxlcnNba10udXBkYXRlRGlzcGxheSgpO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIHNhdmVJbWFnZSgpIHtcblx0XHQvLyBvcHRpb25zLnBhaW50aW5nID0gZmFsc2U7XG5cblx0XHQvLyBmb3IgKHZhciBrIGluIGd1aS5fX2ZvbGRlcnMuY2FudmFzLl9fY29udHJvbGxlcnMpIHtcblx0XHQvLyBcdGd1aS5fX2ZvbGRlcnMuY2FudmFzLl9fY29udHJvbGxlcnNba10udXBkYXRlRGlzcGxheSgpO1xuXHRcdC8vIH1cblx0XHRcblx0XHR2YXIgZGF0YVVSTCA9IGNhbnZhcy50b0RhdGFVUkwoXCJpbWFnZS9wbmdcIik7XG5cblx0XHR2YXIgZGlzcGxheVdpZHRoID0gd2lkdGgsXG5cdFx0XHRkaXNwbGF5SGVpZ2h0ID0gaGVpZ2h0O1xuXHRcdHZhciBpbWFnZVdpbmRvdyA9IHdpbmRvdy5vcGVuKFwiXCIsIFwiZnJhY3RhbExpbmVJbWFnZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJsZWZ0PTAsdG9wPTAsd2lkdGg9XCIrODAwK1wiLGhlaWdodD1cIis1MDArXCIsdG9vbGJhcj0wLHJlc2l6YWJsZT0wXCIpO1xuXHRcdGltYWdlV2luZG93LmRvY3VtZW50LndyaXRlKFwiPHRpdGxlPkV4cG9ydCBJbWFnZTwvdGl0bGU+XCIpXG5cdFx0aW1hZ2VXaW5kb3cuZG9jdW1lbnQud3JpdGUoXCI8aW1nIGlkPSdleHBvcnRJbWFnZSdcIlxuXHRcdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKyBcIiBhbHQ9JydcIlxuXHRcdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKyBcIiBoZWlnaHQ9J1wiICsgZGlzcGxheUhlaWdodCArIFwiJ1wiXG5cdFx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICArIFwiIHdpZHRoPSdcIiAgKyBkaXNwbGF5V2lkdGggICsgXCInXCJcblx0XHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICsgXCIgc3R5bGU9J3Bvc2l0aW9uOmFic29sdXRlO2xlZnQ6MDt0b3A6MCcvPlwiKTtcblx0XHRpbWFnZVdpbmRvdy5kb2N1bWVudC5jbG9zZSgpO1xuXHRcdHZhciBleHBvcnRJbWFnZSA9IGltYWdlV2luZG93LmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZXhwb3J0SW1hZ2VcIik7XG5cdFx0ZXhwb3J0SW1hZ2Uuc3JjID0gZGF0YVVSTDtcblx0fVxuXG5cdGZ1bmN0aW9uIGFuaW1hdGVJbigpIHtcblx0XHRUd2VlbkxpdGUua2lsbFR3ZWVuc09mKG9wdGlvbnMpO1xuXHRcdHVwZGF0ZUFuaW1hdGlvbigpO1xuXG5cdFx0Ly8gVHdlZW5MaXRlLnRvKG9wdGlvbnMsIDEuMCwge1xuXHRcdC8vIFx0Z3JhaW46IDEuMCxcblx0XHQvLyBcdG9uVXBkYXRlOiB1cGRhdGVHcmFpbi5iaW5kKHRoaXMpLFxuXHRcdC8vIH0pO1xuXHRcblx0XHRpZiAobWluaW1hbCkgLy9nb2QgdGhpcyBjb2RlIGlzIGdldHRpbmcgbmFzdHkuLlxuICAgICAgICAgICAgYW5pbWF0ZUluMigpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBhbmltYXRlSW4xKCk7XG5cdH1cblxuICAgIGZ1bmN0aW9uIGFuaW1hdGVJbjEoKSB7XG5cdFx0VHdlZW5MaXRlLmtpbGxUd2VlbnNPZihvcHRpb25zKTtcblx0XHR1cGRhdGVBbmltYXRpb24oKTtcblxuXHRcdC8vIFR3ZWVuTGl0ZS50byhvcHRpb25zLCAxLjAsIHtcblx0XHQvLyBcdGdyYWluOiAxLjAsXG5cdFx0Ly8gXHRvblVwZGF0ZTogdXBkYXRlR3JhaW4uYmluZCh0aGlzKSxcblx0XHQvLyB9KTtcblxuXHRcdFR3ZWVuTGl0ZS5mcm9tVG8ob3B0aW9ucywgMS4wLCB7XG5cdFx0XHR0aGlja25lc3M6IDMwLFxuXHRcdH0sIHtcblx0XHRcdHRoaWNrbmVzczogMjAsXG5cdFx0XHRlYXNlOiBFeHBvLmVhc2VPdXQsXG5cdFx0XHRkZWxheTogMi4wLFxuXHRcdH0pXG5cdFx0VHdlZW5MaXRlLmZyb21UbyhvcHRpb25zLCAzLjAsIHtcblx0XHRcdGxlbmd0aDogMjMsXG5cdFx0XHRhbHBoYTogMC4zLFxuXHRcdFx0bGlmZTogMC43LFxuXHRcdFx0Ly8gcm91bmQ6IHRydWUsXG5cdFx0XHRzcGVlZDogMSxcblx0XHR9LCB7XG5cdFx0XHRsaWZlOiAwLjUsXG5cdFx0XHRhbHBoYTogMC4yLFxuXHRcdFx0bGVuZ3RoOiA3MCxcblx0XHRcdHNwZWVkOiAwLjYsXG5cdFx0XHRkZWxheTogMS4wLFxuXHRcdFx0Ly8gZWFzZTogRXhwby5lYXNlT3V0LFxuXHRcdFx0b25VcGRhdGU6IHVwZGF0ZUFuaW1hdGlvbi5iaW5kKHRoaXMpXG5cdFx0fSk7XG5cdFx0VHdlZW5MaXRlLnRvKG9wdGlvbnMsIDMuMCwge1xuXHRcdFx0dGhpY2tuZXNzOiA3LjAsXG5cdFx0XHRsZW5ndGg6IDMwLFxuXHRcdFx0Ly8gb25Db21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBcdG9wdGlvbnMucm91bmQgPSB0cnVlO1xuXHRcdFx0Ly8gfSxcblx0XHRcdGRlbGF5OiA0LjAsXG5cdFx0fSk7XG5cdFx0VHdlZW5MaXRlLnRvKG9wdGlvbnMsIDEuMCwge1xuXHRcdFx0bGVuZ3RoOiAxMCxcblx0XHRcdGRlbGF5OiA2LjAsXG5cdFx0fSlcblx0fVxuXG5cdGZ1bmN0aW9uIGFuaW1hdGVJbjIoKSB7XG5cdFx0dmFyIHN0YXJ0ID0gMC4wO1xuXHRcdFR3ZWVuTGl0ZS5mcm9tVG8ob3B0aW9ucywgMS4wLCB7XG5cdFx0XHR0aGlja25lc3M6IDQwLFxuXG5cdFx0fSwge1xuXHRcdFx0dGhpY2tuZXNzOiAxMCxcblx0XHRcdGVhc2U6IEV4cG8uZWFzZU91dCxcblx0XHRcdGRlbGF5OiBzdGFydCsyLjAsXG5cdFx0fSlcblx0XHRUd2VlbkxpdGUuZnJvbVRvKG9wdGlvbnMsIDMuMCwge1xuXHRcdFx0bGVuZ3RoOiAyMyxcblx0XHRcdGFscGhhOiAwLjMsXG5cdFx0XHRsaWZlOiAwLjcsXG5cdFx0XHQvLyByb3VuZDogdHJ1ZSxcblx0XHRcdHNwZWVkOiAxLFxuXHRcdH0sIHtcblx0XHRcdGxpZmU6IDAuNSxcblx0XHRcdGFscGhhOiAwLjIsXG5cdFx0XHRsZW5ndGg6IDkwLFxuXHRcdFx0c3BlZWQ6IDAuNixcblx0XHRcdGRlbGF5OiBzdGFydCsxLjAsXG5cdFx0XHQvLyBlYXNlOiBFeHBvLmVhc2VPdXQsXG5cdFx0XHRvblVwZGF0ZTogdXBkYXRlQW5pbWF0aW9uLmJpbmQodGhpcylcblx0XHR9KTtcblx0XHRUd2VlbkxpdGUudG8ob3B0aW9ucywgMy4wLCB7XG5cdFx0XHR0aGlja25lc3M6IDUuMCxcblx0XHRcdGxlbmd0aDogNDAsXG5cdFx0XHQvLyBvbkNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIFx0b3B0aW9ucy5yb3VuZCA9IHRydWU7XG5cdFx0XHQvLyB9LFxuXHRcdFx0ZGVsYXk6IHN0YXJ0KzQuMCxcblx0XHR9KTtcblx0XHRUd2VlbkxpdGUudG8ob3B0aW9ucywgMS4wLCB7XG5cdFx0XHRsZW5ndGg6IDMwLFxuXHRcdFx0ZGVsYXk6IHN0YXJ0KzYuMCxcblx0XHR9KVxuXHRcdFR3ZWVuTGl0ZS50byhvcHRpb25zLCAxLjAsIHtcblx0XHRcdHRoaWNrbmVzczogMyxcblx0XHRcdGRlbGF5OiBzdGFydCs3LjAsXG5cdFx0fSk7XG5cdFx0VHdlZW5MaXRlLnRvKG9wdGlvbnMsIDEuMCwge1xuXHRcdFx0dGhpY2tuZXNzOiAzLFxuXHRcdFx0ZGVsYXk6IHN0YXJ0KzcuMCxcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNldHVwUGFydGljbGVzKCkge1xuXHRcdHBhcnRpY2xlcy5sZW5ndGggPSAwO1xuXHRcdGZvciAodmFyIGk9MDsgaTxjb3VudDsgaSsrKSB7XG5cdFx0XHRwYXJ0aWNsZXMucHVzaChuZXcgUGFydGljbGUoKS5yZXNldCh3aWR0aCwgaGVpZ2h0KS5yYW5kb20oKSk7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gdXBkYXRlR3JhaW4oKSB7XG5cdFx0bm9pc2VPdmVybGF5LmNzcygnb3BhY2l0eScsIG9wdGlvbnMuZ3JhaW4qMC4yKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNldHVwR1VJKCkge1xuXHRcdGd1aSA9IG5ldyBkYXQuR1VJKCk7XG5cblx0XHR2YXIgbW90aW9uID0gZ3VpLmFkZEZvbGRlcignbm9pc2UnKTtcdFxuXHRcdG1vdGlvbi5hZGQob3B0aW9ucywgJ3NoaWZ0Jyk7XG5cdFx0dmFyIG5vaXNlU2NhbGUgPSBtb3Rpb24uYWRkKG9wdGlvbnMsICdzY2FsZScsIDAuMSwgNSk7XG5cblx0XHRub2lzZVNjYWxlLm9uRmluaXNoQ2hhbmdlKGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRub2lzZS5zY2FsZSA9IG9wdGlvbnMuc2NhbGU7XG5cdFx0XHRub2lzZS5nZW5lcmF0ZSgpO1xuXHRcdH0pO1xuXG5cdFx0dmFyIHN0cm9rZSA9IGd1aS5hZGRGb2xkZXIoJ3N0cm9rZScpO1xuXHRcdHN0cm9rZS5hZGQob3B0aW9ucywgJ2NvdW50JywgMSwgMTUwMCkub25GaW5pc2hDaGFuZ2UoZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdGNvdW50ID0gfn52YWx1ZTtcblx0XHRcdHNldHVwUGFydGljbGVzKCk7XG5cdFx0fSk7XG5cblx0XHRzdHJva2UuYWRkKG9wdGlvbnMsICdsZW5ndGgnLCAwLjEsIDEwMC4wKTtcblx0XHRzdHJva2UuYWRkKG9wdGlvbnMsICd0aGlja25lc3MnLCAwLjEsIDUwLjApO1xuXHRcdHN0cm9rZS5hZGQob3B0aW9ucywgJ2xpZmUnLCAwLjAsIDEuMCk7XG5cdFx0c3Ryb2tlLmFkZChvcHRpb25zLCAnc3BlZWQnLCAwLjAsIDEuMCk7XG5cdFx0c3Ryb2tlLmFkZChvcHRpb25zLCAnYWxwaGEnLCAwLjAsIDEuMCk7XG5cdFx0c3Ryb2tlLmFkZChvcHRpb25zLCAnYW5nbGUnLCAwLjAsIDIuMCk7XG5cdFx0c3Ryb2tlLmFkZChvcHRpb25zLCAncm91bmQnKTtcblx0XHRzdHJva2UuYWRkKG9wdGlvbnMsICdtb3Rpb24nKTtcblx0XHRzdHJva2Uub3BlbigpO1xuXG5cdFx0dmFyIGNvbG9yID0gZ3VpLmFkZEZvbGRlcignY29sb3InKTtcblx0XHRjb2xvci5hZGQob3B0aW9ucywgJ3VzZU9yaWdpbmFsJyk7XG5cdFx0Y29sb3IuYWRkKG9wdGlvbnMsICdkYXJrZW4nKTtcblx0XHRjb2xvci5hZGQob3B0aW9ucywgJ2h1ZScsIDAsIDM2MCk7XG5cdFx0Y29sb3IuYWRkKG9wdGlvbnMsICdzYXR1cmF0aW9uJywgMCwgMS4wKTtcblx0XHRjb2xvci5hZGQob3B0aW9ucywgJ2xpZ2h0bmVzcycsIDAsIDEuMCk7XG5cdFx0Y29sb3IuYWRkKG9wdGlvbnMsICdncmFpbicsIDAsIDEuMCkub25GaW5pc2hDaGFuZ2UodXBkYXRlR3JhaW4uYmluZCh0aGlzKSk7XG5cdFx0Y29sb3Iub3BlbigpO1xuXG5cdFx0dmFyIGNhbnZhcyA9IGd1aS5hZGRGb2xkZXIoJ2NhbnZhcycpO1xuXG5cdFx0Y2FudmFzLmFkZChvcHRpb25zLCAncGFpbnRpbmcnKTtcblx0XHRjYW52YXMuYWRkQ29sb3Iob3B0aW9ucywgJ2JhY2tncm91bmQnKTtcblx0XHRjYW52YXMuYWRkKG9wdGlvbnMsICd2aWV3T3JpZ2luYWwnKS5vbkZpbmlzaENoYW5nZShmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0b3JpZ2luYWxJbWFnZS5jc3MoJ3Zpc2liaWxpdHknLCB2YWx1ZSA/ICd2aXNpYmxlJyA6ICdoaWRkZW4nKTtcblx0XHR9KTtcblx0XHRjYW52YXMuYWRkKG9wdGlvbnMsICdhbmltYXRlJyk7XG5cdFx0Y2FudmFzLmFkZChvcHRpb25zLCAnY2xlYXInKTtcblx0XHRjYW52YXMuYWRkKG9wdGlvbnMsICdleHBvcnRJbWFnZScpO1xuXHRcdGNhbnZhcy5vcGVuKCk7XG5cblxuXG5cdH1cblxuXHRmdW5jdGlvbiBjbGVhclJlY3QoKSB7XG5cdFx0Y29udGV4dC5nbG9iYWxBbHBoYSA9IDEuMDtcblx0XHRjb250ZXh0LmZpbGxTdHlsZSA9IG9wdGlvbnMuYmFja2dyb3VuZDtcblx0XHRjb250ZXh0LmZpbGxSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuXHR9XG5cblx0ZnVuY3Rpb24gY2xlYXIoKSB7XG5cdFx0VHdlZW5MaXRlLmtpbGxUd2VlbnNPZihvcHRpb25zKTtcblx0XHRjbGVhclJlY3QoKTtcblx0XHRzZXR1cFBhcnRpY2xlcygpO1xuXHR9XG5cbiAgICBmdW5jdGlvbiBsb2FkVmlkZW8oKSB7XG4gICAgXHQvL2NvbnNvbGUubG9nKFwiVFJZSU5HXCIpO1xuICAgICAgICBpZiAobmF2aWdhdG9yLmdldFVzZXJNZWRpYSAmJiB3aW5kb3cuVVJMICYmIHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKSB7XG4gICAgICAgIFx0Ly9jb25zb2xlLmxvZyhcIkhFTExPT09PXCIpO1xuICAgICAgICAgICAgLy9jcmVhdGUgYSA8dmlkZW8+IGVsZW1lbnRcbiAgICAgICAgICAgIHZpZGVvID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInZpZGVvXCIpO1xuICAgICAgICAgICAgdmlkZW8uc2V0QXR0cmlidXRlKFwiYXV0b3BsYXlcIiwgXCJcIik7XG4gICAgICAgICAgICB2aWRlby53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgdmlkZW8uaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICAgICAgdmlkZW8uc3R5bGUuYmFja2dyb3VuZCA9IFwiYmxhY2tcIjtcbiAgICAgICAgICAgIC8vIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodmlkZW8pO1xuXG4gICAgICAgICAgICB2aWRlby5hZGRFdmVudExpc3RlbmVyKFwicGxheVwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIFx0cGxheWluZyA9IHRydWU7XG4gICAgICAgICAgICBcdGNsZWFyKCk7XG4gICAgICAgICAgICBcdGFuaW1hdGVJbigpO1xuICAgICAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiR0VUVElORyBWSURFT1wiKTtcblxuICAgICAgICAgICAgLy9kaXNhYmxlZCBmb3Igbm93LlxuICAgICAgICAgICAgLy8gbmF2aWdhdG9yLmdldFVzZXJNZWRpYSh7dmlkZW86IHRydWV9LCBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgICAgICAgIC8vICAgICB2aWRlby5zcmMgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChzdHJlYW0pO1xuICAgICAgICAgICAgLy8gICAgIGhhc1ZpZGVvID0gdHJ1ZTtcblxuICAgICAgICAgICAgLy8gfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyAgICAgLy9lcnIgaGFuZGxpbmcuLi5cbiAgICAgICAgICAgIC8vIH0pO1xuXG4gICAgICAgIH1cbiAgICB9XG4vL21vcmUgZmFpbGVkIGV4cGVyaW1lbnRzLi5cblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgZnVuY3Rpb24oZXYpIHtcblx0XHRtb3VzZS5zZXQoZXYuY2xpZW50WCwgZXYuY2xpZW50WSk7XG5cdH0pO1xuXG5cbiAgICB2YXIgc3Ryb2tlQ291bnQgPSAwO1xuXHRmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbmRlcik7XG5cblx0XHR2YXIgbm93ID0gRGF0ZS5ub3coKTtcblx0XHR2YXIgZGVsdGEgPSBub3cgLSBzdGFydFRpbWU7XG5cdFx0c3RhcnRUaW1lID0gbm93O1xuXHRcdFxuXHRcdHRpbWUrPTAuMTtcblx0XHRzdGVwKys7XG5cblxuXG5cdFx0aWYgKCFvcHRpb25zLnBhaW50aW5nIClcblx0XHRcdHJldHVybjtcblxuXHRcdHdlYmNhbVRpbWVyICs9IGRlbHRhO1xuXHRcdGlmICh3ZWJjYW1UaW1lciA+IHdlYmNhbURlbGF5ICYmIHBsYXlpbmcpIHtcblx0XHRcdC8vIGNvbnNvbGUubG9nKFwiVEVTVFwiKTtcblx0XHRcdHdlYmNhbVRpbWVyID0gMDtcblx0XHRcdGltYWdlUGl4ZWxzID0gaW1hZ2VkYXRhLmdldEltYWdlRGF0YSh2aWRlbykuZGF0YTtcblx0XHR9XG5cblx0XHQvLyBpZiAoc3RlcCAlIDEwMCA9PT0gMCkgXG5cdFx0Ly8gXHRjb25zb2xlLmxvZyhzdHJva2VDb3VudCk7XG5cblx0XHRpZiAob3B0aW9ucy5zaGlmdCAmJiBzdGVwICUgMjAgPT09IDApIHtcblx0XHRcdG5vaXNlLm9mZnNldCs9LjAxO1xuXHRcdFx0bm9pc2UuZ2VuZXJhdGUoKTtcblx0XHR9XG5cblx0XHQvLyBjb250ZXh0Lmdsb2JhbEFscGhhID0gMC4xO1xuXHRcdC8vIGNvbnRleHQuZmlsbFN0eWxlID0gJ3doaXRlJztcblx0XHQvLyBjb250ZXh0LmZpbGxSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuXG5cdFx0Ly8gY29udGV4dC5jbGVhclJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodCk7XG5cdFx0dmFyIGltYWdlV2lkdGggPSBpbWFnZS53aWR0aDtcblxuXHRcdC8vIGZvciAodmFyIHk9MDsgeTxoZWlnaHQ7IHkrKykge1xuXHRcdC8vIFx0Zm9yICh2YXIgeD0wOyB4PHdpZHRoOyB4KyspIHtcblx0XHQvLyBcdFx0dmFyIHNhbXBsZVdpZHRoID0gd2lkdGgsXG5cdFx0Ly8gXHRcdFx0c2FtcGxlSGVpZ2h0ID0gd2lkdGg7XG5cblx0XHQvLyBcdFx0dmFyIHB4SW5kZXggPSAoeCArICh5ICogaW1hZ2VXaWR0aCkpKjQ7XG5cdFx0Ly8gXHRcdHZhciByZWQgPSBpbWFnZVBpeGVsc1sgcHhJbmRleCBdLFxuXHRcdC8vIFx0XHRcdGdyZWVuID0gaW1hZ2VQaXhlbHNbIHB4SW5kZXggKyAxXSxcblx0XHQvLyBcdFx0XHRibHVlID0gaW1hZ2VQaXhlbHNbcHhJbmRleCArIDJdO1xuXHRcdC8vIFx0XHRjb250ZXh0LmZpbGxTdHlsZSA9ICdyZ2IoJytyZWQrJywgJytncmVlbisnLCAnK2JsdWUrJyknO1xuXG5cdFx0Ly8gXHRcdC8vIHZhciBuID0gbm9pc2Uuc2FtcGxlKHgqKG5vaXNlU2l6ZS9zYW1wbGVXaWR0aCksIHkqKG5vaXNlU2l6ZS9zYW1wbGVIZWlnaHQpKTtcblx0XHQvLyBcdFx0Ly8gY29udGV4dC5maWxsU3R5bGUgPSAnaHNsKDAsIDAlLCAnKygobi8yKzAuNSkqMTAwKSsnJSknO1xuXHRcdC8vIFx0XHRjb250ZXh0LmZpbGxSZWN0KHgsIHksIDEsIDEpO1xuXHRcdC8vIFx0fVxuXHRcdC8vIH1cblx0XHRcblxuXHRcdGZvciAodmFyIGk9MDsgaTxwYXJ0aWNsZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBwID0gcGFydGljbGVzW2ldO1xuXG5cdFx0XHRpZiAocC5tb3Rpb24pXG5cdFx0XHRcdHAucG9zaXRpb24uYWRkKHAudmVsb2NpdHkpO1xuXG5cdFx0XHQvL2FkZCBpbiBvdXIgbW90aW9uXG5cdFx0XHR2YXIgcHggPSB+fnAucG9zaXRpb24ueCxcblx0XHRcdFx0cHkgPSB+fnAucG9zaXRpb24ueTtcblxuXHRcdFx0dmFyIHNhbXBsZVdpZHRoID0gd2lkdGgsXG5cdFx0XHRcdHNhbXBsZUhlaWdodCA9IHdpZHRoO1xuXG5cdFx0XHR2YXIgbiA9IG5vaXNlLnNhbXBsZShweCoobm9pc2VTaXplL3NhbXBsZVdpZHRoKSwgcHkqKG5vaXNlU2l6ZS9zYW1wbGVIZWlnaHQpKTtcblxuXHRcdFx0dmFyIGFuZ2xlID0gbiAqIE1hdGguUEkgKiAyICogb3B0aW9ucy5hbmdsZTtcblx0XHRcdFxuXHRcdFx0dG1wLnNldCggTWF0aC5jb3MoYW5nbGUpLCBNYXRoLnNpbihhbmdsZSkgKTtcblx0XHRcdHAudmVsb2NpdHkuYWRkKHRtcCk7XG5cdFx0XHRwLnZlbG9jaXR5Lm5vcm1hbGl6ZSgpO1xuXG5cdFx0XHQvLyBpZiAocC5wb3NpdGlvbi54ID4gd2lkdGggfHwgcC5wb3NpdGlvbi54IDwgMCB8fCBwLnBvc2l0aW9uLnkgPiBoZWlnaHQgfHwgcC5wb3NpdGlvbi55IDwgMCApIHtcblx0XHRcdC8vIFx0cC5yZXNldCgpO1xuXHRcdFx0Ly8gfVxuXG5cdFx0XHRpZiAoLypwLnBvc2l0aW9uLnggPCAwIHx8ICovcC5wb3NpdGlvbi54ID4gd2lkdGggfHwgcC5wb3NpdGlvbi55ID4gaGVpZ2h0IHx8IHAucG9zaXRpb24ueSA8IDApIHtcblx0XHRcdFx0cC5yZXNldCgpO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgcm90ID0gKG4vMiswLjUpO1xuXHRcdFx0dmFyIGh1ZSA9IChub2lzZS5vZmZzZXQgJSA1MCkvNTAgKiByb3Q7XG5cblx0XHRcdHZhciBpbWdYID0gcHgsXG5cdFx0XHRcdGltZ1kgPSBweTtcblx0XHRcdC8vIHZhciBpbWdYID1weC0obW91c2UueCksXG5cdFx0XHQvLyBcdGltZ1kgPSBweS0obW91c2UueSk7XG5cdFx0XHR2YXIgcHhJbmRleCA9IChpbWdYICsgKGltZ1kgKiBpbWFnZVdpZHRoKSkqNDtcblx0XHRcdHZhciByZWQgPSBpbWFnZVBpeGVsc1sgcHhJbmRleCBdLFxuXHRcdFx0XHRncmVlbiA9IGltYWdlUGl4ZWxzWyBweEluZGV4ICsgMV0sXG5cdFx0XHRcdGJsdWUgPSBpbWFnZVBpeGVsc1tweEluZGV4ICsgMl07XG5cblx0XHRcdC8vIHZhciBhbHBoYSA9IE1hdGguc2luKHRpbWUqMC4xKSoxMDArMTAwO1xuXHRcdFx0dmFyIGFscGhhID0gb3B0aW9ucy5odWU7XG5cblx0XHRcdC8vIENJRSBsdW1pbmFuY2UgZm9yIHRoZSBSR0Jcblx0XHRcdHZhciB2YWwgPSAwLjIxMjYgKiAocmVkLzI1NSkgKyAwLjcxNTIgKiAoZ3JlZW4vMjU1KSArIDAuMDcyMiAqIChibHVlLzI1NSk7XG5cdFx0XHRcblxuXHRcdFx0dmFyIGJyaWdodG5lc3MgPSBvcHRpb25zLmRhcmtlbiA/IHZhbCA6IDEuMDtcblx0XHRcdFxuXHRcdFx0Ly8gY29udGV4dC5zdHJva2VTdHlsZSA9ICdoc2woJytsZXJwKGFscGhhLCBhbHBoYS0xMDAsIHJvdCkrJywgJysoMS1yZWQvMjU1KSpsZXJwKDAuNywgMSwgcm90KSoxMDArJyUsICcrbGVycCgwLjQ1LCAwLjU1LCByb3QpKjEwMCsnJSknO1xuXHRcdFx0aWYgKG9wdGlvbnMudXNlT3JpZ2luYWwpXG5cdFx0XHRcdGNvbnRleHQuc3Ryb2tlU3R5bGUgPSAncmdiKCcrfn4ocmVkKmJyaWdodG5lc3MpKycsICcrfn4oZ3JlZW4qYnJpZ2h0bmVzcykrJywgJyt+fihibHVlKmJyaWdodG5lc3MpKycpJztcblx0XHRcdGVsc2Vcblx0XHRcdFx0Y29udGV4dC5zdHJva2VTdHlsZSA9ICdoc2woJytsZXJwKGFscGhhLCBhbHBoYS0xMDAsIHJvdCkrJywgJysoMS12YWwpKmxlcnAoMC4yLCAwLjksIHJvdCkqb3B0aW9ucy5zYXR1cmF0aW9uKjEwMCsnJSwgJysodmFsKSpsZXJwKDAuNDUsIDEsIHJvdCkqYnJpZ2h0bmVzcypvcHRpb25zLmxpZ2h0bmVzcyoxMDArJyUpJztcblxuXHRcdFx0dmFyIHMgPSAyO1xuXG5cdFx0XHQvLyBjb250ZXh0LmZpbGxTdHlsZSA9ICdibGFjayc7XG5cdFx0XHQvLyBjb250ZXh0LmZpbGxSZWN0KHAucG9zaXRpb24ueCwgcC5wb3NpdGlvbi55LCAxLCAxKTtcblxuXHRcdCBcdGNvbnRleHQuYmVnaW5QYXRoKCk7XG5cdFx0XHRjb250ZXh0Lm1vdmVUbyhwLnBvc2l0aW9uLngsIHAucG9zaXRpb24ueSk7XG5cdFx0XHR2YXIgbGluZVNpemUgPSAob3B0aW9ucy5sZW5ndGgqKG4vMiswLjUpKnAuc2l6ZSk7XG5cdFx0XHR0bXAuY29weShwLnBvc2l0aW9uKTtcblx0XHRcdHRtcDIuY29weShwLnZlbG9jaXR5KS5zY2FsZShsaW5lU2l6ZSk7XG5cdFx0XHR0bXAuYWRkKHRtcDIpO1xuXHRcdFx0Y29udGV4dC5saW5lVG8odG1wLngsIHRtcC55KTtcblx0XHRcdGNvbnRleHQuc3Ryb2tlKCk7XG5cdFx0XHRjb250ZXh0Lmdsb2JhbEFscGhhID0gb3B0aW9ucy5hbHBoYTtcblx0XHRcdGNvbnRleHQubGluZVdpZHRoID0gb3B0aW9ucy50aGlja25lc3MqKG4vMiswLjUpO1xuXHRcdFx0Y29udGV4dC5saW5lQ2FwID0gb3B0aW9ucy5yb3VuZCA/ICdyb3VuZCcgOiAnc3F1YXJlJztcblxuXHRcdFx0cC5zaXplICs9IDAuMSAqIG9wdGlvbnMuc3BlZWQgKiBwLnNwZWVkO1xuXHRcdFx0aWYgKHAuc2l6ZSA+PSBvcHRpb25zLmxpZmUpIHtcblx0XHRcdFx0cC5yZXNldCh3aWR0aCwgaGVpZ2h0KS5yYW5kb20oKTtcdFxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0fVxuXG5cdFx0Ly8gc3Ryb2tlQ291bnQgKz0gcGFydGljbGVzLmxlbmd0aDtcblxuXG5cdFx0cHJldmlld0NvbnRleHQuZHJhd0ltYWdlKGNhbnZhcywgMCwgMCwgcHJldmlld1dpZHRoLCBwcmV2aWV3SGVpZ2h0KTtcblx0fVxufSk7IiwidmFyIFZlY3RvcjIgPSByZXF1aXJlKCd2ZWNtYXRoJykuVmVjdG9yMjtcblxuZnVuY3Rpb24gUGFydGljbGUoeCwgeSwgdngsIHZ5KSB7XG5cdHRoaXMucG9zaXRpb24gPSBuZXcgVmVjdG9yMih4LCB5KTtcblx0dGhpcy52ZWxvY2l0eSA9IG5ldyBWZWN0b3IyKHZ4LCB2eSk7XG5cdHRoaXMuc2l6ZSA9IDA7XG5cdHRoaXMuc3BlZWQgPSBNYXRoLnJhbmRvbSgpO1xuXHR0aGlzLmJyaWdodG5lc3MgPSBNYXRoLnJhbmRvbSgpO1xufVxuXG5cblBhcnRpY2xlLnByb3RvdHlwZS5yYW5kb20gPSBmdW5jdGlvbigpIHtcblx0Ly8gdGhpcy52ZWxvY2l0eS5zZXQoTWF0aC5yYW5kb20oKSoyLTEsIE1hdGgucmFuZG9tKCkqMi0xKTtcblx0dGhpcy5zaXplID0gTWF0aC5yYW5kb20oKTtcblx0cmV0dXJuIHRoaXM7XG59XG5QYXJ0aWNsZS5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbih3aWR0aCwgaGVpZ2h0KSB7XG5cdHdpZHRoPXdpZHRofHwwO1xuXHRoZWlnaHQ9aGVpZ2h0fHwwO1xuXG5cdHRoaXMuc2l6ZSA9IDA7XG5cdHRoaXMuYnJpZ2h0bmVzcyA9IE1hdGgucmFuZG9tKCk7XG5cblx0Ly8gdGhpcy52ZWxvY2l0eS5zZXQoTWF0aC5yYW5kb20oKSoyLTEsIE1hdGgucmFuZG9tKCkqMi0xKTtcblx0dGhpcy52ZWxvY2l0eS5zZXQoMCwgMCk7XG5cdHRoaXMucG9zaXRpb24uc2V0KE1hdGgucmFuZG9tKCkqd2lkdGgsIE1hdGgucmFuZG9tKCkqaGVpZ2h0KTtcblx0cmV0dXJuIHRoaXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUGFydGljbGU7IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdFBhcnRpY2xlOiByZXF1aXJlKCcuL1BhcnRpY2xlJylcbn07IiwidmFyIENsYXNzID0gcmVxdWlyZSgna2xhc3NlJyk7XG52YXIgU2ltcGxleE5vaXNlID0gcmVxdWlyZSgnc2ltcGxleC1ub2lzZScpO1xudmFyIGxlcnAgPSByZXF1aXJlKCdpbnRlcnBvbGF0aW9uJykubGVycDtcbnZhciBzYW1wbGluZyA9IHJlcXVpcmUoJy4vc2FtcGxpbmcnKTtcblxudmFyIFBSTkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZWVkID0gMTtcbiAgICB0aGlzLnJhbmRvbSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gKHRoaXMuZ2VuKCkgLyAyMTQ3NDgzNjQ3KTsgfTtcbiAgICB0aGlzLmdlbiA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zZWVkID0gKHRoaXMuc2VlZCAqIDE2ODA3KSAlIDIxNDc0ODM2NDc7IH07XG59O1xuXG52YXIgcmFuZCA9IHVuZGVmaW5lZDtcblxuLy93ZSBjYW4gdXNlIGEgZGV0ZXJtaW5pc3RpYyByYW5kb20gZ2VuZXJhdG9yIGlmIHdlIHdhbnQuLi5cbi8vcmFuZCA9IG5ldyBQUk5HKCk7XG5cbnZhciBOb2lzZU1hcCA9IG5ldyBDbGFzcyh7XG5cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbihzaXplKSB7XG4gICAgICAgIGlmICghc2l6ZSlcbiAgICAgICAgICAgIHRocm93IFwibm8gc2l6ZSBzcGVjaWZpZWQgdG8gTm9pc2VNYXBcIjtcblxuICAgICAgICB0aGlzLnNpbXBsZXggPSBuZXcgU2ltcGxleE5vaXNlKHJhbmQpO1xuICAgICAgICB0aGlzLnNpemUgPSBzaXplOyAgIFxuICAgICAgICB0aGlzLnNjYWxlID0gMjA7XG4gICAgICAgIHRoaXMub2Zmc2V0ID0gMDtcbiAgICAgICAgdGhpcy5zbW9vdGggPSB0cnVlO1xuICAgICAgICB0aGlzLnNlYW1sZXNzID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5kYXRhID0gbmV3IEZsb2F0MzJBcnJheSh0aGlzLnNpemUgKiB0aGlzLnNpemUpO1xuICAgIH0sXG4gICAgXG4gICAgc2VhbWxlc3NOb2lzZTogZnVuY3Rpb24ocywgdCwgc2NhbGUsIGN4LCBjeSwgY3osIGN3KSB7XG4gICAgICAgIC8vIEdlbmVyYXRlIHRoZSA0ZCBjb29yZGluYXRlcyB0aGF0IHdyYXAgYXJvdW5kIHNlYW1sZXNzbHlcbiAgICAgICAgdmFyIHIgPSBzY2FsZSAvICgyICogTWF0aC5QSSk7XG4gICAgICAgIHZhciBheHkgPSAyICogTWF0aC5QSSAqIHMgLyBzY2FsZTsgICAgICAgIFxuICAgICAgICB2YXIgeCA9IHIgKiBNYXRoLmNvcyhheHkpO1xuICAgICAgICB2YXIgeSA9IHIgKiBNYXRoLnNpbihheHkpO1xuICAgICAgICBcbiAgICAgICAgdmFyIGF6dyA9IDIgKiBNYXRoLlBJICogdCAvIHNjYWxlOyAgICAgICAgXG4gICAgICAgIHZhciB6ID0gciAqIE1hdGguY29zKGF6dyk7XG4gICAgICAgIHZhciB3ID0gciAqIE1hdGguc2luKGF6dyk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuc2ltcGxleC5ub2lzZTREKGN4ICsgeCwgY3kgKyB5LCBjeiArIHosIGN3ICsgdyk7XG4gICAgfSxcblxuICAgIHJhbmRvbWl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuc2ltcGxleCA9IG5ldyBTaW1wbGV4Tm9pc2UocmFuZCk7XG4gICAgfSxcblxuICAgIGdlbmVyYXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG5vaXNlTWFwID0gdGhpcy5kYXRhLFxuICAgICAgICAgICAgbm9pc2VTaXplID0gdGhpcy5zaXplLFxuICAgICAgICAgICAgbm9pc2VPZmYgPSB0aGlzLm9mZnNldCxcbiAgICAgICAgICAgIHNlYW1sZXNzID0gdGhpcy5zZWFtbGVzcyxcbiAgICAgICAgICAgIHpvb20gPSB0aGlzLnNjYWxlO1xuXG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxub2lzZU1hcC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHggPSBpICUgbm9pc2VTaXplLFxuICAgICAgICAgICAgICAgIHkgPSB+figgaSAvIG5vaXNlU2l6ZSApO1xuXG4gICAgICAgICAgICBpZiAoc2VhbWxlc3MpXG4gICAgICAgICAgICAgICAgbm9pc2VNYXBbaV0gPSB0aGlzLnNlYW1sZXNzTm9pc2UoeC9ub2lzZVNpemUqem9vbSArIG5vaXNlT2ZmLCB5L25vaXNlU2l6ZSp6b29tICsgbm9pc2VPZmYsIHpvb20sIDAsIDAsIDAsIDApO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIG5vaXNlTWFwW2ldID0gdGhpcy5zaW1wbGV4Lm5vaXNlM0QoeC9ub2lzZVNpemUgKiB6b29tLCB5L25vaXNlU2l6ZSAqIHpvb20sIG5vaXNlT2ZmKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBzYW1wbGU6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgICAgaWYgKHRoaXMuc21vb3RoKVxuICAgICAgICAgICAgcmV0dXJuIHNhbXBsaW5nLmJpbGluZWFyKHRoaXMuZGF0YSwgdGhpcy5zaXplLCB4LCB5KTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIHNhbXBsaW5nLm5lYXJlc3QodGhpcy5kYXRhLCB0aGlzLnNpemUsIHgsIHkpO1xuICAgIH0sXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBOb2lzZU1hcDsiLCJ2YXIgY2FudmFzLCBjb250ZXh0O1xuXG5tb2R1bGUuZXhwb3J0cy5nZXRJbWFnZURhdGEgPSBmdW5jdGlvbihpbWFnZSwgd2lkdGgsIGhlaWdodCkge1xuXHRpZiAoIWNhbnZhcykge1xuXHRcdGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XG5cdFx0Y29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG5cdH1cblxuXHR3aWR0aCA9ICh3aWR0aHx8d2lkdGg9PT0wKSA/IHdpZHRoIDogaW1hZ2Uud2lkdGg7XG5cdGhlaWdodCA9IChoZWlnaHR8fGhlaWdodD09PTApID8gaGVpZ2h0IDogaW1hZ2UuaGVpZ2h0O1xuXG5cdGNhbnZhcy53aWR0aCA9IHdpZHRoO1xuXHRjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXHRcblx0Y29udGV4dC5nbG9iYWxBbHBoYSA9IDE7XG5cdGNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuXHRjb250ZXh0LmRyYXdJbWFnZShpbWFnZSwgMCwgMCwgd2lkdGgsIGhlaWdodCk7XG5cblx0dmFyIGltZ0RhdGEgPSBjb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcblx0cmV0dXJuIGltZ0RhdGE7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5yZWxlYXNlID0gZnVuY3Rpb24oKSB7XG5cdGlmIChjYW52YXMpIHtcblx0XHRjYW52YXMgPSBudWxsO1xuXHRcdGNvbnRleHQgPSBudWxsO1xuXHR9XHRcbn07XG4iLCJ2YXIgbGVycCA9IHJlcXVpcmUoJ2ludGVycG9sYXRpb24nKS5sZXJwO1xudmFyIHNtb290aHN0ZXAgPSByZXF1aXJlKCdpbnRlcnBvbGF0aW9uJykuc21vb3Roc3RlcDtcblxubW9kdWxlLmV4cG9ydHMubmVhcmVzdCA9IGZ1bmN0aW9uKGRhdGEsIHNpemUsIHgsIHkpIHtcbiAgICB2YXIgcHggPSB+fnggJSBzaXplLFxuICAgICAgICBweSA9IH5+eSAlIHNpemU7XG4gICAgcmV0dXJuIGRhdGFbIHB4ICsgKHB5ICogc2l6ZSkgXTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLmJpbGluZWFyID0gZnVuY3Rpb24oZGF0YSwgc2l6ZSwgeCwgeSkge1xuICAgIC8vYmlsaW5lYXIgaW50ZXJwb2xhdGlvbiBcbiAgICAvL2h0dHA6Ly93d3cuc2NyYXRjaGFwaXhlbC5jb20vbGVzc29ucy8zZC1hZHZhbmNlZC1sZXNzb25zL25vaXNlLXBhcnQtMS9jcmVhdGluZy1hLXNpbXBsZS0yZC1ub2lzZS9cbiAgICB2YXIgeGkgPSBNYXRoLmZsb29yKCB4ICk7XG4gICAgdmFyIHlpID0gTWF0aC5mbG9vciggeSApO1xuIFxuICAgIHZhciB0eCA9IHggLSB4aTtcbiAgICB2YXIgdHkgPSB5IC0geWk7XG5cbiAgICB2YXIgbWFzayA9IHNpemUtMTtcbiBcbiAgICB2YXIgcngwID0geGkgJiBtYXNrO1xuICAgIHZhciByeDEgPSAoIHJ4MCArIDEgKSAmIG1hc2s7XG4gICAgdmFyIHJ5MCA9IHlpICYgbWFzaztcbiAgICB2YXIgcnkxID0gKCByeTAgKyAxICkgJiBtYXNrO1xuIFxuICAgIC8vLyByYW5kb20gdmFsdWVzIGF0IHRoZSBjb3JuZXJzIG9mIHRoZSBjZWxsIHVzaW5nIHBlcm11dGF0aW9uIHRhYmxlXG4gICAgdmFyIGMwMCA9IGRhdGFbIChyeTAgKiBzaXplICsgcngwKSBdO1xuICAgIHZhciBjMTAgPSBkYXRhWyAocnkwICogc2l6ZSArIHJ4MSkgXTtcbiAgICB2YXIgYzAxID0gZGF0YVsgKHJ5MSAqIHNpemUgKyByeDApIF07XG4gICAgdmFyIGMxMSA9IGRhdGFbIChyeTEgKiBzaXplICsgcngxKSBdO1xuXG4gICAgLy8vIHJlbWFwcGluZyBvZiB0eCBhbmQgdHkgdXNpbmcgdGhlIFNtb290aHN0ZXAgZnVuY3Rpb25cbiAgICB2YXIgc3ggPSBzbW9vdGhzdGVwKCAwLCAxLCB0eCApO1xuICAgIHZhciBzeSA9IHNtb290aHN0ZXAoIDAsIDEsIHR5ICk7XG4gXG4gICAgLy8vIGxpbmVhcmx5IGludGVycG9sYXRlIHZhbHVlcyBhbG9uZyB0aGUgeCBheGlzXG4gICAgdmFyIG54MCA9IGxlcnAoIGMwMCwgYzEwLCBzeCApO1xuICAgIHZhciBueDEgPSBsZXJwKCBjMDEsIGMxMSwgc3ggKTtcbiAgICBcbiAgICAvLy8gbGluZWFybHkgaW50ZXJwb2xhdGUgdGhlIG54MC9ueDEgYWxvbmcgdGhleSB5IGF4aXNcbiAgICB2YXIgdiA9IGxlcnAoIG54MCwgbngxLCBzeSApO1xuICAgIHJldHVybiB2O1xufTsgIl19
