import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { DarkModeProvider } from './context/DarkModeContext';

import App from './App.jsx'
import AuthProvider from './context/authContext.jsx'
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <DarkModeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </DarkModeProvider>
  </BrowserRouter>,
)
