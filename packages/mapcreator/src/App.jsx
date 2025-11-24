import { useCallback, useEffect, useRef, useState } from 'react'
import { mat4, vec3 } from "gl-matrix";
import { Engine, defaultSceneData } from '../../../lib/Engine/Engine.js'
import { Workspace } from './Components/Library/Workspace.jsx';
import { EntityOptions } from './Components/EntityOptions/EntityOptions.jsx';
import { useEntitySelector } from './Components/EntitySelectorProvider/EntitySelectorProvider.jsx';
import { Light } from '../../../lib/Engine/Light/Light.js';
import { MenuBar } from './Components/MenuBar/MenuBar.jsx';
import { Scene } from '../../../lib/Engine/Scene.js';

import './App.css'  

function App() {
  const { setSelectedEntity, setSelectedEntityOptions } = useEntitySelector();
  const engineRef = useRef(null);
  const canvasRef = useRef(null);
  const [fps, setFps] = useState(0);

  const handleKeyDown = useCallback((e) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (e.code === 'Escape') {
      document.exitPointerLock();
      return;
    }

    console.debug(e);   
        
    const right = vec3.create();
        
    if (e.code === 'KeyW') {
      const forward = vec3.create();
      vec3.scale(forward, engine.cameraFront, engine.cameraSpeed);
      vec3.add(engine.cameraPosition, engine.cameraPosition, forward);
    }
    if (e.code === 'KeyS') {
      const backward = vec3.create();
      vec3.scale(backward, engine.cameraFront, engine.cameraSpeed);
      vec3.subtract(engine.cameraPosition, engine.cameraPosition, backward);
    }
    if (e.code === 'KeyA') {
      vec3.cross(right, engine.cameraFront, engine.cameraUp);
      vec3.normalize(right, right);
      vec3.scale(right, right, engine.cameraSpeed);
      vec3.subtract(engine.cameraPosition, engine.cameraPosition, right);
    }
    if (e.code === 'KeyD') {
      vec3.cross(right, engine.cameraFront, engine.cameraUp);
      vec3.normalize(right, right);
      vec3.scale(right, right, engine.cameraSpeed);
      vec3.add(engine.cameraPosition, engine.cameraPosition, right);
    }
        
    // Update view matrix after camera movement
    const target = vec3.create();
    vec3.add(target, engine.cameraPosition, engine.cameraFront);
    mat4.lookAt(engine.viewMatrix, engine.cameraPosition, target, engine.cameraUp);
  }, []);

  const handleMouseMove = useCallback((e) => {
    const engine = engineRef.current;
    if (!engine) return;
    // Only handle mouse movement when pointer is locked
    if (document.pointerLockElement !== canvasRef.current) {
      return;
    }
        
    // When using pointer lock, use movementX and movementY instead of clientX/clientY
    const xoffset = e.movementX || 0;
    const yoffset = -(e.movementY || 0); // Invert Y-axis for natural mouse look


    const adjustedXoffset = xoffset * engine.sensitivity;
    const adjustedYoffset = yoffset * engine.sensitivity;

    engine.yaw += adjustedXoffset;
    engine.pitch += adjustedYoffset;
    
    if (engine.pitch > 89.0)
      engine.pitch = 89.0;
    if (engine.pitch < -89.0)
      engine.pitch = -89.0;

    if (engine.yaw > 360.0)
      engine.yaw = 0.0;
    if (engine.yaw < -360.0)
      engine.yaw = 0.0;
    
    // Calculate new camera front direction
    const direction = vec3.create();
    direction[0] = Math.cos(engine.yaw * Math.PI / 180) * Math.cos(engine.pitch * Math.PI / 180);
    direction[1] = Math.sin(engine.pitch * Math.PI / 180);
    direction[2] = Math.sin(engine.yaw * Math.PI / 180) * Math.cos(engine.pitch * Math.PI / 180);
    vec3.normalize(engine.cameraFront, direction);
        
    // Update view matrix after mouse movement
    const target = vec3.create();
    vec3.add(target, engine.cameraPosition, engine.cameraFront);
    mat4.lookAt(engine.viewMatrix, engine.cameraPosition, target, engine.cameraUp);
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) {
      Light.pointLightCount = 0;
      Light.spotLightCount = 0;
      Light.directionalLightCount = 0;
      engineRef.current = new Engine("glCanvas");
      window.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousemove', handleMouseMove);
    }
  }, [handleKeyDown, handleMouseMove]);

  // Setup canvas resize and render loop when engine is ready
  useEffect(() => {
    const engine = engineRef.current;
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
      resizeObserver.disconnect();
    };
  }, [setSelectedEntity]);

  const getFirstLightData = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !engine.scene || engine.scene.lights.length === 0) return {};
    const entity = engine.scene.lights[0]; 
    const newOptions = {};
    Object.keys(entity.getParams()).map((key) => {
      const value = entity[key];
      newOptions[key] = value;
    });
    return { entity, newOptions }; 
  }, []);
  
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !engine.scene || engine.scene.lights.length === 0) return;
    const { entity, newOptions } = getFirstLightData();
    setSelectedEntityOptions(newOptions);
    setSelectedEntity(entity);
  }, [getFirstLightData, setSelectedEntity, setSelectedEntityOptions]);


  const handleClickOpen = () => {
    const engine = engineRef.current;
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
    const engine = engineRef.current;
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
    const engine = engineRef.current;
    if (!engine) return;

    if (engine.scene) {
      engine.scene.lights.forEach(light => engine.scene.deleteEntity(light.id));
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
          <canvas ref={canvasRef} id="glCanvas"></canvas>
        </div>
        <EntityOptions engine={engineRef.current} />
      </div>
      <Workspace engine={engineRef.current} />
    </div>
  )
}

