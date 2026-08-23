import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmDialogProvider } from './context/ConfirmDialogContext';
import { Spinner } from './components/ui/Spinner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import { MapPage } from './pages/MapPage';
import { StockDashboard } from './pages/StockDashboard';
import { Categories } from './pages/Categories';
import { CollectorTasks } from './pages/CollectorTasks';
import { WarehouseReceipt } from './pages/WarehouseReceipt';
import { Users } from './pages/Users';
import { ProductsPage } from './pages/ProductsPage';
import { ProductWorkflowPage } from './pages/ProductWorkflowPage';
import { TasksPage } from './pages/TasksPage';
import { DesignerKpiReport } from './pages/DesignerKpiReport';
import { SuppliersPage } from './pages/SuppliersPage';
import { SupplierDetailsPage } from './pages/SupplierDetailsPage';
import { PriceListPage } from './pages/PriceListPage';
import { ProcurementListPage } from './pages/ProcurementListPage';
import { OrderDraftProvider } from './context/OrderDraftContext';
import CreateOrderModal from './components/CreateOrderModal';

/** Уже авторизован — уходим с /login, сохраняя целевой URL после редиректа с защищённой страницы */
const RedirectIfAuthenticated: React.FC = () => {
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  return <Navigate to={from || '/dashboard'} replace />;
};

const AppRoutes: React.FC = () => {
  const { user, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted">
        <Spinner size="lg" color="brand" useLucide />
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <RedirectIfAuthenticated /> : <Login />} 
      />
      <Route 
        path="/register" 
        element={user ? <RedirectIfAuthenticated /> : <Register />} 
      />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <Orders />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/orders/:id"
        element={
          <ProtectedRoute>
            <OrderDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <ProductsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/workflow"
        element={
          <ProtectedRoute>
            <ProductWorkflowPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <TasksPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports/designer-kpi"
        element={
          <ProtectedRoute>
            <DesignerKpiReport />
          </ProtectedRoute>
        }
      />

      <Route
        path="/suppliers"
        element={
          <ProtectedRoute>
            <SuppliersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/suppliers/:id"
        element={
          <ProtectedRoute>
            <SupplierDetailsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/price-list"
        element={
          <ProtectedRoute>
            <PriceListPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <MapPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/procurement-list"
        element={
          <ProtectedRoute>
            <ProcurementListPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/stock"
        element={
          <ProtectedRoute>
            <StockDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/categories"
        element={
          <ProtectedRoute>
            <Categories />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/collector/tasks"
        element={
          <ProtectedRoute>
            <CollectorTasks />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/warehouse/receipt"
        element={
          <ProtectedRoute>
            <WarehouseReceipt />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Users />
          </ProtectedRoute>
        }
      />
      
      {/* Редирект неизвестных маршрутов */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmDialogProvider>
          <UIProvider>
            <Router>
              <OrderDraftProvider>
                <AppRoutes />
                <CreateOrderModal />
              </OrderDraftProvider>
            </Router>
          </UIProvider>
        </ConfirmDialogProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
