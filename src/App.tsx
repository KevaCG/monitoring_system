import { Routes, Route } from 'react-router-dom';
import AuthPage from './views/Auth/AuthPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import DashboardLayout from './views/Dashboard/Layout/DashboardLayout';

function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />} />
      </Route>
    </Routes>
  );
}

export default App;