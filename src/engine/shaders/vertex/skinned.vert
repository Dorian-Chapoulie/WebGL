#version 300 es

in vec3 aPos;
in vec3 aNormal;
in vec2 aTexCoords;
in vec4 aJoints;   // Indices des joints (bones)
in vec4 aWeights;  // Poids d'influence de chaque joint

out vec3 FragPos;
out vec3 Normal;
out vec2 TexCoords;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

// Matrices des joints (maximum 250 joints)
uniform mat4 uJointMatrices[250];
uniform bool uHasSkin;

void main()
{
    vec4 totalPosition = vec4(0.0);
    vec3 totalNormal = vec3(0.0);

    if (uHasSkin) {
        // Appliquer le skinning (transformation par les bones)
        for(int i = 0; i < 4; i++) {
            int jointIndex = int(aJoints[i]);
            float weight = aWeights[i];

            if (weight > 0.0) {
                mat4 jointMatrix = uJointMatrices[jointIndex];
                totalPosition += jointMatrix * vec4(aPos, 1.0) * weight;
                totalNormal += mat3(jointMatrix) * aNormal * weight;
            }
        }

        // Normaliser la normale
        totalNormal = normalize(totalNormal);
    } else {
        // Pas de skinning, utiliser la position et normale d'origine
        totalPosition = vec4(aPos, 1.0);
        totalNormal = aNormal;
    }

    // Calculer la position du fragment dans l'espace monde
    FragPos = vec3(modelMatrix * totalPosition);

    // Calculer la normale transformée
    Normal = mat3(transpose(inverse(modelMatrix))) * totalNormal;

    // Passer les coordonnées de texture
    TexCoords = aTexCoords;

    // Calculer la position finale du vertex
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * totalPosition;
}
