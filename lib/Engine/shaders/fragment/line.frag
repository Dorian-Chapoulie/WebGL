#version 300 es
precision highp float;

uniform vec4 lineColor;

out vec4 FragColor;

void main() {
    FragColor = lineColor;
}
