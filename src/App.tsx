import { Routes, Route } from 'react-router-dom';
import AuthPage from './views/Auth/AuthPage';
import Dashboard from './views/Dashboard/DashboardLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}

export default App;