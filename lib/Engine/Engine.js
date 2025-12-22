import { mat4, vec3 } from "gl-matrix";
import RAPIER from '@dimforge/rapier3d-compat'
import { Shader } from "./shaders/Shader";
import { Scene } from "./Scene";
import vsSource from "./shaders/vertex/base.vert";
import skinnedVsSource from "./shaders/vertex/skinned.vert";
import lineVsSource from "./shaders/vertex/line.vert";
import fsSource from "./shaders/fragment/base.frag";
import lightCubeFsSource from "./shaders/fragment/light_cube.frag";
import lineFsSource from "./shaders/fragment/line.frag";
import { v4 as uuidv4 } from 'uuid';
import { LIGHT_TYPES, MAX_POINT_LIGHTS } from "./Light/Light";
import { Line } from "./models/Line";

const SAVE_INTERVAL_MS = 30 * 1000; // Save scene every 30 seconds

export const defaultSceneData = {
    lights: [
        {
            type: LIGHT_TYPES.DIRECTIONAL,
            ambient: { x: 0.5, y: 0.5, z: 0.5 },
            diffuse: { x: 0.5, y: 0.5, z: 0.5 },
            specular: { x: 0.5, y: 0.5, z: 0.5 },
            direction: { x: -0.2, y: -1.0, z: -0.3}
        }
    ],
};
export class Engine {
    constructor(canvasId) {
        this.id = uuidv4();
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
        this.lineShaderProgram = undefined;
        this.lineProgramInfo = undefined;

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
        
        this.scene = undefined;

        this.gravity = undefined;
        this.world = undefined;

        this.isInitialized = false;
        this.isSimulationRunning = true;
        this.init();
    }

    init = async () => {
        await this.initRapier();
        this.initOpenGl();
        this.initShaders();
        //this.loadSceneLocally();
        this.scene = new Scene(this, defaultSceneData);
        this.initCamera();
        this.isInitialized = true;
    }

    initRapier = async () => {
        await RAPIER.init();
        this.gravity = new RAPIER.Vector3(0.0, -9.81, 0.0)
        this.world = new RAPIER.World(this.gravity)
    }

    loadSceneLocally = () => {
        const sceneJson = localStorage.getItem('JINE_SCENE');
        if (sceneJson) {
            const save = JSON.parse(sceneJson);
            this.scene = new Scene(this, save);
        } else {
            this.scene = new Scene(this, defaultSceneData);
        }
    }

    startAutoSave = () => {
        if (this.intervalAutoSave) {
            clearInterval(this.intervalAutoSave);
        }
        this.intervalAutoSave = setInterval(() => {
            if (this.scene) {
                const sceneData = this.scene.toJSON();
                const sceneJson = JSON.stringify(sceneData);
                localStorage.setItem('JINE_SCENE', sceneJson);
            }
        }, SAVE_INTERVAL_MS);
    }

    //TODO: set fov etc modifiable
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

