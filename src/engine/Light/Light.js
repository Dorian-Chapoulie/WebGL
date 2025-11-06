import { mat4 } from "gl-matrix";
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
    constructor(programInfo, gl, type) {
        this.programInfo = programInfo;
        this.gl = gl;
        this.type = type,

        this.drawLightCube = true;
        this.lightCube = null;
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
        throw new Error("Method 'update()' must be implemented.");
    }
    
}

class SpotLight extends Light {
    constructor(programInfo, gl, ambient, diffuse, specular, constant, linear, quadratic, cutOff, outerCutOff) {
        super(programInfo, gl, LIGHT_TYPES.SPOT_LIGHT);

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
}

class DirectionalLight extends Light {
    constructor(programInfo, gl, direction, ambient, diffuse, specular) {
        super(programInfo, gl, LIGHT_TYPES.DIRECTIONAL);

        this.direction = direction;
        this.ambient = ambient;
        this.diffuse = diffuse;
        this.specular = specular;
    }

    update(gl, programInfo) {
       gl.uniform3f(programInfo.uniformLocations.dirLightDirection, this.direction.x, this.direction.y, this.direction.z);
       gl.uniform3f(programInfo.uniformLocations.dirLightAmbient, this.ambient.x, this.ambient.y, this.ambient.z);
       gl.uniform3f(programInfo.uniformLocations.dirLightDiffuse, this.diffuse.x, this.diffuse.y, this.diffuse.z);
       gl.uniform3f(programInfo.uniformLocations.dirLightSpecular, this.specular.x, this.specular.y, this.specular.z);
    }
}

class PointLight extends Light {
    constructor(programInfo, gl, index, position, ambient, diffuse, specular, constant, linear, quadratic) {
        super(programInfo, gl, LIGHT_TYPES.POINT_LIGHT);
        this.index = index;

        this.position = position;
        this.ambient = ambient;
        this.diffuse = diffuse;
        this.specular = specular;
        this.constant = constant;
        this.linear = linear;
        this.quadratic = quadratic;        
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
}

export class LightFactory {
    static pointLightCount = 0;
    static spotLightCount = 0;
    static directionalLightCount = 0;

    constructor(lightType, gl, programInfo, { directionalLightProperties, pointLightProperties, spotLightProperties } ) {
        switch (lightType) {
            case LIGHT_TYPES.DIRECTIONAL:
                if (LightFactory.directionalLightCount >= MAX_DIRECTIONAL_LIGHTS) {
                    console.error("Only 1 directional light allowed");
                    break;
                }
                LightFactory.directionalLightCount++;
                return new DirectionalLight(
                    programInfo,
                    gl,
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
                    programInfo,
                    gl,
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
                    programInfo,
                    gl,
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
