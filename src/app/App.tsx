import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { AppLayout } from '../layouts/AppLayout';
import { RequireRole } from '../components/auth/RequireRole';
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
import { StoreReceipts } from '../pages/StoreReceipts';
import { StoreReceiptNew } from '../pages/StoreReceiptNew';
import { StoreReceiptDetail } from '../pages/StoreReceiptDetail';
import { StoreVehicleReceiving } from '../pages/StoreVehicleReceiving';
import { StoreVehicleReceivingNew } from '../pages/StoreVehicleReceivingNew';
import { StoreVehicleReceivingDetail } from '../pages/StoreVehicleReceivingDetail';
import { StoreInventory } from '../pages/StoreInventory';
import { StoreUnallocated } from '../pages/StoreUnallocated';
import { CustodyNew } from '../pages/CustodyNew';
import { CustodyDetail } from '../pages/CustodyDetail';
import { MaterialQC } from '../pages/MaterialQC';
import { MaterialQcInspections } from '../pages/MaterialQcInspections';
import { MaterialQcInspectionDetail } from '../pages/MaterialQcInspectionDetail';
import { MaterialNcrs } from '../pages/MaterialNcrs';
import { MaterialNcrDetail } from '../pages/MaterialNcrDetail';
import { ProjectQC } from '../pages/ProjectQC';
import { ProjectQcInspections } from '../pages/ProjectQcInspections';
import { ProjectQcInspectionDetail } from '../pages/ProjectQcInspectionDetail';
import { ProjectQcFindings } from '../pages/ProjectQcFindings';
import { ProjectQcFindingDetail } from '../pages/ProjectQcFindingDetail';
import { ProjectQcReleaseNotes } from '../pages/ProjectQcReleaseNotes';
import { ProjectQcReleaseNoteDetail } from '../pages/ProjectQcReleaseNoteDetail';
import { DubaiAFS } from '../pages/DubaiAFS';
import { DubaiAfsProjects } from '../pages/DubaiAfsProjects';
import { DubaiAfsProjectDetail } from '../pages/DubaiAfsProjectDetail';
import { DubaiAfsEta } from '../pages/DubaiAfsEta';
import { DubaiAfsArrivalReports } from '../pages/DubaiAfsArrivalReports';
import { DubaiAfsArrivalReportDetail } from '../pages/DubaiAfsArrivalReportDetail';
import { DubaiAfsMissingItems } from '../pages/DubaiAfsMissingItems';
import { DubaiAfsPredeliveryReports } from '../pages/DubaiAfsPredeliveryReports';
import { DubaiAfsPredeliveryReportDetail } from '../pages/DubaiAfsPredeliveryReportDetail';
import { DubaiAfsConditionReports } from '../pages/DubaiAfsConditionReports';
import { AfterSales } from '../pages/AfterSales';
import { AfterSalesMaintenance } from '../pages/AfterSalesMaintenance';
import { AfterSalesMaintenanceNew } from '../pages/AfterSalesMaintenanceNew';
import { AfterSalesMaintenanceDetail } from '../pages/AfterSalesMaintenanceDetail';
import { Reports } from '../pages/Reports';
import { ReportsExecutive } from '../pages/ReportsExecutive';
import { ControlTower } from '../pages/ControlTower';
import { ReportsProjects } from '../pages/ReportsProjects';
import { ReportsSales } from '../pages/ReportsSales';
import { ReportsProcurement } from '../pages/ReportsProcurement';
import { ReportsFactory } from '../pages/ReportsFactory';
import { ReportsStore } from '../pages/ReportsStore';
import { ReportsQC } from '../pages/ReportsQC';
import { ReportsAFS } from '../pages/ReportsAFS';
import { ReportsSuppliers } from '../pages/ReportsSuppliers';
import { ReportsSLA } from '../pages/ReportsSLA';
import { ReportsDataQuality } from '../pages/ReportsDataQuality';
import { ReportsHealthScores } from '../pages/ReportsHealthScores';
import { ReportsIssues } from '../pages/ReportsIssues';
import { ReportsCapa } from '../pages/ReportsCapa';
import { Settings } from '../pages/Settings';
import { AdminUsers } from '../pages/AdminUsers';
import { AuditLog } from '../pages/AuditLog';
import { RequestAccess } from '../pages/RequestAccess';
import { Templates } from '../pages/Templates';
import { TemplateNew } from '../pages/TemplateNew';
import { TemplateDetail } from '../pages/TemplateDetail';
import { TemplateApprovals } from '../pages/TemplateApprovals';
import { TemplateGenerate } from '../pages/TemplateGenerate';
import { GeneratedDocuments } from '../pages/GeneratedDocuments';
import { GeneratedDocumentDetail } from '../pages/GeneratedDocumentDetail';
import { AdminAccessRequests } from '../pages/AdminAccessRequests';
import { AdminAccessRequestDetail } from '../pages/AdminAccessRequestDetail';
import { Notifications } from '../pages/Notifications';
import { NotificationSettings } from '../pages/NotificationSettings';
import { AdminNotificationRules } from '../pages/AdminNotificationRules';
import { AdminReportSubscriptions } from '../pages/AdminReportSubscriptions';
import { AdminReportSubscriptionDetail } from '../pages/AdminReportSubscriptionDetail';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes — must be OUTSIDE the protected AppLayout */}
          <Route path="/login" element={<Login />} />
          <Route path="/request-access" element={<RequestAccess />} />

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
            <Route path="admin-approvals" element={<RequireRole roles={['operations_manager']}><AdminApprovals /></RequireRole>} />
            <Route path="wo-pn-gate" element={<RequireRole roles={['operations_manager', 'factory_user']}><WoPnGate /></RequireRole>} />
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
            <Route path="store/receipts" element={<StoreReceipts />} />
            <Route path="store/receipts/new" element={<StoreReceiptNew />} />
            <Route path="store/receipts/:id" element={<StoreReceiptDetail />} />
            <Route path="store/vehicle-receiving" element={<StoreVehicleReceiving />} />
            <Route path="store/vehicle-receiving/new" element={<StoreVehicleReceivingNew />} />
            <Route path="store/vehicle-receiving/:id" element={<StoreVehicleReceivingDetail />} />
            <Route path="store/inventory" element={<StoreInventory />} />
            <Route path="store/unallocated" element={<StoreUnallocated />} />
            <Route path="custody" element={<MaterialCustody />} />
            <Route path="custody/new" element={<CustodyNew />} />
            <Route path="custody/:id" element={<CustodyDetail />} />
            <Route path="vehicle-receiving" element={<VehicleReceiving />} />
            <Route path="material-qc" element={<MaterialQC />} />
            <Route path="material-qc/inspections" element={<MaterialQcInspections />} />
            <Route path="material-qc/inspections/:id" element={<MaterialQcInspectionDetail />} />
            <Route path="material-qc/ncrs" element={<MaterialNcrs />} />
            <Route path="material-qc/ncrs/:id" element={<MaterialNcrDetail />} />
            <Route path="project-qc" element={<ProjectQC />} />
            <Route path="project-qc/inspections" element={<ProjectQcInspections />} />
            <Route path="project-qc/inspections/:id" element={<ProjectQcInspectionDetail />} />
            <Route path="project-qc/findings" element={<ProjectQcFindings />} />
            <Route path="project-qc/findings/:id" element={<ProjectQcFindingDetail />} />
            <Route path="project-qc/release-notes" element={<ProjectQcReleaseNotes />} />
            <Route path="project-qc/release-notes/:id" element={<ProjectQcReleaseNoteDetail />} />
            <Route path="dubai-afs" element={<DubaiAFS />} />
            <Route path="dubai-afs/projects" element={<DubaiAfsProjects />} />
            <Route path="dubai-afs/projects/:id" element={<DubaiAfsProjectDetail />} />
            <Route path="dubai-afs/eta" element={<DubaiAfsEta />} />
            <Route path="dubai-afs/arrival-reports" element={<DubaiAfsArrivalReports />} />
            <Route path="dubai-afs/arrival-reports/:id" element={<DubaiAfsArrivalReportDetail />} />
            <Route path="dubai-afs/missing-items" element={<DubaiAfsMissingItems />} />
            <Route path="dubai-afs/predelivery-reports" element={<DubaiAfsPredeliveryReports />} />
            <Route path="dubai-afs/predelivery-reports/:id" element={<DubaiAfsPredeliveryReportDetail />} />
            <Route path="dubai-afs/condition-reports" element={<DubaiAfsConditionReports />} />
            <Route path="after-sales" element={<AfterSales />} />
            <Route path="after-sales/maintenance" element={<AfterSalesMaintenance />} />
            <Route path="after-sales/maintenance/new" element={<AfterSalesMaintenanceNew />} />
            <Route path="after-sales/maintenance/:id" element={<AfterSalesMaintenanceDetail />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/executive" element={<ReportsExecutive />} />
            <Route path="reports/projects" element={<ReportsProjects />} />
            <Route path="reports/sales" element={<ReportsSales />} />
            <Route path="reports/procurement" element={<ReportsProcurement />} />
            <Route path="reports/factory" element={<ReportsFactory />} />
            <Route path="reports/store" element={<ReportsStore />} />
            <Route path="reports/qc" element={<ReportsQC />} />
            <Route path="reports/afs" element={<ReportsAFS />} />
            <Route path="reports/suppliers" element={<ReportsSuppliers />} />
            <Route path="reports/sla" element={<ReportsSLA />} />
            <Route path="reports/data-quality" element={<ReportsDataQuality />} />
            <Route path="reports/health-scores" element={<ReportsHealthScores />} />
            <Route path="reports/issues" element={<ReportsIssues />} />
            <Route path="reports/capa" element={<ReportsCapa />} />
            <Route path="control-tower" element={<ControlTower />} />
            <Route path="settings" element={<RequireRole roles={['admin']}><Settings /></RequireRole>} />
            <Route path="admin/users" element={<RequireRole roles={['admin']}><AdminUsers /></RequireRole>} />
            <Route path="audit-log" element={<RequireRole roles={['admin']}><AuditLog /></RequireRole>} />
            <Route path="templates" element={<Templates />} />
            <Route path="templates/new" element={<TemplateNew />} />
            <Route path="templates/approvals" element={<RequireRole roles={['operations_manager']}><TemplateApprovals /></RequireRole>} />
            <Route path="templates/generated" element={<GeneratedDocuments />} />
            <Route path="templates/generated/:id" element={<GeneratedDocumentDetail />} />
            <Route path="templates/generate/:id" element={<TemplateGenerate />} />
            <Route path="templates/:id" element={<TemplateDetail />} />
            <Route path="admin/access-requests" element={<RequireRole roles={['operations_manager']}><AdminAccessRequests /></RequireRole>} />
            <Route path="admin/access-requests/:id" element={<RequireRole roles={['operations_manager']}><AdminAccessRequestDetail /></RequireRole>} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="notifications/settings" element={<NotificationSettings />} />
            <Route path="admin/notification-rules" element={<RequireRole roles={['operations_manager']}><AdminNotificationRules /></RequireRole>} />
            <Route path="admin/report-subscriptions" element={<RequireRole roles={['operations_manager']}><AdminReportSubscriptions /></RequireRole>} />
            <Route path="admin/report-subscriptions/:id" element={<RequireRole roles={['operations_manager']}><AdminReportSubscriptionDetail /></RequireRole>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
