export class AbstractEntity {
     updatePosition(world, value) {
          throw new Error("Must implement updatePosition()");
     }
     updateRotation(world, value) {
          throw new Error("Must implement updateRotation()");
     }
     updateScale(world, value) {
          throw new Error("Must implement updateScale()");
     }
}