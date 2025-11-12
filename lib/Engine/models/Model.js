import { Mesh } from "./Mesh";

//TODO: for each model set a Material (inside Mesh class is better?)
export class Model extends Mesh {
    constructor(gl, programInfo, modelPath, position, scale = { x: 1, y: 1, z: 1 }) {
        super(gl, programInfo);

        this.modelPath = modelPath;
        this.type = "3D Model";
        this.subtype = "Basic model";

        this.position = position;
        this.scale = scale;
        this.rotation = { x: 0, y: 0, z: 0 };
    }

    init = async () => {
        try {
            await this.load(this.modelPath);
            console.log('Modèle GLTF chargé avec succès');
        } catch (error) {
            console.error('Erreur lors du chargement du modèle GLTF:', error);
        }
    }

    draw(viewMatrix, projectionMatrix) {
        super.draw(viewMatrix, projectionMatrix,
            [this.position.x, this.position.y, this.position.z],
            [this.scale.x, this.scale.y, this.scale.z],
            this.rotation
        );
    }


    getParams() {
        return {
            position: { type: 'vector3', min: -100, max: 100 },
            rotation: { type: 'vector3', min: 0, max: 2 * Math.PI, step: 0.01 },
            scale: { type: 'vector3', min: 0.01, max: 10 },
        }
    }

}