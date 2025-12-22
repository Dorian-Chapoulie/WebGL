import RAPIER from '@dimforge/rapier3d-compat'
import { eulerToQuaternion } from "../utils/utils";
import { AbstractEntity } from "../models/interfaces/interfaces";

export class Trigger extends AbstractEntity {

    constructor(world, id, position, scale, onTrigger) {
        super();
        this.id = id;
        this.type = "Trigger";
        this.subtype = "Basic trigger";

        this.position = position;
        this.scale = scale;
        this.rotation = { x: 0, y: 0, z: 0 };
        this.onTrigger = onTrigger;
        this.rigidBody = undefined;
        this.collider = undefined;
        this.init(world, position, scale);
    }

    setColliderUserData(collider) {
        collider.userData = { id: this.id, onTrigger: this.onTrigger, type: this.type };
    }

    init(world, position, scale) {
        let sensorBodyDesc = new RAPIER.RigidBodyDesc(RAPIER.RigidBodyType.Fixed)
            .setTranslation(position.x, position.y, position.z);

        this.rigidBody = world.createRigidBody(sensorBodyDesc);

        let sensorColliderDesc = RAPIER.ColliderDesc.cuboid(scale.x / 2, scale.y / 2, scale.z / 2)
            .setSensor(true);
        this.collider = world.createCollider(sensorColliderDesc, this.rigidBody);
        this.setColliderUserData(this.collider);
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

    updateTriggerName(world, value) {
        console.debug('trigger name changed', value);
    }

    getParams() {
        return {    
            position: { type: 'vector3', min: -100, max: 100, step: 0.01, onChange: this.updatePosition.bind(this) },
            rotation: { type: 'vector3', min: 0, max: 2 * Math.PI, step: 0.01, onChange: this.updateRotation.bind(this) },
            scale: { type: 'vector3', min: 0.001, max: 10, ratio: true, step: 0.001, onChange: this.updateScale.bind(this) },
            id: { type: 'string', min: 0, max: 100, step: 0.01, onChange: this.updateTriggerName.bind(this) },
        }
    }

    toJSON() {
        return {
            position: this.position,
            size: this.scale,
            rotation: this.rotation,
            type: this.type,
            subtype: this.subtype,
        };
    }
}