import RAPIER from '@dimforge/rapier3d-compat'
import { Mesh } from "./Mesh";
import { eulerToQuaternion } from "../utils/utils";

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
        this.colliderType = undefined;
        this.collider = undefined;
        this.simulatePhysics = false;
    }

    setColliderUserData(collider) {
        collider.userData = { id: this.id, type: this.type };
    }

    setupCollider = (world, modelType) => {
        const dimensions = this.getOverallDimensions();
        const { halfExtents } = dimensions;

        const pos = this.position;
        const quaternion = eulerToQuaternion(this.rotation.x, this.rotation.y, this.rotation.z);

        switch (modelType) {
            case ColliderTypes.DYNAMIC: {
                let rigidBodyDesc = new RAPIER.RigidBodyDesc(RAPIER.RigidBodyType.Dynamic)
                    .setTranslation(pos.x, pos.y, pos.z)
                    .setRotation(quaternion);

                this.rigidBody = world.createRigidBody(rigidBodyDesc);
                let colliderDesc = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
                    .setRestitution(0.5)
                    .setFriction(0.7);
        
                this.collider = world.createCollider(colliderDesc, this.rigidBody);
                this.setColliderUserData(this.collider);
                this.colliderType = modelType;
                this.simulatePhysics = true;
                break;
            }

            case ColliderTypes.FIXED: {
                let fixedBodyDesc = new RAPIER.RigidBodyDesc(RAPIER.RigidBodyType.Fixed)
                    .setTranslation(pos.x, pos.y, pos.z)
                    .setRotation(quaternion);

                this.rigidBody = world.createRigidBody(fixedBodyDesc);

                let fixedColliderDesc = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z);
                this.collider = world.createCollider(fixedColliderDesc, this.rigidBody);
                this.setColliderUserData(this.collider);
                this.colliderType = modelType;
                this.simulatePhysics = true;
                break;
            }

            default:
                console.error(`Collider type: ${modelType} not found`);
        }
    }

    deleteCollider = (world) => {
        this.simulatePhysics = false;
        if (this.rigidBody) {
            world.removeRigidBody(this.rigidBody);
            this.rigidBody = null;
        }
        this.colliderType = undefined;
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
        if (this.rigidBody) {
            this.position = this.rigidBody.translation();
            this.rotation = this.rigidBody.rotation();
        }
        
        super.draw(viewMatrix, projectionMatrix,
            [this.position.x, this.position.y, this.position.z],
            [this.scale.x, this.scale.y, this.scale.z],
            this.rotation
        );
    }

    updatePosition(world, value) {
        this.position = value;
        this.rigidBody.setTranslation(value);
    }

    updateRotation(world, value) {
        this.rotation = value;
        const quaternion = eulerToQuaternion(this.rotation.x, this.rotation.y, this.rotation.z);
        this.rigidBody.setRotation(quaternion);
    }

    updateScale(world, value) {
        this.scale = value;
        world.removeCollider(this.collider, true);
        let sensorColliderDesc = RAPIER.ColliderDesc.cuboid(this.scale.x, this.scale.y, this.scale.z)
            .setSensor(true);
        this.collider = world.createCollider(sensorColliderDesc, this.rigidBody);
        this.setColliderUserData(this.collider);
    }

    updateMaterialShininess(world, value) {
        this.materialShininess = value;
    }


    getParams() {
        return {    
            position: { type: 'vector3', min: -100, max: 100, step: 0.01, onChange: this.updatePosition.bind(this) },
            rotation: { type: 'vector3', min: 0, max: 2 * Math.PI, step: 0.01, onChange: this.updateRotation.bind(this) },
            scale: { type: 'vector3', min: 0.001, max: 10, ratio: true, step: 0.001, onChange: this.updateScale.bind(this) },
            materialShininess: { type: 'float', min: 1, max: 128, step: 1, onChange: this.updateMaterialShininess.bind(this) },
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
            subtype: this.subtype,
            colliderType: this.colliderType,
        };
    }

}