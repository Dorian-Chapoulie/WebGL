import { mat4, quat, vec3 } from "gl-matrix";

export class GltfAnimator {
    constructor(gltfData, loader) {
        this.gltfData = gltfData;
        this.loader = loader;
        this.animations = [];
        this.currentAnimation = null;
        this.currentTime = 0;
        this.isPlaying = false;
        this.loop = true;
        this.nodes = [];
        this.nodeTransforms = new Map();

        this.initializeNodes();
        this.loadAnimations();
    }

    initializeNodes() {
        // Initialiser les transformations de tous les nœuds
        if (!this.gltfData.nodes) return;

        this.gltfData.nodes.forEach((node, index) => {
            const transform = {
                translation: node.translation ? vec3.fromValues(...node.translation) : vec3.fromValues(0, 0, 0),
                rotation: node.rotation ? quat.fromValues(...node.rotation) : quat.create(),
                scale: node.scale ? vec3.fromValues(...node.scale) : vec3.fromValues(1, 1, 1),
                matrix: mat4.create()
            };

            // Si le nœud a une matrice directement
            if (node.matrix) {
                mat4.copy(transform.matrix, node.matrix);
            } else {
                // Calculer la matrice à partir de TRS (Translation, Rotation, Scale)
                this.updateNodeMatrix(transform);
            }

            this.nodeTransforms.set(index, transform);
            this.nodes.push({
                ...node,
                transform: transform,
                children: node.children || []
            });
        });
    }

    updateNodeMatrix(transform) {
        mat4.fromRotationTranslationScale(
            transform.matrix,
            transform.rotation,
            transform.translation,
            transform.scale
        );
    }

    loadAnimations() {
        if (!this.gltfData.animations) {
            return;
        }

        console.log(`Nombre d'animations à charger: ${this.gltfData.animations.length}`);

        this.gltfData.animations.forEach((animation, animIndex) => {
            const animData = {
                name: animation.name || `Animation_${animIndex}`,
                channels: [],
                duration: 0
            };

            animation.channels.forEach((channel, channelIndex) => {
                const sampler = animation.samplers[channel.sampler];
                const inputAccessor = this.gltfData.accessors[sampler.input];
                const outputAccessor = this.gltfData.accessors[sampler.output];

                const input = this.loader.getAccessorData(sampler.input);
                const output = this.loader.getAccessorData(sampler.output);

                const channelData = {
                    nodeIndex: channel.target.node,
                    path: channel.target.path, // 'translation', 'rotation', 'scale'
                    interpolation: sampler.interpolation || 'LINEAR',
                    times: Array.from(input),
                    values: Array.from(output),
                    valueSize: this.getValueSize(channel.target.path)
                };

                // Mettre à jour la durée de l'animation
                const maxTime = Math.max(...channelData.times);
                if (maxTime > animData.duration) {
                    animData.duration = maxTime;
                }

                animData.channels.push(channelData);
            });

            this.animations.push(animData);
        });

        // Définir la première animation comme animation courante par défaut
        if (this.animations.length > 0) {
            this.currentAnimation = this.animations[0];
        }
    }

    getValueSize(path) {
        switch (path) {
            case 'translation':
            case 'scale':
                return 3;
            case 'rotation':
                return 4;
            default:
                return 1;
        }
    }

    play(animationIndex = 0) {
        if (animationIndex >= 0 && animationIndex < this.animations.length) {
            this.currentAnimation = this.animations[animationIndex];
            this.currentTime = 0;
            this.isPlaying = true;
        }
    }

    stop() {
        this.isPlaying = false;
        this.currentTime = 0;
    }

    pause() {
        this.isPlaying = false;
    }

    resume() {
        this.isPlaying = true;
    }

    update(deltaTime) {
        if (!this.isPlaying || !this.currentAnimation) return;

        this.currentTime += deltaTime;

        // Boucler l'animation si nécessaire
        if (this.loop && this.currentTime > this.currentAnimation.duration) {
            this.currentTime = this.currentTime % this.currentAnimation.duration;
        } else if (this.currentTime > this.currentAnimation.duration) {
            this.currentTime = this.currentAnimation.duration;
            this.isPlaying = false;
        }

        // Mettre à jour tous les channels
        this.currentAnimation.channels.forEach((channel) => {
            this.updateChannel(channel);
        });

        // Recalculer les matrices des nœuds
        this.nodeTransforms.forEach((transform) => {
            this.updateNodeMatrix(transform);
        });
    }

