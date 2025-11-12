import { v4 as uuidv4 } from 'uuid';
import { LightCube } from "../models/LightCube";

//Only one directional and spot light allowed, multiple point lights
//Modify .frag shader to add more light types and use same structure as pointLightCount
const MAX_POINT_LIGHTS = 4;
const MAX_SPOT_LIGHTS = 1;
const MAX_DIRECTIONAL_LIGHTS = 1;


export const LIGHT_TYPES = {
    DIRECTIONAL: 'directional',
    POINT_LIGHT: 'point',
    SPOT_LIGHT: 'spot'
};

class Light {
    constructor(type) {
        this.type = type;
        this.subtype = 'Light';

        this.drawLightCube = true;
        this.lightCube = null;
        this.id = uuidv4();
    }

    draw(gl, programInfo, viewMatrix, projectionMatrix) {
        if (this.type === LIGHT_TYPES.DIRECTIONAL || !viewMatrix || !projectionMatrix) return;

        if (this.drawLightCube && !this.lightCube) {
            this.lightCube = new LightCube(gl, programInfo);
        }
        if (this.drawLightCube && this.lightCube) {
            this.lightCube.draw(gl, programInfo, viewMatrix, projectionMatrix, this.position);
        }
    }

    update() {
        throw new Error("Update method not implemented for base Light class");
    }

    getParams() {
        throw new Error("GetParams method not implemented for base Light class");
    }

    dispose(gl, programInfo) {
        if (this.lightCube) {
            this.lightCube.dispose(gl);
            this.lightCube = null;
        }
    }

}

class SpotLight extends Light {
    constructor(ambient, diffuse, specular, constant, linear, quadratic, cutOff, outerCutOff) {
        super(LIGHT_TYPES.SPOT_LIGHT);

        this.ambient = ambient;
        this.diffuse = diffuse;
        this.specular = specular;
        this.constant = constant;
        this.linear = linear;
        this.quadratic = quadratic;
        this.cutOff = cutOff;
        this.outerCutOff = outerCutOff;
    }

    draw() {
        // SpotLight drawing handled in PointLight
    }

    dispose(gl, programInfo) {
        super.dispose(gl);
        LightFactory.spotLightCount--;
        this.outerCutOff = 0.0;
        this.cutOff = 0.0;
        this.quadratic = 0.0;
        this.linear = 0.0;
        this.constant = 0.0;
        this.specular = { x: 0.0, y: 0.0, z: 0.0 };
        this.diffuse = { x: 0.0, y: 0.0, z: 0.0 };
        this.ambient = { x: 0.0, y: 0.0, z: 0.0 };
        this.update(gl, programInfo, [0.0, 0.0, 0.0], [0.0, 0.0, -0.0]);
    }

    update(gl, programInfo, position, front)  {
        gl.uniform3f(programInfo.uniformLocations.spotLightPosition, position[0], position[1], position[2]);
        gl.uniform3f(programInfo.uniformLocations.spotLightDirection, front[0], front[1], front[2]);
        gl.uniform3f(programInfo.uniformLocations.spotLightAmbient,  this.ambient.x, this.ambient.y, this.ambient.z);
        gl.uniform3f(programInfo.uniformLocations.spotLightDiffuse, this.diffuse.x, this.diffuse.y, this.diffuse.z);
        gl.uniform3f(programInfo.uniformLocations.spotLightSpecular, this.specular.x, this.specular.y, this.specular.z);
        gl.uniform1f(programInfo.uniformLocations.spotLightConstant, this.constant);
        gl.uniform1f(programInfo.uniformLocations.spotLightLinear, this.linear);
        gl.uniform1f(programInfo.uniformLocations.spotLightQuadratic, this.quadratic);
        gl.uniform1f(programInfo.uniformLocations.spotLightCutOff, this.cutOff);
        gl.uniform1f(programInfo.uniformLocations.spotLightOuterCutOff, this.outerCutOff);
    }

    getParams() {   
        return {
            ambient: {
                type: 'vector3',
                min: 0,
                max: 1,
            },
            diffuse: {
                type: 'vector3',
                min: 0,
                max: 1,
            },
            specular: {
                type: 'vector3',
                min: 0,
                max: 1,
            },
            constant : {
                type: 'float',
                min: 0,
                max: 1,
            },
            linear : {
                type: 'float',
                min: 0,
                max: 1,
            },
            quadratic : {
                type: 'float',
                min: 0,
                max: 2,
            },
            cutOff : {
                type: 'float',
                min: 0,
                max: 1,
            },
            outerCutOff : {
                type: 'float',
                min: 0,
                max: 1,
            },
        }
    }
}

class DirectionalLight extends Light {
    constructor(direction, ambient, diffuse, specular) {
        super(LIGHT_TYPES.DIRECTIONAL);

        this.direction = direction;
        this.ambient = ambient;
        this.diffuse = diffuse;
        this.specular = specular;
    }

    dispose(gl, programInfo) {
        super.dispose(gl);
        LightFactory.directionalLightCount--;

        this.specular = { x: 0.0, y: 0.0, z: 0.0 };
        this.diffuse = { x: 0.0, y: 0.0, z: 0.0 };
        this.ambient = { x: 0.0, y: 0.0, z: 0.0 };
        this.direction = { x: 0.0, y: 0.0, z: 0.0 };
        this.update(gl, programInfo);
    }

