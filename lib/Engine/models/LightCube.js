import { mat4 } from "gl-matrix";

export class LightCube {
    constructor(gl, programInfo) {
        this.VBO;
        this.EBO;
        this.VAO;
        this.modelViewMatrix = mat4.create();
        this.initBuffers(gl, programInfo);
    }

    initBuffers(gl, programInfo) {
        // Même géométrie que le cube normal mais sans textures
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
        const stride = (3 + 3 + 2) * sizeOfFloat; // pos, normal, texCoord

        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, stride, 0);

        gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, stride, 3 * sizeOfFloat);

        gl.enableVertexAttribArray(programInfo.attribLocations.vertexTexCoord);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexTexCoord, 2, gl.FLOAT, false, stride, 6 * sizeOfFloat);

        // Store indices for drawing
        this.indices = indices;
    }

    draw(gl, programInfo, viewMatrix, projectionMatrix, position) {
        // Bind VAO
        gl.bindVertexArray(this.VAO);

        // Set matrices - comme dans le code C++ pour les light cubes
        mat4.identity(this.modelViewMatrix);

        // Translation vers la position de la lumière
        mat4.translate(this.modelViewMatrix, this.modelViewMatrix, [position.x, position.y, position.z]);

        // Scale pour faire un cube plus petit (0.2f comme dans le code C++)
        mat4.scale(this.modelViewMatrix, this.modelViewMatrix, [0.2, 0.2, 0.2]);

        gl.uniformMatrix4fv(programInfo.uniformLocations.modelMatrix, false, this.modelViewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.viewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);

        // Draw using indices
        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_INT, 0);
    }

    dispose(gl) {
        if (this.VAO) {
            gl.deleteVertexArray(this.VAO);
            this.VAO = null;
        }
        if (this.VBO) {
            gl.deleteBuffer(this.VBO);
            this.VBO = null;
        }
        if (this.EBO) {
            gl.deleteBuffer(this.EBO);
            this.EBO = null;
        }
    }
}
