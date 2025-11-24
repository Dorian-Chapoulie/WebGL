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
        this.colliderType = undefined;
    }

    // Convertir angles Euler en quaternion
    eulerToQuaternion(x, y, z) {
        const cx = Math.cos(x / 2);
        const cy = Math.cos(y / 2);
        const cz = Math.cos(z / 2);
        const sx = Math.sin(x / 2);
        const sy = Math.sin(y / 2);
        const sz = Math.sin(z / 2);

        return {
            w: cx * cy * cz + sx * sy * sz,
            x: sx * cy * cz - cx * sy * sz,
            y: cx * sy * cz + sx * cy * sz,
            z: cx * cy * sz - sx * sy * cz
        };
    }

    setupCollider = (world, modelType, position = null, rotation = null) => {
        const { halfExtents } = this.getOverallDimensions();

        // Utiliser la position et rotation fournies ou celles de l'objet
        const pos = position || this.position;
        // Si rotation est fournie (quaternion du rigidBody), l'utiliser, sinon convertir les angles Euler
        const quaternion = rotation || this.eulerToQuaternion(this.rotation.x, this.rotation.y, this.rotation.z);

        switch (modelType) {
            case ColliderTypes.DYNAMIC:
                let rigidBodyDesc = new RAPIER.RigidBodyDesc(RAPIER.RigidBodyType.Dynamic)
                    .setTranslation(pos.x, pos.y, pos.z)
                    .setRotation(quaternion);

                this.rigidBody = world.createRigidBody(rigidBodyDesc);
                let colliderDesc = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
                    .setRestitution(0.5)
                    .setFriction(0.7);
        
                world.createCollider(colliderDesc, this.rigidBody);
                this.colliderType = modelType;
            break;

            case ColliderTypes.FIXED:
                let fixedBodyDesc = new RAPIER.RigidBodyDesc(RAPIER.RigidBodyType.Fixed)
                    .setTranslation(pos.x, pos.y, pos.z)
                    .setRotation(quaternion);

                this.rigidBody = world.createRigidBody(fixedBodyDesc);

                let fixedColliderDesc = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z);
                world.createCollider(fixedColliderDesc, this.rigidBody);
                this.colliderType = modelType;
            break;

            default:
                console.error(`Collider type: ${modelType} not found`);
            return;
        }
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
            subtype: this.subtype,
            colliderType: this.colliderType,
        };
    }

}