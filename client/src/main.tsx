import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
// Import logo for favicon and sidebar
import "./assets/logo.png";

// Enhanced error handling to help with debugging
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Console logging for diagnostics
console.log('Application starting, environment:', import.meta.env.MODE);
console.log('Base URL:', window.location.origin);

// Find the root element
const rootElement = document.getElementById("root");

if (rootElement) {
  try {
    createRoot(rootElement).render(
      <>
        <App />
        <Toaster />
      </>
    );
    console.log('React app rendered successfully');
  } catch (error) {
    console.error('Failed to render React application:', error);
    
    // Display a fallback UI in case of rendering error
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h1>Application Error</h1>
        <p>Sorry, there was a problem loading the application. Please try refreshing the page.</p>
        <p>Technical detail: ${error instanceof Error ? error.message : String(error)}</p>
      </div>
    `;
  }
} else {
  console.error('Root element not found, cannot mount React application');
}
