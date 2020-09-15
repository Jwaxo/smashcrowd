import React from 'react';
import { render } from 'react-dom';
import './css/app.css';
import App from './js/app';

render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
