import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { PageLoader } from '../components/ui/PageLoader';
import { AuthProvider } from '../context/AuthContext';
import { AppLayout } from '../layouts/AppLayout';
import { RequireRole } from '../components/auth/RequireRole';
import { Login } from '../pages/Login';
import { ROLE_MATRIX } from '../lib/roleMatrix';
const Dashboard = lazy(() => import('../pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const ActionInbox = lazy(() => import('../pages/ActionInbox').then((m) => ({ default: m.ActionInbox })));
const Quotations = lazy(() => import('../pages/Quotations').then((m) => ({ default: m.Quotations })));
const QuotationNew = lazy(() => import('../pages/QuotationNew').then((m) => ({ default: m.QuotationNew })));
const QuotationDetail = lazy(() => import('../pages/QuotationDetail').then((m) => ({ default: m.QuotationDetail })));
const Sales = lazy(() => import('../pages/Sales').then((m) => ({ default: m.Sales })));
const SalesCoordinator = lazy(() => import('../pages/SalesCoordinator').then((m) => ({ default: m.SalesCoordinator })));
const CoordinatorQueue = lazy(() => import('../pages/CoordinatorQueue').then((m) => ({ default: m.CoordinatorQueue })));
const Projects = lazy(() => import('../pages/Projects').then((m) => ({ default: m.Projects })));
const ProjectNew = lazy(() => import('../pages/ProjectNew').then((m) => ({ default: m.ProjectNew })));
const ProjectDetail = lazy(() => import('../pages/ProjectDetail').then((m) => ({ default: m.ProjectDetail })));
const AdminApprovals = lazy(() => import('../pages/AdminApprovals').then((m) => ({ default: m.AdminApprovals })));
const WoPnGate = lazy(() => import('../pages/WoPnGate').then((m) => ({ default: m.WoPnGate })));
const Procurement = lazy(() => import('../pages/Procurement').then((m) => ({ default: m.Procurement })));
const ProcurementRequests = lazy(() => import('../pages/ProcurementRequests').then((m) => ({ default: m.ProcurementRequests })));
const ProcurementRequestDetail = lazy(() => import('../pages/ProcurementRequestDetail').then((m) => ({ default: m.ProcurementRequestDetail })));
const ProcurementPurchaseOrders = lazy(() => import('../pages/ProcurementPurchaseOrders').then((m) => ({ default: m.ProcurementPurchaseOrders })));
const ProcurementPODetail = lazy(() => import('../pages/ProcurementPODetail').then((m) => ({ default: m.ProcurementPODetail })));
const ProcurementSuppliers = lazy(() => import('../pages/ProcurementSuppliers').then((m) => ({ default: m.ProcurementSuppliers })));
const ProcurementSupplierDetail = lazy(() => import('../pages/ProcurementSupplierDetail').then((m) => ({ default: m.ProcurementSupplierDetail })));
const ProcurementEtaHistory = lazy(() => import('../pages/ProcurementEtaHistory').then((m) => ({ default: m.ProcurementEtaHistory })));
const ProcurementRequestNew = lazy(() => import('../pages/ProcurementRequestNew').then((m) => ({ default: m.ProcurementRequestNew })));
const ProcurementPurchaseOrderNew = lazy(() => import('../pages/ProcurementPurchaseOrderNew').then((m) => ({ default: m.ProcurementPurchaseOrderNew })));
const ProcurementPrItemsWithoutPo = lazy(() => import('../pages/ProcurementPrItemsWithoutPo').then((m) => ({ default: m.ProcurementPrItemsWithoutPo })));
const Factory = lazy(() => import('../pages/Factory').then((m) => ({ default: m.Factory })));
const FactoryProjects = lazy(() => import('../pages/FactoryProjects').then((m) => ({ default: m.FactoryProjects })));
const FactoryProjectWorkspace = lazy(() => import('../pages/FactoryProjectWorkspace').then((m) => ({ default: m.FactoryProjectWorkspace })));
const FactoryRequirements = lazy(() => import('../pages/FactoryRequirements').then((m) => ({ default: m.FactoryRequirements })));
const FactoryRawMaterialRequests = lazy(() => import('../pages/FactoryRawMaterialRequests').then((m) => ({ default: m.FactoryRawMaterialRequests })));
const FactoryRawMaterialRequestNew = lazy(() => import('../pages/FactoryRawMaterialRequestNew').then((m) => ({ default: m.FactoryRawMaterialRequestNew })));
const FactoryMonthlyUpdates = lazy(() => import('../pages/FactoryMonthlyUpdates').then((m) => ({ default: m.FactoryMonthlyUpdates })));
const FactorySendToQC = lazy(() => import('../pages/FactorySendToQC').then((m) => ({ default: m.FactorySendToQC })));
const Store = lazy(() => import('../pages/Store').then((m) => ({ default: m.Store })));
const MaterialCustody = lazy(() => import('../pages/MaterialCustody').then((m) => ({ default: m.MaterialCustody })));
const VehicleReceiving = lazy(() => import('../pages/VehicleReceiving').then((m) => ({ default: m.VehicleReceiving })));
const StoreReceipts = lazy(() => import('../pages/StoreReceipts').then((m) => ({ default: m.StoreReceipts })));
const StoreReceiptNew = lazy(() => import('../pages/StoreReceiptNew').then((m) => ({ default: m.StoreReceiptNew })));
const StoreReceiptDetail = lazy(() => import('../pages/StoreReceiptDetail').then((m) => ({ default: m.StoreReceiptDetail })));
const StoreVehicleReceiving = lazy(() => import('../pages/StoreVehicleReceiving').then((m) => ({ default: m.StoreVehicleReceiving })));
const StoreVehicleReceivingNew = lazy(() => import('../pages/StoreVehicleReceivingNew').then((m) => ({ default: m.StoreVehicleReceivingNew })));
const StoreVehicleReceivingDetail = lazy(() => import('../pages/StoreVehicleReceivingDetail').then((m) => ({ default: m.StoreVehicleReceivingDetail })));
const StoreInventory = lazy(() => import('../pages/StoreInventory').then((m) => ({ default: m.StoreInventory })));
const StoreIssuance = lazy(() => import('../pages/StoreIssuance').then((m) => ({ default: m.StoreIssuance })));
const StoreSerials = lazy(() => import('../pages/StoreSerials').then((m) => ({ default: m.StoreSerials })));
const StoreQCHandoff = lazy(() => import('../pages/StoreQCHandoff').then((m) => ({ default: m.StoreQCHandoff })));
const StoreUnallocated = lazy(() => import('../pages/StoreUnallocated').then((m) => ({ default: m.StoreUnallocated })));
const CustodyNew = lazy(() => import('../pages/CustodyNew').then((m) => ({ default: m.CustodyNew })));
const CustodyDetail = lazy(() => import('../pages/CustodyDetail').then((m) => ({ default: m.CustodyDetail })));
const QC = lazy(() => import('../pages/QC').then((m) => ({ default: m.QC })));
const QCWorkQueue = lazy(() => import('../pages/QCWorkQueue').then((m) => ({ default: m.QCWorkQueue })));
const QCRework = lazy(() => import('../pages/QCRework').then((m) => ({ default: m.QCRework })));
const MaterialQC = lazy(() => import('../pages/MaterialQC').then((m) => ({ default: m.MaterialQC })));
const MaterialQcInspections = lazy(() => import('../pages/MaterialQcInspections').then((m) => ({ default: m.MaterialQcInspections })));
const MaterialQcInspectionDetail = lazy(() => import('../pages/MaterialQcInspectionDetail').then((m) => ({ default: m.MaterialQcInspectionDetail })));
const MaterialNcrs = lazy(() => import('../pages/MaterialNcrs').then((m) => ({ default: m.MaterialNcrs })));
const MaterialNcrDetail = lazy(() => import('../pages/MaterialNcrDetail').then((m) => ({ default: m.MaterialNcrDetail })));
const ProjectQC = lazy(() => import('../pages/ProjectQC').then((m) => ({ default: m.ProjectQC })));
const ProjectQcInspections = lazy(() => import('../pages/ProjectQcInspections').then((m) => ({ default: m.ProjectQcInspections })));
const ProjectQcInspectionDetail = lazy(() => import('../pages/ProjectQcInspectionDetail').then((m) => ({ default: m.ProjectQcInspectionDetail })));
const ProjectQcFindings = lazy(() => import('../pages/ProjectQcFindings').then((m) => ({ default: m.ProjectQcFindings })));
const ProjectQcFindingDetail = lazy(() => import('../pages/ProjectQcFindingDetail').then((m) => ({ default: m.ProjectQcFindingDetail })));
const ProjectQcReleaseNotes = lazy(() => import('../pages/ProjectQcReleaseNotes').then((m) => ({ default: m.ProjectQcReleaseNotes })));
const ProjectQcReleaseNoteDetail = lazy(() => import('../pages/ProjectQcReleaseNoteDetail').then((m) => ({ default: m.ProjectQcReleaseNoteDetail })));
const DubaiAFS = lazy(() => import('../pages/DubaiAFS').then((m) => ({ default: m.DubaiAFS })));
const AFSPnGate = lazy(() => import('../pages/AFSPnGate').then((m) => ({ default: m.AFSPnGate })));
const AFSReadyForDelivery = lazy(() => import('../pages/AFSReadyForDelivery').then((m) => ({ default: m.AFSReadyForDelivery })));
const AFSMaterials = lazy(() => import('../pages/AFSMaterials').then((m) => ({ default: m.AFSMaterials })));
const DubaiAfsProjects = lazy(() => import('../pages/DubaiAfsProjects').then((m) => ({ default: m.DubaiAfsProjects })));
const DubaiAfsProjectDetail = lazy(() => import('../pages/DubaiAfsProjectDetail').then((m) => ({ default: m.DubaiAfsProjectDetail })));
const DubaiAfsEta = lazy(() => import('../pages/DubaiAfsEta').then((m) => ({ default: m.DubaiAfsEta })));
const DubaiAfsArrivalReports = lazy(() => import('../pages/DubaiAfsArrivalReports').then((m) => ({ default: m.DubaiAfsArrivalReports })));
const DubaiAfsArrivalReportDetail = lazy(() => import('../pages/DubaiAfsArrivalReportDetail').then((m) => ({ default: m.DubaiAfsArrivalReportDetail })));
const DubaiAfsMissingItems = lazy(() => import('../pages/DubaiAfsMissingItems').then((m) => ({ default: m.DubaiAfsMissingItems })));
const DubaiAfsPredeliveryReports = lazy(() => import('../pages/DubaiAfsPredeliveryReports').then((m) => ({ default: m.DubaiAfsPredeliveryReports })));
const DubaiAfsPredeliveryReportDetail = lazy(() => import('../pages/DubaiAfsPredeliveryReportDetail').then((m) => ({ default: m.DubaiAfsPredeliveryReportDetail })));
const DubaiAfsConditionReports = lazy(() => import('../pages/DubaiAfsConditionReports').then((m) => ({ default: m.DubaiAfsConditionReports })));
const AfterSales = lazy(() => import('../pages/AfterSales').then((m) => ({ default: m.AfterSales })));
const AfterSalesMaintenance = lazy(() => import('../pages/AfterSalesMaintenance').then((m) => ({ default: m.AfterSalesMaintenance })));
const AfterSalesMaintenanceNew = lazy(() => import('../pages/AfterSalesMaintenanceNew').then((m) => ({ default: m.AfterSalesMaintenanceNew })));
const AfterSalesMaintenanceDetail = lazy(() => import('../pages/AfterSalesMaintenanceDetail').then((m) => ({ default: m.AfterSalesMaintenanceDetail })));
const Reports = lazy(() => import('../pages/Reports').then((m) => ({ default: m.Reports })));
const ReportsExecutive = lazy(() => import('../pages/ReportsExecutive').then((m) => ({ default: m.ReportsExecutive })));
const ControlTower = lazy(() => import('../pages/ControlTower').then((m) => ({ default: m.ControlTower })));
const ReportsProjects = lazy(() => import('../pages/ReportsProjects').then((m) => ({ default: m.ReportsProjects })));
const ReportsSales = lazy(() => import('../pages/ReportsSales').then((m) => ({ default: m.ReportsSales })));
const ReportsProcurement = lazy(() => import('../pages/ReportsProcurement').then((m) => ({ default: m.ReportsProcurement })));
const ReportsFactory = lazy(() => import('../pages/ReportsFactory').then((m) => ({ default: m.ReportsFactory })));
const ReportsStore = lazy(() => import('../pages/ReportsStore').then((m) => ({ default: m.ReportsStore })));
const ReportsQC = lazy(() => import('../pages/ReportsQC').then((m) => ({ default: m.ReportsQC })));
const ReportsAFS = lazy(() => import('../pages/ReportsAFS').then((m) => ({ default: m.ReportsAFS })));
const ReportsSuppliers = lazy(() => import('../pages/ReportsSuppliers').then((m) => ({ default: m.ReportsSuppliers })));
const ReportsSLA = lazy(() => import('../pages/ReportsSLA').then((m) => ({ default: m.ReportsSLA })));
const ReportsDataQuality = lazy(() => import('../pages/ReportsDataQuality').then((m) => ({ default: m.ReportsDataQuality })));
const ReportsHealthScores = lazy(() => import('../pages/ReportsHealthScores').then((m) => ({ default: m.ReportsHealthScores })));
const ReportsIssues = lazy(() => import('../pages/ReportsIssues').then((m) => ({ default: m.ReportsIssues })));
const ReportsCapa = lazy(() => import('../pages/ReportsCapa').then((m) => ({ default: m.ReportsCapa })));
const Settings = lazy(() => import('../pages/Settings').then((m) => ({ default: m.Settings })));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const ManagementDashboard = lazy(() => import('../pages/ManagementDashboard').then((m) => ({ default: m.ManagementDashboard })));
const AdminUsers = lazy(() => import('../pages/AdminUsers').then((m) => ({ default: m.AdminUsers })));
const AuditLog = lazy(() => import('../pages/AuditLog').then((m) => ({ default: m.AuditLog })));
import { RequestAccess } from '../pages/RequestAccess';
const Templates = lazy(() => import('../pages/Templates').then((m) => ({ default: m.Templates })));
const TemplateNew = lazy(() => import('../pages/TemplateNew').then((m) => ({ default: m.TemplateNew })));
const TemplateDetail = lazy(() => import('../pages/TemplateDetail').then((m) => ({ default: m.TemplateDetail })));
const TemplateApprovals = lazy(() => import('../pages/TemplateApprovals').then((m) => ({ default: m.TemplateApprovals })));
const TemplateGenerate = lazy(() => import('../pages/TemplateGenerate').then((m) => ({ default: m.TemplateGenerate })));
const GeneratedDocuments = lazy(() => import('../pages/GeneratedDocuments').then((m) => ({ default: m.GeneratedDocuments })));
const GeneratedDocumentDetail = lazy(() => import('../pages/GeneratedDocumentDetail').then((m) => ({ default: m.GeneratedDocumentDetail })));
const AdminAccessRequests = lazy(() => import('../pages/AdminAccessRequests').then((m) => ({ default: m.AdminAccessRequests })));
const AdminAccessRequestDetail = lazy(() => import('../pages/AdminAccessRequestDetail').then((m) => ({ default: m.AdminAccessRequestDetail })));
const Notifications = lazy(() => import('../pages/Notifications').then((m) => ({ default: m.Notifications })));
const NotificationSettings = lazy(() => import('../pages/NotificationSettings').then((m) => ({ default: m.NotificationSettings })));
const AdminNotificationRules = lazy(() => import('../pages/AdminNotificationRules').then((m) => ({ default: m.AdminNotificationRules })));
const AdminReportSubscriptions = lazy(() => import('../pages/AdminReportSubscriptions').then((m) => ({ default: m.AdminReportSubscriptions })));
const AdminReportSubscriptionDetail = lazy(() => import('../pages/AdminReportSubscriptionDetail').then((m) => ({ default: m.AdminReportSubscriptionDetail })));
const AdminInvoicingSchedule = lazy(() => import('../pages/AdminInvoicingSchedule').then((m) => ({ default: m.AdminInvoicingSchedule })));
const AdminSalesTargets = lazy(() => import('../pages/AdminSalesTargets').then((m) => ({ default: m.AdminSalesTargets })));
const NotFound = lazy(() => import('../pages/NotFound').then((m) => ({ default: m.NotFound })));
const HotProjects = lazy(() => import('../pages/HotProjects').then((m) => ({ default: m.HotProjects })));
const HotProjectNew = lazy(() => import('../pages/HotProjectNew').then((m) => ({ default: m.HotProjectNew })));
const HotProjectDetail = lazy(() => import('../pages/HotProjectDetail').then((m) => ({ default: m.HotProjectDetail })));
const ProjectInvoicing = lazy(() => import('../pages/ProjectInvoicing').then((m) => ({ default: m.ProjectInvoicing })));
const Receivables = lazy(() => import('../pages/Receivables').then((m) => ({ default: m.Receivables })));

// Redirect to role-specific landing page on first visit to /.
// Uses ROLE_MATRIX.landingRoute — roles with landingRoute '/' stay on Dashboard.
// Falls back to Dashboard for unknown/null roles to prevent redirect loops.
function RootRedirect() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();

  const landingRoute = role ? (ROLE_MATRIX[role]?.landingRoute ?? '/') : '/';
  const shouldRedirect = landingRoute !== '/';

  useEffect(() => {
    if (!loading && shouldRedirect) {
      navigate(landingRoute, { replace: true });
    }
  }, [role, loading, shouldRedirect, landingRoute, navigate]);

  if (loading) return null;
  if (shouldRedirect) return null;
  return <Dashboard />;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes — must be OUTSIDE the protected AppLayout */}
          <Route path="/login" element={<Login />} />
          <Route path="/request-access" element={<RequestAccess />} />

          {/* Protected routes — AppLayout wraps with ProtectedRoute */}
          <Route path="/" element={<AppLayout />}>
            {/* ── Sales-accessible routes (any authenticated user) ── */}
            <Route index element={<RootRedirect />} />
            <Route path="inbox" element={<ActionInbox />} />
            <Route path="quotations" element={<Quotations />} />
            <Route path="quotations/new" element={<QuotationNew />} />
            <Route path="quotations/:id" element={<QuotationDetail />} />
            <Route path="sales" element={<Sales />} />
            <Route path="hot-projects" element={<RequireRole roles={['admin', 'operations_manager', 'sales_user', 'sales_coordinator', 'viewer']}><HotProjects /></RequireRole>} />
            <Route path="hot-projects/new" element={<RequireRole roles={['admin', 'operations_manager', 'sales_user']}><HotProjectNew /></RequireRole>} />
            <Route path="hot-projects/:id" element={<RequireRole roles={['admin', 'operations_manager', 'sales_user', 'sales_coordinator', 'viewer']}><HotProjectDetail /></RequireRole>} />
            <Route path="projects" element={<Projects />} />
            {/* SO authoring is Admin/Operations only — sales view projects read-only
                (incl. quotation→SO conversion, which routes here). */}
            <Route path="projects/new" element={<RequireRole roles={['admin', 'operations_manager']}><ProjectNew /></RequireRole>} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="projects/:projectId/invoicing" element={<RequireRole roles={['admin', 'operations_manager', 'sales_user', 'sales_coordinator', 'viewer']}><ProjectInvoicing /></RequireRole>} />
            <Route path="templates" element={<Templates />} />
            <Route path="templates/new" element={<TemplateNew />} />
            <Route path="templates/generated" element={<GeneratedDocuments />} />
            <Route path="templates/generated/:id" element={<GeneratedDocumentDetail />} />
            <Route path="templates/generate/:id" element={<TemplateGenerate />} />
            <Route path="templates/:id" element={<TemplateDetail />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="notifications/settings" element={<NotificationSettings />} />
            {/* ── Reports — guarded so Sales cannot reach cost-sensitive reports by
                   direct URL. Sales keep only the sales report; admin is always allowed. ── */}
            <Route path="reports" element={<RequireRole roles={['operations_manager', 'viewer', 'procurement_user', 'factory_user', 'store_user', 'qc_user', 'afs_user', 'sales_coordinator']}><Reports /></RequireRole>} />
            <Route path="reports/executive" element={<RequireRole roles={['operations_manager', 'viewer']}><ReportsExecutive /></RequireRole>} />
            <Route path="reports/projects" element={<RequireRole roles={['operations_manager', 'viewer', 'sales_coordinator']}><ReportsProjects /></RequireRole>} />
            <Route path="reports/sales" element={<RequireRole roles={['operations_manager', 'viewer', 'sales_user', 'sales_coordinator']}><ReportsSales /></RequireRole>} />
            <Route path="reports/procurement" element={<RequireRole roles={['operations_manager', 'procurement_user']}><ReportsProcurement /></RequireRole>} />
            <Route path="reports/factory" element={<RequireRole roles={['operations_manager', 'factory_user']}><ReportsFactory /></RequireRole>} />
            <Route path="reports/store" element={<RequireRole roles={['operations_manager', 'store_user']}><ReportsStore /></RequireRole>} />
            <Route path="reports/qc" element={<RequireRole roles={['operations_manager', 'qc_user']}><ReportsQC /></RequireRole>} />
            <Route path="reports/afs" element={<RequireRole roles={['operations_manager', 'afs_user']}><ReportsAFS /></RequireRole>} />
            <Route path="reports/suppliers" element={<RequireRole roles={['operations_manager', 'procurement_user']}><ReportsSuppliers /></RequireRole>} />
            <Route path="reports/sla" element={<RequireRole roles={['operations_manager', 'viewer']}><ReportsSLA /></RequireRole>} />
            <Route path="reports/data-quality" element={<RequireRole roles={['operations_manager', 'viewer']}><ReportsDataQuality /></RequireRole>} />
            <Route path="reports/health-scores" element={<RequireRole roles={['operations_manager', 'viewer']}><ReportsHealthScores /></RequireRole>} />
            <Route path="reports/issues" element={<RequireRole roles={['operations_manager', 'viewer', 'qc_user']}><ReportsIssues /></RequireRole>} />
            <Route path="reports/capa" element={<RequireRole roles={['operations_manager', 'qc_user']}><ReportsCapa /></RequireRole>} />

            <Route path="receivables" element={<RequireRole roles={['admin', 'operations_manager', 'sales_user', 'sales_coordinator', 'viewer']}><Receivables /></RequireRole>} />

            {/* ── Sales coordinator only ── */}
            <Route path="sales-coordinator" element={<RequireRole roles={['sales_coordinator', 'operations_manager']}><SalesCoordinator /></RequireRole>} />
            <Route path="coordinator-queue" element={<RequireRole roles={['sales_coordinator', 'operations_manager']}><CoordinatorQueue /></RequireRole>} />

            {/* ── Operations manager only ── */}
            <Route path="admin-approvals" element={<RequireRole roles={['operations_manager']}><AdminApprovals /></RequireRole>} />
            <Route path="wo-pn-gate" element={<RequireRole roles={['operations_manager', 'factory_user']}><WoPnGate /></RequireRole>} />
            <Route path="control-tower" element={<RequireRole roles={['operations_manager', 'viewer']}><ControlTower /></RequireRole>} />

            {/* ── Procurement ── */}
            <Route path="procurement" element={<RequireRole roles={['procurement_user', 'operations_manager']}><Procurement /></RequireRole>} />
            <Route path="procurement/requests" element={<RequireRole roles={['procurement_user', 'operations_manager']}><ProcurementRequests /></RequireRole>} />
            <Route path="procurement/requests/new" element={<RequireRole roles={['procurement_user', 'operations_manager']}><ProcurementRequestNew /></RequireRole>} />
            <Route path="procurement/requests/:id" element={<RequireRole roles={['procurement_user', 'operations_manager']}><ProcurementRequestDetail /></RequireRole>} />
            <Route path="procurement/purchase-orders" element={<RequireRole roles={['procurement_user', 'operations_manager']}><ProcurementPurchaseOrders /></RequireRole>} />
            <Route path="procurement/purchase-orders/new" element={<RequireRole roles={['procurement_user', 'operations_manager']}><ProcurementPurchaseOrderNew /></RequireRole>} />
            <Route path="procurement/purchase-orders/:id" element={<RequireRole roles={['procurement_user', 'operations_manager']}><ProcurementPODetail /></RequireRole>} />
            <Route path="procurement/pr-items-without-po" element={<RequireRole roles={['procurement_user', 'operations_manager']}><ProcurementPrItemsWithoutPo /></RequireRole>} />
            <Route path="procurement/suppliers" element={<RequireRole roles={['procurement_user', 'operations_manager']}><ProcurementSuppliers /></RequireRole>} />
            <Route path="procurement/suppliers/:id" element={<RequireRole roles={['procurement_user', 'operations_manager']}><ProcurementSupplierDetail /></RequireRole>} />
            <Route path="procurement/eta-history" element={<RequireRole roles={['procurement_user', 'operations_manager']}><ProcurementEtaHistory /></RequireRole>} />

            {/* ── Factory ── */}
            <Route path="factory" element={<RequireRole roles={['factory_user', 'operations_manager']}><Factory /></RequireRole>} />
            <Route path="factory/projects" element={<RequireRole roles={['factory_user', 'operations_manager']}><FactoryProjects /></RequireRole>} />
            <Route path="factory/projects/:projectId" element={<RequireRole roles={['factory_user', 'operations_manager']}><FactoryProjectWorkspace /></RequireRole>} />
            <Route path="factory/requirements" element={<RequireRole roles={['factory_user', 'operations_manager']}><FactoryRequirements /></RequireRole>} />
            <Route path="factory/raw-material-requests" element={<RequireRole roles={['factory_user', 'operations_manager']}><FactoryRawMaterialRequests /></RequireRole>} />
            <Route path="factory/raw-material-requests/new" element={<RequireRole roles={['factory_user', 'operations_manager']}><FactoryRawMaterialRequestNew /></RequireRole>} />
            <Route path="factory/monthly-updates" element={<RequireRole roles={['factory_user', 'operations_manager']}><FactoryMonthlyUpdates /></RequireRole>} />
            <Route path="factory/send-to-qc" element={<RequireRole roles={['factory_user', 'operations_manager']}><FactorySendToQC /></RequireRole>} />
            <Route path="factory/pending-raw-materials" element={<RequireRole roles={['factory_user', 'operations_manager']}><FactoryRawMaterialRequests /></RequireRole>} />

            {/* ── Store / Warehouse ── */}
            <Route path="store" element={<RequireRole roles={['store_user', 'operations_manager']}><Store /></RequireRole>} />
            <Route path="store/receipts" element={<RequireRole roles={['store_user', 'operations_manager']}><StoreReceipts /></RequireRole>} />
            <Route path="store/receipts/new" element={<RequireRole roles={['store_user', 'operations_manager']}><StoreReceiptNew /></RequireRole>} />
            <Route path="store/receipts/:id" element={<RequireRole roles={['store_user', 'operations_manager']}><StoreReceiptDetail /></RequireRole>} />
            <Route path="store/vehicle-receiving" element={<RequireRole roles={['store_user', 'operations_manager']}><StoreVehicleReceiving /></RequireRole>} />
            <Route path="store/vehicle-receiving/new" element={<RequireRole roles={['store_user', 'operations_manager']}><StoreVehicleReceivingNew /></RequireRole>} />
            <Route path="store/vehicle-receiving/:id" element={<RequireRole roles={['store_user', 'operations_manager']}><StoreVehicleReceivingDetail /></RequireRole>} />
            <Route path="store/inventory" element={<RequireRole roles={['store_user', 'operations_manager']}><StoreInventory /></RequireRole>} />
            <Route path="store/issuance" element={<RequireRole roles={['store_user', 'operations_manager']}><StoreIssuance /></RequireRole>} />
            <Route path="store/serials" element={<RequireRole roles={['store_user', 'operations_manager']}><StoreSerials /></RequireRole>} />
            <Route path="store/qc-handoff" element={<RequireRole roles={['store_user', 'operations_manager']}><StoreQCHandoff /></RequireRole>} />
            <Route path="store/unallocated" element={<RequireRole roles={['store_user', 'operations_manager']}><StoreUnallocated /></RequireRole>} />
            <Route path="custody" element={<RequireRole roles={['store_user', 'factory_user', 'afs_user', 'operations_manager']}><MaterialCustody /></RequireRole>} />
            <Route path="custody/new" element={<RequireRole roles={['store_user', 'factory_user', 'afs_user', 'operations_manager']}><CustodyNew /></RequireRole>} />
            <Route path="custody/:id" element={<RequireRole roles={['store_user', 'factory_user', 'afs_user', 'operations_manager']}><CustodyDetail /></RequireRole>} />
            <Route path="vehicle-receiving" element={<RequireRole roles={['store_user', 'operations_manager']}><VehicleReceiving /></RequireRole>} />

            {/* ── Quality Control ── */}
            <Route path="qc" element={<RequireRole roles={['qc_user', 'operations_manager']}><QC /></RequireRole>} />
            <Route path="qc/work-queue" element={<RequireRole roles={['qc_user', 'operations_manager']}><QCWorkQueue /></RequireRole>} />
            <Route path="qc/rework" element={<RequireRole roles={['qc_user', 'operations_manager']}><QCRework /></RequireRole>} />
            <Route path="material-qc" element={<RequireRole roles={['qc_user', 'operations_manager']}><MaterialQC /></RequireRole>} />
            <Route path="material-qc/inspections" element={<RequireRole roles={['qc_user', 'operations_manager']}><MaterialQcInspections /></RequireRole>} />
            <Route path="material-qc/inspections/:id" element={<RequireRole roles={['qc_user', 'operations_manager']}><MaterialQcInspectionDetail /></RequireRole>} />
            <Route path="material-qc/ncrs" element={<RequireRole roles={['qc_user', 'operations_manager']}><MaterialNcrs /></RequireRole>} />
            <Route path="material-qc/ncrs/:id" element={<RequireRole roles={['qc_user', 'operations_manager']}><MaterialNcrDetail /></RequireRole>} />
            <Route path="project-qc" element={<RequireRole roles={['qc_user', 'operations_manager']}><ProjectQC /></RequireRole>} />
            <Route path="project-qc/inspections" element={<RequireRole roles={['qc_user', 'operations_manager']}><ProjectQcInspections /></RequireRole>} />
            <Route path="project-qc/inspections/:id" element={<RequireRole roles={['qc_user', 'operations_manager']}><ProjectQcInspectionDetail /></RequireRole>} />
            <Route path="project-qc/findings" element={<RequireRole roles={['qc_user', 'operations_manager']}><ProjectQcFindings /></RequireRole>} />
            <Route path="project-qc/findings/:id" element={<RequireRole roles={['qc_user', 'operations_manager']}><ProjectQcFindingDetail /></RequireRole>} />
            <Route path="project-qc/release-notes" element={<RequireRole roles={['qc_user', 'operations_manager']}><ProjectQcReleaseNotes /></RequireRole>} />
            <Route path="project-qc/release-notes/:id" element={<RequireRole roles={['qc_user', 'operations_manager']}><ProjectQcReleaseNoteDetail /></RequireRole>} />

            {/* ── Dubai / AFS ── */}
            <Route path="dubai-afs" element={<RequireRole roles={['afs_user', 'operations_manager']}><DubaiAFS /></RequireRole>} />
            <Route path="dubai-afs/projects" element={<RequireRole roles={['afs_user', 'operations_manager']}><DubaiAfsProjects /></RequireRole>} />
            <Route path="dubai-afs/projects/:id" element={<RequireRole roles={['afs_user', 'operations_manager']}><DubaiAfsProjectDetail /></RequireRole>} />
            <Route path="dubai-afs/eta" element={<RequireRole roles={['afs_user', 'operations_manager']}><DubaiAfsEta /></RequireRole>} />
            <Route path="dubai-afs/arrival-reports" element={<RequireRole roles={['afs_user', 'operations_manager']}><DubaiAfsArrivalReports /></RequireRole>} />
            <Route path="dubai-afs/arrival-reports/:id" element={<RequireRole roles={['afs_user', 'operations_manager']}><DubaiAfsArrivalReportDetail /></RequireRole>} />
            <Route path="dubai-afs/missing-items" element={<RequireRole roles={['afs_user', 'operations_manager']}><DubaiAfsMissingItems /></RequireRole>} />
            <Route path="dubai-afs/predelivery-reports" element={<RequireRole roles={['afs_user', 'operations_manager']}><DubaiAfsPredeliveryReports /></RequireRole>} />
            <Route path="dubai-afs/predelivery-reports/:id" element={<RequireRole roles={['afs_user', 'operations_manager']}><DubaiAfsPredeliveryReportDetail /></RequireRole>} />
            <Route path="dubai-afs/condition-reports" element={<RequireRole roles={['afs_user', 'operations_manager']}><DubaiAfsConditionReports /></RequireRole>} />
            <Route path="afs/pn-gate" element={<RequireRole roles={['afs_user', 'operations_manager']}><AFSPnGate /></RequireRole>} />
            <Route path="afs/ready-for-delivery" element={<RequireRole roles={['afs_user', 'operations_manager']}><AFSReadyForDelivery /></RequireRole>} />
            <Route path="afs/materials" element={<RequireRole roles={['afs_user', 'operations_manager']}><AFSMaterials /></RequireRole>} />

            {/* ── After Sales / Maintenance ── */}
            <Route path="after-sales" element={<RequireRole roles={['afs_user', 'operations_manager']}><AfterSales /></RequireRole>} />
            <Route path="after-sales/maintenance" element={<RequireRole roles={['afs_user', 'operations_manager']}><AfterSalesMaintenance /></RequireRole>} />
            <Route path="after-sales/maintenance/new" element={<RequireRole roles={['afs_user', 'operations_manager']}><AfterSalesMaintenanceNew /></RequireRole>} />
            <Route path="after-sales/maintenance/:id" element={<RequireRole roles={['afs_user', 'operations_manager']}><AfterSalesMaintenanceDetail /></RequireRole>} />

            {/* ── Admin only ── */}
            <Route path="admin-dashboard" element={<RequireRole roles={['admin']}><AdminDashboard /></RequireRole>} />
            <Route path="management-dashboard" element={<RequireRole roles={['viewer']}><ManagementDashboard /></RequireRole>} />
            <Route path="settings" element={<RequireRole roles={['admin']}><Settings /></RequireRole>} />
            <Route path="admin/users" element={<RequireRole roles={['admin']}><AdminUsers /></RequireRole>} />
            <Route path="audit-log" element={<RequireRole roles={['admin']}><AuditLog /></RequireRole>} />

            {/* ── Admin governance routes ── */}
            <Route path="templates/approvals" element={<RequireRole roles={['admin', 'operations_manager']}><TemplateApprovals /></RequireRole>} />
            <Route path="admin/access-requests" element={<RequireRole roles={['admin']}><AdminAccessRequests /></RequireRole>} />
            <Route path="admin/access-requests/:id" element={<RequireRole roles={['admin']}><AdminAccessRequestDetail /></RequireRole>} />
            <Route path="admin/notification-rules" element={<RequireRole roles={['admin']}><AdminNotificationRules /></RequireRole>} />
            <Route path="admin/report-subscriptions" element={<RequireRole roles={['admin']}><AdminReportSubscriptions /></RequireRole>} />
            <Route path="admin/report-subscriptions/:id" element={<RequireRole roles={['admin']}><AdminReportSubscriptionDetail /></RequireRole>} />

            {/* ── Commercial admin controls ── */}
            <Route path="admin/invoicing-schedule" element={<RequireRole roles={['admin']}><AdminInvoicingSchedule /></RequireRole>} />
            <Route path="admin/sales-targets" element={<RequireRole roles={['admin']}><AdminSalesTargets /></RequireRole>} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
