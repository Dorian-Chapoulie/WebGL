import { Engine } from './engine/base'

function App() {

  return (
    <div style={{ 
      backgroundColor: '#1a1a1a', 
      minHeight: '100vh', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ 
        color: 'white', 
        textAlign: 'center', 
        marginBottom: '20px' 
      }}>
        3D Cube Position Controller
      </h1>
      <Engine />
    </div>
  )
}

export default App
