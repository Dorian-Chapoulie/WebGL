import { LightFactory, LIGHT_TYPES } from "./Light/Light";
import { Model } from "./models/Model";

//For debug
const pointLightPositions = [
    {x: 0.7, y: 0.2, z: 2.0 },
    {x: 2.3, y: -3.3, z:-4.0 },
    {x: -4.0, y: 2.0, z: -12.0 },
    {x: 0.0, y: 0.0, z: -3.0 },
];

export class Scene {
    //TODO: load from JSON
    constructor(engine) {
        this.engine = engine;
        this.lights = [];
        this.models = [];
        this.setupLights();
        
        this.load();
    }

    addNewModel = async (path, position, scale = { x: 1, y: 1, z: 1 }) => {
        const model = new Model(this.engine.gl, this.engine.skinnedProgramInfo, path, position, scale);
        this.models.push(model);
        await model.init();
        return model;
    }

    load = async () => {
        if (this.models.length <= 0) return;
       
        await Promise.all(this.models.map(model => model.init()));
    }

    setupLights = () => {
        this.engine.gl.useProgram(this.engine.skinnedProgramInfo.program);
        
        // View position
        this.engine.gl.uniform3fv(this.engine.skinnedProgramInfo.uniformLocations.viewPos, this.engine.cameraPosition);
        // Material shininess
        this.engine.gl.uniform1f(this.engine.skinnedProgramInfo.uniformLocations.materialShininess, 1.0);

        
        if (this.lights.length === 0) {
            const directionalLight = new LightFactory(LIGHT_TYPES.DIRECTIONAL, { directionalLightProperties: {
                direction: { x: -0.2, y: -1.0, z: -0.3},
                ambient: { x: 0.05, y: 0.05, z: 0.05},
                diffuse: { x: 0.4, y: 0.4, z: 0.4},
                specular: { x: 0.5, y: 0.5, z: 0.5},
            }});
            this.lights.push(directionalLight);


            const pointLights = [];
            for (let i = 0; i < 4; i++) {
                pointLights.push(new LightFactory(LIGHT_TYPES.POINT_LIGHT, { pointLightProperties: {
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

            const spotLight = new LightFactory(LIGHT_TYPES.SPOT_LIGHT, { spotLightProperties: {
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
}