import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Initialize Constructor.io global tracking object
window.cnstrc = window.cnstrc || {};
window.cnstrc.indexKey = 'key_x6UnCVRZaJgIHFQD';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
