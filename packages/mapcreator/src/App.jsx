import { useEffect } from 'react'
import { Engine } from '../../../lib/Engine/Engine.js'
import { Workspace } from './Components/Library/Workspace.jsx';
import { EntityOptions } from './Components/EntityOptions/EntityOptions.jsx';
import { useEntitySelector } from './Components/EntitySelectorProvider/EntitySelectorProvider.jsx';

import './App.css'  

let engine = null;

function App() {
  const { setSelectedEntity } = useEntitySelector();
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
    setSelectedEntity(engine.scene.models[0]); //TEST

    return () => {
      cancelAnimationFrame(render);
      resizeObserver.disconnect();
    }
  }, []);

  return (
    <div className="app-container">
      <div className="main-content">
        <div className="canvas-container">
          <canvas id="glCanvas"></canvas>
        </div>
        <EntityOptions />
      </div>
      <Workspace />   
    </div>
  )
}

export default App
