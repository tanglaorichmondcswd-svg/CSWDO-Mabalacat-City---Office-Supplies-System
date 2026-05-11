import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Monitoring from './pages/Monitoring';
import Inventory from './pages/Inventory';
import Deliveries from './pages/Deliveries';
import Requests from './pages/Requests';
import Budgets from './pages/Budgets';
import Users from './pages/Users';
import Reports from './pages/Reports';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster 
        position="top-right"
        expand={false}
        richColors
        closeButton
        toastOptions={{
          style: {
            background: 'white',
            borderRadius: '1.5rem',
            border: '1px solid #f1f5f9',
            padding: '1.25rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)',
          },
          className: 'font-sans font-bold text-xs uppercase tracking-widest',
        }}
      />
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/deliveries" element={<Deliveries />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/users" element={<Users />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
