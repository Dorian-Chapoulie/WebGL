import RAPIER from '@dimforge/rapier3d-compat'
import { Mesh } from "./Mesh";

export const ColliderTypes = {
    DYNAMIC: 'dynamic', 
    FIXED: 'fixed',
};

export class Model extends Mesh {
    constructor(gl, programInfo, modelPath, position, scale = { x: 1, y: 1, z: 1 }, rotation = { x: 0, y: 0, z: 0 }) {
        super(gl, programInfo);

        this.modelPath = modelPath;
        this.type = "3D Model";
        this.subtype = "Basic model";

        this.position = position;
        this.scale = scale;
        this.rotation = rotation;
    }

    setupCollider = (world, modelType) => {
        const { halfExtents } = this.getOverallDimensions();
        console.debug('haldEx', this.getOverallDimensions())
        switch (modelType) {
            case ColliderTypes.DYNAMIC:
                let rigidBodyDesc = new RAPIER.RigidBodyDesc(RAPIER.RigidBodyType.Dynamic)
                    .setTranslation(this.position.x, this.position.y, this.position.z);

                let rigidBody = world.createRigidBody(rigidBodyDesc);
                let colliderDesc = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
                    .setRestitution(0.5)
                    .setFriction(0.7);

                world.createCollider(colliderDesc, rigidBody);
            break;

            case ColliderTypes.FIXED:
                let groundColliderDesc = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
                    .setTranslation(this.position.x, this.position.y, this.position.z); 
                world.createCollider(groundColliderDesc);
            break;

            default:
                console.error(`Collider type: ${modelType} not found`);
            return;
        }
        

        // if (colliderType === 'sol') {
        //     const { halfExtents } = model.getOverallDimensions();
        //     let groundColliderDesc = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z);
        //     this.engine.world.createCollider(groundColliderDesc);
        // } else {
        //     const { halfExtents } = model.getOverallDimensions();

        //     let rigidBodyDesc = new RAPIER.RigidBodyDesc(RAPIER.RigidBodyType.Dynamic)
        //         .setTranslation(model.position.x, model.position.y, model.position.z);

        //     let rigidBody = this.engine.world.createRigidBody(rigidBodyDesc);

        //     let colliderDesc = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
        //         .setRestitution(0.5)
        //         .setFriction(0.7);

        //     this.engine.world.createCollider(colliderDesc, rigidBody);
        // }
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
            position: { type: 'vector3', min: -100, max: 100, step: 0.01 },
            rotation: { type: 'vector3', min: 0, max: 2 * Math.PI, step: 0.01 },
            scale: { type: 'vector3', min: 0.001, max: 10, ratio: true, step: 0.001 },
            materialShininess: { type: 'float', min: 1, max: 128, step: 1 }
        }
    }

    toJSON() {
        return {
            modelPath: this.modelPath,
            position: this.position,
            scale: this.scale,
            rotation: this.rotation,
            materialShininess: this.materialShininess,
            type: this.type,
            subtype: this.subtype
        };
    }

}