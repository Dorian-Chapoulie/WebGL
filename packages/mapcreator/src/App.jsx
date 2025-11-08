import { useState, useEffect } from 'react'
import { Engine } from '../../../lib/Engine/Engine.js'
import './App.css'

let engine = null;

const models = [
  { name: 'Cube', path: '/models/Cube.gltf' },
  { name: 'Scene', path: '/models/Gltf/scene.gltf' },
  { name: 'Untitled', path: '/models/Untitled.gltf' },
  { name: 'Lion', path: '/models/test/low_poly_lion.gltf' },
  { name: 'Women', path: '/models/women/Untitled.gltf' },
];

function App() {
  const [scale, setScale] = useState({ x: 1, y: 1, z: 1 });
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    const canvas = document.getElementById("glCanvas");

    if (!engine) {
      engine = new Engine("glCanvas");
    }

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;

        // Update WebGL viewport and projection matrix if engine has gl context
        if (engine && engine.gl) {
          engine.gl.viewport(0, 0, canvas.width, canvas.height);
          engine.updateProjectionMatrix();
        }
      }
    };

    // Initial resize
    resizeCanvas();

    // Add resize observer to handle dynamic resizing
    const resizeObserver = new ResizeObserver(resizeCanvas);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const render = (currentTime) => {
      engine.drawScene(currentTime);
      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(render);
      resizeObserver.disconnect();
    }
  }, []);

  const handleImport = () => {
    console.log('Import clicked');
  };

  const handleTest = () => {
    engine.scene.gltfModel.animator.play(1)
  }

  const updateValue = (type, axis, value) => {
    const numValue = parseFloat(value);
    if (type === 'scale') {
      setScale(prev => ({ ...prev, [axis]: numValue }));
    } else if (type === 'position') {
      setPosition(prev => ({ ...prev, [axis]: numValue }));
    } else if (type === 'rotation') {
      setRotation(prev => ({ ...prev, [axis]: numValue }));
    }
  };

  return (
    <div className="app-container">
      <div className="main-content">
        <div className="canvas-container">
          <canvas id="glCanvas"></canvas>
        </div>

        <div className="controls-panel">
          <h3>Controls</h3>

          <div className="control-section">
            <h4>Scale</h4>
            <div className="control-group">
              <label>X: {scale.x.toFixed(2)}</label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={scale.x}
                onChange={(e) => updateValue('scale', 'x', e.target.value)}
              />
            </div>
            <div className="control-group">
              <label>Y: {scale.y.toFixed(2)}</label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={scale.y}
                onChange={(e) => updateValue('scale', 'y', e.target.value)}
              />
            </div>
            <div className="control-group">
              <label>Z: {scale.z.toFixed(2)}</label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={scale.z}
                onChange={(e) => updateValue('scale', 'z', e.target.value)}
              />
            </div>
          </div>

          <div className="control-section">
            <h4>Position</h4>
            <div className="control-group">
              <label>X: {position.x.toFixed(2)}</label>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={position.x}
                onChange={(e) => updateValue('position', 'x', e.target.value)}
              />
            </div>
            <div className="control-group">
              <label>Y: {position.y.toFixed(2)}</label>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={position.y}
                onChange={(e) => updateValue('position', 'y', e.target.value)}
              />
            </div>
            <div className="control-group">
              <label>Z: {position.z.toFixed(2)}</label>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={position.z}
                onChange={(e) => updateValue('position', 'z', e.target.value)}
              />
            </div>
          </div>

          <div className="control-section">
            <h4>Rotation</h4>
            <div className="control-group">
              <label>X: {rotation.x.toFixed(2)}</label>
              <input
                type="range"
                min="0"
                max="6.28"
                step="0.01"
                value={rotation.x}
                onChange={(e) => updateValue('rotation', 'x', e.target.value)}
              />
            </div>
            <div className="control-group">
              <label>Y: {rotation.y.toFixed(2)}</label>
              <input
                type="range"
                min="0"
                max="6.28"
                step="0.01"
                value={rotation.y}
                onChange={(e) => updateValue('rotation', 'y', e.target.value)}
              />
            </div>
            <div className="control-group">
              <label>Z: {rotation.z.toFixed(2)}</label>
              <input
                type="range"
                min="0"
                max="6.28"
                step="0.01"
                value={rotation.z}
                onChange={(e) => updateValue('rotation', 'z', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="models-gallery">
        <div className="buttons-container">
          <button className="import-btn" onClick={handleImport}>
            Importer
          </button>
          <button className="import-btn" onClick={handleTest}>
            Test
          </button>
        </div>
        <div className="models-list">
          {models.map((model, index) => (
            <div key={index} className="model-item">
              <div className="model-icon">📦</div>
              <span className="model-name">{model.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
