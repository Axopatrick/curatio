import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css' // ou supprime cette ligne si tu n'as pas de fichier CSS séparé

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)