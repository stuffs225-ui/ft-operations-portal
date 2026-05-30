import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { AppLayout } from '../layouts/AppLayout';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { ActionInbox } from '../pages/ActionInbox';
import { Quotations } from '../pages/Quotations';
import { QuotationNew } from '../pages/QuotationNew';
import { QuotationDetail } from '../pages/QuotationDetail';
import { Sales } from '../pages/Sales';
import { SalesCoordinator } from '../pages/SalesCoordinator';
import { Projects } from '../pages/Projects';
import { ProjectNew } from '../pages/ProjectNew';
import { ProjectDetail } from '../pages/ProjectDetail';
import { AdminApprovals } from '../pages/AdminApprovals';
import { WoPnGate } from '../pages/WoPnGate';
import { Procurement } from '../pages/Procurement';
import { ProcurementRequests } from '../pages/ProcurementRequests';
import { ProcurementRequestDetail } from '../pages/ProcurementRequestDetail';
import { ProcurementPurchaseOrders } from '../pages/ProcurementPurchaseOrders';
import { ProcurementPODetail } from '../pages/ProcurementPODetail';
import { ProcurementSuppliers } from '../pages/ProcurementSuppliers';
import { ProcurementSupplierDetail } from '../pages/ProcurementSupplierDetail';
import { ProcurementEtaHistory } from '../pages/ProcurementEtaHistory';
import { Factory } from '../pages/Factory';
import { FactoryProjects } from '../pages/FactoryProjects';
import { FactoryProjectWorkspace } from '../pages/FactoryProjectWorkspace';
import { FactoryRequirements } from '../pages/FactoryRequirements';
import { FactoryRawMaterialRequests } from '../pages/FactoryRawMaterialRequests';
import { FactoryRawMaterialRequestNew } from '../pages/FactoryRawMaterialRequestNew';
import { FactoryMonthlyUpdates } from '../pages/FactoryMonthlyUpdates';
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
            <Route path="quotations" element={<Quotations />} />
            <Route path="quotations/new" element={<QuotationNew />} />
            <Route path="quotations/:id" element={<QuotationDetail />} />
            <Route path="sales" element={<Sales />} />
            <Route path="sales-coordinator" element={<SalesCoordinator />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/new" element={<ProjectNew />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="admin-approvals" element={<AdminApprovals />} />
            <Route path="wo-pn-gate" element={<WoPnGate />} />
            <Route path="procurement" element={<Procurement />} />
            <Route path="procurement/requests" element={<ProcurementRequests />} />
            <Route path="procurement/requests/:id" element={<ProcurementRequestDetail />} />
            <Route path="procurement/purchase-orders" element={<ProcurementPurchaseOrders />} />
            <Route path="procurement/purchase-orders/:id" element={<ProcurementPODetail />} />
            <Route path="procurement/suppliers" element={<ProcurementSuppliers />} />
            <Route path="procurement/suppliers/:id" element={<ProcurementSupplierDetail />} />
            <Route path="procurement/eta-history" element={<ProcurementEtaHistory />} />
            <Route path="factory" element={<Factory />} />
            <Route path="factory/projects" element={<FactoryProjects />} />
            <Route path="factory/projects/:projectId" element={<FactoryProjectWorkspace />} />
            <Route path="factory/requirements" element={<FactoryRequirements />} />
            <Route path="factory/raw-material-requests" element={<FactoryRawMaterialRequests />} />
            <Route path="factory/raw-material-requests/new" element={<FactoryRawMaterialRequestNew />} />
            <Route path="factory/monthly-updates" element={<FactoryMonthlyUpdates />} />
            <Route path="factory/pending-raw-materials" element={<FactoryRawMaterialRequests />} />
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
