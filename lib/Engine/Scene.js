import { LightFactory, LIGHT_TYPES } from "./Light/Light";
import { GltfModel } from "./models/GltfModel";

//For debug
const pointLightPositions = [
    {x: 0.7, y: 0.2, z: 2.0 },
    {x: 2.3, y: -3.3, z:-4.0 },
    {x: -4.0, y: 2.0, z: -12.0 },
    {x: 0.0, y: 0.0, z: -3.0 },
];
let gltfModel = null;

export class Scene {
    //TODO: load from JSON
    constructor(engine) {
        this.engine = engine;
        this.lights = [];
        this.setupLights();
        this.initScene();

    }

    initScene = async () => {
        // Charger le modèle GLTF avec le shader universel (skinned)
        gltfModel = new GltfModel(this.engine.gl, this.engine.skinnedProgramInfo);
        try {
            await gltfModel.load('/models/women/Untitled.gltf');
        } catch (error) {
            console.error('Erreur lors du chargement du modèle GLTF:', error);
        }
    }

    ///TODO: refactor to load this from a JSON
    setupLights = () => {
        this.engine.gl.useProgram(this.engine.skinnedProgramInfo.program);
        
        // View position
        this.engine.gl.uniform3fv(this.engine.skinnedProgramInfo.uniformLocations.viewPos, this.engine.cameraPosition);
        // Material shininess
        this.engine.gl.uniform1f(this.engine.skinnedProgramInfo.uniformLocations.materialShininess, 1.0);

        
        if (this.lights.length === 0) {
            const directionalLight = new LightFactory(LIGHT_TYPES.DIRECTIONAL, this.engine.gl, this.engine.programInfo, { directionalLightProperties: {
                direction: { x: -0.2, y: -1.0, z: -0.3},
                ambient: { x: 0.05, y: 0.05, z: 0.05},
                diffuse: { x: 0.4, y: 0.4, z: 0.4},
                specular: { x: 0.5, y: 0.5, z: 0.5},
            }});
            this.lights.push(directionalLight);


            const pointLights = [];
            for (let i = 0; i < 4; i++) {
                pointLights.push(new LightFactory(LIGHT_TYPES.POINT_LIGHT, this.engine.gl, this.engine.programInfo, { pointLightProperties: {
                    position: pointLightPositions[i],
                    ambient: { x: 0.05, y: 0.05, z: 0.05},
                    diffuse: { x: 0.8, y: 0.8, z: 0.2},
                    specular: { x: 1.0, y: 1.0, z: 1.0},
                    constant: 1.0,
                    linear: 0.09,
                    quadratic: 0.032,
                }}));
            }
            this.lights.push(...pointLights);

            const spotLight = new LightFactory(LIGHT_TYPES.SPOT_LIGHT, this.engine.gl, this.engine.programInfo, { spotLightProperties: {
                ambient: { x: 1.0, y: 0.0, z: 0.0},
                diffuse: { x: 1.0, y: 0.0, z: 0.0},
                specular: { x: 1.0, y: 0.0, z: 0.0},
                constant: 1.0,
                linear: 0.09,
                quadratic: 0.032,
                cutOff: Math.cos(12.5 * Math.PI / 180),
                outerCutOff: Math.cos(15.0 * Math.PI / 180),
            }});
            this.lights.push(spotLight);
        }
    }

    //same refactor
    draw = (deltaTime) => {
        if (gltfModel && gltfModel.isLoaded) {
            gltfModel.update(deltaTime);
            // const currentIndex = gltfModel.animator.animations.findIndex(anim => anim.name === gltfModel.animator.currentAnimation.name);
            // if (currentIndex !== animation) {
            //    gltfModel.animator.play(animation);
            // }
        }

        // Mettre à jour les lights pour le shader skinned
        this.engine.gl.useProgram(this.engine.skinnedProgramInfo.program);
        this.lights.forEach((light) => {
            light.update(this.engine.gl, this.engine.skinnedProgramInfo, this.engine.cameraPosition, this.engine.cameraFront);
        });

        // Dessiner le modèle GLTF
        if (gltfModel && gltfModel.isLoaded) {
            this.rotation = this.rotation ?? 1; // Vitesse de rotation
            this.rotation += 1;
            gltfModel.draw(this.engine.gl, this.engine.skinnedProgramInfo, this.engine.viewMatrix, this.engine.projectionMatrix, [1, 0, -5], [0.1, 0.1, 0.1]);
        }

        this.engine.gl.useProgram(this.engine.lightCubeProgramInfo.program);
        this.lights.forEach((light) => {
            light.draw(this.engine.gl, this.engine.lightCubeProgramInfo, this.engine.viewMatrix, this.engine.projectionMatrix);
        });
    }
}