    update(gl, programInfo) {
       gl.uniform3f(programInfo.uniformLocations.dirLightDirection, this.direction.x, this.direction.y, this.direction.z);
       gl.uniform3f(programInfo.uniformLocations.dirLightAmbient, this.ambient.x, this.ambient.y, this.ambient.z);
       gl.uniform3f(programInfo.uniformLocations.dirLightDiffuse, this.diffuse.x, this.diffuse.y, this.diffuse.z);
       gl.uniform3f(programInfo.uniformLocations.dirLightSpecular, this.specular.x, this.specular.y, this.specular.z);
    }

    getParams() {   
        return {
            direction: {
                type: 'vector3',
                min: -1,
                max: 1,
            },
            ambient: {
                type: 'vector3',
                min: 0,
                max: 1,
            },
            diffuse: {
                type: 'vector3',
                min: 0,
                max: 1,
            },
            specular: {
                type: 'vector3',
                min: 0,
                max: 1,
            },
        }
    }
}

class PointLight extends Light {
    constructor(index, position, ambient, diffuse, specular, constant, linear, quadratic) {
        super(LIGHT_TYPES.POINT_LIGHT);
        this.index = index;

        this.position = position;
        this.ambient = ambient;
        this.diffuse = diffuse;
        this.specular = specular;
        this.constant = constant;
        this.linear = linear;
        this.quadratic = quadratic;
    }

    dispose(gl, programInfo) {
        super.dispose(gl);
        LightFactory.pointLightCount--;
        this.position = { x: 0.0, y: 0.0, z: 0.0 };
        this.quadratic = 0.0;
        this.linear = 0.0;
        this.constant = 0.0;
        this.specular = { x: 0.0, y: 0.0, z: 0.0 };
        this.diffuse = { x: 0.0, y: 0.0, z: 0.0 };
        this.ambient = { x: 0.0, y: 0.0, z: 0.0 };
        this.update(gl, programInfo);
    }

    update(gl, programInfo) {
        gl.uniform1i(programInfo.uniformLocations.numPointLights, LightFactory.pointLightCount);
        const prefix = `pointLights${this.index}`;
        gl.uniform3f(programInfo.uniformLocations[`${prefix}Position`], this.position.x, this.position.y, this.position.z);
        gl.uniform3f(programInfo.uniformLocations[`${prefix}Ambient`], this.ambient.x, this.ambient.y, this.ambient.z);
        gl.uniform3f(programInfo.uniformLocations[`${prefix}Diffuse`], this.diffuse.x, this.diffuse.y, this.diffuse.z);
        gl.uniform3f(programInfo.uniformLocations[`${prefix}Specular`], this.specular.x, this.specular.y, this.specular.z);
        gl.uniform1f(programInfo.uniformLocations[`${prefix}Constant`], this.constant);
        gl.uniform1f(programInfo.uniformLocations[`${prefix}Linear`], this.linear);
        gl.uniform1f(programInfo.uniformLocations[`${prefix}Quadratic`], this.quadratic);
    }

    getParams() {
        return {
            position: {
                type: 'vector3',
                min: -100,
                max: 100,
                step: 0.1,
            },
            ambient: {
                type: 'vector3',
                min: 0,
                max: 1,
            },
            diffuse: {
                type: 'vector3',
                min: 0,
                max: 1,
            },
            specular: {
                type: 'vector3',
                min: 0,
                max: 1,
            },
            constant : {
                type: 'float',
                min: 0,
                max: 1,
            },
            linear : {
                type: 'float',
                min: 0,
                max: 1,
            },
            quadratic : {
                type: 'float',
                min: 0,
                max: 2,
            },
        }
    }
}

export class LightFactory {
    static pointLightCount = 0;
    static spotLightCount = 0;
    static directionalLightCount = 0;

    constructor(lightType, { directionalLightProperties, pointLightProperties, spotLightProperties } ) {
        switch (lightType) {
            case LIGHT_TYPES.DIRECTIONAL:
                if (LightFactory.directionalLightCount >= MAX_DIRECTIONAL_LIGHTS) {
                    console.error("Only 1 directional light allowed");
                    break;
                }
                LightFactory.directionalLightCount++;
                return new DirectionalLight(
                    directionalLightProperties.direction,
                    directionalLightProperties.ambient,
                    directionalLightProperties.diffuse,
                    directionalLightProperties.specular,
                );
            case LIGHT_TYPES.POINT_LIGHT:
                if (LightFactory.pointLightCount >= MAX_POINT_LIGHTS) {
                    console.error("Too much point lights");
                    break;
                }
                LightFactory.pointLightCount++;
                return new PointLight(
                    LightFactory.pointLightCount - 1,
                    pointLightProperties.position,
                    pointLightProperties.ambient,
                    pointLightProperties.diffuse,
                    pointLightProperties.specular,
                    pointLightProperties.constant,
                    pointLightProperties.linear,
                    pointLightProperties.quadratic,
                );
            case LIGHT_TYPES.SPOT_LIGHT:
                 if (LightFactory.spotLightCount >= MAX_SPOT_LIGHTS) {
                    console.error("Too much spot lights");
                    break;
                }
                LightFactory.spotLightCount++;
                return new SpotLight(
                    spotLightProperties.ambient,
                    spotLightProperties.diffuse,
                    spotLightProperties.specular,
                    spotLightProperties.constant,
                    spotLightProperties.linear,
                    spotLightProperties.quadratic,
                    spotLightProperties.cutOff,
                    spotLightProperties.outerCutOff,
                );
            default:
                throw new Error("Invalid light type");
        }
    }   

}
