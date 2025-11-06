import { useRef, useEffect, useState } from "react";
import { mat4, vec3 } from "gl-matrix";
//import { Cube } from "./models/Cube";
import { LightCube } from "./models/LightCube";
import { GltfModel } from "./models/GltfModel";


import vsSource from "./shaders/vertex/base.vert";
import skinnedVsSource from "./shaders/vertex/skinned.vert";
import fsSource from "./shaders/fragment/base.frag";
import lightCubeFsSource from "./shaders/fragment/light_cube.frag";
import { LightFactory, LIGHT_TYPES } from "./Light/Light";

let projectionMatrix;
let viewMatrix;

let cameraPosition;
let cameraFront;
let cameraUp;


let yaw = -90.0; // Start facing forward
let pitch = 0.0;


let animationFrame;
let i = 0;
let lastTime = 0;

const lights = [];
let gltfModel = null;

export const Engine = () => {
    const canvasRef = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0, z: -0.5 });
    const [animation, setAnimation] = useState(0);

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;

        // Initialisation du contexte WebGL
        const gl = canvas.getContext("webgl2");
      
        // Continuer seulement si WebGL est disponible et fonctionnel
        if (!gl) {
          alert(
            "Impossible d'initialiser WebGL. Votre navigateur ou votre machine peut ne pas le supporter.",
          );
          return;
        }

        // Définir la couleur d'effacement comme étant le noir, complètement opaque
        gl.clearColor(0.2, 0.3, 0.3, 1.0);
        // Effacer le tampon de couleur avec la couleur d'effacement spécifiée
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        function initShaderProgram(gl, vertex, fragment) {
            const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertex);
            const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragment);
            
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

        const loadShader = (gl, type, source) => {
            const shader = gl.createShader(type);
            
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            
            
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error(
                "An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader),
                );
                gl.deleteShader(shader);
                return null;
            }
            
            return shader;
        }

        const handleKeyDown = (e) => {
            // Exit pointer lock with ESC key
            if (e.key === 'Escape') {
                document.exitPointerLock();
                return;
            }
            
            const cameraSpeed = 0.05;
            const right = vec3.create();
            
            if (e.key === 'w') {
                const forward = vec3.create();
                vec3.scale(forward, cameraFront, cameraSpeed);
                vec3.add(cameraPosition, cameraPosition, forward);
            }
            if (e.key === 's') {
                const backward = vec3.create();
                vec3.scale(backward, cameraFront, cameraSpeed);
                vec3.subtract(cameraPosition, cameraPosition, backward);
            }
            if (e.key === 'a') {
                vec3.cross(right, cameraFront, cameraUp);
                vec3.normalize(right, right);
                vec3.scale(right, right, cameraSpeed);
                vec3.subtract(cameraPosition, cameraPosition, right);
            }
            if (e.key === 'd') {
                vec3.cross(right, cameraFront, cameraUp);
                vec3.normalize(right, right);
                vec3.scale(right, right, cameraSpeed);
                vec3.add(cameraPosition, cameraPosition, right);
            }
            
            // Update view matrix after camera movement
            const target = vec3.create();
            vec3.add(target, cameraPosition, cameraFront);
            mat4.lookAt(viewMatrix, cameraPosition, target, cameraUp);
            
            // Mettre à jour les uniforms pour les deux programmes
            gl.useProgram(programInfo.program);
            gl.uniformMatrix4fv(programInfo.uniformLocations.viewMatrix, false, viewMatrix);
            gl.useProgram(lightCubeProgramInfo.program);
            gl.uniformMatrix4fv(lightCubeProgramInfo.uniformLocations.viewMatrix, false, viewMatrix);
        }

        const handleMouseMove = (e) => {
            // Only handle mouse movement when pointer is locked
            if (document.pointerLockElement !== canvas) {
                return;
            }
            
            // When using pointer lock, use movementX and movementY instead of clientX/clientY
            const xoffset = e.movementX || 0;
            const yoffset = -(e.movementY || 0); // Invert Y-axis for natural mouse look
        
            const sensitivity = 0.1;
            const adjustedXoffset = xoffset * sensitivity;
            const adjustedYoffset = yoffset * sensitivity;
        
            yaw += adjustedXoffset;
            pitch += adjustedYoffset;
        
            if (pitch > 89.0)
                pitch = 89.0;
            if (pitch < -89.0)
                pitch = -89.0;

            if (yaw > 360.0)
                yaw = 0.0;
            if (yaw < -360.0)
                yaw = 0.0;
        
            // Calculate new camera front direction
            const direction = vec3.create();
            direction[0] = Math.cos(yaw * Math.PI / 180) * Math.cos(pitch * Math.PI / 180);
            direction[1] = Math.sin(pitch * Math.PI / 180);
            direction[2] = Math.sin(yaw * Math.PI / 180) * Math.cos(pitch * Math.PI / 180);
            vec3.normalize(cameraFront, direction);
            
            // Update view matrix after mouse movement
            const target = vec3.create();
            vec3.add(target, cameraPosition, cameraFront);
            mat4.lookAt(viewMatrix, cameraPosition, target, cameraUp);
            
            // Mettre à jour les uniforms pour les deux programmes
            gl.useProgram(programInfo.program);
            gl.uniformMatrix4fv(programInfo.uniformLocations.viewMatrix, false, viewMatrix);
            gl.useProgram(lightCubeProgramInfo.program);
            gl.uniformMatrix4fv(lightCubeProgramInfo.uniformLocations.viewMatrix, false, viewMatrix);
        }

        const initScene = async () => {
            const fieldOfView = (45 * Math.PI) / 180; // en radians
            const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
            const zNear = 0.1;
            const zFar = 100.0;

            cameraPosition = vec3.create();
            vec3.set(cameraPosition, 0, 0, 3);
            cameraFront = vec3.create();
            vec3.set(cameraFront, 0, 0, -1);
            cameraUp = vec3.create();
            vec3.set(cameraUp, 0, 1, 0);

            projectionMatrix = mat4.create();
            mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

            viewMatrix = mat4.create();
            const target = vec3.create();
            vec3.add(target, cameraPosition, cameraFront);
            mat4.lookAt(viewMatrix, cameraPosition, target, cameraUp);

            gl.useProgram(shaderProgram);
            gl.uniformMatrix4fv(programInfo.uniformLocations.viewMatrix, false, viewMatrix);
            gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);   

            // Charger le modèle GLTF avec le shader universel (skinned)
            gltfModel = new GltfModel(gl, skinnedProgramInfo);
            try {
                await gltfModel.load('/src/engine/models/cube.gltf');
            } catch (error) {
                console.error('Erreur lors du chargement du modèle GLTF:', error);
            }

            setupAdvancedLighting(gl, programInfo, cameraPosition, cameraFront);

            // Configurer le lighting pour le shader skinned (universel)
            gl.useProgram(skinnedProgramInfo.program);
            if (skinnedProgramInfo.uniformLocations.viewPos !== -1) {
                gl.uniform3fv(skinnedProgramInfo.uniformLocations.viewPos, cameraPosition);
            }
            if (skinnedProgramInfo.uniformLocations.materialShininess !== -1) {
                gl.uniform1f(skinnedProgramInfo.uniformLocations.materialShininess, 1.0);
            }
        }

        // Positions des cubes (équivalent de cubePositions)
        const cubePositions = [
            [-1.0, 0.0, 0.0],
            [2.0, 5.0, -15.0],
            [-1.5, -2.2, -2.5],
            [-3.8, -2.0, -12.3],
            [2.4, -0.4, -3.5],
            [-1.7, 3.0, -7.5],
            [1.3, -2.0, -2.5],
            [1.5, 2.0, -2.5],
            [1.5, 0.2, -1.5],
            [-1.3, 1.0, -1.5]
        ];

        // Positions des point lights (équivalent de pointLightPositions)
        const pointLightPositions = [
            {x: 0.7, y: 0.2, z: 2.0 },
            {x: 2.3, y: -3.3, z:-4.0 },
            {x: -4.0, y: 2.0, z: -12.0 },
            {x: 0.0, y: 0.0, z: -3.0 },
        ];

        const setupAdvancedLighting = (gl, programInfo, cameraPosition, cameraFront) => {
            // Activer le shader
            gl.useProgram(programInfo.program);
            
            // View position
            if (programInfo.uniformLocations.viewPos !== -1) {
                gl.uniform3fv(programInfo.uniformLocations.viewPos, cameraPosition);
            }

            // Material shininess
            if (programInfo.uniformLocations.materialShininess !== -1) {
                gl.uniform1f(programInfo.uniformLocations.materialShininess, 1.0);
            }

            
            if (lights.length === 0) {
                const directionalLight = new LightFactory(LIGHT_TYPES.DIRECTIONAL, gl, programInfo, { directionalLightProperties: {
                    direction: { x: -0.2, y: -1.0, z: -0.3},
                    ambient: { x: 0.05, y: 0.05, z: 0.05},
                    diffuse: { x: 0.4, y: 0.4, z: 0.4},
                    specular: { x: 0.5, y: 0.5, z: 0.5},
                }});
                lights.push(directionalLight);


                const pointLights = [];
                for (let i = 0; i < 4; i++) {
                    pointLights.push(new LightFactory(LIGHT_TYPES.POINT_LIGHT, gl, programInfo, { pointLightProperties: {
                        position: pointLightPositions[i],
                        ambient: { x: 0.05, y: 0.05, z: 0.05},
                        diffuse: { x: 0.8, y: 0.8, z: 0.2},
                        specular: { x: 1.0, y: 1.0, z: 1.0},
                        constant: 1.0,
                        linear: 0.09,
                        quadratic: 0.032,
                    }}));
                }
                lights.push(...pointLights);

                const spotLight = new LightFactory(LIGHT_TYPES.SPOT_LIGHT, gl, programInfo, { spotLightProperties: {
                    ambient: { x: 1.0, y: 1.0, z: 1.0},
                    diffuse: { x: 1.0, y: 1.0, z: 1.0},
                    specular: { x: 1.0, y: 1.0, z: 1.0},
                    constant: 1.0,
                    linear: 0.09,
                    quadratic: 0.032,
                    cutOff: Math.cos(12.5 * Math.PI / 180),
                    outerCutOff: Math.cos(15.0 * Math.PI / 180),
                }});
                lights.push(spotLight);
            }
        }

        function drawScene(currentTime) {
            // Calculer le deltaTime en secondes
            const deltaTime = lastTime > 0 ? (currentTime - lastTime) / 1000.0 : 0;
            lastTime = currentTime;

            gl.enable(gl.DEPTH_TEST);
            gl.clearColor(0.1, 0.1, 0.1, 1.0); // Couleur de fond comme dans le code C++
            gl.clearDepth(1.0); // tout effacer

            // Effacer le canvas avant que nous ne commencions à dessiner dessus.
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            // Mettre à jour les animations du modèle GLTF
            if (gltfModel && gltfModel.isLoaded) {
                gltfModel.update(deltaTime);


                // const currentIndex = gltfModel.animator.animations.findIndex(anim => anim.name === gltfModel.animator.currentAnimation.name);
                // if (currentIndex !== animation) {
                //    gltfModel.animator.play(animation);
                // }
            }

            // Mettre à jour les lights pour le shader principal
            // gl.useProgram(programInfo.program);
            // lights.forEach((light) => {
            //     light.update(gl, programInfo, cameraPosition, cameraFront);
            // });

            // Mettre à jour les lights pour le shader skinned
            gl.useProgram(skinnedProgramInfo.program);
            lights.forEach((light) => {
                light.update(gl, skinnedProgramInfo, cameraPosition, cameraFront);
            });

            // cubes.forEach((cube, index) => {
            //     cube.draw(gl, skinnedProgramInfo, viewMatrix, projectionMatrix, cubePositions[index]);
            // });

            // Dessiner le modèle GLTF
            if (gltfModel && gltfModel.isLoaded) {
                const rotation = i * 0.0005; // Pas de rotation manuelle si on utilise les animations
                gltfModel.draw(gl, skinnedProgramInfo, viewMatrix, projectionMatrix, [0, 0, -5], [1, 1, 1], rotation);
            }

            // gl.useProgram(lightCubeProgramInfo.program);
            // lights.forEach((light) => {
            //     light.draw(gl, lightCubeProgramInfo, viewMatrix, projectionMatrix);
            // });
        }

        // Utiliser le shader de lighting avancé
        const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
        if (!shaderProgram) {
            console.error("Failed to create shader program");
            return;
        }

        // Créer le shader pour les modèles avec skinning
        const skinnedShaderProgram = initShaderProgram(gl, skinnedVsSource, fsSource);
        if (!skinnedShaderProgram) {
            console.error("Failed to create skinned shader program");
            return;
        }

        // Créer le shader pour les cubes de lumière
        const lightCubeShaderProgram = initShaderProgram(gl, vsSource, lightCubeFsSource);
        if (!lightCubeShaderProgram) {
            console.error("Failed to create light cube shader program");
            return;
        }

        // Shader program créé avec succès

        const programInfo = {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(shaderProgram, "aPos"),
                vertexNormal: gl.getAttribLocation(shaderProgram, "aNormal"),
                vertexTexCoord: gl.getAttribLocation(shaderProgram, "aTexCoords"),
            },
            uniformLocations: {
                modelMatrix: gl.getUniformLocation(shaderProgram, "modelMatrix"),
                viewMatrix: gl.getUniformLocation(shaderProgram, "viewMatrix"),
                projectionMatrix: gl.getUniformLocation(shaderProgram, "projectionMatrix"),
                // Material
                materialShininess: gl.getUniformLocation(shaderProgram, "material.shininess"),
                // View position
                viewPos: gl.getUniformLocation(shaderProgram, "viewPos"),
                // Directional light
                dirLightDirection: gl.getUniformLocation(shaderProgram, "dirLight.direction"),
                dirLightAmbient: gl.getUniformLocation(shaderProgram, "dirLight.ambient"),
                dirLightDiffuse: gl.getUniformLocation(shaderProgram, "dirLight.diffuse"),
                dirLightSpecular: gl.getUniformLocation(shaderProgram, "dirLight.specular"),
                // Point lights
                numPointLights: gl.getUniformLocation(shaderProgram, "numPointLights"),
                pointLights0Position: gl.getUniformLocation(shaderProgram, "pointLights[0].position"),
                pointLights0Ambient: gl.getUniformLocation(shaderProgram, "pointLights[0].ambient"),
                pointLights0Diffuse: gl.getUniformLocation(shaderProgram, "pointLights[0].diffuse"),
                pointLights0Specular: gl.getUniformLocation(shaderProgram, "pointLights[0].specular"),
                pointLights0Constant: gl.getUniformLocation(shaderProgram, "pointLights[0].constant"),
                pointLights0Linear: gl.getUniformLocation(shaderProgram, "pointLights[0].linear"),
                pointLights0Quadratic: gl.getUniformLocation(shaderProgram, "pointLights[0].quadratic"),
                pointLights1Position: gl.getUniformLocation(shaderProgram, "pointLights[1].position"),
                pointLights1Ambient: gl.getUniformLocation(shaderProgram, "pointLights[1].ambient"),
                pointLights1Diffuse: gl.getUniformLocation(shaderProgram, "pointLights[1].diffuse"),
                pointLights1Specular: gl.getUniformLocation(shaderProgram, "pointLights[1].specular"),
                pointLights1Constant: gl.getUniformLocation(shaderProgram, "pointLights[1].constant"),
                pointLights1Linear: gl.getUniformLocation(shaderProgram, "pointLights[1].linear"),
                pointLights1Quadratic: gl.getUniformLocation(shaderProgram, "pointLights[1].quadratic"),
                pointLights2Position: gl.getUniformLocation(shaderProgram, "pointLights[2].position"),
                pointLights2Ambient: gl.getUniformLocation(shaderProgram, "pointLights[2].ambient"),
                pointLights2Diffuse: gl.getUniformLocation(shaderProgram, "pointLights[2].diffuse"),
                pointLights2Specular: gl.getUniformLocation(shaderProgram, "pointLights[2].specular"),
                pointLights2Constant: gl.getUniformLocation(shaderProgram, "pointLights[2].constant"),
                pointLights2Linear: gl.getUniformLocation(shaderProgram, "pointLights[2].linear"),
                pointLights2Quadratic: gl.getUniformLocation(shaderProgram, "pointLights[2].quadratic"),
                pointLights3Position: gl.getUniformLocation(shaderProgram, "pointLights[3].position"),
                pointLights3Ambient: gl.getUniformLocation(shaderProgram, "pointLights[3].ambient"),
                pointLights3Diffuse: gl.getUniformLocation(shaderProgram, "pointLights[3].diffuse"),
                pointLights3Specular: gl.getUniformLocation(shaderProgram, "pointLights[3].specular"),
                pointLights3Constant: gl.getUniformLocation(shaderProgram, "pointLights[3].constant"),
                pointLights3Linear: gl.getUniformLocation(shaderProgram, "pointLights[3].linear"),
                pointLights3Quadratic: gl.getUniformLocation(shaderProgram, "pointLights[3].quadratic"),
                // Spot light
                spotLightPosition: gl.getUniformLocation(shaderProgram, "spotLight.position"),
                spotLightDirection: gl.getUniformLocation(shaderProgram, "spotLight.direction"),
                spotLightAmbient: gl.getUniformLocation(shaderProgram, "spotLight.ambient"),
                spotLightDiffuse: gl.getUniformLocation(shaderProgram, "spotLight.diffuse"),
                spotLightSpecular: gl.getUniformLocation(shaderProgram, "spotLight.specular"),
                spotLightConstant: gl.getUniformLocation(shaderProgram, "spotLight.constant"),
                spotLightLinear: gl.getUniformLocation(shaderProgram, "spotLight.linear"),
                spotLightQuadratic: gl.getUniformLocation(shaderProgram, "spotLight.quadratic"),
                spotLightCutOff: gl.getUniformLocation(shaderProgram, "spotLight.cutOff"),
                spotLightOuterCutOff: gl.getUniformLocation(shaderProgram, "spotLight.outerCutOff"),
            },
        };

        // Program info pour les modèles avec skinning
        const skinnedProgramInfo = {
            program: skinnedShaderProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(skinnedShaderProgram, "aPos"),
                vertexNormal: gl.getAttribLocation(skinnedShaderProgram, "aNormal"),
                vertexTexCoord: gl.getAttribLocation(skinnedShaderProgram, "aTexCoords"),
                vertexJoints: gl.getAttribLocation(skinnedShaderProgram, "aJoints"),
                vertexWeights: gl.getAttribLocation(skinnedShaderProgram, "aWeights"),
            },
            uniformLocations: {
                modelMatrix: gl.getUniformLocation(skinnedShaderProgram, "modelMatrix"),
                viewMatrix: gl.getUniformLocation(skinnedShaderProgram, "viewMatrix"),
                projectionMatrix: gl.getUniformLocation(skinnedShaderProgram, "projectionMatrix"),
                // Material
                materialShininess: gl.getUniformLocation(skinnedShaderProgram, "material.shininess"),
                // View position
                viewPos: gl.getUniformLocation(skinnedShaderProgram, "viewPos"),
                // Directional light
                dirLightDirection: gl.getUniformLocation(skinnedShaderProgram, "dirLight.direction"),
                dirLightAmbient: gl.getUniformLocation(skinnedShaderProgram, "dirLight.ambient"),
                dirLightDiffuse: gl.getUniformLocation(skinnedShaderProgram, "dirLight.diffuse"),
                dirLightSpecular: gl.getUniformLocation(skinnedShaderProgram, "dirLight.specular"),
                // Point lights
                numPointLights: gl.getUniformLocation(skinnedShaderProgram, "numPointLights"),
                pointLights0Position: gl.getUniformLocation(skinnedShaderProgram, "pointLights[0].position"),
                pointLights0Ambient: gl.getUniformLocation(skinnedShaderProgram, "pointLights[0].ambient"),
                pointLights0Diffuse: gl.getUniformLocation(skinnedShaderProgram, "pointLights[0].diffuse"),
                pointLights0Specular: gl.getUniformLocation(skinnedShaderProgram, "pointLights[0].specular"),
                pointLights0Constant: gl.getUniformLocation(skinnedShaderProgram, "pointLights[0].constant"),
                pointLights0Linear: gl.getUniformLocation(skinnedShaderProgram, "pointLights[0].linear"),
                pointLights0Quadratic: gl.getUniformLocation(skinnedShaderProgram, "pointLights[0].quadratic"),
                pointLights1Position: gl.getUniformLocation(skinnedShaderProgram, "pointLights[1].position"),
                pointLights1Ambient: gl.getUniformLocation(skinnedShaderProgram, "pointLights[1].ambient"),
                pointLights1Diffuse: gl.getUniformLocation(skinnedShaderProgram, "pointLights[1].diffuse"),
                pointLights1Specular: gl.getUniformLocation(skinnedShaderProgram, "pointLights[1].specular"),
                pointLights1Constant: gl.getUniformLocation(skinnedShaderProgram, "pointLights[1].constant"),
                pointLights1Linear: gl.getUniformLocation(skinnedShaderProgram, "pointLights[1].linear"),
                pointLights1Quadratic: gl.getUniformLocation(skinnedShaderProgram, "pointLights[1].quadratic"),
                pointLights2Position: gl.getUniformLocation(skinnedShaderProgram, "pointLights[2].position"),
                pointLights2Ambient: gl.getUniformLocation(skinnedShaderProgram, "pointLights[2].ambient"),
                pointLights2Diffuse: gl.getUniformLocation(skinnedShaderProgram, "pointLights[2].diffuse"),
                pointLights2Specular: gl.getUniformLocation(skinnedShaderProgram, "pointLights[2].specular"),
                pointLights2Constant: gl.getUniformLocation(skinnedShaderProgram, "pointLights[2].constant"),
                pointLights2Linear: gl.getUniformLocation(skinnedShaderProgram, "pointLights[2].linear"),
                pointLights2Quadratic: gl.getUniformLocation(skinnedShaderProgram, "pointLights[2].quadratic"),
                pointLights3Position: gl.getUniformLocation(skinnedShaderProgram, "pointLights[3].position"),
                pointLights3Ambient: gl.getUniformLocation(skinnedShaderProgram, "pointLights[3].ambient"),
                pointLights3Diffuse: gl.getUniformLocation(skinnedShaderProgram, "pointLights[3].diffuse"),
                pointLights3Specular: gl.getUniformLocation(skinnedShaderProgram, "pointLights[3].specular"),
                pointLights3Constant: gl.getUniformLocation(skinnedShaderProgram, "pointLights[3].constant"),
                pointLights3Linear: gl.getUniformLocation(skinnedShaderProgram, "pointLights[3].linear"),
                pointLights3Quadratic: gl.getUniformLocation(skinnedShaderProgram, "pointLights[3].quadratic"),
                // Spot light
                spotLightPosition: gl.getUniformLocation(skinnedShaderProgram, "spotLight.position"),
                spotLightDirection: gl.getUniformLocation(skinnedShaderProgram, "spotLight.direction"),
                spotLightAmbient: gl.getUniformLocation(skinnedShaderProgram, "spotLight.ambient"),
                spotLightDiffuse: gl.getUniformLocation(skinnedShaderProgram, "spotLight.diffuse"),
                spotLightSpecular: gl.getUniformLocation(skinnedShaderProgram, "spotLight.specular"),
                spotLightConstant: gl.getUniformLocation(skinnedShaderProgram, "spotLight.constant"),
                spotLightLinear: gl.getUniformLocation(skinnedShaderProgram, "spotLight.linear"),
                spotLightQuadratic: gl.getUniformLocation(skinnedShaderProgram, "spotLight.quadratic"),
                spotLightCutOff: gl.getUniformLocation(skinnedShaderProgram, "spotLight.cutOff"),
                spotLightOuterCutOff: gl.getUniformLocation(skinnedShaderProgram, "spotLight.outerCutOff"),
                // Skinning uniforms
                jointMatrices: gl.getUniformLocation(skinnedShaderProgram, "uJointMatrices"),
                hasSkin: gl.getUniformLocation(skinnedShaderProgram, "uHasSkin"),
            },
        };

        // Program info pour les cubes de lumière
        const lightCubeProgramInfo = {
            program: lightCubeShaderProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(lightCubeShaderProgram, "aPos"),
                vertexNormal: gl.getAttribLocation(lightCubeShaderProgram, "aNormal"),
                vertexTexCoord: gl.getAttribLocation(lightCubeShaderProgram, "aTexCoords"),
            },
            uniformLocations: {
                modelMatrix: gl.getUniformLocation(lightCubeShaderProgram, "modelMatrix"),
                viewMatrix: gl.getUniformLocation(lightCubeShaderProgram, "viewMatrix"),
                projectionMatrix: gl.getUniformLocation(lightCubeShaderProgram, "projectionMatrix"),
            },
        };
        
        window.addEventListener('keydown', handleKeyDown);
        
        // Add mouse event listener with pointer lock for better control
        const handleMouseClick = () => {
            canvas.requestPointerLock();
        };
        
        canvas.addEventListener('click', handleMouseClick);
        document.addEventListener('mousemove', handleMouseMove);
        initScene();

        const draw = (currentTime) => {
            drawScene(currentTime);
            i++;
            animationFrame = requestAnimationFrame(draw);
        }

        draw(0);

        return () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
            window.removeEventListener('keydown', handleKeyDown);
            canvas.removeEventListener('click', handleMouseClick);
            document.removeEventListener('mousemove', handleMouseMove);
        }
        
    }, [position, animation]);

    const handleSliderChange = (axis, value) => {
        setPosition(prev => ({
            ...prev,
            [axis]: parseFloat(value)
        }));
    };

    const handleButtonClick = () => {
       setAnimation((prev) => (prev === 4 ? 0 : prev + 1));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ minWidth: '20px', color: 'white' }}>X:</label>
                    <input
                        type="range"
                        min="-5"
                        max="5"
                        step="0.05"
                        value={position.x}
                        onChange={(e) => handleSliderChange('x', e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <span style={{ color: 'white', minWidth: '40px' }}>{position.x.toFixed(1)}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ minWidth: '20px', color: 'white' }}>Y:</label>
                    <input
                        type="range"
                        min="-5"
                        max="5"
                        step="0.05"
                        value={position.y}
                        onChange={(e) => handleSliderChange('y', e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <span style={{ color: 'white', minWidth: '40px' }}>{position.y.toFixed(1)}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ minWidth: '20px', color: 'white' }}>Z:</label>
                    <input
                        type="range"
                        min="-5"
                        max="5"
                        step="0.05"
                        value={position.z}
                        onChange={(e) => handleSliderChange('z', e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <span style={{ color: 'white', minWidth: '40px' }}>{position.z.toFixed(1)}</span>
                </div>
            </div>
            
            <button 
                onClick={handleButtonClick}
                style={{
                    padding: '10px 20px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                }}
            >
                Console Log
            </button>
            
            <canvas ref={canvasRef} id="glCanvas" width="640" height="480"></canvas>
        </div>
    )
}