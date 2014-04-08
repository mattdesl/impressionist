var Class = require('klasse');
var MeshRenderer = require('kami-mesh');

var MeshRenderer = require('kami-mesh').MeshRenderer;
var ShaderProgram = require('kami').ShaderProgram;

var Matrix4 = require('vecmath').Matrix4;

var Vector3 = require('vecmath').Vector3;
var Matrix3 = require('vecmath').Matrix3;


var fs = require('fs');
var defaultVert = fs.readFileSync(__dirname + '/shaders/line.vert', 'utf8');
var defaultFrag = fs.readFileSync(__dirname + '/shaders/line.frag', 'utf8');



var LineRenderer = new Class({

	initialize: function(context, maxVerts, vert, frag) {
		this.context = context;
		maxVerts = maxVerts||500;

        this.meshRenderer = new MeshRenderer(context, {
            hasColors: true,
            maxVertices: maxVerts * 4 * 2, //4 floats per vertex, xyz and COLOR
            hasNormals: false
        });

        this.maxVerts = maxVerts * 4 * 2;


        this.meshRenderer.shader = new ShaderProgram(context, vert||defaultVert, frag||defaultFrag);
        if (this.meshRenderer.shader.log)
        	console.warn(this.meshRenderer.shader.log);

        this.lastPosition = new Vector3();
        this.moving = true;
	},

	begin: function(projView) {
		var gl = this.context.gl;

		this.meshRenderer.begin(projView, gl.LINES);
		this.moving = true;
		// this.lineTo(0, 0);
	},


	
	line: function(x1, y1, x2, y2) {
		if (this.meshRenderer.vertexIdx === this.meshRenderer.mesh.vertices.length)
			this.meshRenderer.flush();

		this.meshRenderer.color(1, 1, 1, 1);
		this.meshRenderer.vertex(x1, y1, 0);

		this.meshRenderer.color(1, 1, 1, 1);
		this.meshRenderer.vertex(x2, y2, 0);
	},

	end: function() {
		this.meshRenderer.end();
	}
});

module.exports = LineRenderer;



//Using mixins more heavily. Can be applied to a renderer or a generic class like Shape2D
var g = new Primitive();

//optimize the renderable
g.static = true; //geometry is static
g.simpleLines = true; //whether to use simple line rendering
g.simplePolygons = true;    //whether to use simple geometry (i.e. convex polys)

g.color = "rgb("
g.lineTo(50, 50);

