import { useEffect, useState } from 'react'
import { Engine } from '../../../lib/Engine/Engine.js'
import { Workspace } from './Components/Library/Workspace.jsx';
import { EntityOptions } from './Components/EntityOptions/EntityOptions.jsx';
import { useEntitySelector } from './Components/EntitySelectorProvider/EntitySelectorProvider.jsx';
import { LightFactory } from '../../../lib/Engine/Light/Light.js';

import './App.css'  

function App() {
  const { setSelectedEntity } = useEntitySelector();
  const [engine, setEngine] =  useState(null);

  useEffect(() => {
    if (!engine) {
      LightFactory.pointLightCount = 0;
      LightFactory.spotLightCount = 0;
      LightFactory.directionalLightCount = 0;
      setEngine(new Engine("glCanvas"));
    }
  }, [engine]);

  // Setup canvas resize and render loop when engine is ready
  useEffect(() => {
    if (!engine) return;

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
    const render = (currentTime) => {
      engine.drawScene(currentTime);
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    // Load initial model if needed
    if (engine.scene.models.length === 0) {
      engine.scene.addNewModel('/models/women/Untitled.gltf', { x: 0, y: 0, z: -5 }, { x: 0.1, y: 0.1, z: 0.1 });
      setEngine((prevState) => { return { ...prevState, test: true }; }); // Trigger re-render
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      resizeObserver.disconnect();
    };
  }, [engine, setSelectedEntity]);

  return (
    <div className="app-container">
      <div className="main-content">
        <div className="canvas-container">
          <canvas id="glCanvas"></canvas>
        </div>
        <EntityOptions />
      </div>
      <Workspace engine={engine} />   
    </div>
  )
}

export default App
