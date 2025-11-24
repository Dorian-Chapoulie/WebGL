import { mat4 } from "gl-matrix";
import { GltfLoader } from "../loaders/GltfLoader";
import { GltfAnimator } from "../animation/GltfAnimator";
import { v4 as uuidv4 } from 'uuid';

export class Mesh {
    constructor(gl, programInfo) {
        this.gl = gl;
        this.skinnedProgramInfo = programInfo;
        this.meshes = [];
        this.textures = [];
        this.modelMatrix = mat4.create();
        this.isLoaded = false;
        this.loader = new GltfLoader();
        this.animator = null;
        this.gltfData = null;
        this.nodeToMeshMap = new Map();
        this.skins = [];
        this.jointMatrices = [];
        this.hasSkinning = false;
        this.id = uuidv4();
        this.materialShininess = 32;
    }

    async load(gltfPath) {
        try {
            await this.loader.load(gltfPath);
            const data = this.loader.getData();
            const gltf = data.gltf;
            this.gltfData = gltf;

            // Charger les textures
            this.loadTextures(data.images, gltf);

            // Charger les meshes
            this.loadMeshes(gltf);

            // Charger les skins si présents
            this.loadSkins(gltf);

            // Initialiser l'animateur si le modèle a des animations
            if (gltf.animations && gltf.animations.length > 0) {
                this.animator = new GltfAnimator(gltf, this.loader);
                console.log(`Animations trouvées: ${this.animator.getAnimationNames().join(', ')}`);
                // Démarrer automatiquement la première animation
                this.animator.play(0);
            } else {
                console.log('Aucune animation trouvée dans le modèle GLTF');
            }

            this.isLoaded = true;
        } catch (error) {
            console.error('Erreur lors du chargement du modèle GLTF:', error);
            throw error;
        }
    }

