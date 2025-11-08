import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { Engine } from '../../../lib/Engine/Engine.js'
import './App.css'

let engine = null;

function App() {
  const [count, setCount] = useState(0)

  useEffect(() => {
        if (!engine) {
            engine = new Engine("glCanvas");
        }

        const render = (currentTime) => {
            engine.drawScene(currentTime);
            requestAnimationFrame(render);
        };
        
        requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(render);
        }
    }, []);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <canvas id="glCanvas" width="640" height="480"></canvas>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