    updateChannel(channel) {
        const transform = this.nodeTransforms.get(channel.nodeIndex);
        if (!transform) return;

        // Trouver les keyframes avant et après le temps actuel
        let prevIndex = 0;
        let nextIndex = 0;

        for (let i = 0; i < channel.times.length - 1; i++) {
            if (channel.times[i] <= this.currentTime && this.currentTime <= channel.times[i + 1]) {
                prevIndex = i;
                nextIndex = i + 1;
                break;
            }
        }

        // Si on est après la dernière keyframe
        if (this.currentTime >= channel.times[channel.times.length - 1]) {
            prevIndex = nextIndex = channel.times.length - 1;
        }

        const prevTime = channel.times[prevIndex];
        const nextTime = channel.times[nextIndex];

        // Calculer le facteur d'interpolation
        let t = 0;
        if (nextTime > prevTime) {
            t = (this.currentTime - prevTime) / (nextTime - prevTime);
        }

        // Interpoler la valeur
        const prevValueIndex = prevIndex * channel.valueSize;
        const nextValueIndex = nextIndex * channel.valueSize;

        switch (channel.path) {
            case 'translation':
                const prevTrans = vec3.fromValues(
                    channel.values[prevValueIndex],
                    channel.values[prevValueIndex + 1],
                    channel.values[prevValueIndex + 2]
                );
                const nextTrans = vec3.fromValues(
                    channel.values[nextValueIndex],
                    channel.values[nextValueIndex + 1],
                    channel.values[nextValueIndex + 2]
                );
                vec3.lerp(transform.translation, prevTrans, nextTrans, t);
                break;

            case 'rotation':
                const prevRot = quat.fromValues(
                    channel.values[prevValueIndex],
                    channel.values[prevValueIndex + 1],
                    channel.values[prevValueIndex + 2],
                    channel.values[prevValueIndex + 3]
                );
                const nextRot = quat.fromValues(
                    channel.values[nextValueIndex],
                    channel.values[nextValueIndex + 1],
                    channel.values[nextValueIndex + 2],
                    channel.values[nextValueIndex + 3]
                );
                quat.slerp(transform.rotation, prevRot, nextRot, t);
                break;

            case 'scale':
                const prevScale = vec3.fromValues(
                    channel.values[prevValueIndex],
                    channel.values[prevValueIndex + 1],
                    channel.values[prevValueIndex + 2]
                );
                const nextScale = vec3.fromValues(
                    channel.values[nextValueIndex],
                    channel.values[nextValueIndex + 1],
                    channel.values[nextValueIndex + 2]
                );
                vec3.lerp(transform.scale, prevScale, nextScale, t);
                break;
        }
    }

    getNodeTransform(nodeIndex) {
        return this.nodeTransforms.get(nodeIndex);
    }

    getNodeWorldMatrix(nodeIndex) {
        const transform = this.nodeTransforms.get(nodeIndex);
        if (!transform) return mat4.create();

        // Trouver le parent de ce nœud
        let parentIndex = -1;

        // Chercher le parent dans la hiérarchie
        for (let i = 0; i < this.gltfData.nodes.length; i++) {
            const potentialParent = this.gltfData.nodes[i];
            if (potentialParent.children && potentialParent.children.includes(nodeIndex)) {
                parentIndex = i;
                break;
            }
        }

        // Si on a un parent, calculer récursivement la matrice monde
        if (parentIndex !== -1) {
            const parentWorldMatrix = this.getNodeWorldMatrix(parentIndex);
            const worldMatrix = mat4.create();
            mat4.multiply(worldMatrix, parentWorldMatrix, transform.matrix);
            return worldMatrix;
        } else {
            // Pas de parent, retourner la matrice locale
            return mat4.clone(transform.matrix);
        }
    }

    getAnimationNames() {
        return this.animations.map(anim => anim.name);
    }

    setAnimationByName(name) {
        const index = this.animations.findIndex(anim => anim.name === name);
        if (index !== -1) {
            this.play(index);
        }
    }

    getCurrentTime() {
        return this.currentTime;
    }

    getDuration() {
        return this.currentAnimation ? this.currentAnimation.duration : 0;
    }
}
