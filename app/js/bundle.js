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
			TweenLite.delayedCall(0.5, function() {
				options.painting = true;
				animateIn();
			}.bind(this));
		}).on('touchmove', function(ev) {
			ev.preventDefault()
		});

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvcHJvamVjdHMvaW1wcmVzc2lvbmlzdC9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvbm9kZV9tb2R1bGVzL2ludGVycG9sYXRpb24vaW5kZXguanMiLCIvcHJvamVjdHMvaW1wcmVzc2lvbmlzdC9ub2RlX21vZHVsZXMva2xhc3NlL2luZGV4LmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvbm9kZV9tb2R1bGVzL3JhZi5qcy9yYWYuanMiLCIvcHJvamVjdHMvaW1wcmVzc2lvbmlzdC9ub2RlX21vZHVsZXMvc2ltcGxleC1ub2lzZS9zaW1wbGV4LW5vaXNlLmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvbm9kZV9tb2R1bGVzL3ZlY21hdGgvbGliL01hdHJpeDMuanMiLCIvcHJvamVjdHMvaW1wcmVzc2lvbmlzdC9ub2RlX21vZHVsZXMvdmVjbWF0aC9saWIvTWF0cml4NC5qcyIsIi9wcm9qZWN0cy9pbXByZXNzaW9uaXN0L25vZGVfbW9kdWxlcy92ZWNtYXRoL2xpYi9RdWF0ZXJuaW9uLmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvbm9kZV9tb2R1bGVzL3ZlY21hdGgvbGliL1ZlY3RvcjIuanMiLCIvcHJvamVjdHMvaW1wcmVzc2lvbmlzdC9ub2RlX21vZHVsZXMvdmVjbWF0aC9saWIvVmVjdG9yMy5qcyIsIi9wcm9qZWN0cy9pbXByZXNzaW9uaXN0L25vZGVfbW9kdWxlcy92ZWNtYXRoL2xpYi9WZWN0b3I0LmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvbm9kZV9tb2R1bGVzL3ZlY21hdGgvbGliL2NvbW1vbi5qcyIsIi9wcm9qZWN0cy9pbXByZXNzaW9uaXN0L25vZGVfbW9kdWxlcy92ZWNtYXRoL2xpYi9pbmRleC5qcyIsIi9wcm9qZWN0cy9pbXByZXNzaW9uaXN0L3NyYy9mYWtlXzdjZWUzOTFjLmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvc3JjL2ltcHJlc3Npb24vUGFydGljbGUuanMiLCIvcHJvamVjdHMvaW1wcmVzc2lvbmlzdC9zcmMvaW1wcmVzc2lvbi9pbmRleC5qcyIsIi9wcm9qZWN0cy9pbXByZXNzaW9uaXN0L3NyYy91dGlsL05vaXNlTWFwLmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvc3JjL3V0aWwvaW1hZ2VkYXRhLmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvc3JjL3V0aWwvc2FtcGxpbmcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0WkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1cUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqIFV0aWxpdHkgZnVuY3Rpb24gZm9yIGxpbmVhciBpbnRlcnBvbGF0aW9uLiAqL1xubW9kdWxlLmV4cG9ydHMubGVycCA9IGZ1bmN0aW9uKHYwLCB2MSwgdCkge1xuICAgIHJldHVybiB2MCooMS10KSt2MSp0O1xufTtcblxuLyoqIFV0aWxpdHkgZnVuY3Rpb24gZm9yIEhlcm1pdGUgaW50ZXJwb2xhdGlvbi4gKi9cbm1vZHVsZS5leHBvcnRzLnNtb290aHN0ZXAgPSBmdW5jdGlvbih2MCwgdjEsIHQpIHtcbiAgICAvLyBTY2FsZSwgYmlhcyBhbmQgc2F0dXJhdGUgeCB0byAwLi4xIHJhbmdlXG4gICAgdCA9IE1hdGgubWF4KDAuMCwgTWF0aC5taW4oMS4wLCAodCAtIHYwKS8odjEgLSB2MCkgKSk7XG4gICAgLy8gRXZhbHVhdGUgcG9seW5vbWlhbFxuICAgIHJldHVybiB0KnQqKDMgLSAyKnQpO1xufTsiLCJmdW5jdGlvbiBoYXNHZXR0ZXJPclNldHRlcihkZWYpIHtcblx0cmV0dXJuICghIWRlZi5nZXQgJiYgdHlwZW9mIGRlZi5nZXQgPT09IFwiZnVuY3Rpb25cIikgfHwgKCEhZGVmLnNldCAmJiB0eXBlb2YgZGVmLnNldCA9PT0gXCJmdW5jdGlvblwiKTtcbn1cblxuZnVuY3Rpb24gZ2V0UHJvcGVydHkoZGVmaW5pdGlvbiwgaywgaXNDbGFzc0Rlc2NyaXB0b3IpIHtcblx0Ly9UaGlzIG1heSBiZSBhIGxpZ2h0d2VpZ2h0IG9iamVjdCwgT1IgaXQgbWlnaHQgYmUgYSBwcm9wZXJ0eVxuXHQvL3RoYXQgd2FzIGRlZmluZWQgcHJldmlvdXNseS5cblx0XG5cdC8vRm9yIHNpbXBsZSBjbGFzcyBkZXNjcmlwdG9ycyB3ZSBjYW4ganVzdCBhc3N1bWUgaXRzIE5PVCBwcmV2aW91c2x5IGRlZmluZWQuXG5cdHZhciBkZWYgPSBpc0NsYXNzRGVzY3JpcHRvciBcblx0XHRcdFx0PyBkZWZpbml0aW9uW2tdIFxuXHRcdFx0XHQ6IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoZGVmaW5pdGlvbiwgayk7XG5cblx0aWYgKCFpc0NsYXNzRGVzY3JpcHRvciAmJiBkZWYudmFsdWUgJiYgdHlwZW9mIGRlZi52YWx1ZSA9PT0gXCJvYmplY3RcIikge1xuXHRcdGRlZiA9IGRlZi52YWx1ZTtcblx0fVxuXG5cblx0Ly9UaGlzIG1pZ2h0IGJlIGEgcmVndWxhciBwcm9wZXJ0eSwgb3IgaXQgbWF5IGJlIGEgZ2V0dGVyL3NldHRlciB0aGUgdXNlciBkZWZpbmVkIGluIGEgY2xhc3MuXG5cdGlmICggZGVmICYmIGhhc0dldHRlck9yU2V0dGVyKGRlZikgKSB7XG5cdFx0aWYgKHR5cGVvZiBkZWYuZW51bWVyYWJsZSA9PT0gXCJ1bmRlZmluZWRcIilcblx0XHRcdGRlZi5lbnVtZXJhYmxlID0gdHJ1ZTtcblx0XHRpZiAodHlwZW9mIGRlZi5jb25maWd1cmFibGUgPT09IFwidW5kZWZpbmVkXCIpXG5cdFx0XHRkZWYuY29uZmlndXJhYmxlID0gdHJ1ZTtcblx0XHRyZXR1cm4gZGVmO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxufVxuXG5mdW5jdGlvbiBoYXNOb25Db25maWd1cmFibGUob2JqLCBrKSB7XG5cdHZhciBwcm9wID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIGspO1xuXHRpZiAoIXByb3ApXG5cdFx0cmV0dXJuIGZhbHNlO1xuXG5cdGlmIChwcm9wLnZhbHVlICYmIHR5cGVvZiBwcm9wLnZhbHVlID09PSBcIm9iamVjdFwiKVxuXHRcdHByb3AgPSBwcm9wLnZhbHVlO1xuXG5cdGlmIChwcm9wLmNvbmZpZ3VyYWJsZSA9PT0gZmFsc2UpIFxuXHRcdHJldHVybiB0cnVlO1xuXG5cdHJldHVybiBmYWxzZTtcbn1cblxuLy9UT0RPOiBPbiBjcmVhdGUsIFxuLy9cdFx0T24gbWl4aW4sIFxuXG5mdW5jdGlvbiBleHRlbmQoY3RvciwgZGVmaW5pdGlvbiwgaXNDbGFzc0Rlc2NyaXB0b3IsIGV4dGVuZCkge1xuXHRmb3IgKHZhciBrIGluIGRlZmluaXRpb24pIHtcblx0XHRpZiAoIWRlZmluaXRpb24uaGFzT3duUHJvcGVydHkoaykpXG5cdFx0XHRjb250aW51ZTtcblxuXHRcdHZhciBkZWYgPSBnZXRQcm9wZXJ0eShkZWZpbml0aW9uLCBrLCBpc0NsYXNzRGVzY3JpcHRvcik7XG5cblx0XHRpZiAoZGVmICE9PSBmYWxzZSkge1xuXHRcdFx0Ly9JZiBFeHRlbmRzIGlzIHVzZWQsIHdlIHdpbGwgY2hlY2sgaXRzIHByb3RvdHlwZSB0byBzZWUgaWYgXG5cdFx0XHQvL3RoZSBmaW5hbCB2YXJpYWJsZSBleGlzdHMuXG5cdFx0XHRcblx0XHRcdHZhciBwYXJlbnQgPSBleHRlbmQgfHwgY3Rvcjtcblx0XHRcdGlmIChoYXNOb25Db25maWd1cmFibGUocGFyZW50LnByb3RvdHlwZSwgaykpIHtcblxuXHRcdFx0XHQvL2p1c3Qgc2tpcCB0aGUgZmluYWwgcHJvcGVydHlcblx0XHRcdFx0aWYgKENsYXNzLmlnbm9yZUZpbmFscylcblx0XHRcdFx0XHRjb250aW51ZTtcblxuXHRcdFx0XHQvL1dlIGNhbm5vdCByZS1kZWZpbmUgYSBwcm9wZXJ0eSB0aGF0IGlzIGNvbmZpZ3VyYWJsZT1mYWxzZS5cblx0XHRcdFx0Ly9TbyB3ZSB3aWxsIGNvbnNpZGVyIHRoZW0gZmluYWwgYW5kIHRocm93IGFuIGVycm9yLiBUaGlzIGlzIGJ5XG5cdFx0XHRcdC8vZGVmYXVsdCBzbyBpdCBpcyBjbGVhciB0byB0aGUgZGV2ZWxvcGVyIHdoYXQgaXMgaGFwcGVuaW5nLlxuXHRcdFx0XHQvL1lvdSBjYW4gc2V0IGlnbm9yZUZpbmFscyB0byB0cnVlIGlmIHlvdSBuZWVkIHRvIGV4dGVuZCBhIGNsYXNzXG5cdFx0XHRcdC8vd2hpY2ggaGFzIGNvbmZpZ3VyYWJsZT1mYWxzZTsgaXQgd2lsbCBzaW1wbHkgbm90IHJlLWRlZmluZSBmaW5hbCBwcm9wZXJ0aWVzLlxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJjYW5ub3Qgb3ZlcnJpZGUgZmluYWwgcHJvcGVydHkgJ1wiK2tcblx0XHRcdFx0XHRcdFx0K1wiJywgc2V0IENsYXNzLmlnbm9yZUZpbmFscyA9IHRydWUgdG8gc2tpcFwiKTtcblx0XHRcdH1cblxuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGN0b3IucHJvdG90eXBlLCBrLCBkZWYpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjdG9yLnByb3RvdHlwZVtrXSA9IGRlZmluaXRpb25ba107XG5cdFx0fVxuXG5cdH1cbn1cblxuLyoqXG4gKi9cbmZ1bmN0aW9uIG1peGluKG15Q2xhc3MsIG1peGlucykge1xuXHRpZiAoIW1peGlucylcblx0XHRyZXR1cm47XG5cblx0aWYgKCFBcnJheS5pc0FycmF5KG1peGlucykpXG5cdFx0bWl4aW5zID0gW21peGluc107XG5cblx0Zm9yICh2YXIgaT0wOyBpPG1peGlucy5sZW5ndGg7IGkrKykge1xuXHRcdGV4dGVuZChteUNsYXNzLCBtaXhpbnNbaV0ucHJvdG90eXBlIHx8IG1peGluc1tpXSk7XG5cdH1cbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGNsYXNzIHdpdGggdGhlIGdpdmVuIGRlc2NyaXB0b3IuXG4gKiBUaGUgY29uc3RydWN0b3IsIGRlZmluZWQgYnkgdGhlIG5hbWUgYGluaXRpYWxpemVgLFxuICogaXMgYW4gb3B0aW9uYWwgZnVuY3Rpb24uIElmIHVuc3BlY2lmaWVkLCBhbiBhbm9ueW1vdXNcbiAqIGZ1bmN0aW9uIHdpbGwgYmUgdXNlZCB3aGljaCBjYWxscyB0aGUgcGFyZW50IGNsYXNzIChpZlxuICogb25lIGV4aXN0cykuIFxuICpcbiAqIFlvdSBjYW4gYWxzbyB1c2UgYEV4dGVuZHNgIGFuZCBgTWl4aW5zYCB0byBwcm92aWRlIHN1YmNsYXNzaW5nXG4gKiBhbmQgaW5oZXJpdGFuY2UuXG4gKlxuICogQGNsYXNzICBDbGFzc1xuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gZGVmaW5pdGlvbiBhIGRpY3Rpb25hcnkgb2YgZnVuY3Rpb25zIGZvciB0aGUgY2xhc3NcbiAqIEBleGFtcGxlXG4gKlxuICogXHRcdHZhciBNeUNsYXNzID0gbmV3IENsYXNzKHtcbiAqIFx0XHRcbiAqIFx0XHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICogXHRcdFx0XHR0aGlzLmZvbyA9IDIuMDtcbiAqIFx0XHRcdH0sXG4gKlxuICogXHRcdFx0YmFyOiBmdW5jdGlvbigpIHtcbiAqIFx0XHRcdFx0cmV0dXJuIHRoaXMuZm9vICsgNTtcbiAqIFx0XHRcdH1cbiAqIFx0XHR9KTtcbiAqL1xuZnVuY3Rpb24gQ2xhc3MoZGVmaW5pdGlvbikge1xuXHRpZiAoIWRlZmluaXRpb24pXG5cdFx0ZGVmaW5pdGlvbiA9IHt9O1xuXG5cdC8vVGhlIHZhcmlhYmxlIG5hbWUgaGVyZSBkaWN0YXRlcyB3aGF0IHdlIHNlZSBpbiBDaHJvbWUgZGVidWdnZXJcblx0dmFyIGluaXRpYWxpemU7XG5cdHZhciBFeHRlbmRzO1xuXG5cdGlmIChkZWZpbml0aW9uLmluaXRpYWxpemUpIHtcblx0XHRpZiAodHlwZW9mIGRlZmluaXRpb24uaW5pdGlhbGl6ZSAhPT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiaW5pdGlhbGl6ZSBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG5cdFx0aW5pdGlhbGl6ZSA9IGRlZmluaXRpb24uaW5pdGlhbGl6ZTtcblxuXHRcdC8vVXN1YWxseSB3ZSBzaG91bGQgYXZvaWQgXCJkZWxldGVcIiBpbiBWOCBhdCBhbGwgY29zdHMuXG5cdFx0Ly9Ib3dldmVyLCBpdHMgdW5saWtlbHkgdG8gbWFrZSBhbnkgcGVyZm9ybWFuY2UgZGlmZmVyZW5jZVxuXHRcdC8vaGVyZSBzaW5jZSB3ZSBvbmx5IGNhbGwgdGhpcyBvbiBjbGFzcyBjcmVhdGlvbiAoaS5lLiBub3Qgb2JqZWN0IGNyZWF0aW9uKS5cblx0XHRkZWxldGUgZGVmaW5pdGlvbi5pbml0aWFsaXplO1xuXHR9IGVsc2Uge1xuXHRcdGlmIChkZWZpbml0aW9uLkV4dGVuZHMpIHtcblx0XHRcdHZhciBiYXNlID0gZGVmaW5pdGlvbi5FeHRlbmRzO1xuXHRcdFx0aW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0YmFzZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHRcdFx0fTsgXG5cdFx0fSBlbHNlIHtcblx0XHRcdGluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7fTsgXG5cdFx0fVxuXHR9XG5cblx0aWYgKGRlZmluaXRpb24uRXh0ZW5kcykge1xuXHRcdGluaXRpYWxpemUucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShkZWZpbml0aW9uLkV4dGVuZHMucHJvdG90eXBlKTtcblx0XHRpbml0aWFsaXplLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGluaXRpYWxpemU7XG5cdFx0Ly9mb3IgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIHRvIHdvcmssIHdlIG5lZWQgdG8gYWN0XG5cdFx0Ly9kaXJlY3RseSBvbiB0aGUgRXh0ZW5kcyAob3IgTWl4aW4pXG5cdFx0RXh0ZW5kcyA9IGRlZmluaXRpb24uRXh0ZW5kcztcblx0XHRkZWxldGUgZGVmaW5pdGlvbi5FeHRlbmRzO1xuXHR9IGVsc2Uge1xuXHRcdGluaXRpYWxpemUucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gaW5pdGlhbGl6ZTtcblx0fVxuXG5cdC8vR3JhYiB0aGUgbWl4aW5zLCBpZiB0aGV5IGFyZSBzcGVjaWZpZWQuLi5cblx0dmFyIG1peGlucyA9IG51bGw7XG5cdGlmIChkZWZpbml0aW9uLk1peGlucykge1xuXHRcdG1peGlucyA9IGRlZmluaXRpb24uTWl4aW5zO1xuXHRcdGRlbGV0ZSBkZWZpbml0aW9uLk1peGlucztcblx0fVxuXG5cdC8vRmlyc3QsIG1peGluIGlmIHdlIGNhbi5cblx0bWl4aW4oaW5pdGlhbGl6ZSwgbWl4aW5zKTtcblxuXHQvL05vdyB3ZSBncmFiIHRoZSBhY3R1YWwgZGVmaW5pdGlvbiB3aGljaCBkZWZpbmVzIHRoZSBvdmVycmlkZXMuXG5cdGV4dGVuZChpbml0aWFsaXplLCBkZWZpbml0aW9uLCB0cnVlLCBFeHRlbmRzKTtcblxuXHRyZXR1cm4gaW5pdGlhbGl6ZTtcbn07XG5cbkNsYXNzLmV4dGVuZCA9IGV4dGVuZDtcbkNsYXNzLm1peGluID0gbWl4aW47XG5DbGFzcy5pZ25vcmVGaW5hbHMgPSBmYWxzZTtcblxubW9kdWxlLmV4cG9ydHMgPSBDbGFzczsiLCIvKlxuICogcmFmLmpzXG4gKiBodHRwczovL2dpdGh1Yi5jb20vbmdyeW1hbi9yYWYuanNcbiAqXG4gKiBvcmlnaW5hbCByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgcG9seWZpbGwgYnkgRXJpayBNw7ZsbGVyXG4gKiBpbnNwaXJlZCBmcm9tIHBhdWxfaXJpc2ggZ2lzdCBhbmQgcG9zdFxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMyBuZ3J5bWFuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG4gKi9cblxuKGZ1bmN0aW9uKHdpbmRvdykge1xuXHR2YXIgbGFzdFRpbWUgPSAwLFxuXHRcdHZlbmRvcnMgPSBbJ3dlYmtpdCcsICdtb3onXSxcblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxuXHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lLFxuXHRcdGkgPSB2ZW5kb3JzLmxlbmd0aDtcblxuXHQvLyB0cnkgdG8gdW4tcHJlZml4IGV4aXN0aW5nIHJhZlxuXHR3aGlsZSAoLS1pID49IDAgJiYgIXJlcXVlc3RBbmltYXRpb25GcmFtZSkge1xuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2ZW5kb3JzW2ldICsgJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuXHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbaV0gKyAnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXTtcblx0fVxuXG5cdC8vIHBvbHlmaWxsIHdpdGggc2V0VGltZW91dCBmYWxsYmFja1xuXHQvLyBoZWF2aWx5IGluc3BpcmVkIGZyb20gQGRhcml1cyBnaXN0IG1vZDogaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vcGF1bGlyaXNoLzE1Nzk2NzEjY29tbWVudC04Mzc5NDVcblx0aWYgKCFyZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgIWNhbmNlbEFuaW1hdGlvbkZyYW1lKSB7XG5cdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcblx0XHRcdHZhciBub3cgPSBEYXRlLm5vdygpLCBuZXh0VGltZSA9IE1hdGgubWF4KGxhc3RUaW1lICsgMTYsIG5vdyk7XG5cdFx0XHRyZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0Y2FsbGJhY2sobGFzdFRpbWUgPSBuZXh0VGltZSk7XG5cdFx0XHR9LCBuZXh0VGltZSAtIG5vdyk7XG5cdFx0fTtcblxuXHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gY2xlYXJUaW1lb3V0O1xuXHR9XG5cblx0Ly8gZXhwb3J0IHRvIHdpbmRvd1xuXHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuXHR3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBjYW5jZWxBbmltYXRpb25GcmFtZTtcbn0od2luZG93KSk7IiwiLypcbiAqIEEgZmFzdCBqYXZhc2NyaXB0IGltcGxlbWVudGF0aW9uIG9mIHNpbXBsZXggbm9pc2UgYnkgSm9uYXMgV2FnbmVyXG4gKlxuICogQmFzZWQgb24gYSBzcGVlZC1pbXByb3ZlZCBzaW1wbGV4IG5vaXNlIGFsZ29yaXRobSBmb3IgMkQsIDNEIGFuZCA0RCBpbiBKYXZhLlxuICogV2hpY2ggaXMgYmFzZWQgb24gZXhhbXBsZSBjb2RlIGJ5IFN0ZWZhbiBHdXN0YXZzb24gKHN0ZWd1QGl0bi5saXUuc2UpLlxuICogV2l0aCBPcHRpbWlzYXRpb25zIGJ5IFBldGVyIEVhc3RtYW4gKHBlYXN0bWFuQGRyaXp6bGUuc3RhbmZvcmQuZWR1KS5cbiAqIEJldHRlciByYW5rIG9yZGVyaW5nIG1ldGhvZCBieSBTdGVmYW4gR3VzdGF2c29uIGluIDIwMTIuXG4gKlxuICpcbiAqIENvcHlyaWdodCAoQykgMjAxMiBKb25hcyBXYWduZXJcbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmdcbiAqIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuICogXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4gKiB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4gKiBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG9cbiAqIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0b1xuICogdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlXG4gKiBpbmNsdWRlZCBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELFxuICogRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4gKiBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORFxuICogTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRVxuICogTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTlxuICogT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OXG4gKiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cbiAqXG4gKi9cbihmdW5jdGlvbiAoKSB7XG5cbnZhciBGMiA9IDAuNSAqIChNYXRoLnNxcnQoMy4wKSAtIDEuMCksXG4gICAgRzIgPSAoMy4wIC0gTWF0aC5zcXJ0KDMuMCkpIC8gNi4wLFxuICAgIEYzID0gMS4wIC8gMy4wLFxuICAgIEczID0gMS4wIC8gNi4wLFxuICAgIEY0ID0gKE1hdGguc3FydCg1LjApIC0gMS4wKSAvIDQuMCxcbiAgICBHNCA9ICg1LjAgLSBNYXRoLnNxcnQoNS4wKSkgLyAyMC4wO1xuXG5cbmZ1bmN0aW9uIFNpbXBsZXhOb2lzZShyYW5kb20pIHtcbiAgICBpZiAoIXJhbmRvbSkgcmFuZG9tID0gTWF0aC5yYW5kb207XG4gICAgdGhpcy5wID0gbmV3IFVpbnQ4QXJyYXkoMjU2KTtcbiAgICB0aGlzLnBlcm0gPSBuZXcgVWludDhBcnJheSg1MTIpO1xuICAgIHRoaXMucGVybU1vZDEyID0gbmV3IFVpbnQ4QXJyYXkoNTEyKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IDI1NjsgaSsrKSB7XG4gICAgICAgIHRoaXMucFtpXSA9IHJhbmRvbSgpICogMjU2O1xuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgNTEyOyBpKyspIHtcbiAgICAgICAgdGhpcy5wZXJtW2ldID0gdGhpcy5wW2kgJiAyNTVdO1xuICAgICAgICB0aGlzLnBlcm1Nb2QxMltpXSA9IHRoaXMucGVybVtpXSAlIDEyO1xuICAgIH1cblxufVxuU2ltcGxleE5vaXNlLnByb3RvdHlwZSA9IHtcbiAgICBncmFkMzogbmV3IEZsb2F0MzJBcnJheShbMSwgMSwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAtIDEsIDEsIDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMSwgLSAxLCAwLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLSAxLCAtIDEsIDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMSwgMCwgMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAtIDEsIDAsIDEsXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAxLCAwLCAtIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLSAxLCAwLCAtIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMCwgMSwgMSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDAsIC0gMSwgMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLCAxLCAtIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMCwgLSAxLCAtIDFdKSxcbiAgICBncmFkNDogbmV3IEZsb2F0MzJBcnJheShbMCwgMSwgMSwgMSwgMCwgMSwgMSwgLSAxLCAwLCAxLCAtIDEsIDEsIDAsIDEsIC0gMSwgLSAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDAsIC0gMSwgMSwgMSwgMCwgLSAxLCAxLCAtIDEsIDAsIC0gMSwgLSAxLCAxLCAwLCAtIDEsIC0gMSwgLSAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDEsIDAsIDEsIDEsIDEsIDAsIDEsIC0gMSwgMSwgMCwgLSAxLCAxLCAxLCAwLCAtIDEsIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAtIDEsIDAsIDEsIDEsIC0gMSwgMCwgMSwgLSAxLCAtIDEsIDAsIC0gMSwgMSwgLSAxLCAwLCAtIDEsIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAxLCAxLCAwLCAxLCAxLCAxLCAwLCAtIDEsIDEsIC0gMSwgMCwgMSwgMSwgLSAxLCAwLCAtIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLSAxLCAxLCAwLCAxLCAtIDEsIDEsIDAsIC0gMSwgLSAxLCAtIDEsIDAsIDEsIC0gMSwgLSAxLCAwLCAtIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMSwgMSwgMSwgMCwgMSwgMSwgLSAxLCAwLCAxLCAtIDEsIDEsIDAsIDEsIC0gMSwgLSAxLCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0gMSwgMSwgMSwgMCwgLSAxLCAxLCAtIDEsIDAsIC0gMSwgLSAxLCAxLCAwLCAtIDEsIC0gMSwgLSAxLCAwXSksXG4gICAgbm9pc2UyRDogZnVuY3Rpb24gKHhpbiwgeWluKSB7XG4gICAgICAgIHZhciBwZXJtTW9kMTIgPSB0aGlzLnBlcm1Nb2QxMixcbiAgICAgICAgICAgIHBlcm0gPSB0aGlzLnBlcm0sXG4gICAgICAgICAgICBncmFkMyA9IHRoaXMuZ3JhZDM7XG4gICAgICAgIHZhciBuMCwgbjEsIG4yOyAvLyBOb2lzZSBjb250cmlidXRpb25zIGZyb20gdGhlIHRocmVlIGNvcm5lcnNcbiAgICAgICAgLy8gU2tldyB0aGUgaW5wdXQgc3BhY2UgdG8gZGV0ZXJtaW5lIHdoaWNoIHNpbXBsZXggY2VsbCB3ZSdyZSBpblxuICAgICAgICB2YXIgcyA9ICh4aW4gKyB5aW4pICogRjI7IC8vIEhhaXJ5IGZhY3RvciBmb3IgMkRcbiAgICAgICAgdmFyIGkgPSBNYXRoLmZsb29yKHhpbiArIHMpO1xuICAgICAgICB2YXIgaiA9IE1hdGguZmxvb3IoeWluICsgcyk7XG4gICAgICAgIHZhciB0ID0gKGkgKyBqKSAqIEcyO1xuICAgICAgICB2YXIgWDAgPSBpIC0gdDsgLy8gVW5za2V3IHRoZSBjZWxsIG9yaWdpbiBiYWNrIHRvICh4LHkpIHNwYWNlXG4gICAgICAgIHZhciBZMCA9IGogLSB0O1xuICAgICAgICB2YXIgeDAgPSB4aW4gLSBYMDsgLy8gVGhlIHgseSBkaXN0YW5jZXMgZnJvbSB0aGUgY2VsbCBvcmlnaW5cbiAgICAgICAgdmFyIHkwID0geWluIC0gWTA7XG4gICAgICAgIC8vIEZvciB0aGUgMkQgY2FzZSwgdGhlIHNpbXBsZXggc2hhcGUgaXMgYW4gZXF1aWxhdGVyYWwgdHJpYW5nbGUuXG4gICAgICAgIC8vIERldGVybWluZSB3aGljaCBzaW1wbGV4IHdlIGFyZSBpbi5cbiAgICAgICAgdmFyIGkxLCBqMTsgLy8gT2Zmc2V0cyBmb3Igc2Vjb25kIChtaWRkbGUpIGNvcm5lciBvZiBzaW1wbGV4IGluIChpLGopIGNvb3Jkc1xuICAgICAgICBpZiAoeDAgPiB5MCkge1xuICAgICAgICAgICAgaTEgPSAxO1xuICAgICAgICAgICAgajEgPSAwO1xuICAgICAgICB9IC8vIGxvd2VyIHRyaWFuZ2xlLCBYWSBvcmRlcjogKDAsMCktPigxLDApLT4oMSwxKVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGkxID0gMDtcbiAgICAgICAgICAgIGoxID0gMTtcbiAgICAgICAgfSAvLyB1cHBlciB0cmlhbmdsZSwgWVggb3JkZXI6ICgwLDApLT4oMCwxKS0+KDEsMSlcbiAgICAgICAgLy8gQSBzdGVwIG9mICgxLDApIGluIChpLGopIG1lYW5zIGEgc3RlcCBvZiAoMS1jLC1jKSBpbiAoeCx5KSwgYW5kXG4gICAgICAgIC8vIGEgc3RlcCBvZiAoMCwxKSBpbiAoaSxqKSBtZWFucyBhIHN0ZXAgb2YgKC1jLDEtYykgaW4gKHgseSksIHdoZXJlXG4gICAgICAgIC8vIGMgPSAoMy1zcXJ0KDMpKS82XG4gICAgICAgIHZhciB4MSA9IHgwIC0gaTEgKyBHMjsgLy8gT2Zmc2V0cyBmb3IgbWlkZGxlIGNvcm5lciBpbiAoeCx5KSB1bnNrZXdlZCBjb29yZHNcbiAgICAgICAgdmFyIHkxID0geTAgLSBqMSArIEcyO1xuICAgICAgICB2YXIgeDIgPSB4MCAtIDEuMCArIDIuMCAqIEcyOyAvLyBPZmZzZXRzIGZvciBsYXN0IGNvcm5lciBpbiAoeCx5KSB1bnNrZXdlZCBjb29yZHNcbiAgICAgICAgdmFyIHkyID0geTAgLSAxLjAgKyAyLjAgKiBHMjtcbiAgICAgICAgLy8gV29yayBvdXQgdGhlIGhhc2hlZCBncmFkaWVudCBpbmRpY2VzIG9mIHRoZSB0aHJlZSBzaW1wbGV4IGNvcm5lcnNcbiAgICAgICAgdmFyIGlpID0gaSAmIDI1NTtcbiAgICAgICAgdmFyIGpqID0gaiAmIDI1NTtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRoZSBjb250cmlidXRpb24gZnJvbSB0aGUgdGhyZWUgY29ybmVyc1xuICAgICAgICB2YXIgdDAgPSAwLjUgLSB4MCAqIHgwIC0geTAgKiB5MDtcbiAgICAgICAgaWYgKHQwIDwgMCkgbjAgPSAwLjA7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGdpMCA9IHBlcm1Nb2QxMltpaSArIHBlcm1bampdXSAqIDM7XG4gICAgICAgICAgICB0MCAqPSB0MDtcbiAgICAgICAgICAgIG4wID0gdDAgKiB0MCAqIChncmFkM1tnaTBdICogeDAgKyBncmFkM1tnaTAgKyAxXSAqIHkwKTsgLy8gKHgseSkgb2YgZ3JhZDMgdXNlZCBmb3IgMkQgZ3JhZGllbnRcbiAgICAgICAgfVxuICAgICAgICB2YXIgdDEgPSAwLjUgLSB4MSAqIHgxIC0geTEgKiB5MTtcbiAgICAgICAgaWYgKHQxIDwgMCkgbjEgPSAwLjA7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGdpMSA9IHBlcm1Nb2QxMltpaSArIGkxICsgcGVybVtqaiArIGoxXV0gKiAzO1xuICAgICAgICAgICAgdDEgKj0gdDE7XG4gICAgICAgICAgICBuMSA9IHQxICogdDEgKiAoZ3JhZDNbZ2kxXSAqIHgxICsgZ3JhZDNbZ2kxICsgMV0gKiB5MSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHQyID0gMC41IC0geDIgKiB4MiAtIHkyICogeTI7XG4gICAgICAgIGlmICh0MiA8IDApIG4yID0gMC4wO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBnaTIgPSBwZXJtTW9kMTJbaWkgKyAxICsgcGVybVtqaiArIDFdXSAqIDM7XG4gICAgICAgICAgICB0MiAqPSB0MjtcbiAgICAgICAgICAgIG4yID0gdDIgKiB0MiAqIChncmFkM1tnaTJdICogeDIgKyBncmFkM1tnaTIgKyAxXSAqIHkyKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBBZGQgY29udHJpYnV0aW9ucyBmcm9tIGVhY2ggY29ybmVyIHRvIGdldCB0aGUgZmluYWwgbm9pc2UgdmFsdWUuXG4gICAgICAgIC8vIFRoZSByZXN1bHQgaXMgc2NhbGVkIHRvIHJldHVybiB2YWx1ZXMgaW4gdGhlIGludGVydmFsIFstMSwxXS5cbiAgICAgICAgcmV0dXJuIDcwLjAgKiAobjAgKyBuMSArIG4yKTtcbiAgICB9LFxuICAgIC8vIDNEIHNpbXBsZXggbm9pc2VcbiAgICBub2lzZTNEOiBmdW5jdGlvbiAoeGluLCB5aW4sIHppbikge1xuICAgICAgICB2YXIgcGVybU1vZDEyID0gdGhpcy5wZXJtTW9kMTIsXG4gICAgICAgICAgICBwZXJtID0gdGhpcy5wZXJtLFxuICAgICAgICAgICAgZ3JhZDMgPSB0aGlzLmdyYWQzO1xuICAgICAgICB2YXIgbjAsIG4xLCBuMiwgbjM7IC8vIE5vaXNlIGNvbnRyaWJ1dGlvbnMgZnJvbSB0aGUgZm91ciBjb3JuZXJzXG4gICAgICAgIC8vIFNrZXcgdGhlIGlucHV0IHNwYWNlIHRvIGRldGVybWluZSB3aGljaCBzaW1wbGV4IGNlbGwgd2UncmUgaW5cbiAgICAgICAgdmFyIHMgPSAoeGluICsgeWluICsgemluKSAqIEYzOyAvLyBWZXJ5IG5pY2UgYW5kIHNpbXBsZSBza2V3IGZhY3RvciBmb3IgM0RcbiAgICAgICAgdmFyIGkgPSBNYXRoLmZsb29yKHhpbiArIHMpO1xuICAgICAgICB2YXIgaiA9IE1hdGguZmxvb3IoeWluICsgcyk7XG4gICAgICAgIHZhciBrID0gTWF0aC5mbG9vcih6aW4gKyBzKTtcbiAgICAgICAgdmFyIHQgPSAoaSArIGogKyBrKSAqIEczO1xuICAgICAgICB2YXIgWDAgPSBpIC0gdDsgLy8gVW5za2V3IHRoZSBjZWxsIG9yaWdpbiBiYWNrIHRvICh4LHkseikgc3BhY2VcbiAgICAgICAgdmFyIFkwID0gaiAtIHQ7XG4gICAgICAgIHZhciBaMCA9IGsgLSB0O1xuICAgICAgICB2YXIgeDAgPSB4aW4gLSBYMDsgLy8gVGhlIHgseSx6IGRpc3RhbmNlcyBmcm9tIHRoZSBjZWxsIG9yaWdpblxuICAgICAgICB2YXIgeTAgPSB5aW4gLSBZMDtcbiAgICAgICAgdmFyIHowID0gemluIC0gWjA7XG4gICAgICAgIC8vIEZvciB0aGUgM0QgY2FzZSwgdGhlIHNpbXBsZXggc2hhcGUgaXMgYSBzbGlnaHRseSBpcnJlZ3VsYXIgdGV0cmFoZWRyb24uXG4gICAgICAgIC8vIERldGVybWluZSB3aGljaCBzaW1wbGV4IHdlIGFyZSBpbi5cbiAgICAgICAgdmFyIGkxLCBqMSwgazE7IC8vIE9mZnNldHMgZm9yIHNlY29uZCBjb3JuZXIgb2Ygc2ltcGxleCBpbiAoaSxqLGspIGNvb3Jkc1xuICAgICAgICB2YXIgaTIsIGoyLCBrMjsgLy8gT2Zmc2V0cyBmb3IgdGhpcmQgY29ybmVyIG9mIHNpbXBsZXggaW4gKGksaixrKSBjb29yZHNcbiAgICAgICAgaWYgKHgwID49IHkwKSB7XG4gICAgICAgICAgICBpZiAoeTAgPj0gejApIHtcbiAgICAgICAgICAgICAgICBpMSA9IDE7XG4gICAgICAgICAgICAgICAgajEgPSAwO1xuICAgICAgICAgICAgICAgIGsxID0gMDtcbiAgICAgICAgICAgICAgICBpMiA9IDE7XG4gICAgICAgICAgICAgICAgajIgPSAxO1xuICAgICAgICAgICAgICAgIGsyID0gMDtcbiAgICAgICAgICAgIH0gLy8gWCBZIFogb3JkZXJcbiAgICAgICAgICAgIGVsc2UgaWYgKHgwID49IHowKSB7XG4gICAgICAgICAgICAgICAgaTEgPSAxO1xuICAgICAgICAgICAgICAgIGoxID0gMDtcbiAgICAgICAgICAgICAgICBrMSA9IDA7XG4gICAgICAgICAgICAgICAgaTIgPSAxO1xuICAgICAgICAgICAgICAgIGoyID0gMDtcbiAgICAgICAgICAgICAgICBrMiA9IDE7XG4gICAgICAgICAgICB9IC8vIFggWiBZIG9yZGVyXG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpMSA9IDA7XG4gICAgICAgICAgICAgICAgajEgPSAwO1xuICAgICAgICAgICAgICAgIGsxID0gMTtcbiAgICAgICAgICAgICAgICBpMiA9IDE7XG4gICAgICAgICAgICAgICAgajIgPSAwO1xuICAgICAgICAgICAgICAgIGsyID0gMTtcbiAgICAgICAgICAgIH0gLy8gWiBYIFkgb3JkZXJcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHsgLy8geDA8eTBcbiAgICAgICAgICAgIGlmICh5MCA8IHowKSB7XG4gICAgICAgICAgICAgICAgaTEgPSAwO1xuICAgICAgICAgICAgICAgIGoxID0gMDtcbiAgICAgICAgICAgICAgICBrMSA9IDE7XG4gICAgICAgICAgICAgICAgaTIgPSAwO1xuICAgICAgICAgICAgICAgIGoyID0gMTtcbiAgICAgICAgICAgICAgICBrMiA9IDE7XG4gICAgICAgICAgICB9IC8vIFogWSBYIG9yZGVyXG4gICAgICAgICAgICBlbHNlIGlmICh4MCA8IHowKSB7XG4gICAgICAgICAgICAgICAgaTEgPSAwO1xuICAgICAgICAgICAgICAgIGoxID0gMTtcbiAgICAgICAgICAgICAgICBrMSA9IDA7XG4gICAgICAgICAgICAgICAgaTIgPSAwO1xuICAgICAgICAgICAgICAgIGoyID0gMTtcbiAgICAgICAgICAgICAgICBrMiA9IDE7XG4gICAgICAgICAgICB9IC8vIFkgWiBYIG9yZGVyXG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpMSA9IDA7XG4gICAgICAgICAgICAgICAgajEgPSAxO1xuICAgICAgICAgICAgICAgIGsxID0gMDtcbiAgICAgICAgICAgICAgICBpMiA9IDE7XG4gICAgICAgICAgICAgICAgajIgPSAxO1xuICAgICAgICAgICAgICAgIGsyID0gMDtcbiAgICAgICAgICAgIH0gLy8gWSBYIFogb3JkZXJcbiAgICAgICAgfVxuICAgICAgICAvLyBBIHN0ZXAgb2YgKDEsMCwwKSBpbiAoaSxqLGspIG1lYW5zIGEgc3RlcCBvZiAoMS1jLC1jLC1jKSBpbiAoeCx5LHopLFxuICAgICAgICAvLyBhIHN0ZXAgb2YgKDAsMSwwKSBpbiAoaSxqLGspIG1lYW5zIGEgc3RlcCBvZiAoLWMsMS1jLC1jKSBpbiAoeCx5LHopLCBhbmRcbiAgICAgICAgLy8gYSBzdGVwIG9mICgwLDAsMSkgaW4gKGksaixrKSBtZWFucyBhIHN0ZXAgb2YgKC1jLC1jLDEtYykgaW4gKHgseSx6KSwgd2hlcmVcbiAgICAgICAgLy8gYyA9IDEvNi5cbiAgICAgICAgdmFyIHgxID0geDAgLSBpMSArIEczOyAvLyBPZmZzZXRzIGZvciBzZWNvbmQgY29ybmVyIGluICh4LHkseikgY29vcmRzXG4gICAgICAgIHZhciB5MSA9IHkwIC0gajEgKyBHMztcbiAgICAgICAgdmFyIHoxID0gejAgLSBrMSArIEczO1xuICAgICAgICB2YXIgeDIgPSB4MCAtIGkyICsgMi4wICogRzM7IC8vIE9mZnNldHMgZm9yIHRoaXJkIGNvcm5lciBpbiAoeCx5LHopIGNvb3Jkc1xuICAgICAgICB2YXIgeTIgPSB5MCAtIGoyICsgMi4wICogRzM7XG4gICAgICAgIHZhciB6MiA9IHowIC0gazIgKyAyLjAgKiBHMztcbiAgICAgICAgdmFyIHgzID0geDAgLSAxLjAgKyAzLjAgKiBHMzsgLy8gT2Zmc2V0cyBmb3IgbGFzdCBjb3JuZXIgaW4gKHgseSx6KSBjb29yZHNcbiAgICAgICAgdmFyIHkzID0geTAgLSAxLjAgKyAzLjAgKiBHMztcbiAgICAgICAgdmFyIHozID0gejAgLSAxLjAgKyAzLjAgKiBHMztcbiAgICAgICAgLy8gV29yayBvdXQgdGhlIGhhc2hlZCBncmFkaWVudCBpbmRpY2VzIG9mIHRoZSBmb3VyIHNpbXBsZXggY29ybmVyc1xuICAgICAgICB2YXIgaWkgPSBpICYgMjU1O1xuICAgICAgICB2YXIgamogPSBqICYgMjU1O1xuICAgICAgICB2YXIga2sgPSBrICYgMjU1O1xuICAgICAgICAvLyBDYWxjdWxhdGUgdGhlIGNvbnRyaWJ1dGlvbiBmcm9tIHRoZSBmb3VyIGNvcm5lcnNcbiAgICAgICAgdmFyIHQwID0gMC42IC0geDAgKiB4MCAtIHkwICogeTAgLSB6MCAqIHowO1xuICAgICAgICBpZiAodDAgPCAwKSBuMCA9IDAuMDtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgZ2kwID0gcGVybU1vZDEyW2lpICsgcGVybVtqaiArIHBlcm1ba2tdXV0gKiAzO1xuICAgICAgICAgICAgdDAgKj0gdDA7XG4gICAgICAgICAgICBuMCA9IHQwICogdDAgKiAoZ3JhZDNbZ2kwXSAqIHgwICsgZ3JhZDNbZ2kwICsgMV0gKiB5MCArIGdyYWQzW2dpMCArIDJdICogejApO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0MSA9IDAuNiAtIHgxICogeDEgLSB5MSAqIHkxIC0gejEgKiB6MTtcbiAgICAgICAgaWYgKHQxIDwgMCkgbjEgPSAwLjA7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGdpMSA9IHBlcm1Nb2QxMltpaSArIGkxICsgcGVybVtqaiArIGoxICsgcGVybVtrayArIGsxXV1dICogMztcbiAgICAgICAgICAgIHQxICo9IHQxO1xuICAgICAgICAgICAgbjEgPSB0MSAqIHQxICogKGdyYWQzW2dpMV0gKiB4MSArIGdyYWQzW2dpMSArIDFdICogeTEgKyBncmFkM1tnaTEgKyAyXSAqIHoxKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdDIgPSAwLjYgLSB4MiAqIHgyIC0geTIgKiB5MiAtIHoyICogejI7XG4gICAgICAgIGlmICh0MiA8IDApIG4yID0gMC4wO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBnaTIgPSBwZXJtTW9kMTJbaWkgKyBpMiArIHBlcm1bamogKyBqMiArIHBlcm1ba2sgKyBrMl1dXSAqIDM7XG4gICAgICAgICAgICB0MiAqPSB0MjtcbiAgICAgICAgICAgIG4yID0gdDIgKiB0MiAqIChncmFkM1tnaTJdICogeDIgKyBncmFkM1tnaTIgKyAxXSAqIHkyICsgZ3JhZDNbZ2kyICsgMl0gKiB6Mik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHQzID0gMC42IC0geDMgKiB4MyAtIHkzICogeTMgLSB6MyAqIHozO1xuICAgICAgICBpZiAodDMgPCAwKSBuMyA9IDAuMDtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgZ2kzID0gcGVybU1vZDEyW2lpICsgMSArIHBlcm1bamogKyAxICsgcGVybVtrayArIDFdXV0gKiAzO1xuICAgICAgICAgICAgdDMgKj0gdDM7XG4gICAgICAgICAgICBuMyA9IHQzICogdDMgKiAoZ3JhZDNbZ2kzXSAqIHgzICsgZ3JhZDNbZ2kzICsgMV0gKiB5MyArIGdyYWQzW2dpMyArIDJdICogejMpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEFkZCBjb250cmlidXRpb25zIGZyb20gZWFjaCBjb3JuZXIgdG8gZ2V0IHRoZSBmaW5hbCBub2lzZSB2YWx1ZS5cbiAgICAgICAgLy8gVGhlIHJlc3VsdCBpcyBzY2FsZWQgdG8gc3RheSBqdXN0IGluc2lkZSBbLTEsMV1cbiAgICAgICAgcmV0dXJuIDMyLjAgKiAobjAgKyBuMSArIG4yICsgbjMpO1xuICAgIH0sXG4gICAgLy8gNEQgc2ltcGxleCBub2lzZSwgYmV0dGVyIHNpbXBsZXggcmFuayBvcmRlcmluZyBtZXRob2QgMjAxMi0wMy0wOVxuICAgIG5vaXNlNEQ6IGZ1bmN0aW9uICh4LCB5LCB6LCB3KSB7XG4gICAgICAgIHZhciBwZXJtTW9kMTIgPSB0aGlzLnBlcm1Nb2QxMixcbiAgICAgICAgICAgIHBlcm0gPSB0aGlzLnBlcm0sXG4gICAgICAgICAgICBncmFkNCA9IHRoaXMuZ3JhZDQ7XG5cbiAgICAgICAgdmFyIG4wLCBuMSwgbjIsIG4zLCBuNDsgLy8gTm9pc2UgY29udHJpYnV0aW9ucyBmcm9tIHRoZSBmaXZlIGNvcm5lcnNcbiAgICAgICAgLy8gU2tldyB0aGUgKHgseSx6LHcpIHNwYWNlIHRvIGRldGVybWluZSB3aGljaCBjZWxsIG9mIDI0IHNpbXBsaWNlcyB3ZSdyZSBpblxuICAgICAgICB2YXIgcyA9ICh4ICsgeSArIHogKyB3KSAqIEY0OyAvLyBGYWN0b3IgZm9yIDREIHNrZXdpbmdcbiAgICAgICAgdmFyIGkgPSBNYXRoLmZsb29yKHggKyBzKTtcbiAgICAgICAgdmFyIGogPSBNYXRoLmZsb29yKHkgKyBzKTtcbiAgICAgICAgdmFyIGsgPSBNYXRoLmZsb29yKHogKyBzKTtcbiAgICAgICAgdmFyIGwgPSBNYXRoLmZsb29yKHcgKyBzKTtcbiAgICAgICAgdmFyIHQgPSAoaSArIGogKyBrICsgbCkgKiBHNDsgLy8gRmFjdG9yIGZvciA0RCB1bnNrZXdpbmdcbiAgICAgICAgdmFyIFgwID0gaSAtIHQ7IC8vIFVuc2tldyB0aGUgY2VsbCBvcmlnaW4gYmFjayB0byAoeCx5LHosdykgc3BhY2VcbiAgICAgICAgdmFyIFkwID0gaiAtIHQ7XG4gICAgICAgIHZhciBaMCA9IGsgLSB0O1xuICAgICAgICB2YXIgVzAgPSBsIC0gdDtcbiAgICAgICAgdmFyIHgwID0geCAtIFgwOyAvLyBUaGUgeCx5LHosdyBkaXN0YW5jZXMgZnJvbSB0aGUgY2VsbCBvcmlnaW5cbiAgICAgICAgdmFyIHkwID0geSAtIFkwO1xuICAgICAgICB2YXIgejAgPSB6IC0gWjA7XG4gICAgICAgIHZhciB3MCA9IHcgLSBXMDtcbiAgICAgICAgLy8gRm9yIHRoZSA0RCBjYXNlLCB0aGUgc2ltcGxleCBpcyBhIDREIHNoYXBlIEkgd29uJ3QgZXZlbiB0cnkgdG8gZGVzY3JpYmUuXG4gICAgICAgIC8vIFRvIGZpbmQgb3V0IHdoaWNoIG9mIHRoZSAyNCBwb3NzaWJsZSBzaW1wbGljZXMgd2UncmUgaW4sIHdlIG5lZWQgdG9cbiAgICAgICAgLy8gZGV0ZXJtaW5lIHRoZSBtYWduaXR1ZGUgb3JkZXJpbmcgb2YgeDAsIHkwLCB6MCBhbmQgdzAuXG4gICAgICAgIC8vIFNpeCBwYWlyLXdpc2UgY29tcGFyaXNvbnMgYXJlIHBlcmZvcm1lZCBiZXR3ZWVuIGVhY2ggcG9zc2libGUgcGFpclxuICAgICAgICAvLyBvZiB0aGUgZm91ciBjb29yZGluYXRlcywgYW5kIHRoZSByZXN1bHRzIGFyZSB1c2VkIHRvIHJhbmsgdGhlIG51bWJlcnMuXG4gICAgICAgIHZhciByYW5reCA9IDA7XG4gICAgICAgIHZhciByYW5reSA9IDA7XG4gICAgICAgIHZhciByYW5reiA9IDA7XG4gICAgICAgIHZhciByYW5rdyA9IDA7XG4gICAgICAgIGlmICh4MCA+IHkwKSByYW5reCsrO1xuICAgICAgICBlbHNlIHJhbmt5Kys7XG4gICAgICAgIGlmICh4MCA+IHowKSByYW5reCsrO1xuICAgICAgICBlbHNlIHJhbmt6Kys7XG4gICAgICAgIGlmICh4MCA+IHcwKSByYW5reCsrO1xuICAgICAgICBlbHNlIHJhbmt3Kys7XG4gICAgICAgIGlmICh5MCA+IHowKSByYW5reSsrO1xuICAgICAgICBlbHNlIHJhbmt6Kys7XG4gICAgICAgIGlmICh5MCA+IHcwKSByYW5reSsrO1xuICAgICAgICBlbHNlIHJhbmt3Kys7XG4gICAgICAgIGlmICh6MCA+IHcwKSByYW5reisrO1xuICAgICAgICBlbHNlIHJhbmt3Kys7XG4gICAgICAgIHZhciBpMSwgajEsIGsxLCBsMTsgLy8gVGhlIGludGVnZXIgb2Zmc2V0cyBmb3IgdGhlIHNlY29uZCBzaW1wbGV4IGNvcm5lclxuICAgICAgICB2YXIgaTIsIGoyLCBrMiwgbDI7IC8vIFRoZSBpbnRlZ2VyIG9mZnNldHMgZm9yIHRoZSB0aGlyZCBzaW1wbGV4IGNvcm5lclxuICAgICAgICB2YXIgaTMsIGozLCBrMywgbDM7IC8vIFRoZSBpbnRlZ2VyIG9mZnNldHMgZm9yIHRoZSBmb3VydGggc2ltcGxleCBjb3JuZXJcbiAgICAgICAgLy8gc2ltcGxleFtjXSBpcyBhIDQtdmVjdG9yIHdpdGggdGhlIG51bWJlcnMgMCwgMSwgMiBhbmQgMyBpbiBzb21lIG9yZGVyLlxuICAgICAgICAvLyBNYW55IHZhbHVlcyBvZiBjIHdpbGwgbmV2ZXIgb2NjdXIsIHNpbmNlIGUuZy4geD55Pno+dyBtYWtlcyB4PHosIHk8dyBhbmQgeDx3XG4gICAgICAgIC8vIGltcG9zc2libGUuIE9ubHkgdGhlIDI0IGluZGljZXMgd2hpY2ggaGF2ZSBub24temVybyBlbnRyaWVzIG1ha2UgYW55IHNlbnNlLlxuICAgICAgICAvLyBXZSB1c2UgYSB0aHJlc2hvbGRpbmcgdG8gc2V0IHRoZSBjb29yZGluYXRlcyBpbiB0dXJuIGZyb20gdGhlIGxhcmdlc3QgbWFnbml0dWRlLlxuICAgICAgICAvLyBSYW5rIDMgZGVub3RlcyB0aGUgbGFyZ2VzdCBjb29yZGluYXRlLlxuICAgICAgICBpMSA9IHJhbmt4ID49IDMgPyAxIDogMDtcbiAgICAgICAgajEgPSByYW5reSA+PSAzID8gMSA6IDA7XG4gICAgICAgIGsxID0gcmFua3ogPj0gMyA/IDEgOiAwO1xuICAgICAgICBsMSA9IHJhbmt3ID49IDMgPyAxIDogMDtcbiAgICAgICAgLy8gUmFuayAyIGRlbm90ZXMgdGhlIHNlY29uZCBsYXJnZXN0IGNvb3JkaW5hdGUuXG4gICAgICAgIGkyID0gcmFua3ggPj0gMiA/IDEgOiAwO1xuICAgICAgICBqMiA9IHJhbmt5ID49IDIgPyAxIDogMDtcbiAgICAgICAgazIgPSByYW5reiA+PSAyID8gMSA6IDA7XG4gICAgICAgIGwyID0gcmFua3cgPj0gMiA/IDEgOiAwO1xuICAgICAgICAvLyBSYW5rIDEgZGVub3RlcyB0aGUgc2Vjb25kIHNtYWxsZXN0IGNvb3JkaW5hdGUuXG4gICAgICAgIGkzID0gcmFua3ggPj0gMSA/IDEgOiAwO1xuICAgICAgICBqMyA9IHJhbmt5ID49IDEgPyAxIDogMDtcbiAgICAgICAgazMgPSByYW5reiA+PSAxID8gMSA6IDA7XG4gICAgICAgIGwzID0gcmFua3cgPj0gMSA/IDEgOiAwO1xuICAgICAgICAvLyBUaGUgZmlmdGggY29ybmVyIGhhcyBhbGwgY29vcmRpbmF0ZSBvZmZzZXRzID0gMSwgc28gbm8gbmVlZCB0byBjb21wdXRlIHRoYXQuXG4gICAgICAgIHZhciB4MSA9IHgwIC0gaTEgKyBHNDsgLy8gT2Zmc2V0cyBmb3Igc2Vjb25kIGNvcm5lciBpbiAoeCx5LHosdykgY29vcmRzXG4gICAgICAgIHZhciB5MSA9IHkwIC0gajEgKyBHNDtcbiAgICAgICAgdmFyIHoxID0gejAgLSBrMSArIEc0O1xuICAgICAgICB2YXIgdzEgPSB3MCAtIGwxICsgRzQ7XG4gICAgICAgIHZhciB4MiA9IHgwIC0gaTIgKyAyLjAgKiBHNDsgLy8gT2Zmc2V0cyBmb3IgdGhpcmQgY29ybmVyIGluICh4LHkseix3KSBjb29yZHNcbiAgICAgICAgdmFyIHkyID0geTAgLSBqMiArIDIuMCAqIEc0O1xuICAgICAgICB2YXIgejIgPSB6MCAtIGsyICsgMi4wICogRzQ7XG4gICAgICAgIHZhciB3MiA9IHcwIC0gbDIgKyAyLjAgKiBHNDtcbiAgICAgICAgdmFyIHgzID0geDAgLSBpMyArIDMuMCAqIEc0OyAvLyBPZmZzZXRzIGZvciBmb3VydGggY29ybmVyIGluICh4LHkseix3KSBjb29yZHNcbiAgICAgICAgdmFyIHkzID0geTAgLSBqMyArIDMuMCAqIEc0O1xuICAgICAgICB2YXIgejMgPSB6MCAtIGszICsgMy4wICogRzQ7XG4gICAgICAgIHZhciB3MyA9IHcwIC0gbDMgKyAzLjAgKiBHNDtcbiAgICAgICAgdmFyIHg0ID0geDAgLSAxLjAgKyA0LjAgKiBHNDsgLy8gT2Zmc2V0cyBmb3IgbGFzdCBjb3JuZXIgaW4gKHgseSx6LHcpIGNvb3Jkc1xuICAgICAgICB2YXIgeTQgPSB5MCAtIDEuMCArIDQuMCAqIEc0O1xuICAgICAgICB2YXIgejQgPSB6MCAtIDEuMCArIDQuMCAqIEc0O1xuICAgICAgICB2YXIgdzQgPSB3MCAtIDEuMCArIDQuMCAqIEc0O1xuICAgICAgICAvLyBXb3JrIG91dCB0aGUgaGFzaGVkIGdyYWRpZW50IGluZGljZXMgb2YgdGhlIGZpdmUgc2ltcGxleCBjb3JuZXJzXG4gICAgICAgIHZhciBpaSA9IGkgJiAyNTU7XG4gICAgICAgIHZhciBqaiA9IGogJiAyNTU7XG4gICAgICAgIHZhciBrayA9IGsgJiAyNTU7XG4gICAgICAgIHZhciBsbCA9IGwgJiAyNTU7XG4gICAgICAgIC8vIENhbGN1bGF0ZSB0aGUgY29udHJpYnV0aW9uIGZyb20gdGhlIGZpdmUgY29ybmVyc1xuICAgICAgICB2YXIgdDAgPSAwLjYgLSB4MCAqIHgwIC0geTAgKiB5MCAtIHowICogejAgLSB3MCAqIHcwO1xuICAgICAgICBpZiAodDAgPCAwKSBuMCA9IDAuMDtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgZ2kwID0gKHBlcm1baWkgKyBwZXJtW2pqICsgcGVybVtrayArIHBlcm1bbGxdXV1dICUgMzIpICogNDtcbiAgICAgICAgICAgIHQwICo9IHQwO1xuICAgICAgICAgICAgbjAgPSB0MCAqIHQwICogKGdyYWQ0W2dpMF0gKiB4MCArIGdyYWQ0W2dpMCArIDFdICogeTAgKyBncmFkNFtnaTAgKyAyXSAqIHowICsgZ3JhZDRbZ2kwICsgM10gKiB3MCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHQxID0gMC42IC0geDEgKiB4MSAtIHkxICogeTEgLSB6MSAqIHoxIC0gdzEgKiB3MTtcbiAgICAgICAgaWYgKHQxIDwgMCkgbjEgPSAwLjA7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGdpMSA9IChwZXJtW2lpICsgaTEgKyBwZXJtW2pqICsgajEgKyBwZXJtW2trICsgazEgKyBwZXJtW2xsICsgbDFdXV1dICUgMzIpICogNDtcbiAgICAgICAgICAgIHQxICo9IHQxO1xuICAgICAgICAgICAgbjEgPSB0MSAqIHQxICogKGdyYWQ0W2dpMV0gKiB4MSArIGdyYWQ0W2dpMSArIDFdICogeTEgKyBncmFkNFtnaTEgKyAyXSAqIHoxICsgZ3JhZDRbZ2kxICsgM10gKiB3MSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHQyID0gMC42IC0geDIgKiB4MiAtIHkyICogeTIgLSB6MiAqIHoyIC0gdzIgKiB3MjtcbiAgICAgICAgaWYgKHQyIDwgMCkgbjIgPSAwLjA7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGdpMiA9IChwZXJtW2lpICsgaTIgKyBwZXJtW2pqICsgajIgKyBwZXJtW2trICsgazIgKyBwZXJtW2xsICsgbDJdXV1dICUgMzIpICogNDtcbiAgICAgICAgICAgIHQyICo9IHQyO1xuICAgICAgICAgICAgbjIgPSB0MiAqIHQyICogKGdyYWQ0W2dpMl0gKiB4MiArIGdyYWQ0W2dpMiArIDFdICogeTIgKyBncmFkNFtnaTIgKyAyXSAqIHoyICsgZ3JhZDRbZ2kyICsgM10gKiB3Mik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHQzID0gMC42IC0geDMgKiB4MyAtIHkzICogeTMgLSB6MyAqIHozIC0gdzMgKiB3MztcbiAgICAgICAgaWYgKHQzIDwgMCkgbjMgPSAwLjA7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGdpMyA9IChwZXJtW2lpICsgaTMgKyBwZXJtW2pqICsgajMgKyBwZXJtW2trICsgazMgKyBwZXJtW2xsICsgbDNdXV1dICUgMzIpICogNDtcbiAgICAgICAgICAgIHQzICo9IHQzO1xuICAgICAgICAgICAgbjMgPSB0MyAqIHQzICogKGdyYWQ0W2dpM10gKiB4MyArIGdyYWQ0W2dpMyArIDFdICogeTMgKyBncmFkNFtnaTMgKyAyXSAqIHozICsgZ3JhZDRbZ2kzICsgM10gKiB3Myk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHQ0ID0gMC42IC0geDQgKiB4NCAtIHk0ICogeTQgLSB6NCAqIHo0IC0gdzQgKiB3NDtcbiAgICAgICAgaWYgKHQ0IDwgMCkgbjQgPSAwLjA7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGdpNCA9IChwZXJtW2lpICsgMSArIHBlcm1bamogKyAxICsgcGVybVtrayArIDEgKyBwZXJtW2xsICsgMV1dXV0gJSAzMikgKiA0O1xuICAgICAgICAgICAgdDQgKj0gdDQ7XG4gICAgICAgICAgICBuNCA9IHQ0ICogdDQgKiAoZ3JhZDRbZ2k0XSAqIHg0ICsgZ3JhZDRbZ2k0ICsgMV0gKiB5NCArIGdyYWQ0W2dpNCArIDJdICogejQgKyBncmFkNFtnaTQgKyAzXSAqIHc0KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBTdW0gdXAgYW5kIHNjYWxlIHRoZSByZXN1bHQgdG8gY292ZXIgdGhlIHJhbmdlIFstMSwxXVxuICAgICAgICByZXR1cm4gMjcuMCAqIChuMCArIG4xICsgbjIgKyBuMyArIG40KTtcbiAgICB9XG5cblxufTtcblxuLy8gYW1kXG5pZiAodHlwZW9mIGRlZmluZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZGVmaW5lLmFtZCkgZGVmaW5lKGZ1bmN0aW9uKCl7cmV0dXJuIFNpbXBsZXhOb2lzZTt9KTtcbi8vIGJyb3dzZXJcbmVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB3aW5kb3cuU2ltcGxleE5vaXNlID0gU2ltcGxleE5vaXNlO1xuLy9jb21tb24ganNcbmlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIGV4cG9ydHMuU2ltcGxleE5vaXNlID0gU2ltcGxleE5vaXNlO1xuLy8gbm9kZWpzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFNpbXBsZXhOb2lzZTtcbn1cblxufSkoKTtcbiIsInZhciBBUlJBWV9UWVBFID0gdHlwZW9mIEZsb2F0MzJBcnJheSAhPT0gXCJ1bmRlZmluZWRcIiA/IEZsb2F0MzJBcnJheSA6IEFycmF5O1xuXG5mdW5jdGlvbiBNYXRyaXgzKG0pIHtcbiAgICB0aGlzLnZhbCA9IG5ldyBBUlJBWV9UWVBFKDkpO1xuXG4gICAgaWYgKG0pIHsgLy9hc3N1bWUgTWF0cml4MyB3aXRoIHZhbFxuICAgICAgICB0aGlzLmNvcHkobSk7XG4gICAgfSBlbHNlIHsgLy9kZWZhdWx0IHRvIGlkZW50aXR5XG4gICAgICAgIHRoaXMuaWR0KCk7XG4gICAgfVxufVxuXG52YXIgbWF0MyA9IE1hdHJpeDMucHJvdG90eXBlO1xuXG5tYXQzLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBNYXRyaXgzKHRoaXMpO1xufTtcblxubWF0My5zZXQgPSBmdW5jdGlvbihvdGhlck1hdCkge1xuICAgIHJldHVybiB0aGlzLmNvcHkob3RoZXJNYXQpO1xufTtcblxubWF0My5jb3B5ID0gZnVuY3Rpb24ob3RoZXJNYXQpIHtcbiAgICB2YXIgb3V0ID0gdGhpcy52YWwsXG4gICAgICAgIGEgPSBvdGhlck1hdC52YWw7IFxuICAgIG91dFswXSA9IGFbMF07XG4gICAgb3V0WzFdID0gYVsxXTtcbiAgICBvdXRbMl0gPSBhWzJdO1xuICAgIG91dFszXSA9IGFbM107XG4gICAgb3V0WzRdID0gYVs0XTtcbiAgICBvdXRbNV0gPSBhWzVdO1xuICAgIG91dFs2XSA9IGFbNl07XG4gICAgb3V0WzddID0gYVs3XTtcbiAgICBvdXRbOF0gPSBhWzhdO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0My5mcm9tTWF0NCA9IGZ1bmN0aW9uKG0pIHtcbiAgICB2YXIgYSA9IG0udmFsLFxuICAgICAgICBvdXQgPSB0aGlzLnZhbDtcbiAgICBvdXRbMF0gPSBhWzBdO1xuICAgIG91dFsxXSA9IGFbMV07XG4gICAgb3V0WzJdID0gYVsyXTtcbiAgICBvdXRbM10gPSBhWzRdO1xuICAgIG91dFs0XSA9IGFbNV07XG4gICAgb3V0WzVdID0gYVs2XTtcbiAgICBvdXRbNl0gPSBhWzhdO1xuICAgIG91dFs3XSA9IGFbOV07XG4gICAgb3V0WzhdID0gYVsxMF07XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQzLmZyb21BcnJheSA9IGZ1bmN0aW9uKGEpIHtcbiAgICB2YXIgb3V0ID0gdGhpcy52YWw7XG4gICAgb3V0WzBdID0gYVswXTtcbiAgICBvdXRbMV0gPSBhWzFdO1xuICAgIG91dFsyXSA9IGFbMl07XG4gICAgb3V0WzNdID0gYVszXTtcbiAgICBvdXRbNF0gPSBhWzRdO1xuICAgIG91dFs1XSA9IGFbNV07XG4gICAgb3V0WzZdID0gYVs2XTtcbiAgICBvdXRbN10gPSBhWzddO1xuICAgIG91dFs4XSA9IGFbOF07XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQzLmlkZW50aXR5ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG91dCA9IHRoaXMudmFsO1xuICAgIG91dFswXSA9IDE7XG4gICAgb3V0WzFdID0gMDtcbiAgICBvdXRbMl0gPSAwO1xuICAgIG91dFszXSA9IDA7XG4gICAgb3V0WzRdID0gMTtcbiAgICBvdXRbNV0gPSAwO1xuICAgIG91dFs2XSA9IDA7XG4gICAgb3V0WzddID0gMDtcbiAgICBvdXRbOF0gPSAxO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0My50cmFuc3Bvc2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYSA9IHRoaXMudmFsLFxuICAgICAgICBhMDEgPSBhWzFdLCBcbiAgICAgICAgYTAyID0gYVsyXSwgXG4gICAgICAgIGExMiA9IGFbNV07XG4gICAgYVsxXSA9IGFbM107XG4gICAgYVsyXSA9IGFbNl07XG4gICAgYVszXSA9IGEwMTtcbiAgICBhWzVdID0gYVs3XTtcbiAgICBhWzZdID0gYTAyO1xuICAgIGFbN10gPSBhMTI7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQzLmludmVydCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhID0gdGhpcy52YWwsXG4gICAgICAgIGEwMCA9IGFbMF0sIGEwMSA9IGFbMV0sIGEwMiA9IGFbMl0sXG4gICAgICAgIGExMCA9IGFbM10sIGExMSA9IGFbNF0sIGExMiA9IGFbNV0sXG4gICAgICAgIGEyMCA9IGFbNl0sIGEyMSA9IGFbN10sIGEyMiA9IGFbOF0sXG5cbiAgICAgICAgYjAxID0gYTIyICogYTExIC0gYTEyICogYTIxLFxuICAgICAgICBiMTEgPSAtYTIyICogYTEwICsgYTEyICogYTIwLFxuICAgICAgICBiMjEgPSBhMjEgKiBhMTAgLSBhMTEgKiBhMjAsXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRoZSBkZXRlcm1pbmFudFxuICAgICAgICBkZXQgPSBhMDAgKiBiMDEgKyBhMDEgKiBiMTEgKyBhMDIgKiBiMjE7XG5cbiAgICBpZiAoIWRldCkgeyBcbiAgICAgICAgcmV0dXJuIG51bGw7IFxuICAgIH1cbiAgICBkZXQgPSAxLjAgLyBkZXQ7XG5cbiAgICBhWzBdID0gYjAxICogZGV0O1xuICAgIGFbMV0gPSAoLWEyMiAqIGEwMSArIGEwMiAqIGEyMSkgKiBkZXQ7XG4gICAgYVsyXSA9IChhMTIgKiBhMDEgLSBhMDIgKiBhMTEpICogZGV0O1xuICAgIGFbM10gPSBiMTEgKiBkZXQ7XG4gICAgYVs0XSA9IChhMjIgKiBhMDAgLSBhMDIgKiBhMjApICogZGV0O1xuICAgIGFbNV0gPSAoLWExMiAqIGEwMCArIGEwMiAqIGExMCkgKiBkZXQ7XG4gICAgYVs2XSA9IGIyMSAqIGRldDtcbiAgICBhWzddID0gKC1hMjEgKiBhMDAgKyBhMDEgKiBhMjApICogZGV0O1xuICAgIGFbOF0gPSAoYTExICogYTAwIC0gYTAxICogYTEwKSAqIGRldDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDMuYWRqb2ludCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhID0gdGhpcy52YWwsXG4gICAgICAgIGEwMCA9IGFbMF0sIGEwMSA9IGFbMV0sIGEwMiA9IGFbMl0sXG4gICAgICAgIGExMCA9IGFbM10sIGExMSA9IGFbNF0sIGExMiA9IGFbNV0sXG4gICAgICAgIGEyMCA9IGFbNl0sIGEyMSA9IGFbN10sIGEyMiA9IGFbOF07XG5cbiAgICBhWzBdID0gKGExMSAqIGEyMiAtIGExMiAqIGEyMSk7XG4gICAgYVsxXSA9IChhMDIgKiBhMjEgLSBhMDEgKiBhMjIpO1xuICAgIGFbMl0gPSAoYTAxICogYTEyIC0gYTAyICogYTExKTtcbiAgICBhWzNdID0gKGExMiAqIGEyMCAtIGExMCAqIGEyMik7XG4gICAgYVs0XSA9IChhMDAgKiBhMjIgLSBhMDIgKiBhMjApO1xuICAgIGFbNV0gPSAoYTAyICogYTEwIC0gYTAwICogYTEyKTtcbiAgICBhWzZdID0gKGExMCAqIGEyMSAtIGExMSAqIGEyMCk7XG4gICAgYVs3XSA9IChhMDEgKiBhMjAgLSBhMDAgKiBhMjEpO1xuICAgIGFbOF0gPSAoYTAwICogYTExIC0gYTAxICogYTEwKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDMuZGV0ZXJtaW5hbnQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYSA9IHRoaXMudmFsLFxuICAgICAgICBhMDAgPSBhWzBdLCBhMDEgPSBhWzFdLCBhMDIgPSBhWzJdLFxuICAgICAgICBhMTAgPSBhWzNdLCBhMTEgPSBhWzRdLCBhMTIgPSBhWzVdLFxuICAgICAgICBhMjAgPSBhWzZdLCBhMjEgPSBhWzddLCBhMjIgPSBhWzhdO1xuXG4gICAgcmV0dXJuIGEwMCAqIChhMjIgKiBhMTEgLSBhMTIgKiBhMjEpICsgYTAxICogKC1hMjIgKiBhMTAgKyBhMTIgKiBhMjApICsgYTAyICogKGEyMSAqIGExMCAtIGExMSAqIGEyMCk7XG59O1xuXG5tYXQzLm11bHRpcGx5ID0gZnVuY3Rpb24ob3RoZXJNYXQpIHtcbiAgICB2YXIgYSA9IHRoaXMudmFsLFxuICAgICAgICBiID0gb3RoZXJNYXQudmFsLFxuICAgICAgICBhMDAgPSBhWzBdLCBhMDEgPSBhWzFdLCBhMDIgPSBhWzJdLFxuICAgICAgICBhMTAgPSBhWzNdLCBhMTEgPSBhWzRdLCBhMTIgPSBhWzVdLFxuICAgICAgICBhMjAgPSBhWzZdLCBhMjEgPSBhWzddLCBhMjIgPSBhWzhdLFxuXG4gICAgICAgIGIwMCA9IGJbMF0sIGIwMSA9IGJbMV0sIGIwMiA9IGJbMl0sXG4gICAgICAgIGIxMCA9IGJbM10sIGIxMSA9IGJbNF0sIGIxMiA9IGJbNV0sXG4gICAgICAgIGIyMCA9IGJbNl0sIGIyMSA9IGJbN10sIGIyMiA9IGJbOF07XG5cbiAgICBhWzBdID0gYjAwICogYTAwICsgYjAxICogYTEwICsgYjAyICogYTIwO1xuICAgIGFbMV0gPSBiMDAgKiBhMDEgKyBiMDEgKiBhMTEgKyBiMDIgKiBhMjE7XG4gICAgYVsyXSA9IGIwMCAqIGEwMiArIGIwMSAqIGExMiArIGIwMiAqIGEyMjtcblxuICAgIGFbM10gPSBiMTAgKiBhMDAgKyBiMTEgKiBhMTAgKyBiMTIgKiBhMjA7XG4gICAgYVs0XSA9IGIxMCAqIGEwMSArIGIxMSAqIGExMSArIGIxMiAqIGEyMTtcbiAgICBhWzVdID0gYjEwICogYTAyICsgYjExICogYTEyICsgYjEyICogYTIyO1xuXG4gICAgYVs2XSA9IGIyMCAqIGEwMCArIGIyMSAqIGExMCArIGIyMiAqIGEyMDtcbiAgICBhWzddID0gYjIwICogYTAxICsgYjIxICogYTExICsgYjIyICogYTIxO1xuICAgIGFbOF0gPSBiMjAgKiBhMDIgKyBiMjEgKiBhMTIgKyBiMjIgKiBhMjI7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQzLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICB2YXIgYSA9IHRoaXMudmFsLFxuICAgICAgICB4ID0gdi54LCB5ID0gdi55O1xuICAgIGFbNl0gPSB4ICogYVswXSArIHkgKiBhWzNdICsgYVs2XTtcbiAgICBhWzddID0geCAqIGFbMV0gKyB5ICogYVs0XSArIGFbN107XG4gICAgYVs4XSA9IHggKiBhWzJdICsgeSAqIGFbNV0gKyBhWzhdO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0My5yb3RhdGUgPSBmdW5jdGlvbihyYWQpIHtcbiAgICB2YXIgYSA9IHRoaXMudmFsLFxuICAgICAgICBhMDAgPSBhWzBdLCBhMDEgPSBhWzFdLCBhMDIgPSBhWzJdLFxuICAgICAgICBhMTAgPSBhWzNdLCBhMTEgPSBhWzRdLCBhMTIgPSBhWzVdLFxuXG4gICAgICAgIHMgPSBNYXRoLnNpbihyYWQpLFxuICAgICAgICBjID0gTWF0aC5jb3MocmFkKTtcblxuICAgIGFbMF0gPSBjICogYTAwICsgcyAqIGExMDtcbiAgICBhWzFdID0gYyAqIGEwMSArIHMgKiBhMTE7XG4gICAgYVsyXSA9IGMgKiBhMDIgKyBzICogYTEyO1xuXG4gICAgYVszXSA9IGMgKiBhMTAgLSBzICogYTAwO1xuICAgIGFbNF0gPSBjICogYTExIC0gcyAqIGEwMTtcbiAgICBhWzVdID0gYyAqIGExMiAtIHMgKiBhMDI7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQzLnNjYWxlID0gZnVuY3Rpb24odikge1xuICAgIHZhciBhID0gdGhpcy52YWwsXG4gICAgICAgIHggPSB2LngsIFxuICAgICAgICB5ID0gdi55O1xuXG4gICAgYVswXSA9IHggKiBhWzBdO1xuICAgIGFbMV0gPSB4ICogYVsxXTtcbiAgICBhWzJdID0geCAqIGFbMl07XG5cbiAgICBhWzNdID0geSAqIGFbM107XG4gICAgYVs0XSA9IHkgKiBhWzRdO1xuICAgIGFbNV0gPSB5ICogYVs1XTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDMuZnJvbVF1YXQgPSBmdW5jdGlvbihxKSB7XG4gICAgdmFyIHggPSBxLngsIHkgPSBxLnksIHogPSBxLnosIHcgPSBxLncsXG4gICAgICAgIHgyID0geCArIHgsXG4gICAgICAgIHkyID0geSArIHksXG4gICAgICAgIHoyID0geiArIHosXG5cbiAgICAgICAgeHggPSB4ICogeDIsXG4gICAgICAgIHh5ID0geCAqIHkyLFxuICAgICAgICB4eiA9IHggKiB6MixcbiAgICAgICAgeXkgPSB5ICogeTIsXG4gICAgICAgIHl6ID0geSAqIHoyLFxuICAgICAgICB6eiA9IHogKiB6MixcbiAgICAgICAgd3ggPSB3ICogeDIsXG4gICAgICAgIHd5ID0gdyAqIHkyLFxuICAgICAgICB3eiA9IHcgKiB6MixcblxuICAgICAgICBvdXQgPSB0aGlzLnZhbDtcblxuICAgIG91dFswXSA9IDEgLSAoeXkgKyB6eik7XG4gICAgb3V0WzNdID0geHkgKyB3ejtcbiAgICBvdXRbNl0gPSB4eiAtIHd5O1xuXG4gICAgb3V0WzFdID0geHkgLSB3ejtcbiAgICBvdXRbNF0gPSAxIC0gKHh4ICsgenopO1xuICAgIG91dFs3XSA9IHl6ICsgd3g7XG5cbiAgICBvdXRbMl0gPSB4eiArIHd5O1xuICAgIG91dFs1XSA9IHl6IC0gd3g7XG4gICAgb3V0WzhdID0gMSAtICh4eCArIHl5KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDMubm9ybWFsRnJvbU1hdDQgPSBmdW5jdGlvbihtKSB7XG4gICAgdmFyIGEgPSBtLnZhbCxcbiAgICAgICAgb3V0ID0gdGhpcy52YWwsXG5cbiAgICAgICAgYTAwID0gYVswXSwgYTAxID0gYVsxXSwgYTAyID0gYVsyXSwgYTAzID0gYVszXSxcbiAgICAgICAgYTEwID0gYVs0XSwgYTExID0gYVs1XSwgYTEyID0gYVs2XSwgYTEzID0gYVs3XSxcbiAgICAgICAgYTIwID0gYVs4XSwgYTIxID0gYVs5XSwgYTIyID0gYVsxMF0sIGEyMyA9IGFbMTFdLFxuICAgICAgICBhMzAgPSBhWzEyXSwgYTMxID0gYVsxM10sIGEzMiA9IGFbMTRdLCBhMzMgPSBhWzE1XSxcblxuICAgICAgICBiMDAgPSBhMDAgKiBhMTEgLSBhMDEgKiBhMTAsXG4gICAgICAgIGIwMSA9IGEwMCAqIGExMiAtIGEwMiAqIGExMCxcbiAgICAgICAgYjAyID0gYTAwICogYTEzIC0gYTAzICogYTEwLFxuICAgICAgICBiMDMgPSBhMDEgKiBhMTIgLSBhMDIgKiBhMTEsXG4gICAgICAgIGIwNCA9IGEwMSAqIGExMyAtIGEwMyAqIGExMSxcbiAgICAgICAgYjA1ID0gYTAyICogYTEzIC0gYTAzICogYTEyLFxuICAgICAgICBiMDYgPSBhMjAgKiBhMzEgLSBhMjEgKiBhMzAsXG4gICAgICAgIGIwNyA9IGEyMCAqIGEzMiAtIGEyMiAqIGEzMCxcbiAgICAgICAgYjA4ID0gYTIwICogYTMzIC0gYTIzICogYTMwLFxuICAgICAgICBiMDkgPSBhMjEgKiBhMzIgLSBhMjIgKiBhMzEsXG4gICAgICAgIGIxMCA9IGEyMSAqIGEzMyAtIGEyMyAqIGEzMSxcbiAgICAgICAgYjExID0gYTIyICogYTMzIC0gYTIzICogYTMyLFxuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB0aGUgZGV0ZXJtaW5hbnRcbiAgICAgICAgZGV0ID0gYjAwICogYjExIC0gYjAxICogYjEwICsgYjAyICogYjA5ICsgYjAzICogYjA4IC0gYjA0ICogYjA3ICsgYjA1ICogYjA2O1xuXG4gICAgaWYgKCFkZXQpIHsgXG4gICAgICAgIHJldHVybiBudWxsOyBcbiAgICB9XG4gICAgZGV0ID0gMS4wIC8gZGV0O1xuXG4gICAgb3V0WzBdID0gKGExMSAqIGIxMSAtIGExMiAqIGIxMCArIGExMyAqIGIwOSkgKiBkZXQ7XG4gICAgb3V0WzFdID0gKGExMiAqIGIwOCAtIGExMCAqIGIxMSAtIGExMyAqIGIwNykgKiBkZXQ7XG4gICAgb3V0WzJdID0gKGExMCAqIGIxMCAtIGExMSAqIGIwOCArIGExMyAqIGIwNikgKiBkZXQ7XG5cbiAgICBvdXRbM10gPSAoYTAyICogYjEwIC0gYTAxICogYjExIC0gYTAzICogYjA5KSAqIGRldDtcbiAgICBvdXRbNF0gPSAoYTAwICogYjExIC0gYTAyICogYjA4ICsgYTAzICogYjA3KSAqIGRldDtcbiAgICBvdXRbNV0gPSAoYTAxICogYjA4IC0gYTAwICogYjEwIC0gYTAzICogYjA2KSAqIGRldDtcblxuICAgIG91dFs2XSA9IChhMzEgKiBiMDUgLSBhMzIgKiBiMDQgKyBhMzMgKiBiMDMpICogZGV0O1xuICAgIG91dFs3XSA9IChhMzIgKiBiMDIgLSBhMzAgKiBiMDUgLSBhMzMgKiBiMDEpICogZGV0O1xuICAgIG91dFs4XSA9IChhMzAgKiBiMDQgLSBhMzEgKiBiMDIgKyBhMzMgKiBiMDApICogZGV0O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0My5tdWwgPSBtYXQzLm11bHRpcGx5O1xuXG5tYXQzLmlkdCA9IG1hdDMuaWRlbnRpdHk7XG5cbi8vVGhpcyBpcyBoYW5keSBmb3IgUG9vbCB1dGlsaXRpZXMsIHRvIFwicmVzZXRcIiBhXG4vL3NoYXJlZCBvYmplY3QgdG8gaXRzIGRlZmF1bHQgc3RhdGVcbm1hdDMucmVzZXQgPSBtYXQzLmlkdDtcblxubWF0My50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhID0gdGhpcy52YWw7XG4gICAgcmV0dXJuICdNYXRyaXgzKCcgKyBhWzBdICsgJywgJyArIGFbMV0gKyAnLCAnICsgYVsyXSArICcsICcgKyBcbiAgICAgICAgICAgICAgICAgICAgYVszXSArICcsICcgKyBhWzRdICsgJywgJyArIGFbNV0gKyAnLCAnICsgXG4gICAgICAgICAgICAgICAgICAgIGFbNl0gKyAnLCAnICsgYVs3XSArICcsICcgKyBhWzhdICsgJyknO1xufTtcblxubWF0My5zdHIgPSBtYXQzLnRvU3RyaW5nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hdHJpeDM7IiwidmFyIEFSUkFZX1RZUEUgPSB0eXBlb2YgRmxvYXQzMkFycmF5ICE9PSBcInVuZGVmaW5lZFwiID8gRmxvYXQzMkFycmF5IDogQXJyYXk7XG52YXIgRVBTSUxPTiA9IDAuMDAwMDAxO1xuXG5mdW5jdGlvbiBNYXRyaXg0KG0pIHtcbiAgICB0aGlzLnZhbCA9IG5ldyBBUlJBWV9UWVBFKDE2KTtcblxuICAgIGlmIChtKSB7IC8vYXNzdW1lIE1hdHJpeDQgd2l0aCB2YWxcbiAgICAgICAgdGhpcy5jb3B5KG0pO1xuICAgIH0gZWxzZSB7IC8vZGVmYXVsdCB0byBpZGVudGl0eVxuICAgICAgICB0aGlzLmlkdCgpO1xuICAgIH1cbn1cblxudmFyIG1hdDQgPSBNYXRyaXg0LnByb3RvdHlwZTtcblxubWF0NC5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgTWF0cml4NCh0aGlzKTtcbn07XG5cbm1hdDQuc2V0ID0gZnVuY3Rpb24ob3RoZXJNYXQpIHtcbiAgICByZXR1cm4gdGhpcy5jb3B5KG90aGVyTWF0KTtcbn07XG5cbm1hdDQuY29weSA9IGZ1bmN0aW9uKG90aGVyTWF0KSB7XG4gICAgdmFyIG91dCA9IHRoaXMudmFsLFxuICAgICAgICBhID0gb3RoZXJNYXQudmFsOyBcbiAgICBvdXRbMF0gPSBhWzBdO1xuICAgIG91dFsxXSA9IGFbMV07XG4gICAgb3V0WzJdID0gYVsyXTtcbiAgICBvdXRbM10gPSBhWzNdO1xuICAgIG91dFs0XSA9IGFbNF07XG4gICAgb3V0WzVdID0gYVs1XTtcbiAgICBvdXRbNl0gPSBhWzZdO1xuICAgIG91dFs3XSA9IGFbN107XG4gICAgb3V0WzhdID0gYVs4XTtcbiAgICBvdXRbOV0gPSBhWzldO1xuICAgIG91dFsxMF0gPSBhWzEwXTtcbiAgICBvdXRbMTFdID0gYVsxMV07XG4gICAgb3V0WzEyXSA9IGFbMTJdO1xuICAgIG91dFsxM10gPSBhWzEzXTtcbiAgICBvdXRbMTRdID0gYVsxNF07XG4gICAgb3V0WzE1XSA9IGFbMTVdO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0NC5mcm9tQXJyYXkgPSBmdW5jdGlvbihhKSB7XG4gICAgdmFyIG91dCA9IHRoaXMudmFsO1xuICAgIG91dFswXSA9IGFbMF07XG4gICAgb3V0WzFdID0gYVsxXTtcbiAgICBvdXRbMl0gPSBhWzJdO1xuICAgIG91dFszXSA9IGFbM107XG4gICAgb3V0WzRdID0gYVs0XTtcbiAgICBvdXRbNV0gPSBhWzVdO1xuICAgIG91dFs2XSA9IGFbNl07XG4gICAgb3V0WzddID0gYVs3XTtcbiAgICBvdXRbOF0gPSBhWzhdO1xuICAgIG91dFs5XSA9IGFbOV07XG4gICAgb3V0WzEwXSA9IGFbMTBdO1xuICAgIG91dFsxMV0gPSBhWzExXTtcbiAgICBvdXRbMTJdID0gYVsxMl07XG4gICAgb3V0WzEzXSA9IGFbMTNdO1xuICAgIG91dFsxNF0gPSBhWzE0XTtcbiAgICBvdXRbMTVdID0gYVsxNV07XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQ0LmlkZW50aXR5ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG91dCA9IHRoaXMudmFsO1xuICAgIG91dFswXSA9IDE7XG4gICAgb3V0WzFdID0gMDtcbiAgICBvdXRbMl0gPSAwO1xuICAgIG91dFszXSA9IDA7XG4gICAgb3V0WzRdID0gMDtcbiAgICBvdXRbNV0gPSAxO1xuICAgIG91dFs2XSA9IDA7XG4gICAgb3V0WzddID0gMDtcbiAgICBvdXRbOF0gPSAwO1xuICAgIG91dFs5XSA9IDA7XG4gICAgb3V0WzEwXSA9IDE7XG4gICAgb3V0WzExXSA9IDA7XG4gICAgb3V0WzEyXSA9IDA7XG4gICAgb3V0WzEzXSA9IDA7XG4gICAgb3V0WzE0XSA9IDA7XG4gICAgb3V0WzE1XSA9IDE7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQ0LnRyYW5zcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhID0gdGhpcy52YWwsXG4gICAgICAgIGEwMSA9IGFbMV0sIGEwMiA9IGFbMl0sIGEwMyA9IGFbM10sXG4gICAgICAgIGExMiA9IGFbNl0sIGExMyA9IGFbN10sXG4gICAgICAgIGEyMyA9IGFbMTFdO1xuXG4gICAgYVsxXSA9IGFbNF07XG4gICAgYVsyXSA9IGFbOF07XG4gICAgYVszXSA9IGFbMTJdO1xuICAgIGFbNF0gPSBhMDE7XG4gICAgYVs2XSA9IGFbOV07XG4gICAgYVs3XSA9IGFbMTNdO1xuICAgIGFbOF0gPSBhMDI7XG4gICAgYVs5XSA9IGExMjtcbiAgICBhWzExXSA9IGFbMTRdO1xuICAgIGFbMTJdID0gYTAzO1xuICAgIGFbMTNdID0gYTEzO1xuICAgIGFbMTRdID0gYTIzO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0NC5pbnZlcnQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYSA9IHRoaXMudmFsLFxuICAgICAgICBhMDAgPSBhWzBdLCBhMDEgPSBhWzFdLCBhMDIgPSBhWzJdLCBhMDMgPSBhWzNdLFxuICAgICAgICBhMTAgPSBhWzRdLCBhMTEgPSBhWzVdLCBhMTIgPSBhWzZdLCBhMTMgPSBhWzddLFxuICAgICAgICBhMjAgPSBhWzhdLCBhMjEgPSBhWzldLCBhMjIgPSBhWzEwXSwgYTIzID0gYVsxMV0sXG4gICAgICAgIGEzMCA9IGFbMTJdLCBhMzEgPSBhWzEzXSwgYTMyID0gYVsxNF0sIGEzMyA9IGFbMTVdLFxuXG4gICAgICAgIGIwMCA9IGEwMCAqIGExMSAtIGEwMSAqIGExMCxcbiAgICAgICAgYjAxID0gYTAwICogYTEyIC0gYTAyICogYTEwLFxuICAgICAgICBiMDIgPSBhMDAgKiBhMTMgLSBhMDMgKiBhMTAsXG4gICAgICAgIGIwMyA9IGEwMSAqIGExMiAtIGEwMiAqIGExMSxcbiAgICAgICAgYjA0ID0gYTAxICogYTEzIC0gYTAzICogYTExLFxuICAgICAgICBiMDUgPSBhMDIgKiBhMTMgLSBhMDMgKiBhMTIsXG4gICAgICAgIGIwNiA9IGEyMCAqIGEzMSAtIGEyMSAqIGEzMCxcbiAgICAgICAgYjA3ID0gYTIwICogYTMyIC0gYTIyICogYTMwLFxuICAgICAgICBiMDggPSBhMjAgKiBhMzMgLSBhMjMgKiBhMzAsXG4gICAgICAgIGIwOSA9IGEyMSAqIGEzMiAtIGEyMiAqIGEzMSxcbiAgICAgICAgYjEwID0gYTIxICogYTMzIC0gYTIzICogYTMxLFxuICAgICAgICBiMTEgPSBhMjIgKiBhMzMgLSBhMjMgKiBhMzIsXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRoZSBkZXRlcm1pbmFudFxuICAgICAgICBkZXQgPSBiMDAgKiBiMTEgLSBiMDEgKiBiMTAgKyBiMDIgKiBiMDkgKyBiMDMgKiBiMDggLSBiMDQgKiBiMDcgKyBiMDUgKiBiMDY7XG5cbiAgICBpZiAoIWRldCkgeyBcbiAgICAgICAgcmV0dXJuIG51bGw7IFxuICAgIH1cbiAgICBkZXQgPSAxLjAgLyBkZXQ7XG5cbiAgICBhWzBdID0gKGExMSAqIGIxMSAtIGExMiAqIGIxMCArIGExMyAqIGIwOSkgKiBkZXQ7XG4gICAgYVsxXSA9IChhMDIgKiBiMTAgLSBhMDEgKiBiMTEgLSBhMDMgKiBiMDkpICogZGV0O1xuICAgIGFbMl0gPSAoYTMxICogYjA1IC0gYTMyICogYjA0ICsgYTMzICogYjAzKSAqIGRldDtcbiAgICBhWzNdID0gKGEyMiAqIGIwNCAtIGEyMSAqIGIwNSAtIGEyMyAqIGIwMykgKiBkZXQ7XG4gICAgYVs0XSA9IChhMTIgKiBiMDggLSBhMTAgKiBiMTEgLSBhMTMgKiBiMDcpICogZGV0O1xuICAgIGFbNV0gPSAoYTAwICogYjExIC0gYTAyICogYjA4ICsgYTAzICogYjA3KSAqIGRldDtcbiAgICBhWzZdID0gKGEzMiAqIGIwMiAtIGEzMCAqIGIwNSAtIGEzMyAqIGIwMSkgKiBkZXQ7XG4gICAgYVs3XSA9IChhMjAgKiBiMDUgLSBhMjIgKiBiMDIgKyBhMjMgKiBiMDEpICogZGV0O1xuICAgIGFbOF0gPSAoYTEwICogYjEwIC0gYTExICogYjA4ICsgYTEzICogYjA2KSAqIGRldDtcbiAgICBhWzldID0gKGEwMSAqIGIwOCAtIGEwMCAqIGIxMCAtIGEwMyAqIGIwNikgKiBkZXQ7XG4gICAgYVsxMF0gPSAoYTMwICogYjA0IC0gYTMxICogYjAyICsgYTMzICogYjAwKSAqIGRldDtcbiAgICBhWzExXSA9IChhMjEgKiBiMDIgLSBhMjAgKiBiMDQgLSBhMjMgKiBiMDApICogZGV0O1xuICAgIGFbMTJdID0gKGExMSAqIGIwNyAtIGExMCAqIGIwOSAtIGExMiAqIGIwNikgKiBkZXQ7XG4gICAgYVsxM10gPSAoYTAwICogYjA5IC0gYTAxICogYjA3ICsgYTAyICogYjA2KSAqIGRldDtcbiAgICBhWzE0XSA9IChhMzEgKiBiMDEgLSBhMzAgKiBiMDMgLSBhMzIgKiBiMDApICogZGV0O1xuICAgIGFbMTVdID0gKGEyMCAqIGIwMyAtIGEyMSAqIGIwMSArIGEyMiAqIGIwMCkgKiBkZXQ7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQ0LmFkam9pbnQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYSA9IHRoaXMudmFsLFxuICAgICAgICBhMDAgPSBhWzBdLCBhMDEgPSBhWzFdLCBhMDIgPSBhWzJdLCBhMDMgPSBhWzNdLFxuICAgICAgICBhMTAgPSBhWzRdLCBhMTEgPSBhWzVdLCBhMTIgPSBhWzZdLCBhMTMgPSBhWzddLFxuICAgICAgICBhMjAgPSBhWzhdLCBhMjEgPSBhWzldLCBhMjIgPSBhWzEwXSwgYTIzID0gYVsxMV0sXG4gICAgICAgIGEzMCA9IGFbMTJdLCBhMzEgPSBhWzEzXSwgYTMyID0gYVsxNF0sIGEzMyA9IGFbMTVdO1xuXG4gICAgYVswXSAgPSAgKGExMSAqIChhMjIgKiBhMzMgLSBhMjMgKiBhMzIpIC0gYTIxICogKGExMiAqIGEzMyAtIGExMyAqIGEzMikgKyBhMzEgKiAoYTEyICogYTIzIC0gYTEzICogYTIyKSk7XG4gICAgYVsxXSAgPSAtKGEwMSAqIChhMjIgKiBhMzMgLSBhMjMgKiBhMzIpIC0gYTIxICogKGEwMiAqIGEzMyAtIGEwMyAqIGEzMikgKyBhMzEgKiAoYTAyICogYTIzIC0gYTAzICogYTIyKSk7XG4gICAgYVsyXSAgPSAgKGEwMSAqIChhMTIgKiBhMzMgLSBhMTMgKiBhMzIpIC0gYTExICogKGEwMiAqIGEzMyAtIGEwMyAqIGEzMikgKyBhMzEgKiAoYTAyICogYTEzIC0gYTAzICogYTEyKSk7XG4gICAgYVszXSAgPSAtKGEwMSAqIChhMTIgKiBhMjMgLSBhMTMgKiBhMjIpIC0gYTExICogKGEwMiAqIGEyMyAtIGEwMyAqIGEyMikgKyBhMjEgKiAoYTAyICogYTEzIC0gYTAzICogYTEyKSk7XG4gICAgYVs0XSAgPSAtKGExMCAqIChhMjIgKiBhMzMgLSBhMjMgKiBhMzIpIC0gYTIwICogKGExMiAqIGEzMyAtIGExMyAqIGEzMikgKyBhMzAgKiAoYTEyICogYTIzIC0gYTEzICogYTIyKSk7XG4gICAgYVs1XSAgPSAgKGEwMCAqIChhMjIgKiBhMzMgLSBhMjMgKiBhMzIpIC0gYTIwICogKGEwMiAqIGEzMyAtIGEwMyAqIGEzMikgKyBhMzAgKiAoYTAyICogYTIzIC0gYTAzICogYTIyKSk7XG4gICAgYVs2XSAgPSAtKGEwMCAqIChhMTIgKiBhMzMgLSBhMTMgKiBhMzIpIC0gYTEwICogKGEwMiAqIGEzMyAtIGEwMyAqIGEzMikgKyBhMzAgKiAoYTAyICogYTEzIC0gYTAzICogYTEyKSk7XG4gICAgYVs3XSAgPSAgKGEwMCAqIChhMTIgKiBhMjMgLSBhMTMgKiBhMjIpIC0gYTEwICogKGEwMiAqIGEyMyAtIGEwMyAqIGEyMikgKyBhMjAgKiAoYTAyICogYTEzIC0gYTAzICogYTEyKSk7XG4gICAgYVs4XSAgPSAgKGExMCAqIChhMjEgKiBhMzMgLSBhMjMgKiBhMzEpIC0gYTIwICogKGExMSAqIGEzMyAtIGExMyAqIGEzMSkgKyBhMzAgKiAoYTExICogYTIzIC0gYTEzICogYTIxKSk7XG4gICAgYVs5XSAgPSAtKGEwMCAqIChhMjEgKiBhMzMgLSBhMjMgKiBhMzEpIC0gYTIwICogKGEwMSAqIGEzMyAtIGEwMyAqIGEzMSkgKyBhMzAgKiAoYTAxICogYTIzIC0gYTAzICogYTIxKSk7XG4gICAgYVsxMF0gPSAgKGEwMCAqIChhMTEgKiBhMzMgLSBhMTMgKiBhMzEpIC0gYTEwICogKGEwMSAqIGEzMyAtIGEwMyAqIGEzMSkgKyBhMzAgKiAoYTAxICogYTEzIC0gYTAzICogYTExKSk7XG4gICAgYVsxMV0gPSAtKGEwMCAqIChhMTEgKiBhMjMgLSBhMTMgKiBhMjEpIC0gYTEwICogKGEwMSAqIGEyMyAtIGEwMyAqIGEyMSkgKyBhMjAgKiAoYTAxICogYTEzIC0gYTAzICogYTExKSk7XG4gICAgYVsxMl0gPSAtKGExMCAqIChhMjEgKiBhMzIgLSBhMjIgKiBhMzEpIC0gYTIwICogKGExMSAqIGEzMiAtIGExMiAqIGEzMSkgKyBhMzAgKiAoYTExICogYTIyIC0gYTEyICogYTIxKSk7XG4gICAgYVsxM10gPSAgKGEwMCAqIChhMjEgKiBhMzIgLSBhMjIgKiBhMzEpIC0gYTIwICogKGEwMSAqIGEzMiAtIGEwMiAqIGEzMSkgKyBhMzAgKiAoYTAxICogYTIyIC0gYTAyICogYTIxKSk7XG4gICAgYVsxNF0gPSAtKGEwMCAqIChhMTEgKiBhMzIgLSBhMTIgKiBhMzEpIC0gYTEwICogKGEwMSAqIGEzMiAtIGEwMiAqIGEzMSkgKyBhMzAgKiAoYTAxICogYTEyIC0gYTAyICogYTExKSk7XG4gICAgYVsxNV0gPSAgKGEwMCAqIChhMTEgKiBhMjIgLSBhMTIgKiBhMjEpIC0gYTEwICogKGEwMSAqIGEyMiAtIGEwMiAqIGEyMSkgKyBhMjAgKiAoYTAxICogYTEyIC0gYTAyICogYTExKSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQ0LmRldGVybWluYW50ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhID0gdGhpcy52YWwsXG4gICAgICAgIGEwMCA9IGFbMF0sIGEwMSA9IGFbMV0sIGEwMiA9IGFbMl0sIGEwMyA9IGFbM10sXG4gICAgICAgIGExMCA9IGFbNF0sIGExMSA9IGFbNV0sIGExMiA9IGFbNl0sIGExMyA9IGFbN10sXG4gICAgICAgIGEyMCA9IGFbOF0sIGEyMSA9IGFbOV0sIGEyMiA9IGFbMTBdLCBhMjMgPSBhWzExXSxcbiAgICAgICAgYTMwID0gYVsxMl0sIGEzMSA9IGFbMTNdLCBhMzIgPSBhWzE0XSwgYTMzID0gYVsxNV0sXG5cbiAgICAgICAgYjAwID0gYTAwICogYTExIC0gYTAxICogYTEwLFxuICAgICAgICBiMDEgPSBhMDAgKiBhMTIgLSBhMDIgKiBhMTAsXG4gICAgICAgIGIwMiA9IGEwMCAqIGExMyAtIGEwMyAqIGExMCxcbiAgICAgICAgYjAzID0gYTAxICogYTEyIC0gYTAyICogYTExLFxuICAgICAgICBiMDQgPSBhMDEgKiBhMTMgLSBhMDMgKiBhMTEsXG4gICAgICAgIGIwNSA9IGEwMiAqIGExMyAtIGEwMyAqIGExMixcbiAgICAgICAgYjA2ID0gYTIwICogYTMxIC0gYTIxICogYTMwLFxuICAgICAgICBiMDcgPSBhMjAgKiBhMzIgLSBhMjIgKiBhMzAsXG4gICAgICAgIGIwOCA9IGEyMCAqIGEzMyAtIGEyMyAqIGEzMCxcbiAgICAgICAgYjA5ID0gYTIxICogYTMyIC0gYTIyICogYTMxLFxuICAgICAgICBiMTAgPSBhMjEgKiBhMzMgLSBhMjMgKiBhMzEsXG4gICAgICAgIGIxMSA9IGEyMiAqIGEzMyAtIGEyMyAqIGEzMjtcblxuICAgIC8vIENhbGN1bGF0ZSB0aGUgZGV0ZXJtaW5hbnRcbiAgICByZXR1cm4gYjAwICogYjExIC0gYjAxICogYjEwICsgYjAyICogYjA5ICsgYjAzICogYjA4IC0gYjA0ICogYjA3ICsgYjA1ICogYjA2O1xufTtcblxubWF0NC5tdWx0aXBseSA9IGZ1bmN0aW9uKG90aGVyTWF0KSB7XG4gICAgdmFyIGEgPSB0aGlzLnZhbCxcbiAgICAgICAgYiA9IG90aGVyTWF0LnZhbCxcbiAgICAgICAgYTAwID0gYVswXSwgYTAxID0gYVsxXSwgYTAyID0gYVsyXSwgYTAzID0gYVszXSxcbiAgICAgICAgYTEwID0gYVs0XSwgYTExID0gYVs1XSwgYTEyID0gYVs2XSwgYTEzID0gYVs3XSxcbiAgICAgICAgYTIwID0gYVs4XSwgYTIxID0gYVs5XSwgYTIyID0gYVsxMF0sIGEyMyA9IGFbMTFdLFxuICAgICAgICBhMzAgPSBhWzEyXSwgYTMxID0gYVsxM10sIGEzMiA9IGFbMTRdLCBhMzMgPSBhWzE1XTtcblxuICAgIC8vIENhY2hlIG9ubHkgdGhlIGN1cnJlbnQgbGluZSBvZiB0aGUgc2Vjb25kIG1hdHJpeFxuICAgIHZhciBiMCAgPSBiWzBdLCBiMSA9IGJbMV0sIGIyID0gYlsyXSwgYjMgPSBiWzNdOyAgXG4gICAgYVswXSA9IGIwKmEwMCArIGIxKmExMCArIGIyKmEyMCArIGIzKmEzMDtcbiAgICBhWzFdID0gYjAqYTAxICsgYjEqYTExICsgYjIqYTIxICsgYjMqYTMxO1xuICAgIGFbMl0gPSBiMCphMDIgKyBiMSphMTIgKyBiMiphMjIgKyBiMyphMzI7XG4gICAgYVszXSA9IGIwKmEwMyArIGIxKmExMyArIGIyKmEyMyArIGIzKmEzMztcblxuICAgIGIwID0gYls0XTsgYjEgPSBiWzVdOyBiMiA9IGJbNl07IGIzID0gYls3XTtcbiAgICBhWzRdID0gYjAqYTAwICsgYjEqYTEwICsgYjIqYTIwICsgYjMqYTMwO1xuICAgIGFbNV0gPSBiMCphMDEgKyBiMSphMTEgKyBiMiphMjEgKyBiMyphMzE7XG4gICAgYVs2XSA9IGIwKmEwMiArIGIxKmExMiArIGIyKmEyMiArIGIzKmEzMjtcbiAgICBhWzddID0gYjAqYTAzICsgYjEqYTEzICsgYjIqYTIzICsgYjMqYTMzO1xuXG4gICAgYjAgPSBiWzhdOyBiMSA9IGJbOV07IGIyID0gYlsxMF07IGIzID0gYlsxMV07XG4gICAgYVs4XSA9IGIwKmEwMCArIGIxKmExMCArIGIyKmEyMCArIGIzKmEzMDtcbiAgICBhWzldID0gYjAqYTAxICsgYjEqYTExICsgYjIqYTIxICsgYjMqYTMxO1xuICAgIGFbMTBdID0gYjAqYTAyICsgYjEqYTEyICsgYjIqYTIyICsgYjMqYTMyO1xuICAgIGFbMTFdID0gYjAqYTAzICsgYjEqYTEzICsgYjIqYTIzICsgYjMqYTMzO1xuXG4gICAgYjAgPSBiWzEyXTsgYjEgPSBiWzEzXTsgYjIgPSBiWzE0XTsgYjMgPSBiWzE1XTtcbiAgICBhWzEyXSA9IGIwKmEwMCArIGIxKmExMCArIGIyKmEyMCArIGIzKmEzMDtcbiAgICBhWzEzXSA9IGIwKmEwMSArIGIxKmExMSArIGIyKmEyMSArIGIzKmEzMTtcbiAgICBhWzE0XSA9IGIwKmEwMiArIGIxKmExMiArIGIyKmEyMiArIGIzKmEzMjtcbiAgICBhWzE1XSA9IGIwKmEwMyArIGIxKmExMyArIGIyKmEyMyArIGIzKmEzMztcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDQudHJhbnNsYXRlID0gZnVuY3Rpb24odikge1xuICAgIHZhciB4ID0gdi54LCB5ID0gdi55LCB6ID0gdi56LFxuICAgICAgICBhID0gdGhpcy52YWw7XG4gICAgYVsxMl0gPSBhWzBdICogeCArIGFbNF0gKiB5ICsgYVs4XSAqIHogKyBhWzEyXTtcbiAgICBhWzEzXSA9IGFbMV0gKiB4ICsgYVs1XSAqIHkgKyBhWzldICogeiArIGFbMTNdO1xuICAgIGFbMTRdID0gYVsyXSAqIHggKyBhWzZdICogeSArIGFbMTBdICogeiArIGFbMTRdO1xuICAgIGFbMTVdID0gYVszXSAqIHggKyBhWzddICogeSArIGFbMTFdICogeiArIGFbMTVdO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0NC5zY2FsZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICB2YXIgeCA9IHYueCwgeSA9IHYueSwgeiA9IHYueiwgYSA9IHRoaXMudmFsO1xuXG4gICAgYVswXSA9IGFbMF0gKiB4O1xuICAgIGFbMV0gPSBhWzFdICogeDtcbiAgICBhWzJdID0gYVsyXSAqIHg7XG4gICAgYVszXSA9IGFbM10gKiB4O1xuICAgIGFbNF0gPSBhWzRdICogeTtcbiAgICBhWzVdID0gYVs1XSAqIHk7XG4gICAgYVs2XSA9IGFbNl0gKiB5O1xuICAgIGFbN10gPSBhWzddICogeTtcbiAgICBhWzhdID0gYVs4XSAqIHo7XG4gICAgYVs5XSA9IGFbOV0gKiB6O1xuICAgIGFbMTBdID0gYVsxMF0gKiB6O1xuICAgIGFbMTFdID0gYVsxMV0gKiB6O1xuICAgIGFbMTJdID0gYVsxMl07XG4gICAgYVsxM10gPSBhWzEzXTtcbiAgICBhWzE0XSA9IGFbMTRdO1xuICAgIGFbMTVdID0gYVsxNV07XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQ0LnJvdGF0ZSA9IGZ1bmN0aW9uIChyYWQsIGF4aXMpIHtcbiAgICB2YXIgYSA9IHRoaXMudmFsLFxuICAgICAgICB4ID0gYXhpcy54LCB5ID0gYXhpcy55LCB6ID0gYXhpcy56LFxuICAgICAgICBsZW4gPSBNYXRoLnNxcnQoeCAqIHggKyB5ICogeSArIHogKiB6KSxcbiAgICAgICAgcywgYywgdCxcbiAgICAgICAgYTAwLCBhMDEsIGEwMiwgYTAzLFxuICAgICAgICBhMTAsIGExMSwgYTEyLCBhMTMsXG4gICAgICAgIGEyMCwgYTIxLCBhMjIsIGEyMyxcbiAgICAgICAgYjAwLCBiMDEsIGIwMixcbiAgICAgICAgYjEwLCBiMTEsIGIxMixcbiAgICAgICAgYjIwLCBiMjEsIGIyMjtcblxuICAgIGlmIChNYXRoLmFicyhsZW4pIDwgRVBTSUxPTikgeyByZXR1cm4gbnVsbDsgfVxuICAgIFxuICAgIGxlbiA9IDEgLyBsZW47XG4gICAgeCAqPSBsZW47XG4gICAgeSAqPSBsZW47XG4gICAgeiAqPSBsZW47XG5cbiAgICBzID0gTWF0aC5zaW4ocmFkKTtcbiAgICBjID0gTWF0aC5jb3MocmFkKTtcbiAgICB0ID0gMSAtIGM7XG5cbiAgICBhMDAgPSBhWzBdOyBhMDEgPSBhWzFdOyBhMDIgPSBhWzJdOyBhMDMgPSBhWzNdO1xuICAgIGExMCA9IGFbNF07IGExMSA9IGFbNV07IGExMiA9IGFbNl07IGExMyA9IGFbN107XG4gICAgYTIwID0gYVs4XTsgYTIxID0gYVs5XTsgYTIyID0gYVsxMF07IGEyMyA9IGFbMTFdO1xuXG4gICAgLy8gQ29uc3RydWN0IHRoZSBlbGVtZW50cyBvZiB0aGUgcm90YXRpb24gbWF0cml4XG4gICAgYjAwID0geCAqIHggKiB0ICsgYzsgYjAxID0geSAqIHggKiB0ICsgeiAqIHM7IGIwMiA9IHogKiB4ICogdCAtIHkgKiBzO1xuICAgIGIxMCA9IHggKiB5ICogdCAtIHogKiBzOyBiMTEgPSB5ICogeSAqIHQgKyBjOyBiMTIgPSB6ICogeSAqIHQgKyB4ICogcztcbiAgICBiMjAgPSB4ICogeiAqIHQgKyB5ICogczsgYjIxID0geSAqIHogKiB0IC0geCAqIHM7IGIyMiA9IHogKiB6ICogdCArIGM7XG5cbiAgICAvLyBQZXJmb3JtIHJvdGF0aW9uLXNwZWNpZmljIG1hdHJpeCBtdWx0aXBsaWNhdGlvblxuICAgIGFbMF0gPSBhMDAgKiBiMDAgKyBhMTAgKiBiMDEgKyBhMjAgKiBiMDI7XG4gICAgYVsxXSA9IGEwMSAqIGIwMCArIGExMSAqIGIwMSArIGEyMSAqIGIwMjtcbiAgICBhWzJdID0gYTAyICogYjAwICsgYTEyICogYjAxICsgYTIyICogYjAyO1xuICAgIGFbM10gPSBhMDMgKiBiMDAgKyBhMTMgKiBiMDEgKyBhMjMgKiBiMDI7XG4gICAgYVs0XSA9IGEwMCAqIGIxMCArIGExMCAqIGIxMSArIGEyMCAqIGIxMjtcbiAgICBhWzVdID0gYTAxICogYjEwICsgYTExICogYjExICsgYTIxICogYjEyO1xuICAgIGFbNl0gPSBhMDIgKiBiMTAgKyBhMTIgKiBiMTEgKyBhMjIgKiBiMTI7XG4gICAgYVs3XSA9IGEwMyAqIGIxMCArIGExMyAqIGIxMSArIGEyMyAqIGIxMjtcbiAgICBhWzhdID0gYTAwICogYjIwICsgYTEwICogYjIxICsgYTIwICogYjIyO1xuICAgIGFbOV0gPSBhMDEgKiBiMjAgKyBhMTEgKiBiMjEgKyBhMjEgKiBiMjI7XG4gICAgYVsxMF0gPSBhMDIgKiBiMjAgKyBhMTIgKiBiMjEgKyBhMjIgKiBiMjI7XG4gICAgYVsxMV0gPSBhMDMgKiBiMjAgKyBhMTMgKiBiMjEgKyBhMjMgKiBiMjI7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQ0LnJvdGF0ZVggPSBmdW5jdGlvbihyYWQpIHtcbiAgICB2YXIgYSA9IHRoaXMudmFsLFxuICAgICAgICBzID0gTWF0aC5zaW4ocmFkKSxcbiAgICAgICAgYyA9IE1hdGguY29zKHJhZCksXG4gICAgICAgIGExMCA9IGFbNF0sXG4gICAgICAgIGExMSA9IGFbNV0sXG4gICAgICAgIGExMiA9IGFbNl0sXG4gICAgICAgIGExMyA9IGFbN10sXG4gICAgICAgIGEyMCA9IGFbOF0sXG4gICAgICAgIGEyMSA9IGFbOV0sXG4gICAgICAgIGEyMiA9IGFbMTBdLFxuICAgICAgICBhMjMgPSBhWzExXTtcblxuICAgIC8vIFBlcmZvcm0gYXhpcy1zcGVjaWZpYyBtYXRyaXggbXVsdGlwbGljYXRpb25cbiAgICBhWzRdID0gYTEwICogYyArIGEyMCAqIHM7XG4gICAgYVs1XSA9IGExMSAqIGMgKyBhMjEgKiBzO1xuICAgIGFbNl0gPSBhMTIgKiBjICsgYTIyICogcztcbiAgICBhWzddID0gYTEzICogYyArIGEyMyAqIHM7XG4gICAgYVs4XSA9IGEyMCAqIGMgLSBhMTAgKiBzO1xuICAgIGFbOV0gPSBhMjEgKiBjIC0gYTExICogcztcbiAgICBhWzEwXSA9IGEyMiAqIGMgLSBhMTIgKiBzO1xuICAgIGFbMTFdID0gYTIzICogYyAtIGExMyAqIHM7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQ0LnJvdGF0ZVkgPSBmdW5jdGlvbihyYWQpIHtcbiAgICB2YXIgYSA9IHRoaXMudmFsLFxuICAgICAgICBzID0gTWF0aC5zaW4ocmFkKSxcbiAgICAgICAgYyA9IE1hdGguY29zKHJhZCksXG4gICAgICAgIGEwMCA9IGFbMF0sXG4gICAgICAgIGEwMSA9IGFbMV0sXG4gICAgICAgIGEwMiA9IGFbMl0sXG4gICAgICAgIGEwMyA9IGFbM10sXG4gICAgICAgIGEyMCA9IGFbOF0sXG4gICAgICAgIGEyMSA9IGFbOV0sXG4gICAgICAgIGEyMiA9IGFbMTBdLFxuICAgICAgICBhMjMgPSBhWzExXTtcblxuICAgIC8vIFBlcmZvcm0gYXhpcy1zcGVjaWZpYyBtYXRyaXggbXVsdGlwbGljYXRpb25cbiAgICBhWzBdID0gYTAwICogYyAtIGEyMCAqIHM7XG4gICAgYVsxXSA9IGEwMSAqIGMgLSBhMjEgKiBzO1xuICAgIGFbMl0gPSBhMDIgKiBjIC0gYTIyICogcztcbiAgICBhWzNdID0gYTAzICogYyAtIGEyMyAqIHM7XG4gICAgYVs4XSA9IGEwMCAqIHMgKyBhMjAgKiBjO1xuICAgIGFbOV0gPSBhMDEgKiBzICsgYTIxICogYztcbiAgICBhWzEwXSA9IGEwMiAqIHMgKyBhMjIgKiBjO1xuICAgIGFbMTFdID0gYTAzICogcyArIGEyMyAqIGM7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQ0LnJvdGF0ZVogPSBmdW5jdGlvbiAocmFkKSB7XG4gICAgdmFyIGEgPSB0aGlzLnZhbCxcbiAgICAgICAgcyA9IE1hdGguc2luKHJhZCksXG4gICAgICAgIGMgPSBNYXRoLmNvcyhyYWQpLFxuICAgICAgICBhMDAgPSBhWzBdLFxuICAgICAgICBhMDEgPSBhWzFdLFxuICAgICAgICBhMDIgPSBhWzJdLFxuICAgICAgICBhMDMgPSBhWzNdLFxuICAgICAgICBhMTAgPSBhWzRdLFxuICAgICAgICBhMTEgPSBhWzVdLFxuICAgICAgICBhMTIgPSBhWzZdLFxuICAgICAgICBhMTMgPSBhWzddO1xuXG4gICAgLy8gUGVyZm9ybSBheGlzLXNwZWNpZmljIG1hdHJpeCBtdWx0aXBsaWNhdGlvblxuICAgIGFbMF0gPSBhMDAgKiBjICsgYTEwICogcztcbiAgICBhWzFdID0gYTAxICogYyArIGExMSAqIHM7XG4gICAgYVsyXSA9IGEwMiAqIGMgKyBhMTIgKiBzO1xuICAgIGFbM10gPSBhMDMgKiBjICsgYTEzICogcztcbiAgICBhWzRdID0gYTEwICogYyAtIGEwMCAqIHM7XG4gICAgYVs1XSA9IGExMSAqIGMgLSBhMDEgKiBzO1xuICAgIGFbNl0gPSBhMTIgKiBjIC0gYTAyICogcztcbiAgICBhWzddID0gYTEzICogYyAtIGEwMyAqIHM7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQ0LmZyb21Sb3RhdGlvblRyYW5zbGF0aW9uID0gZnVuY3Rpb24gKHEsIHYpIHtcbiAgICAvLyBRdWF0ZXJuaW9uIG1hdGhcbiAgICB2YXIgb3V0ID0gdGhpcy52YWwsXG4gICAgICAgIHggPSBxLngsIHkgPSBxLnksIHogPSBxLnosIHcgPSBxLncsXG4gICAgICAgIHgyID0geCArIHgsXG4gICAgICAgIHkyID0geSArIHksXG4gICAgICAgIHoyID0geiArIHosXG5cbiAgICAgICAgeHggPSB4ICogeDIsXG4gICAgICAgIHh5ID0geCAqIHkyLFxuICAgICAgICB4eiA9IHggKiB6MixcbiAgICAgICAgeXkgPSB5ICogeTIsXG4gICAgICAgIHl6ID0geSAqIHoyLFxuICAgICAgICB6eiA9IHogKiB6MixcbiAgICAgICAgd3ggPSB3ICogeDIsXG4gICAgICAgIHd5ID0gdyAqIHkyLFxuICAgICAgICB3eiA9IHcgKiB6MjtcblxuICAgIG91dFswXSA9IDEgLSAoeXkgKyB6eik7XG4gICAgb3V0WzFdID0geHkgKyB3ejtcbiAgICBvdXRbMl0gPSB4eiAtIHd5O1xuICAgIG91dFszXSA9IDA7XG4gICAgb3V0WzRdID0geHkgLSB3ejtcbiAgICBvdXRbNV0gPSAxIC0gKHh4ICsgenopO1xuICAgIG91dFs2XSA9IHl6ICsgd3g7XG4gICAgb3V0WzddID0gMDtcbiAgICBvdXRbOF0gPSB4eiArIHd5O1xuICAgIG91dFs5XSA9IHl6IC0gd3g7XG4gICAgb3V0WzEwXSA9IDEgLSAoeHggKyB5eSk7XG4gICAgb3V0WzExXSA9IDA7XG4gICAgb3V0WzEyXSA9IHYueDtcbiAgICBvdXRbMTNdID0gdi55O1xuICAgIG91dFsxNF0gPSB2Lno7XG4gICAgb3V0WzE1XSA9IDE7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQ0LmZyb21RdWF0ID0gZnVuY3Rpb24gKHEpIHtcbiAgICB2YXIgb3V0ID0gdGhpcy52YWwsXG4gICAgICAgIHggPSBxLngsIHkgPSBxLnksIHogPSBxLnosIHcgPSBxLncsXG4gICAgICAgIHgyID0geCArIHgsXG4gICAgICAgIHkyID0geSArIHksXG4gICAgICAgIHoyID0geiArIHosXG5cbiAgICAgICAgeHggPSB4ICogeDIsXG4gICAgICAgIHh5ID0geCAqIHkyLFxuICAgICAgICB4eiA9IHggKiB6MixcbiAgICAgICAgeXkgPSB5ICogeTIsXG4gICAgICAgIHl6ID0geSAqIHoyLFxuICAgICAgICB6eiA9IHogKiB6MixcbiAgICAgICAgd3ggPSB3ICogeDIsXG4gICAgICAgIHd5ID0gdyAqIHkyLFxuICAgICAgICB3eiA9IHcgKiB6MjtcblxuICAgIG91dFswXSA9IDEgLSAoeXkgKyB6eik7XG4gICAgb3V0WzFdID0geHkgKyB3ejtcbiAgICBvdXRbMl0gPSB4eiAtIHd5O1xuICAgIG91dFszXSA9IDA7XG5cbiAgICBvdXRbNF0gPSB4eSAtIHd6O1xuICAgIG91dFs1XSA9IDEgLSAoeHggKyB6eik7XG4gICAgb3V0WzZdID0geXogKyB3eDtcbiAgICBvdXRbN10gPSAwO1xuXG4gICAgb3V0WzhdID0geHogKyB3eTtcbiAgICBvdXRbOV0gPSB5eiAtIHd4O1xuICAgIG91dFsxMF0gPSAxIC0gKHh4ICsgeXkpO1xuICAgIG91dFsxMV0gPSAwO1xuXG4gICAgb3V0WzEyXSA9IDA7XG4gICAgb3V0WzEzXSA9IDA7XG4gICAgb3V0WzE0XSA9IDA7XG4gICAgb3V0WzE1XSA9IDE7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBHZW5lcmF0ZXMgYSBmcnVzdHVtIG1hdHJpeCB3aXRoIHRoZSBnaXZlbiBib3VuZHNcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gbGVmdCBMZWZ0IGJvdW5kIG9mIHRoZSBmcnVzdHVtXG4gKiBAcGFyYW0ge051bWJlcn0gcmlnaHQgUmlnaHQgYm91bmQgb2YgdGhlIGZydXN0dW1cbiAqIEBwYXJhbSB7TnVtYmVyfSBib3R0b20gQm90dG9tIGJvdW5kIG9mIHRoZSBmcnVzdHVtXG4gKiBAcGFyYW0ge051bWJlcn0gdG9wIFRvcCBib3VuZCBvZiB0aGUgZnJ1c3R1bVxuICogQHBhcmFtIHtOdW1iZXJ9IG5lYXIgTmVhciBib3VuZCBvZiB0aGUgZnJ1c3R1bVxuICogQHBhcmFtIHtOdW1iZXJ9IGZhciBGYXIgYm91bmQgb2YgdGhlIGZydXN0dW1cbiAqIEByZXR1cm5zIHtNYXRyaXg0fSB0aGlzIGZvciBjaGFpbmluZ1xuICovXG5tYXQ0LmZydXN0dW0gPSBmdW5jdGlvbiAobGVmdCwgcmlnaHQsIGJvdHRvbSwgdG9wLCBuZWFyLCBmYXIpIHtcbiAgICB2YXIgb3V0ID0gdGhpcy52YWwsXG4gICAgICAgIHJsID0gMSAvIChyaWdodCAtIGxlZnQpLFxuICAgICAgICB0YiA9IDEgLyAodG9wIC0gYm90dG9tKSxcbiAgICAgICAgbmYgPSAxIC8gKG5lYXIgLSBmYXIpO1xuICAgIG91dFswXSA9IChuZWFyICogMikgKiBybDtcbiAgICBvdXRbMV0gPSAwO1xuICAgIG91dFsyXSA9IDA7XG4gICAgb3V0WzNdID0gMDtcbiAgICBvdXRbNF0gPSAwO1xuICAgIG91dFs1XSA9IChuZWFyICogMikgKiB0YjtcbiAgICBvdXRbNl0gPSAwO1xuICAgIG91dFs3XSA9IDA7XG4gICAgb3V0WzhdID0gKHJpZ2h0ICsgbGVmdCkgKiBybDtcbiAgICBvdXRbOV0gPSAodG9wICsgYm90dG9tKSAqIHRiO1xuICAgIG91dFsxMF0gPSAoZmFyICsgbmVhcikgKiBuZjtcbiAgICBvdXRbMTFdID0gLTE7XG4gICAgb3V0WzEyXSA9IDA7XG4gICAgb3V0WzEzXSA9IDA7XG4gICAgb3V0WzE0XSA9IChmYXIgKiBuZWFyICogMikgKiBuZjtcbiAgICBvdXRbMTVdID0gMDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBHZW5lcmF0ZXMgYSBwZXJzcGVjdGl2ZSBwcm9qZWN0aW9uIG1hdHJpeCB3aXRoIHRoZSBnaXZlbiBib3VuZHNcbiAqXG4gKiBAcGFyYW0ge251bWJlcn0gZm92eSBWZXJ0aWNhbCBmaWVsZCBvZiB2aWV3IGluIHJhZGlhbnNcbiAqIEBwYXJhbSB7bnVtYmVyfSBhc3BlY3QgQXNwZWN0IHJhdGlvLiB0eXBpY2FsbHkgdmlld3BvcnQgd2lkdGgvaGVpZ2h0XG4gKiBAcGFyYW0ge251bWJlcn0gbmVhciBOZWFyIGJvdW5kIG9mIHRoZSBmcnVzdHVtXG4gKiBAcGFyYW0ge251bWJlcn0gZmFyIEZhciBib3VuZCBvZiB0aGUgZnJ1c3R1bVxuICogQHJldHVybnMge01hdHJpeDR9IHRoaXMgZm9yIGNoYWluaW5nXG4gKi9cbm1hdDQucGVyc3BlY3RpdmUgPSBmdW5jdGlvbiAoZm92eSwgYXNwZWN0LCBuZWFyLCBmYXIpIHtcbiAgICB2YXIgb3V0ID0gdGhpcy52YWwsXG4gICAgICAgIGYgPSAxLjAgLyBNYXRoLnRhbihmb3Z5IC8gMiksXG4gICAgICAgIG5mID0gMSAvIChuZWFyIC0gZmFyKTtcbiAgICBvdXRbMF0gPSBmIC8gYXNwZWN0O1xuICAgIG91dFsxXSA9IDA7XG4gICAgb3V0WzJdID0gMDtcbiAgICBvdXRbM10gPSAwO1xuICAgIG91dFs0XSA9IDA7XG4gICAgb3V0WzVdID0gZjtcbiAgICBvdXRbNl0gPSAwO1xuICAgIG91dFs3XSA9IDA7XG4gICAgb3V0WzhdID0gMDtcbiAgICBvdXRbOV0gPSAwO1xuICAgIG91dFsxMF0gPSAoZmFyICsgbmVhcikgKiBuZjtcbiAgICBvdXRbMTFdID0gLTE7XG4gICAgb3V0WzEyXSA9IDA7XG4gICAgb3V0WzEzXSA9IDA7XG4gICAgb3V0WzE0XSA9ICgyICogZmFyICogbmVhcikgKiBuZjtcbiAgICBvdXRbMTVdID0gMDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR2VuZXJhdGVzIGEgb3J0aG9nb25hbCBwcm9qZWN0aW9uIG1hdHJpeCB3aXRoIHRoZSBnaXZlbiBib3VuZHNcbiAqXG4gKiBAcGFyYW0ge251bWJlcn0gbGVmdCBMZWZ0IGJvdW5kIG9mIHRoZSBmcnVzdHVtXG4gKiBAcGFyYW0ge251bWJlcn0gcmlnaHQgUmlnaHQgYm91bmQgb2YgdGhlIGZydXN0dW1cbiAqIEBwYXJhbSB7bnVtYmVyfSBib3R0b20gQm90dG9tIGJvdW5kIG9mIHRoZSBmcnVzdHVtXG4gKiBAcGFyYW0ge251bWJlcn0gdG9wIFRvcCBib3VuZCBvZiB0aGUgZnJ1c3R1bVxuICogQHBhcmFtIHtudW1iZXJ9IG5lYXIgTmVhciBib3VuZCBvZiB0aGUgZnJ1c3R1bVxuICogQHBhcmFtIHtudW1iZXJ9IGZhciBGYXIgYm91bmQgb2YgdGhlIGZydXN0dW1cbiAqIEByZXR1cm5zIHtNYXRyaXg0fSB0aGlzIGZvciBjaGFpbmluZ1xuICovXG5tYXQ0Lm9ydGhvID0gZnVuY3Rpb24gKGxlZnQsIHJpZ2h0LCBib3R0b20sIHRvcCwgbmVhciwgZmFyKSB7XG4gICAgdmFyIG91dCA9IHRoaXMudmFsLFxuICAgICAgICBsciA9IDEgLyAobGVmdCAtIHJpZ2h0KSxcbiAgICAgICAgYnQgPSAxIC8gKGJvdHRvbSAtIHRvcCksXG4gICAgICAgIG5mID0gMSAvIChuZWFyIC0gZmFyKTtcbiAgICBvdXRbMF0gPSAtMiAqIGxyO1xuICAgIG91dFsxXSA9IDA7XG4gICAgb3V0WzJdID0gMDtcbiAgICBvdXRbM10gPSAwO1xuICAgIG91dFs0XSA9IDA7XG4gICAgb3V0WzVdID0gLTIgKiBidDtcbiAgICBvdXRbNl0gPSAwO1xuICAgIG91dFs3XSA9IDA7XG4gICAgb3V0WzhdID0gMDtcbiAgICBvdXRbOV0gPSAwO1xuICAgIG91dFsxMF0gPSAyICogbmY7XG4gICAgb3V0WzExXSA9IDA7XG4gICAgb3V0WzEyXSA9IChsZWZ0ICsgcmlnaHQpICogbHI7XG4gICAgb3V0WzEzXSA9ICh0b3AgKyBib3R0b20pICogYnQ7XG4gICAgb3V0WzE0XSA9IChmYXIgKyBuZWFyKSAqIG5mO1xuICAgIG91dFsxNV0gPSAxO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZW5lcmF0ZXMgYSBsb29rLWF0IG1hdHJpeCB3aXRoIHRoZSBnaXZlbiBleWUgcG9zaXRpb24sIGZvY2FsIHBvaW50LCBhbmQgdXAgYXhpc1xuICpcbiAqIEBwYXJhbSB7VmVjdG9yM30gZXllIFBvc2l0aW9uIG9mIHRoZSB2aWV3ZXJcbiAqIEBwYXJhbSB7VmVjdG9yM30gY2VudGVyIFBvaW50IHRoZSB2aWV3ZXIgaXMgbG9va2luZyBhdFxuICogQHBhcmFtIHtWZWN0b3IzfSB1cCB2ZWMzIHBvaW50aW5nIHVwXG4gKiBAcmV0dXJucyB7TWF0cml4NH0gdGhpcyBmb3IgY2hhaW5pbmdcbiAqL1xubWF0NC5sb29rQXQgPSBmdW5jdGlvbiAoZXllLCBjZW50ZXIsIHVwKSB7XG4gICAgdmFyIG91dCA9IHRoaXMudmFsLFxuXG4gICAgICAgIHgwLCB4MSwgeDIsIHkwLCB5MSwgeTIsIHowLCB6MSwgejIsIGxlbixcbiAgICAgICAgZXlleCA9IGV5ZS54LFxuICAgICAgICBleWV5ID0gZXllLnksXG4gICAgICAgIGV5ZXogPSBleWUueixcbiAgICAgICAgdXB4ID0gdXAueCxcbiAgICAgICAgdXB5ID0gdXAueSxcbiAgICAgICAgdXB6ID0gdXAueixcbiAgICAgICAgY2VudGVyeCA9IGNlbnRlci54LFxuICAgICAgICBjZW50ZXJ5ID0gY2VudGVyLnksXG4gICAgICAgIGNlbnRlcnogPSBjZW50ZXIuejtcblxuICAgIGlmIChNYXRoLmFicyhleWV4IC0gY2VudGVyeCkgPCBFUFNJTE9OICYmXG4gICAgICAgIE1hdGguYWJzKGV5ZXkgLSBjZW50ZXJ5KSA8IEVQU0lMT04gJiZcbiAgICAgICAgTWF0aC5hYnMoZXlleiAtIGNlbnRlcnopIDwgRVBTSUxPTikge1xuICAgICAgICByZXR1cm4gdGhpcy5pZGVudGl0eSgpO1xuICAgIH1cblxuICAgIHowID0gZXlleCAtIGNlbnRlcng7XG4gICAgejEgPSBleWV5IC0gY2VudGVyeTtcbiAgICB6MiA9IGV5ZXogLSBjZW50ZXJ6O1xuXG4gICAgbGVuID0gMSAvIE1hdGguc3FydCh6MCAqIHowICsgejEgKiB6MSArIHoyICogejIpO1xuICAgIHowICo9IGxlbjtcbiAgICB6MSAqPSBsZW47XG4gICAgejIgKj0gbGVuO1xuXG4gICAgeDAgPSB1cHkgKiB6MiAtIHVweiAqIHoxO1xuICAgIHgxID0gdXB6ICogejAgLSB1cHggKiB6MjtcbiAgICB4MiA9IHVweCAqIHoxIC0gdXB5ICogejA7XG4gICAgbGVuID0gTWF0aC5zcXJ0KHgwICogeDAgKyB4MSAqIHgxICsgeDIgKiB4Mik7XG4gICAgaWYgKCFsZW4pIHtcbiAgICAgICAgeDAgPSAwO1xuICAgICAgICB4MSA9IDA7XG4gICAgICAgIHgyID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBsZW4gPSAxIC8gbGVuO1xuICAgICAgICB4MCAqPSBsZW47XG4gICAgICAgIHgxICo9IGxlbjtcbiAgICAgICAgeDIgKj0gbGVuO1xuICAgIH1cblxuICAgIHkwID0gejEgKiB4MiAtIHoyICogeDE7XG4gICAgeTEgPSB6MiAqIHgwIC0gejAgKiB4MjtcbiAgICB5MiA9IHowICogeDEgLSB6MSAqIHgwO1xuXG4gICAgbGVuID0gTWF0aC5zcXJ0KHkwICogeTAgKyB5MSAqIHkxICsgeTIgKiB5Mik7XG4gICAgaWYgKCFsZW4pIHtcbiAgICAgICAgeTAgPSAwO1xuICAgICAgICB5MSA9IDA7XG4gICAgICAgIHkyID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBsZW4gPSAxIC8gbGVuO1xuICAgICAgICB5MCAqPSBsZW47XG4gICAgICAgIHkxICo9IGxlbjtcbiAgICAgICAgeTIgKj0gbGVuO1xuICAgIH1cblxuICAgIG91dFswXSA9IHgwO1xuICAgIG91dFsxXSA9IHkwO1xuICAgIG91dFsyXSA9IHowO1xuICAgIG91dFszXSA9IDA7XG4gICAgb3V0WzRdID0geDE7XG4gICAgb3V0WzVdID0geTE7XG4gICAgb3V0WzZdID0gejE7XG4gICAgb3V0WzddID0gMDtcbiAgICBvdXRbOF0gPSB4MjtcbiAgICBvdXRbOV0gPSB5MjtcbiAgICBvdXRbMTBdID0gejI7XG4gICAgb3V0WzExXSA9IDA7XG4gICAgb3V0WzEyXSA9IC0oeDAgKiBleWV4ICsgeDEgKiBleWV5ICsgeDIgKiBleWV6KTtcbiAgICBvdXRbMTNdID0gLSh5MCAqIGV5ZXggKyB5MSAqIGV5ZXkgKyB5MiAqIGV5ZXopO1xuICAgIG91dFsxNF0gPSAtKHowICogZXlleCArIHoxICogZXlleSArIHoyICogZXlleik7XG4gICAgb3V0WzE1XSA9IDE7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cblxubWF0NC5tdWwgPSBtYXQ0Lm11bHRpcGx5O1xuXG5tYXQ0LmlkdCA9IG1hdDQuaWRlbnRpdHk7XG5cbi8vVGhpcyBpcyBoYW5keSBmb3IgUG9vbCB1dGlsaXRpZXMsIHRvIFwicmVzZXRcIiBhXG4vL3NoYXJlZCBvYmplY3QgdG8gaXRzIGRlZmF1bHQgc3RhdGVcbm1hdDQucmVzZXQgPSBtYXQ0LmlkdDtcblxubWF0NC50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYSA9IHRoaXMudmFsO1xuICAgIHJldHVybiAnTWF0cml4NCgnICsgYVswXSArICcsICcgKyBhWzFdICsgJywgJyArIGFbMl0gKyAnLCAnICsgYVszXSArICcsICcgK1xuICAgICAgICAgICAgICAgICAgICBhWzRdICsgJywgJyArIGFbNV0gKyAnLCAnICsgYVs2XSArICcsICcgKyBhWzddICsgJywgJyArXG4gICAgICAgICAgICAgICAgICAgIGFbOF0gKyAnLCAnICsgYVs5XSArICcsICcgKyBhWzEwXSArICcsICcgKyBhWzExXSArICcsICcgKyBcbiAgICAgICAgICAgICAgICAgICAgYVsxMl0gKyAnLCAnICsgYVsxM10gKyAnLCAnICsgYVsxNF0gKyAnLCAnICsgYVsxNV0gKyAnKSc7XG59O1xuXG5tYXQ0LnN0ciA9IG1hdDQudG9TdHJpbmc7XG5cbm1vZHVsZS5leHBvcnRzID0gTWF0cml4NDtcbiIsInZhciBWZWN0b3IzID0gcmVxdWlyZSgnLi9WZWN0b3IzJyk7XG52YXIgTWF0cml4MyA9IHJlcXVpcmUoJy4vTWF0cml4MycpO1xudmFyIGNvbW1vbiA9IHJlcXVpcmUoJy4vY29tbW9uJyk7XG5cbi8vc29tZSBzaGFyZWQgJ3ByaXZhdGUnIGFycmF5c1xudmFyIHNfaU5leHQgPSAodHlwZW9mIEludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcgPyBuZXcgSW50OEFycmF5KFsxLDIsMF0pIDogWzEsMiwwXSk7XG52YXIgdG1wID0gKHR5cGVvZiBGbG9hdDMyQXJyYXkgIT09ICd1bmRlZmluZWQnID8gbmV3IEZsb2F0MzJBcnJheShbMCwwLDBdKSA6IFswLDAsMF0pO1xuXG52YXIgeFVuaXRWZWMzID0gbmV3IFZlY3RvcjMoMSwgMCwgMCk7XG52YXIgeVVuaXRWZWMzID0gbmV3IFZlY3RvcjMoMCwgMSwgMCk7XG52YXIgdG1wdmVjID0gbmV3IFZlY3RvcjMoKTtcblxudmFyIHRtcE1hdDMgPSBuZXcgTWF0cml4MygpO1xuXG5mdW5jdGlvbiBRdWF0ZXJuaW9uKHgsIHksIHosIHcpIHtcblx0aWYgKHR5cGVvZiB4ID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgIHRoaXMueCA9IHgueHx8MDtcbiAgICAgICAgdGhpcy55ID0geC55fHwwO1xuICAgICAgICB0aGlzLnogPSB4Lnp8fDA7XG4gICAgICAgIHRoaXMudyA9IHgud3x8MDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnggPSB4fHwwO1xuICAgICAgICB0aGlzLnkgPSB5fHwwO1xuICAgICAgICB0aGlzLnogPSB6fHwwO1xuICAgICAgICB0aGlzLncgPSB3fHwwO1xuICAgIH1cbn1cblxudmFyIHF1YXQgPSBRdWF0ZXJuaW9uLnByb3RvdHlwZTtcblxuLy9taXhpbiBjb21tb24gZnVuY3Rpb25zXG5mb3IgKHZhciBrIGluIGNvbW1vbikge1xuICAgIHF1YXRba10gPSBjb21tb25ba107XG59XG5cbnF1YXQucm90YXRpb25UbyA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICB2YXIgZG90ID0gYS54ICogYi54ICsgYS55ICogYi55ICsgYS56ICogYi56OyAvL2EuZG90KGIpXG4gICAgaWYgKGRvdCA8IC0wLjk5OTk5OSkge1xuICAgICAgICBpZiAodG1wdmVjLmNvcHkoeFVuaXRWZWMzKS5jcm9zcyhhKS5sZW4oKSA8IDAuMDAwMDAxKVxuICAgICAgICAgICAgdG1wdmVjLmNvcHkoeVVuaXRWZWMzKS5jcm9zcyhhKTtcbiAgICAgICAgXG4gICAgICAgIHRtcHZlYy5ub3JtYWxpemUoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0QXhpc0FuZ2xlKHRtcHZlYywgTWF0aC5QSSk7XG4gICAgfSBlbHNlIGlmIChkb3QgPiAwLjk5OTk5OSkge1xuICAgICAgICB0aGlzLnggPSAwO1xuICAgICAgICB0aGlzLnkgPSAwO1xuICAgICAgICB0aGlzLnogPSAwO1xuICAgICAgICB0aGlzLncgPSAxO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9IGVsc2Uge1xuICAgICAgICB0bXB2ZWMuY29weShhKS5jcm9zcyhiKTtcbiAgICAgICAgdGhpcy54ID0gdG1wdmVjLng7XG4gICAgICAgIHRoaXMueSA9IHRtcHZlYy55O1xuICAgICAgICB0aGlzLnogPSB0bXB2ZWMuejtcbiAgICAgICAgdGhpcy53ID0gMSArIGRvdDtcbiAgICAgICAgcmV0dXJuIHRoaXMubm9ybWFsaXplKCk7XG4gICAgfVxufTtcblxucXVhdC5zZXRBeGVzID0gZnVuY3Rpb24odmlldywgcmlnaHQsIHVwKSB7XG4gICAgdmFyIG0gPSB0bXBNYXQzLnZhbDtcbiAgICBtWzBdID0gcmlnaHQueDtcbiAgICBtWzNdID0gcmlnaHQueTtcbiAgICBtWzZdID0gcmlnaHQuejtcblxuICAgIG1bMV0gPSB1cC54O1xuICAgIG1bNF0gPSB1cC55O1xuICAgIG1bN10gPSB1cC56O1xuXG4gICAgbVsyXSA9IC12aWV3Lng7XG4gICAgbVs1XSA9IC12aWV3Lnk7XG4gICAgbVs4XSA9IC12aWV3Lno7XG5cbiAgICByZXR1cm4gdGhpcy5mcm9tTWF0Myh0bXBNYXQzKS5ub3JtYWxpemUoKTtcbn07XG5cbnF1YXQuaWRlbnRpdHkgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnggPSB0aGlzLnkgPSB0aGlzLnogPSAwO1xuICAgIHRoaXMudyA9IDE7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5xdWF0LnNldEF4aXNBbmdsZSA9IGZ1bmN0aW9uKGF4aXMsIHJhZCkge1xuICAgIHJhZCA9IHJhZCAqIDAuNTtcbiAgICB2YXIgcyA9IE1hdGguc2luKHJhZCk7XG4gICAgdGhpcy54ID0gcyAqIGF4aXMueDtcbiAgICB0aGlzLnkgPSBzICogYXhpcy55O1xuICAgIHRoaXMueiA9IHMgKiBheGlzLno7XG4gICAgdGhpcy53ID0gTWF0aC5jb3MocmFkKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnF1YXQubXVsdGlwbHkgPSBmdW5jdGlvbihiKSB7XG4gICAgdmFyIGF4ID0gdGhpcy54LCBheSA9IHRoaXMueSwgYXogPSB0aGlzLnosIGF3ID0gdGhpcy53LFxuICAgICAgICBieCA9IGIueCwgYnkgPSBiLnksIGJ6ID0gYi56LCBidyA9IGIudztcblxuICAgIHRoaXMueCA9IGF4ICogYncgKyBhdyAqIGJ4ICsgYXkgKiBieiAtIGF6ICogYnk7XG4gICAgdGhpcy55ID0gYXkgKiBidyArIGF3ICogYnkgKyBheiAqIGJ4IC0gYXggKiBiejtcbiAgICB0aGlzLnogPSBheiAqIGJ3ICsgYXcgKiBieiArIGF4ICogYnkgLSBheSAqIGJ4O1xuICAgIHRoaXMudyA9IGF3ICogYncgLSBheCAqIGJ4IC0gYXkgKiBieSAtIGF6ICogYno7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5xdWF0LnNsZXJwID0gZnVuY3Rpb24gKGIsIHQpIHtcbiAgICAvLyBiZW5jaG1hcmtzOlxuICAgIC8vICAgIGh0dHA6Ly9qc3BlcmYuY29tL3F1YXRlcm5pb24tc2xlcnAtaW1wbGVtZW50YXRpb25zXG5cbiAgICB2YXIgYXggPSB0aGlzLngsIGF5ID0gdGhpcy55LCBheiA9IHRoaXMueSwgYXcgPSB0aGlzLnksXG4gICAgICAgIGJ4ID0gYi54LCBieSA9IGIueSwgYnogPSBiLnosIGJ3ID0gYi53O1xuXG4gICAgdmFyICAgICAgICBvbWVnYSwgY29zb20sIHNpbm9tLCBzY2FsZTAsIHNjYWxlMTtcblxuICAgIC8vIGNhbGMgY29zaW5lXG4gICAgY29zb20gPSBheCAqIGJ4ICsgYXkgKiBieSArIGF6ICogYnogKyBhdyAqIGJ3O1xuICAgIC8vIGFkanVzdCBzaWducyAoaWYgbmVjZXNzYXJ5KVxuICAgIGlmICggY29zb20gPCAwLjAgKSB7XG4gICAgICAgIGNvc29tID0gLWNvc29tO1xuICAgICAgICBieCA9IC0gYng7XG4gICAgICAgIGJ5ID0gLSBieTtcbiAgICAgICAgYnogPSAtIGJ6O1xuICAgICAgICBidyA9IC0gYnc7XG4gICAgfVxuICAgIC8vIGNhbGN1bGF0ZSBjb2VmZmljaWVudHNcbiAgICBpZiAoICgxLjAgLSBjb3NvbSkgPiAwLjAwMDAwMSApIHtcbiAgICAgICAgLy8gc3RhbmRhcmQgY2FzZSAoc2xlcnApXG4gICAgICAgIG9tZWdhICA9IE1hdGguYWNvcyhjb3NvbSk7XG4gICAgICAgIHNpbm9tICA9IE1hdGguc2luKG9tZWdhKTtcbiAgICAgICAgc2NhbGUwID0gTWF0aC5zaW4oKDEuMCAtIHQpICogb21lZ2EpIC8gc2lub207XG4gICAgICAgIHNjYWxlMSA9IE1hdGguc2luKHQgKiBvbWVnYSkgLyBzaW5vbTtcbiAgICB9IGVsc2UgeyAgICAgICAgXG4gICAgICAgIC8vIFwiZnJvbVwiIGFuZCBcInRvXCIgcXVhdGVybmlvbnMgYXJlIHZlcnkgY2xvc2UgXG4gICAgICAgIC8vICAuLi4gc28gd2UgY2FuIGRvIGEgbGluZWFyIGludGVycG9sYXRpb25cbiAgICAgICAgc2NhbGUwID0gMS4wIC0gdDtcbiAgICAgICAgc2NhbGUxID0gdDtcbiAgICB9XG4gICAgLy8gY2FsY3VsYXRlIGZpbmFsIHZhbHVlc1xuICAgIHRoaXMueCA9IHNjYWxlMCAqIGF4ICsgc2NhbGUxICogYng7XG4gICAgdGhpcy55ID0gc2NhbGUwICogYXkgKyBzY2FsZTEgKiBieTtcbiAgICB0aGlzLnogPSBzY2FsZTAgKiBheiArIHNjYWxlMSAqIGJ6O1xuICAgIHRoaXMudyA9IHNjYWxlMCAqIGF3ICsgc2NhbGUxICogYnc7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5xdWF0LmludmVydCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhMCA9IHRoaXMueCwgYTEgPSB0aGlzLnksIGEyID0gdGhpcy56LCBhMyA9IHRoaXMudyxcbiAgICAgICAgZG90ID0gYTAqYTAgKyBhMSphMSArIGEyKmEyICsgYTMqYTMsXG4gICAgICAgIGludkRvdCA9IGRvdCA/IDEuMC9kb3QgOiAwO1xuICAgIFxuICAgIC8vIFRPRE86IFdvdWxkIGJlIGZhc3RlciB0byByZXR1cm4gWzAsMCwwLDBdIGltbWVkaWF0ZWx5IGlmIGRvdCA9PSAwXG5cbiAgICB0aGlzLnggPSAtYTAqaW52RG90O1xuICAgIHRoaXMueSA9IC1hMSppbnZEb3Q7XG4gICAgdGhpcy56ID0gLWEyKmludkRvdDtcbiAgICB0aGlzLncgPSBhMyppbnZEb3Q7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5xdWF0LmNvbmp1Z2F0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMueCA9IC10aGlzLng7XG4gICAgdGhpcy55ID0gLXRoaXMueTtcbiAgICB0aGlzLnogPSAtdGhpcy56O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxucXVhdC5yb3RhdGVYID0gZnVuY3Rpb24gKHJhZCkge1xuICAgIHJhZCAqPSAwLjU7IFxuXG4gICAgdmFyIGF4ID0gdGhpcy54LCBheSA9IHRoaXMueSwgYXogPSB0aGlzLnosIGF3ID0gdGhpcy53LFxuICAgICAgICBieCA9IE1hdGguc2luKHJhZCksIGJ3ID0gTWF0aC5jb3MocmFkKTtcblxuICAgIHRoaXMueCA9IGF4ICogYncgKyBhdyAqIGJ4O1xuICAgIHRoaXMueSA9IGF5ICogYncgKyBheiAqIGJ4O1xuICAgIHRoaXMueiA9IGF6ICogYncgLSBheSAqIGJ4O1xuICAgIHRoaXMudyA9IGF3ICogYncgLSBheCAqIGJ4O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxucXVhdC5yb3RhdGVZID0gZnVuY3Rpb24gKHJhZCkge1xuICAgIHJhZCAqPSAwLjU7IFxuXG4gICAgdmFyIGF4ID0gdGhpcy54LCBheSA9IHRoaXMueSwgYXogPSB0aGlzLnosIGF3ID0gdGhpcy53LFxuICAgICAgICBieSA9IE1hdGguc2luKHJhZCksIGJ3ID0gTWF0aC5jb3MocmFkKTtcblxuICAgIHRoaXMueCA9IGF4ICogYncgLSBheiAqIGJ5O1xuICAgIHRoaXMueSA9IGF5ICogYncgKyBhdyAqIGJ5O1xuICAgIHRoaXMueiA9IGF6ICogYncgKyBheCAqIGJ5O1xuICAgIHRoaXMudyA9IGF3ICogYncgLSBheSAqIGJ5O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxucXVhdC5yb3RhdGVaID0gZnVuY3Rpb24gKHJhZCkge1xuICAgIHJhZCAqPSAwLjU7IFxuXG4gICAgdmFyIGF4ID0gdGhpcy54LCBheSA9IHRoaXMueSwgYXogPSB0aGlzLnosIGF3ID0gdGhpcy53LFxuICAgICAgICBieiA9IE1hdGguc2luKHJhZCksIGJ3ID0gTWF0aC5jb3MocmFkKTtcblxuICAgIHRoaXMueCA9IGF4ICogYncgKyBheSAqIGJ6O1xuICAgIHRoaXMueSA9IGF5ICogYncgLSBheCAqIGJ6O1xuICAgIHRoaXMueiA9IGF6ICogYncgKyBhdyAqIGJ6O1xuICAgIHRoaXMudyA9IGF3ICogYncgLSBheiAqIGJ6O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxucXVhdC5jYWxjdWxhdGVXID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB4ID0gdGhpcy54LCB5ID0gdGhpcy55LCB6ID0gdGhpcy56O1xuXG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICAgIHRoaXMueiA9IHo7XG4gICAgdGhpcy53ID0gLU1hdGguc3FydChNYXRoLmFicygxLjAgLSB4ICogeCAtIHkgKiB5IC0geiAqIHopKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnF1YXQuZnJvbU1hdDMgPSBmdW5jdGlvbihtYXQpIHtcbiAgICAvLyBiZW5jaG1hcmtzOlxuICAgIC8vICAgIGh0dHA6Ly9qc3BlcmYuY29tL3R5cGVkLWFycmF5LWFjY2Vzcy1zcGVlZFxuICAgIC8vICAgIGh0dHA6Ly9qc3BlcmYuY29tL2NvbnZlcnNpb24tb2YtM3gzLW1hdHJpeC10by1xdWF0ZXJuaW9uXG5cbiAgICAvLyBBbGdvcml0aG0gaW4gS2VuIFNob2VtYWtlJ3MgYXJ0aWNsZSBpbiAxOTg3IFNJR0dSQVBIIGNvdXJzZSBub3Rlc1xuICAgIC8vIGFydGljbGUgXCJRdWF0ZXJuaW9uIENhbGN1bHVzIGFuZCBGYXN0IEFuaW1hdGlvblwiLlxuICAgIHZhciBtID0gbWF0LnZhbCxcbiAgICAgICAgZlRyYWNlID0gbVswXSArIG1bNF0gKyBtWzhdO1xuICAgIHZhciBmUm9vdDtcblxuICAgIGlmICggZlRyYWNlID4gMC4wICkge1xuICAgICAgICAvLyB8d3wgPiAxLzIsIG1heSBhcyB3ZWxsIGNob29zZSB3ID4gMS8yXG4gICAgICAgIGZSb290ID0gTWF0aC5zcXJ0KGZUcmFjZSArIDEuMCk7ICAvLyAyd1xuICAgICAgICB0aGlzLncgPSAwLjUgKiBmUm9vdDtcbiAgICAgICAgZlJvb3QgPSAwLjUvZlJvb3Q7ICAvLyAxLyg0dylcbiAgICAgICAgdGhpcy54ID0gKG1bN10tbVs1XSkqZlJvb3Q7XG4gICAgICAgIHRoaXMueSA9IChtWzJdLW1bNl0pKmZSb290O1xuICAgICAgICB0aGlzLnogPSAobVszXS1tWzFdKSpmUm9vdDtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyB8d3wgPD0gMS8yXG4gICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgaWYgKCBtWzRdID4gbVswXSApXG4gICAgICAgICAgaSA9IDE7XG4gICAgICAgIGlmICggbVs4XSA+IG1baSozK2ldIClcbiAgICAgICAgICBpID0gMjtcbiAgICAgICAgdmFyIGogPSBzX2lOZXh0W2ldO1xuICAgICAgICB2YXIgayA9IHNfaU5leHRbal07XG4gICAgICAgICAgICBcbiAgICAgICAgLy9UaGlzIGlzbid0IHF1aXRlIGFzIGNsZWFuIHdpdGhvdXQgYXJyYXkgYWNjZXNzLi4uXG4gICAgICAgIGZSb290ID0gTWF0aC5zcXJ0KG1baSozK2ldLW1baiozK2pdLW1bayozK2tdICsgMS4wKTtcbiAgICAgICAgdG1wW2ldID0gMC41ICogZlJvb3Q7XG5cbiAgICAgICAgZlJvb3QgPSAwLjUgLyBmUm9vdDtcbiAgICAgICAgdG1wW2pdID0gKG1baiozK2ldICsgbVtpKjMral0pICogZlJvb3Q7XG4gICAgICAgIHRtcFtrXSA9IChtW2sqMytpXSArIG1baSozK2tdKSAqIGZSb290O1xuXG4gICAgICAgIHRoaXMueCA9IHRtcFswXTtcbiAgICAgICAgdGhpcy55ID0gdG1wWzFdO1xuICAgICAgICB0aGlzLnogPSB0bXBbMl07XG4gICAgICAgIHRoaXMudyA9IChtW2sqMytqXSAtIG1baiozK2tdKSAqIGZSb290O1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnF1YXQuaWR0ID0gcXVhdC5pZGVudGl0eTtcblxucXVhdC5zdWIgPSBxdWF0LnN1YnRyYWN0O1xuXG5xdWF0Lm11bCA9IHF1YXQubXVsdGlwbHk7XG5cbnF1YXQubGVuID0gcXVhdC5sZW5ndGg7XG5cbnF1YXQubGVuU3EgPSBxdWF0Lmxlbmd0aFNxO1xuXG4vL1RoaXMgaXMgaGFuZHkgZm9yIFBvb2wgdXRpbGl0aWVzLCB0byBcInJlc2V0XCIgYVxuLy9zaGFyZWQgb2JqZWN0IHRvIGl0cyBkZWZhdWx0IHN0YXRlXG5xdWF0LnJlc2V0ID0gcXVhdC5pZHQ7XG5cblxucXVhdC50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAnUXVhdGVybmlvbignICsgdGhpcy54ICsgJywgJyArIHRoaXMueSArICcsICcgKyB0aGlzLnogKyAnLCAnICsgdGhpcy53ICsgJyknO1xufTtcblxucXVhdC5zdHIgPSBxdWF0LnRvU3RyaW5nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFF1YXRlcm5pb247IiwiZnVuY3Rpb24gVmVjdG9yMih4LCB5KSB7XG5cdGlmICh0eXBlb2YgeCA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICB0aGlzLnggPSB4Lnh8fDA7XG4gICAgICAgIHRoaXMueSA9IHgueXx8MDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnggPSB4fHwwO1xuICAgICAgICB0aGlzLnkgPSB5fHwwO1xuICAgIH1cbn1cblxuLy9zaG9ydGhhbmQgaXQgZm9yIGJldHRlciBtaW5pZmljYXRpb25cbnZhciB2ZWMyID0gVmVjdG9yMi5wcm90b3R5cGU7XG5cbi8qKlxuICogUmV0dXJucyBhIG5ldyBpbnN0YW5jZSBvZiBWZWN0b3IyIHdpdGhcbiAqIHRoaXMgdmVjdG9yJ3MgY29tcG9uZW50cy4gXG4gKiBAcmV0dXJuIHtWZWN0b3IyfSBhIGNsb25lIG9mIHRoaXMgdmVjdG9yXG4gKi9cbnZlYzIuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFZlY3RvcjIodGhpcy54LCB0aGlzLnkpO1xufTtcblxuLyoqXG4gKiBDb3BpZXMgdGhlIHgsIHkgY29tcG9uZW50cyBmcm9tIHRoZSBzcGVjaWZpZWRcbiAqIFZlY3Rvci4gQW55IHVuZGVmaW5lZCBjb21wb25lbnRzIGZyb20gYG90aGVyVmVjYFxuICogd2lsbCBkZWZhdWx0IHRvIHplcm8uXG4gKiBcbiAqIEBwYXJhbSAge290aGVyVmVjfSB0aGUgb3RoZXIgVmVjdG9yMiB0byBjb3B5XG4gKiBAcmV0dXJuIHtWZWN0b3IyfSAgdGhpcywgZm9yIGNoYWluaW5nXG4gKi9cbnZlYzIuY29weSA9IGZ1bmN0aW9uKG90aGVyVmVjKSB7XG4gICAgdGhpcy54ID0gb3RoZXJWZWMueHx8MDtcbiAgICB0aGlzLnkgPSBvdGhlclZlYy55fHwwO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBIGNvbnZlbmllbmNlIGZ1bmN0aW9uIHRvIHNldCB0aGUgY29tcG9uZW50cyBvZlxuICogdGhpcyB2ZWN0b3IgYXMgeCBhbmQgeS4gRmFsc3kgb3IgdW5kZWZpbmVkXG4gKiBwYXJhbWV0ZXJzIHdpbGwgZGVmYXVsdCB0byB6ZXJvLlxuICpcbiAqIFlvdSBjYW4gYWxzbyBwYXNzIGEgdmVjdG9yIG9iamVjdCBpbnN0ZWFkIG9mXG4gKiBpbmRpdmlkdWFsIGNvbXBvbmVudHMsIHRvIGNvcHkgdGhlIG9iamVjdCdzIGNvbXBvbmVudHMuXG4gKiBcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IHRoZSB4IGNvbXBvbmVudFxuICogQHBhcmFtIHtOdW1iZXJ9IHkgdGhlIHkgY29tcG9uZW50XG4gKiBAcmV0dXJuIHtWZWN0b3IyfSAgdGhpcywgZm9yIGNoYWluaW5nXG4gKi9cbnZlYzIuc2V0ID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIGlmICh0eXBlb2YgeCA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICB0aGlzLnggPSB4Lnh8fDA7XG4gICAgICAgIHRoaXMueSA9IHgueXx8MDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnggPSB4fHwwO1xuICAgICAgICB0aGlzLnkgPSB5fHwwO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzIuYWRkID0gZnVuY3Rpb24odikge1xuICAgIHRoaXMueCArPSB2Lng7XG4gICAgdGhpcy55ICs9IHYueTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzIuc3VidHJhY3QgPSBmdW5jdGlvbih2KSB7XG4gICAgdGhpcy54IC09IHYueDtcbiAgICB0aGlzLnkgLT0gdi55O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMi5tdWx0aXBseSA9IGZ1bmN0aW9uKHYpIHtcbiAgICB0aGlzLnggKj0gdi54O1xuICAgIHRoaXMueSAqPSB2Lnk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMyLnNjYWxlID0gZnVuY3Rpb24ocykge1xuICAgIHRoaXMueCAqPSBzO1xuICAgIHRoaXMueSAqPSBzO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMi5kaXZpZGUgPSBmdW5jdGlvbih2KSB7XG4gICAgdGhpcy54IC89IHYueDtcbiAgICB0aGlzLnkgLz0gdi55O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMi5uZWdhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnggPSAtdGhpcy54O1xuICAgIHRoaXMueSA9IC10aGlzLnk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMyLmRpc3RhbmNlID0gZnVuY3Rpb24odikge1xuICAgIHZhciBkeCA9IHYueCAtIHRoaXMueCxcbiAgICAgICAgZHkgPSB2LnkgLSB0aGlzLnk7XG4gICAgcmV0dXJuIE1hdGguc3FydChkeCpkeCArIGR5KmR5KTtcbn07XG5cbnZlYzIuZGlzdGFuY2VTcSA9IGZ1bmN0aW9uKHYpIHtcbiAgICB2YXIgZHggPSB2LnggLSB0aGlzLngsXG4gICAgICAgIGR5ID0gdi55IC0gdGhpcy55O1xuICAgIHJldHVybiBkeCpkeCArIGR5KmR5O1xufTtcblxudmVjMi5sZW5ndGggPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgeCA9IHRoaXMueCxcbiAgICAgICAgeSA9IHRoaXMueTtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KHgqeCArIHkqeSk7XG59O1xuXG52ZWMyLmxlbmd0aFNxID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHggPSB0aGlzLngsXG4gICAgICAgIHkgPSB0aGlzLnk7XG4gICAgcmV0dXJuIHgqeCArIHkqeTtcbn07XG5cbnZlYzIubm9ybWFsaXplID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHggPSB0aGlzLngsXG4gICAgICAgIHkgPSB0aGlzLnk7XG4gICAgdmFyIGxlbiA9IHgqeCArIHkqeTtcbiAgICBpZiAobGVuID4gMCkge1xuICAgICAgICBsZW4gPSAxIC8gTWF0aC5zcXJ0KGxlbik7XG4gICAgICAgIHRoaXMueCA9IHgqbGVuO1xuICAgICAgICB0aGlzLnkgPSB5KmxlbjtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMyLmRvdCA9IGZ1bmN0aW9uKHYpIHtcbiAgICByZXR1cm4gdGhpcy54ICogdi54ICsgdGhpcy55ICogdi55O1xufTtcblxuLy9Vbmxpa2UgVmVjdG9yMywgdGhpcyByZXR1cm5zIGEgc2NhbGFyXG4vL2h0dHA6Ly9hbGxlbmNob3UubmV0LzIwMTMvMDcvY3Jvc3MtcHJvZHVjdC1vZi0yZC12ZWN0b3JzL1xudmVjMi5jcm9zcyA9IGZ1bmN0aW9uKHYpIHtcbiAgICByZXR1cm4gdGhpcy54ICogdi55IC0gdGhpcy55ICogdi54O1xufTtcblxudmVjMi5sZXJwID0gZnVuY3Rpb24odiwgdCkge1xuICAgIHZhciBheCA9IHRoaXMueCxcbiAgICAgICAgYXkgPSB0aGlzLnk7XG4gICAgdCA9IHR8fDA7XG4gICAgdGhpcy54ID0gYXggKyB0ICogKHYueCAtIGF4KTtcbiAgICB0aGlzLnkgPSBheSArIHQgKiAodi55IC0gYXkpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMi50cmFuc2Zvcm1NYXQzID0gZnVuY3Rpb24obWF0KSB7XG4gICAgdmFyIHggPSB0aGlzLngsIHkgPSB0aGlzLnksIG0gPSBtYXQudmFsO1xuICAgIHRoaXMueCA9IG1bMF0gKiB4ICsgbVsyXSAqIHkgKyBtWzRdO1xuICAgIHRoaXMueSA9IG1bMV0gKiB4ICsgbVszXSAqIHkgKyBtWzVdO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMi50cmFuc2Zvcm1NYXQ0ID0gZnVuY3Rpb24obWF0KSB7XG4gICAgdmFyIHggPSB0aGlzLngsIFxuICAgICAgICB5ID0gdGhpcy55LFxuICAgICAgICBtID0gbWF0LnZhbDtcbiAgICB0aGlzLnggPSBtWzBdICogeCArIG1bNF0gKiB5ICsgbVsxMl07XG4gICAgdGhpcy55ID0gbVsxXSAqIHggKyBtWzVdICogeSArIG1bMTNdO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMi5yZXNldCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMueCA9IDA7XG4gICAgdGhpcy55ID0gMDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzIuc3ViID0gdmVjMi5zdWJ0cmFjdDtcblxudmVjMi5tdWwgPSB2ZWMyLm11bHRpcGx5O1xuXG52ZWMyLmRpdiA9IHZlYzIuZGl2aWRlO1xuXG52ZWMyLmRpc3QgPSB2ZWMyLmRpc3RhbmNlO1xuXG52ZWMyLmRpc3RTcSA9IHZlYzIuZGlzdGFuY2VTcTtcblxudmVjMi5sZW4gPSB2ZWMyLmxlbmd0aDtcblxudmVjMi5sZW5TcSA9IHZlYzIubGVuZ3RoU3E7XG5cbnZlYzIudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJ1ZlY3RvcjIoJyArIHRoaXMueCArICcsICcgKyB0aGlzLnkgKyAnKSc7XG59O1xuXG52ZWMyLnJhbmRvbSA9IGZ1bmN0aW9uKHNjYWxlKSB7XG4gICAgc2NhbGUgPSBzY2FsZSB8fCAxLjA7XG4gICAgdmFyIHIgPSBNYXRoLnJhbmRvbSgpICogMi4wICogTWF0aC5QSTtcbiAgICB0aGlzLnggPSBNYXRoLmNvcyhyKSAqIHNjYWxlO1xuICAgIHRoaXMueSA9IE1hdGguc2luKHIpICogc2NhbGU7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMyLnN0ciA9IHZlYzIudG9TdHJpbmc7XG5cbm1vZHVsZS5leHBvcnRzID0gVmVjdG9yMjsiLCJmdW5jdGlvbiBWZWN0b3IzKHgsIHksIHopIHtcbiAgICBpZiAodHlwZW9mIHggPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgdGhpcy54ID0geC54fHwwO1xuICAgICAgICB0aGlzLnkgPSB4Lnl8fDA7XG4gICAgICAgIHRoaXMueiA9IHguenx8MDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnggPSB4fHwwO1xuICAgICAgICB0aGlzLnkgPSB5fHwwO1xuICAgICAgICB0aGlzLnogPSB6fHwwO1xuICAgIH1cbn1cblxuLy9zaG9ydGhhbmQgaXQgZm9yIGJldHRlciBtaW5pZmljYXRpb25cbnZhciB2ZWMzID0gVmVjdG9yMy5wcm90b3R5cGU7XG5cbnZlYzMuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFZlY3RvcjModGhpcy54LCB0aGlzLnksIHRoaXMueik7XG59O1xuXG52ZWMzLmNvcHkgPSBmdW5jdGlvbihvdGhlclZlYykge1xuICAgIHRoaXMueCA9IG90aGVyVmVjLng7XG4gICAgdGhpcy55ID0gb3RoZXJWZWMueTtcbiAgICB0aGlzLnogPSBvdGhlclZlYy56O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMy5zZXQgPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgaWYgKHR5cGVvZiB4ID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgIHRoaXMueCA9IHgueHx8MDtcbiAgICAgICAgdGhpcy55ID0geC55fHwwO1xuICAgICAgICB0aGlzLnogPSB4Lnp8fDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy54ID0geHx8MDtcbiAgICAgICAgdGhpcy55ID0geXx8MDtcbiAgICAgICAgdGhpcy56ID0genx8MDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMzLmFkZCA9IGZ1bmN0aW9uKHYpIHtcbiAgICB0aGlzLnggKz0gdi54O1xuICAgIHRoaXMueSArPSB2Lnk7XG4gICAgdGhpcy56ICs9IHYuejtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzMuc3VidHJhY3QgPSBmdW5jdGlvbih2KSB7XG4gICAgdGhpcy54IC09IHYueDtcbiAgICB0aGlzLnkgLT0gdi55O1xuICAgIHRoaXMueiAtPSB2Lno7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMzLm11bHRpcGx5ID0gZnVuY3Rpb24odikge1xuICAgIHRoaXMueCAqPSB2Lng7XG4gICAgdGhpcy55ICo9IHYueTtcbiAgICB0aGlzLnogKj0gdi56O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMy5zY2FsZSA9IGZ1bmN0aW9uKHMpIHtcbiAgICB0aGlzLnggKj0gcztcbiAgICB0aGlzLnkgKj0gcztcbiAgICB0aGlzLnogKj0gcztcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzMuZGl2aWRlID0gZnVuY3Rpb24odikge1xuICAgIHRoaXMueCAvPSB2Lng7XG4gICAgdGhpcy55IC89IHYueTtcbiAgICB0aGlzLnogLz0gdi56O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMy5uZWdhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnggPSAtdGhpcy54O1xuICAgIHRoaXMueSA9IC10aGlzLnk7XG4gICAgdGhpcy56ID0gLXRoaXMuejtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzMuZGlzdGFuY2UgPSBmdW5jdGlvbih2KSB7XG4gICAgdmFyIGR4ID0gdi54IC0gdGhpcy54LFxuICAgICAgICBkeSA9IHYueSAtIHRoaXMueSxcbiAgICAgICAgZHogPSB2LnogLSB0aGlzLno7XG4gICAgcmV0dXJuIE1hdGguc3FydChkeCpkeCArIGR5KmR5ICsgZHoqZHopO1xufTtcblxudmVjMy5kaXN0YW5jZVNxID0gZnVuY3Rpb24odikge1xuICAgIHZhciBkeCA9IHYueCAtIHRoaXMueCxcbiAgICAgICAgZHkgPSB2LnkgLSB0aGlzLnksXG4gICAgICAgIGR6ID0gdi56IC0gdGhpcy56O1xuICAgIHJldHVybiBkeCpkeCArIGR5KmR5ICsgZHoqZHo7XG59O1xuXG52ZWMzLmxlbmd0aCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB4ID0gdGhpcy54LFxuICAgICAgICB5ID0gdGhpcy55LFxuICAgICAgICB6ID0gdGhpcy56O1xuICAgIHJldHVybiBNYXRoLnNxcnQoeCp4ICsgeSp5ICsgeip6KTtcbn07XG5cbnZlYzMubGVuZ3RoU3EgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgeCA9IHRoaXMueCxcbiAgICAgICAgeSA9IHRoaXMueSxcbiAgICAgICAgeiA9IHRoaXMuejtcbiAgICByZXR1cm4geCp4ICsgeSp5ICsgeip6O1xufTtcblxudmVjMy5ub3JtYWxpemUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgeCA9IHRoaXMueCxcbiAgICAgICAgeSA9IHRoaXMueSxcbiAgICAgICAgeiA9IHRoaXMuejtcbiAgICB2YXIgbGVuID0geCp4ICsgeSp5ICsgeip6O1xuICAgIGlmIChsZW4gPiAwKSB7XG4gICAgICAgIGxlbiA9IDEgLyBNYXRoLnNxcnQobGVuKTtcbiAgICAgICAgdGhpcy54ID0geCpsZW47XG4gICAgICAgIHRoaXMueSA9IHkqbGVuO1xuICAgICAgICB0aGlzLnogPSB6KmxlbjtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMzLmRvdCA9IGZ1bmN0aW9uKHYpIHtcbiAgICByZXR1cm4gdGhpcy54ICogdi54ICsgdGhpcy55ICogdi55ICsgdGhpcy56ICogdi56O1xufTtcblxudmVjMy5jcm9zcyA9IGZ1bmN0aW9uKHYpIHtcbiAgICB2YXIgYXggPSB0aGlzLngsIGF5ID0gdGhpcy55LCBheiA9IHRoaXMueixcbiAgICAgICAgYnggPSB2LngsIGJ5ID0gdi55LCBieiA9IHYuejtcblxuICAgIHRoaXMueCA9IGF5ICogYnogLSBheiAqIGJ5O1xuICAgIHRoaXMueSA9IGF6ICogYnggLSBheCAqIGJ6O1xuICAgIHRoaXMueiA9IGF4ICogYnkgLSBheSAqIGJ4O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMy5sZXJwID0gZnVuY3Rpb24odiwgdCkge1xuICAgIHZhciBheCA9IHRoaXMueCxcbiAgICAgICAgYXkgPSB0aGlzLnksXG4gICAgICAgIGF6ID0gdGhpcy56O1xuICAgIHQgPSB0fHwwO1xuICAgIHRoaXMueCA9IGF4ICsgdCAqICh2LnggLSBheCk7XG4gICAgdGhpcy55ID0gYXkgKyB0ICogKHYueSAtIGF5KTtcbiAgICB0aGlzLnogPSBheiArIHQgKiAodi56IC0gYXopO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMy50cmFuc2Zvcm1NYXQ0ID0gZnVuY3Rpb24obWF0KSB7XG4gICAgdmFyIHggPSB0aGlzLngsIHkgPSB0aGlzLnksIHogPSB0aGlzLnosIG0gPSBtYXQudmFsO1xuICAgIHRoaXMueCA9IG1bMF0gKiB4ICsgbVs0XSAqIHkgKyBtWzhdICogeiArIG1bMTJdO1xuICAgIHRoaXMueSA9IG1bMV0gKiB4ICsgbVs1XSAqIHkgKyBtWzldICogeiArIG1bMTNdO1xuICAgIHRoaXMueiA9IG1bMl0gKiB4ICsgbVs2XSAqIHkgKyBtWzEwXSAqIHogKyBtWzE0XTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzMudHJhbnNmb3JtTWF0MyA9IGZ1bmN0aW9uKG1hdCkge1xuICAgIHZhciB4ID0gdGhpcy54LCB5ID0gdGhpcy55LCB6ID0gdGhpcy56LCBtID0gbWF0LnZhbDtcbiAgICB0aGlzLnggPSB4ICogbVswXSArIHkgKiBtWzNdICsgeiAqIG1bNl07XG4gICAgdGhpcy55ID0geCAqIG1bMV0gKyB5ICogbVs0XSArIHogKiBtWzddO1xuICAgIHRoaXMueiA9IHggKiBtWzJdICsgeSAqIG1bNV0gKyB6ICogbVs4XTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzMudHJhbnNmb3JtUXVhdCA9IGZ1bmN0aW9uKHEpIHtcbiAgICAvLyBiZW5jaG1hcmtzOiBodHRwOi8vanNwZXJmLmNvbS9xdWF0ZXJuaW9uLXRyYW5zZm9ybS12ZWMzLWltcGxlbWVudGF0aW9uc1xuICAgIHZhciB4ID0gdGhpcy54LCB5ID0gdGhpcy55LCB6ID0gdGhpcy56LFxuICAgICAgICBxeCA9IHEueCwgcXkgPSBxLnksIHF6ID0gcS56LCBxdyA9IHEudyxcblxuICAgICAgICAvLyBjYWxjdWxhdGUgcXVhdCAqIHZlY1xuICAgICAgICBpeCA9IHF3ICogeCArIHF5ICogeiAtIHF6ICogeSxcbiAgICAgICAgaXkgPSBxdyAqIHkgKyBxeiAqIHggLSBxeCAqIHosXG4gICAgICAgIGl6ID0gcXcgKiB6ICsgcXggKiB5IC0gcXkgKiB4LFxuICAgICAgICBpdyA9IC1xeCAqIHggLSBxeSAqIHkgLSBxeiAqIHo7XG5cbiAgICAvLyBjYWxjdWxhdGUgcmVzdWx0ICogaW52ZXJzZSBxdWF0XG4gICAgdGhpcy54ID0gaXggKiBxdyArIGl3ICogLXF4ICsgaXkgKiAtcXogLSBpeiAqIC1xeTtcbiAgICB0aGlzLnkgPSBpeSAqIHF3ICsgaXcgKiAtcXkgKyBpeiAqIC1xeCAtIGl4ICogLXF6O1xuICAgIHRoaXMueiA9IGl6ICogcXcgKyBpdyAqIC1xeiArIGl4ICogLXF5IC0gaXkgKiAtcXg7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIE11bHRpcGxpZXMgdGhpcyBWZWN0b3IzIGJ5IHRoZSBzcGVjaWZpZWQgbWF0cml4LCBcbiAqIGFwcGx5aW5nIGEgVyBkaXZpZGUuIFRoaXMgaXMgdXNlZnVsIGZvciBwcm9qZWN0aW9uLFxuICogZS5nLiB1bnByb2plY3RpbmcgYSAyRCBwb2ludCBpbnRvIDNEIHNwYWNlLlxuICpcbiAqIEBtZXRob2QgIHByalxuICogQHBhcmFtIHtNYXRyaXg0fSB0aGUgNHg0IG1hdHJpeCB0byBtdWx0aXBseSB3aXRoIFxuICogQHJldHVybiB7VmVjdG9yM30gdGhpcyBvYmplY3QgZm9yIGNoYWluaW5nXG4gKi9cbnZlYzMucHJvamVjdCA9IGZ1bmN0aW9uKG1hdCkge1xuICAgIHZhciB4ID0gdGhpcy54LFxuICAgICAgICB5ID0gdGhpcy55LFxuICAgICAgICB6ID0gdGhpcy56LFxuICAgICAgICBtID0gbWF0LnZhbCxcbiAgICAgICAgYTAwID0gbVswXSwgYTAxID0gbVsxXSwgYTAyID0gbVsyXSwgYTAzID0gbVszXSxcbiAgICAgICAgYTEwID0gbVs0XSwgYTExID0gbVs1XSwgYTEyID0gbVs2XSwgYTEzID0gbVs3XSxcbiAgICAgICAgYTIwID0gbVs4XSwgYTIxID0gbVs5XSwgYTIyID0gbVsxMF0sIGEyMyA9IG1bMTFdLFxuICAgICAgICBhMzAgPSBtWzEyXSwgYTMxID0gbVsxM10sIGEzMiA9IG1bMTRdLCBhMzMgPSBtWzE1XTtcblxuICAgIHZhciBsX3cgPSAxIC8gKHggKiBhMDMgKyB5ICogYTEzICsgeiAqIGEyMyArIGEzMyk7XG5cbiAgICB0aGlzLnggPSAoeCAqIGEwMCArIHkgKiBhMTAgKyB6ICogYTIwICsgYTMwKSAqIGxfdzsgXG4gICAgdGhpcy55ID0gKHggKiBhMDEgKyB5ICogYTExICsgeiAqIGEyMSArIGEzMSkgKiBsX3c7IFxuICAgIHRoaXMueiA9ICh4ICogYTAyICsgeSAqIGExMiArIHogKiBhMjIgKyBhMzIpICogbF93O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBVbnByb2plY3QgdGhpcyBwb2ludCBmcm9tIDJEIHNwYWNlIHRvIDNEIHNwYWNlLlxuICogVGhlIHBvaW50IHNob3VsZCBoYXZlIGl0cyB4IGFuZCB5IHByb3BlcnRpZXMgc2V0IHRvXG4gKiAyRCBzY3JlZW4gc3BhY2UsIGFuZCB0aGUgeiBlaXRoZXIgYXQgMCAobmVhciBwbGFuZSlcbiAqIG9yIDEgKGZhciBwbGFuZSkuIFRoZSBwcm92aWRlZCBtYXRyaXggaXMgYXNzdW1lZCB0byBhbHJlYWR5XG4gKiBiZSBjb21iaW5lZCwgaS5lLiBwcm9qZWN0aW9uICogdmlldyAqIG1vZGVsLlxuICpcbiAqIEFmdGVyIHRoaXMgb3BlcmF0aW9uLCB0aGlzIHZlY3RvcidzICh4LCB5LCB6KSBjb21wb25lbnRzIHdpbGxcbiAqIHJlcHJlc2VudCB0aGUgdW5wcm9qZWN0ZWQgM0QgY29vcmRpbmF0ZS5cbiAqIFxuICogQHBhcmFtICB7VmVjdG9yNH0gdmlld3BvcnQgICAgICAgICAgc2NyZWVuIHgsIHksIHdpZHRoIGFuZCBoZWlnaHQgaW4gcGl4ZWxzXG4gKiBAcGFyYW0gIHtNYXRyaXg0fSBpbnZQcm9qZWN0aW9uVmlldyBjb21iaW5lZCBwcm9qZWN0aW9uIGFuZCB2aWV3IG1hdHJpeFxuICogQHJldHVybiB7VmVjdG9yM30gICAgICAgICAgICAgICAgICAgdGhpcyBvYmplY3QsIGZvciBjaGFpbmluZ1xuICovXG52ZWMzLnVucHJvamVjdCA9IGZ1bmN0aW9uKHZpZXdwb3J0LCBpbnZQcm9qZWN0aW9uVmlldykge1xuICAgIHZhciB2aWV3WCA9IHZpZXdwb3J0LngsXG4gICAgICAgIHZpZXdZID0gdmlld3BvcnQueSxcbiAgICAgICAgdmlld1dpZHRoID0gdmlld3BvcnQueixcbiAgICAgICAgdmlld0hlaWdodCA9IHZpZXdwb3J0Lnc7XG4gICAgXG4gICAgdmFyIHggPSB0aGlzLngsIFxuICAgICAgICB5ID0gdGhpcy55LFxuICAgICAgICB6ID0gdGhpcy56O1xuXG4gICAgeCA9IHggLSB2aWV3WDtcbiAgICB5ID0gdmlld0hlaWdodCAtIHkgLSAxO1xuICAgIHkgPSB5IC0gdmlld1k7XG5cbiAgICB0aGlzLnggPSAoMiAqIHgpIC8gdmlld1dpZHRoIC0gMTtcbiAgICB0aGlzLnkgPSAoMiAqIHkpIC8gdmlld0hlaWdodCAtIDE7XG4gICAgdGhpcy56ID0gMiAqIHogLSAxO1xuXG4gICAgcmV0dXJuIHRoaXMucHJvamVjdChpbnZQcm9qZWN0aW9uVmlldyk7XG59O1xuXG52ZWMzLnJhbmRvbSA9IGZ1bmN0aW9uKHNjYWxlKSB7XG4gICAgc2NhbGUgPSBzY2FsZSB8fCAxLjA7XG5cbiAgICB2YXIgciA9IE1hdGgucmFuZG9tKCkgKiAyLjAgKiBNYXRoLlBJO1xuICAgIHZhciB6ID0gKE1hdGgucmFuZG9tKCkgKiAyLjApIC0gMS4wO1xuICAgIHZhciB6U2NhbGUgPSBNYXRoLnNxcnQoMS4wLXoqeikgKiBzY2FsZTtcbiAgICBcbiAgICB0aGlzLnggPSBNYXRoLmNvcyhyKSAqIHpTY2FsZTtcbiAgICB0aGlzLnkgPSBNYXRoLnNpbihyKSAqIHpTY2FsZTtcbiAgICB0aGlzLnogPSB6ICogc2NhbGU7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMzLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy54ID0gMDtcbiAgICB0aGlzLnkgPSAwO1xuICAgIHRoaXMueiA9IDA7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbnZlYzMuc3ViID0gdmVjMy5zdWJ0cmFjdDtcblxudmVjMy5tdWwgPSB2ZWMzLm11bHRpcGx5O1xuXG52ZWMzLmRpdiA9IHZlYzMuZGl2aWRlO1xuXG52ZWMzLmRpc3QgPSB2ZWMzLmRpc3RhbmNlO1xuXG52ZWMzLmRpc3RTcSA9IHZlYzMuZGlzdGFuY2VTcTtcblxudmVjMy5sZW4gPSB2ZWMzLmxlbmd0aDtcblxudmVjMy5sZW5TcSA9IHZlYzMubGVuZ3RoU3E7XG5cbnZlYzMudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJ1ZlY3RvcjMoJyArIHRoaXMueCArICcsICcgKyB0aGlzLnkgKyAnLCAnICsgdGhpcy56ICsgJyknO1xufTtcblxudmVjMy5zdHIgPSB2ZWMzLnRvU3RyaW5nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZlY3RvcjM7IiwidmFyIGNvbW1vbiA9IHJlcXVpcmUoJy4vY29tbW9uJyk7XG5cbmZ1bmN0aW9uIFZlY3RvcjQoeCwgeSwgeiwgdykge1xuXHRpZiAodHlwZW9mIHggPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgdGhpcy54ID0geC54fHwwO1xuICAgICAgICB0aGlzLnkgPSB4Lnl8fDA7XG4gICAgICAgIHRoaXMueiA9IHguenx8MDtcbiAgICAgICAgdGhpcy53ID0geC53fHwwO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMueCA9IHh8fDA7XG4gICAgICAgIHRoaXMueSA9IHl8fDA7XG4gICAgICAgIHRoaXMueiA9IHp8fDA7XG4gICAgICAgIHRoaXMudyA9IHd8fDA7XG4gICAgfVxufVxuXG4vL3Nob3J0aGFuZCBpdCBmb3IgYmV0dGVyIG1pbmlmaWNhdGlvblxudmFyIHZlYzQgPSBWZWN0b3I0LnByb3RvdHlwZTtcblxuLy9taXhpbiBjb21tb24gZnVuY3Rpb25zXG5mb3IgKHZhciBrIGluIGNvbW1vbikge1xuICAgIHZlYzRba10gPSBjb21tb25ba107XG59XG5cbnZlYzQuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFZlY3RvcjQodGhpcy54LCB0aGlzLnksIHRoaXMueiwgdGhpcy53KTtcbn07XG5cbnZlYzQubXVsdGlwbHkgPSBmdW5jdGlvbih2KSB7XG4gICAgdGhpcy54ICo9IHYueDtcbiAgICB0aGlzLnkgKj0gdi55O1xuICAgIHRoaXMueiAqPSB2Lno7XG4gICAgdGhpcy53ICo9IHYudztcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzQuZGl2aWRlID0gZnVuY3Rpb24odikge1xuICAgIHRoaXMueCAvPSB2Lng7XG4gICAgdGhpcy55IC89IHYueTtcbiAgICB0aGlzLnogLz0gdi56O1xuICAgIHRoaXMudyAvPSB2Lnc7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWM0LmRpc3RhbmNlID0gZnVuY3Rpb24odikge1xuICAgIHZhciBkeCA9IHYueCAtIHRoaXMueCxcbiAgICAgICAgZHkgPSB2LnkgLSB0aGlzLnksXG4gICAgICAgIGR6ID0gdi56IC0gdGhpcy56LFxuICAgICAgICBkdyA9IHYudyAtIHRoaXMudztcbiAgICByZXR1cm4gTWF0aC5zcXJ0KGR4KmR4ICsgZHkqZHkgKyBkeipkeiArIGR3KmR3KTtcbn07XG5cbnZlYzQuZGlzdGFuY2VTcSA9IGZ1bmN0aW9uKHYpIHtcbiAgICB2YXIgZHggPSB2LnggLSB0aGlzLngsXG4gICAgICAgIGR5ID0gdi55IC0gdGhpcy55LFxuICAgICAgICBkeiA9IHYueiAtIHRoaXMueixcbiAgICAgICAgZHcgPSB2LncgLSB0aGlzLnc7XG4gICAgcmV0dXJuIGR4KmR4ICsgZHkqZHkgKyBkeipkeiArIGR3KmR3O1xufTtcblxudmVjNC5uZWdhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnggPSAtdGhpcy54O1xuICAgIHRoaXMueSA9IC10aGlzLnk7XG4gICAgdGhpcy56ID0gLXRoaXMuejtcbiAgICB0aGlzLncgPSAtdGhpcy53O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjNC50cmFuc2Zvcm1NYXQ0ID0gZnVuY3Rpb24obWF0KSB7XG4gICAgdmFyIG0gPSBtYXQudmFsLCB4ID0gdGhpcy54LCB5ID0gdGhpcy55LCB6ID0gdGhpcy56LCB3ID0gdGhpcy53O1xuICAgIHRoaXMueCA9IG1bMF0gKiB4ICsgbVs0XSAqIHkgKyBtWzhdICogeiArIG1bMTJdICogdztcbiAgICB0aGlzLnkgPSBtWzFdICogeCArIG1bNV0gKiB5ICsgbVs5XSAqIHogKyBtWzEzXSAqIHc7XG4gICAgdGhpcy56ID0gbVsyXSAqIHggKyBtWzZdICogeSArIG1bMTBdICogeiArIG1bMTRdICogdztcbiAgICB0aGlzLncgPSBtWzNdICogeCArIG1bN10gKiB5ICsgbVsxMV0gKiB6ICsgbVsxNV0gKiB3O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLy8vLyBUT0RPOiBpcyB0aGlzIHJlYWxseSB0aGUgc2FtZSBhcyBWZWN0b3IzID8/XG4vLy8gIEFsc28sIHdoYXQgYWJvdXQgdGhpczpcbi8vLyAgaHR0cDovL21vbGVjdWxhcm11c2luZ3Mud29yZHByZXNzLmNvbS8yMDEzLzA1LzI0L2EtZmFzdGVyLXF1YXRlcm5pb24tdmVjdG9yLW11bHRpcGxpY2F0aW9uL1xudmVjNC50cmFuc2Zvcm1RdWF0ID0gZnVuY3Rpb24ocSkge1xuICAgIC8vIGJlbmNobWFya3M6IGh0dHA6Ly9qc3BlcmYuY29tL3F1YXRlcm5pb24tdHJhbnNmb3JtLXZlYzMtaW1wbGVtZW50YXRpb25zXG4gICAgdmFyIHggPSB0aGlzLngsIHkgPSB0aGlzLnksIHogPSB0aGlzLnosXG4gICAgICAgIHF4ID0gcS54LCBxeSA9IHEueSwgcXogPSBxLnosIHF3ID0gcS53LFxuXG4gICAgICAgIC8vIGNhbGN1bGF0ZSBxdWF0ICogdmVjXG4gICAgICAgIGl4ID0gcXcgKiB4ICsgcXkgKiB6IC0gcXogKiB5LFxuICAgICAgICBpeSA9IHF3ICogeSArIHF6ICogeCAtIHF4ICogeixcbiAgICAgICAgaXogPSBxdyAqIHogKyBxeCAqIHkgLSBxeSAqIHgsXG4gICAgICAgIGl3ID0gLXF4ICogeCAtIHF5ICogeSAtIHF6ICogejtcblxuICAgIC8vIGNhbGN1bGF0ZSByZXN1bHQgKiBpbnZlcnNlIHF1YXRcbiAgICB0aGlzLnggPSBpeCAqIHF3ICsgaXcgKiAtcXggKyBpeSAqIC1xeiAtIGl6ICogLXF5O1xuICAgIHRoaXMueSA9IGl5ICogcXcgKyBpdyAqIC1xeSArIGl6ICogLXF4IC0gaXggKiAtcXo7XG4gICAgdGhpcy56ID0gaXogKiBxdyArIGl3ICogLXF6ICsgaXggKiAtcXkgLSBpeSAqIC1xeDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzQucmFuZG9tID0gZnVuY3Rpb24oc2NhbGUpIHtcbiAgICBzY2FsZSA9IHNjYWxlIHx8IDEuMDtcblxuICAgIC8vTm90IHNwaGVyaWNhbDsgc2hvdWxkIGZpeCB0aGlzIGZvciBtb3JlIHVuaWZvcm0gZGlzdHJpYnV0aW9uXG4gICAgdGhpcy54ID0gKE1hdGgucmFuZG9tKCkgKiAyIC0gMSkgKiBzY2FsZTtcbiAgICB0aGlzLnkgPSAoTWF0aC5yYW5kb20oKSAqIDIgLSAxKSAqIHNjYWxlO1xuICAgIHRoaXMueiA9IChNYXRoLnJhbmRvbSgpICogMiAtIDEpICogc2NhbGU7XG4gICAgdGhpcy53ID0gKE1hdGgucmFuZG9tKCkgKiAyIC0gMSkgKiBzY2FsZTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzQucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnggPSAwO1xuICAgIHRoaXMueSA9IDA7XG4gICAgdGhpcy56ID0gMDtcbiAgICB0aGlzLncgPSAwO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjNC5zdWIgPSB2ZWM0LnN1YnRyYWN0O1xuXG52ZWM0Lm11bCA9IHZlYzQubXVsdGlwbHk7XG5cbnZlYzQuZGl2ID0gdmVjNC5kaXZpZGU7XG5cbnZlYzQuZGlzdCA9IHZlYzQuZGlzdGFuY2U7XG5cbnZlYzQuZGlzdFNxID0gdmVjNC5kaXN0YW5jZVNxO1xuXG52ZWM0LmxlbiA9IHZlYzQubGVuZ3RoO1xuXG52ZWM0LmxlblNxID0gdmVjNC5sZW5ndGhTcTtcblxudmVjNC50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAnVmVjdG9yNCgnICsgdGhpcy54ICsgJywgJyArIHRoaXMueSArICcsICcgKyB0aGlzLnogKyAnLCAnICsgdGhpcy53ICsgJyknO1xufTtcblxudmVjNC5zdHIgPSB2ZWM0LnRvU3RyaW5nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZlY3RvcjQ7IiwiLy9jb21tb24gdmVjNCBmdW5jdGlvbnNcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFxuLyoqXG4gKiBDb3BpZXMgdGhlIHgsIHksIHosIHcgY29tcG9uZW50cyBmcm9tIHRoZSBzcGVjaWZpZWRcbiAqIFZlY3Rvci4gVW5saWtlIG1vc3Qgb3RoZXIgb3BlcmF0aW9ucywgdGhpcyBmdW5jdGlvblxuICogd2lsbCBkZWZhdWx0IHVuZGVmaW5lZCBjb21wb25lbnRzIG9uIGBvdGhlclZlY2AgdG8gemVyby5cbiAqIFxuICogQG1ldGhvZCAgY29weVxuICogQHBhcmFtICB7b3RoZXJWZWN9IHRoZSBvdGhlciBWZWN0b3I0IHRvIGNvcHlcbiAqIEByZXR1cm4ge1ZlY3Rvcn0gIHRoaXMsIGZvciBjaGFpbmluZ1xuICovXG5cblxuLyoqXG4gKiBBIGNvbnZlbmllbmNlIGZ1bmN0aW9uIHRvIHNldCB0aGUgY29tcG9uZW50cyBvZlxuICogdGhpcyB2ZWN0b3IgYXMgeCwgeSwgeiwgdy4gRmFsc3kgb3IgdW5kZWZpbmVkXG4gKiBwYXJhbWV0ZXJzIHdpbGwgZGVmYXVsdCB0byB6ZXJvLlxuICpcbiAqIFlvdSBjYW4gYWxzbyBwYXNzIGEgdmVjdG9yIG9iamVjdCBpbnN0ZWFkIG9mXG4gKiBpbmRpdmlkdWFsIGNvbXBvbmVudHMsIHRvIGNvcHkgdGhlIG9iamVjdCdzIGNvbXBvbmVudHMuXG4gKiBcbiAqIEBtZXRob2QgIHNldFxuICogQHBhcmFtIHtOdW1iZXJ9IHggdGhlIHggY29tcG9uZW50XG4gKiBAcGFyYW0ge051bWJlcn0geSB0aGUgeSBjb21wb25lbnRcbiAqIEBwYXJhbSB7TnVtYmVyfSB6IHRoZSB6IGNvbXBvbmVudFxuICogQHBhcmFtIHtOdW1iZXJ9IHcgdGhlIHcgY29tcG9uZW50XG4gKiBAcmV0dXJuIHtWZWN0b3IyfSAgdGhpcywgZm9yIGNoYWluaW5nXG4gKi9cblxuLyoqXG4gKiBBZGRzIHRoZSBjb21wb25lbnRzIG9mIHRoZSBvdGhlciBWZWN0b3I0IHRvXG4gKiB0aGlzIHZlY3Rvci5cbiAqIFxuICogQG1ldGhvZCBhZGRcbiAqIEBwYXJhbSAge1ZlY3RvcjR9IG90aGVyVmVjIG90aGVyIHZlY3RvciwgcmlnaHQgb3BlcmFuZFxuICogQHJldHVybiB7VmVjdG9yMn0gIHRoaXMsIGZvciBjaGFpbmluZ1xuICovXG5cbi8qKlxuICogU3VidHJhY3RzIHRoZSBjb21wb25lbnRzIG9mIHRoZSBvdGhlciBWZWN0b3I0XG4gKiBmcm9tIHRoaXMgdmVjdG9yLiBBbGlhc2VkIGFzIGBzdWIoKWBcbiAqIFxuICogQG1ldGhvZCAgc3VidHJhY3RcbiAqIEBwYXJhbSAge1ZlY3RvcjR9IG90aGVyVmVjIG90aGVyIHZlY3RvciwgcmlnaHQgb3BlcmFuZFxuICogQHJldHVybiB7VmVjdG9yMn0gIHRoaXMsIGZvciBjaGFpbmluZ1xuICovXG5cbi8qKlxuICogTXVsdGlwbGllcyB0aGUgY29tcG9uZW50cyBvZiB0aGlzIFZlY3RvcjRcbiAqIGJ5IGEgc2NhbGFyIGFtb3VudC5cbiAqXG4gKiBAbWV0aG9kICBzY2FsZVxuICogQHBhcmFtIHtOdW1iZXJ9IHMgdGhlIHNjYWxlIHRvIG11bHRpcGx5IGJ5XG4gKiBAcmV0dXJuIHtWZWN0b3I0fSB0aGlzLCBmb3IgY2hhaW5pbmdcbiAqL1xuXG4vKipcbiAqIFJldHVybnMgdGhlIG1hZ25pdHVkZSAobGVuZ3RoKSBvZiB0aGlzIHZlY3Rvci5cbiAqXG4gKiBBbGlhc2VkIGFzIGBsZW4oKWBcbiAqIFxuICogQG1ldGhvZCAgbGVuZ3RoXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IHRoZSBsZW5ndGggb2YgdGhpcyB2ZWN0b3JcbiAqL1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHNxdWFyZWQgbWFnbml0dWRlIChsZW5ndGgpIG9mIHRoaXMgdmVjdG9yLlxuICpcbiAqIEFsaWFzZWQgYXMgYGxlblNxKClgXG4gKiBcbiAqIEBtZXRob2QgIGxlbmd0aFNxXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IHRoZSBzcXVhcmVkIGxlbmd0aCBvZiB0aGlzIHZlY3RvclxuICovXG5cbi8qKlxuICogTm9ybWFsaXplcyB0aGlzIHZlY3RvciB0byBhIHVuaXQgdmVjdG9yLlxuICogQG1ldGhvZCBub3JtYWxpemVcbiAqIEByZXR1cm4ge1ZlY3RvcjR9ICB0aGlzLCBmb3IgY2hhaW5pbmdcbiAqL1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGRvdCBwcm9kdWN0IG9mIHRoaXMgdmVjdG9yXG4gKiBhbmQgdGhlIHNwZWNpZmllZCBWZWN0b3I0LlxuICogXG4gKiBAbWV0aG9kIGRvdFxuICogQHJldHVybiB7TnVtYmVyfSB0aGUgZG90IHByb2R1Y3RcbiAqL1xuICAgIGNvcHk6IGZ1bmN0aW9uKG90aGVyVmVjKSB7XG4gICAgICAgIHRoaXMueCA9IG90aGVyVmVjLnh8fDA7XG4gICAgICAgIHRoaXMueSA9IG90aGVyVmVjLnl8fDA7XG4gICAgICAgIHRoaXMueiA9IG90aGVyVmVjLnp8fDA7XG4gICAgICAgIHRoaXMudyA9IG90aGVyVmVjLnd8fDA7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBzZXQ6IGZ1bmN0aW9uKHgsIHksIHosIHcpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB4ID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICB0aGlzLnggPSB4Lnh8fDA7XG4gICAgICAgICAgICB0aGlzLnkgPSB4Lnl8fDA7XG4gICAgICAgICAgICB0aGlzLnogPSB4Lnp8fDA7XG4gICAgICAgICAgICB0aGlzLncgPSB4Lnd8fDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnggPSB4fHwwO1xuICAgICAgICAgICAgdGhpcy55ID0geXx8MDtcbiAgICAgICAgICAgIHRoaXMueiA9IHp8fDA7XG4gICAgICAgICAgICB0aGlzLncgPSB3fHwwO1xuXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGFkZDogZnVuY3Rpb24odikge1xuICAgICAgICB0aGlzLnggKz0gdi54O1xuICAgICAgICB0aGlzLnkgKz0gdi55O1xuICAgICAgICB0aGlzLnogKz0gdi56O1xuICAgICAgICB0aGlzLncgKz0gdi53O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgc3VidHJhY3Q6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgdGhpcy54IC09IHYueDtcbiAgICAgICAgdGhpcy55IC09IHYueTtcbiAgICAgICAgdGhpcy56IC09IHYuejtcbiAgICAgICAgdGhpcy53IC09IHYudztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHNjYWxlOiBmdW5jdGlvbihzKSB7XG4gICAgICAgIHRoaXMueCAqPSBzO1xuICAgICAgICB0aGlzLnkgKj0gcztcbiAgICAgICAgdGhpcy56ICo9IHM7XG4gICAgICAgIHRoaXMudyAqPSBzO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG5cbiAgICBsZW5ndGg6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgeCA9IHRoaXMueCxcbiAgICAgICAgICAgIHkgPSB0aGlzLnksXG4gICAgICAgICAgICB6ID0gdGhpcy56LFxuICAgICAgICAgICAgdyA9IHRoaXMudztcbiAgICAgICAgcmV0dXJuIE1hdGguc3FydCh4KnggKyB5KnkgKyB6KnogKyB3KncpO1xuICAgIH0sXG5cbiAgICBsZW5ndGhTcTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB4ID0gdGhpcy54LFxuICAgICAgICAgICAgeSA9IHRoaXMueSxcbiAgICAgICAgICAgIHogPSB0aGlzLnosXG4gICAgICAgICAgICB3ID0gdGhpcy53O1xuICAgICAgICByZXR1cm4geCp4ICsgeSp5ICsgeip6ICsgdyp3O1xuICAgIH0sXG5cbiAgICBub3JtYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgeCA9IHRoaXMueCxcbiAgICAgICAgICAgIHkgPSB0aGlzLnksXG4gICAgICAgICAgICB6ID0gdGhpcy56LFxuICAgICAgICAgICAgdyA9IHRoaXMudztcbiAgICAgICAgdmFyIGxlbiA9IHgqeCArIHkqeSArIHoqeiArIHcqdztcbiAgICAgICAgaWYgKGxlbiA+IDApIHtcbiAgICAgICAgICAgIGxlbiA9IDEgLyBNYXRoLnNxcnQobGVuKTtcbiAgICAgICAgICAgIHRoaXMueCA9IHgqbGVuO1xuICAgICAgICAgICAgdGhpcy55ID0geSpsZW47XG4gICAgICAgICAgICB0aGlzLnogPSB6KmxlbjtcbiAgICAgICAgICAgIHRoaXMudyA9IHcqbGVuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBkb3Q6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMueCAqIHYueCArIHRoaXMueSAqIHYueSArIHRoaXMueiAqIHYueiArIHRoaXMudyAqIHYudztcbiAgICB9LFxuXG4gICAgbGVycDogZnVuY3Rpb24odiwgdCkge1xuICAgICAgICB2YXIgYXggPSB0aGlzLngsXG4gICAgICAgICAgICBheSA9IHRoaXMueSxcbiAgICAgICAgICAgIGF6ID0gdGhpcy56LFxuICAgICAgICAgICAgYXcgPSB0aGlzLnc7XG4gICAgICAgIHQgPSB0fHwwO1xuICAgICAgICB0aGlzLnggPSBheCArIHQgKiAodi54IC0gYXgpO1xuICAgICAgICB0aGlzLnkgPSBheSArIHQgKiAodi55IC0gYXkpO1xuICAgICAgICB0aGlzLnogPSBheiArIHQgKiAodi56IC0gYXopO1xuICAgICAgICB0aGlzLncgPSBhdyArIHQgKiAodi53IC0gYXcpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59OyIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFZlY3RvcjI6IHJlcXVpcmUoJy4vVmVjdG9yMicpLFxuICAgIFZlY3RvcjM6IHJlcXVpcmUoJy4vVmVjdG9yMycpLFxuICAgIFZlY3RvcjQ6IHJlcXVpcmUoJy4vVmVjdG9yNCcpLFxuICAgIE1hdHJpeDM6IHJlcXVpcmUoJy4vTWF0cml4MycpLFxuICAgIE1hdHJpeDQ6IHJlcXVpcmUoJy4vTWF0cml4NCcpLFxuICAgIFF1YXRlcm5pb246IHJlcXVpcmUoJy4vUXVhdGVybmlvbicpXG59OyIsInZhciAkID0gKHdpbmRvdy4kKTtcbnZhciBTaW1wbGV4Tm9pc2UgPSByZXF1aXJlKCdzaW1wbGV4LW5vaXNlJyk7XG52YXIgVmVjdG9yMiA9IHJlcXVpcmUoJ3ZlY21hdGgnKS5WZWN0b3IyO1xuXG52YXIgc21vb3Roc3RlcCA9IHJlcXVpcmUoJ2ludGVycG9sYXRpb24nKS5zbW9vdGhzdGVwO1xudmFyIGxlcnAgPSByZXF1aXJlKCdpbnRlcnBvbGF0aW9uJykubGVycDtcblxudmFyIE5vaXNlTWFwID0gcmVxdWlyZSgnLi91dGlsL05vaXNlTWFwJyk7XG52YXIgaW1hZ2VkYXRhID0gcmVxdWlyZSgnLi91dGlsL2ltYWdlZGF0YScpO1xuXG52YXIgUGFydGljbGUgPSByZXF1aXJlKCcuL2ltcHJlc3Npb24nKS5QYXJ0aWNsZTtcblxudmFyIGRhdCA9ICh3aW5kb3cuZGF0KTtcblxudmFyIHRtcCA9IG5ldyBWZWN0b3IyKCk7XG52YXIgdG1wMiA9IG5ldyBWZWN0b3IyKCk7XG52YXIgcmFmID0gcmVxdWlyZSgncmFmLmpzJyk7XG5cblxuLy9wb2x5ZmlsbFxuaWYgKCFuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKVxuICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgPSBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhIFxuICAgICAgICAgICAgICAgICAgICAgICAgfHwgbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYSBcbiAgICAgICAgICAgICAgICAgICAgICAgIHx8IG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEgXG4gICAgICAgICAgICAgICAgICAgICAgICB8fCBuYXZpZ2F0b3IubXNHZXRVc2VyTWVkaWE7XG5pZiAoIXdpbmRvdy5VUkwpXG4gICAgd2luZG93LlVSTCA9IHdpbmRvdy5VUkwgXG4gICAgICAgICAgICAgICAgICAgIHx8IHdpbmRvdy53ZWJraXRVUkwgXG4gICAgICAgICAgICAgICAgICAgIHx8IHdpbmRvdy5tb3pVUkwgXG4gICAgICAgICAgICAgICAgICAgIHx8IHdpbmRvdy5tc1VSTDtcblxuXG4kKGZ1bmN0aW9uKCkge1xuXHQvLyB2YXIgY2FudmFzID0gJChcIjxjYW52YXM+XCIpLmFwcGVuZFRvKGRvY3VtZW50LmJvZHkpWzBdO1xuXHR2YXIgY2FudmFzID0gJChcIjxjYW52YXM+XCIpWzBdO1xuXHR2YXIgd2lkdGggPSA5MDAsXG5cdFx0aGVpZ2h0ID0gNTM1O1xuXG5cdHZhciBtaW5pbWFsID0gISEkKGRvY3VtZW50LmJvZHkpLmRhdGEoXCJtaW5pbWFsXCIpO1xuXG5cdHZhciBwcmV2aWV3Q2FudmFzID0gJChcIjxjYW52YXM+XCIpLmFwcGVuZFRvKGRvY3VtZW50LmJvZHkpWzBdLFxuXHRcdHByZXZpZXdXaWR0aCA9IE1hdGgubWF4KDI1Niwgfn4od2lkdGgvMSkpLFxuXHRcdHByZXZpZXdIZWlnaHQgPSB+fihwcmV2aWV3V2lkdGggKiAxLyh3aWR0aC9oZWlnaHQpKSxcblx0XHRwcmV2aWV3Q29udGV4dCA9IHByZXZpZXdDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuXG5cdHByZXZpZXdDYW52YXMud2lkdGggPSBwcmV2aWV3V2lkdGg7XG5cdHByZXZpZXdDYW52YXMuaGVpZ2h0ID0gcHJldmlld0hlaWdodDtcblxuXHRjYW52YXMud2lkdGggPSB3aWR0aDtcblx0Y2FudmFzLmhlaWdodCA9IGhlaWdodDtcblxuXG5cdHZhciBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcblx0dmFyIG5vaXNlU2l6ZSA9IDI1Njtcblx0dmFyIG5vaXNlID0gbmV3IE5vaXNlTWFwKG5vaXNlU2l6ZSk7XG5cdG5vaXNlLnNjYWxlID0gMy4yO1xuXHQvLyBub2lzZS5zZWFtbGVzcyA9IHRydWU7XG5cdG5vaXNlLnNtb290aGluZyA9IHRydWU7XG5cdG5vaXNlLmdlbmVyYXRlKCk7XG5cblxuXHR2YXIgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcblx0aW1hZ2Uub25sb2FkID0gaGFuZGxlSW1hZ2VMb2FkO1xuXHRpbWFnZS5zcmMgPSBtaW5pbWFsID8gXCJpbWcvc3VuLnBuZ1wiIDogXCJpbWcvc2t5bGluZTIucG5nXCI7XG5cblxuXHR2YXIgaW1hZ2VQaXhlbHM7XG5cblx0dmFyIG9wdGlvbnMgPSB7XG5cdFx0c2NhbGU6IG5vaXNlLnNjYWxlLFxuXHRcdHNoaWZ0OiBmYWxzZSxcblx0XHRwYWludGluZzogdHJ1ZSxcblxuXHRcdC8vc3Ryb2tlIG9wdGlvbnNcblx0XHRjb3VudDogNTAwLFxuXHRcdGxlbmd0aDogMzMsXG5cdFx0dGhpY2tuZXNzOiAxMi4wLFxuXHRcdHNwZWVkOiAxLjAsXG5cdFx0bGlmZTogMS4wLCBcblx0XHRhbHBoYTogMC4yNSxcblx0XHRyb3VuZDogdHJ1ZSxcblx0XHRtb3Rpb246IHRydWUsXG5cdFx0YW5nbGU6IDEsXG5cblx0XHQvL2NvbG9yXG5cdFx0dXNlT3JpZ2luYWw6IHRydWUsXG5cdFx0aHVlOiA3MCxcblx0XHRzYXR1cmF0aW9uOiAxLjAsXG5cdFx0bGlnaHRuZXNzOiAxLjAsXG5cdFx0Z3JhaW46IG1pbmltYWwgPyAuNSA6IC43LFxuXHRcdGRhcmtlbjogIW1pbmltYWwsXG5cdFx0XG5cblx0XHRiYWNrZ3JvdW5kOiBtaW5pbWFsID8gJyNmMWYwZTInIDogJyMyZjJmMmYnLFxuXHRcdGNsZWFyOiBjbGVhcixcblx0XHRhbmltYXRlOiBhbmltYXRlSW4sXG5cdFx0dmlld09yaWdpbmFsOiBmYWxzZSxcblx0XHRleHBvcnRJbWFnZTogc2F2ZUltYWdlLmJpbmQodGhpcylcblx0fTtcblxuXHR2YXIgbm9pc2VPdmVybGF5ID0gJCgnPGRpdj4nKS5hcHBlbmRUbyhkb2N1bWVudC5ib2R5KS5hZGRDbGFzcygnbm9pc2Ugb3ZlcmxheScpLmNzcyh7XG5cdFx0d2lkdGg6IHByZXZpZXdXaWR0aCxcblx0XHRoZWlnaHQ6IHByZXZpZXdIZWlnaHQsXG5cdFx0b3BhY2l0eTogb3B0aW9ucy5ncmFpbiowLjJcblx0fSk7XG5cdCQoZG9jdW1lbnQuYm9keSkuY3NzKCdiYWNrZ3JvdW5kJywgJyMyNTI1MjUnKTtcblxuXHR2YXIgb3JpZ2luYWxJbWFnZSA9ICQoaW1hZ2UpLmNsb25lKCkuYXBwZW5kVG8oZG9jdW1lbnQuYm9keSkuY3NzKHtcblx0XHR2aXNpYmlsaXR5OiAnaGlkZGVuJ1xuXHR9KS5hZGRDbGFzcygnb3ZlcmxheSBvcmlnaW5hbCcpLmNzcyh7XG5cdFx0d2lkdGg6IHByZXZpZXdXaWR0aCxcblx0XHRoZWlnaHQ6IHByZXZpZXdIZWlnaHRcblx0fSk7XG5cblx0XG5cdHZhciBndWk7XG5cdHNldHVwR1VJKCk7XG5cblxuXHR2YXIgcGFydGljbGVzID0gW10sXG5cdFx0Y291bnQgPSA1MDAsXG5cdFx0c3RlcCA9IDAsXG5cdFx0dGltZSA9IDAsXG5cdFx0bW91c2UgPSBuZXcgVmVjdG9yMigpO1xuXG5cdHZhciB2aWRlbywgcGxheWluZz1mYWxzZTtcblx0bG9hZFZpZGVvKCk7XG5cblx0dmFyIHN0YXJ0VGltZSA9IERhdGUubm93KCksIHdlYmNhbVRpbWVyID0gMCxcblx0XHR3ZWJjYW1EZWxheSA9IDUwMDtcblxuXHRzZXR1cFBhcnRpY2xlcygpO1xuXG5cdGFuaW1hdGVJbigpO1xuXG5cdGlmIChtaW5pbWFsKSB7XG5cdFx0JCgnI3RleHQnKS5odG1sKCdnZW5lcmF0aXZlIHBhaW50aW5nIGluIHRoZSBpbXByZXNzaW9uaXN0IHN0eWxlPHA+YnkgTWF0dCBEZXNMYXVyaWVyczwvcD4nKVxuXHRcdFx0LmNzcyhcInRvcFwiLCAxMCkuY3NzKFwiY29sb3JcIiwgXCIjMmYyZjJmXCIpLmNzcyhcInotaW5kZXhcIiwgMTAwMCk7XG5cdFx0JCgnLmRnLmFjJykuaGlkZSgpO1xuXHRcdCQoJ2NhbnZhcywgZGl2Lm5vaXNlJykub24oXCJ0YXAgbW91c2Vkb3duXCIsIGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0Y2xlYXIoKTtcblxuXHRcdFx0b3B0aW9ucy5wYWludGluZyA9IGZhbHNlO1xuXHRcdFx0cHJldmlld0NvbnRleHQuZHJhd0ltYWdlKGNhbnZhcywgMCwgMCwgcHJldmlld1dpZHRoLCBwcmV2aWV3SGVpZ2h0KTtcblx0XHRcdFR3ZWVuTGl0ZS5kZWxheWVkQ2FsbCgwLjUsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRvcHRpb25zLnBhaW50aW5nID0gdHJ1ZTtcblx0XHRcdFx0YW5pbWF0ZUluKCk7XG5cdFx0XHR9LmJpbmQodGhpcykpO1xuXHRcdH0pLm9uKCd0b3VjaG1vdmUnLCBmdW5jdGlvbihldikge1xuXHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdH0pO1xuXG5cdH1cblx0aWYgKHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvID09PSAyKSB7XG5cdFx0JCgnZGl2Lm5vaXNlJykuY3NzKFwiYmFja2dyb3VuZC1zaXplXCIsIFwiMTI4cHggMTI4cHhcIik7XG5cdH1cblxuXHRmdW5jdGlvbiBoYW5kbGVJbWFnZUxvYWQoKSB7XG5cdFx0aW1hZ2VQaXhlbHMgPSBpbWFnZWRhdGEuZ2V0SW1hZ2VEYXRhKGltYWdlKS5kYXRhO1xuXHRcdFx0XHRcblx0XHQvLyBjb250ZXh0LmZpbGxTdHlsZSA9ICcjZWJlYmViJztcblx0XHRjbGVhclJlY3QoKTtcblxuXG5cdFx0Ly8gY29udGV4dC5nbG9iYWxBbHBoYSA9IDE7XG5cdFx0Ly8gY29udGV4dC5kcmF3SW1hZ2UoaW1hZ2UsIDAsIDApO1xuXG5cdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbmRlcik7XG5cdH1cblxuXHRmdW5jdGlvbiB1cGRhdGVBbmltYXRpb24oKSB7XG5cblx0XHQvL3d0ZiBkYXQuZ3VpLi4uXG5cdFx0Zm9yICh2YXIgayBpbiBndWkuX19mb2xkZXJzLnN0cm9rZS5fX2NvbnRyb2xsZXJzKSB7XG5cdFx0XHRndWkuX19mb2xkZXJzLnN0cm9rZS5fX2NvbnRyb2xsZXJzW2tdLnVwZGF0ZURpc3BsYXkoKTtcblx0XHR9XG5cdFx0Zm9yICh2YXIgayBpbiBndWkuX19mb2xkZXJzLmNvbG9yLl9fY29udHJvbGxlcnMpIHtcblx0XHRcdGd1aS5fX2ZvbGRlcnMuY29sb3IuX19jb250cm9sbGVyc1trXS51cGRhdGVEaXNwbGF5KCk7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gc2F2ZUltYWdlKCkge1xuXHRcdC8vIG9wdGlvbnMucGFpbnRpbmcgPSBmYWxzZTtcblxuXHRcdC8vIGZvciAodmFyIGsgaW4gZ3VpLl9fZm9sZGVycy5jYW52YXMuX19jb250cm9sbGVycykge1xuXHRcdC8vIFx0Z3VpLl9fZm9sZGVycy5jYW52YXMuX19jb250cm9sbGVyc1trXS51cGRhdGVEaXNwbGF5KCk7XG5cdFx0Ly8gfVxuXHRcdFxuXHRcdHZhciBkYXRhVVJMID0gY2FudmFzLnRvRGF0YVVSTChcImltYWdlL3BuZ1wiKTtcblxuXHRcdHZhciBkaXNwbGF5V2lkdGggPSB3aWR0aCxcblx0XHRcdGRpc3BsYXlIZWlnaHQgPSBoZWlnaHQ7XG5cdFx0dmFyIGltYWdlV2luZG93ID0gd2luZG93Lm9wZW4oXCJcIiwgXCJmcmFjdGFsTGluZUltYWdlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImxlZnQ9MCx0b3A9MCx3aWR0aD1cIis4MDArXCIsaGVpZ2h0PVwiKzUwMCtcIix0b29sYmFyPTAscmVzaXphYmxlPTBcIik7XG5cdFx0aW1hZ2VXaW5kb3cuZG9jdW1lbnQud3JpdGUoXCI8dGl0bGU+RXhwb3J0IEltYWdlPC90aXRsZT5cIilcblx0XHRpbWFnZVdpbmRvdy5kb2N1bWVudC53cml0ZShcIjxpbWcgaWQ9J2V4cG9ydEltYWdlJ1wiXG5cdFx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICArIFwiIGFsdD0nJ1wiXG5cdFx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICArIFwiIGhlaWdodD0nXCIgKyBkaXNwbGF5SGVpZ2h0ICsgXCInXCJcblx0XHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICsgXCIgd2lkdGg9J1wiICArIGRpc3BsYXlXaWR0aCAgKyBcIidcIlxuXHRcdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKyBcIiBzdHlsZT0ncG9zaXRpb246YWJzb2x1dGU7bGVmdDowO3RvcDowJy8+XCIpO1xuXHRcdGltYWdlV2luZG93LmRvY3VtZW50LmNsb3NlKCk7XG5cdFx0dmFyIGV4cG9ydEltYWdlID0gaW1hZ2VXaW5kb3cuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJleHBvcnRJbWFnZVwiKTtcblx0XHRleHBvcnRJbWFnZS5zcmMgPSBkYXRhVVJMO1xuXHR9XG5cblx0ZnVuY3Rpb24gYW5pbWF0ZUluKCkge1xuXHRcdFR3ZWVuTGl0ZS5raWxsVHdlZW5zT2Yob3B0aW9ucyk7XG5cdFx0dXBkYXRlQW5pbWF0aW9uKCk7XG5cblx0XHQvLyBUd2VlbkxpdGUudG8ob3B0aW9ucywgMS4wLCB7XG5cdFx0Ly8gXHRncmFpbjogMS4wLFxuXHRcdC8vIFx0b25VcGRhdGU6IHVwZGF0ZUdyYWluLmJpbmQodGhpcyksXG5cdFx0Ly8gfSk7XG5cdFxuXHRcdGlmIChtaW5pbWFsKSAvL2dvZCB0aGlzIGNvZGUgaXMgZ2V0dGluZyBuYXN0eS4uXG4gICAgICAgICAgICBhbmltYXRlSW4yKCk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGFuaW1hdGVJbjEoKTtcblx0fVxuXG4gICAgZnVuY3Rpb24gYW5pbWF0ZUluMSgpIHtcblx0XHRUd2VlbkxpdGUua2lsbFR3ZWVuc09mKG9wdGlvbnMpO1xuXHRcdHVwZGF0ZUFuaW1hdGlvbigpO1xuXG5cdFx0Ly8gVHdlZW5MaXRlLnRvKG9wdGlvbnMsIDEuMCwge1xuXHRcdC8vIFx0Z3JhaW46IDEuMCxcblx0XHQvLyBcdG9uVXBkYXRlOiB1cGRhdGVHcmFpbi5iaW5kKHRoaXMpLFxuXHRcdC8vIH0pO1xuXG5cdFx0VHdlZW5MaXRlLmZyb21UbyhvcHRpb25zLCAxLjAsIHtcblx0XHRcdHRoaWNrbmVzczogMzAsXG5cdFx0fSwge1xuXHRcdFx0dGhpY2tuZXNzOiAyMCxcblx0XHRcdGVhc2U6IEV4cG8uZWFzZU91dCxcblx0XHRcdGRlbGF5OiAyLjAsXG5cdFx0fSlcblx0XHRUd2VlbkxpdGUuZnJvbVRvKG9wdGlvbnMsIDMuMCwge1xuXHRcdFx0bGVuZ3RoOiAyMyxcblx0XHRcdGFscGhhOiAwLjMsXG5cdFx0XHRsaWZlOiAwLjcsXG5cdFx0XHQvLyByb3VuZDogdHJ1ZSxcblx0XHRcdHNwZWVkOiAxLFxuXHRcdH0sIHtcblx0XHRcdGxpZmU6IDAuNSxcblx0XHRcdGFscGhhOiAwLjIsXG5cdFx0XHRsZW5ndGg6IDcwLFxuXHRcdFx0c3BlZWQ6IDAuNixcblx0XHRcdGRlbGF5OiAxLjAsXG5cdFx0XHQvLyBlYXNlOiBFeHBvLmVhc2VPdXQsXG5cdFx0XHRvblVwZGF0ZTogdXBkYXRlQW5pbWF0aW9uLmJpbmQodGhpcylcblx0XHR9KTtcblx0XHRUd2VlbkxpdGUudG8ob3B0aW9ucywgMy4wLCB7XG5cdFx0XHR0aGlja25lc3M6IDcuMCxcblx0XHRcdGxlbmd0aDogMzAsXG5cdFx0XHQvLyBvbkNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIFx0b3B0aW9ucy5yb3VuZCA9IHRydWU7XG5cdFx0XHQvLyB9LFxuXHRcdFx0ZGVsYXk6IDQuMCxcblx0XHR9KTtcblx0XHRUd2VlbkxpdGUudG8ob3B0aW9ucywgMS4wLCB7XG5cdFx0XHRsZW5ndGg6IDEwLFxuXHRcdFx0ZGVsYXk6IDYuMCxcblx0XHR9KVxuXHR9XG5cblx0ZnVuY3Rpb24gYW5pbWF0ZUluMigpIHtcblx0XHR2YXIgc3RhcnQgPSAwLjA7XG5cdFx0VHdlZW5MaXRlLmZyb21UbyhvcHRpb25zLCAxLjAsIHtcblx0XHRcdHRoaWNrbmVzczogNDAsXG5cblx0XHR9LCB7XG5cdFx0XHR0aGlja25lc3M6IDEwLFxuXHRcdFx0ZWFzZTogRXhwby5lYXNlT3V0LFxuXHRcdFx0ZGVsYXk6IHN0YXJ0KzIuMCxcblx0XHR9KVxuXHRcdFR3ZWVuTGl0ZS5mcm9tVG8ob3B0aW9ucywgMy4wLCB7XG5cdFx0XHRsZW5ndGg6IDIzLFxuXHRcdFx0YWxwaGE6IDAuMyxcblx0XHRcdGxpZmU6IDAuNyxcblx0XHRcdC8vIHJvdW5kOiB0cnVlLFxuXHRcdFx0c3BlZWQ6IDEsXG5cdFx0fSwge1xuXHRcdFx0bGlmZTogMC41LFxuXHRcdFx0YWxwaGE6IDAuMixcblx0XHRcdGxlbmd0aDogOTAsXG5cdFx0XHRzcGVlZDogMC42LFxuXHRcdFx0ZGVsYXk6IHN0YXJ0KzEuMCxcblx0XHRcdC8vIGVhc2U6IEV4cG8uZWFzZU91dCxcblx0XHRcdG9uVXBkYXRlOiB1cGRhdGVBbmltYXRpb24uYmluZCh0aGlzKVxuXHRcdH0pO1xuXHRcdFR3ZWVuTGl0ZS50byhvcHRpb25zLCAzLjAsIHtcblx0XHRcdHRoaWNrbmVzczogNS4wLFxuXHRcdFx0bGVuZ3RoOiA0MCxcblx0XHRcdC8vIG9uQ29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gXHRvcHRpb25zLnJvdW5kID0gdHJ1ZTtcblx0XHRcdC8vIH0sXG5cdFx0XHRkZWxheTogc3RhcnQrNC4wLFxuXHRcdH0pO1xuXHRcdFR3ZWVuTGl0ZS50byhvcHRpb25zLCAxLjAsIHtcblx0XHRcdGxlbmd0aDogMzAsXG5cdFx0XHRkZWxheTogc3RhcnQrNi4wLFxuXHRcdH0pXG5cdFx0VHdlZW5MaXRlLnRvKG9wdGlvbnMsIDEuMCwge1xuXHRcdFx0dGhpY2tuZXNzOiAzLFxuXHRcdFx0ZGVsYXk6IHN0YXJ0KzcuMCxcblx0XHR9KTtcblx0XHRUd2VlbkxpdGUudG8ob3B0aW9ucywgMS4wLCB7XG5cdFx0XHR0aGlja25lc3M6IDMsXG5cdFx0XHRkZWxheTogc3RhcnQrNy4wLFxuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gc2V0dXBQYXJ0aWNsZXMoKSB7XG5cdFx0cGFydGljbGVzLmxlbmd0aCA9IDA7XG5cdFx0Zm9yICh2YXIgaT0wOyBpPGNvdW50OyBpKyspIHtcblx0XHRcdHBhcnRpY2xlcy5wdXNoKG5ldyBQYXJ0aWNsZSgpLnJlc2V0KHdpZHRoLCBoZWlnaHQpLnJhbmRvbSgpKTtcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiB1cGRhdGVHcmFpbigpIHtcblx0XHRub2lzZU92ZXJsYXkuY3NzKCdvcGFjaXR5Jywgb3B0aW9ucy5ncmFpbiowLjIpO1xuXHR9XG5cblx0ZnVuY3Rpb24gc2V0dXBHVUkoKSB7XG5cdFx0Z3VpID0gbmV3IGRhdC5HVUkoKTtcblxuXHRcdHZhciBtb3Rpb24gPSBndWkuYWRkRm9sZGVyKCdub2lzZScpO1x0XG5cdFx0bW90aW9uLmFkZChvcHRpb25zLCAnc2hpZnQnKTtcblx0XHR2YXIgbm9pc2VTY2FsZSA9IG1vdGlvbi5hZGQob3B0aW9ucywgJ3NjYWxlJywgMC4xLCA1KTtcblxuXHRcdG5vaXNlU2NhbGUub25GaW5pc2hDaGFuZ2UoZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdG5vaXNlLnNjYWxlID0gb3B0aW9ucy5zY2FsZTtcblx0XHRcdG5vaXNlLmdlbmVyYXRlKCk7XG5cdFx0fSk7XG5cblx0XHR2YXIgc3Ryb2tlID0gZ3VpLmFkZEZvbGRlcignc3Ryb2tlJyk7XG5cdFx0c3Ryb2tlLmFkZChvcHRpb25zLCAnY291bnQnLCAxLCAxNTAwKS5vbkZpbmlzaENoYW5nZShmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0Y291bnQgPSB+fnZhbHVlO1xuXHRcdFx0c2V0dXBQYXJ0aWNsZXMoKTtcblx0XHR9KTtcblxuXHRcdHN0cm9rZS5hZGQob3B0aW9ucywgJ2xlbmd0aCcsIDAuMSwgMTAwLjApO1xuXHRcdHN0cm9rZS5hZGQob3B0aW9ucywgJ3RoaWNrbmVzcycsIDAuMSwgNTAuMCk7XG5cdFx0c3Ryb2tlLmFkZChvcHRpb25zLCAnbGlmZScsIDAuMCwgMS4wKTtcblx0XHRzdHJva2UuYWRkKG9wdGlvbnMsICdzcGVlZCcsIDAuMCwgMS4wKTtcblx0XHRzdHJva2UuYWRkKG9wdGlvbnMsICdhbHBoYScsIDAuMCwgMS4wKTtcblx0XHRzdHJva2UuYWRkKG9wdGlvbnMsICdhbmdsZScsIDAuMCwgMi4wKTtcblx0XHRzdHJva2UuYWRkKG9wdGlvbnMsICdyb3VuZCcpO1xuXHRcdHN0cm9rZS5hZGQob3B0aW9ucywgJ21vdGlvbicpO1xuXHRcdHN0cm9rZS5vcGVuKCk7XG5cblx0XHR2YXIgY29sb3IgPSBndWkuYWRkRm9sZGVyKCdjb2xvcicpO1xuXHRcdGNvbG9yLmFkZChvcHRpb25zLCAndXNlT3JpZ2luYWwnKTtcblx0XHRjb2xvci5hZGQob3B0aW9ucywgJ2RhcmtlbicpO1xuXHRcdGNvbG9yLmFkZChvcHRpb25zLCAnaHVlJywgMCwgMzYwKTtcblx0XHRjb2xvci5hZGQob3B0aW9ucywgJ3NhdHVyYXRpb24nLCAwLCAxLjApO1xuXHRcdGNvbG9yLmFkZChvcHRpb25zLCAnbGlnaHRuZXNzJywgMCwgMS4wKTtcblx0XHRjb2xvci5hZGQob3B0aW9ucywgJ2dyYWluJywgMCwgMS4wKS5vbkZpbmlzaENoYW5nZSh1cGRhdGVHcmFpbi5iaW5kKHRoaXMpKTtcblx0XHRjb2xvci5vcGVuKCk7XG5cblx0XHR2YXIgY2FudmFzID0gZ3VpLmFkZEZvbGRlcignY2FudmFzJyk7XG5cblx0XHRjYW52YXMuYWRkKG9wdGlvbnMsICdwYWludGluZycpO1xuXHRcdGNhbnZhcy5hZGRDb2xvcihvcHRpb25zLCAnYmFja2dyb3VuZCcpO1xuXHRcdGNhbnZhcy5hZGQob3B0aW9ucywgJ3ZpZXdPcmlnaW5hbCcpLm9uRmluaXNoQ2hhbmdlKGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRvcmlnaW5hbEltYWdlLmNzcygndmlzaWJpbGl0eScsIHZhbHVlID8gJ3Zpc2libGUnIDogJ2hpZGRlbicpO1xuXHRcdH0pO1xuXHRcdGNhbnZhcy5hZGQob3B0aW9ucywgJ2FuaW1hdGUnKTtcblx0XHRjYW52YXMuYWRkKG9wdGlvbnMsICdjbGVhcicpO1xuXHRcdGNhbnZhcy5hZGQob3B0aW9ucywgJ2V4cG9ydEltYWdlJyk7XG5cdFx0Y2FudmFzLm9wZW4oKTtcblxuXG5cblx0fVxuXG5cdGZ1bmN0aW9uIGNsZWFyUmVjdCgpIHtcblx0XHRjb250ZXh0Lmdsb2JhbEFscGhhID0gMS4wO1xuXHRcdGNvbnRleHQuZmlsbFN0eWxlID0gb3B0aW9ucy5iYWNrZ3JvdW5kO1xuXHRcdGNvbnRleHQuZmlsbFJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodCk7XG5cdH1cblxuXHRmdW5jdGlvbiBjbGVhcigpIHtcblx0XHRUd2VlbkxpdGUua2lsbFR3ZWVuc09mKG9wdGlvbnMpO1xuXHRcdGNsZWFyUmVjdCgpO1xuXHRcdHNldHVwUGFydGljbGVzKCk7XG5cdH1cblxuICAgIGZ1bmN0aW9uIGxvYWRWaWRlbygpIHtcbiAgICBcdC8vY29uc29sZS5sb2coXCJUUllJTkdcIik7XG4gICAgICAgIGlmIChuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhICYmIHdpbmRvdy5VUkwgJiYgd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwpIHtcbiAgICAgICAgXHQvL2NvbnNvbGUubG9nKFwiSEVMTE9PT09cIik7XG4gICAgICAgICAgICAvL2NyZWF0ZSBhIDx2aWRlbz4gZWxlbWVudFxuICAgICAgICAgICAgdmlkZW8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidmlkZW9cIik7XG4gICAgICAgICAgICB2aWRlby5zZXRBdHRyaWJ1dGUoXCJhdXRvcGxheVwiLCBcIlwiKTtcbiAgICAgICAgICAgIHZpZGVvLndpZHRoID0gd2lkdGg7XG4gICAgICAgICAgICB2aWRlby5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgICAgICB2aWRlby5zdHlsZS5iYWNrZ3JvdW5kID0gXCJibGFja1wiO1xuICAgICAgICAgICAgLy8gZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh2aWRlbyk7XG5cbiAgICAgICAgICAgIHZpZGVvLmFkZEV2ZW50TGlzdGVuZXIoXCJwbGF5XCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgXHRwbGF5aW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIFx0Y2xlYXIoKTtcbiAgICAgICAgICAgIFx0YW5pbWF0ZUluKCk7XG4gICAgICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJHRVRUSU5HIFZJREVPXCIpO1xuXG4gICAgICAgICAgICAvL2Rpc2FibGVkIGZvciBub3cuXG4gICAgICAgICAgICAvLyBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKHt2aWRlbzogdHJ1ZX0sIGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgICAgICAgLy8gICAgIHZpZGVvLnNyYyA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKHN0cmVhbSk7XG4gICAgICAgICAgICAvLyAgICAgaGFzVmlkZW8gPSB0cnVlO1xuXG4gICAgICAgICAgICAvLyB9LCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vICAgICAvL2VyciBoYW5kbGluZy4uLlxuICAgICAgICAgICAgLy8gfSk7XG5cbiAgICAgICAgfVxuICAgIH1cbi8vbW9yZSBmYWlsZWQgZXhwZXJpbWVudHMuLlxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBmdW5jdGlvbihldikge1xuXHRcdG1vdXNlLnNldChldi5jbGllbnRYLCBldi5jbGllbnRZKTtcblx0fSk7XG5cblxuICAgIHZhciBzdHJva2VDb3VudCA9IDA7XG5cdGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUocmVuZGVyKTtcblxuXHRcdHZhciBub3cgPSBEYXRlLm5vdygpO1xuXHRcdHZhciBkZWx0YSA9IG5vdyAtIHN0YXJ0VGltZTtcblx0XHRzdGFydFRpbWUgPSBub3c7XG5cdFx0XG5cdFx0dGltZSs9MC4xO1xuXHRcdHN0ZXArKztcblxuXG5cblx0XHRpZiAoIW9wdGlvbnMucGFpbnRpbmcgKVxuXHRcdFx0cmV0dXJuO1xuXG5cdFx0d2ViY2FtVGltZXIgKz0gZGVsdGE7XG5cdFx0aWYgKHdlYmNhbVRpbWVyID4gd2ViY2FtRGVsYXkgJiYgcGxheWluZykge1xuXHRcdFx0Ly8gY29uc29sZS5sb2coXCJURVNUXCIpO1xuXHRcdFx0d2ViY2FtVGltZXIgPSAwO1xuXHRcdFx0aW1hZ2VQaXhlbHMgPSBpbWFnZWRhdGEuZ2V0SW1hZ2VEYXRhKHZpZGVvKS5kYXRhO1xuXHRcdH1cblxuXHRcdC8vIGlmIChzdGVwICUgMTAwID09PSAwKSBcblx0XHQvLyBcdGNvbnNvbGUubG9nKHN0cm9rZUNvdW50KTtcblxuXHRcdGlmIChvcHRpb25zLnNoaWZ0ICYmIHN0ZXAgJSAyMCA9PT0gMCkge1xuXHRcdFx0bm9pc2Uub2Zmc2V0Kz0uMDE7XG5cdFx0XHRub2lzZS5nZW5lcmF0ZSgpO1xuXHRcdH1cblxuXHRcdC8vIGNvbnRleHQuZ2xvYmFsQWxwaGEgPSAwLjE7XG5cdFx0Ly8gY29udGV4dC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuXHRcdC8vIGNvbnRleHQuZmlsbFJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodCk7XG5cblx0XHQvLyBjb250ZXh0LmNsZWFyUmVjdCgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcblx0XHR2YXIgaW1hZ2VXaWR0aCA9IGltYWdlLndpZHRoO1xuXG5cdFx0Ly8gZm9yICh2YXIgeT0wOyB5PGhlaWdodDsgeSsrKSB7XG5cdFx0Ly8gXHRmb3IgKHZhciB4PTA7IHg8d2lkdGg7IHgrKykge1xuXHRcdC8vIFx0XHR2YXIgc2FtcGxlV2lkdGggPSB3aWR0aCxcblx0XHQvLyBcdFx0XHRzYW1wbGVIZWlnaHQgPSB3aWR0aDtcblxuXHRcdC8vIFx0XHR2YXIgcHhJbmRleCA9ICh4ICsgKHkgKiBpbWFnZVdpZHRoKSkqNDtcblx0XHQvLyBcdFx0dmFyIHJlZCA9IGltYWdlUGl4ZWxzWyBweEluZGV4IF0sXG5cdFx0Ly8gXHRcdFx0Z3JlZW4gPSBpbWFnZVBpeGVsc1sgcHhJbmRleCArIDFdLFxuXHRcdC8vIFx0XHRcdGJsdWUgPSBpbWFnZVBpeGVsc1tweEluZGV4ICsgMl07XG5cdFx0Ly8gXHRcdGNvbnRleHQuZmlsbFN0eWxlID0gJ3JnYignK3JlZCsnLCAnK2dyZWVuKycsICcrYmx1ZSsnKSc7XG5cblx0XHQvLyBcdFx0Ly8gdmFyIG4gPSBub2lzZS5zYW1wbGUoeCoobm9pc2VTaXplL3NhbXBsZVdpZHRoKSwgeSoobm9pc2VTaXplL3NhbXBsZUhlaWdodCkpO1xuXHRcdC8vIFx0XHQvLyBjb250ZXh0LmZpbGxTdHlsZSA9ICdoc2woMCwgMCUsICcrKChuLzIrMC41KSoxMDApKyclKSc7XG5cdFx0Ly8gXHRcdGNvbnRleHQuZmlsbFJlY3QoeCwgeSwgMSwgMSk7XG5cdFx0Ly8gXHR9XG5cdFx0Ly8gfVxuXHRcdFxuXG5cdFx0Zm9yICh2YXIgaT0wOyBpPHBhcnRpY2xlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHAgPSBwYXJ0aWNsZXNbaV07XG5cblx0XHRcdGlmIChwLm1vdGlvbilcblx0XHRcdFx0cC5wb3NpdGlvbi5hZGQocC52ZWxvY2l0eSk7XG5cblx0XHRcdC8vYWRkIGluIG91ciBtb3Rpb25cblx0XHRcdHZhciBweCA9IH5+cC5wb3NpdGlvbi54LFxuXHRcdFx0XHRweSA9IH5+cC5wb3NpdGlvbi55O1xuXG5cdFx0XHR2YXIgc2FtcGxlV2lkdGggPSB3aWR0aCxcblx0XHRcdFx0c2FtcGxlSGVpZ2h0ID0gd2lkdGg7XG5cblx0XHRcdHZhciBuID0gbm9pc2Uuc2FtcGxlKHB4Kihub2lzZVNpemUvc2FtcGxlV2lkdGgpLCBweSoobm9pc2VTaXplL3NhbXBsZUhlaWdodCkpO1xuXG5cdFx0XHR2YXIgYW5nbGUgPSBuICogTWF0aC5QSSAqIDIgKiBvcHRpb25zLmFuZ2xlO1xuXHRcdFx0XG5cdFx0XHR0bXAuc2V0KCBNYXRoLmNvcyhhbmdsZSksIE1hdGguc2luKGFuZ2xlKSApO1xuXHRcdFx0cC52ZWxvY2l0eS5hZGQodG1wKTtcblx0XHRcdHAudmVsb2NpdHkubm9ybWFsaXplKCk7XG5cblx0XHRcdC8vIGlmIChwLnBvc2l0aW9uLnggPiB3aWR0aCB8fCBwLnBvc2l0aW9uLnggPCAwIHx8IHAucG9zaXRpb24ueSA+IGhlaWdodCB8fCBwLnBvc2l0aW9uLnkgPCAwICkge1xuXHRcdFx0Ly8gXHRwLnJlc2V0KCk7XG5cdFx0XHQvLyB9XG5cblx0XHRcdGlmICgvKnAucG9zaXRpb24ueCA8IDAgfHwgKi9wLnBvc2l0aW9uLnggPiB3aWR0aCB8fCBwLnBvc2l0aW9uLnkgPiBoZWlnaHQgfHwgcC5wb3NpdGlvbi55IDwgMCkge1xuXHRcdFx0XHRwLnJlc2V0KCk7XG5cdFx0XHR9XG5cblx0XHRcdHZhciByb3QgPSAobi8yKzAuNSk7XG5cdFx0XHR2YXIgaHVlID0gKG5vaXNlLm9mZnNldCAlIDUwKS81MCAqIHJvdDtcblxuXHRcdFx0dmFyIGltZ1ggPSBweCxcblx0XHRcdFx0aW1nWSA9IHB5O1xuXHRcdFx0Ly8gdmFyIGltZ1ggPXB4LShtb3VzZS54KSxcblx0XHRcdC8vIFx0aW1nWSA9IHB5LShtb3VzZS55KTtcblx0XHRcdHZhciBweEluZGV4ID0gKGltZ1ggKyAoaW1nWSAqIGltYWdlV2lkdGgpKSo0O1xuXHRcdFx0dmFyIHJlZCA9IGltYWdlUGl4ZWxzWyBweEluZGV4IF0sXG5cdFx0XHRcdGdyZWVuID0gaW1hZ2VQaXhlbHNbIHB4SW5kZXggKyAxXSxcblx0XHRcdFx0Ymx1ZSA9IGltYWdlUGl4ZWxzW3B4SW5kZXggKyAyXTtcblxuXHRcdFx0Ly8gdmFyIGFscGhhID0gTWF0aC5zaW4odGltZSowLjEpKjEwMCsxMDA7XG5cdFx0XHR2YXIgYWxwaGEgPSBvcHRpb25zLmh1ZTtcblxuXHRcdFx0Ly8gQ0lFIGx1bWluYW5jZSBmb3IgdGhlIFJHQlxuXHRcdFx0dmFyIHZhbCA9IDAuMjEyNiAqIChyZWQvMjU1KSArIDAuNzE1MiAqIChncmVlbi8yNTUpICsgMC4wNzIyICogKGJsdWUvMjU1KTtcblx0XHRcdFxuXG5cdFx0XHR2YXIgYnJpZ2h0bmVzcyA9IG9wdGlvbnMuZGFya2VuID8gdmFsIDogMS4wO1xuXHRcdFx0XG5cdFx0XHQvLyBjb250ZXh0LnN0cm9rZVN0eWxlID0gJ2hzbCgnK2xlcnAoYWxwaGEsIGFscGhhLTEwMCwgcm90KSsnLCAnKygxLXJlZC8yNTUpKmxlcnAoMC43LCAxLCByb3QpKjEwMCsnJSwgJytsZXJwKDAuNDUsIDAuNTUsIHJvdCkqMTAwKyclKSc7XG5cdFx0XHRpZiAob3B0aW9ucy51c2VPcmlnaW5hbClcblx0XHRcdFx0Y29udGV4dC5zdHJva2VTdHlsZSA9ICdyZ2IoJyt+fihyZWQqYnJpZ2h0bmVzcykrJywgJyt+fihncmVlbipicmlnaHRuZXNzKSsnLCAnK35+KGJsdWUqYnJpZ2h0bmVzcykrJyknO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRjb250ZXh0LnN0cm9rZVN0eWxlID0gJ2hzbCgnK2xlcnAoYWxwaGEsIGFscGhhLTEwMCwgcm90KSsnLCAnKygxLXZhbCkqbGVycCgwLjIsIDAuOSwgcm90KSpvcHRpb25zLnNhdHVyYXRpb24qMTAwKyclLCAnKyh2YWwpKmxlcnAoMC40NSwgMSwgcm90KSpicmlnaHRuZXNzKm9wdGlvbnMubGlnaHRuZXNzKjEwMCsnJSknO1xuXG5cdFx0XHR2YXIgcyA9IDI7XG5cblx0XHRcdC8vIGNvbnRleHQuZmlsbFN0eWxlID0gJ2JsYWNrJztcblx0XHRcdC8vIGNvbnRleHQuZmlsbFJlY3QocC5wb3NpdGlvbi54LCBwLnBvc2l0aW9uLnksIDEsIDEpO1xuXG5cdFx0IFx0Y29udGV4dC5iZWdpblBhdGgoKTtcblx0XHRcdGNvbnRleHQubW92ZVRvKHAucG9zaXRpb24ueCwgcC5wb3NpdGlvbi55KTtcblx0XHRcdHZhciBsaW5lU2l6ZSA9IChvcHRpb25zLmxlbmd0aCoobi8yKzAuNSkqcC5zaXplKTtcblx0XHRcdHRtcC5jb3B5KHAucG9zaXRpb24pO1xuXHRcdFx0dG1wMi5jb3B5KHAudmVsb2NpdHkpLnNjYWxlKGxpbmVTaXplKTtcblx0XHRcdHRtcC5hZGQodG1wMik7XG5cdFx0XHRjb250ZXh0LmxpbmVUbyh0bXAueCwgdG1wLnkpO1xuXHRcdFx0Y29udGV4dC5zdHJva2UoKTtcblx0XHRcdGNvbnRleHQuZ2xvYmFsQWxwaGEgPSBvcHRpb25zLmFscGhhO1xuXHRcdFx0Y29udGV4dC5saW5lV2lkdGggPSBvcHRpb25zLnRoaWNrbmVzcyoobi8yKzAuNSk7XG5cdFx0XHRjb250ZXh0LmxpbmVDYXAgPSBvcHRpb25zLnJvdW5kID8gJ3JvdW5kJyA6ICdzcXVhcmUnO1xuXG5cdFx0XHRwLnNpemUgKz0gMC4xICogb3B0aW9ucy5zcGVlZCAqIHAuc3BlZWQ7XG5cdFx0XHRpZiAocC5zaXplID49IG9wdGlvbnMubGlmZSkge1xuXHRcdFx0XHRwLnJlc2V0KHdpZHRoLCBoZWlnaHQpLnJhbmRvbSgpO1x0XG5cdFx0XHR9XG5cdFx0XHRcblx0XHR9XG5cblx0XHQvLyBzdHJva2VDb3VudCArPSBwYXJ0aWNsZXMubGVuZ3RoO1xuXG5cblx0XHRwcmV2aWV3Q29udGV4dC5kcmF3SW1hZ2UoY2FudmFzLCAwLCAwLCBwcmV2aWV3V2lkdGgsIHByZXZpZXdIZWlnaHQpO1xuXHR9XG59KTsiLCJ2YXIgVmVjdG9yMiA9IHJlcXVpcmUoJ3ZlY21hdGgnKS5WZWN0b3IyO1xuXG5mdW5jdGlvbiBQYXJ0aWNsZSh4LCB5LCB2eCwgdnkpIHtcblx0dGhpcy5wb3NpdGlvbiA9IG5ldyBWZWN0b3IyKHgsIHkpO1xuXHR0aGlzLnZlbG9jaXR5ID0gbmV3IFZlY3RvcjIodngsIHZ5KTtcblx0dGhpcy5zaXplID0gMDtcblx0dGhpcy5zcGVlZCA9IE1hdGgucmFuZG9tKCk7XG5cdHRoaXMuYnJpZ2h0bmVzcyA9IE1hdGgucmFuZG9tKCk7XG59XG5cblxuUGFydGljbGUucHJvdG90eXBlLnJhbmRvbSA9IGZ1bmN0aW9uKCkge1xuXHQvLyB0aGlzLnZlbG9jaXR5LnNldChNYXRoLnJhbmRvbSgpKjItMSwgTWF0aC5yYW5kb20oKSoyLTEpO1xuXHR0aGlzLnNpemUgPSBNYXRoLnJhbmRvbSgpO1xuXHRyZXR1cm4gdGhpcztcbn1cblBhcnRpY2xlLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uKHdpZHRoLCBoZWlnaHQpIHtcblx0d2lkdGg9d2lkdGh8fDA7XG5cdGhlaWdodD1oZWlnaHR8fDA7XG5cblx0dGhpcy5zaXplID0gMDtcblx0dGhpcy5icmlnaHRuZXNzID0gTWF0aC5yYW5kb20oKTtcblxuXHQvLyB0aGlzLnZlbG9jaXR5LnNldChNYXRoLnJhbmRvbSgpKjItMSwgTWF0aC5yYW5kb20oKSoyLTEpO1xuXHR0aGlzLnZlbG9jaXR5LnNldCgwLCAwKTtcblx0dGhpcy5wb3NpdGlvbi5zZXQoTWF0aC5yYW5kb20oKSp3aWR0aCwgTWF0aC5yYW5kb20oKSpoZWlnaHQpO1xuXHRyZXR1cm4gdGhpcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQYXJ0aWNsZTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0UGFydGljbGU6IHJlcXVpcmUoJy4vUGFydGljbGUnKVxufTsiLCJ2YXIgQ2xhc3MgPSByZXF1aXJlKCdrbGFzc2UnKTtcbnZhciBTaW1wbGV4Tm9pc2UgPSByZXF1aXJlKCdzaW1wbGV4LW5vaXNlJyk7XG52YXIgbGVycCA9IHJlcXVpcmUoJ2ludGVycG9sYXRpb24nKS5sZXJwO1xudmFyIHNhbXBsaW5nID0gcmVxdWlyZSgnLi9zYW1wbGluZycpO1xuXG52YXIgUFJORyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNlZWQgPSAxO1xuICAgIHRoaXMucmFuZG9tID0gZnVuY3Rpb24oKSB7IHJldHVybiAodGhpcy5nZW4oKSAvIDIxNDc0ODM2NDcpOyB9O1xuICAgIHRoaXMuZ2VuID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnNlZWQgPSAodGhpcy5zZWVkICogMTY4MDcpICUgMjE0NzQ4MzY0NzsgfTtcbn07XG5cbnZhciByYW5kID0gdW5kZWZpbmVkO1xuXG4vL3dlIGNhbiB1c2UgYSBkZXRlcm1pbmlzdGljIHJhbmRvbSBnZW5lcmF0b3IgaWYgd2Ugd2FudC4uLlxuLy9yYW5kID0gbmV3IFBSTkcoKTtcblxudmFyIHNpbXBsZXggPSBuZXcgU2ltcGxleE5vaXNlKHJhbmQpO1xuXG52YXIgTm9pc2VNYXAgPSBuZXcgQ2xhc3Moe1xuXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oc2l6ZSkge1xuICAgICAgICBpZiAoIXNpemUpXG4gICAgICAgICAgICB0aHJvdyBcIm5vIHNpemUgc3BlY2lmaWVkIHRvIE5vaXNlTWFwXCI7XG5cbiAgICAgICAgdGhpcy5zaXplID0gc2l6ZTsgICBcbiAgICAgICAgdGhpcy5zY2FsZSA9IDIwO1xuICAgICAgICB0aGlzLm9mZnNldCA9IDA7XG4gICAgICAgIHRoaXMuc21vb3RoID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zZWFtbGVzcyA9IGZhbHNlO1xuXG4gICAgICAgIHRoaXMuZGF0YSA9IG5ldyBGbG9hdDMyQXJyYXkodGhpcy5zaXplICogdGhpcy5zaXplKTtcbiAgICB9LFxuICAgIFxuICAgIHNlYW1sZXNzTm9pc2U6IGZ1bmN0aW9uKHMsIHQsIHNjYWxlLCBjeCwgY3ksIGN6LCBjdykge1xuICAgICAgICAvLyBHZW5lcmF0ZSB0aGUgNGQgY29vcmRpbmF0ZXMgdGhhdCB3cmFwIGFyb3VuZCBzZWFtbGVzc2x5XG4gICAgICAgIHZhciByID0gc2NhbGUgLyAoMiAqIE1hdGguUEkpO1xuICAgICAgICB2YXIgYXh5ID0gMiAqIE1hdGguUEkgKiBzIC8gc2NhbGU7ICAgICAgICBcbiAgICAgICAgdmFyIHggPSByICogTWF0aC5jb3MoYXh5KTtcbiAgICAgICAgdmFyIHkgPSByICogTWF0aC5zaW4oYXh5KTtcbiAgICAgICAgXG4gICAgICAgIHZhciBhencgPSAyICogTWF0aC5QSSAqIHQgLyBzY2FsZTsgICAgICAgIFxuICAgICAgICB2YXIgeiA9IHIgKiBNYXRoLmNvcyhhencpO1xuICAgICAgICB2YXIgdyA9IHIgKiBNYXRoLnNpbihhencpO1xuXG4gICAgICAgIHJldHVybiBzaW1wbGV4Lm5vaXNlNEQoY3ggKyB4LCBjeSArIHksIGN6ICsgeiwgY3cgKyB3KTtcbiAgICB9LFxuXG4gICAgZ2VuZXJhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbm9pc2VNYXAgPSB0aGlzLmRhdGEsXG4gICAgICAgICAgICBub2lzZVNpemUgPSB0aGlzLnNpemUsXG4gICAgICAgICAgICBub2lzZU9mZiA9IHRoaXMub2Zmc2V0LFxuICAgICAgICAgICAgc2VhbWxlc3MgPSB0aGlzLnNlYW1sZXNzLFxuICAgICAgICAgICAgem9vbSA9IHRoaXMuc2NhbGU7XG5cbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPG5vaXNlTWFwLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgeCA9IGkgJSBub2lzZVNpemUsXG4gICAgICAgICAgICAgICAgeSA9IH5+KCBpIC8gbm9pc2VTaXplICk7XG5cbiAgICAgICAgICAgIGlmIChzZWFtbGVzcylcbiAgICAgICAgICAgICAgICBub2lzZU1hcFtpXSA9IHRoaXMuc2VhbWxlc3NOb2lzZSh4L25vaXNlU2l6ZSp6b29tICsgbm9pc2VPZmYsIHkvbm9pc2VTaXplKnpvb20gKyBub2lzZU9mZiwgem9vbSwgMCwgMCwgMCwgMCk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgbm9pc2VNYXBbaV0gPSBzaW1wbGV4Lm5vaXNlM0QoeC9ub2lzZVNpemUgKiB6b29tLCB5L25vaXNlU2l6ZSAqIHpvb20sIG5vaXNlT2ZmKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBzYW1wbGU6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgICAgaWYgKHRoaXMuc21vb3RoKVxuICAgICAgICAgICAgcmV0dXJuIHNhbXBsaW5nLmJpbGluZWFyKHRoaXMuZGF0YSwgdGhpcy5zaXplLCB4LCB5KTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIHNhbXBsaW5nLm5lYXJlc3QodGhpcy5kYXRhLCB0aGlzLnNpemUsIHgsIHkpO1xuICAgIH0sXG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IE5vaXNlTWFwOyIsInZhciBjYW52YXMsIGNvbnRleHQ7XG5cbm1vZHVsZS5leHBvcnRzLmdldEltYWdlRGF0YSA9IGZ1bmN0aW9uKGltYWdlLCB3aWR0aCwgaGVpZ2h0KSB7XG5cdGlmICghY2FudmFzKSB7XG5cdFx0Y2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcblx0XHRjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcblx0fVxuXG5cdHdpZHRoID0gKHdpZHRofHx3aWR0aD09PTApID8gd2lkdGggOiBpbWFnZS53aWR0aDtcblx0aGVpZ2h0ID0gKGhlaWdodHx8aGVpZ2h0PT09MCkgPyBoZWlnaHQgOiBpbWFnZS5oZWlnaHQ7XG5cblx0Y2FudmFzLndpZHRoID0gd2lkdGg7XG5cdGNhbnZhcy5oZWlnaHQgPSBoZWlnaHQ7XG5cdFxuXHRjb250ZXh0Lmdsb2JhbEFscGhhID0gMTtcblx0Y29udGV4dC5jbGVhclJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodCk7XG5cdGNvbnRleHQuZHJhd0ltYWdlKGltYWdlLCAwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcblxuXHR2YXIgaW1nRGF0YSA9IGNvbnRleHQuZ2V0SW1hZ2VEYXRhKDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuXHRyZXR1cm4gaW1nRGF0YTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLnJlbGVhc2UgPSBmdW5jdGlvbigpIHtcblx0aWYgKGNhbnZhcykge1xuXHRcdGNhbnZhcyA9IG51bGw7XG5cdFx0Y29udGV4dCA9IG51bGw7XG5cdH1cdFxufTtcbiIsInZhciBsZXJwID0gcmVxdWlyZSgnaW50ZXJwb2xhdGlvbicpLmxlcnA7XG52YXIgc21vb3Roc3RlcCA9IHJlcXVpcmUoJ2ludGVycG9sYXRpb24nKS5zbW9vdGhzdGVwO1xuXG5tb2R1bGUuZXhwb3J0cy5uZWFyZXN0ID0gZnVuY3Rpb24oZGF0YSwgc2l6ZSwgeCwgeSkge1xuICAgIHZhciBweCA9IH5+eCAlIHNpemUsXG4gICAgICAgIHB5ID0gfn55ICUgc2l6ZTtcbiAgICByZXR1cm4gZGF0YVsgcHggKyAocHkgKiBzaXplKSBdO1xufTtcblxubW9kdWxlLmV4cG9ydHMuYmlsaW5lYXIgPSBmdW5jdGlvbihkYXRhLCBzaXplLCB4LCB5KSB7XG4gICAgLy9iaWxpbmVhciBpbnRlcnBvbGF0aW9uIFxuICAgIC8vaHR0cDovL3d3dy5zY3JhdGNoYXBpeGVsLmNvbS9sZXNzb25zLzNkLWFkdmFuY2VkLWxlc3NvbnMvbm9pc2UtcGFydC0xL2NyZWF0aW5nLWEtc2ltcGxlLTJkLW5vaXNlL1xuICAgIHZhciB4aSA9IE1hdGguZmxvb3IoIHggKTtcbiAgICB2YXIgeWkgPSBNYXRoLmZsb29yKCB5ICk7XG4gXG4gICAgdmFyIHR4ID0geCAtIHhpO1xuICAgIHZhciB0eSA9IHkgLSB5aTtcblxuICAgIHZhciBtYXNrID0gc2l6ZS0xO1xuIFxuICAgIHZhciByeDAgPSB4aSAmIG1hc2s7XG4gICAgdmFyIHJ4MSA9ICggcngwICsgMSApICYgbWFzaztcbiAgICB2YXIgcnkwID0geWkgJiBtYXNrO1xuICAgIHZhciByeTEgPSAoIHJ5MCArIDEgKSAmIG1hc2s7XG4gXG4gICAgLy8vIHJhbmRvbSB2YWx1ZXMgYXQgdGhlIGNvcm5lcnMgb2YgdGhlIGNlbGwgdXNpbmcgcGVybXV0YXRpb24gdGFibGVcbiAgICB2YXIgYzAwID0gZGF0YVsgKHJ5MCAqIHNpemUgKyByeDApIF07XG4gICAgdmFyIGMxMCA9IGRhdGFbIChyeTAgKiBzaXplICsgcngxKSBdO1xuICAgIHZhciBjMDEgPSBkYXRhWyAocnkxICogc2l6ZSArIHJ4MCkgXTtcbiAgICB2YXIgYzExID0gZGF0YVsgKHJ5MSAqIHNpemUgKyByeDEpIF07XG5cbiAgICAvLy8gcmVtYXBwaW5nIG9mIHR4IGFuZCB0eSB1c2luZyB0aGUgU21vb3Roc3RlcCBmdW5jdGlvblxuICAgIHZhciBzeCA9IHNtb290aHN0ZXAoIDAsIDEsIHR4ICk7XG4gICAgdmFyIHN5ID0gc21vb3Roc3RlcCggMCwgMSwgdHkgKTtcbiBcbiAgICAvLy8gbGluZWFybHkgaW50ZXJwb2xhdGUgdmFsdWVzIGFsb25nIHRoZSB4IGF4aXNcbiAgICB2YXIgbngwID0gbGVycCggYzAwLCBjMTAsIHN4ICk7XG4gICAgdmFyIG54MSA9IGxlcnAoIGMwMSwgYzExLCBzeCApO1xuICAgIFxuICAgIC8vLyBsaW5lYXJseSBpbnRlcnBvbGF0ZSB0aGUgbngwL254MSBhbG9uZyB0aGV5IHkgYXhpc1xuICAgIHZhciB2ID0gbGVycCggbngwLCBueDEsIHN5ICk7XG4gICAgcmV0dXJuIHY7XG59OyAiXX0=