    loadTextures(images, gltf) {
        const gl = this.gl;

        if (!gltf.textures) {
            return;
        }

        gltf.textures.forEach((textureInfo, index) => {
            const texture = gl.createTexture();
            const image = images[textureInfo.source];

            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

            // Configuration du sampler
            const sampler = gltf.samplers ? gltf.samplers[textureInfo.sampler] : null;

            if (sampler) {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, sampler.wrapS || gl.REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, sampler.wrapT || gl.REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, sampler.minFilter || gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, sampler.magFilter || gl.LINEAR);
            } else {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            }

            // Générer les mipmaps si le filtre les utilise
            if (sampler && (sampler.minFilter === 9987 || sampler.minFilter === 9986 ||
                            sampler.minFilter === 9985 || sampler.minFilter === 9984)) {
                gl.generateMipmap(gl.TEXTURE_2D);
            }

            this.textures.push(texture);
        });
    }

    loadMeshes(gltf) {
        const gl = this.gl;

        if (!gltf.meshes) {
            return;
        }

        // Construire le mapping node -> mesh
        if (gltf.nodes) {
            gltf.nodes.forEach((node, nodeIndex) => {
                if (node.mesh !== undefined) {
                    this.nodeToMeshMap.set(nodeIndex, node.mesh);
                }
            });
        }

        gltf.meshes.forEach((mesh, meshIndex) => {
            mesh.primitives.forEach((primitive) => {
                // Déterminer si ce mesh utilise le skinning
                const hasSkinning = primitive.attributes.JOINTS_0 !== undefined && primitive.attributes.WEIGHTS_0 !== undefined;

                // Utiliser toujours le shader skinned (universel)
                const programToUse = this.skinnedProgramInfo;

                const meshData = {
                    vao: gl.createVertexArray(),
                    indexCount: 0,
                    material: primitive.material !== undefined ? gltf.materials[primitive.material] : null,
                    meshIndex: meshIndex,
                    hasSkinning: hasSkinning,
                    programInfo: programToUse
                };

                gl.bindVertexArray(meshData.vao);

                // Charger les attributs (POSITION, NORMAL, TEXCOORD_0, etc.)
                if (primitive.attributes.POSITION !== undefined) {
                    const positionData = this.loader.getAccessorData(primitive.attributes.POSITION);
                    const positionBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, positionData, gl.STATIC_DRAW);
                    gl.enableVertexAttribArray(programToUse.attribLocations.vertexPosition);
                    gl.vertexAttribPointer(programToUse.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);

                    // Calculate bounding box dimensions
                    let minX = Infinity, minY = Infinity, minZ = Infinity;
                    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

                    for (let i = 0; i < positionData.length; i += 3) {
                        const x = positionData[i];
                        const y = positionData[i + 1];
                        const z = positionData[i + 2];

                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        minZ = Math.min(minZ, z);

                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                        maxZ = Math.max(maxZ, z);
                    }

                    // Store bounding box info
                    meshData.boundingBox = {
                        min: { x: minX, y: minY, z: minZ },
                        max: { x: maxX, y: maxY, z: maxZ },
                        width: maxX - minX,
                        height: maxY - minY,
                        depth: maxZ - minZ,
                        center: {
                            x: (minX + maxX) / 2,
                            y: (minY + maxY) / 2,
                            z: (minZ + maxZ) / 2
                        }
                    };
                }

                if (primitive.attributes.NORMAL !== undefined) {
                    const normalData = this.loader.getAccessorData(primitive.attributes.NORMAL);
                    const normalBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, normalData, gl.STATIC_DRAW);
                    gl.enableVertexAttribArray(programToUse.attribLocations.vertexNormal);
                    gl.vertexAttribPointer(programToUse.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
                }

                if (primitive.attributes.TEXCOORD_0 !== undefined) {
                    const texCoordData = this.loader.getAccessorData(primitive.attributes.TEXCOORD_0);
                    const texCoordBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, texCoordData, gl.STATIC_DRAW);
                    gl.enableVertexAttribArray(programToUse.attribLocations.vertexTexCoord);
                    gl.vertexAttribPointer(programToUse.attribLocations.vertexTexCoord, 2, gl.FLOAT, false, 0, 0);
                }

                // Charger les attributs de skinning (ou des valeurs par défaut)
                if (hasSkinning) {
                    this.hasSkinning = true;

                    // JOINTS_0 (indices des bones)
                    const jointsAccessor = gltf.accessors[primitive.attributes.JOINTS_0];
                    const jointsDataRaw = this.loader.getAccessorData(primitive.attributes.JOINTS_0);

                    // Convertir les données en Float32Array pour assurer la compatibilité avec le shader
                    // Les indices de joints peuvent être en UNSIGNED_BYTE ou UNSIGNED_SHORT
                    const jointsData = new Float32Array(jointsDataRaw.length);
                    for (let i = 0; i < jointsDataRaw.length; i++) {
                        jointsData[i] = jointsDataRaw[i];
                    }

                    const jointsBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, jointsBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, jointsData, gl.STATIC_DRAW);
                    gl.enableVertexAttribArray(programToUse.attribLocations.vertexJoints);
                    gl.vertexAttribPointer(programToUse.attribLocations.vertexJoints, 4, gl.FLOAT, false, 0, 0);

                    // WEIGHTS_0 (poids d'influence)
                    const weightsData = this.loader.getAccessorData(primitive.attributes.WEIGHTS_0);
                    const weightsBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, weightsBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, weightsData, gl.STATIC_DRAW);
                    gl.enableVertexAttribArray(programToUse.attribLocations.vertexWeights);
                    gl.vertexAttribPointer(programToUse.attribLocations.vertexWeights, 4, gl.FLOAT, false, 0, 0);
                } else {
                    // Pas de skinning: fournir des attributs par défaut (zeros)
                    // Pour éviter les erreurs WebGL, on crée des buffers avec des valeurs nulles
                    const vertexCount = this.loader.getAccessorData(primitive.attributes.POSITION).length / 3;

                    const dummyJoints = new Float32Array(vertexCount * 4).fill(0);
                    const jointsBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, jointsBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, dummyJoints, gl.STATIC_DRAW);
                    gl.enableVertexAttribArray(programToUse.attribLocations.vertexJoints);
                    gl.vertexAttribPointer(programToUse.attribLocations.vertexJoints, 4, gl.FLOAT, false, 0, 0);

                    const dummyWeights = new Float32Array(vertexCount * 4).fill(0);
                    const weightsBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, weightsBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, dummyWeights, gl.STATIC_DRAW);
                    gl.enableVertexAttribArray(programToUse.attribLocations.vertexWeights);
                    gl.vertexAttribPointer(programToUse.attribLocations.vertexWeights, 4, gl.FLOAT, false, 0, 0);
                }

                // Charger les indices
                if (primitive.indices !== undefined) {
                    const indexData = this.loader.getAccessorData(primitive.indices);
                    const indexBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
                    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);

                    const accessor = gltf.accessors[primitive.indices];
                    meshData.indexCount = accessor.count;
                    meshData.indexType = accessor.componentType; // 5123 = UNSIGNED_SHORT, 5125 = UNSIGNED_INT
                }

                gl.bindVertexArray(null);
                this.meshes.push(meshData);
            });
        });
    }

    loadSkins(gltf) {
        if (!gltf.skins) {
            return;
        }

        gltf.skins.forEach((skin, skinIndex) => {
            const inverseBindMatrices = skin.inverseBindMatrices !== undefined
                ? this.loader.getAccessorData(skin.inverseBindMatrices)
                : null;

            this.skins.push({
                joints: skin.joints,
                inverseBindMatrices: inverseBindMatrices,
                skeleton: skin.skeleton
            });

            console.log(`Skin ${skinIndex}: ${skin.joints.length} joints`);
        });
    }

    updateJointMatrices() {
        if (!this.animator || this.skins.length === 0) return;

        this.skins.forEach((skin, skinIndex) => {
            const jointMatrices = [];

            skin.joints.forEach((jointIndex, i) => {
                // Obtenir la matrice monde du joint
                const jointMatrix = this.animator.getNodeWorldMatrix(jointIndex);

                // Multiplier par la inverse bind matrix
                const finalMatrix = mat4.create();
                if (skin.inverseBindMatrices) {
                    const inverseBindMatrix = mat4.create();
                    const offset = i * 16;
                    for (let j = 0; j < 16; j++) {
                        inverseBindMatrix[j] = skin.inverseBindMatrices[offset + j];
                    }
                    mat4.multiply(finalMatrix, jointMatrix, inverseBindMatrix);
                } else {
                    mat4.copy(finalMatrix, jointMatrix);
                }

                jointMatrices.push(finalMatrix);
            });

            this.jointMatrices[skinIndex] = jointMatrices;
        });
    }

    update(deltaTime) {
        if (this.animator && this.animator.isPlaying) {
            this.animator.update(deltaTime);
            this.updateJointMatrices();
        }
    }

    draw(viewMatrix, projectionMatrix, position, scale, rotation) {
        if (!this.isLoaded) {
            return;
        }

        // Sauvegarder les matrices pour les passer aux différents shaders
        this.currentViewMatrix = viewMatrix;
        this.currentProjectionMatrix = projectionMatrix;

        mat4.identity(this.modelMatrix);
        mat4.translate(this.modelMatrix, this.modelMatrix, position);
        mat4.rotate(this.modelMatrix, this.modelMatrix, rotation.x, [1, 0, 0]);
        mat4.rotate(this.modelMatrix, this.modelMatrix, rotation.y, [0, 1, 0]);
        mat4.rotate(this.modelMatrix, this.modelMatrix, rotation.z, [0, 0, 1]);
        mat4.scale(this.modelMatrix, this.modelMatrix, scale);

        this.gl.uniform1f(this.skinnedProgramInfo.uniformLocations.materialShininess, this.materialShininess);

        // Dessiner en parcourant la hiérarchie de nœuds
        if (this.gltfData.scenes && this.gltfData.scenes.length > 0) {
            const scene = this.gltfData.scenes[this.gltfData.scene || 0];
            scene.nodes.forEach(nodeIndex => {
                this.drawNode(this.gl, this.skinnedProgramInfo, nodeIndex, this.modelMatrix);
            });
        } else {
            // Fallback: dessiner tous les meshes sans animation
            this.meshes.forEach((mesh) => {
                this.drawMesh(this.gl, mesh, this.modelMatrix);
            });
        }

        this.gl.bindVertexArray(null);
    }

    getParams() {
        throw new Error("Method 'getParams()' must be implemented.");
    }

    drawNode(gl, programInfo, nodeIndex, parentMatrix) {
        const node = this.gltfData.nodes[nodeIndex];
        if (!node) return;

        // Obtenir la transformation du nœud (incluant l'animation si présente)
        let nodeMatrix = mat4.create();
        if (this.animator) {
            const transform = this.animator.getNodeTransform(nodeIndex);
            if (transform) {
                mat4.copy(nodeMatrix, transform.matrix);
            }
        } else if (node.matrix) {
            mat4.copy(nodeMatrix, node.matrix);
        } else {
            // Construire la matrice à partir de TRS
            const translation = node.translation || [0, 0, 0];
            const rotation = node.rotation || [0, 0, 0, 1];
            const scale = node.scale || [1, 1, 1];
            mat4.fromRotationTranslationScale(nodeMatrix, rotation, translation, scale);
        }

        // Multiplier avec la matrice parente
        const worldMatrix = mat4.create();
        mat4.multiply(worldMatrix, parentMatrix, nodeMatrix);

        // Dessiner le mesh associé à ce nœud
        if (node.mesh !== undefined) {
            const mesh = this.gltfData.meshes[node.mesh];
            mesh.primitives.forEach((primitive, primIndex) => {
                // Trouver le meshData correspondant
                const meshData = this.meshes.find(m => m.meshIndex === node.mesh);
                if (meshData) {
                    this.drawMesh(gl, meshData, worldMatrix);
                }
            });
        }

        // Dessiner les enfants récursivement
        if (node.children) {
            node.children.forEach(childIndex => {
                this.drawNode(gl, programInfo, childIndex, worldMatrix);
            });
        }
    }

    drawMesh(gl, mesh, modelMatrix) {
        // Utiliser toujours le shader universel (skinned)
        const actualProgramInfo = this.skinnedProgramInfo;
        gl.useProgram(actualProgramInfo.program);

        // Passer les matrices de transformation
        gl.uniformMatrix4fv(actualProgramInfo.uniformLocations.modelMatrix, false, modelMatrix);
        gl.uniformMatrix4fv(actualProgramInfo.uniformLocations.viewMatrix, false, this.currentViewMatrix);
        gl.uniformMatrix4fv(actualProgramInfo.uniformLocations.projectionMatrix, false, this.currentProjectionMatrix);

        // Configurer le skinning selon le mesh
        if (mesh.hasSkinning && this.jointMatrices.length > 0) {
            // Activer le skinning et passer les matrices des joints
            gl.uniform1i(actualProgramInfo.uniformLocations.hasSkin, 1);

            // Flatten les matrices pour WebGL (maximum 825 joints)
            const maxJoints = 250;
            const jointCount = Math.min(this.jointMatrices[0].length, maxJoints);
            const flatMatrices = new Float32Array(maxJoints * 16);

            for (let i = 0; i < jointCount; i++) {
                flatMatrices.set(this.jointMatrices[0][i], i * 16);
            }

            gl.uniformMatrix4fv(actualProgramInfo.uniformLocations.jointMatrices, false, flatMatrices);
        } else {
            // Désactiver le skinning pour ce mesh
            gl.uniform1i(actualProgramInfo.uniformLocations.hasSkin, 0);
        }

        gl.bindVertexArray(mesh.vao);

        // Bind les textures si elles existent
        if (mesh.material && mesh.material.pbrMetallicRoughness) {
            const pbr = mesh.material.pbrMetallicRoughness;

            // Texture diffuse (baseColorTexture)
            if (pbr.baseColorTexture !== undefined) {
                const textureIndex = pbr.baseColorTexture.index;
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this.textures[textureIndex]);
                gl.uniform1i(actualProgramInfo.uniformLocations.materialDiffuse, 0);
            }

            // Texture specular (metallicRoughnessTexture ou utiliser baseColorTexture par défaut)
            if (pbr.metallicRoughnessTexture !== undefined) {
                const textureIndex = pbr.metallicRoughnessTexture.index;
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, this.textures[textureIndex]);
                gl.uniform1i(actualProgramInfo.uniformLocations.materialSpecular, 1);
            } else if (pbr.baseColorTexture !== undefined) {
                // Si pas de texture specular, utiliser la texture diffuse
                const textureIndex = pbr.baseColorTexture.index;
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, this.textures[textureIndex]);
                gl.uniform1i(actualProgramInfo.uniformLocations.materialSpecular, 1);
            }
        }

        // Dessiner
        if (mesh.indexCount > 0) {
            const indexTypeMap = {
                5123: gl.UNSIGNED_SHORT,
                5125: gl.UNSIGNED_INT
            };
            const indexType = indexTypeMap[mesh.indexType] || gl.UNSIGNED_INT;
            gl.drawElements(gl.TRIANGLES, mesh.indexCount, indexType, 0);
        }
    }

    setPosition(position) {
        mat4.identity(this.modelMatrix);
        mat4.translate(this.modelMatrix, this.modelMatrix, position);
    }

    setRotation(angle, axis) {
        mat4.rotate(this.modelMatrix, this.modelMatrix, angle, axis);
    }

    setScale(scale) {
        mat4.scale(this.modelMatrix, this.modelMatrix, scale);
    }

    // Méthode pour obtenir les dimensions d'un mesh spécifique ou de tous les meshes
    getMeshDimensions(meshIndex = null) {
        // Déterminer le facteur d'échelle
        const scaleX = this.scale?.x ?? 1;
        const scaleY = this.scale?.y ?? 1;
        const scaleZ = this.scale?.z ?? 1;

        if (meshIndex !== null) {
            // Retourner les dimensions d'un mesh spécifique
            const mesh = this.meshes[meshIndex];
            if (mesh && mesh.boundingBox) {
                return {
                    meshIndex: meshIndex,
                    width: mesh.boundingBox.width * scaleX,
                    height: mesh.boundingBox.height * scaleY,
                    depth: mesh.boundingBox.depth * scaleZ,
                    boundingBox: {
                        min: {
                            x: mesh.boundingBox.min.x * scaleX,
                            y: mesh.boundingBox.min.y * scaleY,
                            z: mesh.boundingBox.min.z * scaleZ
                        },
                        max: {
                            x: mesh.boundingBox.max.x * scaleX,
                            y: mesh.boundingBox.max.y * scaleY,
                            z: mesh.boundingBox.max.z * scaleZ
                        },
                        width: mesh.boundingBox.width * scaleX,
                        height: mesh.boundingBox.height * scaleY,
                        depth: mesh.boundingBox.depth * scaleZ,
                        center: {
                            x: mesh.boundingBox.center.x * scaleX,
                            y: mesh.boundingBox.center.y * scaleY,
                            z: mesh.boundingBox.center.z * scaleZ
                        }
                    }
                };
            }
            return null;
        } else {
            // Retourner les dimensions de tous les meshes
            return this.meshes.map((mesh, index) => {
                if (mesh.boundingBox) {
                    return {
                        meshIndex: index,
                        width: mesh.boundingBox.width * scaleX,
                        height: mesh.boundingBox.height * scaleY,
                        depth: mesh.boundingBox.depth * scaleZ,
                        boundingBox: {
                            min: {
                                x: mesh.boundingBox.min.x * scaleX,
                                y: mesh.boundingBox.min.y * scaleY,
                                z: mesh.boundingBox.min.z * scaleZ
                            },
                            max: {
                                x: mesh.boundingBox.max.x * scaleX,
                                y: mesh.boundingBox.max.y * scaleY,
                                z: mesh.boundingBox.max.z * scaleZ
                            },
                            width: mesh.boundingBox.width * scaleX,
                            height: mesh.boundingBox.height * scaleY,
                            depth: mesh.boundingBox.depth * scaleZ,
                            center: {
                                x: mesh.boundingBox.center.x * scaleX,
                                y: mesh.boundingBox.center.y * scaleY,
                                z: mesh.boundingBox.center.z * scaleZ
                            }
                        }
                    };
                }
                return null;
            }).filter(dim => dim !== null);
        }
    }

    // Méthode pour obtenir les dimensions globales du modèle (tous les meshes combinés)
    getOverallDimensions() {
        if (this.meshes.length === 0) {
            return null;
        }

        // Déterminer le facteur d'échelle
        const scaleX = this.scale?.x ?? 1;
        const scaleY = this.scale?.y ?? 1;
        const scaleZ = this.scale?.z ?? 1;

        let globalMinX = Infinity, globalMinY = Infinity, globalMinZ = Infinity;
        let globalMaxX = -Infinity, globalMaxY = -Infinity, globalMaxZ = -Infinity;

        this.meshes.forEach(mesh => {
            if (mesh.boundingBox) {
                globalMinX = Math.min(globalMinX, mesh.boundingBox.min.x * scaleX);
                globalMinY = Math.min(globalMinY, mesh.boundingBox.min.y * scaleY);
                globalMinZ = Math.min(globalMinZ, mesh.boundingBox.min.z * scaleZ);

                globalMaxX = Math.max(globalMaxX, mesh.boundingBox.max.x * scaleX);
                globalMaxY = Math.max(globalMaxY, mesh.boundingBox.max.y * scaleY);
                globalMaxZ = Math.max(globalMaxZ, mesh.boundingBox.max.z * scaleZ);
            }
        });

        return {
            min: { x: globalMinX, y: globalMinY, z: globalMinZ },
            max: { x: globalMaxX, y: globalMaxY, z: globalMaxZ },
            width: globalMaxX - globalMinX,
            height: globalMaxY - globalMinY,
            depth: globalMaxZ - globalMinZ,
            center: {
                x: (globalMinX + globalMaxX) / 2,
                y: (globalMinY + globalMaxY) / 2,
                z: (globalMinZ + globalMaxZ) / 2
            }
        };
    }

    // Méthode pour nettoyer proprement les ressources WebGL
    dispose() {
        const gl = this.gl;

        // Supprimer les textures
        this.textures.forEach(texture => {
            if (texture) {
                gl.deleteTexture(texture);
            }
        });
        this.textures = [];

        // Supprimer les VAOs et leurs buffers associés
        this.meshes.forEach(mesh => {
            if (mesh.vao) {
                // Lier le VAO pour accéder à ses buffers
                gl.bindVertexArray(mesh.vao);

                // Récupérer et supprimer les buffers liés au VAO
                // Note: WebGL ne fournit pas de méthode pour lister les buffers d'un VAO,
                // donc on supprime le VAO directement ce qui libère ses références
                gl.bindVertexArray(null);
                gl.deleteVertexArray(mesh.vao);
            }
        });
        this.meshes = [];

        // Nettoyer les références
        this.gltfData = null;
        this.nodeToMeshMap.clear();
        this.skins = [];
        this.jointMatrices = [];
        this.animator = null;
        this.loader = null;
        this.isLoaded = false;
    }
}
