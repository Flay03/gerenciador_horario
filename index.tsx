
import React from 'react';
import ReactDOM from 'react-dom/client';
import FirebaseAuth from './components/FirebaseAuth'; // Use the authentication component
import ErrorBoundary from './components/ErrorBoundary';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
        <FirebaseAuth /> 
    </ErrorBoundary>
  </React.StrictMode>
);
