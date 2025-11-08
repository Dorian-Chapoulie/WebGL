export class Shader {
    constructor(gl, vertex, fragment) {
        this.program = this.initShaderProgram(gl, vertex, fragment);
    }


    initShaderProgram = (gl, vertex, fragment) => {
        const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vertex);
        const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fragment);
        
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        
        // Si la création du programme shader a échoué, alerte
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error(
            "Impossible d'initialiser le programme shader : " +
                gl.getProgramInfoLog(shaderProgram),
            );
            return null;
        }
        
        return shaderProgram;
    }

    loadShader = (gl, type, source) => {
        const shader = gl.createShader(type);
        
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }

}