        const getPointLightsUniformsLocations = () => {
            const ret = {};
            for (let i = 0; i < MAX_POINT_LIGHTS; i++) {
                //pointLights3Constant
                ret[`pointLights${i}Position`] = this.gl.getUniformLocation(this.skinnedShaderProgram, `pointLights[${i}].position`);
                ret[`pointLights${i}Ambient`] = this.gl.getUniformLocation(this.skinnedShaderProgram, `pointLights[${i}].ambient`);
                ret[`pointLights${i}Diffuse`] = this.gl.getUniformLocation(this.skinnedShaderProgram, `pointLights[${i}].diffuse`);
                ret[`pointLights${i}Specular`] = this.gl.getUniformLocation(this.skinnedShaderProgram, `pointLights[${i}].specular`);
                ret[`pointLights${i}Constant`] = this.gl.getUniformLocation(this.skinnedShaderProgram, `pointLights[${i}].constant`);
                ret[`pointLights${i}Linear`] = this.gl.getUniformLocation(this.skinnedShaderProgram, `pointLights[${i}].linear`);
                ret[`pointLights${i}Quadratic`] = this.gl.getUniformLocation(this.skinnedShaderProgram, `pointLights[${i}].quadratic`);
            }
            return ret;
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
                materialSpecular: this.gl.getUniformLocation(this.skinnedShaderProgram, "material.specular"),
                materialDiffuse: this.gl.getUniformLocation(this.skinnedShaderProgram, "material.diffuse"),
                // View position
                viewPos: this.gl.getUniformLocation(this.skinnedShaderProgram, "viewPos"),
                // Directional light
                dirLightDirection: this.gl.getUniformLocation(this.skinnedShaderProgram, "dirLight.direction"),
                dirLightAmbient: this.gl.getUniformLocation(this.skinnedShaderProgram, "dirLight.ambient"),
                dirLightDiffuse: this.gl.getUniformLocation(this.skinnedShaderProgram, "dirLight.diffuse"),
                dirLightSpecular: this.gl.getUniformLocation(this.skinnedShaderProgram, "dirLight.specular"),
                // Point lights
                numPointLights: this.gl.getUniformLocation(this.skinnedShaderProgram, "numPointLights"),
                ...getPointLightsUniformsLocations(),
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

        // Program info pour les lignes de debug
        const lineShader = new Shader(this.gl, lineVsSource, lineFsSource);
        this.lineShaderProgram = lineShader.program;
        if (!this.lineShaderProgram) {
            throw new Error("Failed to create line shader program");
        }

        this.lineProgramInfo = {
            program: this.lineShaderProgram,
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(this.lineShaderProgram, "aPos"),
            },
            uniformLocations: {
                modelMatrix: this.gl.getUniformLocation(this.lineShaderProgram, "modelMatrix"),
                viewMatrix: this.gl.getUniformLocation(this.lineShaderProgram, "viewMatrix"),
                projectionMatrix: this.gl.getUniformLocation(this.lineShaderProgram, "projectionMatrix"),
                lineColor: this.gl.getUniformLocation(this.lineShaderProgram, "lineColor"),
            },
        };
    }

    initCamera = () => {
        this.cameraPosition = vec3.create();
        vec3.set(this.cameraPosition, 0, 0, 0);
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

    updateProjectionMatrix = () => {
        // Recalculate aspect ratio based on current canvas size
        this.aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;

        // Update projection matrix with new aspect ratio
        mat4.perspective(this.projectionMatrix, this.fieldOfView, this.aspect, this.zNear, this.zFar);

        // Update uniforms for both programs
        this.gl.useProgram(this.skinnedProgramInfo.program);
        this.gl.uniformMatrix4fv(this.skinnedProgramInfo.uniformLocations.projectionMatrix, false, this.projectionMatrix);

        this.gl.useProgram(this.lightCubeProgramInfo.program);
        this.gl.uniformMatrix4fv(this.lightCubeProgramInfo.uniformLocations.projectionMatrix, false, this.projectionMatrix);
    }

    rayCastEntityId = (origin, direction, maxDistance) => {
        const ray = new RAPIER.Ray(origin, direction);
        
        const singleHit = this.world.castRayAndGetNormal(ray, maxDistance, true);
        if (!singleHit) return undefined;
        return {
            entityId: singleHit.collider.userData?.id,
            distance: singleHit.timeOfImpact,
        };
    }

    drawLine = (start, end, color) => {
        const line = new Line(this.gl, this.lineProgramInfo, start, end, color, 0.01, 3);
        line.draw(this.viewMatrix, this.projectionMatrix);
        line.dispose();
    }

    drawDebugLines = (selectedEntity) => {
        if (!this.world) return;
        const { vertices, colors } = this.world.debugRender(undefined, (collider) => {
            if (!selectedEntity) return true;
            return collider.userData?.id == selectedEntity.id;
        });

        // Nettoyer les anciennes lignes si elles existent
        if (this.debugLines && this.debugLines.length > 0) {
            this.debugLines.forEach(line => line.dispose());
        }

        this.debugLines = [];

        // Créer les lignes à partir des vertices et colors
        // Format Rapier: vertices = [x1, y1, z1, x2, y2, z2, ...] (paires de points)
        // Format colors = [r1, g1, b1, a1, r2, g2, b2, a2, ...] (couleur pour chaque point)
        for (let i = 0; i < vertices.length / 6; i += 1) {
            // Extraire les deux points de la ligne (Rapier utilise des paires de vertices)
            const startPoint = [
                vertices[i * 6],      // x1
                vertices[i * 6 + 1],  // y1
                vertices[i * 6 + 2]   // z1
            ];

            const endPoint = [
                vertices[i * 6 + 3],  // x2
                vertices[i * 6 + 4],  // y2
                vertices[i * 6 + 5]   // z2
            ];

            const color = !selectedEntity ? [
                colors[i * 8],
                colors[i * 8 + 1],
                colors[i * 8 + 2],
                colors[i * 8 + 3]
            ] :  [
                0.1,
                0.9,
                0.7,
                1
            ];       

            // Créer et ajouter la ligne
            const line = new Line(this.gl, this.lineProgramInfo, startPoint, endPoint, color);
            this.debugLines.push(line);
        }

        if (this.debugLines.length > 0) {
            this.debugLines.forEach(line => {
                line.draw(this.viewMatrix, this.projectionMatrix);
            }); 
        }
    }

    drawScene = (currentTime) => {
        if (!this.isInitialized) return;
        this.deltaTime = this.lastTime > 0 ? (currentTime - this.lastTime) / 1000.0 : 0;
        this.lastTime = currentTime;

        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.clearColor(0.1, 0.1, 0.1, 1.0);
        this.gl.clearDepth(1.0);

        // Effacer le canvas avant que nous ne commencions à dessiner dessus.
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        if (this.world && this.isSimulationRunning) {
            this.world.step();
        }

        if (this.scene) {
            this.scene.draw(this.deltaTime);
        }
    }

}