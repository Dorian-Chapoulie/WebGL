import { mat4 } from "gl-matrix";
import { GltfLoader } from "../loaders/GltfLoader";

export class GltfModel {
    constructor(gl, programInfo) {
        this.gl = gl;
        this.programInfo = programInfo;
        this.meshes = [];
        this.textures = [];
        this.modelMatrix = mat4.create();
        this.isLoaded = false;
        this.loader = new GltfLoader();
    }

    async load(gltfPath) {
        try {
            await this.loader.load(gltfPath);
            const data = this.loader.getData();
            const gltf = data.gltf;

            // Charger les textures
            this.loadTextures(data.images, gltf);

            // Charger les meshes
            this.loadMeshes(gltf);

            this.isLoaded = true;
            console.log('Modèle GLTF chargé avec succès');
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

        gltf.meshes.forEach((mesh) => {
            mesh.primitives.forEach((primitive) => {
                const meshData = {
                    vao: gl.createVertexArray(),
                    indexCount: 0,
                    material: primitive.material !== undefined ? gltf.materials[primitive.material] : null
                };

                gl.bindVertexArray(meshData.vao);

                // Charger les attributs (POSITION, NORMAL, TEXCOORD_0, etc.)
                if (primitive.attributes.POSITION !== undefined) {
                    const positionData = this.loader.getAccessorData(primitive.attributes.POSITION);
                    const positionBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, positionData, gl.STATIC_DRAW);
                    gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);
                    gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
                }

                if (primitive.attributes.NORMAL !== undefined) {
                    const normalData = this.loader.getAccessorData(primitive.attributes.NORMAL);
                    const normalBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, normalData, gl.STATIC_DRAW);
                    gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexNormal);
                    gl.vertexAttribPointer(this.programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
                }

                if (primitive.attributes.TEXCOORD_0 !== undefined) {
                    const texCoordData = this.loader.getAccessorData(primitive.attributes.TEXCOORD_0);
                    const texCoordBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, texCoordData, gl.STATIC_DRAW);
                    gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexTexCoord);
                    gl.vertexAttribPointer(this.programInfo.attribLocations.vertexTexCoord, 2, gl.FLOAT, false, 0, 0);
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

    draw(gl, programInfo, viewMatrix, projectionMatrix, position = [0, 0, 0], scale = [1, 1, 1], rotation = 0) {
        if (!this.isLoaded) {
            return;
        }

        gl.useProgram(programInfo.program);

        // Créer la matrice de modèle
        mat4.identity(this.modelMatrix);
        mat4.translate(this.modelMatrix, this.modelMatrix, position);
        mat4.rotate(this.modelMatrix, this.modelMatrix, rotation, [0, 1, 0]);
        mat4.scale(this.modelMatrix, this.modelMatrix, scale);

        // Définir les matrices uniformes
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelMatrix, false, this.modelMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.viewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);

        // Dessiner chaque mesh
        this.meshes.forEach((mesh, index) => {
            gl.bindVertexArray(mesh.vao);

            // Bind les textures si elles existent
            if (mesh.material && mesh.material.pbrMetallicRoughness) {
                const pbr = mesh.material.pbrMetallicRoughness;

                // Texture diffuse (baseColorTexture)
                if (pbr.baseColorTexture !== undefined) {
                    const textureIndex = pbr.baseColorTexture.index;
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, this.textures[textureIndex]);
                    gl.uniform1i(gl.getUniformLocation(programInfo.program, 'material.diffuse'), 0);
                }

                // Pour l'instant, on peut utiliser la même texture pour le specular
                // Dans un vrai moteur PBR, on utiliserait metallicRoughnessTexture différemment
                if (pbr.metallicRoughnessTexture !== undefined) {
                    const textureIndex = pbr.metallicRoughnessTexture.index;
                    gl.activeTexture(gl.TEXTURE1);
                    gl.bindTexture(gl.TEXTURE_2D, this.textures[textureIndex]);
                    gl.uniform1i(gl.getUniformLocation(programInfo.program, 'material.specular'), 1);
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
        });

        gl.bindVertexArray(null);
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
}
