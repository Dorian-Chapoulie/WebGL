import { mat4, vec3 } from "gl-matrix";
import { v4 as uuidv4 } from 'uuid';

export class Line {
    constructor(gl, programInfo, startPoint = [0, 0, 0], endPoint = [1, 1, 1], color = [1.0, 0.0, 0.0, 1.0]) {
        this.gl = gl;
        this.programInfo = programInfo;
        this.startPoint = startPoint;
        this.endPoint = endPoint;
        this.color = color; // RGBA [r, g, b, a]
        this.modelMatrix = mat4.create();
        this.id = uuidv4();
        this.type = "Line";
        this.subtype = "Basic line";

        this.VBO = null;
        this.VAO = null;

        this.initBuffers();
    }

    initBuffers() {
        const gl = this.gl;

        // D�finir les deux points de la ligne
        const vertices = new Float32Array([
            ...this.startPoint,  // Premier point (x, y, z)
            ...this.endPoint     // Deuxi�me point (x, y, z)
        ]);

        // Cr�er VAO et VBO
        this.VAO = gl.createVertexArray();
        this.VBO = gl.createBuffer();

        gl.bindVertexArray(this.VAO);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.VBO);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        // Configurer l'attribut de position
        gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);
        gl.vertexAttribPointer(
            this.programInfo.attribLocations.vertexPosition,
            3,           // 3 composantes (x, y, z)
            gl.FLOAT,    // type
            false,       // normalise
            0,           // stride
            0            // offset
        );

        gl.bindVertexArray(null);
    }

    updatePoints(startPoint, endPoint) {
        this.startPoint = startPoint;
        this.endPoint = endPoint;

        const gl = this.gl;
        const vertices = new Float32Array([
            ...this.startPoint,
            ...this.endPoint
        ]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.VBO);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    }

    setColor(color) {
        this.color = color;
    }

    draw(viewMatrix, projectionMatrix) {
        const gl = this.gl;

        // Utiliser le programme shader
        gl.useProgram(this.programInfo.program);

        // Matrice modèle identité (pas de transformation)
        mat4.identity(this.modelMatrix);
        //mat4.scale(this.modelMatrix, this.modelMatrix, [1, 1, 1]);

        // Passer les matrices au shader
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelMatrix, false, this.modelMatrix);
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.viewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);

        // Passer la couleur au shader (si le shader le supporte)
        if (this.programInfo.uniformLocations.lineColor) {
            gl.uniform4fv(this.programInfo.uniformLocations.lineColor, this.color);
        }

        // Bind VAO et dessiner la ligne
        gl.bindVertexArray(this.VAO);

        // Dessiner la ligne (2 points = 1 ligne)
        gl.drawArrays(gl.LINES, 0, 2);

        gl.bindVertexArray(null);
    } 

    dispose() {
        const gl = this.gl;

        if (this.VBO) {
            gl.deleteBuffer(this.VBO);
            this.VBO = null;
        }

        if (this.VAO) {
            gl.deleteVertexArray(this.VAO);
            this.VAO = null;
        }
    }
}
