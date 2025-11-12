import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { EntitySelectorProvider } from './Components/EntitySelectorProvider/EntitySelectorProvider.jsx';

import './index.css'
import 'bootstrap/dist/css/bootstrap.min.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <EntitySelectorProvider>
      <App />
    </EntitySelectorProvider>
  </StrictMode>,
)
