#version 300 es

in vec3 aPos;
in vec3 aNormal;
in vec2 aTexCoords;

out vec3 FragPos;
out vec3 Normal;
out vec2 TexCoords;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

void main()
{
    FragPos = vec3(modelMatrix * vec4(aPos, 1.0));
    Normal = mat3(transpose(inverse(modelMatrix))) * aNormal;  
    TexCoords = aTexCoords;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(aPos, 1.0);
}