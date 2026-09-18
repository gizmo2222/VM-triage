import { render } from 'preact';
import '@fontsource/spectral/latin-500.css';
import '@fontsource/spectral/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import './pro.css';
import { App } from './App';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app');
render(<App />, root);
