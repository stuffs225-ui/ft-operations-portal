import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { AppLayout } from '../layouts/AppLayout';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { ActionInbox } from '../pages/ActionInbox';
import { QuotationRequests } from '../pages/QuotationRequests';
import { Sales } from '../pages/Sales';
import { SalesCoordinator } from '../pages/SalesCoordinator';
import { Projects } from '../pages/Projects';
import { AdminApprovals } from '../pages/AdminApprovals';
import { WoPnGate } from '../pages/WoPnGate';
import { Procurement } from '../pages/Procurement';
import { Factory } from '../pages/Factory';
import { Store } from '../pages/Store';
import { MaterialCustody } from '../pages/MaterialCustody';
import { VehicleReceiving } from '../pages/VehicleReceiving';
import { MaterialQC } from '../pages/MaterialQC';
import { ProjectQC } from '../pages/ProjectQC';
import { DubaiAFS } from '../pages/DubaiAFS';
import { AfterSales } from '../pages/AfterSales';
import { Reports } from '../pages/Reports';
import { Settings } from '../pages/Settings';
import { AdminUsers } from '../pages/AdminUsers';
import { AuditLog } from '../pages/AuditLog';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public route — must be OUTSIDE the protected AppLayout */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes — AppLayout wraps with ProtectedRoute */}
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="inbox" element={<ActionInbox />} />
            <Route path="quotations" element={<QuotationRequests />} />
            <Route path="sales" element={<Sales />} />
            <Route path="sales-coordinator" element={<SalesCoordinator />} />
            <Route path="projects" element={<Projects />} />
            <Route path="admin-approvals" element={<AdminApprovals />} />
            <Route path="wo-pn-gate" element={<WoPnGate />} />
            <Route path="procurement" element={<Procurement />} />
            <Route path="factory" element={<Factory />} />
            <Route path="store" element={<Store />} />
            <Route path="custody" element={<MaterialCustody />} />
            <Route path="vehicle-receiving" element={<VehicleReceiving />} />
            <Route path="material-qc" element={<MaterialQC />} />
            <Route path="project-qc" element={<ProjectQC />} />
            <Route path="dubai-afs" element={<DubaiAFS />} />
            <Route path="after-sales" element={<AfterSales />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="admin/users" element={<AdminUsers />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
