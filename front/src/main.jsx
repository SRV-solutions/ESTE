import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ColorModeProvider } from './context/ColorModeContext';
import { FeedbackProvider } from './context/FeedbackContext';


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ColorModeProvider>
      <FeedbackProvider>
        <AuthProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </FeedbackProvider>
    </ColorModeProvider>
  </StrictMode>,
);
