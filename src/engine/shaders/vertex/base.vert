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
    // Calculer la position du fragment dans l'espace monde
    FragPos = vec3(modelMatrix * vec4(aPos, 1.0));
    
    // Calculer la normale transformée
    Normal = mat3(transpose(inverse(modelMatrix))) * aNormal;  
    
    // Passer les coordonnées de texture
    TexCoords = aTexCoords;
    
    // Calculer la position finale du vertex
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(aPos, 1.0);
}

/*#version 300 es

in vec3 aPos;
in vec2 aTexCoord;

out vec2 TexCoord;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

void main()
{
	gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(aPos, 1.0);
	TexCoord = vec2(aTexCoord.x, aTexCoord.y);
}*/