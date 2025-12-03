import { Routes, Route } from 'react-router-dom';
import AuthPage from './views/Auth/AuthPage';
import Dashboard from './views/Dashboard/DashboardLayout';

function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />

      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default App;