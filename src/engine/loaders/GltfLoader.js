export class GltfLoader {
    constructor() {
        this.gltfData = null;
        this.buffers = [];
        this.images = [];
    }

    async load(gltfPath) {
        try {
            // Charger le fichier GLTF JSON
            const response = await fetch(gltfPath);
            this.gltfData = await response.json();

            // Obtenir le chemin de base pour les ressources
            const basePath = gltfPath.substring(0, gltfPath.lastIndexOf('/') + 1);

            // Charger les buffers binaires
            await this.loadBuffers(basePath);

            // Charger les images/textures
            await this.loadImages(basePath);

            return this.gltfData;
        } catch (error) {
            console.error('Erreur lors du chargement du fichier GLTF:', error);
            throw error;
        }
    }

    async loadBuffers(basePath) {
        const bufferPromises = this.gltfData.buffers.map(async (bufferInfo) => {
            const bufferUri = basePath + bufferInfo.uri;
            const response = await fetch(bufferUri);
            const arrayBuffer = await response.arrayBuffer();
            return arrayBuffer;
        });

        this.buffers = await Promise.all(bufferPromises);
    }

    async loadImages(basePath) {
        if (!this.gltfData.images) {
            return;
        }

        const imagePromises = this.gltfData.images.map((imageInfo) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = basePath + imageInfo.uri;
            });
        });

        this.images = await Promise.all(imagePromises);
    }

    getAccessorData(accessorIndex) {
        const accessor = this.gltfData.accessors[accessorIndex];
        const bufferView = this.gltfData.bufferViews[accessor.bufferView];
        const buffer = this.buffers[bufferView.buffer];

        const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
        const componentTypeMap = {
            5120: Int8Array,
            5121: Uint8Array,
            5122: Int16Array,
            5123: Uint16Array,
            5125: Uint32Array,
            5126: Float32Array
        };

        const TypedArray = componentTypeMap[accessor.componentType];
        const componentSize = {
            'SCALAR': 1,
            'VEC2': 2,
            'VEC3': 3,
            'VEC4': 4,
            'MAT2': 4,
            'MAT3': 9,
            'MAT4': 16
        }[accessor.type];

        const elementSize = TypedArray.BYTES_PER_ELEMENT * componentSize;
        const stride = bufferView.byteStride || elementSize;

        // Si le stride correspond à la taille de l'élément, on peut simplement créer un TypedArray
        if (stride === elementSize) {
            return new TypedArray(buffer, byteOffset, accessor.count * componentSize);
        }

        // Sinon, on doit extraire les données avec le stride
        const data = new TypedArray(accessor.count * componentSize);
        const dataView = new DataView(buffer, byteOffset);

        for (let i = 0; i < accessor.count; i++) {
            for (let j = 0; j < componentSize; j++) {
                const byteIndex = i * stride + j * TypedArray.BYTES_PER_ELEMENT;
                if (TypedArray === Float32Array) {
                    data[i * componentSize + j] = dataView.getFloat32(byteIndex, true);
                } else if (TypedArray === Uint32Array) {
                    data[i * componentSize + j] = dataView.getUint32(byteIndex, true);
                } else if (TypedArray === Uint16Array) {
                    data[i * componentSize + j] = dataView.getUint16(byteIndex, true);
                }
            }
        }

        return data;
    }

    getImage(imageIndex) {
        return this.images[imageIndex];
    }

    getData() {
        return {
            gltf: this.gltfData,
            buffers: this.buffers,
            images: this.images
        };
    }
}
