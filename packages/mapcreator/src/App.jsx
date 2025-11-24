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

  // Blender-style camera state
  const cameraStateRef = useRef({
    isMiddleMouseDown: false,
    isPanning: false,
    lastMouseX: 0,
    lastMouseY: 0,
    target: vec3.fromValues(0, 0, 0), // Point pivot
    distance: 0, // Distance from target
    azimuth: 0, // Rotation horizontale (en degrés)
    elevation: 0, // Rotation verticale (en degrés)
  });

  // Update camera position based on orbital parameters
  const updateCamera = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const state = cameraStateRef.current;

    // Convert spherical coordinates to cartesian
    const azimuthRad = state.azimuth * Math.PI / 180;
    const elevationRad = state.elevation * Math.PI / 180;

    // Calculate camera position relative to target
    const x = state.distance * Math.cos(elevationRad) * Math.cos(azimuthRad);
    const y = state.distance * Math.sin(elevationRad);
    const z = state.distance * Math.cos(elevationRad) * Math.sin(azimuthRad);

    // Set camera position
    vec3.set(engine.cameraPosition,
      state.target[0] + x,
      state.target[1] + y,
      state.target[2] + z
    );

    // Update view matrix to look at target
    mat4.lookAt(engine.viewMatrix, engine.cameraPosition, state.target, engine.cameraUp);
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (e.button === 1) { // Middle mouse button
      e.preventDefault();
      const state = cameraStateRef.current;
      state.isMiddleMouseDown = true;
      state.isPanning = e.shiftKey;
      state.lastMouseX = e.clientX;
      state.lastMouseY = e.clientY;
    }
  }, []);

  const handleMouseUp = useCallback((e) => {
    if (e.button === 1) {
      e.preventDefault();
      const state = cameraStateRef.current;
      state.isMiddleMouseDown = false;
      state.isPanning = false;
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    const state = cameraStateRef.current;
    if (!state.isMiddleMouseDown) return;

    const deltaX = e.clientX - state.lastMouseX;
    const deltaY = e.clientY - state.lastMouseY;

    state.lastMouseX = e.clientX;
    state.lastMouseY = e.clientY;

    if (state.isPanning) {
      // Pan mode (Shift + middle mouse): move the target point
      const engine = engineRef.current;
      if (!engine) return;

      // Calculate pan speed based on distance
      const panSpeed = state.distance * 0.001;

      // Get camera right and up vectors
      const right = vec3.create();
      const cameraDir = vec3.create();
      vec3.subtract(cameraDir, engine.cameraPosition, state.target);
      vec3.normalize(cameraDir, cameraDir);
      vec3.cross(right, engine.cameraUp, cameraDir);
      vec3.normalize(right, right);

      const up = vec3.create();
      vec3.cross(up, cameraDir, right);
      vec3.normalize(up, up);

      // Move target
      const rightMove = vec3.create();
      const upMove = vec3.create();
      vec3.scale(rightMove, right, -deltaX * panSpeed);
      vec3.scale(upMove, up, deltaY * panSpeed);

      vec3.add(state.target, state.target, rightMove);
      vec3.add(state.target, state.target, upMove);
    } else {
      // Orbit mode (middle mouse): rotate around target
      const rotateSpeed = 0.5;
      state.azimuth += deltaX * rotateSpeed;
      state.elevation += deltaY * rotateSpeed;

      // Clamp elevation to prevent gimbal lock
      state.elevation = Math.max(-89, Math.min(89, state.elevation));
    }

    updateCamera();
  }, [updateCamera]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const state = cameraStateRef.current;

    // Zoom: adjust distance from target
    const zoomSpeed = 0.1;
    const delta = e.deltaY > 0 ? 1 : -1;
    state.distance *= (1 + delta * zoomSpeed);

    // Clamp distance
    state.distance = Math.max(0.5, Math.min(100, state.distance));

    updateCamera();
  }, [updateCamera]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) {
      Light.pointLightCount = 0;
      Light.spotLightCount = 0;
      Light.directionalLightCount = 0;
      engineRef.current = new Engine("glCanvas");

      // Initialize camera with orbital controls
      updateCamera();
    }
  }, [updateCamera]);

  // Setup mouse event listeners for Blender-style controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleMouseDown, handleMouseUp, handleMouseMove, handleWheel]);

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