export default App


/*const handleKeyDown = useCallback((e) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (e.code === 'Escape') {
      document.exitPointerLock();
      return;
    }

    console.debug(e);   
        
    const right = vec3.create();
        
    if (e.code === 'KeyW') {
      const forward = vec3.create();
      vec3.scale(forward, engine.cameraFront, engine.cameraSpeed);
      vec3.add(engine.cameraPosition, engine.cameraPosition, forward);
    }
    if (e.code === 'KeyS') {
      const backward = vec3.create();
      vec3.scale(backward, engine.cameraFront, engine.cameraSpeed);
      vec3.subtract(engine.cameraPosition, engine.cameraPosition, backward);
    }
    if (e.code === 'KeyA') {
      vec3.cross(right, engine.cameraFront, engine.cameraUp);
      vec3.normalize(right, right);
      vec3.scale(right, right, engine.cameraSpeed);
      vec3.subtract(engine.cameraPosition, engine.cameraPosition, right);
    }
    if (e.code === 'KeyD') {
      vec3.cross(right, engine.cameraFront, engine.cameraUp);
      vec3.normalize(right, right);
      vec3.scale(right, right, engine.cameraSpeed);
      vec3.add(engine.cameraPosition, engine.cameraPosition, right);
    }
        
    // Update view matrix after camera movement
    const target = vec3.create();
    vec3.add(target, engine.cameraPosition, engine.cameraFront);
    mat4.lookAt(engine.viewMatrix, engine.cameraPosition, target, engine.cameraUp);
  }, []);

  const handleMouseMove = useCallback((e) => {
    const engine = engineRef.current;
    if (!engine) return;
    // Only handle mouse movement when pointer is locked
    if (document.pointerLockElement !== canvasRef.current) {
      return;
    }
        
    // When using pointer lock, use movementX and movementY instead of clientX/clientY
    const xoffset = e.movementX || 0;
    const yoffset = -(e.movementY || 0); // Invert Y-axis for natural mouse look


    const adjustedXoffset = xoffset * engine.sensitivity;
    const adjustedYoffset = yoffset * engine.sensitivity;

    engine.yaw += adjustedXoffset;
    engine.pitch += adjustedYoffset;
    
    if (engine.pitch > 89.0)
      engine.pitch = 89.0;
    if (engine.pitch < -89.0)
      engine.pitch = -89.0;

    if (engine.yaw > 360.0)
      engine.yaw = 0.0;
    if (engine.yaw < -360.0)
      engine.yaw = 0.0;
    
    // Calculate new camera front direction
    const direction = vec3.create();
    direction[0] = Math.cos(engine.yaw * Math.PI / 180) * Math.cos(engine.pitch * Math.PI / 180);
    direction[1] = Math.sin(engine.pitch * Math.PI / 180);
    direction[2] = Math.sin(engine.yaw * Math.PI / 180) * Math.cos(engine.pitch * Math.PI / 180);
    vec3.normalize(engine.cameraFront, direction);
        
    // Update view matrix after mouse movement
    const target = vec3.create();
    vec3.add(target, engine.cameraPosition, engine.cameraFront);
    mat4.lookAt(engine.viewMatrix, engine.cameraPosition, target, engine.cameraUp);
  }, []);*/
