import { mat4, vec3 } from "gl-matrix";
import { Shader } from "./shaders/Shader";
import { Scene } from "./Scene";
import vsSource from "./shaders/vertex/base.vert";
import skinnedVsSource from "./shaders/vertex/skinned.vert";
import fsSource from "./shaders/fragment/base.frag";
import lightCubeFsSource from "./shaders/fragment/light_cube.frag";

export class Engine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error("Canvas reference is not valid.");
        }

        this.fieldOfView = undefined;
        this.aspect = undefined;
        this.zNear = undefined
        this.zFar = undefined;

        this.skinnedShaderProgram = undefined;
        this.skinnedProgramInfo = undefined;
        this.lightCubeShaderProgram = undefined;
        this.lightCubeProgramInfo = undefined;

        this.cameraSpeed = 0.05;
        this.sensitivity = 0.1;
        this.cameraPosition = vec3.create();
        this.cameraFront = vec3.create();
        this.cameraUp = vec3.create();
        this.yaw = -90.0;
        this.pitch = 0.0;

        this.projectionMatrix = mat4.create();
        this.viewMatrix = mat4.create();

        this.deltaTime = 0;
        this.lastTime = 0;

        this.initOpenGl();
        this.initShaders();
        this.initCamera();

        window.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('click', this.handleCanvasClick);


        //Refactor
        this.scene = new Scene(this);
    }


    initOpenGl = () => {
        this.gl = this.canvas.getContext("webgl2");
      
        if (!this.gl) {
            throw new Error("Impossible d'initialiser WebGL.");
        }

        this.fieldOfView = (45 * Math.PI) / 180;
        this.aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
        this.zNear = 0.1;
        this.zFar = 100.0;
    }

    initShaders = () => {
        const skinnedShader = new Shader(this.gl, skinnedVsSource, fsSource); 
        this.skinnedShaderProgram = skinnedShader.program
        if (!this.skinnedShaderProgram) {
            throw new Error("Failed to create skinned shader program");
        }

        const lightCubeShader = new Shader(this.gl, vsSource, lightCubeFsSource);
        this.lightCubeShaderProgram = lightCubeShader.program;
        if (!this.lightCubeShaderProgram) {
            throw new Error("Failed to create light cube shader program");
        }

        // Program info pour les modèles avec skinning
        this.skinnedProgramInfo = {
            program: this.skinnedShaderProgram,
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(this.skinnedShaderProgram, "aPos"),
                vertexNormal: this.gl.getAttribLocation(this.skinnedShaderProgram, "aNormal"),
                vertexTexCoord: this.gl.getAttribLocation(this.skinnedShaderProgram, "aTexCoords"),
                vertexJoints: this.gl.getAttribLocation(this.skinnedShaderProgram, "aJoints"),
                vertexWeights: this.gl.getAttribLocation(this.skinnedShaderProgram, "aWeights"),
            },
            uniformLocations: {
                modelMatrix: this.gl.getUniformLocation(this.skinnedShaderProgram, "modelMatrix"),
                viewMatrix: this.gl.getUniformLocation(this.skinnedShaderProgram, "viewMatrix"),
                projectionMatrix: this.gl.getUniformLocation(this.skinnedShaderProgram, "projectionMatrix"),
                // Material
                materialShininess: this.gl.getUniformLocation(this.skinnedShaderProgram, "material.shininess"),
                // View position
                viewPos: this.gl.getUniformLocation(this.skinnedShaderProgram, "viewPos"),
                // Directional light
                dirLightDirection: this.gl.getUniformLocation(this.skinnedShaderProgram, "dirLight.direction"),
                dirLightAmbient: this.gl.getUniformLocation(this.skinnedShaderProgram, "dirLight.ambient"),
                dirLightDiffuse: this.gl.getUniformLocation(this.skinnedShaderProgram, "dirLight.diffuse"),
                dirLightSpecular: this.gl.getUniformLocation(this.skinnedShaderProgram, "dirLight.specular"),
                // Point lights
                numPointLights: this.gl.getUniformLocation(this.skinnedShaderProgram, "numPointLights"),
                pointLights0Position: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[0].position"),
                pointLights0Ambient: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[0].ambient"),
                pointLights0Diffuse: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[0].diffuse"),
                pointLights0Specular: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[0].specular"),
                pointLights0Constant: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[0].constant"),
                pointLights0Linear: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[0].linear"),
                pointLights0Quadratic: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[0].quadratic"),
                pointLights1Position: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[1].position"),
                pointLights1Ambient: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[1].ambient"),
                pointLights1Diffuse: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[1].diffuse"),
                pointLights1Specular: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[1].specular"),
                pointLights1Constant: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[1].constant"),
                pointLights1Linear: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[1].linear"),
                pointLights1Quadratic: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[1].quadratic"),
                pointLights2Position: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[2].position"),
                pointLights2Ambient: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[2].ambient"),
                pointLights2Diffuse: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[2].diffuse"),
                pointLights2Specular: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[2].specular"),
                pointLights2Constant: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[2].constant"),
                pointLights2Linear: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[2].linear"),
                pointLights2Quadratic: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[2].quadratic"),
                pointLights3Position: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[3].position"),
                pointLights3Ambient: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[3].ambient"),
                pointLights3Diffuse: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[3].diffuse"),
                pointLights3Specular: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[3].specular"),
                pointLights3Constant: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[3].constant"),
                pointLights3Linear: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[3].linear"),
                pointLights3Quadratic: this.gl.getUniformLocation(this.skinnedShaderProgram, "pointLights[3].quadratic"),
                // Spot light
                spotLightPosition: this.gl.getUniformLocation(this.skinnedShaderProgram, "spotLight.position"),
                spotLightDirection: this.gl.getUniformLocation(this.skinnedShaderProgram, "spotLight.direction"),
                spotLightAmbient: this.gl.getUniformLocation(this.skinnedShaderProgram, "spotLight.ambient"),
                spotLightDiffuse: this.gl.getUniformLocation(this.skinnedShaderProgram, "spotLight.diffuse"),
                spotLightSpecular: this.gl.getUniformLocation(this.skinnedShaderProgram, "spotLight.specular"),
                spotLightConstant: this.gl.getUniformLocation(this.skinnedShaderProgram, "spotLight.constant"),
                spotLightLinear: this.gl.getUniformLocation(this.skinnedShaderProgram, "spotLight.linear"),
                spotLightQuadratic: this.gl.getUniformLocation(this.skinnedShaderProgram, "spotLight.quadratic"),
                spotLightCutOff: this.gl.getUniformLocation(this.skinnedShaderProgram, "spotLight.cutOff"),
                spotLightOuterCutOff: this.gl.getUniformLocation(this.skinnedShaderProgram, "spotLight.outerCutOff"),
                // Skinning uniforms
                jointMatrices: this.gl.getUniformLocation(this.skinnedShaderProgram, "uJointMatrices"),
                hasSkin: this.gl.getUniformLocation(this.skinnedShaderProgram, "uHasSkin"),
            },
        };

        // Program info pour les cubes de lumière
        this.lightCubeProgramInfo = {
            program: this.lightCubeShaderProgram,
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(this.lightCubeShaderProgram, "aPos"),
                vertexNormal: this.gl.getAttribLocation(this.lightCubeShaderProgram, "aNormal"),
                vertexTexCoord: this.gl.getAttribLocation(this.lightCubeShaderProgram, "aTexCoords"),
            },
            uniformLocations: {
                modelMatrix: this.gl.getUniformLocation(this.lightCubeShaderProgram, "modelMatrix"),
                viewMatrix: this.gl.getUniformLocation(this.lightCubeShaderProgram, "viewMatrix"),
                projectionMatrix: this.gl.getUniformLocation(this.lightCubeShaderProgram, "projectionMatrix"),
            },
        };
    }

    initCamera = () => {
        this.cameraPosition = vec3.create();
        vec3.set(this.cameraPosition, 0, 0, 3);
        this.cameraFront = vec3.create();
        vec3.set(this.cameraFront, 0, 0, -1);
        this.cameraUp = vec3.create();
        vec3.set(this.cameraUp, 0, 1, 0);

        this.projectionMatrix = mat4.create();
        mat4.perspective(this.projectionMatrix, this.fieldOfView, this.aspect, this.zNear, this.zFar);

        this.viewMatrix = mat4.create();
        const target = vec3.create();
        vec3.add(target, this.cameraPosition, this.cameraFront);
        mat4.lookAt(this.viewMatrix, this.cameraPosition, target, this.cameraUp);

        this.gl.useProgram(this.skinnedProgramInfo.program);
        this.gl.uniformMatrix4fv(this.skinnedProgramInfo.uniformLocations.viewMatrix, false, this.viewMatrix);
        this.gl.uniformMatrix4fv(this.skinnedProgramInfo.uniformLocations.projectionMatrix, false, this.projectionMatrix);
    }

    drawScene = (currentTime) => {
        this.deltaTime = this.lastTime > 0 ? (currentTime - this.lastTime) / 1000.0 : 0;
        this.lastTime = currentTime;

        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.clearColor(0.1, 0.1, 0.1, 1.0);
        this.gl.clearDepth(1.0);

        // Effacer le canvas avant que nous ne commencions à dessiner dessus.
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        this.scene.draw(this.deltaTime);
    }

    handleCanvasClick = () => {
        this.canvas.requestPointerLock();
    }

    //Move this out of Engine ?
    handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            document.exitPointerLock();
            return;
        }
        
        const right = vec3.create();
        
        if (e.key === 'w') {
            const forward = vec3.create();
            vec3.scale(forward, this.cameraFront, this.cameraSpeed);
            vec3.add(this.cameraPosition, this.cameraPosition, forward);
        }
        if (e.key === 's') {
            const backward = vec3.create();
            vec3.scale(backward, this.cameraFront, this.cameraSpeed);
            vec3.subtract(this.cameraPosition, this.cameraPosition, backward);
        }
        if (e.key === 'a') {
            vec3.cross(right, this.cameraFront, this.cameraUp);
            vec3.normalize(right, right);
            vec3.scale(right, right, this.cameraSpeed);
            vec3.subtract(this.cameraPosition, this.cameraPosition, right);
        }
        if (e.key === 'd') {
            vec3.cross(right, this.cameraFront, this.cameraUp);
            vec3.normalize(right, right);
            vec3.scale(right, right, this.cameraSpeed);
            vec3.add(this.cameraPosition, this.cameraPosition, right);
        }
        
        // Update view matrix after camera movement
        const target = vec3.create();
        vec3.add(target, this.cameraPosition, this.cameraFront);
        mat4.lookAt(this.viewMatrix, this.cameraPosition, target, this.cameraUp);
        
        // Mettre à jour les uniforms pour les deux programmes
        // this.gl.useProgram(this.skinnedProgramInfo.program);
        // this.gl.uniformMatrix4fv(this.skinnedProgramInfo.uniformLocations.viewMatrix, false, this.viewMatrix);
        // this.gl.useProgram(this.lightCubeProgramInfo.program);
        // this.gl.uniformMatrix4fv(this.lightCubeProgramInfo.uniformLocations.viewMatrix, false, this.viewMatrix);
    }

    //Move this out of Engine ?
    ///TODO: Create camera class
    handleMouseMove = (e) => {
        // Only handle mouse movement when pointer is locked
        if (document.pointerLockElement !== this.canvas) {
            return;
        }
        
        // When using pointer lock, use movementX and movementY instead of clientX/clientY
        const xoffset = e.movementX || 0;
        const yoffset = -(e.movementY || 0); // Invert Y-axis for natural mouse look


        const adjustedXoffset = xoffset * this.sensitivity;
        const adjustedYoffset = yoffset * this.sensitivity;

        this.yaw += adjustedXoffset;
        this.pitch += adjustedYoffset;
    
        if (this.pitch > 89.0)
            this.pitch = 89.0;
        if (this.pitch < -89.0)
            this.pitch = -89.0;

        if (this.yaw > 360.0)
            this.yaw = 0.0;
        if (this.yaw < -360.0)
            this.yaw = 0.0;
    
        // Calculate new camera front direction
        const direction = vec3.create();
        direction[0] = Math.cos(this.yaw * Math.PI / 180) * Math.cos(this.pitch * Math.PI / 180);
        direction[1] = Math.sin(this.pitch * Math.PI / 180);
        direction[2] = Math.sin(this.yaw * Math.PI / 180) * Math.cos(this.pitch * Math.PI / 180);
        vec3.normalize(this.cameraFront, direction);
        
        // Update view matrix after mouse movement
        const target = vec3.create();
        vec3.add(target, this.cameraPosition, this.cameraFront);
        mat4.lookAt(this.viewMatrix, this.cameraPosition, target, this.cameraUp);
        
        // Mettre à jour les uniforms pour les deux programmes
        // this.gl.useProgram(this.skinnedProgramInfo.program);
        // this.gl.uniformMatrix4fv(this.skinnedProgramInfo.uniformLocations.viewMatrix, false, this.viewMatrix);
        // this.gl.useProgram(this.lightCubeProgramInfo.program);
        // this.gl.uniformMatrix4fv(this.lightCubeProgramInfo.uniformLocations.viewMatrix, false, this.viewMatrix);
    }


}