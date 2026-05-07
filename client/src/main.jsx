import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// PrimeReact Styles
import "primereact/resources/themes/lara-light-blue/theme.css";  // default theme
import "primereact/resources/primereact.min.css";                  // core css
import "primeicons/primeicons.css";                                // icons

import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
