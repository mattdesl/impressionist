attribute vec4 Position;
attribute vec4 Color;

uniform mat4 u_projModelView;

varying vec4 v_col;

void main() {
	gl_Position = u_projModelView * vec4(Position.xy, 0.0, 1.0);

	v_col = Color;
}