import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/playground/react/App';

const element = document.getElementById('root');
if (!element) throw new Error('The React example needs a root element');
createRoot(element).render(<App />);
