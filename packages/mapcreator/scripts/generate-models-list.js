import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGltfFiles(dir, baseDir = dir, basePath = '') {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = path.join(basePath, item.name).replace(/\\/g, '/');

    if (item.isDirectory()) {
      // Récursion dans les sous-dossiers
      files.push(...getGltfFiles(fullPath, baseDir, relativePath));
    } else if (item.name.endsWith('.gltf') || item.name.endsWith('.glb')) {
      const fileName = item.name.replace(/\.(gltf|glb)$/, '');
      const folderName = path.basename(path.dirname(fullPath));

      files.push({
        type: folderName === 'models' ? fileName : folderName,
        modelPath: '/models/' + relativePath
      });
    }
  }

  return files;
}

const modelsDir = path.join(__dirname, '../public/models');
const modelsList = getGltfFiles(modelsDir);

// Écrire le fichier JSON
const outputPath = path.join(__dirname, '../public/models-list.json');
fs.writeFileSync(
  outputPath,
  JSON.stringify(modelsList, null, 2)
);