import { mat4, vec3 } from "gl-matrix";
import { v4 as uuidv4 } from 'uuid';

export class Line {
    constructor(gl, programInfo, startPoint, endPoint, color = [1.0, 0.0, 0.0, 1.0], thickness = 0.04, segments = 3) {
        this.gl = gl;
        this.programInfo = programInfo;
        this.startPoint = startPoint;
        this.endPoint = endPoint;
        this.color = color; // RGBA [r, g, b, a]
        this.thickness = thickness; // Épaisseur de la ligne (rayon du cylindre)
        this.segments = segments; // Nombre de segments autour du cylindre
        this.modelMatrix = mat4.create();
        this.id = uuidv4();
        this.type = "Line";
        this.subtype = "Basic line";

        this.VBO = null;
        this.VAO = null;
        this.vertexCount = 0;

        this.initBuffers();
    }

    initBuffers() {
        const gl = this.gl;

        // Créer les vertices du cylindre
        const vertices = this.createCylinderVertices();

        // Créer VAO et VBO
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

    createCylinderVertices() {
        // Calculer le vecteur direction de la ligne
        const direction = vec3.create();
        vec3.subtract(direction, this.endPoint, this.startPoint);
        vec3.normalize(direction, direction);

        // Calculer deux vecteurs perpendiculaires pour créer le cercle
        const perpendicular1 = vec3.create();
        const perpendicular2 = vec3.create();

        // Choisir un vecteur de référence pour le cross product
        const up = Math.abs(direction[1]) < 0.99 ? [0, 1, 0] : [0, 0, 1];
        vec3.cross(perpendicular1, direction, up);
        vec3.normalize(perpendicular1, perpendicular1);

        // Le deuxième vecteur perpendiculaire
        vec3.cross(perpendicular2, direction, perpendicular1);
        vec3.normalize(perpendicular2, perpendicular2);

        const vertices = [];
        const radius = this.thickness / 2;

        // Créer les vertices du cylindre
        // Pour chaque segment, on crée 2 triangles (un quad)
        for (let i = 0; i < this.segments; i++) {
            const angle1 = (i / this.segments) * Math.PI * 2;
            const angle2 = ((i + 1) / this.segments) * Math.PI * 2;

            // Calculer les points sur le cercle au début et à la fin
            const offset1 = vec3.create();
            const offset2 = vec3.create();

            // Point 1 du segment i
            vec3.scale(offset1, perpendicular1, Math.cos(angle1) * radius);
            vec3.scaleAndAdd(offset1, offset1, perpendicular2, Math.sin(angle1) * radius);

            // Point 2 du segment i+1
            vec3.scale(offset2, perpendicular1, Math.cos(angle2) * radius);
            vec3.scaleAndAdd(offset2, offset2, perpendicular2, Math.sin(angle2) * radius);

            // 4 points pour créer un quad (2 triangles)
            const p1Start = vec3.create();
            const p1End = vec3.create();
            const p2Start = vec3.create();
            const p2End = vec3.create();

            vec3.add(p1Start, this.startPoint, offset1);
            vec3.add(p1End, this.endPoint, offset1);
            vec3.add(p2Start, this.startPoint, offset2);
            vec3.add(p2End, this.endPoint, offset2);

            // Premier triangle
            vertices.push(...p1Start, ...p1End, ...p2Start);
            // Deuxième triangle
            vertices.push(...p2Start, ...p1End, ...p2End);
        }

        this.vertexCount = vertices.length / 3;
        return new Float32Array(vertices);
    }

    updatePoints(startPoint, endPoint) {
        this.startPoint = startPoint;
        this.endPoint = endPoint;

        const gl = this.gl;
        const vertices = this.createCylinderVertices();

        gl.bindBuffer(gl.ARRAY_BUFFER, this.VBO);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    }

    setThickness(thickness) {
        this.thickness = thickness;
        // Recréer les vertices avec la nouvelle épaisseur
        const gl = this.gl;
        const vertices = this.createCylinderVertices();
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

        // Bind VAO et dessiner le cylindre
        gl.bindVertexArray(this.VAO);

        // Dessiner les triangles qui forment le cylindre
        gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);

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
