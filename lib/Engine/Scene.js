import { Light, LIGHT_TYPES } from "./Light/Light";
import { Model, ColliderTypes } from "./models/Model";

export class Scene {
    constructor(engine, sceneData) {
        this.engine = engine;
        this.lights = [];
        this.models = [];
        this.load(sceneData);
    }

    deleteEntity(id) {
        // Trouver et nettoyer le modèle avant de le retirer
        const modelToDelete = this.models.find((model) => model.id === id);
        if (modelToDelete) {
            modelToDelete.dispose(); // Libérer les ressources WebGL
        }

        // Trouver et nettoyer la light avant de la retirer
        const lightToDelete = this.lights.find((light) => light.id === id);
        if (lightToDelete) {
            lightToDelete.dispose(this.engine.gl, this.engine.skinnedProgramInfo); // Libérer les ressources WebGL
        }

        this.models = this.models.filter((model) => model.id !== id);
        this.lights = this.lights.filter((light) => light.id !== id);

        // Si toutes les lights ont été supprimées, réinitialiser les uniforms pour avoir un écran noir
        if (this.lights.length === 0) {
            const gl = this.engine.gl;
            const p = this.engine.skinnedProgramInfo;

            gl.useProgram(p.program);
            gl.uniform3f(p.uniformLocations.dirLightAmbient, 0.0, 0.0, 0.0);
            gl.uniform3f(p.uniformLocations.dirLightDiffuse, 0.0, 0.0, 0.0);
            gl.uniform3f(p.uniformLocations.dirLightSpecular, 0.0, 0.0, 0.0);
            gl.uniform1i(p.uniformLocations.numPointLights, 0);
            gl.uniform3f(p.uniformLocations.spotLightAmbient, 0.0, 0.0, 0.0);
            gl.uniform3f(p.uniformLocations.spotLightDiffuse, 0.0, 0.0, 0.0);
            gl.uniform3f(p.uniformLocations.spotLightSpecular, 0.0, 0.0, 0.0);
        }

    }

    addModel = async (path, position, colliderType = undefined, scale = { x: 1, y: 1, z: 1 }, rotation = { x: 0, y: 0, z: 0 }) => {
        const model = new Model(this.engine.gl, this.engine.skinnedProgramInfo, path, position, scale, rotation);
        await model.init();
        this.models.push(model);
        model.setupCollider(this.engine.world, colliderType);
        return model;
    }

    //TODO: add multiple spot lights support
    addLight = (type, lightData) => {
        //filter other types later
        switch (type) {
            case LIGHT_TYPES.POINT_LIGHT:
                console.debug('Adding POINT_LIGHT');
                const pointLight = new Light(type, {
                    position: lightData.position,
                    ambient: lightData.ambient,
                    diffuse: lightData.diffuse,
                    specular: lightData.specular,
                    constant: lightData.constant,
                    linear: lightData.linear,
                    quadratic: lightData.quadratic,
                });
                console.debug('Point light created:', pointLight);
                if (pointLight.id) this.lights.push(pointLight);
                return pointLight;
            default:
                throw new Error(`Unknown light type: ${type}`);
        }
    }

    load = async (sceneJson) => {
        if (!sceneJson) return;
        const models = sceneJson.models || [];
        const lights = sceneJson.lights || [];

        // Load models
        await Promise.all(models.map((modelData) => {
            return this.addModel(
                modelData.modelPath,
                modelData.position,
                modelData.colliderType || ColliderTypes.FIXED,
                modelData.scale,
                modelData.rotation
            );
        }));

        // Load lights
        for (const lightData of lights) {
            const light = new Light(lightData.type, lightData);
            this.lights.push(light);
        }
       
        await Promise.all(this.models.map(model => model.init()));
    }

    // setupLights = () => {
    //     this.engine.gl.useProgram(this.engine.skinnedProgramInfo.program);
        
    //     // View position
    //     this.engine.gl.uniform3fv(this.engine.skinnedProgramInfo.uniformLocations.viewPos, this.engine.cameraPosition);
        
    //     if (this.lights.length === 0) {
    //         const directionalLight = new LightFactory(LIGHT_TYPES.DIRECTIONAL, { directionalLightProperties: {
    //             direction: { x: -0.2, y: -1.0, z: -0.3},
    //             ambient: { x: 0.05, y: 0.05, z: 0.05},
    //             diffuse: { x: 0.4, y: 0.4, z: 0.4},
    //             specular: { x: 0.5, y: 0.5, z: 0.5},
    //         }});
    //         this.lights.push(directionalLight);


    //         const pointLights = [];
    //         for (let i = 0; i < 4; i++) {
    //             pointLights.push(new LightFactory(LIGHT_TYPES.POINT_LIGHT, { pointLightProperties: {
    //                 position: pointLightPositions[i],
    //                 ambient: { x: 0.05, y: 0.05, z: 0.05},
    //                 diffuse: { x: 0.8, y: 0.8, z: 0.2},
    //                 specular: { x: 1.0, y: 1.0, z: 1.0},
    //                 constant: 1.0,
    //                 linear: 0.09,
    //                 quadratic: 0.032,
    //             }}));
    //         }
    //         this.lights.push(...pointLights);

    //         const spotLight = new LightFactory(LIGHT_TYPES.SPOT_LIGHT, { spotLightProperties: {
    //             ambient: { x: 1.0, y: 0.0, z: 0.0},
    //             diffuse: { x: 1.0, y: 0.0, z: 0.0},
    //             specular: { x: 1.0, y: 0.0, z: 0.0},
    //             constant: 1.0,
    //             linear: 0.09,
    //             quadratic: 0.032,
    //             cutOff: Math.cos(12.5 * Math.PI / 180),
    //             outerCutOff: Math.cos(15.0 * Math.PI / 180),
    //         }});
    //         this.lights.push(spotLight);
    //     }
    // }

    draw = (deltaTime) => {
        this.engine.gl.useProgram(this.engine.skinnedProgramInfo.program);
        this.models.forEach((model) => {
            if (model.isLoaded) {
                model.update(deltaTime);
            }
            model.draw(this.engine.viewMatrix, this.engine.projectionMatrix);
        });

        this.lights.forEach((light) => {
            light.update(this.engine.gl, this.engine.skinnedProgramInfo, this.engine.cameraPosition, this.engine.cameraFront);
        });

        this.engine.gl.useProgram(this.engine.lightCubeProgramInfo.program);
        this.lights.forEach((light) => {
            light.draw(this.engine.gl, this.engine.lightCubeProgramInfo, this.engine.viewMatrix, this.engine.projectionMatrix);
        });
    }

    destroy = () => {
        this.engine.world.forEachRigidBody((body) => {
            this.engine.world.removeRigidBody(body);
        });
        this.models.forEach((model) => model.dispose());
        this.lights.forEach((light) => light.dispose(this.engine.gl, this.engine.skinnedProgramInfo));

        this.models = [];
        this.lights = [];
    }

    toJSON() {
        return {
            models: this.models.map(model => model.toJSON()),
            lights: this.lights.map(light => light.toJSON()),
        };
    }
}