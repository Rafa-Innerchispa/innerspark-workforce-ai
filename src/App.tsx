import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppSidebar from './components/AppSidebar';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import EventsPage from './pages/EventsPage';
import SchedulesPage from './pages/SchedulesPage';
import RequestsPage from './pages/RequestsPage';
import PayrollPage from './pages/PayrollPage';
import IntegrationsPage from './pages/IntegrationsPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="h-screen flex bg-background overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            {/* Inicio */}
            <Route path="/" element={<DashboardPage />} />

            {/* Personas */}
            <Route path="/employees" element={<EmployeesPage />} />

            {/* Tiempo */}
            <Route path="/events" element={<EventsPage />} />
            <Route path="/schedules" element={<SchedulesPage />} />

            {/* Solicitudes */}
            <Route path="/requests" element={<RequestsPage />} />

            {/* Pre-nómina */}
            <Route path="/payroll" element={<PayrollPage />} />

            {/* Integraciones */}
            <Route path="/integrations" element={<IntegrationsPage />} />

            {/* Legacy redirects */}
            <Route path="/settings" element={<Navigate to="/integrations" replace />} />
            <Route path="/exceptions" element={<Navigate to="/requests" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}