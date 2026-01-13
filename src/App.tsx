import { Routes, Route } from 'react-router-dom';
import AuthPage from './views/Auth/AuthPage';
import Dashboard from './views/Dashboard/Layout/DashboardLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';

import OpsChatbot from './components/Chatbot/OpsChatbot';

function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />

      {/* --- RUTA TEMPORAL DE PRUEBA (ACCESO PÚBLICO) --- */}
      <Route path="/test-chat" element={
        <div style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a'
        }}>
          <OpsChatbot />
        </div>
      } />
      {/* ------------------------------------------------ */}

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}

export default App;