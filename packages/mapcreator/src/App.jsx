import { useCallback, useEffect, useState } from 'react'
import { Engine } from '../../../lib/Engine/Engine.js'
import { Workspace } from './Components/Library/Workspace.jsx';
import { EntityOptions } from './Components/EntityOptions/EntityOptions.jsx';
import { useEntitySelector } from './Components/EntitySelectorProvider/EntitySelectorProvider.jsx';
import { Light, LIGHT_TYPES } from '../../../lib/Engine/Light/Light.js';
import { MenuBar } from './Components/MenuBar/MenuBar.jsx';
import { Scene } from '../../../lib/Engine/Scene.js';

import './App.css'  

function App() {
  const { setSelectedEntity, setSelectedEntityOptions } = useEntitySelector();
  const [engine, setEngine] =  useState(null);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (!engine) {
      Light.pointLightCount = 0;
      Light.spotLightCount = 0;
      Light.directionalLightCount = 0;
      setEngine(new Engine("glCanvas"));
    }
  }, [engine]);

  // Setup canvas resize and render loop when engine is ready
  useEffect(() => {
    if (!engine) return;
    engine.startAutoSave();

    const canvas = document.getElementById("glCanvas");
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;

        // Update WebGL viewport and projection matrix if engine has gl context
        if (engine.gl) {
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

    // Animation loop
    let animationFrameId;
    let frameCount = 0;
    let fpsUpdateTime = 0;

    const render = (currentTime) => {
      engine.drawScene(currentTime);

      // Calculate FPS
      frameCount++;
      const deltaTime = currentTime - fpsUpdateTime;

      // Update FPS every 500ms
      if (deltaTime >= 500) {
        const currentFps = Math.round((frameCount * 1000) / deltaTime);
        setFps(currentFps);
        frameCount = 0;
        fpsUpdateTime = currentTime;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (engine) engine.destroy();
      resizeObserver.disconnect();
    };
  }, [engine, setSelectedEntity]);

  const getFirstLightData = useCallback(() => {
    const entity = engine.scene.lights[0]; 
    const newOptions = {};
    Object.keys(entity.getParams()).map((key) => {
      const value = entity[key];
      newOptions[key] = value;
    });
    return { entity, newOptions }; 
  }, [engine]);

  useEffect(() => {
    if (!engine || !engine.scene || engine.scene.lights.length === 0) return;
    const { entity, newOptions } = getFirstLightData();
    setSelectedEntityOptions(newOptions);
    setSelectedEntity(entity);
  }, [getFirstLightData, setSelectedEntity, setSelectedEntityOptions, engine]);


  const handleClickOpen = () => {
    if (!engine) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const sceneData = JSON.parse(event.target.result);

          // Clear existing lights
          if (engine.scene) {
            engine.scene.destroy();
          }

          // Load new scene
          engine.scene = new Scene(engine, sceneData);

          const { entity, newOptions } = getFirstLightData();
          setSelectedEntityOptions(newOptions);
          setSelectedEntity(entity);
        } catch (error) {
          console.error('Error loading scene:', error);
          alert('Failed to load scene file. Please check the file format.');
        }
      };

      reader.readAsText(file);
    };

    input.click();
  };

  const handleClickSave = () => {
    if (!engine || !engine.scene) return;

    const sceneData = engine.scene.toJSON();
    const jsonString = JSON.stringify(sceneData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'scene.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClickNew = async () => {
    if (!engine) return;

    if (engine.scene) {
      engine.scene.lights.forEach(light => engine.scene.deleteEntity(light.id));
    }

    const defaultSceneData = {
      lights: [
        {
          type: LIGHT_TYPES.DIRECTIONAL,
          ambient: { x: 1, y: 1, z: 1 },
          diffuse: { x: 1, y: 1, z: 1 },
          specular: { x: 1, y: 1, z: 1 },
          direction: { x: -0.2, y: -1.0, z: -0.3}
        }
      ],
    }
    engine.scene = new Scene(engine, defaultSceneData);
    const { entity, newOptions } = getFirstLightData();
    setSelectedEntityOptions(newOptions);
    setSelectedEntity(entity);
  };

  return (
    <div className="app-container">
      <MenuBar onClickOpen={handleClickOpen} onClickSave={handleClickSave} onClickNew={handleClickNew} >
        <strong style={{ fontSize: '13px', color: '#646cff' }} className='ms-auto me-2'>FPS: {fps}</strong>
      </MenuBar>
      <div className="main-content">
        <div className="canvas-container">
          <canvas id="glCanvas"></canvas>
        </div>
        <EntityOptions engine={engine} />
      </div>
      <Workspace engine={engine} />
    </div>
  )
}

export default App
