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
			TweenLite.delayedCall(0.5, animateIn.bind(this));
		}).on('touchmove', function(ev) {
			ev.preventDefault()
		});

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
		options.painting = true;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvcHJvamVjdHMvaW1wcmVzc2lvbmlzdC9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvbm9kZV9tb2R1bGVzL2ludGVycG9sYXRpb24vaW5kZXguanMiLCIvcHJvamVjdHMvaW1wcmVzc2lvbmlzdC9ub2RlX21vZHVsZXMva2xhc3NlL2luZGV4LmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvbm9kZV9tb2R1bGVzL3JhZi5qcy9yYWYuanMiLCIvcHJvamVjdHMvaW1wcmVzc2lvbmlzdC9ub2RlX21vZHVsZXMvc2ltcGxleC1ub2lzZS9zaW1wbGV4LW5vaXNlLmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvbm9kZV9tb2R1bGVzL3ZlY21hdGgvbGliL01hdHJpeDMuanMiLCIvcHJvamVjdHMvaW1wcmVzc2lvbmlzdC9ub2RlX21vZHVsZXMvdmVjbWF0aC9saWIvTWF0cml4NC5qcyIsIi9wcm9qZWN0cy9pbXByZXNzaW9uaXN0L25vZGVfbW9kdWxlcy92ZWNtYXRoL2xpYi9RdWF0ZXJuaW9uLmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvbm9kZV9tb2R1bGVzL3ZlY21hdGgvbGliL1ZlY3RvcjIuanMiLCIvcHJvamVjdHMvaW1wcmVzc2lvbmlzdC9ub2RlX21vZHVsZXMvdmVjbWF0aC9saWIvVmVjdG9yMy5qcyIsIi9wcm9qZWN0cy9pbXByZXNzaW9uaXN0L25vZGVfbW9kdWxlcy92ZWNtYXRoL2xpYi9WZWN0b3I0LmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvbm9kZV9tb2R1bGVzL3ZlY21hdGgvbGliL2NvbW1vbi5qcyIsIi9wcm9qZWN0cy9pbXByZXNzaW9uaXN0L25vZGVfbW9kdWxlcy92ZWNtYXRoL2xpYi9pbmRleC5qcyIsIi9wcm9qZWN0cy9pbXByZXNzaW9uaXN0L3NyYy9mYWtlXzJhYTY4YmEyLmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvc3JjL2ltcHJlc3Npb24vUGFydGljbGUuanMiLCIvcHJvamVjdHMvaW1wcmVzc2lvbmlzdC9zcmMvaW1wcmVzc2lvbi9pbmRleC5qcyIsIi9wcm9qZWN0cy9pbXByZXNzaW9uaXN0L3NyYy91dGlsL05vaXNlTWFwLmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvc3JjL3V0aWwvaW1hZ2VkYXRhLmpzIiwiL3Byb2plY3RzL2ltcHJlc3Npb25pc3Qvc3JjL3V0aWwvc2FtcGxpbmcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0WkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1cUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKiBVdGlsaXR5IGZ1bmN0aW9uIGZvciBsaW5lYXIgaW50ZXJwb2xhdGlvbi4gKi9cbm1vZHVsZS5leHBvcnRzLmxlcnAgPSBmdW5jdGlvbih2MCwgdjEsIHQpIHtcbiAgICByZXR1cm4gdjAqKDEtdCkrdjEqdDtcbn07XG5cbi8qKiBVdGlsaXR5IGZ1bmN0aW9uIGZvciBIZXJtaXRlIGludGVycG9sYXRpb24uICovXG5tb2R1bGUuZXhwb3J0cy5zbW9vdGhzdGVwID0gZnVuY3Rpb24odjAsIHYxLCB0KSB7XG4gICAgLy8gU2NhbGUsIGJpYXMgYW5kIHNhdHVyYXRlIHggdG8gMC4uMSByYW5nZVxuICAgIHQgPSBNYXRoLm1heCgwLjAsIE1hdGgubWluKDEuMCwgKHQgLSB2MCkvKHYxIC0gdjApICkpO1xuICAgIC8vIEV2YWx1YXRlIHBvbHlub21pYWxcbiAgICByZXR1cm4gdCp0KigzIC0gMip0KTtcbn07IiwiZnVuY3Rpb24gaGFzR2V0dGVyT3JTZXR0ZXIoZGVmKSB7XG5cdHJldHVybiAoISFkZWYuZ2V0ICYmIHR5cGVvZiBkZWYuZ2V0ID09PSBcImZ1bmN0aW9uXCIpIHx8ICghIWRlZi5zZXQgJiYgdHlwZW9mIGRlZi5zZXQgPT09IFwiZnVuY3Rpb25cIik7XG59XG5cbmZ1bmN0aW9uIGdldFByb3BlcnR5KGRlZmluaXRpb24sIGssIGlzQ2xhc3NEZXNjcmlwdG9yKSB7XG5cdC8vVGhpcyBtYXkgYmUgYSBsaWdodHdlaWdodCBvYmplY3QsIE9SIGl0IG1pZ2h0IGJlIGEgcHJvcGVydHlcblx0Ly90aGF0IHdhcyBkZWZpbmVkIHByZXZpb3VzbHkuXG5cdFxuXHQvL0ZvciBzaW1wbGUgY2xhc3MgZGVzY3JpcHRvcnMgd2UgY2FuIGp1c3QgYXNzdW1lIGl0cyBOT1QgcHJldmlvdXNseSBkZWZpbmVkLlxuXHR2YXIgZGVmID0gaXNDbGFzc0Rlc2NyaXB0b3IgXG5cdFx0XHRcdD8gZGVmaW5pdGlvbltrXSBcblx0XHRcdFx0OiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKGRlZmluaXRpb24sIGspO1xuXG5cdGlmICghaXNDbGFzc0Rlc2NyaXB0b3IgJiYgZGVmLnZhbHVlICYmIHR5cGVvZiBkZWYudmFsdWUgPT09IFwib2JqZWN0XCIpIHtcblx0XHRkZWYgPSBkZWYudmFsdWU7XG5cdH1cblxuXG5cdC8vVGhpcyBtaWdodCBiZSBhIHJlZ3VsYXIgcHJvcGVydHksIG9yIGl0IG1heSBiZSBhIGdldHRlci9zZXR0ZXIgdGhlIHVzZXIgZGVmaW5lZCBpbiBhIGNsYXNzLlxuXHRpZiAoIGRlZiAmJiBoYXNHZXR0ZXJPclNldHRlcihkZWYpICkge1xuXHRcdGlmICh0eXBlb2YgZGVmLmVudW1lcmFibGUgPT09IFwidW5kZWZpbmVkXCIpXG5cdFx0XHRkZWYuZW51bWVyYWJsZSA9IHRydWU7XG5cdFx0aWYgKHR5cGVvZiBkZWYuY29uZmlndXJhYmxlID09PSBcInVuZGVmaW5lZFwiKVxuXHRcdFx0ZGVmLmNvbmZpZ3VyYWJsZSA9IHRydWU7XG5cdFx0cmV0dXJuIGRlZjtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn1cblxuZnVuY3Rpb24gaGFzTm9uQ29uZmlndXJhYmxlKG9iaiwgaykge1xuXHR2YXIgcHJvcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqLCBrKTtcblx0aWYgKCFwcm9wKVxuXHRcdHJldHVybiBmYWxzZTtcblxuXHRpZiAocHJvcC52YWx1ZSAmJiB0eXBlb2YgcHJvcC52YWx1ZSA9PT0gXCJvYmplY3RcIilcblx0XHRwcm9wID0gcHJvcC52YWx1ZTtcblxuXHRpZiAocHJvcC5jb25maWd1cmFibGUgPT09IGZhbHNlKSBcblx0XHRyZXR1cm4gdHJ1ZTtcblxuXHRyZXR1cm4gZmFsc2U7XG59XG5cbi8vVE9ETzogT24gY3JlYXRlLCBcbi8vXHRcdE9uIG1peGluLCBcblxuZnVuY3Rpb24gZXh0ZW5kKGN0b3IsIGRlZmluaXRpb24sIGlzQ2xhc3NEZXNjcmlwdG9yLCBleHRlbmQpIHtcblx0Zm9yICh2YXIgayBpbiBkZWZpbml0aW9uKSB7XG5cdFx0aWYgKCFkZWZpbml0aW9uLmhhc093blByb3BlcnR5KGspKVxuXHRcdFx0Y29udGludWU7XG5cblx0XHR2YXIgZGVmID0gZ2V0UHJvcGVydHkoZGVmaW5pdGlvbiwgaywgaXNDbGFzc0Rlc2NyaXB0b3IpO1xuXG5cdFx0aWYgKGRlZiAhPT0gZmFsc2UpIHtcblx0XHRcdC8vSWYgRXh0ZW5kcyBpcyB1c2VkLCB3ZSB3aWxsIGNoZWNrIGl0cyBwcm90b3R5cGUgdG8gc2VlIGlmIFxuXHRcdFx0Ly90aGUgZmluYWwgdmFyaWFibGUgZXhpc3RzLlxuXHRcdFx0XG5cdFx0XHR2YXIgcGFyZW50ID0gZXh0ZW5kIHx8IGN0b3I7XG5cdFx0XHRpZiAoaGFzTm9uQ29uZmlndXJhYmxlKHBhcmVudC5wcm90b3R5cGUsIGspKSB7XG5cblx0XHRcdFx0Ly9qdXN0IHNraXAgdGhlIGZpbmFsIHByb3BlcnR5XG5cdFx0XHRcdGlmIChDbGFzcy5pZ25vcmVGaW5hbHMpXG5cdFx0XHRcdFx0Y29udGludWU7XG5cblx0XHRcdFx0Ly9XZSBjYW5ub3QgcmUtZGVmaW5lIGEgcHJvcGVydHkgdGhhdCBpcyBjb25maWd1cmFibGU9ZmFsc2UuXG5cdFx0XHRcdC8vU28gd2Ugd2lsbCBjb25zaWRlciB0aGVtIGZpbmFsIGFuZCB0aHJvdyBhbiBlcnJvci4gVGhpcyBpcyBieVxuXHRcdFx0XHQvL2RlZmF1bHQgc28gaXQgaXMgY2xlYXIgdG8gdGhlIGRldmVsb3BlciB3aGF0IGlzIGhhcHBlbmluZy5cblx0XHRcdFx0Ly9Zb3UgY2FuIHNldCBpZ25vcmVGaW5hbHMgdG8gdHJ1ZSBpZiB5b3UgbmVlZCB0byBleHRlbmQgYSBjbGFzc1xuXHRcdFx0XHQvL3doaWNoIGhhcyBjb25maWd1cmFibGU9ZmFsc2U7IGl0IHdpbGwgc2ltcGx5IG5vdCByZS1kZWZpbmUgZmluYWwgcHJvcGVydGllcy5cblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiY2Fubm90IG92ZXJyaWRlIGZpbmFsIHByb3BlcnR5ICdcIitrXG5cdFx0XHRcdFx0XHRcdCtcIicsIHNldCBDbGFzcy5pZ25vcmVGaW5hbHMgPSB0cnVlIHRvIHNraXBcIik7XG5cdFx0XHR9XG5cblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjdG9yLnByb3RvdHlwZSwgaywgZGVmKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y3Rvci5wcm90b3R5cGVba10gPSBkZWZpbml0aW9uW2tdO1xuXHRcdH1cblxuXHR9XG59XG5cbi8qKlxuICovXG5mdW5jdGlvbiBtaXhpbihteUNsYXNzLCBtaXhpbnMpIHtcblx0aWYgKCFtaXhpbnMpXG5cdFx0cmV0dXJuO1xuXG5cdGlmICghQXJyYXkuaXNBcnJheShtaXhpbnMpKVxuXHRcdG1peGlucyA9IFttaXhpbnNdO1xuXG5cdGZvciAodmFyIGk9MDsgaTxtaXhpbnMubGVuZ3RoOyBpKyspIHtcblx0XHRleHRlbmQobXlDbGFzcywgbWl4aW5zW2ldLnByb3RvdHlwZSB8fCBtaXhpbnNbaV0pO1xuXHR9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBjbGFzcyB3aXRoIHRoZSBnaXZlbiBkZXNjcmlwdG9yLlxuICogVGhlIGNvbnN0cnVjdG9yLCBkZWZpbmVkIGJ5IHRoZSBuYW1lIGBpbml0aWFsaXplYCxcbiAqIGlzIGFuIG9wdGlvbmFsIGZ1bmN0aW9uLiBJZiB1bnNwZWNpZmllZCwgYW4gYW5vbnltb3VzXG4gKiBmdW5jdGlvbiB3aWxsIGJlIHVzZWQgd2hpY2ggY2FsbHMgdGhlIHBhcmVudCBjbGFzcyAoaWZcbiAqIG9uZSBleGlzdHMpLiBcbiAqXG4gKiBZb3UgY2FuIGFsc28gdXNlIGBFeHRlbmRzYCBhbmQgYE1peGluc2AgdG8gcHJvdmlkZSBzdWJjbGFzc2luZ1xuICogYW5kIGluaGVyaXRhbmNlLlxuICpcbiAqIEBjbGFzcyAgQ2xhc3NcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtPYmplY3R9IGRlZmluaXRpb24gYSBkaWN0aW9uYXJ5IG9mIGZ1bmN0aW9ucyBmb3IgdGhlIGNsYXNzXG4gKiBAZXhhbXBsZVxuICpcbiAqIFx0XHR2YXIgTXlDbGFzcyA9IG5ldyBDbGFzcyh7XG4gKiBcdFx0XG4gKiBcdFx0XHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcbiAqIFx0XHRcdFx0dGhpcy5mb28gPSAyLjA7XG4gKiBcdFx0XHR9LFxuICpcbiAqIFx0XHRcdGJhcjogZnVuY3Rpb24oKSB7XG4gKiBcdFx0XHRcdHJldHVybiB0aGlzLmZvbyArIDU7XG4gKiBcdFx0XHR9XG4gKiBcdFx0fSk7XG4gKi9cbmZ1bmN0aW9uIENsYXNzKGRlZmluaXRpb24pIHtcblx0aWYgKCFkZWZpbml0aW9uKVxuXHRcdGRlZmluaXRpb24gPSB7fTtcblxuXHQvL1RoZSB2YXJpYWJsZSBuYW1lIGhlcmUgZGljdGF0ZXMgd2hhdCB3ZSBzZWUgaW4gQ2hyb21lIGRlYnVnZ2VyXG5cdHZhciBpbml0aWFsaXplO1xuXHR2YXIgRXh0ZW5kcztcblxuXHRpZiAoZGVmaW5pdGlvbi5pbml0aWFsaXplKSB7XG5cdFx0aWYgKHR5cGVvZiBkZWZpbml0aW9uLmluaXRpYWxpemUgIT09IFwiZnVuY3Rpb25cIilcblx0XHRcdHRocm93IG5ldyBFcnJvcihcImluaXRpYWxpemUgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuXHRcdGluaXRpYWxpemUgPSBkZWZpbml0aW9uLmluaXRpYWxpemU7XG5cblx0XHQvL1VzdWFsbHkgd2Ugc2hvdWxkIGF2b2lkIFwiZGVsZXRlXCIgaW4gVjggYXQgYWxsIGNvc3RzLlxuXHRcdC8vSG93ZXZlciwgaXRzIHVubGlrZWx5IHRvIG1ha2UgYW55IHBlcmZvcm1hbmNlIGRpZmZlcmVuY2Vcblx0XHQvL2hlcmUgc2luY2Ugd2Ugb25seSBjYWxsIHRoaXMgb24gY2xhc3MgY3JlYXRpb24gKGkuZS4gbm90IG9iamVjdCBjcmVhdGlvbikuXG5cdFx0ZGVsZXRlIGRlZmluaXRpb24uaW5pdGlhbGl6ZTtcblx0fSBlbHNlIHtcblx0XHRpZiAoZGVmaW5pdGlvbi5FeHRlbmRzKSB7XG5cdFx0XHR2YXIgYmFzZSA9IGRlZmluaXRpb24uRXh0ZW5kcztcblx0XHRcdGluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGJhc2UuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0XHRcdH07IFxuXHRcdH0gZWxzZSB7XG5cdFx0XHRpbml0aWFsaXplID0gZnVuY3Rpb24gKCkge307IFxuXHRcdH1cblx0fVxuXG5cdGlmIChkZWZpbml0aW9uLkV4dGVuZHMpIHtcblx0XHRpbml0aWFsaXplLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoZGVmaW5pdGlvbi5FeHRlbmRzLnByb3RvdHlwZSk7XG5cdFx0aW5pdGlhbGl6ZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBpbml0aWFsaXplO1xuXHRcdC8vZm9yIGdldE93blByb3BlcnR5RGVzY3JpcHRvciB0byB3b3JrLCB3ZSBuZWVkIHRvIGFjdFxuXHRcdC8vZGlyZWN0bHkgb24gdGhlIEV4dGVuZHMgKG9yIE1peGluKVxuXHRcdEV4dGVuZHMgPSBkZWZpbml0aW9uLkV4dGVuZHM7XG5cdFx0ZGVsZXRlIGRlZmluaXRpb24uRXh0ZW5kcztcblx0fSBlbHNlIHtcblx0XHRpbml0aWFsaXplLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGluaXRpYWxpemU7XG5cdH1cblxuXHQvL0dyYWIgdGhlIG1peGlucywgaWYgdGhleSBhcmUgc3BlY2lmaWVkLi4uXG5cdHZhciBtaXhpbnMgPSBudWxsO1xuXHRpZiAoZGVmaW5pdGlvbi5NaXhpbnMpIHtcblx0XHRtaXhpbnMgPSBkZWZpbml0aW9uLk1peGlucztcblx0XHRkZWxldGUgZGVmaW5pdGlvbi5NaXhpbnM7XG5cdH1cblxuXHQvL0ZpcnN0LCBtaXhpbiBpZiB3ZSBjYW4uXG5cdG1peGluKGluaXRpYWxpemUsIG1peGlucyk7XG5cblx0Ly9Ob3cgd2UgZ3JhYiB0aGUgYWN0dWFsIGRlZmluaXRpb24gd2hpY2ggZGVmaW5lcyB0aGUgb3ZlcnJpZGVzLlxuXHRleHRlbmQoaW5pdGlhbGl6ZSwgZGVmaW5pdGlvbiwgdHJ1ZSwgRXh0ZW5kcyk7XG5cblx0cmV0dXJuIGluaXRpYWxpemU7XG59O1xuXG5DbGFzcy5leHRlbmQgPSBleHRlbmQ7XG5DbGFzcy5taXhpbiA9IG1peGluO1xuQ2xhc3MuaWdub3JlRmluYWxzID0gZmFsc2U7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xhc3M7IiwiLypcbiAqIHJhZi5qc1xuICogaHR0cHM6Ly9naXRodWIuY29tL25ncnltYW4vcmFmLmpzXG4gKlxuICogb3JpZ2luYWwgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHBvbHlmaWxsIGJ5IEVyaWsgTcO2bGxlclxuICogaW5zcGlyZWQgZnJvbSBwYXVsX2lyaXNoIGdpc3QgYW5kIHBvc3RcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMgbmdyeW1hblxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuICovXG5cbihmdW5jdGlvbih3aW5kb3cpIHtcblx0dmFyIGxhc3RUaW1lID0gMCxcblx0XHR2ZW5kb3JzID0gWyd3ZWJraXQnLCAnbW96J10sXG5cdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSxcblx0XHRjYW5jZWxBbmltYXRpb25GcmFtZSA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSxcblx0XHRpID0gdmVuZG9ycy5sZW5ndGg7XG5cblx0Ly8gdHJ5IHRvIHVuLXByZWZpeCBleGlzdGluZyByYWZcblx0d2hpbGUgKC0taSA+PSAwICYmICFyZXF1ZXN0QW5pbWF0aW9uRnJhbWUpIHtcblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdmVuZG9yc1tpXSArICdSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcblx0XHRjYW5jZWxBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2ZW5kb3JzW2ldICsgJ0NhbmNlbEFuaW1hdGlvbkZyYW1lJ107XG5cdH1cblxuXHQvLyBwb2x5ZmlsbCB3aXRoIHNldFRpbWVvdXQgZmFsbGJhY2tcblx0Ly8gaGVhdmlseSBpbnNwaXJlZCBmcm9tIEBkYXJpdXMgZ2lzdCBtb2Q6IGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL3BhdWxpcmlzaC8xNTc5NjcxI2NvbW1lbnQtODM3OTQ1XG5cdGlmICghcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8ICFjYW5jZWxBbmltYXRpb25GcmFtZSkge1xuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0XHR2YXIgbm93ID0gRGF0ZS5ub3coKSwgbmV4dFRpbWUgPSBNYXRoLm1heChsYXN0VGltZSArIDE2LCBub3cpO1xuXHRcdFx0cmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGxhc3RUaW1lID0gbmV4dFRpbWUpO1xuXHRcdFx0fSwgbmV4dFRpbWUgLSBub3cpO1xuXHRcdH07XG5cblx0XHRjYW5jZWxBbmltYXRpb25GcmFtZSA9IGNsZWFyVGltZW91dDtcblx0fVxuXG5cdC8vIGV4cG9ydCB0byB3aW5kb3dcblx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHJlcXVlc3RBbmltYXRpb25GcmFtZTtcblx0d2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gY2FuY2VsQW5pbWF0aW9uRnJhbWU7XG59KHdpbmRvdykpOyIsIi8qXG4gKiBBIGZhc3QgamF2YXNjcmlwdCBpbXBsZW1lbnRhdGlvbiBvZiBzaW1wbGV4IG5vaXNlIGJ5IEpvbmFzIFdhZ25lclxuICpcbiAqIEJhc2VkIG9uIGEgc3BlZWQtaW1wcm92ZWQgc2ltcGxleCBub2lzZSBhbGdvcml0aG0gZm9yIDJELCAzRCBhbmQgNEQgaW4gSmF2YS5cbiAqIFdoaWNoIGlzIGJhc2VkIG9uIGV4YW1wbGUgY29kZSBieSBTdGVmYW4gR3VzdGF2c29uIChzdGVndUBpdG4ubGl1LnNlKS5cbiAqIFdpdGggT3B0aW1pc2F0aW9ucyBieSBQZXRlciBFYXN0bWFuIChwZWFzdG1hbkBkcml6emxlLnN0YW5mb3JkLmVkdSkuXG4gKiBCZXR0ZXIgcmFuayBvcmRlcmluZyBtZXRob2QgYnkgU3RlZmFuIEd1c3RhdnNvbiBpbiAyMDEyLlxuICpcbiAqXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTIgSm9uYXMgV2FnbmVyXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nXG4gKiBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbiAqIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuICogd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuICogZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvXG4gKiBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG9cbiAqIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZVxuICogaW5jbHVkZWQgaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCxcbiAqIEVYUFJFU1MgT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuICogTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkRcbiAqIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkVcbiAqIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT05cbiAqIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTlxuICogV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG4gKlxuICovXG4oZnVuY3Rpb24gKCkge1xuXG52YXIgRjIgPSAwLjUgKiAoTWF0aC5zcXJ0KDMuMCkgLSAxLjApLFxuICAgIEcyID0gKDMuMCAtIE1hdGguc3FydCgzLjApKSAvIDYuMCxcbiAgICBGMyA9IDEuMCAvIDMuMCxcbiAgICBHMyA9IDEuMCAvIDYuMCxcbiAgICBGNCA9IChNYXRoLnNxcnQoNS4wKSAtIDEuMCkgLyA0LjAsXG4gICAgRzQgPSAoNS4wIC0gTWF0aC5zcXJ0KDUuMCkpIC8gMjAuMDtcblxuXG5mdW5jdGlvbiBTaW1wbGV4Tm9pc2UocmFuZG9tKSB7XG4gICAgaWYgKCFyYW5kb20pIHJhbmRvbSA9IE1hdGgucmFuZG9tO1xuICAgIHRoaXMucCA9IG5ldyBVaW50OEFycmF5KDI1Nik7XG4gICAgdGhpcy5wZXJtID0gbmV3IFVpbnQ4QXJyYXkoNTEyKTtcbiAgICB0aGlzLnBlcm1Nb2QxMiA9IG5ldyBVaW50OEFycmF5KDUxMik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCAyNTY7IGkrKykge1xuICAgICAgICB0aGlzLnBbaV0gPSByYW5kb20oKSAqIDI1NjtcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IDUxMjsgaSsrKSB7XG4gICAgICAgIHRoaXMucGVybVtpXSA9IHRoaXMucFtpICYgMjU1XTtcbiAgICAgICAgdGhpcy5wZXJtTW9kMTJbaV0gPSB0aGlzLnBlcm1baV0gJSAxMjtcbiAgICB9XG5cbn1cblNpbXBsZXhOb2lzZS5wcm90b3R5cGUgPSB7XG4gICAgZ3JhZDM6IG5ldyBGbG9hdDMyQXJyYXkoWzEsIDEsIDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLSAxLCAxLCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDEsIC0gMSwgMCxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0gMSwgLSAxLCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDEsIDAsIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLSAxLCAwLCAxLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMSwgMCwgLSAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0gMSwgMCwgLSAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDAsIDEsIDEsXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLCAtIDEsIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMCwgMSwgLSAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDAsIC0gMSwgLSAxXSksXG4gICAgZ3JhZDQ6IG5ldyBGbG9hdDMyQXJyYXkoWzAsIDEsIDEsIDEsIDAsIDEsIDEsIC0gMSwgMCwgMSwgLSAxLCAxLCAwLCAxLCAtIDEsIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLCAtIDEsIDEsIDEsIDAsIC0gMSwgMSwgLSAxLCAwLCAtIDEsIC0gMSwgMSwgMCwgLSAxLCAtIDEsIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAxLCAwLCAxLCAxLCAxLCAwLCAxLCAtIDEsIDEsIDAsIC0gMSwgMSwgMSwgMCwgLSAxLCAtIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLSAxLCAwLCAxLCAxLCAtIDEsIDAsIDEsIC0gMSwgLSAxLCAwLCAtIDEsIDEsIC0gMSwgMCwgLSAxLCAtIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgMSwgMSwgMCwgMSwgMSwgMSwgMCwgLSAxLCAxLCAtIDEsIDAsIDEsIDEsIC0gMSwgMCwgLSAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0gMSwgMSwgMCwgMSwgLSAxLCAxLCAwLCAtIDEsIC0gMSwgLSAxLCAwLCAxLCAtIDEsIC0gMSwgMCwgLSAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDEsIDEsIDEsIDAsIDEsIDEsIC0gMSwgMCwgMSwgLSAxLCAxLCAwLCAxLCAtIDEsIC0gMSwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAtIDEsIDEsIDEsIDAsIC0gMSwgMSwgLSAxLCAwLCAtIDEsIC0gMSwgMSwgMCwgLSAxLCAtIDEsIC0gMSwgMF0pLFxuICAgIG5vaXNlMkQ6IGZ1bmN0aW9uICh4aW4sIHlpbikge1xuICAgICAgICB2YXIgcGVybU1vZDEyID0gdGhpcy5wZXJtTW9kMTIsXG4gICAgICAgICAgICBwZXJtID0gdGhpcy5wZXJtLFxuICAgICAgICAgICAgZ3JhZDMgPSB0aGlzLmdyYWQzO1xuICAgICAgICB2YXIgbjAsIG4xLCBuMjsgLy8gTm9pc2UgY29udHJpYnV0aW9ucyBmcm9tIHRoZSB0aHJlZSBjb3JuZXJzXG4gICAgICAgIC8vIFNrZXcgdGhlIGlucHV0IHNwYWNlIHRvIGRldGVybWluZSB3aGljaCBzaW1wbGV4IGNlbGwgd2UncmUgaW5cbiAgICAgICAgdmFyIHMgPSAoeGluICsgeWluKSAqIEYyOyAvLyBIYWlyeSBmYWN0b3IgZm9yIDJEXG4gICAgICAgIHZhciBpID0gTWF0aC5mbG9vcih4aW4gKyBzKTtcbiAgICAgICAgdmFyIGogPSBNYXRoLmZsb29yKHlpbiArIHMpO1xuICAgICAgICB2YXIgdCA9IChpICsgaikgKiBHMjtcbiAgICAgICAgdmFyIFgwID0gaSAtIHQ7IC8vIFVuc2tldyB0aGUgY2VsbCBvcmlnaW4gYmFjayB0byAoeCx5KSBzcGFjZVxuICAgICAgICB2YXIgWTAgPSBqIC0gdDtcbiAgICAgICAgdmFyIHgwID0geGluIC0gWDA7IC8vIFRoZSB4LHkgZGlzdGFuY2VzIGZyb20gdGhlIGNlbGwgb3JpZ2luXG4gICAgICAgIHZhciB5MCA9IHlpbiAtIFkwO1xuICAgICAgICAvLyBGb3IgdGhlIDJEIGNhc2UsIHRoZSBzaW1wbGV4IHNoYXBlIGlzIGFuIGVxdWlsYXRlcmFsIHRyaWFuZ2xlLlxuICAgICAgICAvLyBEZXRlcm1pbmUgd2hpY2ggc2ltcGxleCB3ZSBhcmUgaW4uXG4gICAgICAgIHZhciBpMSwgajE7IC8vIE9mZnNldHMgZm9yIHNlY29uZCAobWlkZGxlKSBjb3JuZXIgb2Ygc2ltcGxleCBpbiAoaSxqKSBjb29yZHNcbiAgICAgICAgaWYgKHgwID4geTApIHtcbiAgICAgICAgICAgIGkxID0gMTtcbiAgICAgICAgICAgIGoxID0gMDtcbiAgICAgICAgfSAvLyBsb3dlciB0cmlhbmdsZSwgWFkgb3JkZXI6ICgwLDApLT4oMSwwKS0+KDEsMSlcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpMSA9IDA7XG4gICAgICAgICAgICBqMSA9IDE7XG4gICAgICAgIH0gLy8gdXBwZXIgdHJpYW5nbGUsIFlYIG9yZGVyOiAoMCwwKS0+KDAsMSktPigxLDEpXG4gICAgICAgIC8vIEEgc3RlcCBvZiAoMSwwKSBpbiAoaSxqKSBtZWFucyBhIHN0ZXAgb2YgKDEtYywtYykgaW4gKHgseSksIGFuZFxuICAgICAgICAvLyBhIHN0ZXAgb2YgKDAsMSkgaW4gKGksaikgbWVhbnMgYSBzdGVwIG9mICgtYywxLWMpIGluICh4LHkpLCB3aGVyZVxuICAgICAgICAvLyBjID0gKDMtc3FydCgzKSkvNlxuICAgICAgICB2YXIgeDEgPSB4MCAtIGkxICsgRzI7IC8vIE9mZnNldHMgZm9yIG1pZGRsZSBjb3JuZXIgaW4gKHgseSkgdW5za2V3ZWQgY29vcmRzXG4gICAgICAgIHZhciB5MSA9IHkwIC0gajEgKyBHMjtcbiAgICAgICAgdmFyIHgyID0geDAgLSAxLjAgKyAyLjAgKiBHMjsgLy8gT2Zmc2V0cyBmb3IgbGFzdCBjb3JuZXIgaW4gKHgseSkgdW5za2V3ZWQgY29vcmRzXG4gICAgICAgIHZhciB5MiA9IHkwIC0gMS4wICsgMi4wICogRzI7XG4gICAgICAgIC8vIFdvcmsgb3V0IHRoZSBoYXNoZWQgZ3JhZGllbnQgaW5kaWNlcyBvZiB0aGUgdGhyZWUgc2ltcGxleCBjb3JuZXJzXG4gICAgICAgIHZhciBpaSA9IGkgJiAyNTU7XG4gICAgICAgIHZhciBqaiA9IGogJiAyNTU7XG4gICAgICAgIC8vIENhbGN1bGF0ZSB0aGUgY29udHJpYnV0aW9uIGZyb20gdGhlIHRocmVlIGNvcm5lcnNcbiAgICAgICAgdmFyIHQwID0gMC41IC0geDAgKiB4MCAtIHkwICogeTA7XG4gICAgICAgIGlmICh0MCA8IDApIG4wID0gMC4wO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBnaTAgPSBwZXJtTW9kMTJbaWkgKyBwZXJtW2pqXV0gKiAzO1xuICAgICAgICAgICAgdDAgKj0gdDA7XG4gICAgICAgICAgICBuMCA9IHQwICogdDAgKiAoZ3JhZDNbZ2kwXSAqIHgwICsgZ3JhZDNbZ2kwICsgMV0gKiB5MCk7IC8vICh4LHkpIG9mIGdyYWQzIHVzZWQgZm9yIDJEIGdyYWRpZW50XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHQxID0gMC41IC0geDEgKiB4MSAtIHkxICogeTE7XG4gICAgICAgIGlmICh0MSA8IDApIG4xID0gMC4wO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBnaTEgPSBwZXJtTW9kMTJbaWkgKyBpMSArIHBlcm1bamogKyBqMV1dICogMztcbiAgICAgICAgICAgIHQxICo9IHQxO1xuICAgICAgICAgICAgbjEgPSB0MSAqIHQxICogKGdyYWQzW2dpMV0gKiB4MSArIGdyYWQzW2dpMSArIDFdICogeTEpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0MiA9IDAuNSAtIHgyICogeDIgLSB5MiAqIHkyO1xuICAgICAgICBpZiAodDIgPCAwKSBuMiA9IDAuMDtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgZ2kyID0gcGVybU1vZDEyW2lpICsgMSArIHBlcm1bamogKyAxXV0gKiAzO1xuICAgICAgICAgICAgdDIgKj0gdDI7XG4gICAgICAgICAgICBuMiA9IHQyICogdDIgKiAoZ3JhZDNbZ2kyXSAqIHgyICsgZ3JhZDNbZ2kyICsgMV0gKiB5Mik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQWRkIGNvbnRyaWJ1dGlvbnMgZnJvbSBlYWNoIGNvcm5lciB0byBnZXQgdGhlIGZpbmFsIG5vaXNlIHZhbHVlLlxuICAgICAgICAvLyBUaGUgcmVzdWx0IGlzIHNjYWxlZCB0byByZXR1cm4gdmFsdWVzIGluIHRoZSBpbnRlcnZhbCBbLTEsMV0uXG4gICAgICAgIHJldHVybiA3MC4wICogKG4wICsgbjEgKyBuMik7XG4gICAgfSxcbiAgICAvLyAzRCBzaW1wbGV4IG5vaXNlXG4gICAgbm9pc2UzRDogZnVuY3Rpb24gKHhpbiwgeWluLCB6aW4pIHtcbiAgICAgICAgdmFyIHBlcm1Nb2QxMiA9IHRoaXMucGVybU1vZDEyLFxuICAgICAgICAgICAgcGVybSA9IHRoaXMucGVybSxcbiAgICAgICAgICAgIGdyYWQzID0gdGhpcy5ncmFkMztcbiAgICAgICAgdmFyIG4wLCBuMSwgbjIsIG4zOyAvLyBOb2lzZSBjb250cmlidXRpb25zIGZyb20gdGhlIGZvdXIgY29ybmVyc1xuICAgICAgICAvLyBTa2V3IHRoZSBpbnB1dCBzcGFjZSB0byBkZXRlcm1pbmUgd2hpY2ggc2ltcGxleCBjZWxsIHdlJ3JlIGluXG4gICAgICAgIHZhciBzID0gKHhpbiArIHlpbiArIHppbikgKiBGMzsgLy8gVmVyeSBuaWNlIGFuZCBzaW1wbGUgc2tldyBmYWN0b3IgZm9yIDNEXG4gICAgICAgIHZhciBpID0gTWF0aC5mbG9vcih4aW4gKyBzKTtcbiAgICAgICAgdmFyIGogPSBNYXRoLmZsb29yKHlpbiArIHMpO1xuICAgICAgICB2YXIgayA9IE1hdGguZmxvb3IoemluICsgcyk7XG4gICAgICAgIHZhciB0ID0gKGkgKyBqICsgaykgKiBHMztcbiAgICAgICAgdmFyIFgwID0gaSAtIHQ7IC8vIFVuc2tldyB0aGUgY2VsbCBvcmlnaW4gYmFjayB0byAoeCx5LHopIHNwYWNlXG4gICAgICAgIHZhciBZMCA9IGogLSB0O1xuICAgICAgICB2YXIgWjAgPSBrIC0gdDtcbiAgICAgICAgdmFyIHgwID0geGluIC0gWDA7IC8vIFRoZSB4LHkseiBkaXN0YW5jZXMgZnJvbSB0aGUgY2VsbCBvcmlnaW5cbiAgICAgICAgdmFyIHkwID0geWluIC0gWTA7XG4gICAgICAgIHZhciB6MCA9IHppbiAtIFowO1xuICAgICAgICAvLyBGb3IgdGhlIDNEIGNhc2UsIHRoZSBzaW1wbGV4IHNoYXBlIGlzIGEgc2xpZ2h0bHkgaXJyZWd1bGFyIHRldHJhaGVkcm9uLlxuICAgICAgICAvLyBEZXRlcm1pbmUgd2hpY2ggc2ltcGxleCB3ZSBhcmUgaW4uXG4gICAgICAgIHZhciBpMSwgajEsIGsxOyAvLyBPZmZzZXRzIGZvciBzZWNvbmQgY29ybmVyIG9mIHNpbXBsZXggaW4gKGksaixrKSBjb29yZHNcbiAgICAgICAgdmFyIGkyLCBqMiwgazI7IC8vIE9mZnNldHMgZm9yIHRoaXJkIGNvcm5lciBvZiBzaW1wbGV4IGluIChpLGosaykgY29vcmRzXG4gICAgICAgIGlmICh4MCA+PSB5MCkge1xuICAgICAgICAgICAgaWYgKHkwID49IHowKSB7XG4gICAgICAgICAgICAgICAgaTEgPSAxO1xuICAgICAgICAgICAgICAgIGoxID0gMDtcbiAgICAgICAgICAgICAgICBrMSA9IDA7XG4gICAgICAgICAgICAgICAgaTIgPSAxO1xuICAgICAgICAgICAgICAgIGoyID0gMTtcbiAgICAgICAgICAgICAgICBrMiA9IDA7XG4gICAgICAgICAgICB9IC8vIFggWSBaIG9yZGVyXG4gICAgICAgICAgICBlbHNlIGlmICh4MCA+PSB6MCkge1xuICAgICAgICAgICAgICAgIGkxID0gMTtcbiAgICAgICAgICAgICAgICBqMSA9IDA7XG4gICAgICAgICAgICAgICAgazEgPSAwO1xuICAgICAgICAgICAgICAgIGkyID0gMTtcbiAgICAgICAgICAgICAgICBqMiA9IDA7XG4gICAgICAgICAgICAgICAgazIgPSAxO1xuICAgICAgICAgICAgfSAvLyBYIFogWSBvcmRlclxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaTEgPSAwO1xuICAgICAgICAgICAgICAgIGoxID0gMDtcbiAgICAgICAgICAgICAgICBrMSA9IDE7XG4gICAgICAgICAgICAgICAgaTIgPSAxO1xuICAgICAgICAgICAgICAgIGoyID0gMDtcbiAgICAgICAgICAgICAgICBrMiA9IDE7XG4gICAgICAgICAgICB9IC8vIFogWCBZIG9yZGVyXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7IC8vIHgwPHkwXG4gICAgICAgICAgICBpZiAoeTAgPCB6MCkge1xuICAgICAgICAgICAgICAgIGkxID0gMDtcbiAgICAgICAgICAgICAgICBqMSA9IDA7XG4gICAgICAgICAgICAgICAgazEgPSAxO1xuICAgICAgICAgICAgICAgIGkyID0gMDtcbiAgICAgICAgICAgICAgICBqMiA9IDE7XG4gICAgICAgICAgICAgICAgazIgPSAxO1xuICAgICAgICAgICAgfSAvLyBaIFkgWCBvcmRlclxuICAgICAgICAgICAgZWxzZSBpZiAoeDAgPCB6MCkge1xuICAgICAgICAgICAgICAgIGkxID0gMDtcbiAgICAgICAgICAgICAgICBqMSA9IDE7XG4gICAgICAgICAgICAgICAgazEgPSAwO1xuICAgICAgICAgICAgICAgIGkyID0gMDtcbiAgICAgICAgICAgICAgICBqMiA9IDE7XG4gICAgICAgICAgICAgICAgazIgPSAxO1xuICAgICAgICAgICAgfSAvLyBZIFogWCBvcmRlclxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaTEgPSAwO1xuICAgICAgICAgICAgICAgIGoxID0gMTtcbiAgICAgICAgICAgICAgICBrMSA9IDA7XG4gICAgICAgICAgICAgICAgaTIgPSAxO1xuICAgICAgICAgICAgICAgIGoyID0gMTtcbiAgICAgICAgICAgICAgICBrMiA9IDA7XG4gICAgICAgICAgICB9IC8vIFkgWCBaIG9yZGVyXG4gICAgICAgIH1cbiAgICAgICAgLy8gQSBzdGVwIG9mICgxLDAsMCkgaW4gKGksaixrKSBtZWFucyBhIHN0ZXAgb2YgKDEtYywtYywtYykgaW4gKHgseSx6KSxcbiAgICAgICAgLy8gYSBzdGVwIG9mICgwLDEsMCkgaW4gKGksaixrKSBtZWFucyBhIHN0ZXAgb2YgKC1jLDEtYywtYykgaW4gKHgseSx6KSwgYW5kXG4gICAgICAgIC8vIGEgc3RlcCBvZiAoMCwwLDEpIGluIChpLGosaykgbWVhbnMgYSBzdGVwIG9mICgtYywtYywxLWMpIGluICh4LHkseiksIHdoZXJlXG4gICAgICAgIC8vIGMgPSAxLzYuXG4gICAgICAgIHZhciB4MSA9IHgwIC0gaTEgKyBHMzsgLy8gT2Zmc2V0cyBmb3Igc2Vjb25kIGNvcm5lciBpbiAoeCx5LHopIGNvb3Jkc1xuICAgICAgICB2YXIgeTEgPSB5MCAtIGoxICsgRzM7XG4gICAgICAgIHZhciB6MSA9IHowIC0gazEgKyBHMztcbiAgICAgICAgdmFyIHgyID0geDAgLSBpMiArIDIuMCAqIEczOyAvLyBPZmZzZXRzIGZvciB0aGlyZCBjb3JuZXIgaW4gKHgseSx6KSBjb29yZHNcbiAgICAgICAgdmFyIHkyID0geTAgLSBqMiArIDIuMCAqIEczO1xuICAgICAgICB2YXIgejIgPSB6MCAtIGsyICsgMi4wICogRzM7XG4gICAgICAgIHZhciB4MyA9IHgwIC0gMS4wICsgMy4wICogRzM7IC8vIE9mZnNldHMgZm9yIGxhc3QgY29ybmVyIGluICh4LHkseikgY29vcmRzXG4gICAgICAgIHZhciB5MyA9IHkwIC0gMS4wICsgMy4wICogRzM7XG4gICAgICAgIHZhciB6MyA9IHowIC0gMS4wICsgMy4wICogRzM7XG4gICAgICAgIC8vIFdvcmsgb3V0IHRoZSBoYXNoZWQgZ3JhZGllbnQgaW5kaWNlcyBvZiB0aGUgZm91ciBzaW1wbGV4IGNvcm5lcnNcbiAgICAgICAgdmFyIGlpID0gaSAmIDI1NTtcbiAgICAgICAgdmFyIGpqID0gaiAmIDI1NTtcbiAgICAgICAgdmFyIGtrID0gayAmIDI1NTtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRoZSBjb250cmlidXRpb24gZnJvbSB0aGUgZm91ciBjb3JuZXJzXG4gICAgICAgIHZhciB0MCA9IDAuNiAtIHgwICogeDAgLSB5MCAqIHkwIC0gejAgKiB6MDtcbiAgICAgICAgaWYgKHQwIDwgMCkgbjAgPSAwLjA7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGdpMCA9IHBlcm1Nb2QxMltpaSArIHBlcm1bamogKyBwZXJtW2trXV1dICogMztcbiAgICAgICAgICAgIHQwICo9IHQwO1xuICAgICAgICAgICAgbjAgPSB0MCAqIHQwICogKGdyYWQzW2dpMF0gKiB4MCArIGdyYWQzW2dpMCArIDFdICogeTAgKyBncmFkM1tnaTAgKyAyXSAqIHowKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdDEgPSAwLjYgLSB4MSAqIHgxIC0geTEgKiB5MSAtIHoxICogejE7XG4gICAgICAgIGlmICh0MSA8IDApIG4xID0gMC4wO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBnaTEgPSBwZXJtTW9kMTJbaWkgKyBpMSArIHBlcm1bamogKyBqMSArIHBlcm1ba2sgKyBrMV1dXSAqIDM7XG4gICAgICAgICAgICB0MSAqPSB0MTtcbiAgICAgICAgICAgIG4xID0gdDEgKiB0MSAqIChncmFkM1tnaTFdICogeDEgKyBncmFkM1tnaTEgKyAxXSAqIHkxICsgZ3JhZDNbZ2kxICsgMl0gKiB6MSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHQyID0gMC42IC0geDIgKiB4MiAtIHkyICogeTIgLSB6MiAqIHoyO1xuICAgICAgICBpZiAodDIgPCAwKSBuMiA9IDAuMDtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgZ2kyID0gcGVybU1vZDEyW2lpICsgaTIgKyBwZXJtW2pqICsgajIgKyBwZXJtW2trICsgazJdXV0gKiAzO1xuICAgICAgICAgICAgdDIgKj0gdDI7XG4gICAgICAgICAgICBuMiA9IHQyICogdDIgKiAoZ3JhZDNbZ2kyXSAqIHgyICsgZ3JhZDNbZ2kyICsgMV0gKiB5MiArIGdyYWQzW2dpMiArIDJdICogejIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0MyA9IDAuNiAtIHgzICogeDMgLSB5MyAqIHkzIC0gejMgKiB6MztcbiAgICAgICAgaWYgKHQzIDwgMCkgbjMgPSAwLjA7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGdpMyA9IHBlcm1Nb2QxMltpaSArIDEgKyBwZXJtW2pqICsgMSArIHBlcm1ba2sgKyAxXV1dICogMztcbiAgICAgICAgICAgIHQzICo9IHQzO1xuICAgICAgICAgICAgbjMgPSB0MyAqIHQzICogKGdyYWQzW2dpM10gKiB4MyArIGdyYWQzW2dpMyArIDFdICogeTMgKyBncmFkM1tnaTMgKyAyXSAqIHozKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBBZGQgY29udHJpYnV0aW9ucyBmcm9tIGVhY2ggY29ybmVyIHRvIGdldCB0aGUgZmluYWwgbm9pc2UgdmFsdWUuXG4gICAgICAgIC8vIFRoZSByZXN1bHQgaXMgc2NhbGVkIHRvIHN0YXkganVzdCBpbnNpZGUgWy0xLDFdXG4gICAgICAgIHJldHVybiAzMi4wICogKG4wICsgbjEgKyBuMiArIG4zKTtcbiAgICB9LFxuICAgIC8vIDREIHNpbXBsZXggbm9pc2UsIGJldHRlciBzaW1wbGV4IHJhbmsgb3JkZXJpbmcgbWV0aG9kIDIwMTItMDMtMDlcbiAgICBub2lzZTREOiBmdW5jdGlvbiAoeCwgeSwgeiwgdykge1xuICAgICAgICB2YXIgcGVybU1vZDEyID0gdGhpcy5wZXJtTW9kMTIsXG4gICAgICAgICAgICBwZXJtID0gdGhpcy5wZXJtLFxuICAgICAgICAgICAgZ3JhZDQgPSB0aGlzLmdyYWQ0O1xuXG4gICAgICAgIHZhciBuMCwgbjEsIG4yLCBuMywgbjQ7IC8vIE5vaXNlIGNvbnRyaWJ1dGlvbnMgZnJvbSB0aGUgZml2ZSBjb3JuZXJzXG4gICAgICAgIC8vIFNrZXcgdGhlICh4LHkseix3KSBzcGFjZSB0byBkZXRlcm1pbmUgd2hpY2ggY2VsbCBvZiAyNCBzaW1wbGljZXMgd2UncmUgaW5cbiAgICAgICAgdmFyIHMgPSAoeCArIHkgKyB6ICsgdykgKiBGNDsgLy8gRmFjdG9yIGZvciA0RCBza2V3aW5nXG4gICAgICAgIHZhciBpID0gTWF0aC5mbG9vcih4ICsgcyk7XG4gICAgICAgIHZhciBqID0gTWF0aC5mbG9vcih5ICsgcyk7XG4gICAgICAgIHZhciBrID0gTWF0aC5mbG9vcih6ICsgcyk7XG4gICAgICAgIHZhciBsID0gTWF0aC5mbG9vcih3ICsgcyk7XG4gICAgICAgIHZhciB0ID0gKGkgKyBqICsgayArIGwpICogRzQ7IC8vIEZhY3RvciBmb3IgNEQgdW5za2V3aW5nXG4gICAgICAgIHZhciBYMCA9IGkgLSB0OyAvLyBVbnNrZXcgdGhlIGNlbGwgb3JpZ2luIGJhY2sgdG8gKHgseSx6LHcpIHNwYWNlXG4gICAgICAgIHZhciBZMCA9IGogLSB0O1xuICAgICAgICB2YXIgWjAgPSBrIC0gdDtcbiAgICAgICAgdmFyIFcwID0gbCAtIHQ7XG4gICAgICAgIHZhciB4MCA9IHggLSBYMDsgLy8gVGhlIHgseSx6LHcgZGlzdGFuY2VzIGZyb20gdGhlIGNlbGwgb3JpZ2luXG4gICAgICAgIHZhciB5MCA9IHkgLSBZMDtcbiAgICAgICAgdmFyIHowID0geiAtIFowO1xuICAgICAgICB2YXIgdzAgPSB3IC0gVzA7XG4gICAgICAgIC8vIEZvciB0aGUgNEQgY2FzZSwgdGhlIHNpbXBsZXggaXMgYSA0RCBzaGFwZSBJIHdvbid0IGV2ZW4gdHJ5IHRvIGRlc2NyaWJlLlxuICAgICAgICAvLyBUbyBmaW5kIG91dCB3aGljaCBvZiB0aGUgMjQgcG9zc2libGUgc2ltcGxpY2VzIHdlJ3JlIGluLCB3ZSBuZWVkIHRvXG4gICAgICAgIC8vIGRldGVybWluZSB0aGUgbWFnbml0dWRlIG9yZGVyaW5nIG9mIHgwLCB5MCwgejAgYW5kIHcwLlxuICAgICAgICAvLyBTaXggcGFpci13aXNlIGNvbXBhcmlzb25zIGFyZSBwZXJmb3JtZWQgYmV0d2VlbiBlYWNoIHBvc3NpYmxlIHBhaXJcbiAgICAgICAgLy8gb2YgdGhlIGZvdXIgY29vcmRpbmF0ZXMsIGFuZCB0aGUgcmVzdWx0cyBhcmUgdXNlZCB0byByYW5rIHRoZSBudW1iZXJzLlxuICAgICAgICB2YXIgcmFua3ggPSAwO1xuICAgICAgICB2YXIgcmFua3kgPSAwO1xuICAgICAgICB2YXIgcmFua3ogPSAwO1xuICAgICAgICB2YXIgcmFua3cgPSAwO1xuICAgICAgICBpZiAoeDAgPiB5MCkgcmFua3grKztcbiAgICAgICAgZWxzZSByYW5reSsrO1xuICAgICAgICBpZiAoeDAgPiB6MCkgcmFua3grKztcbiAgICAgICAgZWxzZSByYW5reisrO1xuICAgICAgICBpZiAoeDAgPiB3MCkgcmFua3grKztcbiAgICAgICAgZWxzZSByYW5rdysrO1xuICAgICAgICBpZiAoeTAgPiB6MCkgcmFua3krKztcbiAgICAgICAgZWxzZSByYW5reisrO1xuICAgICAgICBpZiAoeTAgPiB3MCkgcmFua3krKztcbiAgICAgICAgZWxzZSByYW5rdysrO1xuICAgICAgICBpZiAoejAgPiB3MCkgcmFua3orKztcbiAgICAgICAgZWxzZSByYW5rdysrO1xuICAgICAgICB2YXIgaTEsIGoxLCBrMSwgbDE7IC8vIFRoZSBpbnRlZ2VyIG9mZnNldHMgZm9yIHRoZSBzZWNvbmQgc2ltcGxleCBjb3JuZXJcbiAgICAgICAgdmFyIGkyLCBqMiwgazIsIGwyOyAvLyBUaGUgaW50ZWdlciBvZmZzZXRzIGZvciB0aGUgdGhpcmQgc2ltcGxleCBjb3JuZXJcbiAgICAgICAgdmFyIGkzLCBqMywgazMsIGwzOyAvLyBUaGUgaW50ZWdlciBvZmZzZXRzIGZvciB0aGUgZm91cnRoIHNpbXBsZXggY29ybmVyXG4gICAgICAgIC8vIHNpbXBsZXhbY10gaXMgYSA0LXZlY3RvciB3aXRoIHRoZSBudW1iZXJzIDAsIDEsIDIgYW5kIDMgaW4gc29tZSBvcmRlci5cbiAgICAgICAgLy8gTWFueSB2YWx1ZXMgb2YgYyB3aWxsIG5ldmVyIG9jY3VyLCBzaW5jZSBlLmcuIHg+eT56PncgbWFrZXMgeDx6LCB5PHcgYW5kIHg8d1xuICAgICAgICAvLyBpbXBvc3NpYmxlLiBPbmx5IHRoZSAyNCBpbmRpY2VzIHdoaWNoIGhhdmUgbm9uLXplcm8gZW50cmllcyBtYWtlIGFueSBzZW5zZS5cbiAgICAgICAgLy8gV2UgdXNlIGEgdGhyZXNob2xkaW5nIHRvIHNldCB0aGUgY29vcmRpbmF0ZXMgaW4gdHVybiBmcm9tIHRoZSBsYXJnZXN0IG1hZ25pdHVkZS5cbiAgICAgICAgLy8gUmFuayAzIGRlbm90ZXMgdGhlIGxhcmdlc3QgY29vcmRpbmF0ZS5cbiAgICAgICAgaTEgPSByYW5reCA+PSAzID8gMSA6IDA7XG4gICAgICAgIGoxID0gcmFua3kgPj0gMyA/IDEgOiAwO1xuICAgICAgICBrMSA9IHJhbmt6ID49IDMgPyAxIDogMDtcbiAgICAgICAgbDEgPSByYW5rdyA+PSAzID8gMSA6IDA7XG4gICAgICAgIC8vIFJhbmsgMiBkZW5vdGVzIHRoZSBzZWNvbmQgbGFyZ2VzdCBjb29yZGluYXRlLlxuICAgICAgICBpMiA9IHJhbmt4ID49IDIgPyAxIDogMDtcbiAgICAgICAgajIgPSByYW5reSA+PSAyID8gMSA6IDA7XG4gICAgICAgIGsyID0gcmFua3ogPj0gMiA/IDEgOiAwO1xuICAgICAgICBsMiA9IHJhbmt3ID49IDIgPyAxIDogMDtcbiAgICAgICAgLy8gUmFuayAxIGRlbm90ZXMgdGhlIHNlY29uZCBzbWFsbGVzdCBjb29yZGluYXRlLlxuICAgICAgICBpMyA9IHJhbmt4ID49IDEgPyAxIDogMDtcbiAgICAgICAgajMgPSByYW5reSA+PSAxID8gMSA6IDA7XG4gICAgICAgIGszID0gcmFua3ogPj0gMSA/IDEgOiAwO1xuICAgICAgICBsMyA9IHJhbmt3ID49IDEgPyAxIDogMDtcbiAgICAgICAgLy8gVGhlIGZpZnRoIGNvcm5lciBoYXMgYWxsIGNvb3JkaW5hdGUgb2Zmc2V0cyA9IDEsIHNvIG5vIG5lZWQgdG8gY29tcHV0ZSB0aGF0LlxuICAgICAgICB2YXIgeDEgPSB4MCAtIGkxICsgRzQ7IC8vIE9mZnNldHMgZm9yIHNlY29uZCBjb3JuZXIgaW4gKHgseSx6LHcpIGNvb3Jkc1xuICAgICAgICB2YXIgeTEgPSB5MCAtIGoxICsgRzQ7XG4gICAgICAgIHZhciB6MSA9IHowIC0gazEgKyBHNDtcbiAgICAgICAgdmFyIHcxID0gdzAgLSBsMSArIEc0O1xuICAgICAgICB2YXIgeDIgPSB4MCAtIGkyICsgMi4wICogRzQ7IC8vIE9mZnNldHMgZm9yIHRoaXJkIGNvcm5lciBpbiAoeCx5LHosdykgY29vcmRzXG4gICAgICAgIHZhciB5MiA9IHkwIC0gajIgKyAyLjAgKiBHNDtcbiAgICAgICAgdmFyIHoyID0gejAgLSBrMiArIDIuMCAqIEc0O1xuICAgICAgICB2YXIgdzIgPSB3MCAtIGwyICsgMi4wICogRzQ7XG4gICAgICAgIHZhciB4MyA9IHgwIC0gaTMgKyAzLjAgKiBHNDsgLy8gT2Zmc2V0cyBmb3IgZm91cnRoIGNvcm5lciBpbiAoeCx5LHosdykgY29vcmRzXG4gICAgICAgIHZhciB5MyA9IHkwIC0gajMgKyAzLjAgKiBHNDtcbiAgICAgICAgdmFyIHozID0gejAgLSBrMyArIDMuMCAqIEc0O1xuICAgICAgICB2YXIgdzMgPSB3MCAtIGwzICsgMy4wICogRzQ7XG4gICAgICAgIHZhciB4NCA9IHgwIC0gMS4wICsgNC4wICogRzQ7IC8vIE9mZnNldHMgZm9yIGxhc3QgY29ybmVyIGluICh4LHkseix3KSBjb29yZHNcbiAgICAgICAgdmFyIHk0ID0geTAgLSAxLjAgKyA0LjAgKiBHNDtcbiAgICAgICAgdmFyIHo0ID0gejAgLSAxLjAgKyA0LjAgKiBHNDtcbiAgICAgICAgdmFyIHc0ID0gdzAgLSAxLjAgKyA0LjAgKiBHNDtcbiAgICAgICAgLy8gV29yayBvdXQgdGhlIGhhc2hlZCBncmFkaWVudCBpbmRpY2VzIG9mIHRoZSBmaXZlIHNpbXBsZXggY29ybmVyc1xuICAgICAgICB2YXIgaWkgPSBpICYgMjU1O1xuICAgICAgICB2YXIgamogPSBqICYgMjU1O1xuICAgICAgICB2YXIga2sgPSBrICYgMjU1O1xuICAgICAgICB2YXIgbGwgPSBsICYgMjU1O1xuICAgICAgICAvLyBDYWxjdWxhdGUgdGhlIGNvbnRyaWJ1dGlvbiBmcm9tIHRoZSBmaXZlIGNvcm5lcnNcbiAgICAgICAgdmFyIHQwID0gMC42IC0geDAgKiB4MCAtIHkwICogeTAgLSB6MCAqIHowIC0gdzAgKiB3MDtcbiAgICAgICAgaWYgKHQwIDwgMCkgbjAgPSAwLjA7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGdpMCA9IChwZXJtW2lpICsgcGVybVtqaiArIHBlcm1ba2sgKyBwZXJtW2xsXV1dXSAlIDMyKSAqIDQ7XG4gICAgICAgICAgICB0MCAqPSB0MDtcbiAgICAgICAgICAgIG4wID0gdDAgKiB0MCAqIChncmFkNFtnaTBdICogeDAgKyBncmFkNFtnaTAgKyAxXSAqIHkwICsgZ3JhZDRbZ2kwICsgMl0gKiB6MCArIGdyYWQ0W2dpMCArIDNdICogdzApO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0MSA9IDAuNiAtIHgxICogeDEgLSB5MSAqIHkxIC0gejEgKiB6MSAtIHcxICogdzE7XG4gICAgICAgIGlmICh0MSA8IDApIG4xID0gMC4wO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBnaTEgPSAocGVybVtpaSArIGkxICsgcGVybVtqaiArIGoxICsgcGVybVtrayArIGsxICsgcGVybVtsbCArIGwxXV1dXSAlIDMyKSAqIDQ7XG4gICAgICAgICAgICB0MSAqPSB0MTtcbiAgICAgICAgICAgIG4xID0gdDEgKiB0MSAqIChncmFkNFtnaTFdICogeDEgKyBncmFkNFtnaTEgKyAxXSAqIHkxICsgZ3JhZDRbZ2kxICsgMl0gKiB6MSArIGdyYWQ0W2dpMSArIDNdICogdzEpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0MiA9IDAuNiAtIHgyICogeDIgLSB5MiAqIHkyIC0gejIgKiB6MiAtIHcyICogdzI7XG4gICAgICAgIGlmICh0MiA8IDApIG4yID0gMC4wO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBnaTIgPSAocGVybVtpaSArIGkyICsgcGVybVtqaiArIGoyICsgcGVybVtrayArIGsyICsgcGVybVtsbCArIGwyXV1dXSAlIDMyKSAqIDQ7XG4gICAgICAgICAgICB0MiAqPSB0MjtcbiAgICAgICAgICAgIG4yID0gdDIgKiB0MiAqIChncmFkNFtnaTJdICogeDIgKyBncmFkNFtnaTIgKyAxXSAqIHkyICsgZ3JhZDRbZ2kyICsgMl0gKiB6MiArIGdyYWQ0W2dpMiArIDNdICogdzIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0MyA9IDAuNiAtIHgzICogeDMgLSB5MyAqIHkzIC0gejMgKiB6MyAtIHczICogdzM7XG4gICAgICAgIGlmICh0MyA8IDApIG4zID0gMC4wO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBnaTMgPSAocGVybVtpaSArIGkzICsgcGVybVtqaiArIGozICsgcGVybVtrayArIGszICsgcGVybVtsbCArIGwzXV1dXSAlIDMyKSAqIDQ7XG4gICAgICAgICAgICB0MyAqPSB0MztcbiAgICAgICAgICAgIG4zID0gdDMgKiB0MyAqIChncmFkNFtnaTNdICogeDMgKyBncmFkNFtnaTMgKyAxXSAqIHkzICsgZ3JhZDRbZ2kzICsgMl0gKiB6MyArIGdyYWQ0W2dpMyArIDNdICogdzMpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0NCA9IDAuNiAtIHg0ICogeDQgLSB5NCAqIHk0IC0gejQgKiB6NCAtIHc0ICogdzQ7XG4gICAgICAgIGlmICh0NCA8IDApIG40ID0gMC4wO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBnaTQgPSAocGVybVtpaSArIDEgKyBwZXJtW2pqICsgMSArIHBlcm1ba2sgKyAxICsgcGVybVtsbCArIDFdXV1dICUgMzIpICogNDtcbiAgICAgICAgICAgIHQ0ICo9IHQ0O1xuICAgICAgICAgICAgbjQgPSB0NCAqIHQ0ICogKGdyYWQ0W2dpNF0gKiB4NCArIGdyYWQ0W2dpNCArIDFdICogeTQgKyBncmFkNFtnaTQgKyAyXSAqIHo0ICsgZ3JhZDRbZ2k0ICsgM10gKiB3NCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gU3VtIHVwIGFuZCBzY2FsZSB0aGUgcmVzdWx0IHRvIGNvdmVyIHRoZSByYW5nZSBbLTEsMV1cbiAgICAgICAgcmV0dXJuIDI3LjAgKiAobjAgKyBuMSArIG4yICsgbjMgKyBuNCk7XG4gICAgfVxuXG5cbn07XG5cbi8vIGFtZFxuaWYgKHR5cGVvZiBkZWZpbmUgIT09ICd1bmRlZmluZWQnICYmIGRlZmluZS5hbWQpIGRlZmluZShmdW5jdGlvbigpe3JldHVybiBTaW1wbGV4Tm9pc2U7fSk7XG4vLyBicm93c2VyXG5lbHNlIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgd2luZG93LlNpbXBsZXhOb2lzZSA9IFNpbXBsZXhOb2lzZTtcbi8vY29tbW9uIGpzXG5pZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSBleHBvcnRzLlNpbXBsZXhOb2lzZSA9IFNpbXBsZXhOb2lzZTtcbi8vIG5vZGVqc1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBTaW1wbGV4Tm9pc2U7XG59XG5cbn0pKCk7XG4iLCJ2YXIgQVJSQVlfVFlQRSA9IHR5cGVvZiBGbG9hdDMyQXJyYXkgIT09IFwidW5kZWZpbmVkXCIgPyBGbG9hdDMyQXJyYXkgOiBBcnJheTtcblxuZnVuY3Rpb24gTWF0cml4MyhtKSB7XG4gICAgdGhpcy52YWwgPSBuZXcgQVJSQVlfVFlQRSg5KTtcblxuICAgIGlmIChtKSB7IC8vYXNzdW1lIE1hdHJpeDMgd2l0aCB2YWxcbiAgICAgICAgdGhpcy5jb3B5KG0pO1xuICAgIH0gZWxzZSB7IC8vZGVmYXVsdCB0byBpZGVudGl0eVxuICAgICAgICB0aGlzLmlkdCgpO1xuICAgIH1cbn1cblxudmFyIG1hdDMgPSBNYXRyaXgzLnByb3RvdHlwZTtcblxubWF0My5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgTWF0cml4Myh0aGlzKTtcbn07XG5cbm1hdDMuc2V0ID0gZnVuY3Rpb24ob3RoZXJNYXQpIHtcbiAgICByZXR1cm4gdGhpcy5jb3B5KG90aGVyTWF0KTtcbn07XG5cbm1hdDMuY29weSA9IGZ1bmN0aW9uKG90aGVyTWF0KSB7XG4gICAgdmFyIG91dCA9IHRoaXMudmFsLFxuICAgICAgICBhID0gb3RoZXJNYXQudmFsOyBcbiAgICBvdXRbMF0gPSBhWzBdO1xuICAgIG91dFsxXSA9IGFbMV07XG4gICAgb3V0WzJdID0gYVsyXTtcbiAgICBvdXRbM10gPSBhWzNdO1xuICAgIG91dFs0XSA9IGFbNF07XG4gICAgb3V0WzVdID0gYVs1XTtcbiAgICBvdXRbNl0gPSBhWzZdO1xuICAgIG91dFs3XSA9IGFbN107XG4gICAgb3V0WzhdID0gYVs4XTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDMuZnJvbU1hdDQgPSBmdW5jdGlvbihtKSB7XG4gICAgdmFyIGEgPSBtLnZhbCxcbiAgICAgICAgb3V0ID0gdGhpcy52YWw7XG4gICAgb3V0WzBdID0gYVswXTtcbiAgICBvdXRbMV0gPSBhWzFdO1xuICAgIG91dFsyXSA9IGFbMl07XG4gICAgb3V0WzNdID0gYVs0XTtcbiAgICBvdXRbNF0gPSBhWzVdO1xuICAgIG91dFs1XSA9IGFbNl07XG4gICAgb3V0WzZdID0gYVs4XTtcbiAgICBvdXRbN10gPSBhWzldO1xuICAgIG91dFs4XSA9IGFbMTBdO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0My5mcm9tQXJyYXkgPSBmdW5jdGlvbihhKSB7XG4gICAgdmFyIG91dCA9IHRoaXMudmFsO1xuICAgIG91dFswXSA9IGFbMF07XG4gICAgb3V0WzFdID0gYVsxXTtcbiAgICBvdXRbMl0gPSBhWzJdO1xuICAgIG91dFszXSA9IGFbM107XG4gICAgb3V0WzRdID0gYVs0XTtcbiAgICBvdXRbNV0gPSBhWzVdO1xuICAgIG91dFs2XSA9IGFbNl07XG4gICAgb3V0WzddID0gYVs3XTtcbiAgICBvdXRbOF0gPSBhWzhdO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0My5pZGVudGl0eSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBvdXQgPSB0aGlzLnZhbDtcbiAgICBvdXRbMF0gPSAxO1xuICAgIG91dFsxXSA9IDA7XG4gICAgb3V0WzJdID0gMDtcbiAgICBvdXRbM10gPSAwO1xuICAgIG91dFs0XSA9IDE7XG4gICAgb3V0WzVdID0gMDtcbiAgICBvdXRbNl0gPSAwO1xuICAgIG91dFs3XSA9IDA7XG4gICAgb3V0WzhdID0gMTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDMudHJhbnNwb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGEgPSB0aGlzLnZhbCxcbiAgICAgICAgYTAxID0gYVsxXSwgXG4gICAgICAgIGEwMiA9IGFbMl0sIFxuICAgICAgICBhMTIgPSBhWzVdO1xuICAgIGFbMV0gPSBhWzNdO1xuICAgIGFbMl0gPSBhWzZdO1xuICAgIGFbM10gPSBhMDE7XG4gICAgYVs1XSA9IGFbN107XG4gICAgYVs2XSA9IGEwMjtcbiAgICBhWzddID0gYTEyO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0My5pbnZlcnQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYSA9IHRoaXMudmFsLFxuICAgICAgICBhMDAgPSBhWzBdLCBhMDEgPSBhWzFdLCBhMDIgPSBhWzJdLFxuICAgICAgICBhMTAgPSBhWzNdLCBhMTEgPSBhWzRdLCBhMTIgPSBhWzVdLFxuICAgICAgICBhMjAgPSBhWzZdLCBhMjEgPSBhWzddLCBhMjIgPSBhWzhdLFxuXG4gICAgICAgIGIwMSA9IGEyMiAqIGExMSAtIGExMiAqIGEyMSxcbiAgICAgICAgYjExID0gLWEyMiAqIGExMCArIGExMiAqIGEyMCxcbiAgICAgICAgYjIxID0gYTIxICogYTEwIC0gYTExICogYTIwLFxuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB0aGUgZGV0ZXJtaW5hbnRcbiAgICAgICAgZGV0ID0gYTAwICogYjAxICsgYTAxICogYjExICsgYTAyICogYjIxO1xuXG4gICAgaWYgKCFkZXQpIHsgXG4gICAgICAgIHJldHVybiBudWxsOyBcbiAgICB9XG4gICAgZGV0ID0gMS4wIC8gZGV0O1xuXG4gICAgYVswXSA9IGIwMSAqIGRldDtcbiAgICBhWzFdID0gKC1hMjIgKiBhMDEgKyBhMDIgKiBhMjEpICogZGV0O1xuICAgIGFbMl0gPSAoYTEyICogYTAxIC0gYTAyICogYTExKSAqIGRldDtcbiAgICBhWzNdID0gYjExICogZGV0O1xuICAgIGFbNF0gPSAoYTIyICogYTAwIC0gYTAyICogYTIwKSAqIGRldDtcbiAgICBhWzVdID0gKC1hMTIgKiBhMDAgKyBhMDIgKiBhMTApICogZGV0O1xuICAgIGFbNl0gPSBiMjEgKiBkZXQ7XG4gICAgYVs3XSA9ICgtYTIxICogYTAwICsgYTAxICogYTIwKSAqIGRldDtcbiAgICBhWzhdID0gKGExMSAqIGEwMCAtIGEwMSAqIGExMCkgKiBkZXQ7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQzLmFkam9pbnQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYSA9IHRoaXMudmFsLFxuICAgICAgICBhMDAgPSBhWzBdLCBhMDEgPSBhWzFdLCBhMDIgPSBhWzJdLFxuICAgICAgICBhMTAgPSBhWzNdLCBhMTEgPSBhWzRdLCBhMTIgPSBhWzVdLFxuICAgICAgICBhMjAgPSBhWzZdLCBhMjEgPSBhWzddLCBhMjIgPSBhWzhdO1xuXG4gICAgYVswXSA9IChhMTEgKiBhMjIgLSBhMTIgKiBhMjEpO1xuICAgIGFbMV0gPSAoYTAyICogYTIxIC0gYTAxICogYTIyKTtcbiAgICBhWzJdID0gKGEwMSAqIGExMiAtIGEwMiAqIGExMSk7XG4gICAgYVszXSA9IChhMTIgKiBhMjAgLSBhMTAgKiBhMjIpO1xuICAgIGFbNF0gPSAoYTAwICogYTIyIC0gYTAyICogYTIwKTtcbiAgICBhWzVdID0gKGEwMiAqIGExMCAtIGEwMCAqIGExMik7XG4gICAgYVs2XSA9IChhMTAgKiBhMjEgLSBhMTEgKiBhMjApO1xuICAgIGFbN10gPSAoYTAxICogYTIwIC0gYTAwICogYTIxKTtcbiAgICBhWzhdID0gKGEwMCAqIGExMSAtIGEwMSAqIGExMCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQzLmRldGVybWluYW50ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGEgPSB0aGlzLnZhbCxcbiAgICAgICAgYTAwID0gYVswXSwgYTAxID0gYVsxXSwgYTAyID0gYVsyXSxcbiAgICAgICAgYTEwID0gYVszXSwgYTExID0gYVs0XSwgYTEyID0gYVs1XSxcbiAgICAgICAgYTIwID0gYVs2XSwgYTIxID0gYVs3XSwgYTIyID0gYVs4XTtcblxuICAgIHJldHVybiBhMDAgKiAoYTIyICogYTExIC0gYTEyICogYTIxKSArIGEwMSAqICgtYTIyICogYTEwICsgYTEyICogYTIwKSArIGEwMiAqIChhMjEgKiBhMTAgLSBhMTEgKiBhMjApO1xufTtcblxubWF0My5tdWx0aXBseSA9IGZ1bmN0aW9uKG90aGVyTWF0KSB7XG4gICAgdmFyIGEgPSB0aGlzLnZhbCxcbiAgICAgICAgYiA9IG90aGVyTWF0LnZhbCxcbiAgICAgICAgYTAwID0gYVswXSwgYTAxID0gYVsxXSwgYTAyID0gYVsyXSxcbiAgICAgICAgYTEwID0gYVszXSwgYTExID0gYVs0XSwgYTEyID0gYVs1XSxcbiAgICAgICAgYTIwID0gYVs2XSwgYTIxID0gYVs3XSwgYTIyID0gYVs4XSxcblxuICAgICAgICBiMDAgPSBiWzBdLCBiMDEgPSBiWzFdLCBiMDIgPSBiWzJdLFxuICAgICAgICBiMTAgPSBiWzNdLCBiMTEgPSBiWzRdLCBiMTIgPSBiWzVdLFxuICAgICAgICBiMjAgPSBiWzZdLCBiMjEgPSBiWzddLCBiMjIgPSBiWzhdO1xuXG4gICAgYVswXSA9IGIwMCAqIGEwMCArIGIwMSAqIGExMCArIGIwMiAqIGEyMDtcbiAgICBhWzFdID0gYjAwICogYTAxICsgYjAxICogYTExICsgYjAyICogYTIxO1xuICAgIGFbMl0gPSBiMDAgKiBhMDIgKyBiMDEgKiBhMTIgKyBiMDIgKiBhMjI7XG5cbiAgICBhWzNdID0gYjEwICogYTAwICsgYjExICogYTEwICsgYjEyICogYTIwO1xuICAgIGFbNF0gPSBiMTAgKiBhMDEgKyBiMTEgKiBhMTEgKyBiMTIgKiBhMjE7XG4gICAgYVs1XSA9IGIxMCAqIGEwMiArIGIxMSAqIGExMiArIGIxMiAqIGEyMjtcblxuICAgIGFbNl0gPSBiMjAgKiBhMDAgKyBiMjEgKiBhMTAgKyBiMjIgKiBhMjA7XG4gICAgYVs3XSA9IGIyMCAqIGEwMSArIGIyMSAqIGExMSArIGIyMiAqIGEyMTtcbiAgICBhWzhdID0gYjIwICogYTAyICsgYjIxICogYTEyICsgYjIyICogYTIyO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0My50cmFuc2xhdGUgPSBmdW5jdGlvbih2KSB7XG4gICAgdmFyIGEgPSB0aGlzLnZhbCxcbiAgICAgICAgeCA9IHYueCwgeSA9IHYueTtcbiAgICBhWzZdID0geCAqIGFbMF0gKyB5ICogYVszXSArIGFbNl07XG4gICAgYVs3XSA9IHggKiBhWzFdICsgeSAqIGFbNF0gKyBhWzddO1xuICAgIGFbOF0gPSB4ICogYVsyXSArIHkgKiBhWzVdICsgYVs4XTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDMucm90YXRlID0gZnVuY3Rpb24ocmFkKSB7XG4gICAgdmFyIGEgPSB0aGlzLnZhbCxcbiAgICAgICAgYTAwID0gYVswXSwgYTAxID0gYVsxXSwgYTAyID0gYVsyXSxcbiAgICAgICAgYTEwID0gYVszXSwgYTExID0gYVs0XSwgYTEyID0gYVs1XSxcblxuICAgICAgICBzID0gTWF0aC5zaW4ocmFkKSxcbiAgICAgICAgYyA9IE1hdGguY29zKHJhZCk7XG5cbiAgICBhWzBdID0gYyAqIGEwMCArIHMgKiBhMTA7XG4gICAgYVsxXSA9IGMgKiBhMDEgKyBzICogYTExO1xuICAgIGFbMl0gPSBjICogYTAyICsgcyAqIGExMjtcblxuICAgIGFbM10gPSBjICogYTEwIC0gcyAqIGEwMDtcbiAgICBhWzRdID0gYyAqIGExMSAtIHMgKiBhMDE7XG4gICAgYVs1XSA9IGMgKiBhMTIgLSBzICogYTAyO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0My5zY2FsZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICB2YXIgYSA9IHRoaXMudmFsLFxuICAgICAgICB4ID0gdi54LCBcbiAgICAgICAgeSA9IHYueTtcblxuICAgIGFbMF0gPSB4ICogYVswXTtcbiAgICBhWzFdID0geCAqIGFbMV07XG4gICAgYVsyXSA9IHggKiBhWzJdO1xuXG4gICAgYVszXSA9IHkgKiBhWzNdO1xuICAgIGFbNF0gPSB5ICogYVs0XTtcbiAgICBhWzVdID0geSAqIGFbNV07XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQzLmZyb21RdWF0ID0gZnVuY3Rpb24ocSkge1xuICAgIHZhciB4ID0gcS54LCB5ID0gcS55LCB6ID0gcS56LCB3ID0gcS53LFxuICAgICAgICB4MiA9IHggKyB4LFxuICAgICAgICB5MiA9IHkgKyB5LFxuICAgICAgICB6MiA9IHogKyB6LFxuXG4gICAgICAgIHh4ID0geCAqIHgyLFxuICAgICAgICB4eSA9IHggKiB5MixcbiAgICAgICAgeHogPSB4ICogejIsXG4gICAgICAgIHl5ID0geSAqIHkyLFxuICAgICAgICB5eiA9IHkgKiB6MixcbiAgICAgICAgenogPSB6ICogejIsXG4gICAgICAgIHd4ID0gdyAqIHgyLFxuICAgICAgICB3eSA9IHcgKiB5MixcbiAgICAgICAgd3ogPSB3ICogejIsXG5cbiAgICAgICAgb3V0ID0gdGhpcy52YWw7XG5cbiAgICBvdXRbMF0gPSAxIC0gKHl5ICsgenopO1xuICAgIG91dFszXSA9IHh5ICsgd3o7XG4gICAgb3V0WzZdID0geHogLSB3eTtcblxuICAgIG91dFsxXSA9IHh5IC0gd3o7XG4gICAgb3V0WzRdID0gMSAtICh4eCArIHp6KTtcbiAgICBvdXRbN10gPSB5eiArIHd4O1xuXG4gICAgb3V0WzJdID0geHogKyB3eTtcbiAgICBvdXRbNV0gPSB5eiAtIHd4O1xuICAgIG91dFs4XSA9IDEgLSAoeHggKyB5eSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQzLm5vcm1hbEZyb21NYXQ0ID0gZnVuY3Rpb24obSkge1xuICAgIHZhciBhID0gbS52YWwsXG4gICAgICAgIG91dCA9IHRoaXMudmFsLFxuXG4gICAgICAgIGEwMCA9IGFbMF0sIGEwMSA9IGFbMV0sIGEwMiA9IGFbMl0sIGEwMyA9IGFbM10sXG4gICAgICAgIGExMCA9IGFbNF0sIGExMSA9IGFbNV0sIGExMiA9IGFbNl0sIGExMyA9IGFbN10sXG4gICAgICAgIGEyMCA9IGFbOF0sIGEyMSA9IGFbOV0sIGEyMiA9IGFbMTBdLCBhMjMgPSBhWzExXSxcbiAgICAgICAgYTMwID0gYVsxMl0sIGEzMSA9IGFbMTNdLCBhMzIgPSBhWzE0XSwgYTMzID0gYVsxNV0sXG5cbiAgICAgICAgYjAwID0gYTAwICogYTExIC0gYTAxICogYTEwLFxuICAgICAgICBiMDEgPSBhMDAgKiBhMTIgLSBhMDIgKiBhMTAsXG4gICAgICAgIGIwMiA9IGEwMCAqIGExMyAtIGEwMyAqIGExMCxcbiAgICAgICAgYjAzID0gYTAxICogYTEyIC0gYTAyICogYTExLFxuICAgICAgICBiMDQgPSBhMDEgKiBhMTMgLSBhMDMgKiBhMTEsXG4gICAgICAgIGIwNSA9IGEwMiAqIGExMyAtIGEwMyAqIGExMixcbiAgICAgICAgYjA2ID0gYTIwICogYTMxIC0gYTIxICogYTMwLFxuICAgICAgICBiMDcgPSBhMjAgKiBhMzIgLSBhMjIgKiBhMzAsXG4gICAgICAgIGIwOCA9IGEyMCAqIGEzMyAtIGEyMyAqIGEzMCxcbiAgICAgICAgYjA5ID0gYTIxICogYTMyIC0gYTIyICogYTMxLFxuICAgICAgICBiMTAgPSBhMjEgKiBhMzMgLSBhMjMgKiBhMzEsXG4gICAgICAgIGIxMSA9IGEyMiAqIGEzMyAtIGEyMyAqIGEzMixcblxuICAgICAgICAvLyBDYWxjdWxhdGUgdGhlIGRldGVybWluYW50XG4gICAgICAgIGRldCA9IGIwMCAqIGIxMSAtIGIwMSAqIGIxMCArIGIwMiAqIGIwOSArIGIwMyAqIGIwOCAtIGIwNCAqIGIwNyArIGIwNSAqIGIwNjtcblxuICAgIGlmICghZGV0KSB7IFxuICAgICAgICByZXR1cm4gbnVsbDsgXG4gICAgfVxuICAgIGRldCA9IDEuMCAvIGRldDtcblxuICAgIG91dFswXSA9IChhMTEgKiBiMTEgLSBhMTIgKiBiMTAgKyBhMTMgKiBiMDkpICogZGV0O1xuICAgIG91dFsxXSA9IChhMTIgKiBiMDggLSBhMTAgKiBiMTEgLSBhMTMgKiBiMDcpICogZGV0O1xuICAgIG91dFsyXSA9IChhMTAgKiBiMTAgLSBhMTEgKiBiMDggKyBhMTMgKiBiMDYpICogZGV0O1xuXG4gICAgb3V0WzNdID0gKGEwMiAqIGIxMCAtIGEwMSAqIGIxMSAtIGEwMyAqIGIwOSkgKiBkZXQ7XG4gICAgb3V0WzRdID0gKGEwMCAqIGIxMSAtIGEwMiAqIGIwOCArIGEwMyAqIGIwNykgKiBkZXQ7XG4gICAgb3V0WzVdID0gKGEwMSAqIGIwOCAtIGEwMCAqIGIxMCAtIGEwMyAqIGIwNikgKiBkZXQ7XG5cbiAgICBvdXRbNl0gPSAoYTMxICogYjA1IC0gYTMyICogYjA0ICsgYTMzICogYjAzKSAqIGRldDtcbiAgICBvdXRbN10gPSAoYTMyICogYjAyIC0gYTMwICogYjA1IC0gYTMzICogYjAxKSAqIGRldDtcbiAgICBvdXRbOF0gPSAoYTMwICogYjA0IC0gYTMxICogYjAyICsgYTMzICogYjAwKSAqIGRldDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDMubXVsID0gbWF0My5tdWx0aXBseTtcblxubWF0My5pZHQgPSBtYXQzLmlkZW50aXR5O1xuXG4vL1RoaXMgaXMgaGFuZHkgZm9yIFBvb2wgdXRpbGl0aWVzLCB0byBcInJlc2V0XCIgYVxuLy9zaGFyZWQgb2JqZWN0IHRvIGl0cyBkZWZhdWx0IHN0YXRlXG5tYXQzLnJlc2V0ID0gbWF0My5pZHQ7XG5cbm1hdDMudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYSA9IHRoaXMudmFsO1xuICAgIHJldHVybiAnTWF0cml4MygnICsgYVswXSArICcsICcgKyBhWzFdICsgJywgJyArIGFbMl0gKyAnLCAnICsgXG4gICAgICAgICAgICAgICAgICAgIGFbM10gKyAnLCAnICsgYVs0XSArICcsICcgKyBhWzVdICsgJywgJyArIFxuICAgICAgICAgICAgICAgICAgICBhWzZdICsgJywgJyArIGFbN10gKyAnLCAnICsgYVs4XSArICcpJztcbn07XG5cbm1hdDMuc3RyID0gbWF0My50b1N0cmluZztcblxubW9kdWxlLmV4cG9ydHMgPSBNYXRyaXgzOyIsInZhciBBUlJBWV9UWVBFID0gdHlwZW9mIEZsb2F0MzJBcnJheSAhPT0gXCJ1bmRlZmluZWRcIiA/IEZsb2F0MzJBcnJheSA6IEFycmF5O1xudmFyIEVQU0lMT04gPSAwLjAwMDAwMTtcblxuZnVuY3Rpb24gTWF0cml4NChtKSB7XG4gICAgdGhpcy52YWwgPSBuZXcgQVJSQVlfVFlQRSgxNik7XG5cbiAgICBpZiAobSkgeyAvL2Fzc3VtZSBNYXRyaXg0IHdpdGggdmFsXG4gICAgICAgIHRoaXMuY29weShtKTtcbiAgICB9IGVsc2UgeyAvL2RlZmF1bHQgdG8gaWRlbnRpdHlcbiAgICAgICAgdGhpcy5pZHQoKTtcbiAgICB9XG59XG5cbnZhciBtYXQ0ID0gTWF0cml4NC5wcm90b3R5cGU7XG5cbm1hdDQuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IE1hdHJpeDQodGhpcyk7XG59O1xuXG5tYXQ0LnNldCA9IGZ1bmN0aW9uKG90aGVyTWF0KSB7XG4gICAgcmV0dXJuIHRoaXMuY29weShvdGhlck1hdCk7XG59O1xuXG5tYXQ0LmNvcHkgPSBmdW5jdGlvbihvdGhlck1hdCkge1xuICAgIHZhciBvdXQgPSB0aGlzLnZhbCxcbiAgICAgICAgYSA9IG90aGVyTWF0LnZhbDsgXG4gICAgb3V0WzBdID0gYVswXTtcbiAgICBvdXRbMV0gPSBhWzFdO1xuICAgIG91dFsyXSA9IGFbMl07XG4gICAgb3V0WzNdID0gYVszXTtcbiAgICBvdXRbNF0gPSBhWzRdO1xuICAgIG91dFs1XSA9IGFbNV07XG4gICAgb3V0WzZdID0gYVs2XTtcbiAgICBvdXRbN10gPSBhWzddO1xuICAgIG91dFs4XSA9IGFbOF07XG4gICAgb3V0WzldID0gYVs5XTtcbiAgICBvdXRbMTBdID0gYVsxMF07XG4gICAgb3V0WzExXSA9IGFbMTFdO1xuICAgIG91dFsxMl0gPSBhWzEyXTtcbiAgICBvdXRbMTNdID0gYVsxM107XG4gICAgb3V0WzE0XSA9IGFbMTRdO1xuICAgIG91dFsxNV0gPSBhWzE1XTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDQuZnJvbUFycmF5ID0gZnVuY3Rpb24oYSkge1xuICAgIHZhciBvdXQgPSB0aGlzLnZhbDtcbiAgICBvdXRbMF0gPSBhWzBdO1xuICAgIG91dFsxXSA9IGFbMV07XG4gICAgb3V0WzJdID0gYVsyXTtcbiAgICBvdXRbM10gPSBhWzNdO1xuICAgIG91dFs0XSA9IGFbNF07XG4gICAgb3V0WzVdID0gYVs1XTtcbiAgICBvdXRbNl0gPSBhWzZdO1xuICAgIG91dFs3XSA9IGFbN107XG4gICAgb3V0WzhdID0gYVs4XTtcbiAgICBvdXRbOV0gPSBhWzldO1xuICAgIG91dFsxMF0gPSBhWzEwXTtcbiAgICBvdXRbMTFdID0gYVsxMV07XG4gICAgb3V0WzEyXSA9IGFbMTJdO1xuICAgIG91dFsxM10gPSBhWzEzXTtcbiAgICBvdXRbMTRdID0gYVsxNF07XG4gICAgb3V0WzE1XSA9IGFbMTVdO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0NC5pZGVudGl0eSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBvdXQgPSB0aGlzLnZhbDtcbiAgICBvdXRbMF0gPSAxO1xuICAgIG91dFsxXSA9IDA7XG4gICAgb3V0WzJdID0gMDtcbiAgICBvdXRbM10gPSAwO1xuICAgIG91dFs0XSA9IDA7XG4gICAgb3V0WzVdID0gMTtcbiAgICBvdXRbNl0gPSAwO1xuICAgIG91dFs3XSA9IDA7XG4gICAgb3V0WzhdID0gMDtcbiAgICBvdXRbOV0gPSAwO1xuICAgIG91dFsxMF0gPSAxO1xuICAgIG91dFsxMV0gPSAwO1xuICAgIG91dFsxMl0gPSAwO1xuICAgIG91dFsxM10gPSAwO1xuICAgIG91dFsxNF0gPSAwO1xuICAgIG91dFsxNV0gPSAxO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0NC50cmFuc3Bvc2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYSA9IHRoaXMudmFsLFxuICAgICAgICBhMDEgPSBhWzFdLCBhMDIgPSBhWzJdLCBhMDMgPSBhWzNdLFxuICAgICAgICBhMTIgPSBhWzZdLCBhMTMgPSBhWzddLFxuICAgICAgICBhMjMgPSBhWzExXTtcblxuICAgIGFbMV0gPSBhWzRdO1xuICAgIGFbMl0gPSBhWzhdO1xuICAgIGFbM10gPSBhWzEyXTtcbiAgICBhWzRdID0gYTAxO1xuICAgIGFbNl0gPSBhWzldO1xuICAgIGFbN10gPSBhWzEzXTtcbiAgICBhWzhdID0gYTAyO1xuICAgIGFbOV0gPSBhMTI7XG4gICAgYVsxMV0gPSBhWzE0XTtcbiAgICBhWzEyXSA9IGEwMztcbiAgICBhWzEzXSA9IGExMztcbiAgICBhWzE0XSA9IGEyMztcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDQuaW52ZXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGEgPSB0aGlzLnZhbCxcbiAgICAgICAgYTAwID0gYVswXSwgYTAxID0gYVsxXSwgYTAyID0gYVsyXSwgYTAzID0gYVszXSxcbiAgICAgICAgYTEwID0gYVs0XSwgYTExID0gYVs1XSwgYTEyID0gYVs2XSwgYTEzID0gYVs3XSxcbiAgICAgICAgYTIwID0gYVs4XSwgYTIxID0gYVs5XSwgYTIyID0gYVsxMF0sIGEyMyA9IGFbMTFdLFxuICAgICAgICBhMzAgPSBhWzEyXSwgYTMxID0gYVsxM10sIGEzMiA9IGFbMTRdLCBhMzMgPSBhWzE1XSxcblxuICAgICAgICBiMDAgPSBhMDAgKiBhMTEgLSBhMDEgKiBhMTAsXG4gICAgICAgIGIwMSA9IGEwMCAqIGExMiAtIGEwMiAqIGExMCxcbiAgICAgICAgYjAyID0gYTAwICogYTEzIC0gYTAzICogYTEwLFxuICAgICAgICBiMDMgPSBhMDEgKiBhMTIgLSBhMDIgKiBhMTEsXG4gICAgICAgIGIwNCA9IGEwMSAqIGExMyAtIGEwMyAqIGExMSxcbiAgICAgICAgYjA1ID0gYTAyICogYTEzIC0gYTAzICogYTEyLFxuICAgICAgICBiMDYgPSBhMjAgKiBhMzEgLSBhMjEgKiBhMzAsXG4gICAgICAgIGIwNyA9IGEyMCAqIGEzMiAtIGEyMiAqIGEzMCxcbiAgICAgICAgYjA4ID0gYTIwICogYTMzIC0gYTIzICogYTMwLFxuICAgICAgICBiMDkgPSBhMjEgKiBhMzIgLSBhMjIgKiBhMzEsXG4gICAgICAgIGIxMCA9IGEyMSAqIGEzMyAtIGEyMyAqIGEzMSxcbiAgICAgICAgYjExID0gYTIyICogYTMzIC0gYTIzICogYTMyLFxuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB0aGUgZGV0ZXJtaW5hbnRcbiAgICAgICAgZGV0ID0gYjAwICogYjExIC0gYjAxICogYjEwICsgYjAyICogYjA5ICsgYjAzICogYjA4IC0gYjA0ICogYjA3ICsgYjA1ICogYjA2O1xuXG4gICAgaWYgKCFkZXQpIHsgXG4gICAgICAgIHJldHVybiBudWxsOyBcbiAgICB9XG4gICAgZGV0ID0gMS4wIC8gZGV0O1xuXG4gICAgYVswXSA9IChhMTEgKiBiMTEgLSBhMTIgKiBiMTAgKyBhMTMgKiBiMDkpICogZGV0O1xuICAgIGFbMV0gPSAoYTAyICogYjEwIC0gYTAxICogYjExIC0gYTAzICogYjA5KSAqIGRldDtcbiAgICBhWzJdID0gKGEzMSAqIGIwNSAtIGEzMiAqIGIwNCArIGEzMyAqIGIwMykgKiBkZXQ7XG4gICAgYVszXSA9IChhMjIgKiBiMDQgLSBhMjEgKiBiMDUgLSBhMjMgKiBiMDMpICogZGV0O1xuICAgIGFbNF0gPSAoYTEyICogYjA4IC0gYTEwICogYjExIC0gYTEzICogYjA3KSAqIGRldDtcbiAgICBhWzVdID0gKGEwMCAqIGIxMSAtIGEwMiAqIGIwOCArIGEwMyAqIGIwNykgKiBkZXQ7XG4gICAgYVs2XSA9IChhMzIgKiBiMDIgLSBhMzAgKiBiMDUgLSBhMzMgKiBiMDEpICogZGV0O1xuICAgIGFbN10gPSAoYTIwICogYjA1IC0gYTIyICogYjAyICsgYTIzICogYjAxKSAqIGRldDtcbiAgICBhWzhdID0gKGExMCAqIGIxMCAtIGExMSAqIGIwOCArIGExMyAqIGIwNikgKiBkZXQ7XG4gICAgYVs5XSA9IChhMDEgKiBiMDggLSBhMDAgKiBiMTAgLSBhMDMgKiBiMDYpICogZGV0O1xuICAgIGFbMTBdID0gKGEzMCAqIGIwNCAtIGEzMSAqIGIwMiArIGEzMyAqIGIwMCkgKiBkZXQ7XG4gICAgYVsxMV0gPSAoYTIxICogYjAyIC0gYTIwICogYjA0IC0gYTIzICogYjAwKSAqIGRldDtcbiAgICBhWzEyXSA9IChhMTEgKiBiMDcgLSBhMTAgKiBiMDkgLSBhMTIgKiBiMDYpICogZGV0O1xuICAgIGFbMTNdID0gKGEwMCAqIGIwOSAtIGEwMSAqIGIwNyArIGEwMiAqIGIwNikgKiBkZXQ7XG4gICAgYVsxNF0gPSAoYTMxICogYjAxIC0gYTMwICogYjAzIC0gYTMyICogYjAwKSAqIGRldDtcbiAgICBhWzE1XSA9IChhMjAgKiBiMDMgLSBhMjEgKiBiMDEgKyBhMjIgKiBiMDApICogZGV0O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0NC5hZGpvaW50ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGEgPSB0aGlzLnZhbCxcbiAgICAgICAgYTAwID0gYVswXSwgYTAxID0gYVsxXSwgYTAyID0gYVsyXSwgYTAzID0gYVszXSxcbiAgICAgICAgYTEwID0gYVs0XSwgYTExID0gYVs1XSwgYTEyID0gYVs2XSwgYTEzID0gYVs3XSxcbiAgICAgICAgYTIwID0gYVs4XSwgYTIxID0gYVs5XSwgYTIyID0gYVsxMF0sIGEyMyA9IGFbMTFdLFxuICAgICAgICBhMzAgPSBhWzEyXSwgYTMxID0gYVsxM10sIGEzMiA9IGFbMTRdLCBhMzMgPSBhWzE1XTtcblxuICAgIGFbMF0gID0gIChhMTEgKiAoYTIyICogYTMzIC0gYTIzICogYTMyKSAtIGEyMSAqIChhMTIgKiBhMzMgLSBhMTMgKiBhMzIpICsgYTMxICogKGExMiAqIGEyMyAtIGExMyAqIGEyMikpO1xuICAgIGFbMV0gID0gLShhMDEgKiAoYTIyICogYTMzIC0gYTIzICogYTMyKSAtIGEyMSAqIChhMDIgKiBhMzMgLSBhMDMgKiBhMzIpICsgYTMxICogKGEwMiAqIGEyMyAtIGEwMyAqIGEyMikpO1xuICAgIGFbMl0gID0gIChhMDEgKiAoYTEyICogYTMzIC0gYTEzICogYTMyKSAtIGExMSAqIChhMDIgKiBhMzMgLSBhMDMgKiBhMzIpICsgYTMxICogKGEwMiAqIGExMyAtIGEwMyAqIGExMikpO1xuICAgIGFbM10gID0gLShhMDEgKiAoYTEyICogYTIzIC0gYTEzICogYTIyKSAtIGExMSAqIChhMDIgKiBhMjMgLSBhMDMgKiBhMjIpICsgYTIxICogKGEwMiAqIGExMyAtIGEwMyAqIGExMikpO1xuICAgIGFbNF0gID0gLShhMTAgKiAoYTIyICogYTMzIC0gYTIzICogYTMyKSAtIGEyMCAqIChhMTIgKiBhMzMgLSBhMTMgKiBhMzIpICsgYTMwICogKGExMiAqIGEyMyAtIGExMyAqIGEyMikpO1xuICAgIGFbNV0gID0gIChhMDAgKiAoYTIyICogYTMzIC0gYTIzICogYTMyKSAtIGEyMCAqIChhMDIgKiBhMzMgLSBhMDMgKiBhMzIpICsgYTMwICogKGEwMiAqIGEyMyAtIGEwMyAqIGEyMikpO1xuICAgIGFbNl0gID0gLShhMDAgKiAoYTEyICogYTMzIC0gYTEzICogYTMyKSAtIGExMCAqIChhMDIgKiBhMzMgLSBhMDMgKiBhMzIpICsgYTMwICogKGEwMiAqIGExMyAtIGEwMyAqIGExMikpO1xuICAgIGFbN10gID0gIChhMDAgKiAoYTEyICogYTIzIC0gYTEzICogYTIyKSAtIGExMCAqIChhMDIgKiBhMjMgLSBhMDMgKiBhMjIpICsgYTIwICogKGEwMiAqIGExMyAtIGEwMyAqIGExMikpO1xuICAgIGFbOF0gID0gIChhMTAgKiAoYTIxICogYTMzIC0gYTIzICogYTMxKSAtIGEyMCAqIChhMTEgKiBhMzMgLSBhMTMgKiBhMzEpICsgYTMwICogKGExMSAqIGEyMyAtIGExMyAqIGEyMSkpO1xuICAgIGFbOV0gID0gLShhMDAgKiAoYTIxICogYTMzIC0gYTIzICogYTMxKSAtIGEyMCAqIChhMDEgKiBhMzMgLSBhMDMgKiBhMzEpICsgYTMwICogKGEwMSAqIGEyMyAtIGEwMyAqIGEyMSkpO1xuICAgIGFbMTBdID0gIChhMDAgKiAoYTExICogYTMzIC0gYTEzICogYTMxKSAtIGExMCAqIChhMDEgKiBhMzMgLSBhMDMgKiBhMzEpICsgYTMwICogKGEwMSAqIGExMyAtIGEwMyAqIGExMSkpO1xuICAgIGFbMTFdID0gLShhMDAgKiAoYTExICogYTIzIC0gYTEzICogYTIxKSAtIGExMCAqIChhMDEgKiBhMjMgLSBhMDMgKiBhMjEpICsgYTIwICogKGEwMSAqIGExMyAtIGEwMyAqIGExMSkpO1xuICAgIGFbMTJdID0gLShhMTAgKiAoYTIxICogYTMyIC0gYTIyICogYTMxKSAtIGEyMCAqIChhMTEgKiBhMzIgLSBhMTIgKiBhMzEpICsgYTMwICogKGExMSAqIGEyMiAtIGExMiAqIGEyMSkpO1xuICAgIGFbMTNdID0gIChhMDAgKiAoYTIxICogYTMyIC0gYTIyICogYTMxKSAtIGEyMCAqIChhMDEgKiBhMzIgLSBhMDIgKiBhMzEpICsgYTMwICogKGEwMSAqIGEyMiAtIGEwMiAqIGEyMSkpO1xuICAgIGFbMTRdID0gLShhMDAgKiAoYTExICogYTMyIC0gYTEyICogYTMxKSAtIGExMCAqIChhMDEgKiBhMzIgLSBhMDIgKiBhMzEpICsgYTMwICogKGEwMSAqIGExMiAtIGEwMiAqIGExMSkpO1xuICAgIGFbMTVdID0gIChhMDAgKiAoYTExICogYTIyIC0gYTEyICogYTIxKSAtIGExMCAqIChhMDEgKiBhMjIgLSBhMDIgKiBhMjEpICsgYTIwICogKGEwMSAqIGExMiAtIGEwMiAqIGExMSkpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0NC5kZXRlcm1pbmFudCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYSA9IHRoaXMudmFsLFxuICAgICAgICBhMDAgPSBhWzBdLCBhMDEgPSBhWzFdLCBhMDIgPSBhWzJdLCBhMDMgPSBhWzNdLFxuICAgICAgICBhMTAgPSBhWzRdLCBhMTEgPSBhWzVdLCBhMTIgPSBhWzZdLCBhMTMgPSBhWzddLFxuICAgICAgICBhMjAgPSBhWzhdLCBhMjEgPSBhWzldLCBhMjIgPSBhWzEwXSwgYTIzID0gYVsxMV0sXG4gICAgICAgIGEzMCA9IGFbMTJdLCBhMzEgPSBhWzEzXSwgYTMyID0gYVsxNF0sIGEzMyA9IGFbMTVdLFxuXG4gICAgICAgIGIwMCA9IGEwMCAqIGExMSAtIGEwMSAqIGExMCxcbiAgICAgICAgYjAxID0gYTAwICogYTEyIC0gYTAyICogYTEwLFxuICAgICAgICBiMDIgPSBhMDAgKiBhMTMgLSBhMDMgKiBhMTAsXG4gICAgICAgIGIwMyA9IGEwMSAqIGExMiAtIGEwMiAqIGExMSxcbiAgICAgICAgYjA0ID0gYTAxICogYTEzIC0gYTAzICogYTExLFxuICAgICAgICBiMDUgPSBhMDIgKiBhMTMgLSBhMDMgKiBhMTIsXG4gICAgICAgIGIwNiA9IGEyMCAqIGEzMSAtIGEyMSAqIGEzMCxcbiAgICAgICAgYjA3ID0gYTIwICogYTMyIC0gYTIyICogYTMwLFxuICAgICAgICBiMDggPSBhMjAgKiBhMzMgLSBhMjMgKiBhMzAsXG4gICAgICAgIGIwOSA9IGEyMSAqIGEzMiAtIGEyMiAqIGEzMSxcbiAgICAgICAgYjEwID0gYTIxICogYTMzIC0gYTIzICogYTMxLFxuICAgICAgICBiMTEgPSBhMjIgKiBhMzMgLSBhMjMgKiBhMzI7XG5cbiAgICAvLyBDYWxjdWxhdGUgdGhlIGRldGVybWluYW50XG4gICAgcmV0dXJuIGIwMCAqIGIxMSAtIGIwMSAqIGIxMCArIGIwMiAqIGIwOSArIGIwMyAqIGIwOCAtIGIwNCAqIGIwNyArIGIwNSAqIGIwNjtcbn07XG5cbm1hdDQubXVsdGlwbHkgPSBmdW5jdGlvbihvdGhlck1hdCkge1xuICAgIHZhciBhID0gdGhpcy52YWwsXG4gICAgICAgIGIgPSBvdGhlck1hdC52YWwsXG4gICAgICAgIGEwMCA9IGFbMF0sIGEwMSA9IGFbMV0sIGEwMiA9IGFbMl0sIGEwMyA9IGFbM10sXG4gICAgICAgIGExMCA9IGFbNF0sIGExMSA9IGFbNV0sIGExMiA9IGFbNl0sIGExMyA9IGFbN10sXG4gICAgICAgIGEyMCA9IGFbOF0sIGEyMSA9IGFbOV0sIGEyMiA9IGFbMTBdLCBhMjMgPSBhWzExXSxcbiAgICAgICAgYTMwID0gYVsxMl0sIGEzMSA9IGFbMTNdLCBhMzIgPSBhWzE0XSwgYTMzID0gYVsxNV07XG5cbiAgICAvLyBDYWNoZSBvbmx5IHRoZSBjdXJyZW50IGxpbmUgb2YgdGhlIHNlY29uZCBtYXRyaXhcbiAgICB2YXIgYjAgID0gYlswXSwgYjEgPSBiWzFdLCBiMiA9IGJbMl0sIGIzID0gYlszXTsgIFxuICAgIGFbMF0gPSBiMCphMDAgKyBiMSphMTAgKyBiMiphMjAgKyBiMyphMzA7XG4gICAgYVsxXSA9IGIwKmEwMSArIGIxKmExMSArIGIyKmEyMSArIGIzKmEzMTtcbiAgICBhWzJdID0gYjAqYTAyICsgYjEqYTEyICsgYjIqYTIyICsgYjMqYTMyO1xuICAgIGFbM10gPSBiMCphMDMgKyBiMSphMTMgKyBiMiphMjMgKyBiMyphMzM7XG5cbiAgICBiMCA9IGJbNF07IGIxID0gYls1XTsgYjIgPSBiWzZdOyBiMyA9IGJbN107XG4gICAgYVs0XSA9IGIwKmEwMCArIGIxKmExMCArIGIyKmEyMCArIGIzKmEzMDtcbiAgICBhWzVdID0gYjAqYTAxICsgYjEqYTExICsgYjIqYTIxICsgYjMqYTMxO1xuICAgIGFbNl0gPSBiMCphMDIgKyBiMSphMTIgKyBiMiphMjIgKyBiMyphMzI7XG4gICAgYVs3XSA9IGIwKmEwMyArIGIxKmExMyArIGIyKmEyMyArIGIzKmEzMztcblxuICAgIGIwID0gYls4XTsgYjEgPSBiWzldOyBiMiA9IGJbMTBdOyBiMyA9IGJbMTFdO1xuICAgIGFbOF0gPSBiMCphMDAgKyBiMSphMTAgKyBiMiphMjAgKyBiMyphMzA7XG4gICAgYVs5XSA9IGIwKmEwMSArIGIxKmExMSArIGIyKmEyMSArIGIzKmEzMTtcbiAgICBhWzEwXSA9IGIwKmEwMiArIGIxKmExMiArIGIyKmEyMiArIGIzKmEzMjtcbiAgICBhWzExXSA9IGIwKmEwMyArIGIxKmExMyArIGIyKmEyMyArIGIzKmEzMztcblxuICAgIGIwID0gYlsxMl07IGIxID0gYlsxM107IGIyID0gYlsxNF07IGIzID0gYlsxNV07XG4gICAgYVsxMl0gPSBiMCphMDAgKyBiMSphMTAgKyBiMiphMjAgKyBiMyphMzA7XG4gICAgYVsxM10gPSBiMCphMDEgKyBiMSphMTEgKyBiMiphMjEgKyBiMyphMzE7XG4gICAgYVsxNF0gPSBiMCphMDIgKyBiMSphMTIgKyBiMiphMjIgKyBiMyphMzI7XG4gICAgYVsxNV0gPSBiMCphMDMgKyBiMSphMTMgKyBiMiphMjMgKyBiMyphMzM7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tYXQ0LnRyYW5zbGF0ZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICB2YXIgeCA9IHYueCwgeSA9IHYueSwgeiA9IHYueixcbiAgICAgICAgYSA9IHRoaXMudmFsO1xuICAgIGFbMTJdID0gYVswXSAqIHggKyBhWzRdICogeSArIGFbOF0gKiB6ICsgYVsxMl07XG4gICAgYVsxM10gPSBhWzFdICogeCArIGFbNV0gKiB5ICsgYVs5XSAqIHogKyBhWzEzXTtcbiAgICBhWzE0XSA9IGFbMl0gKiB4ICsgYVs2XSAqIHkgKyBhWzEwXSAqIHogKyBhWzE0XTtcbiAgICBhWzE1XSA9IGFbM10gKiB4ICsgYVs3XSAqIHkgKyBhWzExXSAqIHogKyBhWzE1XTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1hdDQuc2NhbGUgPSBmdW5jdGlvbih2KSB7XG4gICAgdmFyIHggPSB2LngsIHkgPSB2LnksIHogPSB2LnosIGEgPSB0aGlzLnZhbDtcblxuICAgIGFbMF0gPSBhWzBdICogeDtcbiAgICBhWzFdID0gYVsxXSAqIHg7XG4gICAgYVsyXSA9IGFbMl0gKiB4O1xuICAgIGFbM10gPSBhWzNdICogeDtcbiAgICBhWzRdID0gYVs0XSAqIHk7XG4gICAgYVs1XSA9IGFbNV0gKiB5O1xuICAgIGFbNl0gPSBhWzZdICogeTtcbiAgICBhWzddID0gYVs3XSAqIHk7XG4gICAgYVs4XSA9IGFbOF0gKiB6O1xuICAgIGFbOV0gPSBhWzldICogejtcbiAgICBhWzEwXSA9IGFbMTBdICogejtcbiAgICBhWzExXSA9IGFbMTFdICogejtcbiAgICBhWzEyXSA9IGFbMTJdO1xuICAgIGFbMTNdID0gYVsxM107XG4gICAgYVsxNF0gPSBhWzE0XTtcbiAgICBhWzE1XSA9IGFbMTVdO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0NC5yb3RhdGUgPSBmdW5jdGlvbiAocmFkLCBheGlzKSB7XG4gICAgdmFyIGEgPSB0aGlzLnZhbCxcbiAgICAgICAgeCA9IGF4aXMueCwgeSA9IGF4aXMueSwgeiA9IGF4aXMueixcbiAgICAgICAgbGVuID0gTWF0aC5zcXJ0KHggKiB4ICsgeSAqIHkgKyB6ICogeiksXG4gICAgICAgIHMsIGMsIHQsXG4gICAgICAgIGEwMCwgYTAxLCBhMDIsIGEwMyxcbiAgICAgICAgYTEwLCBhMTEsIGExMiwgYTEzLFxuICAgICAgICBhMjAsIGEyMSwgYTIyLCBhMjMsXG4gICAgICAgIGIwMCwgYjAxLCBiMDIsXG4gICAgICAgIGIxMCwgYjExLCBiMTIsXG4gICAgICAgIGIyMCwgYjIxLCBiMjI7XG5cbiAgICBpZiAoTWF0aC5hYnMobGVuKSA8IEVQU0lMT04pIHsgcmV0dXJuIG51bGw7IH1cbiAgICBcbiAgICBsZW4gPSAxIC8gbGVuO1xuICAgIHggKj0gbGVuO1xuICAgIHkgKj0gbGVuO1xuICAgIHogKj0gbGVuO1xuXG4gICAgcyA9IE1hdGguc2luKHJhZCk7XG4gICAgYyA9IE1hdGguY29zKHJhZCk7XG4gICAgdCA9IDEgLSBjO1xuXG4gICAgYTAwID0gYVswXTsgYTAxID0gYVsxXTsgYTAyID0gYVsyXTsgYTAzID0gYVszXTtcbiAgICBhMTAgPSBhWzRdOyBhMTEgPSBhWzVdOyBhMTIgPSBhWzZdOyBhMTMgPSBhWzddO1xuICAgIGEyMCA9IGFbOF07IGEyMSA9IGFbOV07IGEyMiA9IGFbMTBdOyBhMjMgPSBhWzExXTtcblxuICAgIC8vIENvbnN0cnVjdCB0aGUgZWxlbWVudHMgb2YgdGhlIHJvdGF0aW9uIG1hdHJpeFxuICAgIGIwMCA9IHggKiB4ICogdCArIGM7IGIwMSA9IHkgKiB4ICogdCArIHogKiBzOyBiMDIgPSB6ICogeCAqIHQgLSB5ICogcztcbiAgICBiMTAgPSB4ICogeSAqIHQgLSB6ICogczsgYjExID0geSAqIHkgKiB0ICsgYzsgYjEyID0geiAqIHkgKiB0ICsgeCAqIHM7XG4gICAgYjIwID0geCAqIHogKiB0ICsgeSAqIHM7IGIyMSA9IHkgKiB6ICogdCAtIHggKiBzOyBiMjIgPSB6ICogeiAqIHQgKyBjO1xuXG4gICAgLy8gUGVyZm9ybSByb3RhdGlvbi1zcGVjaWZpYyBtYXRyaXggbXVsdGlwbGljYXRpb25cbiAgICBhWzBdID0gYTAwICogYjAwICsgYTEwICogYjAxICsgYTIwICogYjAyO1xuICAgIGFbMV0gPSBhMDEgKiBiMDAgKyBhMTEgKiBiMDEgKyBhMjEgKiBiMDI7XG4gICAgYVsyXSA9IGEwMiAqIGIwMCArIGExMiAqIGIwMSArIGEyMiAqIGIwMjtcbiAgICBhWzNdID0gYTAzICogYjAwICsgYTEzICogYjAxICsgYTIzICogYjAyO1xuICAgIGFbNF0gPSBhMDAgKiBiMTAgKyBhMTAgKiBiMTEgKyBhMjAgKiBiMTI7XG4gICAgYVs1XSA9IGEwMSAqIGIxMCArIGExMSAqIGIxMSArIGEyMSAqIGIxMjtcbiAgICBhWzZdID0gYTAyICogYjEwICsgYTEyICogYjExICsgYTIyICogYjEyO1xuICAgIGFbN10gPSBhMDMgKiBiMTAgKyBhMTMgKiBiMTEgKyBhMjMgKiBiMTI7XG4gICAgYVs4XSA9IGEwMCAqIGIyMCArIGExMCAqIGIyMSArIGEyMCAqIGIyMjtcbiAgICBhWzldID0gYTAxICogYjIwICsgYTExICogYjIxICsgYTIxICogYjIyO1xuICAgIGFbMTBdID0gYTAyICogYjIwICsgYTEyICogYjIxICsgYTIyICogYjIyO1xuICAgIGFbMTFdID0gYTAzICogYjIwICsgYTEzICogYjIxICsgYTIzICogYjIyO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0NC5yb3RhdGVYID0gZnVuY3Rpb24ocmFkKSB7XG4gICAgdmFyIGEgPSB0aGlzLnZhbCxcbiAgICAgICAgcyA9IE1hdGguc2luKHJhZCksXG4gICAgICAgIGMgPSBNYXRoLmNvcyhyYWQpLFxuICAgICAgICBhMTAgPSBhWzRdLFxuICAgICAgICBhMTEgPSBhWzVdLFxuICAgICAgICBhMTIgPSBhWzZdLFxuICAgICAgICBhMTMgPSBhWzddLFxuICAgICAgICBhMjAgPSBhWzhdLFxuICAgICAgICBhMjEgPSBhWzldLFxuICAgICAgICBhMjIgPSBhWzEwXSxcbiAgICAgICAgYTIzID0gYVsxMV07XG5cbiAgICAvLyBQZXJmb3JtIGF4aXMtc3BlY2lmaWMgbWF0cml4IG11bHRpcGxpY2F0aW9uXG4gICAgYVs0XSA9IGExMCAqIGMgKyBhMjAgKiBzO1xuICAgIGFbNV0gPSBhMTEgKiBjICsgYTIxICogcztcbiAgICBhWzZdID0gYTEyICogYyArIGEyMiAqIHM7XG4gICAgYVs3XSA9IGExMyAqIGMgKyBhMjMgKiBzO1xuICAgIGFbOF0gPSBhMjAgKiBjIC0gYTEwICogcztcbiAgICBhWzldID0gYTIxICogYyAtIGExMSAqIHM7XG4gICAgYVsxMF0gPSBhMjIgKiBjIC0gYTEyICogcztcbiAgICBhWzExXSA9IGEyMyAqIGMgLSBhMTMgKiBzO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0NC5yb3RhdGVZID0gZnVuY3Rpb24ocmFkKSB7XG4gICAgdmFyIGEgPSB0aGlzLnZhbCxcbiAgICAgICAgcyA9IE1hdGguc2luKHJhZCksXG4gICAgICAgIGMgPSBNYXRoLmNvcyhyYWQpLFxuICAgICAgICBhMDAgPSBhWzBdLFxuICAgICAgICBhMDEgPSBhWzFdLFxuICAgICAgICBhMDIgPSBhWzJdLFxuICAgICAgICBhMDMgPSBhWzNdLFxuICAgICAgICBhMjAgPSBhWzhdLFxuICAgICAgICBhMjEgPSBhWzldLFxuICAgICAgICBhMjIgPSBhWzEwXSxcbiAgICAgICAgYTIzID0gYVsxMV07XG5cbiAgICAvLyBQZXJmb3JtIGF4aXMtc3BlY2lmaWMgbWF0cml4IG11bHRpcGxpY2F0aW9uXG4gICAgYVswXSA9IGEwMCAqIGMgLSBhMjAgKiBzO1xuICAgIGFbMV0gPSBhMDEgKiBjIC0gYTIxICogcztcbiAgICBhWzJdID0gYTAyICogYyAtIGEyMiAqIHM7XG4gICAgYVszXSA9IGEwMyAqIGMgLSBhMjMgKiBzO1xuICAgIGFbOF0gPSBhMDAgKiBzICsgYTIwICogYztcbiAgICBhWzldID0gYTAxICogcyArIGEyMSAqIGM7XG4gICAgYVsxMF0gPSBhMDIgKiBzICsgYTIyICogYztcbiAgICBhWzExXSA9IGEwMyAqIHMgKyBhMjMgKiBjO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0NC5yb3RhdGVaID0gZnVuY3Rpb24gKHJhZCkge1xuICAgIHZhciBhID0gdGhpcy52YWwsXG4gICAgICAgIHMgPSBNYXRoLnNpbihyYWQpLFxuICAgICAgICBjID0gTWF0aC5jb3MocmFkKSxcbiAgICAgICAgYTAwID0gYVswXSxcbiAgICAgICAgYTAxID0gYVsxXSxcbiAgICAgICAgYTAyID0gYVsyXSxcbiAgICAgICAgYTAzID0gYVszXSxcbiAgICAgICAgYTEwID0gYVs0XSxcbiAgICAgICAgYTExID0gYVs1XSxcbiAgICAgICAgYTEyID0gYVs2XSxcbiAgICAgICAgYTEzID0gYVs3XTtcblxuICAgIC8vIFBlcmZvcm0gYXhpcy1zcGVjaWZpYyBtYXRyaXggbXVsdGlwbGljYXRpb25cbiAgICBhWzBdID0gYTAwICogYyArIGExMCAqIHM7XG4gICAgYVsxXSA9IGEwMSAqIGMgKyBhMTEgKiBzO1xuICAgIGFbMl0gPSBhMDIgKiBjICsgYTEyICogcztcbiAgICBhWzNdID0gYTAzICogYyArIGExMyAqIHM7XG4gICAgYVs0XSA9IGExMCAqIGMgLSBhMDAgKiBzO1xuICAgIGFbNV0gPSBhMTEgKiBjIC0gYTAxICogcztcbiAgICBhWzZdID0gYTEyICogYyAtIGEwMiAqIHM7XG4gICAgYVs3XSA9IGExMyAqIGMgLSBhMDMgKiBzO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0NC5mcm9tUm90YXRpb25UcmFuc2xhdGlvbiA9IGZ1bmN0aW9uIChxLCB2KSB7XG4gICAgLy8gUXVhdGVybmlvbiBtYXRoXG4gICAgdmFyIG91dCA9IHRoaXMudmFsLFxuICAgICAgICB4ID0gcS54LCB5ID0gcS55LCB6ID0gcS56LCB3ID0gcS53LFxuICAgICAgICB4MiA9IHggKyB4LFxuICAgICAgICB5MiA9IHkgKyB5LFxuICAgICAgICB6MiA9IHogKyB6LFxuXG4gICAgICAgIHh4ID0geCAqIHgyLFxuICAgICAgICB4eSA9IHggKiB5MixcbiAgICAgICAgeHogPSB4ICogejIsXG4gICAgICAgIHl5ID0geSAqIHkyLFxuICAgICAgICB5eiA9IHkgKiB6MixcbiAgICAgICAgenogPSB6ICogejIsXG4gICAgICAgIHd4ID0gdyAqIHgyLFxuICAgICAgICB3eSA9IHcgKiB5MixcbiAgICAgICAgd3ogPSB3ICogejI7XG5cbiAgICBvdXRbMF0gPSAxIC0gKHl5ICsgenopO1xuICAgIG91dFsxXSA9IHh5ICsgd3o7XG4gICAgb3V0WzJdID0geHogLSB3eTtcbiAgICBvdXRbM10gPSAwO1xuICAgIG91dFs0XSA9IHh5IC0gd3o7XG4gICAgb3V0WzVdID0gMSAtICh4eCArIHp6KTtcbiAgICBvdXRbNl0gPSB5eiArIHd4O1xuICAgIG91dFs3XSA9IDA7XG4gICAgb3V0WzhdID0geHogKyB3eTtcbiAgICBvdXRbOV0gPSB5eiAtIHd4O1xuICAgIG91dFsxMF0gPSAxIC0gKHh4ICsgeXkpO1xuICAgIG91dFsxMV0gPSAwO1xuICAgIG91dFsxMl0gPSB2Lng7XG4gICAgb3V0WzEzXSA9IHYueTtcbiAgICBvdXRbMTRdID0gdi56O1xuICAgIG91dFsxNV0gPSAxO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubWF0NC5mcm9tUXVhdCA9IGZ1bmN0aW9uIChxKSB7XG4gICAgdmFyIG91dCA9IHRoaXMudmFsLFxuICAgICAgICB4ID0gcS54LCB5ID0gcS55LCB6ID0gcS56LCB3ID0gcS53LFxuICAgICAgICB4MiA9IHggKyB4LFxuICAgICAgICB5MiA9IHkgKyB5LFxuICAgICAgICB6MiA9IHogKyB6LFxuXG4gICAgICAgIHh4ID0geCAqIHgyLFxuICAgICAgICB4eSA9IHggKiB5MixcbiAgICAgICAgeHogPSB4ICogejIsXG4gICAgICAgIHl5ID0geSAqIHkyLFxuICAgICAgICB5eiA9IHkgKiB6MixcbiAgICAgICAgenogPSB6ICogejIsXG4gICAgICAgIHd4ID0gdyAqIHgyLFxuICAgICAgICB3eSA9IHcgKiB5MixcbiAgICAgICAgd3ogPSB3ICogejI7XG5cbiAgICBvdXRbMF0gPSAxIC0gKHl5ICsgenopO1xuICAgIG91dFsxXSA9IHh5ICsgd3o7XG4gICAgb3V0WzJdID0geHogLSB3eTtcbiAgICBvdXRbM10gPSAwO1xuXG4gICAgb3V0WzRdID0geHkgLSB3ejtcbiAgICBvdXRbNV0gPSAxIC0gKHh4ICsgenopO1xuICAgIG91dFs2XSA9IHl6ICsgd3g7XG4gICAgb3V0WzddID0gMDtcblxuICAgIG91dFs4XSA9IHh6ICsgd3k7XG4gICAgb3V0WzldID0geXogLSB3eDtcbiAgICBvdXRbMTBdID0gMSAtICh4eCArIHl5KTtcbiAgICBvdXRbMTFdID0gMDtcblxuICAgIG91dFsxMl0gPSAwO1xuICAgIG91dFsxM10gPSAwO1xuICAgIG91dFsxNF0gPSAwO1xuICAgIG91dFsxNV0gPSAxO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogR2VuZXJhdGVzIGEgZnJ1c3R1bSBtYXRyaXggd2l0aCB0aGUgZ2l2ZW4gYm91bmRzXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGxlZnQgTGVmdCBib3VuZCBvZiB0aGUgZnJ1c3R1bVxuICogQHBhcmFtIHtOdW1iZXJ9IHJpZ2h0IFJpZ2h0IGJvdW5kIG9mIHRoZSBmcnVzdHVtXG4gKiBAcGFyYW0ge051bWJlcn0gYm90dG9tIEJvdHRvbSBib3VuZCBvZiB0aGUgZnJ1c3R1bVxuICogQHBhcmFtIHtOdW1iZXJ9IHRvcCBUb3AgYm91bmQgb2YgdGhlIGZydXN0dW1cbiAqIEBwYXJhbSB7TnVtYmVyfSBuZWFyIE5lYXIgYm91bmQgb2YgdGhlIGZydXN0dW1cbiAqIEBwYXJhbSB7TnVtYmVyfSBmYXIgRmFyIGJvdW5kIG9mIHRoZSBmcnVzdHVtXG4gKiBAcmV0dXJucyB7TWF0cml4NH0gdGhpcyBmb3IgY2hhaW5pbmdcbiAqL1xubWF0NC5mcnVzdHVtID0gZnVuY3Rpb24gKGxlZnQsIHJpZ2h0LCBib3R0b20sIHRvcCwgbmVhciwgZmFyKSB7XG4gICAgdmFyIG91dCA9IHRoaXMudmFsLFxuICAgICAgICBybCA9IDEgLyAocmlnaHQgLSBsZWZ0KSxcbiAgICAgICAgdGIgPSAxIC8gKHRvcCAtIGJvdHRvbSksXG4gICAgICAgIG5mID0gMSAvIChuZWFyIC0gZmFyKTtcbiAgICBvdXRbMF0gPSAobmVhciAqIDIpICogcmw7XG4gICAgb3V0WzFdID0gMDtcbiAgICBvdXRbMl0gPSAwO1xuICAgIG91dFszXSA9IDA7XG4gICAgb3V0WzRdID0gMDtcbiAgICBvdXRbNV0gPSAobmVhciAqIDIpICogdGI7XG4gICAgb3V0WzZdID0gMDtcbiAgICBvdXRbN10gPSAwO1xuICAgIG91dFs4XSA9IChyaWdodCArIGxlZnQpICogcmw7XG4gICAgb3V0WzldID0gKHRvcCArIGJvdHRvbSkgKiB0YjtcbiAgICBvdXRbMTBdID0gKGZhciArIG5lYXIpICogbmY7XG4gICAgb3V0WzExXSA9IC0xO1xuICAgIG91dFsxMl0gPSAwO1xuICAgIG91dFsxM10gPSAwO1xuICAgIG91dFsxNF0gPSAoZmFyICogbmVhciAqIDIpICogbmY7XG4gICAgb3V0WzE1XSA9IDA7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogR2VuZXJhdGVzIGEgcGVyc3BlY3RpdmUgcHJvamVjdGlvbiBtYXRyaXggd2l0aCB0aGUgZ2l2ZW4gYm91bmRzXG4gKlxuICogQHBhcmFtIHtudW1iZXJ9IGZvdnkgVmVydGljYWwgZmllbGQgb2YgdmlldyBpbiByYWRpYW5zXG4gKiBAcGFyYW0ge251bWJlcn0gYXNwZWN0IEFzcGVjdCByYXRpby4gdHlwaWNhbGx5IHZpZXdwb3J0IHdpZHRoL2hlaWdodFxuICogQHBhcmFtIHtudW1iZXJ9IG5lYXIgTmVhciBib3VuZCBvZiB0aGUgZnJ1c3R1bVxuICogQHBhcmFtIHtudW1iZXJ9IGZhciBGYXIgYm91bmQgb2YgdGhlIGZydXN0dW1cbiAqIEByZXR1cm5zIHtNYXRyaXg0fSB0aGlzIGZvciBjaGFpbmluZ1xuICovXG5tYXQ0LnBlcnNwZWN0aXZlID0gZnVuY3Rpb24gKGZvdnksIGFzcGVjdCwgbmVhciwgZmFyKSB7XG4gICAgdmFyIG91dCA9IHRoaXMudmFsLFxuICAgICAgICBmID0gMS4wIC8gTWF0aC50YW4oZm92eSAvIDIpLFxuICAgICAgICBuZiA9IDEgLyAobmVhciAtIGZhcik7XG4gICAgb3V0WzBdID0gZiAvIGFzcGVjdDtcbiAgICBvdXRbMV0gPSAwO1xuICAgIG91dFsyXSA9IDA7XG4gICAgb3V0WzNdID0gMDtcbiAgICBvdXRbNF0gPSAwO1xuICAgIG91dFs1XSA9IGY7XG4gICAgb3V0WzZdID0gMDtcbiAgICBvdXRbN10gPSAwO1xuICAgIG91dFs4XSA9IDA7XG4gICAgb3V0WzldID0gMDtcbiAgICBvdXRbMTBdID0gKGZhciArIG5lYXIpICogbmY7XG4gICAgb3V0WzExXSA9IC0xO1xuICAgIG91dFsxMl0gPSAwO1xuICAgIG91dFsxM10gPSAwO1xuICAgIG91dFsxNF0gPSAoMiAqIGZhciAqIG5lYXIpICogbmY7XG4gICAgb3V0WzE1XSA9IDA7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdlbmVyYXRlcyBhIG9ydGhvZ29uYWwgcHJvamVjdGlvbiBtYXRyaXggd2l0aCB0aGUgZ2l2ZW4gYm91bmRzXG4gKlxuICogQHBhcmFtIHtudW1iZXJ9IGxlZnQgTGVmdCBib3VuZCBvZiB0aGUgZnJ1c3R1bVxuICogQHBhcmFtIHtudW1iZXJ9IHJpZ2h0IFJpZ2h0IGJvdW5kIG9mIHRoZSBmcnVzdHVtXG4gKiBAcGFyYW0ge251bWJlcn0gYm90dG9tIEJvdHRvbSBib3VuZCBvZiB0aGUgZnJ1c3R1bVxuICogQHBhcmFtIHtudW1iZXJ9IHRvcCBUb3AgYm91bmQgb2YgdGhlIGZydXN0dW1cbiAqIEBwYXJhbSB7bnVtYmVyfSBuZWFyIE5lYXIgYm91bmQgb2YgdGhlIGZydXN0dW1cbiAqIEBwYXJhbSB7bnVtYmVyfSBmYXIgRmFyIGJvdW5kIG9mIHRoZSBmcnVzdHVtXG4gKiBAcmV0dXJucyB7TWF0cml4NH0gdGhpcyBmb3IgY2hhaW5pbmdcbiAqL1xubWF0NC5vcnRobyA9IGZ1bmN0aW9uIChsZWZ0LCByaWdodCwgYm90dG9tLCB0b3AsIG5lYXIsIGZhcikge1xuICAgIHZhciBvdXQgPSB0aGlzLnZhbCxcbiAgICAgICAgbHIgPSAxIC8gKGxlZnQgLSByaWdodCksXG4gICAgICAgIGJ0ID0gMSAvIChib3R0b20gLSB0b3ApLFxuICAgICAgICBuZiA9IDEgLyAobmVhciAtIGZhcik7XG4gICAgb3V0WzBdID0gLTIgKiBscjtcbiAgICBvdXRbMV0gPSAwO1xuICAgIG91dFsyXSA9IDA7XG4gICAgb3V0WzNdID0gMDtcbiAgICBvdXRbNF0gPSAwO1xuICAgIG91dFs1XSA9IC0yICogYnQ7XG4gICAgb3V0WzZdID0gMDtcbiAgICBvdXRbN10gPSAwO1xuICAgIG91dFs4XSA9IDA7XG4gICAgb3V0WzldID0gMDtcbiAgICBvdXRbMTBdID0gMiAqIG5mO1xuICAgIG91dFsxMV0gPSAwO1xuICAgIG91dFsxMl0gPSAobGVmdCArIHJpZ2h0KSAqIGxyO1xuICAgIG91dFsxM10gPSAodG9wICsgYm90dG9tKSAqIGJ0O1xuICAgIG91dFsxNF0gPSAoZmFyICsgbmVhcikgKiBuZjtcbiAgICBvdXRbMTVdID0gMTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR2VuZXJhdGVzIGEgbG9vay1hdCBtYXRyaXggd2l0aCB0aGUgZ2l2ZW4gZXllIHBvc2l0aW9uLCBmb2NhbCBwb2ludCwgYW5kIHVwIGF4aXNcbiAqXG4gKiBAcGFyYW0ge1ZlY3RvcjN9IGV5ZSBQb3NpdGlvbiBvZiB0aGUgdmlld2VyXG4gKiBAcGFyYW0ge1ZlY3RvcjN9IGNlbnRlciBQb2ludCB0aGUgdmlld2VyIGlzIGxvb2tpbmcgYXRcbiAqIEBwYXJhbSB7VmVjdG9yM30gdXAgdmVjMyBwb2ludGluZyB1cFxuICogQHJldHVybnMge01hdHJpeDR9IHRoaXMgZm9yIGNoYWluaW5nXG4gKi9cbm1hdDQubG9va0F0ID0gZnVuY3Rpb24gKGV5ZSwgY2VudGVyLCB1cCkge1xuICAgIHZhciBvdXQgPSB0aGlzLnZhbCxcblxuICAgICAgICB4MCwgeDEsIHgyLCB5MCwgeTEsIHkyLCB6MCwgejEsIHoyLCBsZW4sXG4gICAgICAgIGV5ZXggPSBleWUueCxcbiAgICAgICAgZXlleSA9IGV5ZS55LFxuICAgICAgICBleWV6ID0gZXllLnosXG4gICAgICAgIHVweCA9IHVwLngsXG4gICAgICAgIHVweSA9IHVwLnksXG4gICAgICAgIHVweiA9IHVwLnosXG4gICAgICAgIGNlbnRlcnggPSBjZW50ZXIueCxcbiAgICAgICAgY2VudGVyeSA9IGNlbnRlci55LFxuICAgICAgICBjZW50ZXJ6ID0gY2VudGVyLno7XG5cbiAgICBpZiAoTWF0aC5hYnMoZXlleCAtIGNlbnRlcngpIDwgRVBTSUxPTiAmJlxuICAgICAgICBNYXRoLmFicyhleWV5IC0gY2VudGVyeSkgPCBFUFNJTE9OICYmXG4gICAgICAgIE1hdGguYWJzKGV5ZXogLSBjZW50ZXJ6KSA8IEVQU0lMT04pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaWRlbnRpdHkoKTtcbiAgICB9XG5cbiAgICB6MCA9IGV5ZXggLSBjZW50ZXJ4O1xuICAgIHoxID0gZXlleSAtIGNlbnRlcnk7XG4gICAgejIgPSBleWV6IC0gY2VudGVyejtcblxuICAgIGxlbiA9IDEgLyBNYXRoLnNxcnQoejAgKiB6MCArIHoxICogejEgKyB6MiAqIHoyKTtcbiAgICB6MCAqPSBsZW47XG4gICAgejEgKj0gbGVuO1xuICAgIHoyICo9IGxlbjtcblxuICAgIHgwID0gdXB5ICogejIgLSB1cHogKiB6MTtcbiAgICB4MSA9IHVweiAqIHowIC0gdXB4ICogejI7XG4gICAgeDIgPSB1cHggKiB6MSAtIHVweSAqIHowO1xuICAgIGxlbiA9IE1hdGguc3FydCh4MCAqIHgwICsgeDEgKiB4MSArIHgyICogeDIpO1xuICAgIGlmICghbGVuKSB7XG4gICAgICAgIHgwID0gMDtcbiAgICAgICAgeDEgPSAwO1xuICAgICAgICB4MiA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbGVuID0gMSAvIGxlbjtcbiAgICAgICAgeDAgKj0gbGVuO1xuICAgICAgICB4MSAqPSBsZW47XG4gICAgICAgIHgyICo9IGxlbjtcbiAgICB9XG5cbiAgICB5MCA9IHoxICogeDIgLSB6MiAqIHgxO1xuICAgIHkxID0gejIgKiB4MCAtIHowICogeDI7XG4gICAgeTIgPSB6MCAqIHgxIC0gejEgKiB4MDtcblxuICAgIGxlbiA9IE1hdGguc3FydCh5MCAqIHkwICsgeTEgKiB5MSArIHkyICogeTIpO1xuICAgIGlmICghbGVuKSB7XG4gICAgICAgIHkwID0gMDtcbiAgICAgICAgeTEgPSAwO1xuICAgICAgICB5MiA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbGVuID0gMSAvIGxlbjtcbiAgICAgICAgeTAgKj0gbGVuO1xuICAgICAgICB5MSAqPSBsZW47XG4gICAgICAgIHkyICo9IGxlbjtcbiAgICB9XG5cbiAgICBvdXRbMF0gPSB4MDtcbiAgICBvdXRbMV0gPSB5MDtcbiAgICBvdXRbMl0gPSB6MDtcbiAgICBvdXRbM10gPSAwO1xuICAgIG91dFs0XSA9IHgxO1xuICAgIG91dFs1XSA9IHkxO1xuICAgIG91dFs2XSA9IHoxO1xuICAgIG91dFs3XSA9IDA7XG4gICAgb3V0WzhdID0geDI7XG4gICAgb3V0WzldID0geTI7XG4gICAgb3V0WzEwXSA9IHoyO1xuICAgIG91dFsxMV0gPSAwO1xuICAgIG91dFsxMl0gPSAtKHgwICogZXlleCArIHgxICogZXlleSArIHgyICogZXlleik7XG4gICAgb3V0WzEzXSA9IC0oeTAgKiBleWV4ICsgeTEgKiBleWV5ICsgeTIgKiBleWV6KTtcbiAgICBvdXRbMTRdID0gLSh6MCAqIGV5ZXggKyB6MSAqIGV5ZXkgKyB6MiAqIGV5ZXopO1xuICAgIG91dFsxNV0gPSAxO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbm1hdDQubXVsID0gbWF0NC5tdWx0aXBseTtcblxubWF0NC5pZHQgPSBtYXQ0LmlkZW50aXR5O1xuXG4vL1RoaXMgaXMgaGFuZHkgZm9yIFBvb2wgdXRpbGl0aWVzLCB0byBcInJlc2V0XCIgYVxuLy9zaGFyZWQgb2JqZWN0IHRvIGl0cyBkZWZhdWx0IHN0YXRlXG5tYXQ0LnJlc2V0ID0gbWF0NC5pZHQ7XG5cbm1hdDQudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGEgPSB0aGlzLnZhbDtcbiAgICByZXR1cm4gJ01hdHJpeDQoJyArIGFbMF0gKyAnLCAnICsgYVsxXSArICcsICcgKyBhWzJdICsgJywgJyArIGFbM10gKyAnLCAnICtcbiAgICAgICAgICAgICAgICAgICAgYVs0XSArICcsICcgKyBhWzVdICsgJywgJyArIGFbNl0gKyAnLCAnICsgYVs3XSArICcsICcgK1xuICAgICAgICAgICAgICAgICAgICBhWzhdICsgJywgJyArIGFbOV0gKyAnLCAnICsgYVsxMF0gKyAnLCAnICsgYVsxMV0gKyAnLCAnICsgXG4gICAgICAgICAgICAgICAgICAgIGFbMTJdICsgJywgJyArIGFbMTNdICsgJywgJyArIGFbMTRdICsgJywgJyArIGFbMTVdICsgJyknO1xufTtcblxubWF0NC5zdHIgPSBtYXQ0LnRvU3RyaW5nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hdHJpeDQ7XG4iLCJ2YXIgVmVjdG9yMyA9IHJlcXVpcmUoJy4vVmVjdG9yMycpO1xudmFyIE1hdHJpeDMgPSByZXF1aXJlKCcuL01hdHJpeDMnKTtcbnZhciBjb21tb24gPSByZXF1aXJlKCcuL2NvbW1vbicpO1xuXG4vL3NvbWUgc2hhcmVkICdwcml2YXRlJyBhcnJheXNcbnZhciBzX2lOZXh0ID0gKHR5cGVvZiBJbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnID8gbmV3IEludDhBcnJheShbMSwyLDBdKSA6IFsxLDIsMF0pO1xudmFyIHRtcCA9ICh0eXBlb2YgRmxvYXQzMkFycmF5ICE9PSAndW5kZWZpbmVkJyA/IG5ldyBGbG9hdDMyQXJyYXkoWzAsMCwwXSkgOiBbMCwwLDBdKTtcblxudmFyIHhVbml0VmVjMyA9IG5ldyBWZWN0b3IzKDEsIDAsIDApO1xudmFyIHlVbml0VmVjMyA9IG5ldyBWZWN0b3IzKDAsIDEsIDApO1xudmFyIHRtcHZlYyA9IG5ldyBWZWN0b3IzKCk7XG5cbnZhciB0bXBNYXQzID0gbmV3IE1hdHJpeDMoKTtcblxuZnVuY3Rpb24gUXVhdGVybmlvbih4LCB5LCB6LCB3KSB7XG5cdGlmICh0eXBlb2YgeCA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICB0aGlzLnggPSB4Lnh8fDA7XG4gICAgICAgIHRoaXMueSA9IHgueXx8MDtcbiAgICAgICAgdGhpcy56ID0geC56fHwwO1xuICAgICAgICB0aGlzLncgPSB4Lnd8fDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy54ID0geHx8MDtcbiAgICAgICAgdGhpcy55ID0geXx8MDtcbiAgICAgICAgdGhpcy56ID0genx8MDtcbiAgICAgICAgdGhpcy53ID0gd3x8MDtcbiAgICB9XG59XG5cbnZhciBxdWF0ID0gUXVhdGVybmlvbi5wcm90b3R5cGU7XG5cbi8vbWl4aW4gY29tbW9uIGZ1bmN0aW9uc1xuZm9yICh2YXIgayBpbiBjb21tb24pIHtcbiAgICBxdWF0W2tdID0gY29tbW9uW2tdO1xufVxuXG5xdWF0LnJvdGF0aW9uVG8gPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgdmFyIGRvdCA9IGEueCAqIGIueCArIGEueSAqIGIueSArIGEueiAqIGIuejsgLy9hLmRvdChiKVxuICAgIGlmIChkb3QgPCAtMC45OTk5OTkpIHtcbiAgICAgICAgaWYgKHRtcHZlYy5jb3B5KHhVbml0VmVjMykuY3Jvc3MoYSkubGVuKCkgPCAwLjAwMDAwMSlcbiAgICAgICAgICAgIHRtcHZlYy5jb3B5KHlVbml0VmVjMykuY3Jvc3MoYSk7XG4gICAgICAgIFxuICAgICAgICB0bXB2ZWMubm9ybWFsaXplKCk7XG4gICAgICAgIHJldHVybiB0aGlzLnNldEF4aXNBbmdsZSh0bXB2ZWMsIE1hdGguUEkpO1xuICAgIH0gZWxzZSBpZiAoZG90ID4gMC45OTk5OTkpIHtcbiAgICAgICAgdGhpcy54ID0gMDtcbiAgICAgICAgdGhpcy55ID0gMDtcbiAgICAgICAgdGhpcy56ID0gMDtcbiAgICAgICAgdGhpcy53ID0gMTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdG1wdmVjLmNvcHkoYSkuY3Jvc3MoYik7XG4gICAgICAgIHRoaXMueCA9IHRtcHZlYy54O1xuICAgICAgICB0aGlzLnkgPSB0bXB2ZWMueTtcbiAgICAgICAgdGhpcy56ID0gdG1wdmVjLno7XG4gICAgICAgIHRoaXMudyA9IDEgKyBkb3Q7XG4gICAgICAgIHJldHVybiB0aGlzLm5vcm1hbGl6ZSgpO1xuICAgIH1cbn07XG5cbnF1YXQuc2V0QXhlcyA9IGZ1bmN0aW9uKHZpZXcsIHJpZ2h0LCB1cCkge1xuICAgIHZhciBtID0gdG1wTWF0My52YWw7XG4gICAgbVswXSA9IHJpZ2h0Lng7XG4gICAgbVszXSA9IHJpZ2h0Lnk7XG4gICAgbVs2XSA9IHJpZ2h0Lno7XG5cbiAgICBtWzFdID0gdXAueDtcbiAgICBtWzRdID0gdXAueTtcbiAgICBtWzddID0gdXAuejtcblxuICAgIG1bMl0gPSAtdmlldy54O1xuICAgIG1bNV0gPSAtdmlldy55O1xuICAgIG1bOF0gPSAtdmlldy56O1xuXG4gICAgcmV0dXJuIHRoaXMuZnJvbU1hdDModG1wTWF0Mykubm9ybWFsaXplKCk7XG59O1xuXG5xdWF0LmlkZW50aXR5ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy54ID0gdGhpcy55ID0gdGhpcy56ID0gMDtcbiAgICB0aGlzLncgPSAxO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxucXVhdC5zZXRBeGlzQW5nbGUgPSBmdW5jdGlvbihheGlzLCByYWQpIHtcbiAgICByYWQgPSByYWQgKiAwLjU7XG4gICAgdmFyIHMgPSBNYXRoLnNpbihyYWQpO1xuICAgIHRoaXMueCA9IHMgKiBheGlzLng7XG4gICAgdGhpcy55ID0gcyAqIGF4aXMueTtcbiAgICB0aGlzLnogPSBzICogYXhpcy56O1xuICAgIHRoaXMudyA9IE1hdGguY29zKHJhZCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5xdWF0Lm11bHRpcGx5ID0gZnVuY3Rpb24oYikge1xuICAgIHZhciBheCA9IHRoaXMueCwgYXkgPSB0aGlzLnksIGF6ID0gdGhpcy56LCBhdyA9IHRoaXMudyxcbiAgICAgICAgYnggPSBiLngsIGJ5ID0gYi55LCBieiA9IGIueiwgYncgPSBiLnc7XG5cbiAgICB0aGlzLnggPSBheCAqIGJ3ICsgYXcgKiBieCArIGF5ICogYnogLSBheiAqIGJ5O1xuICAgIHRoaXMueSA9IGF5ICogYncgKyBhdyAqIGJ5ICsgYXogKiBieCAtIGF4ICogYno7XG4gICAgdGhpcy56ID0gYXogKiBidyArIGF3ICogYnogKyBheCAqIGJ5IC0gYXkgKiBieDtcbiAgICB0aGlzLncgPSBhdyAqIGJ3IC0gYXggKiBieCAtIGF5ICogYnkgLSBheiAqIGJ6O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxucXVhdC5zbGVycCA9IGZ1bmN0aW9uIChiLCB0KSB7XG4gICAgLy8gYmVuY2htYXJrczpcbiAgICAvLyAgICBodHRwOi8vanNwZXJmLmNvbS9xdWF0ZXJuaW9uLXNsZXJwLWltcGxlbWVudGF0aW9uc1xuXG4gICAgdmFyIGF4ID0gdGhpcy54LCBheSA9IHRoaXMueSwgYXogPSB0aGlzLnksIGF3ID0gdGhpcy55LFxuICAgICAgICBieCA9IGIueCwgYnkgPSBiLnksIGJ6ID0gYi56LCBidyA9IGIudztcblxuICAgIHZhciAgICAgICAgb21lZ2EsIGNvc29tLCBzaW5vbSwgc2NhbGUwLCBzY2FsZTE7XG5cbiAgICAvLyBjYWxjIGNvc2luZVxuICAgIGNvc29tID0gYXggKiBieCArIGF5ICogYnkgKyBheiAqIGJ6ICsgYXcgKiBidztcbiAgICAvLyBhZGp1c3Qgc2lnbnMgKGlmIG5lY2Vzc2FyeSlcbiAgICBpZiAoIGNvc29tIDwgMC4wICkge1xuICAgICAgICBjb3NvbSA9IC1jb3NvbTtcbiAgICAgICAgYnggPSAtIGJ4O1xuICAgICAgICBieSA9IC0gYnk7XG4gICAgICAgIGJ6ID0gLSBiejtcbiAgICAgICAgYncgPSAtIGJ3O1xuICAgIH1cbiAgICAvLyBjYWxjdWxhdGUgY29lZmZpY2llbnRzXG4gICAgaWYgKCAoMS4wIC0gY29zb20pID4gMC4wMDAwMDEgKSB7XG4gICAgICAgIC8vIHN0YW5kYXJkIGNhc2UgKHNsZXJwKVxuICAgICAgICBvbWVnYSAgPSBNYXRoLmFjb3MoY29zb20pO1xuICAgICAgICBzaW5vbSAgPSBNYXRoLnNpbihvbWVnYSk7XG4gICAgICAgIHNjYWxlMCA9IE1hdGguc2luKCgxLjAgLSB0KSAqIG9tZWdhKSAvIHNpbm9tO1xuICAgICAgICBzY2FsZTEgPSBNYXRoLnNpbih0ICogb21lZ2EpIC8gc2lub207XG4gICAgfSBlbHNlIHsgICAgICAgIFxuICAgICAgICAvLyBcImZyb21cIiBhbmQgXCJ0b1wiIHF1YXRlcm5pb25zIGFyZSB2ZXJ5IGNsb3NlIFxuICAgICAgICAvLyAgLi4uIHNvIHdlIGNhbiBkbyBhIGxpbmVhciBpbnRlcnBvbGF0aW9uXG4gICAgICAgIHNjYWxlMCA9IDEuMCAtIHQ7XG4gICAgICAgIHNjYWxlMSA9IHQ7XG4gICAgfVxuICAgIC8vIGNhbGN1bGF0ZSBmaW5hbCB2YWx1ZXNcbiAgICB0aGlzLnggPSBzY2FsZTAgKiBheCArIHNjYWxlMSAqIGJ4O1xuICAgIHRoaXMueSA9IHNjYWxlMCAqIGF5ICsgc2NhbGUxICogYnk7XG4gICAgdGhpcy56ID0gc2NhbGUwICogYXogKyBzY2FsZTEgKiBiejtcbiAgICB0aGlzLncgPSBzY2FsZTAgKiBhdyArIHNjYWxlMSAqIGJ3O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxucXVhdC5pbnZlcnQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYTAgPSB0aGlzLngsIGExID0gdGhpcy55LCBhMiA9IHRoaXMueiwgYTMgPSB0aGlzLncsXG4gICAgICAgIGRvdCA9IGEwKmEwICsgYTEqYTEgKyBhMiphMiArIGEzKmEzLFxuICAgICAgICBpbnZEb3QgPSBkb3QgPyAxLjAvZG90IDogMDtcbiAgICBcbiAgICAvLyBUT0RPOiBXb3VsZCBiZSBmYXN0ZXIgdG8gcmV0dXJuIFswLDAsMCwwXSBpbW1lZGlhdGVseSBpZiBkb3QgPT0gMFxuXG4gICAgdGhpcy54ID0gLWEwKmludkRvdDtcbiAgICB0aGlzLnkgPSAtYTEqaW52RG90O1xuICAgIHRoaXMueiA9IC1hMippbnZEb3Q7XG4gICAgdGhpcy53ID0gYTMqaW52RG90O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxucXVhdC5jb25qdWdhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnggPSAtdGhpcy54O1xuICAgIHRoaXMueSA9IC10aGlzLnk7XG4gICAgdGhpcy56ID0gLXRoaXMuejtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnF1YXQucm90YXRlWCA9IGZ1bmN0aW9uIChyYWQpIHtcbiAgICByYWQgKj0gMC41OyBcblxuICAgIHZhciBheCA9IHRoaXMueCwgYXkgPSB0aGlzLnksIGF6ID0gdGhpcy56LCBhdyA9IHRoaXMudyxcbiAgICAgICAgYnggPSBNYXRoLnNpbihyYWQpLCBidyA9IE1hdGguY29zKHJhZCk7XG5cbiAgICB0aGlzLnggPSBheCAqIGJ3ICsgYXcgKiBieDtcbiAgICB0aGlzLnkgPSBheSAqIGJ3ICsgYXogKiBieDtcbiAgICB0aGlzLnogPSBheiAqIGJ3IC0gYXkgKiBieDtcbiAgICB0aGlzLncgPSBhdyAqIGJ3IC0gYXggKiBieDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnF1YXQucm90YXRlWSA9IGZ1bmN0aW9uIChyYWQpIHtcbiAgICByYWQgKj0gMC41OyBcblxuICAgIHZhciBheCA9IHRoaXMueCwgYXkgPSB0aGlzLnksIGF6ID0gdGhpcy56LCBhdyA9IHRoaXMudyxcbiAgICAgICAgYnkgPSBNYXRoLnNpbihyYWQpLCBidyA9IE1hdGguY29zKHJhZCk7XG5cbiAgICB0aGlzLnggPSBheCAqIGJ3IC0gYXogKiBieTtcbiAgICB0aGlzLnkgPSBheSAqIGJ3ICsgYXcgKiBieTtcbiAgICB0aGlzLnogPSBheiAqIGJ3ICsgYXggKiBieTtcbiAgICB0aGlzLncgPSBhdyAqIGJ3IC0gYXkgKiBieTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnF1YXQucm90YXRlWiA9IGZ1bmN0aW9uIChyYWQpIHtcbiAgICByYWQgKj0gMC41OyBcblxuICAgIHZhciBheCA9IHRoaXMueCwgYXkgPSB0aGlzLnksIGF6ID0gdGhpcy56LCBhdyA9IHRoaXMudyxcbiAgICAgICAgYnogPSBNYXRoLnNpbihyYWQpLCBidyA9IE1hdGguY29zKHJhZCk7XG5cbiAgICB0aGlzLnggPSBheCAqIGJ3ICsgYXkgKiBiejtcbiAgICB0aGlzLnkgPSBheSAqIGJ3IC0gYXggKiBiejtcbiAgICB0aGlzLnogPSBheiAqIGJ3ICsgYXcgKiBiejtcbiAgICB0aGlzLncgPSBhdyAqIGJ3IC0gYXogKiBiejtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnF1YXQuY2FsY3VsYXRlVyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgeCA9IHRoaXMueCwgeSA9IHRoaXMueSwgeiA9IHRoaXMuejtcblxuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgICB0aGlzLnogPSB6O1xuICAgIHRoaXMudyA9IC1NYXRoLnNxcnQoTWF0aC5hYnMoMS4wIC0geCAqIHggLSB5ICogeSAtIHogKiB6KSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5xdWF0LmZyb21NYXQzID0gZnVuY3Rpb24obWF0KSB7XG4gICAgLy8gYmVuY2htYXJrczpcbiAgICAvLyAgICBodHRwOi8vanNwZXJmLmNvbS90eXBlZC1hcnJheS1hY2Nlc3Mtc3BlZWRcbiAgICAvLyAgICBodHRwOi8vanNwZXJmLmNvbS9jb252ZXJzaW9uLW9mLTN4My1tYXRyaXgtdG8tcXVhdGVybmlvblxuXG4gICAgLy8gQWxnb3JpdGhtIGluIEtlbiBTaG9lbWFrZSdzIGFydGljbGUgaW4gMTk4NyBTSUdHUkFQSCBjb3Vyc2Ugbm90ZXNcbiAgICAvLyBhcnRpY2xlIFwiUXVhdGVybmlvbiBDYWxjdWx1cyBhbmQgRmFzdCBBbmltYXRpb25cIi5cbiAgICB2YXIgbSA9IG1hdC52YWwsXG4gICAgICAgIGZUcmFjZSA9IG1bMF0gKyBtWzRdICsgbVs4XTtcbiAgICB2YXIgZlJvb3Q7XG5cbiAgICBpZiAoIGZUcmFjZSA+IDAuMCApIHtcbiAgICAgICAgLy8gfHd8ID4gMS8yLCBtYXkgYXMgd2VsbCBjaG9vc2UgdyA+IDEvMlxuICAgICAgICBmUm9vdCA9IE1hdGguc3FydChmVHJhY2UgKyAxLjApOyAgLy8gMndcbiAgICAgICAgdGhpcy53ID0gMC41ICogZlJvb3Q7XG4gICAgICAgIGZSb290ID0gMC41L2ZSb290OyAgLy8gMS8oNHcpXG4gICAgICAgIHRoaXMueCA9IChtWzddLW1bNV0pKmZSb290O1xuICAgICAgICB0aGlzLnkgPSAobVsyXS1tWzZdKSpmUm9vdDtcbiAgICAgICAgdGhpcy56ID0gKG1bM10tbVsxXSkqZlJvb3Q7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gfHd8IDw9IDEvMlxuICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgIGlmICggbVs0XSA+IG1bMF0gKVxuICAgICAgICAgIGkgPSAxO1xuICAgICAgICBpZiAoIG1bOF0gPiBtW2kqMytpXSApXG4gICAgICAgICAgaSA9IDI7XG4gICAgICAgIHZhciBqID0gc19pTmV4dFtpXTtcbiAgICAgICAgdmFyIGsgPSBzX2lOZXh0W2pdO1xuICAgICAgICAgICAgXG4gICAgICAgIC8vVGhpcyBpc24ndCBxdWl0ZSBhcyBjbGVhbiB3aXRob3V0IGFycmF5IGFjY2Vzcy4uLlxuICAgICAgICBmUm9vdCA9IE1hdGguc3FydChtW2kqMytpXS1tW2oqMytqXS1tW2sqMytrXSArIDEuMCk7XG4gICAgICAgIHRtcFtpXSA9IDAuNSAqIGZSb290O1xuXG4gICAgICAgIGZSb290ID0gMC41IC8gZlJvb3Q7XG4gICAgICAgIHRtcFtqXSA9IChtW2oqMytpXSArIG1baSozK2pdKSAqIGZSb290O1xuICAgICAgICB0bXBba10gPSAobVtrKjMraV0gKyBtW2kqMytrXSkgKiBmUm9vdDtcblxuICAgICAgICB0aGlzLnggPSB0bXBbMF07XG4gICAgICAgIHRoaXMueSA9IHRtcFsxXTtcbiAgICAgICAgdGhpcy56ID0gdG1wWzJdO1xuICAgICAgICB0aGlzLncgPSAobVtrKjMral0gLSBtW2oqMytrXSkgKiBmUm9vdDtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5xdWF0LmlkdCA9IHF1YXQuaWRlbnRpdHk7XG5cbnF1YXQuc3ViID0gcXVhdC5zdWJ0cmFjdDtcblxucXVhdC5tdWwgPSBxdWF0Lm11bHRpcGx5O1xuXG5xdWF0LmxlbiA9IHF1YXQubGVuZ3RoO1xuXG5xdWF0LmxlblNxID0gcXVhdC5sZW5ndGhTcTtcblxuLy9UaGlzIGlzIGhhbmR5IGZvciBQb29sIHV0aWxpdGllcywgdG8gXCJyZXNldFwiIGFcbi8vc2hhcmVkIG9iamVjdCB0byBpdHMgZGVmYXVsdCBzdGF0ZVxucXVhdC5yZXNldCA9IHF1YXQuaWR0O1xuXG5cbnF1YXQudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJ1F1YXRlcm5pb24oJyArIHRoaXMueCArICcsICcgKyB0aGlzLnkgKyAnLCAnICsgdGhpcy56ICsgJywgJyArIHRoaXMudyArICcpJztcbn07XG5cbnF1YXQuc3RyID0gcXVhdC50b1N0cmluZztcblxubW9kdWxlLmV4cG9ydHMgPSBRdWF0ZXJuaW9uOyIsImZ1bmN0aW9uIFZlY3RvcjIoeCwgeSkge1xuXHRpZiAodHlwZW9mIHggPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgdGhpcy54ID0geC54fHwwO1xuICAgICAgICB0aGlzLnkgPSB4Lnl8fDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy54ID0geHx8MDtcbiAgICAgICAgdGhpcy55ID0geXx8MDtcbiAgICB9XG59XG5cbi8vc2hvcnRoYW5kIGl0IGZvciBiZXR0ZXIgbWluaWZpY2F0aW9uXG52YXIgdmVjMiA9IFZlY3RvcjIucHJvdG90eXBlO1xuXG4vKipcbiAqIFJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgVmVjdG9yMiB3aXRoXG4gKiB0aGlzIHZlY3RvcidzIGNvbXBvbmVudHMuIFxuICogQHJldHVybiB7VmVjdG9yMn0gYSBjbG9uZSBvZiB0aGlzIHZlY3RvclxuICovXG52ZWMyLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBWZWN0b3IyKHRoaXMueCwgdGhpcy55KTtcbn07XG5cbi8qKlxuICogQ29waWVzIHRoZSB4LCB5IGNvbXBvbmVudHMgZnJvbSB0aGUgc3BlY2lmaWVkXG4gKiBWZWN0b3IuIEFueSB1bmRlZmluZWQgY29tcG9uZW50cyBmcm9tIGBvdGhlclZlY2BcbiAqIHdpbGwgZGVmYXVsdCB0byB6ZXJvLlxuICogXG4gKiBAcGFyYW0gIHtvdGhlclZlY30gdGhlIG90aGVyIFZlY3RvcjIgdG8gY29weVxuICogQHJldHVybiB7VmVjdG9yMn0gIHRoaXMsIGZvciBjaGFpbmluZ1xuICovXG52ZWMyLmNvcHkgPSBmdW5jdGlvbihvdGhlclZlYykge1xuICAgIHRoaXMueCA9IG90aGVyVmVjLnh8fDA7XG4gICAgdGhpcy55ID0gb3RoZXJWZWMueXx8MDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQSBjb252ZW5pZW5jZSBmdW5jdGlvbiB0byBzZXQgdGhlIGNvbXBvbmVudHMgb2ZcbiAqIHRoaXMgdmVjdG9yIGFzIHggYW5kIHkuIEZhbHN5IG9yIHVuZGVmaW5lZFxuICogcGFyYW1ldGVycyB3aWxsIGRlZmF1bHQgdG8gemVyby5cbiAqXG4gKiBZb3UgY2FuIGFsc28gcGFzcyBhIHZlY3RvciBvYmplY3QgaW5zdGVhZCBvZlxuICogaW5kaXZpZHVhbCBjb21wb25lbnRzLCB0byBjb3B5IHRoZSBvYmplY3QncyBjb21wb25lbnRzLlxuICogXG4gKiBAcGFyYW0ge051bWJlcn0geCB0aGUgeCBjb21wb25lbnRcbiAqIEBwYXJhbSB7TnVtYmVyfSB5IHRoZSB5IGNvbXBvbmVudFxuICogQHJldHVybiB7VmVjdG9yMn0gIHRoaXMsIGZvciBjaGFpbmluZ1xuICovXG52ZWMyLnNldCA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICBpZiAodHlwZW9mIHggPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgdGhpcy54ID0geC54fHwwO1xuICAgICAgICB0aGlzLnkgPSB4Lnl8fDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy54ID0geHx8MDtcbiAgICAgICAgdGhpcy55ID0geXx8MDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMyLmFkZCA9IGZ1bmN0aW9uKHYpIHtcbiAgICB0aGlzLnggKz0gdi54O1xuICAgIHRoaXMueSArPSB2Lnk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMyLnN1YnRyYWN0ID0gZnVuY3Rpb24odikge1xuICAgIHRoaXMueCAtPSB2Lng7XG4gICAgdGhpcy55IC09IHYueTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzIubXVsdGlwbHkgPSBmdW5jdGlvbih2KSB7XG4gICAgdGhpcy54ICo9IHYueDtcbiAgICB0aGlzLnkgKj0gdi55O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMi5zY2FsZSA9IGZ1bmN0aW9uKHMpIHtcbiAgICB0aGlzLnggKj0gcztcbiAgICB0aGlzLnkgKj0gcztcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzIuZGl2aWRlID0gZnVuY3Rpb24odikge1xuICAgIHRoaXMueCAvPSB2Lng7XG4gICAgdGhpcy55IC89IHYueTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzIubmVnYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy54ID0gLXRoaXMueDtcbiAgICB0aGlzLnkgPSAtdGhpcy55O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMi5kaXN0YW5jZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICB2YXIgZHggPSB2LnggLSB0aGlzLngsXG4gICAgICAgIGR5ID0gdi55IC0gdGhpcy55O1xuICAgIHJldHVybiBNYXRoLnNxcnQoZHgqZHggKyBkeSpkeSk7XG59O1xuXG52ZWMyLmRpc3RhbmNlU3EgPSBmdW5jdGlvbih2KSB7XG4gICAgdmFyIGR4ID0gdi54IC0gdGhpcy54LFxuICAgICAgICBkeSA9IHYueSAtIHRoaXMueTtcbiAgICByZXR1cm4gZHgqZHggKyBkeSpkeTtcbn07XG5cbnZlYzIubGVuZ3RoID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHggPSB0aGlzLngsXG4gICAgICAgIHkgPSB0aGlzLnk7XG4gICAgcmV0dXJuIE1hdGguc3FydCh4KnggKyB5KnkpO1xufTtcblxudmVjMi5sZW5ndGhTcSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB4ID0gdGhpcy54LFxuICAgICAgICB5ID0gdGhpcy55O1xuICAgIHJldHVybiB4KnggKyB5Knk7XG59O1xuXG52ZWMyLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB4ID0gdGhpcy54LFxuICAgICAgICB5ID0gdGhpcy55O1xuICAgIHZhciBsZW4gPSB4KnggKyB5Knk7XG4gICAgaWYgKGxlbiA+IDApIHtcbiAgICAgICAgbGVuID0gMSAvIE1hdGguc3FydChsZW4pO1xuICAgICAgICB0aGlzLnggPSB4KmxlbjtcbiAgICAgICAgdGhpcy55ID0geSpsZW47XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMi5kb3QgPSBmdW5jdGlvbih2KSB7XG4gICAgcmV0dXJuIHRoaXMueCAqIHYueCArIHRoaXMueSAqIHYueTtcbn07XG5cbi8vVW5saWtlIFZlY3RvcjMsIHRoaXMgcmV0dXJucyBhIHNjYWxhclxuLy9odHRwOi8vYWxsZW5jaG91Lm5ldC8yMDEzLzA3L2Nyb3NzLXByb2R1Y3Qtb2YtMmQtdmVjdG9ycy9cbnZlYzIuY3Jvc3MgPSBmdW5jdGlvbih2KSB7XG4gICAgcmV0dXJuIHRoaXMueCAqIHYueSAtIHRoaXMueSAqIHYueDtcbn07XG5cbnZlYzIubGVycCA9IGZ1bmN0aW9uKHYsIHQpIHtcbiAgICB2YXIgYXggPSB0aGlzLngsXG4gICAgICAgIGF5ID0gdGhpcy55O1xuICAgIHQgPSB0fHwwO1xuICAgIHRoaXMueCA9IGF4ICsgdCAqICh2LnggLSBheCk7XG4gICAgdGhpcy55ID0gYXkgKyB0ICogKHYueSAtIGF5KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzIudHJhbnNmb3JtTWF0MyA9IGZ1bmN0aW9uKG1hdCkge1xuICAgIHZhciB4ID0gdGhpcy54LCB5ID0gdGhpcy55LCBtID0gbWF0LnZhbDtcbiAgICB0aGlzLnggPSBtWzBdICogeCArIG1bMl0gKiB5ICsgbVs0XTtcbiAgICB0aGlzLnkgPSBtWzFdICogeCArIG1bM10gKiB5ICsgbVs1XTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzIudHJhbnNmb3JtTWF0NCA9IGZ1bmN0aW9uKG1hdCkge1xuICAgIHZhciB4ID0gdGhpcy54LCBcbiAgICAgICAgeSA9IHRoaXMueSxcbiAgICAgICAgbSA9IG1hdC52YWw7XG4gICAgdGhpcy54ID0gbVswXSAqIHggKyBtWzRdICogeSArIG1bMTJdO1xuICAgIHRoaXMueSA9IG1bMV0gKiB4ICsgbVs1XSAqIHkgKyBtWzEzXTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzIucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnggPSAwO1xuICAgIHRoaXMueSA9IDA7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMyLnN1YiA9IHZlYzIuc3VidHJhY3Q7XG5cbnZlYzIubXVsID0gdmVjMi5tdWx0aXBseTtcblxudmVjMi5kaXYgPSB2ZWMyLmRpdmlkZTtcblxudmVjMi5kaXN0ID0gdmVjMi5kaXN0YW5jZTtcblxudmVjMi5kaXN0U3EgPSB2ZWMyLmRpc3RhbmNlU3E7XG5cbnZlYzIubGVuID0gdmVjMi5sZW5ndGg7XG5cbnZlYzIubGVuU3EgPSB2ZWMyLmxlbmd0aFNxO1xuXG52ZWMyLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICdWZWN0b3IyKCcgKyB0aGlzLnggKyAnLCAnICsgdGhpcy55ICsgJyknO1xufTtcblxudmVjMi5yYW5kb20gPSBmdW5jdGlvbihzY2FsZSkge1xuICAgIHNjYWxlID0gc2NhbGUgfHwgMS4wO1xuICAgIHZhciByID0gTWF0aC5yYW5kb20oKSAqIDIuMCAqIE1hdGguUEk7XG4gICAgdGhpcy54ID0gTWF0aC5jb3MocikgKiBzY2FsZTtcbiAgICB0aGlzLnkgPSBNYXRoLnNpbihyKSAqIHNjYWxlO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMi5zdHIgPSB2ZWMyLnRvU3RyaW5nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZlY3RvcjI7IiwiZnVuY3Rpb24gVmVjdG9yMyh4LCB5LCB6KSB7XG4gICAgaWYgKHR5cGVvZiB4ID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgIHRoaXMueCA9IHgueHx8MDtcbiAgICAgICAgdGhpcy55ID0geC55fHwwO1xuICAgICAgICB0aGlzLnogPSB4Lnp8fDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy54ID0geHx8MDtcbiAgICAgICAgdGhpcy55ID0geXx8MDtcbiAgICAgICAgdGhpcy56ID0genx8MDtcbiAgICB9XG59XG5cbi8vc2hvcnRoYW5kIGl0IGZvciBiZXR0ZXIgbWluaWZpY2F0aW9uXG52YXIgdmVjMyA9IFZlY3RvcjMucHJvdG90eXBlO1xuXG52ZWMzLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBWZWN0b3IzKHRoaXMueCwgdGhpcy55LCB0aGlzLnopO1xufTtcblxudmVjMy5jb3B5ID0gZnVuY3Rpb24ob3RoZXJWZWMpIHtcbiAgICB0aGlzLnggPSBvdGhlclZlYy54O1xuICAgIHRoaXMueSA9IG90aGVyVmVjLnk7XG4gICAgdGhpcy56ID0gb3RoZXJWZWMuejtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzMuc2V0ID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICAgIGlmICh0eXBlb2YgeCA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICB0aGlzLnggPSB4Lnh8fDA7XG4gICAgICAgIHRoaXMueSA9IHgueXx8MDtcbiAgICAgICAgdGhpcy56ID0geC56fHwwO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMueCA9IHh8fDA7XG4gICAgICAgIHRoaXMueSA9IHl8fDA7XG4gICAgICAgIHRoaXMueiA9IHp8fDA7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMy5hZGQgPSBmdW5jdGlvbih2KSB7XG4gICAgdGhpcy54ICs9IHYueDtcbiAgICB0aGlzLnkgKz0gdi55O1xuICAgIHRoaXMueiArPSB2Lno7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMzLnN1YnRyYWN0ID0gZnVuY3Rpb24odikge1xuICAgIHRoaXMueCAtPSB2Lng7XG4gICAgdGhpcy55IC09IHYueTtcbiAgICB0aGlzLnogLT0gdi56O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMy5tdWx0aXBseSA9IGZ1bmN0aW9uKHYpIHtcbiAgICB0aGlzLnggKj0gdi54O1xuICAgIHRoaXMueSAqPSB2Lnk7XG4gICAgdGhpcy56ICo9IHYuejtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzMuc2NhbGUgPSBmdW5jdGlvbihzKSB7XG4gICAgdGhpcy54ICo9IHM7XG4gICAgdGhpcy55ICo9IHM7XG4gICAgdGhpcy56ICo9IHM7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMzLmRpdmlkZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICB0aGlzLnggLz0gdi54O1xuICAgIHRoaXMueSAvPSB2Lnk7XG4gICAgdGhpcy56IC89IHYuejtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzMubmVnYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy54ID0gLXRoaXMueDtcbiAgICB0aGlzLnkgPSAtdGhpcy55O1xuICAgIHRoaXMueiA9IC10aGlzLno7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMzLmRpc3RhbmNlID0gZnVuY3Rpb24odikge1xuICAgIHZhciBkeCA9IHYueCAtIHRoaXMueCxcbiAgICAgICAgZHkgPSB2LnkgLSB0aGlzLnksXG4gICAgICAgIGR6ID0gdi56IC0gdGhpcy56O1xuICAgIHJldHVybiBNYXRoLnNxcnQoZHgqZHggKyBkeSpkeSArIGR6KmR6KTtcbn07XG5cbnZlYzMuZGlzdGFuY2VTcSA9IGZ1bmN0aW9uKHYpIHtcbiAgICB2YXIgZHggPSB2LnggLSB0aGlzLngsXG4gICAgICAgIGR5ID0gdi55IC0gdGhpcy55LFxuICAgICAgICBkeiA9IHYueiAtIHRoaXMuejtcbiAgICByZXR1cm4gZHgqZHggKyBkeSpkeSArIGR6KmR6O1xufTtcblxudmVjMy5sZW5ndGggPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgeCA9IHRoaXMueCxcbiAgICAgICAgeSA9IHRoaXMueSxcbiAgICAgICAgeiA9IHRoaXMuejtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KHgqeCArIHkqeSArIHoqeik7XG59O1xuXG52ZWMzLmxlbmd0aFNxID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHggPSB0aGlzLngsXG4gICAgICAgIHkgPSB0aGlzLnksXG4gICAgICAgIHogPSB0aGlzLno7XG4gICAgcmV0dXJuIHgqeCArIHkqeSArIHoqejtcbn07XG5cbnZlYzMubm9ybWFsaXplID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHggPSB0aGlzLngsXG4gICAgICAgIHkgPSB0aGlzLnksXG4gICAgICAgIHogPSB0aGlzLno7XG4gICAgdmFyIGxlbiA9IHgqeCArIHkqeSArIHoqejtcbiAgICBpZiAobGVuID4gMCkge1xuICAgICAgICBsZW4gPSAxIC8gTWF0aC5zcXJ0KGxlbik7XG4gICAgICAgIHRoaXMueCA9IHgqbGVuO1xuICAgICAgICB0aGlzLnkgPSB5KmxlbjtcbiAgICAgICAgdGhpcy56ID0geipsZW47XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMy5kb3QgPSBmdW5jdGlvbih2KSB7XG4gICAgcmV0dXJuIHRoaXMueCAqIHYueCArIHRoaXMueSAqIHYueSArIHRoaXMueiAqIHYuejtcbn07XG5cbnZlYzMuY3Jvc3MgPSBmdW5jdGlvbih2KSB7XG4gICAgdmFyIGF4ID0gdGhpcy54LCBheSA9IHRoaXMueSwgYXogPSB0aGlzLnosXG4gICAgICAgIGJ4ID0gdi54LCBieSA9IHYueSwgYnogPSB2Lno7XG5cbiAgICB0aGlzLnggPSBheSAqIGJ6IC0gYXogKiBieTtcbiAgICB0aGlzLnkgPSBheiAqIGJ4IC0gYXggKiBiejtcbiAgICB0aGlzLnogPSBheCAqIGJ5IC0gYXkgKiBieDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzMubGVycCA9IGZ1bmN0aW9uKHYsIHQpIHtcbiAgICB2YXIgYXggPSB0aGlzLngsXG4gICAgICAgIGF5ID0gdGhpcy55LFxuICAgICAgICBheiA9IHRoaXMuejtcbiAgICB0ID0gdHx8MDtcbiAgICB0aGlzLnggPSBheCArIHQgKiAodi54IC0gYXgpO1xuICAgIHRoaXMueSA9IGF5ICsgdCAqICh2LnkgLSBheSk7XG4gICAgdGhpcy56ID0gYXogKyB0ICogKHYueiAtIGF6KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzMudHJhbnNmb3JtTWF0NCA9IGZ1bmN0aW9uKG1hdCkge1xuICAgIHZhciB4ID0gdGhpcy54LCB5ID0gdGhpcy55LCB6ID0gdGhpcy56LCBtID0gbWF0LnZhbDtcbiAgICB0aGlzLnggPSBtWzBdICogeCArIG1bNF0gKiB5ICsgbVs4XSAqIHogKyBtWzEyXTtcbiAgICB0aGlzLnkgPSBtWzFdICogeCArIG1bNV0gKiB5ICsgbVs5XSAqIHogKyBtWzEzXTtcbiAgICB0aGlzLnogPSBtWzJdICogeCArIG1bNl0gKiB5ICsgbVsxMF0gKiB6ICsgbVsxNF07XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMzLnRyYW5zZm9ybU1hdDMgPSBmdW5jdGlvbihtYXQpIHtcbiAgICB2YXIgeCA9IHRoaXMueCwgeSA9IHRoaXMueSwgeiA9IHRoaXMueiwgbSA9IG1hdC52YWw7XG4gICAgdGhpcy54ID0geCAqIG1bMF0gKyB5ICogbVszXSArIHogKiBtWzZdO1xuICAgIHRoaXMueSA9IHggKiBtWzFdICsgeSAqIG1bNF0gKyB6ICogbVs3XTtcbiAgICB0aGlzLnogPSB4ICogbVsyXSArIHkgKiBtWzVdICsgeiAqIG1bOF07XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWMzLnRyYW5zZm9ybVF1YXQgPSBmdW5jdGlvbihxKSB7XG4gICAgLy8gYmVuY2htYXJrczogaHR0cDovL2pzcGVyZi5jb20vcXVhdGVybmlvbi10cmFuc2Zvcm0tdmVjMy1pbXBsZW1lbnRhdGlvbnNcbiAgICB2YXIgeCA9IHRoaXMueCwgeSA9IHRoaXMueSwgeiA9IHRoaXMueixcbiAgICAgICAgcXggPSBxLngsIHF5ID0gcS55LCBxeiA9IHEueiwgcXcgPSBxLncsXG5cbiAgICAgICAgLy8gY2FsY3VsYXRlIHF1YXQgKiB2ZWNcbiAgICAgICAgaXggPSBxdyAqIHggKyBxeSAqIHogLSBxeiAqIHksXG4gICAgICAgIGl5ID0gcXcgKiB5ICsgcXogKiB4IC0gcXggKiB6LFxuICAgICAgICBpeiA9IHF3ICogeiArIHF4ICogeSAtIHF5ICogeCxcbiAgICAgICAgaXcgPSAtcXggKiB4IC0gcXkgKiB5IC0gcXogKiB6O1xuXG4gICAgLy8gY2FsY3VsYXRlIHJlc3VsdCAqIGludmVyc2UgcXVhdFxuICAgIHRoaXMueCA9IGl4ICogcXcgKyBpdyAqIC1xeCArIGl5ICogLXF6IC0gaXogKiAtcXk7XG4gICAgdGhpcy55ID0gaXkgKiBxdyArIGl3ICogLXF5ICsgaXogKiAtcXggLSBpeCAqIC1xejtcbiAgICB0aGlzLnogPSBpeiAqIHF3ICsgaXcgKiAtcXogKyBpeCAqIC1xeSAtIGl5ICogLXF4O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBNdWx0aXBsaWVzIHRoaXMgVmVjdG9yMyBieSB0aGUgc3BlY2lmaWVkIG1hdHJpeCwgXG4gKiBhcHBseWluZyBhIFcgZGl2aWRlLiBUaGlzIGlzIHVzZWZ1bCBmb3IgcHJvamVjdGlvbixcbiAqIGUuZy4gdW5wcm9qZWN0aW5nIGEgMkQgcG9pbnQgaW50byAzRCBzcGFjZS5cbiAqXG4gKiBAbWV0aG9kICBwcmpcbiAqIEBwYXJhbSB7TWF0cml4NH0gdGhlIDR4NCBtYXRyaXggdG8gbXVsdGlwbHkgd2l0aCBcbiAqIEByZXR1cm4ge1ZlY3RvcjN9IHRoaXMgb2JqZWN0IGZvciBjaGFpbmluZ1xuICovXG52ZWMzLnByb2plY3QgPSBmdW5jdGlvbihtYXQpIHtcbiAgICB2YXIgeCA9IHRoaXMueCxcbiAgICAgICAgeSA9IHRoaXMueSxcbiAgICAgICAgeiA9IHRoaXMueixcbiAgICAgICAgbSA9IG1hdC52YWwsXG4gICAgICAgIGEwMCA9IG1bMF0sIGEwMSA9IG1bMV0sIGEwMiA9IG1bMl0sIGEwMyA9IG1bM10sXG4gICAgICAgIGExMCA9IG1bNF0sIGExMSA9IG1bNV0sIGExMiA9IG1bNl0sIGExMyA9IG1bN10sXG4gICAgICAgIGEyMCA9IG1bOF0sIGEyMSA9IG1bOV0sIGEyMiA9IG1bMTBdLCBhMjMgPSBtWzExXSxcbiAgICAgICAgYTMwID0gbVsxMl0sIGEzMSA9IG1bMTNdLCBhMzIgPSBtWzE0XSwgYTMzID0gbVsxNV07XG5cbiAgICB2YXIgbF93ID0gMSAvICh4ICogYTAzICsgeSAqIGExMyArIHogKiBhMjMgKyBhMzMpO1xuXG4gICAgdGhpcy54ID0gKHggKiBhMDAgKyB5ICogYTEwICsgeiAqIGEyMCArIGEzMCkgKiBsX3c7IFxuICAgIHRoaXMueSA9ICh4ICogYTAxICsgeSAqIGExMSArIHogKiBhMjEgKyBhMzEpICogbF93OyBcbiAgICB0aGlzLnogPSAoeCAqIGEwMiArIHkgKiBhMTIgKyB6ICogYTIyICsgYTMyKSAqIGxfdztcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogVW5wcm9qZWN0IHRoaXMgcG9pbnQgZnJvbSAyRCBzcGFjZSB0byAzRCBzcGFjZS5cbiAqIFRoZSBwb2ludCBzaG91bGQgaGF2ZSBpdHMgeCBhbmQgeSBwcm9wZXJ0aWVzIHNldCB0b1xuICogMkQgc2NyZWVuIHNwYWNlLCBhbmQgdGhlIHogZWl0aGVyIGF0IDAgKG5lYXIgcGxhbmUpXG4gKiBvciAxIChmYXIgcGxhbmUpLiBUaGUgcHJvdmlkZWQgbWF0cml4IGlzIGFzc3VtZWQgdG8gYWxyZWFkeVxuICogYmUgY29tYmluZWQsIGkuZS4gcHJvamVjdGlvbiAqIHZpZXcgKiBtb2RlbC5cbiAqXG4gKiBBZnRlciB0aGlzIG9wZXJhdGlvbiwgdGhpcyB2ZWN0b3IncyAoeCwgeSwgeikgY29tcG9uZW50cyB3aWxsXG4gKiByZXByZXNlbnQgdGhlIHVucHJvamVjdGVkIDNEIGNvb3JkaW5hdGUuXG4gKiBcbiAqIEBwYXJhbSAge1ZlY3RvcjR9IHZpZXdwb3J0ICAgICAgICAgIHNjcmVlbiB4LCB5LCB3aWR0aCBhbmQgaGVpZ2h0IGluIHBpeGVsc1xuICogQHBhcmFtICB7TWF0cml4NH0gaW52UHJvamVjdGlvblZpZXcgY29tYmluZWQgcHJvamVjdGlvbiBhbmQgdmlldyBtYXRyaXhcbiAqIEByZXR1cm4ge1ZlY3RvcjN9ICAgICAgICAgICAgICAgICAgIHRoaXMgb2JqZWN0LCBmb3IgY2hhaW5pbmdcbiAqL1xudmVjMy51bnByb2plY3QgPSBmdW5jdGlvbih2aWV3cG9ydCwgaW52UHJvamVjdGlvblZpZXcpIHtcbiAgICB2YXIgdmlld1ggPSB2aWV3cG9ydC54LFxuICAgICAgICB2aWV3WSA9IHZpZXdwb3J0LnksXG4gICAgICAgIHZpZXdXaWR0aCA9IHZpZXdwb3J0LnosXG4gICAgICAgIHZpZXdIZWlnaHQgPSB2aWV3cG9ydC53O1xuICAgIFxuICAgIHZhciB4ID0gdGhpcy54LCBcbiAgICAgICAgeSA9IHRoaXMueSxcbiAgICAgICAgeiA9IHRoaXMuejtcblxuICAgIHggPSB4IC0gdmlld1g7XG4gICAgeSA9IHZpZXdIZWlnaHQgLSB5IC0gMTtcbiAgICB5ID0geSAtIHZpZXdZO1xuXG4gICAgdGhpcy54ID0gKDIgKiB4KSAvIHZpZXdXaWR0aCAtIDE7XG4gICAgdGhpcy55ID0gKDIgKiB5KSAvIHZpZXdIZWlnaHQgLSAxO1xuICAgIHRoaXMueiA9IDIgKiB6IC0gMTtcblxuICAgIHJldHVybiB0aGlzLnByb2plY3QoaW52UHJvamVjdGlvblZpZXcpO1xufTtcblxudmVjMy5yYW5kb20gPSBmdW5jdGlvbihzY2FsZSkge1xuICAgIHNjYWxlID0gc2NhbGUgfHwgMS4wO1xuXG4gICAgdmFyIHIgPSBNYXRoLnJhbmRvbSgpICogMi4wICogTWF0aC5QSTtcbiAgICB2YXIgeiA9IChNYXRoLnJhbmRvbSgpICogMi4wKSAtIDEuMDtcbiAgICB2YXIgelNjYWxlID0gTWF0aC5zcXJ0KDEuMC16KnopICogc2NhbGU7XG4gICAgXG4gICAgdGhpcy54ID0gTWF0aC5jb3MocikgKiB6U2NhbGU7XG4gICAgdGhpcy55ID0gTWF0aC5zaW4ocikgKiB6U2NhbGU7XG4gICAgdGhpcy56ID0geiAqIHNjYWxlO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjMy5yZXNldCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMueCA9IDA7XG4gICAgdGhpcy55ID0gMDtcbiAgICB0aGlzLnogPSAwO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuXG52ZWMzLnN1YiA9IHZlYzMuc3VidHJhY3Q7XG5cbnZlYzMubXVsID0gdmVjMy5tdWx0aXBseTtcblxudmVjMy5kaXYgPSB2ZWMzLmRpdmlkZTtcblxudmVjMy5kaXN0ID0gdmVjMy5kaXN0YW5jZTtcblxudmVjMy5kaXN0U3EgPSB2ZWMzLmRpc3RhbmNlU3E7XG5cbnZlYzMubGVuID0gdmVjMy5sZW5ndGg7XG5cbnZlYzMubGVuU3EgPSB2ZWMzLmxlbmd0aFNxO1xuXG52ZWMzLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICdWZWN0b3IzKCcgKyB0aGlzLnggKyAnLCAnICsgdGhpcy55ICsgJywgJyArIHRoaXMueiArICcpJztcbn07XG5cbnZlYzMuc3RyID0gdmVjMy50b1N0cmluZztcblxubW9kdWxlLmV4cG9ydHMgPSBWZWN0b3IzOyIsInZhciBjb21tb24gPSByZXF1aXJlKCcuL2NvbW1vbicpO1xuXG5mdW5jdGlvbiBWZWN0b3I0KHgsIHksIHosIHcpIHtcblx0aWYgKHR5cGVvZiB4ID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgIHRoaXMueCA9IHgueHx8MDtcbiAgICAgICAgdGhpcy55ID0geC55fHwwO1xuICAgICAgICB0aGlzLnogPSB4Lnp8fDA7XG4gICAgICAgIHRoaXMudyA9IHgud3x8MDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnggPSB4fHwwO1xuICAgICAgICB0aGlzLnkgPSB5fHwwO1xuICAgICAgICB0aGlzLnogPSB6fHwwO1xuICAgICAgICB0aGlzLncgPSB3fHwwO1xuICAgIH1cbn1cblxuLy9zaG9ydGhhbmQgaXQgZm9yIGJldHRlciBtaW5pZmljYXRpb25cbnZhciB2ZWM0ID0gVmVjdG9yNC5wcm90b3R5cGU7XG5cbi8vbWl4aW4gY29tbW9uIGZ1bmN0aW9uc1xuZm9yICh2YXIgayBpbiBjb21tb24pIHtcbiAgICB2ZWM0W2tdID0gY29tbW9uW2tdO1xufVxuXG52ZWM0LmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBWZWN0b3I0KHRoaXMueCwgdGhpcy55LCB0aGlzLnosIHRoaXMudyk7XG59O1xuXG52ZWM0Lm11bHRpcGx5ID0gZnVuY3Rpb24odikge1xuICAgIHRoaXMueCAqPSB2Lng7XG4gICAgdGhpcy55ICo9IHYueTtcbiAgICB0aGlzLnogKj0gdi56O1xuICAgIHRoaXMudyAqPSB2Lnc7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWM0LmRpdmlkZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICB0aGlzLnggLz0gdi54O1xuICAgIHRoaXMueSAvPSB2Lnk7XG4gICAgdGhpcy56IC89IHYuejtcbiAgICB0aGlzLncgLz0gdi53O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudmVjNC5kaXN0YW5jZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICB2YXIgZHggPSB2LnggLSB0aGlzLngsXG4gICAgICAgIGR5ID0gdi55IC0gdGhpcy55LFxuICAgICAgICBkeiA9IHYueiAtIHRoaXMueixcbiAgICAgICAgZHcgPSB2LncgLSB0aGlzLnc7XG4gICAgcmV0dXJuIE1hdGguc3FydChkeCpkeCArIGR5KmR5ICsgZHoqZHogKyBkdypkdyk7XG59O1xuXG52ZWM0LmRpc3RhbmNlU3EgPSBmdW5jdGlvbih2KSB7XG4gICAgdmFyIGR4ID0gdi54IC0gdGhpcy54LFxuICAgICAgICBkeSA9IHYueSAtIHRoaXMueSxcbiAgICAgICAgZHogPSB2LnogLSB0aGlzLnosXG4gICAgICAgIGR3ID0gdi53IC0gdGhpcy53O1xuICAgIHJldHVybiBkeCpkeCArIGR5KmR5ICsgZHoqZHogKyBkdypkdztcbn07XG5cbnZlYzQubmVnYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy54ID0gLXRoaXMueDtcbiAgICB0aGlzLnkgPSAtdGhpcy55O1xuICAgIHRoaXMueiA9IC10aGlzLno7XG4gICAgdGhpcy53ID0gLXRoaXMudztcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzQudHJhbnNmb3JtTWF0NCA9IGZ1bmN0aW9uKG1hdCkge1xuICAgIHZhciBtID0gbWF0LnZhbCwgeCA9IHRoaXMueCwgeSA9IHRoaXMueSwgeiA9IHRoaXMueiwgdyA9IHRoaXMudztcbiAgICB0aGlzLnggPSBtWzBdICogeCArIG1bNF0gKiB5ICsgbVs4XSAqIHogKyBtWzEyXSAqIHc7XG4gICAgdGhpcy55ID0gbVsxXSAqIHggKyBtWzVdICogeSArIG1bOV0gKiB6ICsgbVsxM10gKiB3O1xuICAgIHRoaXMueiA9IG1bMl0gKiB4ICsgbVs2XSAqIHkgKyBtWzEwXSAqIHogKyBtWzE0XSAqIHc7XG4gICAgdGhpcy53ID0gbVszXSAqIHggKyBtWzddICogeSArIG1bMTFdICogeiArIG1bMTVdICogdztcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8vLy8gVE9ETzogaXMgdGhpcyByZWFsbHkgdGhlIHNhbWUgYXMgVmVjdG9yMyA/P1xuLy8vICBBbHNvLCB3aGF0IGFib3V0IHRoaXM6XG4vLy8gIGh0dHA6Ly9tb2xlY3VsYXJtdXNpbmdzLndvcmRwcmVzcy5jb20vMjAxMy8wNS8yNC9hLWZhc3Rlci1xdWF0ZXJuaW9uLXZlY3Rvci1tdWx0aXBsaWNhdGlvbi9cbnZlYzQudHJhbnNmb3JtUXVhdCA9IGZ1bmN0aW9uKHEpIHtcbiAgICAvLyBiZW5jaG1hcmtzOiBodHRwOi8vanNwZXJmLmNvbS9xdWF0ZXJuaW9uLXRyYW5zZm9ybS12ZWMzLWltcGxlbWVudGF0aW9uc1xuICAgIHZhciB4ID0gdGhpcy54LCB5ID0gdGhpcy55LCB6ID0gdGhpcy56LFxuICAgICAgICBxeCA9IHEueCwgcXkgPSBxLnksIHF6ID0gcS56LCBxdyA9IHEudyxcblxuICAgICAgICAvLyBjYWxjdWxhdGUgcXVhdCAqIHZlY1xuICAgICAgICBpeCA9IHF3ICogeCArIHF5ICogeiAtIHF6ICogeSxcbiAgICAgICAgaXkgPSBxdyAqIHkgKyBxeiAqIHggLSBxeCAqIHosXG4gICAgICAgIGl6ID0gcXcgKiB6ICsgcXggKiB5IC0gcXkgKiB4LFxuICAgICAgICBpdyA9IC1xeCAqIHggLSBxeSAqIHkgLSBxeiAqIHo7XG5cbiAgICAvLyBjYWxjdWxhdGUgcmVzdWx0ICogaW52ZXJzZSBxdWF0XG4gICAgdGhpcy54ID0gaXggKiBxdyArIGl3ICogLXF4ICsgaXkgKiAtcXogLSBpeiAqIC1xeTtcbiAgICB0aGlzLnkgPSBpeSAqIHF3ICsgaXcgKiAtcXkgKyBpeiAqIC1xeCAtIGl4ICogLXF6O1xuICAgIHRoaXMueiA9IGl6ICogcXcgKyBpdyAqIC1xeiArIGl4ICogLXF5IC0gaXkgKiAtcXg7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWM0LnJhbmRvbSA9IGZ1bmN0aW9uKHNjYWxlKSB7XG4gICAgc2NhbGUgPSBzY2FsZSB8fCAxLjA7XG5cbiAgICAvL05vdCBzcGhlcmljYWw7IHNob3VsZCBmaXggdGhpcyBmb3IgbW9yZSB1bmlmb3JtIGRpc3RyaWJ1dGlvblxuICAgIHRoaXMueCA9IChNYXRoLnJhbmRvbSgpICogMiAtIDEpICogc2NhbGU7XG4gICAgdGhpcy55ID0gKE1hdGgucmFuZG9tKCkgKiAyIC0gMSkgKiBzY2FsZTtcbiAgICB0aGlzLnogPSAoTWF0aC5yYW5kb20oKSAqIDIgLSAxKSAqIHNjYWxlO1xuICAgIHRoaXMudyA9IChNYXRoLnJhbmRvbSgpICogMiAtIDEpICogc2NhbGU7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG52ZWM0LnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy54ID0gMDtcbiAgICB0aGlzLnkgPSAwO1xuICAgIHRoaXMueiA9IDA7XG4gICAgdGhpcy53ID0gMDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnZlYzQuc3ViID0gdmVjNC5zdWJ0cmFjdDtcblxudmVjNC5tdWwgPSB2ZWM0Lm11bHRpcGx5O1xuXG52ZWM0LmRpdiA9IHZlYzQuZGl2aWRlO1xuXG52ZWM0LmRpc3QgPSB2ZWM0LmRpc3RhbmNlO1xuXG52ZWM0LmRpc3RTcSA9IHZlYzQuZGlzdGFuY2VTcTtcblxudmVjNC5sZW4gPSB2ZWM0Lmxlbmd0aDtcblxudmVjNC5sZW5TcSA9IHZlYzQubGVuZ3RoU3E7XG5cbnZlYzQudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJ1ZlY3RvcjQoJyArIHRoaXMueCArICcsICcgKyB0aGlzLnkgKyAnLCAnICsgdGhpcy56ICsgJywgJyArIHRoaXMudyArICcpJztcbn07XG5cbnZlYzQuc3RyID0gdmVjNC50b1N0cmluZztcblxubW9kdWxlLmV4cG9ydHMgPSBWZWN0b3I0OyIsIi8vY29tbW9uIHZlYzQgZnVuY3Rpb25zXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBcbi8qKlxuICogQ29waWVzIHRoZSB4LCB5LCB6LCB3IGNvbXBvbmVudHMgZnJvbSB0aGUgc3BlY2lmaWVkXG4gKiBWZWN0b3IuIFVubGlrZSBtb3N0IG90aGVyIG9wZXJhdGlvbnMsIHRoaXMgZnVuY3Rpb25cbiAqIHdpbGwgZGVmYXVsdCB1bmRlZmluZWQgY29tcG9uZW50cyBvbiBgb3RoZXJWZWNgIHRvIHplcm8uXG4gKiBcbiAqIEBtZXRob2QgIGNvcHlcbiAqIEBwYXJhbSAge290aGVyVmVjfSB0aGUgb3RoZXIgVmVjdG9yNCB0byBjb3B5XG4gKiBAcmV0dXJuIHtWZWN0b3J9ICB0aGlzLCBmb3IgY2hhaW5pbmdcbiAqL1xuXG5cbi8qKlxuICogQSBjb252ZW5pZW5jZSBmdW5jdGlvbiB0byBzZXQgdGhlIGNvbXBvbmVudHMgb2ZcbiAqIHRoaXMgdmVjdG9yIGFzIHgsIHksIHosIHcuIEZhbHN5IG9yIHVuZGVmaW5lZFxuICogcGFyYW1ldGVycyB3aWxsIGRlZmF1bHQgdG8gemVyby5cbiAqXG4gKiBZb3UgY2FuIGFsc28gcGFzcyBhIHZlY3RvciBvYmplY3QgaW5zdGVhZCBvZlxuICogaW5kaXZpZHVhbCBjb21wb25lbnRzLCB0byBjb3B5IHRoZSBvYmplY3QncyBjb21wb25lbnRzLlxuICogXG4gKiBAbWV0aG9kICBzZXRcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IHRoZSB4IGNvbXBvbmVudFxuICogQHBhcmFtIHtOdW1iZXJ9IHkgdGhlIHkgY29tcG9uZW50XG4gKiBAcGFyYW0ge051bWJlcn0geiB0aGUgeiBjb21wb25lbnRcbiAqIEBwYXJhbSB7TnVtYmVyfSB3IHRoZSB3IGNvbXBvbmVudFxuICogQHJldHVybiB7VmVjdG9yMn0gIHRoaXMsIGZvciBjaGFpbmluZ1xuICovXG5cbi8qKlxuICogQWRkcyB0aGUgY29tcG9uZW50cyBvZiB0aGUgb3RoZXIgVmVjdG9yNCB0b1xuICogdGhpcyB2ZWN0b3IuXG4gKiBcbiAqIEBtZXRob2QgYWRkXG4gKiBAcGFyYW0gIHtWZWN0b3I0fSBvdGhlclZlYyBvdGhlciB2ZWN0b3IsIHJpZ2h0IG9wZXJhbmRcbiAqIEByZXR1cm4ge1ZlY3RvcjJ9ICB0aGlzLCBmb3IgY2hhaW5pbmdcbiAqL1xuXG4vKipcbiAqIFN1YnRyYWN0cyB0aGUgY29tcG9uZW50cyBvZiB0aGUgb3RoZXIgVmVjdG9yNFxuICogZnJvbSB0aGlzIHZlY3Rvci4gQWxpYXNlZCBhcyBgc3ViKClgXG4gKiBcbiAqIEBtZXRob2QgIHN1YnRyYWN0XG4gKiBAcGFyYW0gIHtWZWN0b3I0fSBvdGhlclZlYyBvdGhlciB2ZWN0b3IsIHJpZ2h0IG9wZXJhbmRcbiAqIEByZXR1cm4ge1ZlY3RvcjJ9ICB0aGlzLCBmb3IgY2hhaW5pbmdcbiAqL1xuXG4vKipcbiAqIE11bHRpcGxpZXMgdGhlIGNvbXBvbmVudHMgb2YgdGhpcyBWZWN0b3I0XG4gKiBieSBhIHNjYWxhciBhbW91bnQuXG4gKlxuICogQG1ldGhvZCAgc2NhbGVcbiAqIEBwYXJhbSB7TnVtYmVyfSBzIHRoZSBzY2FsZSB0byBtdWx0aXBseSBieVxuICogQHJldHVybiB7VmVjdG9yNH0gdGhpcywgZm9yIGNoYWluaW5nXG4gKi9cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBtYWduaXR1ZGUgKGxlbmd0aCkgb2YgdGhpcyB2ZWN0b3IuXG4gKlxuICogQWxpYXNlZCBhcyBgbGVuKClgXG4gKiBcbiAqIEBtZXRob2QgIGxlbmd0aFxuICogQHJldHVybiB7TnVtYmVyfSB0aGUgbGVuZ3RoIG9mIHRoaXMgdmVjdG9yXG4gKi9cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBzcXVhcmVkIG1hZ25pdHVkZSAobGVuZ3RoKSBvZiB0aGlzIHZlY3Rvci5cbiAqXG4gKiBBbGlhc2VkIGFzIGBsZW5TcSgpYFxuICogXG4gKiBAbWV0aG9kICBsZW5ndGhTcVxuICogQHJldHVybiB7TnVtYmVyfSB0aGUgc3F1YXJlZCBsZW5ndGggb2YgdGhpcyB2ZWN0b3JcbiAqL1xuXG4vKipcbiAqIE5vcm1hbGl6ZXMgdGhpcyB2ZWN0b3IgdG8gYSB1bml0IHZlY3Rvci5cbiAqIEBtZXRob2Qgbm9ybWFsaXplXG4gKiBAcmV0dXJuIHtWZWN0b3I0fSAgdGhpcywgZm9yIGNoYWluaW5nXG4gKi9cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBkb3QgcHJvZHVjdCBvZiB0aGlzIHZlY3RvclxuICogYW5kIHRoZSBzcGVjaWZpZWQgVmVjdG9yNC5cbiAqIFxuICogQG1ldGhvZCBkb3RcbiAqIEByZXR1cm4ge051bWJlcn0gdGhlIGRvdCBwcm9kdWN0XG4gKi9cbiAgICBjb3B5OiBmdW5jdGlvbihvdGhlclZlYykge1xuICAgICAgICB0aGlzLnggPSBvdGhlclZlYy54fHwwO1xuICAgICAgICB0aGlzLnkgPSBvdGhlclZlYy55fHwwO1xuICAgICAgICB0aGlzLnogPSBvdGhlclZlYy56fHwwO1xuICAgICAgICB0aGlzLncgPSBvdGhlclZlYy53fHwwO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgc2V0OiBmdW5jdGlvbih4LCB5LCB6LCB3KSB7XG4gICAgICAgIGlmICh0eXBlb2YgeCA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgdGhpcy54ID0geC54fHwwO1xuICAgICAgICAgICAgdGhpcy55ID0geC55fHwwO1xuICAgICAgICAgICAgdGhpcy56ID0geC56fHwwO1xuICAgICAgICAgICAgdGhpcy53ID0geC53fHwwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy54ID0geHx8MDtcbiAgICAgICAgICAgIHRoaXMueSA9IHl8fDA7XG4gICAgICAgICAgICB0aGlzLnogPSB6fHwwO1xuICAgICAgICAgICAgdGhpcy53ID0gd3x8MDtcblxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBhZGQ6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgdGhpcy54ICs9IHYueDtcbiAgICAgICAgdGhpcy55ICs9IHYueTtcbiAgICAgICAgdGhpcy56ICs9IHYuejtcbiAgICAgICAgdGhpcy53ICs9IHYudztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHN1YnRyYWN0OiBmdW5jdGlvbih2KSB7XG4gICAgICAgIHRoaXMueCAtPSB2Lng7XG4gICAgICAgIHRoaXMueSAtPSB2Lnk7XG4gICAgICAgIHRoaXMueiAtPSB2Lno7XG4gICAgICAgIHRoaXMudyAtPSB2Lnc7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBzY2FsZTogZnVuY3Rpb24ocykge1xuICAgICAgICB0aGlzLnggKj0gcztcbiAgICAgICAgdGhpcy55ICo9IHM7XG4gICAgICAgIHRoaXMueiAqPSBzO1xuICAgICAgICB0aGlzLncgKj0gcztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuXG4gICAgbGVuZ3RoOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHggPSB0aGlzLngsXG4gICAgICAgICAgICB5ID0gdGhpcy55LFxuICAgICAgICAgICAgeiA9IHRoaXMueixcbiAgICAgICAgICAgIHcgPSB0aGlzLnc7XG4gICAgICAgIHJldHVybiBNYXRoLnNxcnQoeCp4ICsgeSp5ICsgeip6ICsgdyp3KTtcbiAgICB9LFxuXG4gICAgbGVuZ3RoU3E6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgeCA9IHRoaXMueCxcbiAgICAgICAgICAgIHkgPSB0aGlzLnksXG4gICAgICAgICAgICB6ID0gdGhpcy56LFxuICAgICAgICAgICAgdyA9IHRoaXMudztcbiAgICAgICAgcmV0dXJuIHgqeCArIHkqeSArIHoqeiArIHcqdztcbiAgICB9LFxuXG4gICAgbm9ybWFsaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHggPSB0aGlzLngsXG4gICAgICAgICAgICB5ID0gdGhpcy55LFxuICAgICAgICAgICAgeiA9IHRoaXMueixcbiAgICAgICAgICAgIHcgPSB0aGlzLnc7XG4gICAgICAgIHZhciBsZW4gPSB4KnggKyB5KnkgKyB6KnogKyB3Knc7XG4gICAgICAgIGlmIChsZW4gPiAwKSB7XG4gICAgICAgICAgICBsZW4gPSAxIC8gTWF0aC5zcXJ0KGxlbik7XG4gICAgICAgICAgICB0aGlzLnggPSB4KmxlbjtcbiAgICAgICAgICAgIHRoaXMueSA9IHkqbGVuO1xuICAgICAgICAgICAgdGhpcy56ID0geipsZW47XG4gICAgICAgICAgICB0aGlzLncgPSB3KmxlbjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgZG90OiBmdW5jdGlvbih2KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnggKiB2LnggKyB0aGlzLnkgKiB2LnkgKyB0aGlzLnogKiB2LnogKyB0aGlzLncgKiB2Lnc7XG4gICAgfSxcblxuICAgIGxlcnA6IGZ1bmN0aW9uKHYsIHQpIHtcbiAgICAgICAgdmFyIGF4ID0gdGhpcy54LFxuICAgICAgICAgICAgYXkgPSB0aGlzLnksXG4gICAgICAgICAgICBheiA9IHRoaXMueixcbiAgICAgICAgICAgIGF3ID0gdGhpcy53O1xuICAgICAgICB0ID0gdHx8MDtcbiAgICAgICAgdGhpcy54ID0gYXggKyB0ICogKHYueCAtIGF4KTtcbiAgICAgICAgdGhpcy55ID0gYXkgKyB0ICogKHYueSAtIGF5KTtcbiAgICAgICAgdGhpcy56ID0gYXogKyB0ICogKHYueiAtIGF6KTtcbiAgICAgICAgdGhpcy53ID0gYXcgKyB0ICogKHYudyAtIGF3KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBWZWN0b3IyOiByZXF1aXJlKCcuL1ZlY3RvcjInKSxcbiAgICBWZWN0b3IzOiByZXF1aXJlKCcuL1ZlY3RvcjMnKSxcbiAgICBWZWN0b3I0OiByZXF1aXJlKCcuL1ZlY3RvcjQnKSxcbiAgICBNYXRyaXgzOiByZXF1aXJlKCcuL01hdHJpeDMnKSxcbiAgICBNYXRyaXg0OiByZXF1aXJlKCcuL01hdHJpeDQnKSxcbiAgICBRdWF0ZXJuaW9uOiByZXF1aXJlKCcuL1F1YXRlcm5pb24nKVxufTsiLCJ2YXIgJCA9ICh3aW5kb3cuJCk7XG52YXIgU2ltcGxleE5vaXNlID0gcmVxdWlyZSgnc2ltcGxleC1ub2lzZScpO1xudmFyIFZlY3RvcjIgPSByZXF1aXJlKCd2ZWNtYXRoJykuVmVjdG9yMjtcblxudmFyIHNtb290aHN0ZXAgPSByZXF1aXJlKCdpbnRlcnBvbGF0aW9uJykuc21vb3Roc3RlcDtcbnZhciBsZXJwID0gcmVxdWlyZSgnaW50ZXJwb2xhdGlvbicpLmxlcnA7XG5cbnZhciBOb2lzZU1hcCA9IHJlcXVpcmUoJy4vdXRpbC9Ob2lzZU1hcCcpO1xudmFyIGltYWdlZGF0YSA9IHJlcXVpcmUoJy4vdXRpbC9pbWFnZWRhdGEnKTtcblxudmFyIFBhcnRpY2xlID0gcmVxdWlyZSgnLi9pbXByZXNzaW9uJykuUGFydGljbGU7XG5cbnZhciBkYXQgPSAod2luZG93LmRhdCk7XG5cbnZhciB0bXAgPSBuZXcgVmVjdG9yMigpO1xudmFyIHRtcDIgPSBuZXcgVmVjdG9yMigpO1xudmFyIHJhZiA9IHJlcXVpcmUoJ3JhZi5qcycpO1xuXG5cbi8vcG9seWZpbGxcbmlmICghbmF2aWdhdG9yLmdldFVzZXJNZWRpYSlcbiAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhID0gbmF2aWdhdG9yLmdldFVzZXJNZWRpYSBcbiAgICAgICAgICAgICAgICAgICAgICAgIHx8IG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEgXG4gICAgICAgICAgICAgICAgICAgICAgICB8fCBuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhIFxuICAgICAgICAgICAgICAgICAgICAgICAgfHwgbmF2aWdhdG9yLm1zR2V0VXNlck1lZGlhO1xuaWYgKCF3aW5kb3cuVVJMKVxuICAgIHdpbmRvdy5VUkwgPSB3aW5kb3cuVVJMIFxuICAgICAgICAgICAgICAgICAgICB8fCB3aW5kb3cud2Via2l0VVJMIFxuICAgICAgICAgICAgICAgICAgICB8fCB3aW5kb3cubW96VVJMIFxuICAgICAgICAgICAgICAgICAgICB8fCB3aW5kb3cubXNVUkw7XG5cblxuJChmdW5jdGlvbigpIHtcblx0Ly8gdmFyIGNhbnZhcyA9ICQoXCI8Y2FudmFzPlwiKS5hcHBlbmRUbyhkb2N1bWVudC5ib2R5KVswXTtcblx0dmFyIGNhbnZhcyA9ICQoXCI8Y2FudmFzPlwiKVswXTtcblx0dmFyIHdpZHRoID0gOTAwLFxuXHRcdGhlaWdodCA9IDUzNTtcblxuXHR2YXIgbWluaW1hbCA9ICEhJChkb2N1bWVudC5ib2R5KS5kYXRhKFwibWluaW1hbFwiKTtcblxuXHR2YXIgcHJldmlld0NhbnZhcyA9ICQoXCI8Y2FudmFzPlwiKS5hcHBlbmRUbyhkb2N1bWVudC5ib2R5KVswXSxcblx0XHRwcmV2aWV3V2lkdGggPSBNYXRoLm1heCgyNTYsIH5+KHdpZHRoLzEpKSxcblx0XHRwcmV2aWV3SGVpZ2h0ID0gfn4ocHJldmlld1dpZHRoICogMS8od2lkdGgvaGVpZ2h0KSksXG5cdFx0cHJldmlld0NvbnRleHQgPSBwcmV2aWV3Q2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcblxuXHRwcmV2aWV3Q2FudmFzLndpZHRoID0gcHJldmlld1dpZHRoO1xuXHRwcmV2aWV3Q2FudmFzLmhlaWdodCA9IHByZXZpZXdIZWlnaHQ7XG5cblx0Y2FudmFzLndpZHRoID0gd2lkdGg7XG5cdGNhbnZhcy5oZWlnaHQgPSBoZWlnaHQ7XG5cblxuXHR2YXIgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG5cdHZhciBub2lzZVNpemUgPSAyNTY7XG5cdHZhciBub2lzZSA9IG5ldyBOb2lzZU1hcChub2lzZVNpemUpO1xuXHRub2lzZS5zY2FsZSA9IDMuMjtcblx0Ly8gbm9pc2Uuc2VhbWxlc3MgPSB0cnVlO1xuXHRub2lzZS5zbW9vdGhpbmcgPSB0cnVlO1xuXHRub2lzZS5nZW5lcmF0ZSgpO1xuXG5cblx0dmFyIGltYWdlID0gbmV3IEltYWdlKCk7XG5cdGltYWdlLm9ubG9hZCA9IGhhbmRsZUltYWdlTG9hZDtcblx0aW1hZ2Uuc3JjID0gbWluaW1hbCA/IFwiaW1nL3N1bi5wbmdcIiA6IFwiaW1nL3NreWxpbmUyLnBuZ1wiO1xuXG5cblx0dmFyIGltYWdlUGl4ZWxzO1xuXG5cdHZhciBvcHRpb25zID0ge1xuXHRcdHNjYWxlOiBub2lzZS5zY2FsZSxcblx0XHRzaGlmdDogZmFsc2UsXG5cdFx0cGFpbnRpbmc6IHRydWUsXG5cblx0XHQvL3N0cm9rZSBvcHRpb25zXG5cdFx0Y291bnQ6IDUwMCxcblx0XHRsZW5ndGg6IDMzLFxuXHRcdHRoaWNrbmVzczogMTIuMCxcblx0XHRzcGVlZDogMS4wLFxuXHRcdGxpZmU6IDEuMCwgXG5cdFx0YWxwaGE6IDAuMjUsXG5cdFx0cm91bmQ6IHRydWUsXG5cdFx0bW90aW9uOiB0cnVlLFxuXHRcdGFuZ2xlOiAxLFxuXG5cdFx0Ly9jb2xvclxuXHRcdHVzZU9yaWdpbmFsOiB0cnVlLFxuXHRcdGh1ZTogNzAsXG5cdFx0c2F0dXJhdGlvbjogMS4wLFxuXHRcdGxpZ2h0bmVzczogMS4wLFxuXHRcdGdyYWluOiBtaW5pbWFsID8gLjUgOiAuNyxcblx0XHRkYXJrZW46ICFtaW5pbWFsLFxuXHRcdFxuXG5cdFx0YmFja2dyb3VuZDogbWluaW1hbCA/ICcjZjFmMGUyJyA6ICcjMmYyZjJmJyxcblx0XHRjbGVhcjogY2xlYXIsXG5cdFx0YW5pbWF0ZTogYW5pbWF0ZUluLFxuXHRcdHZpZXdPcmlnaW5hbDogZmFsc2UsXG5cdFx0ZXhwb3J0SW1hZ2U6IHNhdmVJbWFnZS5iaW5kKHRoaXMpXG5cdH07XG5cblx0dmFyIG5vaXNlT3ZlcmxheSA9ICQoJzxkaXY+JykuYXBwZW5kVG8oZG9jdW1lbnQuYm9keSkuYWRkQ2xhc3MoJ25vaXNlIG92ZXJsYXknKS5jc3Moe1xuXHRcdHdpZHRoOiBwcmV2aWV3V2lkdGgsXG5cdFx0aGVpZ2h0OiBwcmV2aWV3SGVpZ2h0LFxuXHRcdG9wYWNpdHk6IG9wdGlvbnMuZ3JhaW4qMC4yXG5cdH0pO1xuXHQkKGRvY3VtZW50LmJvZHkpLmNzcygnYmFja2dyb3VuZCcsICcjMjUyNTI1Jyk7XG5cblx0dmFyIG9yaWdpbmFsSW1hZ2UgPSAkKGltYWdlKS5jbG9uZSgpLmFwcGVuZFRvKGRvY3VtZW50LmJvZHkpLmNzcyh7XG5cdFx0dmlzaWJpbGl0eTogJ2hpZGRlbidcblx0fSkuYWRkQ2xhc3MoJ292ZXJsYXkgb3JpZ2luYWwnKS5jc3Moe1xuXHRcdHdpZHRoOiBwcmV2aWV3V2lkdGgsXG5cdFx0aGVpZ2h0OiBwcmV2aWV3SGVpZ2h0XG5cdH0pO1xuXG5cdFxuXHR2YXIgZ3VpO1xuXHRzZXR1cEdVSSgpO1xuXG5cblx0dmFyIHBhcnRpY2xlcyA9IFtdLFxuXHRcdGNvdW50ID0gNTAwLFxuXHRcdHN0ZXAgPSAwLFxuXHRcdHRpbWUgPSAwLFxuXHRcdG1vdXNlID0gbmV3IFZlY3RvcjIoKTtcblxuXHR2YXIgdmlkZW8sIHBsYXlpbmc9ZmFsc2U7XG5cdGxvYWRWaWRlbygpO1xuXG5cdHZhciBzdGFydFRpbWUgPSBEYXRlLm5vdygpLCB3ZWJjYW1UaW1lciA9IDAsXG5cdFx0d2ViY2FtRGVsYXkgPSA1MDA7XG5cblx0c2V0dXBQYXJ0aWNsZXMoKTtcblxuXHRhbmltYXRlSW4oKTtcblxuXHRpZiAobWluaW1hbCkge1xuXHRcdCQoJyN0ZXh0JykuaHRtbCgnZ2VuZXJhdGl2ZSBwYWludGluZyBpbiB0aGUgaW1wcmVzc2lvbmlzdCBzdHlsZTxwPmJ5IE1hdHQgRGVzTGF1cmllcnM8L3A+Jylcblx0XHRcdC5jc3MoXCJ0b3BcIiwgMTApLmNzcyhcImNvbG9yXCIsIFwiIzJmMmYyZlwiKS5jc3MoXCJ6LWluZGV4XCIsIDEwMDApO1xuXHRcdCQoJy5kZy5hYycpLmhpZGUoKTtcblx0XHQkKCdjYW52YXMsIGRpdi5ub2lzZScpLm9uKFwidGFwIG1vdXNlZG93blwiLCBmdW5jdGlvbihldikge1xuXHRcdFx0ZXYucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGNsZWFyKCk7XG5cblx0XHRcdG9wdGlvbnMucGFpbnRpbmcgPSBmYWxzZTtcblx0XHRcdHByZXZpZXdDb250ZXh0LmRyYXdJbWFnZShjYW52YXMsIDAsIDAsIHByZXZpZXdXaWR0aCwgcHJldmlld0hlaWdodCk7XG5cdFx0XHRUd2VlbkxpdGUuZGVsYXllZENhbGwoMC41LCBhbmltYXRlSW4uYmluZCh0aGlzKSk7XG5cdFx0fSkub24oJ3RvdWNobW92ZScsIGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0fSk7XG5cblx0fVxuXG5cblx0ZnVuY3Rpb24gaGFuZGxlSW1hZ2VMb2FkKCkge1xuXHRcdGltYWdlUGl4ZWxzID0gaW1hZ2VkYXRhLmdldEltYWdlRGF0YShpbWFnZSkuZGF0YTtcblx0XHRcdFx0XG5cdFx0Ly8gY29udGV4dC5maWxsU3R5bGUgPSAnI2ViZWJlYic7XG5cdFx0Y2xlYXJSZWN0KCk7XG5cblxuXHRcdC8vIGNvbnRleHQuZ2xvYmFsQWxwaGEgPSAxO1xuXHRcdC8vIGNvbnRleHQuZHJhd0ltYWdlKGltYWdlLCAwLCAwKTtcblxuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZShyZW5kZXIpO1xuXHR9XG5cblx0ZnVuY3Rpb24gdXBkYXRlQW5pbWF0aW9uKCkge1xuXG5cdFx0Ly93dGYgZGF0Lmd1aS4uLlxuXHRcdGZvciAodmFyIGsgaW4gZ3VpLl9fZm9sZGVycy5zdHJva2UuX19jb250cm9sbGVycykge1xuXHRcdFx0Z3VpLl9fZm9sZGVycy5zdHJva2UuX19jb250cm9sbGVyc1trXS51cGRhdGVEaXNwbGF5KCk7XG5cdFx0fVxuXHRcdGZvciAodmFyIGsgaW4gZ3VpLl9fZm9sZGVycy5jb2xvci5fX2NvbnRyb2xsZXJzKSB7XG5cdFx0XHRndWkuX19mb2xkZXJzLmNvbG9yLl9fY29udHJvbGxlcnNba10udXBkYXRlRGlzcGxheSgpO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIHNhdmVJbWFnZSgpIHtcblx0XHQvLyBvcHRpb25zLnBhaW50aW5nID0gZmFsc2U7XG5cblx0XHQvLyBmb3IgKHZhciBrIGluIGd1aS5fX2ZvbGRlcnMuY2FudmFzLl9fY29udHJvbGxlcnMpIHtcblx0XHQvLyBcdGd1aS5fX2ZvbGRlcnMuY2FudmFzLl9fY29udHJvbGxlcnNba10udXBkYXRlRGlzcGxheSgpO1xuXHRcdC8vIH1cblx0XHRcblx0XHR2YXIgZGF0YVVSTCA9IGNhbnZhcy50b0RhdGFVUkwoXCJpbWFnZS9wbmdcIik7XG5cblx0XHR2YXIgZGlzcGxheVdpZHRoID0gd2lkdGgsXG5cdFx0XHRkaXNwbGF5SGVpZ2h0ID0gaGVpZ2h0O1xuXHRcdHZhciBpbWFnZVdpbmRvdyA9IHdpbmRvdy5vcGVuKFwiXCIsIFwiZnJhY3RhbExpbmVJbWFnZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJsZWZ0PTAsdG9wPTAsd2lkdGg9XCIrODAwK1wiLGhlaWdodD1cIis1MDArXCIsdG9vbGJhcj0wLHJlc2l6YWJsZT0wXCIpO1xuXHRcdGltYWdlV2luZG93LmRvY3VtZW50LndyaXRlKFwiPHRpdGxlPkV4cG9ydCBJbWFnZTwvdGl0bGU+XCIpXG5cdFx0aW1hZ2VXaW5kb3cuZG9jdW1lbnQud3JpdGUoXCI8aW1nIGlkPSdleHBvcnRJbWFnZSdcIlxuXHRcdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKyBcIiBhbHQ9JydcIlxuXHRcdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKyBcIiBoZWlnaHQ9J1wiICsgZGlzcGxheUhlaWdodCArIFwiJ1wiXG5cdFx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICArIFwiIHdpZHRoPSdcIiAgKyBkaXNwbGF5V2lkdGggICsgXCInXCJcblx0XHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICsgXCIgc3R5bGU9J3Bvc2l0aW9uOmFic29sdXRlO2xlZnQ6MDt0b3A6MCcvPlwiKTtcblx0XHRpbWFnZVdpbmRvdy5kb2N1bWVudC5jbG9zZSgpO1xuXHRcdHZhciBleHBvcnRJbWFnZSA9IGltYWdlV2luZG93LmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZXhwb3J0SW1hZ2VcIik7XG5cdFx0ZXhwb3J0SW1hZ2Uuc3JjID0gZGF0YVVSTDtcblx0fVxuXG5cdGZ1bmN0aW9uIGFuaW1hdGVJbigpIHtcblx0XHRvcHRpb25zLnBhaW50aW5nID0gdHJ1ZTtcblx0XHRUd2VlbkxpdGUua2lsbFR3ZWVuc09mKG9wdGlvbnMpO1xuXHRcdHVwZGF0ZUFuaW1hdGlvbigpO1xuXG5cdFx0Ly8gVHdlZW5MaXRlLnRvKG9wdGlvbnMsIDEuMCwge1xuXHRcdC8vIFx0Z3JhaW46IDEuMCxcblx0XHQvLyBcdG9uVXBkYXRlOiB1cGRhdGVHcmFpbi5iaW5kKHRoaXMpLFxuXHRcdC8vIH0pO1xuXHRcblx0XHRpZiAobWluaW1hbCkgLy9nb2QgdGhpcyBjb2RlIGlzIGdldHRpbmcgbmFzdHkuLlxuICAgICAgICAgICAgYW5pbWF0ZUluMigpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBhbmltYXRlSW4xKCk7XG5cdH1cblxuICAgIGZ1bmN0aW9uIGFuaW1hdGVJbjEoKSB7XG5cdFx0VHdlZW5MaXRlLmtpbGxUd2VlbnNPZihvcHRpb25zKTtcblx0XHR1cGRhdGVBbmltYXRpb24oKTtcblxuXHRcdC8vIFR3ZWVuTGl0ZS50byhvcHRpb25zLCAxLjAsIHtcblx0XHQvLyBcdGdyYWluOiAxLjAsXG5cdFx0Ly8gXHRvblVwZGF0ZTogdXBkYXRlR3JhaW4uYmluZCh0aGlzKSxcblx0XHQvLyB9KTtcblxuXHRcdFR3ZWVuTGl0ZS5mcm9tVG8ob3B0aW9ucywgMS4wLCB7XG5cdFx0XHR0aGlja25lc3M6IDMwLFxuXHRcdH0sIHtcblx0XHRcdHRoaWNrbmVzczogMjAsXG5cdFx0XHRlYXNlOiBFeHBvLmVhc2VPdXQsXG5cdFx0XHRkZWxheTogMi4wLFxuXHRcdH0pXG5cdFx0VHdlZW5MaXRlLmZyb21UbyhvcHRpb25zLCAzLjAsIHtcblx0XHRcdGxlbmd0aDogMjMsXG5cdFx0XHRhbHBoYTogMC4zLFxuXHRcdFx0bGlmZTogMC43LFxuXHRcdFx0Ly8gcm91bmQ6IHRydWUsXG5cdFx0XHRzcGVlZDogMSxcblx0XHR9LCB7XG5cdFx0XHRsaWZlOiAwLjUsXG5cdFx0XHRhbHBoYTogMC4yLFxuXHRcdFx0bGVuZ3RoOiA3MCxcblx0XHRcdHNwZWVkOiAwLjYsXG5cdFx0XHRkZWxheTogMS4wLFxuXHRcdFx0Ly8gZWFzZTogRXhwby5lYXNlT3V0LFxuXHRcdFx0b25VcGRhdGU6IHVwZGF0ZUFuaW1hdGlvbi5iaW5kKHRoaXMpXG5cdFx0fSk7XG5cdFx0VHdlZW5MaXRlLnRvKG9wdGlvbnMsIDMuMCwge1xuXHRcdFx0dGhpY2tuZXNzOiA3LjAsXG5cdFx0XHRsZW5ndGg6IDMwLFxuXHRcdFx0Ly8gb25Db21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBcdG9wdGlvbnMucm91bmQgPSB0cnVlO1xuXHRcdFx0Ly8gfSxcblx0XHRcdGRlbGF5OiA0LjAsXG5cdFx0fSk7XG5cdFx0VHdlZW5MaXRlLnRvKG9wdGlvbnMsIDEuMCwge1xuXHRcdFx0bGVuZ3RoOiAxMCxcblx0XHRcdGRlbGF5OiA2LjAsXG5cdFx0fSlcblx0fVxuXG5cdGZ1bmN0aW9uIGFuaW1hdGVJbjIoKSB7XG5cdFx0dmFyIHN0YXJ0ID0gMC4wO1xuXHRcdFR3ZWVuTGl0ZS5mcm9tVG8ob3B0aW9ucywgMS4wLCB7XG5cdFx0XHR0aGlja25lc3M6IDQwLFxuXG5cdFx0fSwge1xuXHRcdFx0dGhpY2tuZXNzOiAxMCxcblx0XHRcdGVhc2U6IEV4cG8uZWFzZU91dCxcblx0XHRcdGRlbGF5OiBzdGFydCsyLjAsXG5cdFx0fSlcblx0XHRUd2VlbkxpdGUuZnJvbVRvKG9wdGlvbnMsIDMuMCwge1xuXHRcdFx0bGVuZ3RoOiAyMyxcblx0XHRcdGFscGhhOiAwLjMsXG5cdFx0XHRsaWZlOiAwLjcsXG5cdFx0XHQvLyByb3VuZDogdHJ1ZSxcblx0XHRcdHNwZWVkOiAxLFxuXHRcdH0sIHtcblx0XHRcdGxpZmU6IDAuNSxcblx0XHRcdGFscGhhOiAwLjIsXG5cdFx0XHRsZW5ndGg6IDkwLFxuXHRcdFx0c3BlZWQ6IDAuNixcblx0XHRcdGRlbGF5OiBzdGFydCsxLjAsXG5cdFx0XHQvLyBlYXNlOiBFeHBvLmVhc2VPdXQsXG5cdFx0XHRvblVwZGF0ZTogdXBkYXRlQW5pbWF0aW9uLmJpbmQodGhpcylcblx0XHR9KTtcblx0XHRUd2VlbkxpdGUudG8ob3B0aW9ucywgMy4wLCB7XG5cdFx0XHR0aGlja25lc3M6IDUuMCxcblx0XHRcdGxlbmd0aDogNDAsXG5cdFx0XHQvLyBvbkNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIFx0b3B0aW9ucy5yb3VuZCA9IHRydWU7XG5cdFx0XHQvLyB9LFxuXHRcdFx0ZGVsYXk6IHN0YXJ0KzQuMCxcblx0XHR9KTtcblx0XHRUd2VlbkxpdGUudG8ob3B0aW9ucywgMS4wLCB7XG5cdFx0XHRsZW5ndGg6IDMwLFxuXHRcdFx0ZGVsYXk6IHN0YXJ0KzYuMCxcblx0XHR9KVxuXHRcdFR3ZWVuTGl0ZS50byhvcHRpb25zLCAxLjAsIHtcblx0XHRcdHRoaWNrbmVzczogMyxcblx0XHRcdGRlbGF5OiBzdGFydCs3LjAsXG5cdFx0fSk7XG5cdFx0VHdlZW5MaXRlLnRvKG9wdGlvbnMsIDEuMCwge1xuXHRcdFx0dGhpY2tuZXNzOiAzLFxuXHRcdFx0ZGVsYXk6IHN0YXJ0KzcuMCxcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNldHVwUGFydGljbGVzKCkge1xuXHRcdHBhcnRpY2xlcy5sZW5ndGggPSAwO1xuXHRcdGZvciAodmFyIGk9MDsgaTxjb3VudDsgaSsrKSB7XG5cdFx0XHRwYXJ0aWNsZXMucHVzaChuZXcgUGFydGljbGUoKS5yZXNldCh3aWR0aCwgaGVpZ2h0KS5yYW5kb20oKSk7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gdXBkYXRlR3JhaW4oKSB7XG5cdFx0bm9pc2VPdmVybGF5LmNzcygnb3BhY2l0eScsIG9wdGlvbnMuZ3JhaW4qMC4yKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNldHVwR1VJKCkge1xuXHRcdGd1aSA9IG5ldyBkYXQuR1VJKCk7XG5cblx0XHR2YXIgbW90aW9uID0gZ3VpLmFkZEZvbGRlcignbm9pc2UnKTtcdFxuXHRcdG1vdGlvbi5hZGQob3B0aW9ucywgJ3NoaWZ0Jyk7XG5cdFx0dmFyIG5vaXNlU2NhbGUgPSBtb3Rpb24uYWRkKG9wdGlvbnMsICdzY2FsZScsIDAuMSwgNSk7XG5cblx0XHRub2lzZVNjYWxlLm9uRmluaXNoQ2hhbmdlKGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRub2lzZS5zY2FsZSA9IG9wdGlvbnMuc2NhbGU7XG5cdFx0XHRub2lzZS5nZW5lcmF0ZSgpO1xuXHRcdH0pO1xuXG5cdFx0dmFyIHN0cm9rZSA9IGd1aS5hZGRGb2xkZXIoJ3N0cm9rZScpO1xuXHRcdHN0cm9rZS5hZGQob3B0aW9ucywgJ2NvdW50JywgMSwgMTUwMCkub25GaW5pc2hDaGFuZ2UoZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdGNvdW50ID0gfn52YWx1ZTtcblx0XHRcdHNldHVwUGFydGljbGVzKCk7XG5cdFx0fSk7XG5cblx0XHRzdHJva2UuYWRkKG9wdGlvbnMsICdsZW5ndGgnLCAwLjEsIDEwMC4wKTtcblx0XHRzdHJva2UuYWRkKG9wdGlvbnMsICd0aGlja25lc3MnLCAwLjEsIDUwLjApO1xuXHRcdHN0cm9rZS5hZGQob3B0aW9ucywgJ2xpZmUnLCAwLjAsIDEuMCk7XG5cdFx0c3Ryb2tlLmFkZChvcHRpb25zLCAnc3BlZWQnLCAwLjAsIDEuMCk7XG5cdFx0c3Ryb2tlLmFkZChvcHRpb25zLCAnYWxwaGEnLCAwLjAsIDEuMCk7XG5cdFx0c3Ryb2tlLmFkZChvcHRpb25zLCAnYW5nbGUnLCAwLjAsIDIuMCk7XG5cdFx0c3Ryb2tlLmFkZChvcHRpb25zLCAncm91bmQnKTtcblx0XHRzdHJva2UuYWRkKG9wdGlvbnMsICdtb3Rpb24nKTtcblx0XHRzdHJva2Uub3BlbigpO1xuXG5cdFx0dmFyIGNvbG9yID0gZ3VpLmFkZEZvbGRlcignY29sb3InKTtcblx0XHRjb2xvci5hZGQob3B0aW9ucywgJ3VzZU9yaWdpbmFsJyk7XG5cdFx0Y29sb3IuYWRkKG9wdGlvbnMsICdkYXJrZW4nKTtcblx0XHRjb2xvci5hZGQob3B0aW9ucywgJ2h1ZScsIDAsIDM2MCk7XG5cdFx0Y29sb3IuYWRkKG9wdGlvbnMsICdzYXR1cmF0aW9uJywgMCwgMS4wKTtcblx0XHRjb2xvci5hZGQob3B0aW9ucywgJ2xpZ2h0bmVzcycsIDAsIDEuMCk7XG5cdFx0Y29sb3IuYWRkKG9wdGlvbnMsICdncmFpbicsIDAsIDEuMCkub25GaW5pc2hDaGFuZ2UodXBkYXRlR3JhaW4uYmluZCh0aGlzKSk7XG5cdFx0Y29sb3Iub3BlbigpO1xuXG5cdFx0dmFyIGNhbnZhcyA9IGd1aS5hZGRGb2xkZXIoJ2NhbnZhcycpO1xuXG5cdFx0Y2FudmFzLmFkZChvcHRpb25zLCAncGFpbnRpbmcnKTtcblx0XHRjYW52YXMuYWRkQ29sb3Iob3B0aW9ucywgJ2JhY2tncm91bmQnKTtcblx0XHRjYW52YXMuYWRkKG9wdGlvbnMsICd2aWV3T3JpZ2luYWwnKS5vbkZpbmlzaENoYW5nZShmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0b3JpZ2luYWxJbWFnZS5jc3MoJ3Zpc2liaWxpdHknLCB2YWx1ZSA/ICd2aXNpYmxlJyA6ICdoaWRkZW4nKTtcblx0XHR9KTtcblx0XHRjYW52YXMuYWRkKG9wdGlvbnMsICdhbmltYXRlJyk7XG5cdFx0Y2FudmFzLmFkZChvcHRpb25zLCAnY2xlYXInKTtcblx0XHRjYW52YXMuYWRkKG9wdGlvbnMsICdleHBvcnRJbWFnZScpO1xuXHRcdGNhbnZhcy5vcGVuKCk7XG5cblxuXG5cdH1cblxuXHRmdW5jdGlvbiBjbGVhclJlY3QoKSB7XG5cdFx0Y29udGV4dC5nbG9iYWxBbHBoYSA9IDEuMDtcblx0XHRjb250ZXh0LmZpbGxTdHlsZSA9IG9wdGlvbnMuYmFja2dyb3VuZDtcblx0XHRjb250ZXh0LmZpbGxSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuXHR9XG5cblx0ZnVuY3Rpb24gY2xlYXIoKSB7XG5cdFx0VHdlZW5MaXRlLmtpbGxUd2VlbnNPZihvcHRpb25zKTtcblx0XHRjbGVhclJlY3QoKTtcblx0XHRzZXR1cFBhcnRpY2xlcygpO1xuXHR9XG5cbiAgICBmdW5jdGlvbiBsb2FkVmlkZW8oKSB7XG4gICAgXHQvL2NvbnNvbGUubG9nKFwiVFJZSU5HXCIpO1xuICAgICAgICBpZiAobmF2aWdhdG9yLmdldFVzZXJNZWRpYSAmJiB3aW5kb3cuVVJMICYmIHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKSB7XG4gICAgICAgIFx0Ly9jb25zb2xlLmxvZyhcIkhFTExPT09PXCIpO1xuICAgICAgICAgICAgLy9jcmVhdGUgYSA8dmlkZW8+IGVsZW1lbnRcbiAgICAgICAgICAgIHZpZGVvID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInZpZGVvXCIpO1xuICAgICAgICAgICAgdmlkZW8uc2V0QXR0cmlidXRlKFwiYXV0b3BsYXlcIiwgXCJcIik7XG4gICAgICAgICAgICB2aWRlby53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgdmlkZW8uaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICAgICAgdmlkZW8uc3R5bGUuYmFja2dyb3VuZCA9IFwiYmxhY2tcIjtcbiAgICAgICAgICAgIC8vIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodmlkZW8pO1xuXG4gICAgICAgICAgICB2aWRlby5hZGRFdmVudExpc3RlbmVyKFwicGxheVwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIFx0cGxheWluZyA9IHRydWU7XG4gICAgICAgICAgICBcdGNsZWFyKCk7XG4gICAgICAgICAgICBcdGFuaW1hdGVJbigpO1xuICAgICAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiR0VUVElORyBWSURFT1wiKTtcblxuICAgICAgICAgICAgLy9kaXNhYmxlZCBmb3Igbm93LlxuICAgICAgICAgICAgLy8gbmF2aWdhdG9yLmdldFVzZXJNZWRpYSh7dmlkZW86IHRydWV9LCBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgICAgICAgIC8vICAgICB2aWRlby5zcmMgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChzdHJlYW0pO1xuICAgICAgICAgICAgLy8gICAgIGhhc1ZpZGVvID0gdHJ1ZTtcblxuICAgICAgICAgICAgLy8gfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyAgICAgLy9lcnIgaGFuZGxpbmcuLi5cbiAgICAgICAgICAgIC8vIH0pO1xuXG4gICAgICAgIH1cbiAgICB9XG4vL21vcmUgZmFpbGVkIGV4cGVyaW1lbnRzLi5cblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgZnVuY3Rpb24oZXYpIHtcblx0XHRtb3VzZS5zZXQoZXYuY2xpZW50WCwgZXYuY2xpZW50WSk7XG5cdH0pO1xuXG5cbiAgICB2YXIgc3Ryb2tlQ291bnQgPSAwO1xuXHRmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbmRlcik7XG5cblx0XHR2YXIgbm93ID0gRGF0ZS5ub3coKTtcblx0XHR2YXIgZGVsdGEgPSBub3cgLSBzdGFydFRpbWU7XG5cdFx0c3RhcnRUaW1lID0gbm93O1xuXHRcdFxuXHRcdHRpbWUrPTAuMTtcblx0XHRzdGVwKys7XG5cblxuXG5cdFx0aWYgKCFvcHRpb25zLnBhaW50aW5nIClcblx0XHRcdHJldHVybjtcblxuXHRcdHdlYmNhbVRpbWVyICs9IGRlbHRhO1xuXHRcdGlmICh3ZWJjYW1UaW1lciA+IHdlYmNhbURlbGF5ICYmIHBsYXlpbmcpIHtcblx0XHRcdC8vIGNvbnNvbGUubG9nKFwiVEVTVFwiKTtcblx0XHRcdHdlYmNhbVRpbWVyID0gMDtcblx0XHRcdGltYWdlUGl4ZWxzID0gaW1hZ2VkYXRhLmdldEltYWdlRGF0YSh2aWRlbykuZGF0YTtcblx0XHR9XG5cblx0XHQvLyBpZiAoc3RlcCAlIDEwMCA9PT0gMCkgXG5cdFx0Ly8gXHRjb25zb2xlLmxvZyhzdHJva2VDb3VudCk7XG5cblx0XHRpZiAob3B0aW9ucy5zaGlmdCAmJiBzdGVwICUgMjAgPT09IDApIHtcblx0XHRcdG5vaXNlLm9mZnNldCs9LjAxO1xuXHRcdFx0bm9pc2UuZ2VuZXJhdGUoKTtcblx0XHR9XG5cblx0XHQvLyBjb250ZXh0Lmdsb2JhbEFscGhhID0gMC4xO1xuXHRcdC8vIGNvbnRleHQuZmlsbFN0eWxlID0gJ3doaXRlJztcblx0XHQvLyBjb250ZXh0LmZpbGxSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuXG5cdFx0Ly8gY29udGV4dC5jbGVhclJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodCk7XG5cdFx0dmFyIGltYWdlV2lkdGggPSBpbWFnZS53aWR0aDtcblxuXHRcdC8vIGZvciAodmFyIHk9MDsgeTxoZWlnaHQ7IHkrKykge1xuXHRcdC8vIFx0Zm9yICh2YXIgeD0wOyB4PHdpZHRoOyB4KyspIHtcblx0XHQvLyBcdFx0dmFyIHNhbXBsZVdpZHRoID0gd2lkdGgsXG5cdFx0Ly8gXHRcdFx0c2FtcGxlSGVpZ2h0ID0gd2lkdGg7XG5cblx0XHQvLyBcdFx0dmFyIHB4SW5kZXggPSAoeCArICh5ICogaW1hZ2VXaWR0aCkpKjQ7XG5cdFx0Ly8gXHRcdHZhciByZWQgPSBpbWFnZVBpeGVsc1sgcHhJbmRleCBdLFxuXHRcdC8vIFx0XHRcdGdyZWVuID0gaW1hZ2VQaXhlbHNbIHB4SW5kZXggKyAxXSxcblx0XHQvLyBcdFx0XHRibHVlID0gaW1hZ2VQaXhlbHNbcHhJbmRleCArIDJdO1xuXHRcdC8vIFx0XHRjb250ZXh0LmZpbGxTdHlsZSA9ICdyZ2IoJytyZWQrJywgJytncmVlbisnLCAnK2JsdWUrJyknO1xuXG5cdFx0Ly8gXHRcdC8vIHZhciBuID0gbm9pc2Uuc2FtcGxlKHgqKG5vaXNlU2l6ZS9zYW1wbGVXaWR0aCksIHkqKG5vaXNlU2l6ZS9zYW1wbGVIZWlnaHQpKTtcblx0XHQvLyBcdFx0Ly8gY29udGV4dC5maWxsU3R5bGUgPSAnaHNsKDAsIDAlLCAnKygobi8yKzAuNSkqMTAwKSsnJSknO1xuXHRcdC8vIFx0XHRjb250ZXh0LmZpbGxSZWN0KHgsIHksIDEsIDEpO1xuXHRcdC8vIFx0fVxuXHRcdC8vIH1cblx0XHRcblxuXHRcdGZvciAodmFyIGk9MDsgaTxwYXJ0aWNsZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBwID0gcGFydGljbGVzW2ldO1xuXG5cdFx0XHRpZiAocC5tb3Rpb24pXG5cdFx0XHRcdHAucG9zaXRpb24uYWRkKHAudmVsb2NpdHkpO1xuXG5cdFx0XHQvL2FkZCBpbiBvdXIgbW90aW9uXG5cdFx0XHR2YXIgcHggPSB+fnAucG9zaXRpb24ueCxcblx0XHRcdFx0cHkgPSB+fnAucG9zaXRpb24ueTtcblxuXHRcdFx0dmFyIHNhbXBsZVdpZHRoID0gd2lkdGgsXG5cdFx0XHRcdHNhbXBsZUhlaWdodCA9IHdpZHRoO1xuXG5cdFx0XHR2YXIgbiA9IG5vaXNlLnNhbXBsZShweCoobm9pc2VTaXplL3NhbXBsZVdpZHRoKSwgcHkqKG5vaXNlU2l6ZS9zYW1wbGVIZWlnaHQpKTtcblxuXHRcdFx0dmFyIGFuZ2xlID0gbiAqIE1hdGguUEkgKiAyICogb3B0aW9ucy5hbmdsZTtcblx0XHRcdFxuXHRcdFx0dG1wLnNldCggTWF0aC5jb3MoYW5nbGUpLCBNYXRoLnNpbihhbmdsZSkgKTtcblx0XHRcdHAudmVsb2NpdHkuYWRkKHRtcCk7XG5cdFx0XHRwLnZlbG9jaXR5Lm5vcm1hbGl6ZSgpO1xuXG5cdFx0XHQvLyBpZiAocC5wb3NpdGlvbi54ID4gd2lkdGggfHwgcC5wb3NpdGlvbi54IDwgMCB8fCBwLnBvc2l0aW9uLnkgPiBoZWlnaHQgfHwgcC5wb3NpdGlvbi55IDwgMCApIHtcblx0XHRcdC8vIFx0cC5yZXNldCgpO1xuXHRcdFx0Ly8gfVxuXG5cdFx0XHRpZiAoLypwLnBvc2l0aW9uLnggPCAwIHx8ICovcC5wb3NpdGlvbi54ID4gd2lkdGggfHwgcC5wb3NpdGlvbi55ID4gaGVpZ2h0IHx8IHAucG9zaXRpb24ueSA8IDApIHtcblx0XHRcdFx0cC5yZXNldCgpO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgcm90ID0gKG4vMiswLjUpO1xuXHRcdFx0dmFyIGh1ZSA9IChub2lzZS5vZmZzZXQgJSA1MCkvNTAgKiByb3Q7XG5cblx0XHRcdHZhciBpbWdYID0gcHgsXG5cdFx0XHRcdGltZ1kgPSBweTtcblx0XHRcdC8vIHZhciBpbWdYID1weC0obW91c2UueCksXG5cdFx0XHQvLyBcdGltZ1kgPSBweS0obW91c2UueSk7XG5cdFx0XHR2YXIgcHhJbmRleCA9IChpbWdYICsgKGltZ1kgKiBpbWFnZVdpZHRoKSkqNDtcblx0XHRcdHZhciByZWQgPSBpbWFnZVBpeGVsc1sgcHhJbmRleCBdLFxuXHRcdFx0XHRncmVlbiA9IGltYWdlUGl4ZWxzWyBweEluZGV4ICsgMV0sXG5cdFx0XHRcdGJsdWUgPSBpbWFnZVBpeGVsc1tweEluZGV4ICsgMl07XG5cblx0XHRcdC8vIHZhciBhbHBoYSA9IE1hdGguc2luKHRpbWUqMC4xKSoxMDArMTAwO1xuXHRcdFx0dmFyIGFscGhhID0gb3B0aW9ucy5odWU7XG5cblx0XHRcdC8vIENJRSBsdW1pbmFuY2UgZm9yIHRoZSBSR0Jcblx0XHRcdHZhciB2YWwgPSAwLjIxMjYgKiAocmVkLzI1NSkgKyAwLjcxNTIgKiAoZ3JlZW4vMjU1KSArIDAuMDcyMiAqIChibHVlLzI1NSk7XG5cdFx0XHRcblxuXHRcdFx0dmFyIGJyaWdodG5lc3MgPSBvcHRpb25zLmRhcmtlbiA/IHZhbCA6IDEuMDtcblx0XHRcdFxuXHRcdFx0Ly8gY29udGV4dC5zdHJva2VTdHlsZSA9ICdoc2woJytsZXJwKGFscGhhLCBhbHBoYS0xMDAsIHJvdCkrJywgJysoMS1yZWQvMjU1KSpsZXJwKDAuNywgMSwgcm90KSoxMDArJyUsICcrbGVycCgwLjQ1LCAwLjU1LCByb3QpKjEwMCsnJSknO1xuXHRcdFx0aWYgKG9wdGlvbnMudXNlT3JpZ2luYWwpXG5cdFx0XHRcdGNvbnRleHQuc3Ryb2tlU3R5bGUgPSAncmdiKCcrfn4ocmVkKmJyaWdodG5lc3MpKycsICcrfn4oZ3JlZW4qYnJpZ2h0bmVzcykrJywgJyt+fihibHVlKmJyaWdodG5lc3MpKycpJztcblx0XHRcdGVsc2Vcblx0XHRcdFx0Y29udGV4dC5zdHJva2VTdHlsZSA9ICdoc2woJytsZXJwKGFscGhhLCBhbHBoYS0xMDAsIHJvdCkrJywgJysoMS12YWwpKmxlcnAoMC4yLCAwLjksIHJvdCkqb3B0aW9ucy5zYXR1cmF0aW9uKjEwMCsnJSwgJysodmFsKSpsZXJwKDAuNDUsIDEsIHJvdCkqYnJpZ2h0bmVzcypvcHRpb25zLmxpZ2h0bmVzcyoxMDArJyUpJztcblxuXHRcdFx0dmFyIHMgPSAyO1xuXG5cdFx0XHQvLyBjb250ZXh0LmZpbGxTdHlsZSA9ICdibGFjayc7XG5cdFx0XHQvLyBjb250ZXh0LmZpbGxSZWN0KHAucG9zaXRpb24ueCwgcC5wb3NpdGlvbi55LCAxLCAxKTtcblxuXHRcdCBcdGNvbnRleHQuYmVnaW5QYXRoKCk7XG5cdFx0XHRjb250ZXh0Lm1vdmVUbyhwLnBvc2l0aW9uLngsIHAucG9zaXRpb24ueSk7XG5cdFx0XHR2YXIgbGluZVNpemUgPSAob3B0aW9ucy5sZW5ndGgqKG4vMiswLjUpKnAuc2l6ZSk7XG5cdFx0XHR0bXAuY29weShwLnBvc2l0aW9uKTtcblx0XHRcdHRtcDIuY29weShwLnZlbG9jaXR5KS5zY2FsZShsaW5lU2l6ZSk7XG5cdFx0XHR0bXAuYWRkKHRtcDIpO1xuXHRcdFx0Y29udGV4dC5saW5lVG8odG1wLngsIHRtcC55KTtcblx0XHRcdGNvbnRleHQuc3Ryb2tlKCk7XG5cdFx0XHRjb250ZXh0Lmdsb2JhbEFscGhhID0gb3B0aW9ucy5hbHBoYTtcblx0XHRcdGNvbnRleHQubGluZVdpZHRoID0gb3B0aW9ucy50aGlja25lc3MqKG4vMiswLjUpO1xuXHRcdFx0Y29udGV4dC5saW5lQ2FwID0gb3B0aW9ucy5yb3VuZCA/ICdyb3VuZCcgOiAnc3F1YXJlJztcblxuXHRcdFx0cC5zaXplICs9IDAuMSAqIG9wdGlvbnMuc3BlZWQgKiBwLnNwZWVkO1xuXHRcdFx0aWYgKHAuc2l6ZSA+PSBvcHRpb25zLmxpZmUpIHtcblx0XHRcdFx0cC5yZXNldCh3aWR0aCwgaGVpZ2h0KS5yYW5kb20oKTtcdFxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0fVxuXG5cdFx0Ly8gc3Ryb2tlQ291bnQgKz0gcGFydGljbGVzLmxlbmd0aDtcblxuXG5cdFx0cHJldmlld0NvbnRleHQuZHJhd0ltYWdlKGNhbnZhcywgMCwgMCwgcHJldmlld1dpZHRoLCBwcmV2aWV3SGVpZ2h0KTtcblx0fVxufSk7IiwidmFyIFZlY3RvcjIgPSByZXF1aXJlKCd2ZWNtYXRoJykuVmVjdG9yMjtcblxuZnVuY3Rpb24gUGFydGljbGUoeCwgeSwgdngsIHZ5KSB7XG5cdHRoaXMucG9zaXRpb24gPSBuZXcgVmVjdG9yMih4LCB5KTtcblx0dGhpcy52ZWxvY2l0eSA9IG5ldyBWZWN0b3IyKHZ4LCB2eSk7XG5cdHRoaXMuc2l6ZSA9IDA7XG5cdHRoaXMuc3BlZWQgPSBNYXRoLnJhbmRvbSgpO1xuXHR0aGlzLmJyaWdodG5lc3MgPSBNYXRoLnJhbmRvbSgpO1xufVxuXG5cblBhcnRpY2xlLnByb3RvdHlwZS5yYW5kb20gPSBmdW5jdGlvbigpIHtcblx0Ly8gdGhpcy52ZWxvY2l0eS5zZXQoTWF0aC5yYW5kb20oKSoyLTEsIE1hdGgucmFuZG9tKCkqMi0xKTtcblx0dGhpcy5zaXplID0gTWF0aC5yYW5kb20oKTtcblx0cmV0dXJuIHRoaXM7XG59XG5QYXJ0aWNsZS5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbih3aWR0aCwgaGVpZ2h0KSB7XG5cdHdpZHRoPXdpZHRofHwwO1xuXHRoZWlnaHQ9aGVpZ2h0fHwwO1xuXG5cdHRoaXMuc2l6ZSA9IDA7XG5cdHRoaXMuYnJpZ2h0bmVzcyA9IE1hdGgucmFuZG9tKCk7XG5cblx0Ly8gdGhpcy52ZWxvY2l0eS5zZXQoTWF0aC5yYW5kb20oKSoyLTEsIE1hdGgucmFuZG9tKCkqMi0xKTtcblx0dGhpcy52ZWxvY2l0eS5zZXQoMCwgMCk7XG5cdHRoaXMucG9zaXRpb24uc2V0KE1hdGgucmFuZG9tKCkqd2lkdGgsIE1hdGgucmFuZG9tKCkqaGVpZ2h0KTtcblx0cmV0dXJuIHRoaXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUGFydGljbGU7IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdFBhcnRpY2xlOiByZXF1aXJlKCcuL1BhcnRpY2xlJylcbn07IiwidmFyIENsYXNzID0gcmVxdWlyZSgna2xhc3NlJyk7XG52YXIgU2ltcGxleE5vaXNlID0gcmVxdWlyZSgnc2ltcGxleC1ub2lzZScpO1xudmFyIGxlcnAgPSByZXF1aXJlKCdpbnRlcnBvbGF0aW9uJykubGVycDtcbnZhciBzYW1wbGluZyA9IHJlcXVpcmUoJy4vc2FtcGxpbmcnKTtcblxudmFyIFBSTkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZWVkID0gMTtcbiAgICB0aGlzLnJhbmRvbSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gKHRoaXMuZ2VuKCkgLyAyMTQ3NDgzNjQ3KTsgfTtcbiAgICB0aGlzLmdlbiA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zZWVkID0gKHRoaXMuc2VlZCAqIDE2ODA3KSAlIDIxNDc0ODM2NDc7IH07XG59O1xuXG52YXIgcmFuZCA9IHVuZGVmaW5lZDtcblxuLy93ZSBjYW4gdXNlIGEgZGV0ZXJtaW5pc3RpYyByYW5kb20gZ2VuZXJhdG9yIGlmIHdlIHdhbnQuLi5cbi8vcmFuZCA9IG5ldyBQUk5HKCk7XG5cbnZhciBzaW1wbGV4ID0gbmV3IFNpbXBsZXhOb2lzZShyYW5kKTtcblxudmFyIE5vaXNlTWFwID0gbmV3IENsYXNzKHtcblxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKHNpemUpIHtcbiAgICAgICAgaWYgKCFzaXplKVxuICAgICAgICAgICAgdGhyb3cgXCJubyBzaXplIHNwZWNpZmllZCB0byBOb2lzZU1hcFwiO1xuXG4gICAgICAgIHRoaXMuc2l6ZSA9IHNpemU7ICAgXG4gICAgICAgIHRoaXMuc2NhbGUgPSAyMDtcbiAgICAgICAgdGhpcy5vZmZzZXQgPSAwO1xuICAgICAgICB0aGlzLnNtb290aCA9IHRydWU7XG4gICAgICAgIHRoaXMuc2VhbWxlc3MgPSBmYWxzZTtcblxuICAgICAgICB0aGlzLmRhdGEgPSBuZXcgRmxvYXQzMkFycmF5KHRoaXMuc2l6ZSAqIHRoaXMuc2l6ZSk7XG4gICAgfSxcbiAgICBcbiAgICBzZWFtbGVzc05vaXNlOiBmdW5jdGlvbihzLCB0LCBzY2FsZSwgY3gsIGN5LCBjeiwgY3cpIHtcbiAgICAgICAgLy8gR2VuZXJhdGUgdGhlIDRkIGNvb3JkaW5hdGVzIHRoYXQgd3JhcCBhcm91bmQgc2VhbWxlc3NseVxuICAgICAgICB2YXIgciA9IHNjYWxlIC8gKDIgKiBNYXRoLlBJKTtcbiAgICAgICAgdmFyIGF4eSA9IDIgKiBNYXRoLlBJICogcyAvIHNjYWxlOyAgICAgICAgXG4gICAgICAgIHZhciB4ID0gciAqIE1hdGguY29zKGF4eSk7XG4gICAgICAgIHZhciB5ID0gciAqIE1hdGguc2luKGF4eSk7XG4gICAgICAgIFxuICAgICAgICB2YXIgYXp3ID0gMiAqIE1hdGguUEkgKiB0IC8gc2NhbGU7ICAgICAgICBcbiAgICAgICAgdmFyIHogPSByICogTWF0aC5jb3MoYXp3KTtcbiAgICAgICAgdmFyIHcgPSByICogTWF0aC5zaW4oYXp3KTtcblxuICAgICAgICByZXR1cm4gc2ltcGxleC5ub2lzZTREKGN4ICsgeCwgY3kgKyB5LCBjeiArIHosIGN3ICsgdyk7XG4gICAgfSxcblxuICAgIGdlbmVyYXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG5vaXNlTWFwID0gdGhpcy5kYXRhLFxuICAgICAgICAgICAgbm9pc2VTaXplID0gdGhpcy5zaXplLFxuICAgICAgICAgICAgbm9pc2VPZmYgPSB0aGlzLm9mZnNldCxcbiAgICAgICAgICAgIHNlYW1sZXNzID0gdGhpcy5zZWFtbGVzcyxcbiAgICAgICAgICAgIHpvb20gPSB0aGlzLnNjYWxlO1xuXG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxub2lzZU1hcC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHggPSBpICUgbm9pc2VTaXplLFxuICAgICAgICAgICAgICAgIHkgPSB+figgaSAvIG5vaXNlU2l6ZSApO1xuXG4gICAgICAgICAgICBpZiAoc2VhbWxlc3MpXG4gICAgICAgICAgICAgICAgbm9pc2VNYXBbaV0gPSB0aGlzLnNlYW1sZXNzTm9pc2UoeC9ub2lzZVNpemUqem9vbSArIG5vaXNlT2ZmLCB5L25vaXNlU2l6ZSp6b29tICsgbm9pc2VPZmYsIHpvb20sIDAsIDAsIDAsIDApO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIG5vaXNlTWFwW2ldID0gc2ltcGxleC5ub2lzZTNEKHgvbm9pc2VTaXplICogem9vbSwgeS9ub2lzZVNpemUgKiB6b29tLCBub2lzZU9mZik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgc2FtcGxlOiBmdW5jdGlvbih4LCB5KSB7XG4gICAgICAgIGlmICh0aGlzLnNtb290aClcbiAgICAgICAgICAgIHJldHVybiBzYW1wbGluZy5iaWxpbmVhcih0aGlzLmRhdGEsIHRoaXMuc2l6ZSwgeCwgeSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBzYW1wbGluZy5uZWFyZXN0KHRoaXMuZGF0YSwgdGhpcy5zaXplLCB4LCB5KTtcbiAgICB9LFxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBOb2lzZU1hcDsiLCJ2YXIgY2FudmFzLCBjb250ZXh0O1xuXG5tb2R1bGUuZXhwb3J0cy5nZXRJbWFnZURhdGEgPSBmdW5jdGlvbihpbWFnZSwgd2lkdGgsIGhlaWdodCkge1xuXHRpZiAoIWNhbnZhcykge1xuXHRcdGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XG5cdFx0Y29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG5cdH1cblxuXHR3aWR0aCA9ICh3aWR0aHx8d2lkdGg9PT0wKSA/IHdpZHRoIDogaW1hZ2Uud2lkdGg7XG5cdGhlaWdodCA9IChoZWlnaHR8fGhlaWdodD09PTApID8gaGVpZ2h0IDogaW1hZ2UuaGVpZ2h0O1xuXG5cdGNhbnZhcy53aWR0aCA9IHdpZHRoO1xuXHRjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXHRcblx0Y29udGV4dC5nbG9iYWxBbHBoYSA9IDE7XG5cdGNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuXHRjb250ZXh0LmRyYXdJbWFnZShpbWFnZSwgMCwgMCwgd2lkdGgsIGhlaWdodCk7XG5cblx0dmFyIGltZ0RhdGEgPSBjb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcblx0cmV0dXJuIGltZ0RhdGE7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5yZWxlYXNlID0gZnVuY3Rpb24oKSB7XG5cdGlmIChjYW52YXMpIHtcblx0XHRjYW52YXMgPSBudWxsO1xuXHRcdGNvbnRleHQgPSBudWxsO1xuXHR9XHRcbn07XG4iLCJ2YXIgbGVycCA9IHJlcXVpcmUoJ2ludGVycG9sYXRpb24nKS5sZXJwO1xudmFyIHNtb290aHN0ZXAgPSByZXF1aXJlKCdpbnRlcnBvbGF0aW9uJykuc21vb3Roc3RlcDtcblxubW9kdWxlLmV4cG9ydHMubmVhcmVzdCA9IGZ1bmN0aW9uKGRhdGEsIHNpemUsIHgsIHkpIHtcbiAgICB2YXIgcHggPSB+fnggJSBzaXplLFxuICAgICAgICBweSA9IH5+eSAlIHNpemU7XG4gICAgcmV0dXJuIGRhdGFbIHB4ICsgKHB5ICogc2l6ZSkgXTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLmJpbGluZWFyID0gZnVuY3Rpb24oZGF0YSwgc2l6ZSwgeCwgeSkge1xuICAgIC8vYmlsaW5lYXIgaW50ZXJwb2xhdGlvbiBcbiAgICAvL2h0dHA6Ly93d3cuc2NyYXRjaGFwaXhlbC5jb20vbGVzc29ucy8zZC1hZHZhbmNlZC1sZXNzb25zL25vaXNlLXBhcnQtMS9jcmVhdGluZy1hLXNpbXBsZS0yZC1ub2lzZS9cbiAgICB2YXIgeGkgPSBNYXRoLmZsb29yKCB4ICk7XG4gICAgdmFyIHlpID0gTWF0aC5mbG9vciggeSApO1xuIFxuICAgIHZhciB0eCA9IHggLSB4aTtcbiAgICB2YXIgdHkgPSB5IC0geWk7XG5cbiAgICB2YXIgbWFzayA9IHNpemUtMTtcbiBcbiAgICB2YXIgcngwID0geGkgJiBtYXNrO1xuICAgIHZhciByeDEgPSAoIHJ4MCArIDEgKSAmIG1hc2s7XG4gICAgdmFyIHJ5MCA9IHlpICYgbWFzaztcbiAgICB2YXIgcnkxID0gKCByeTAgKyAxICkgJiBtYXNrO1xuIFxuICAgIC8vLyByYW5kb20gdmFsdWVzIGF0IHRoZSBjb3JuZXJzIG9mIHRoZSBjZWxsIHVzaW5nIHBlcm11dGF0aW9uIHRhYmxlXG4gICAgdmFyIGMwMCA9IGRhdGFbIChyeTAgKiBzaXplICsgcngwKSBdO1xuICAgIHZhciBjMTAgPSBkYXRhWyAocnkwICogc2l6ZSArIHJ4MSkgXTtcbiAgICB2YXIgYzAxID0gZGF0YVsgKHJ5MSAqIHNpemUgKyByeDApIF07XG4gICAgdmFyIGMxMSA9IGRhdGFbIChyeTEgKiBzaXplICsgcngxKSBdO1xuXG4gICAgLy8vIHJlbWFwcGluZyBvZiB0eCBhbmQgdHkgdXNpbmcgdGhlIFNtb290aHN0ZXAgZnVuY3Rpb25cbiAgICB2YXIgc3ggPSBzbW9vdGhzdGVwKCAwLCAxLCB0eCApO1xuICAgIHZhciBzeSA9IHNtb290aHN0ZXAoIDAsIDEsIHR5ICk7XG4gXG4gICAgLy8vIGxpbmVhcmx5IGludGVycG9sYXRlIHZhbHVlcyBhbG9uZyB0aGUgeCBheGlzXG4gICAgdmFyIG54MCA9IGxlcnAoIGMwMCwgYzEwLCBzeCApO1xuICAgIHZhciBueDEgPSBsZXJwKCBjMDEsIGMxMSwgc3ggKTtcbiAgICBcbiAgICAvLy8gbGluZWFybHkgaW50ZXJwb2xhdGUgdGhlIG54MC9ueDEgYWxvbmcgdGhleSB5IGF4aXNcbiAgICB2YXIgdiA9IGxlcnAoIG54MCwgbngxLCBzeSApO1xuICAgIHJldHVybiB2O1xufTsgIl19
