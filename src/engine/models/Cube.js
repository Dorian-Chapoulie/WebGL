/*import { mat4 } from "gl-matrix";
import diffuse from "../../assets/diffuse.png";
import specular from "../../assets/specular.png";

export class Cube {
    constructor(gl, programInfo) {
        this.VBO;
        this.EBO;
        this.VAO;

        this.modelViewMatrix = mat4.create();
        this.texturesLoaded = false;
        this.diffuseMap = null;
        this.specularMap = null;

        this.initBuffers(gl, programInfo);
    }

    initBuffers(gl, programInfo) {

        const vertices = [
            // positions          // normals           // texture coords
            // Front face
        -0.5, -0.5,  0.5,  0.0,  0.0,  1.0,  0.0,  0.0,
         0.5, -0.5,  0.5,  0.0,  0.0,  1.0,  1.0,  0.0,
         0.5,  0.5,  0.5,  0.0,  0.0,  1.0,  1.0,  1.0,
        -0.5,  0.5,  0.5,  0.0,  0.0,  1.0,  0.0,  1.0,
        
        // Back face
        -0.5, -0.5, -0.5,  0.0,  0.0, -1.0,  1.0,  0.0,
         0.5, -0.5, -0.5,  0.0,  0.0, -1.0,  0.0,  0.0,
         0.5,  0.5, -0.5,  0.0,  0.0, -1.0,  0.0,  1.0,
        -0.5,  0.5, -0.5,  0.0,  0.0, -1.0,  1.0,  1.0,
        
        // Left face
        -0.5, -0.5, -0.5, -1.0,  0.0,  0.0,  0.0,  0.0,
        -0.5, -0.5,  0.5, -1.0,  0.0,  0.0,  1.0,  0.0,
        -0.5,  0.5,  0.5, -1.0,  0.0,  0.0,  1.0,  1.0,
        -0.5,  0.5, -0.5, -1.0,  0.0,  0.0,  0.0,  1.0,
        
        // Right face
         0.5, -0.5, -0.5,  1.0,  0.0,  0.0,  1.0,  0.0,
         0.5, -0.5,  0.5,  1.0,  0.0,  0.0,  0.0,  0.0,
         0.5,  0.5,  0.5,  1.0,  0.0,  0.0,  0.0,  1.0,
         0.5,  0.5, -0.5,  1.0,  0.0,  0.0,  1.0,  1.0,
        
        // Top face
        -0.5,  0.5, -0.5,  0.0,  1.0,  0.0,  0.0,  1.0,
         0.5,  0.5, -0.5,  0.0,  1.0,  0.0,  1.0,  1.0,
         0.5,  0.5,  0.5,  0.0,  1.0,  0.0,  1.0,  0.0,
        -0.5,  0.5,  0.5,  0.0,  1.0,  0.0,  0.0,  0.0,
        
        // Bottom face
        -0.5, -0.5, -0.5,  0.0, -1.0,  0.0,  0.0,  0.0,
         0.5, -0.5, -0.5,  0.0, -1.0,  0.0,  1.0,  0.0,
         0.5, -0.5,  0.5,  0.0, -1.0,  0.0,  1.0,  1.0,
        -0.5, -0.5,  0.5,  0.0, -1.0,  0.0,  0.0,  1.0
        ];
        
        const indices = [
            // Front face
            0,  1,  2,    0,  2,  3,
            // Back face
            4,  5,  6,    4,  6,  7,
            // Left face
            8,  9, 10,    8, 10, 11,
            // Right face
            12, 13, 14,   12, 14, 15,
            // Top face
            16, 17, 18,   16, 18, 19,
            // Bottom face
            20, 21, 22,   20, 22, 23
        ];

    
        this.VAO = gl.createVertexArray();
        this.VBO = gl.createBuffer();
        this.EBO = gl.createBuffer();
        gl.bindVertexArray(this.VAO);


        gl.bindBuffer(gl.ARRAY_BUFFER, this.VBO);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.EBO);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW); 

        const sizeOfFloat = 4;
        const stride = (3 + 3 +  2) * sizeOfFloat; //pos, normal, texCoord

        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, stride, 0); //3 = x,y,z

        gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, stride, 3 * sizeOfFloat); //3 = x,y,z

        // Load textures (équivalent de loadTexture)
        this.loadTextures(gl);

        gl.enableVertexAttribArray(programInfo.attribLocations.vertexTexCoord);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexTexCoord, 2, gl.FLOAT, false, stride, 6 * sizeOfFloat); //2 = x,y (offset après pos + normal)

        // Shader configuration (équivalent de lightingShader.setInt)
        gl.useProgram(programInfo.program);
        gl.uniform1i(gl.getUniformLocation(programInfo.program, 'material.diffuse'), 0);
        gl.uniform1i(gl.getUniformLocation(programInfo.program, 'material.specular'), 1);
    }

    // Charger les textures de manière asynchrone
    loadTextures(gl) {
        let loadedCount = 0;
        const totalTextures = 2;

        const onTextureLoaded = () => {
            loadedCount++;
            if (loadedCount === totalTextures) {
                this.texturesLoaded = true;
            }
        };

        // Diffuse texture
        this.diffuseMap = gl.createTexture();
        const diffuseImage = new Image();
        diffuseImage.addEventListener('load', () => {
            gl.bindTexture(gl.TEXTURE_2D, this.diffuseMap);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, diffuseImage);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);
            onTextureLoaded();
        });
        diffuseImage.addEventListener('error', (e) => {
            console.error("Failed to load diffuse texture:", e);
            onTextureLoaded();
        });
        diffuseImage.src = diffuse;

        // Specular texture
        this.specularMap = gl.createTexture();
        const specularImage = new Image();
        specularImage.addEventListener('load', () => {
            gl.bindTexture(gl.TEXTURE_2D, this.specularMap);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, specularImage);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);
            onTextureLoaded();
        });
        specularImage.addEventListener('error', (e) => {
            console.error("Failed to load specular texture:", e);
            onTextureLoaded();
        });
        specularImage.src = specular;
    }


    draw(gl, programInfo, viewMatrix, projectionMatrix, position = [0, 0, 0]) {
        // S'assurer que le bon programme shader est actif
        gl.useProgram(programInfo.program);
        
        // Bind VAO (équivalent de glBindVertexArray)
        gl.bindVertexArray(this.VAO);

        // Bind textures to texture units seulement si elles sont chargées
        if (this.texturesLoaded && this.diffuseMap && this.specularMap) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.diffuseMap);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.specularMap);
        }

        // Set matrices - comme dans le code C++
        mat4.identity(this.modelViewMatrix);
        
        // Translation vers la position spécifiée
        mat4.translate(this.modelViewMatrix, this.modelViewMatrix, position);
        
        // Rotation comme dans le code C++ (angle = 20.0f * i)
        const cubeIndex = this.cubeIndex || 0;
        const angle = 20.0 * cubeIndex;
        const angleRad = angle * Math.PI / 180;
        mat4.rotate(this.modelViewMatrix, this.modelViewMatrix, angleRad, [1.0, 0.3, 0.5]);

        gl.uniformMatrix4fv(programInfo.uniformLocations.modelMatrix, false, this.modelViewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.viewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);

        // Draw (équivalent de glDrawElements)
        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_INT, 0);
    }

    // Méthode pour définir l'index du cube (pour la rotation)
    setCubeIndex(index) {
        this.cubeIndex = index;
    }
       

}*/
