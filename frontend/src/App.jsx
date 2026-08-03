import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";

// Customer
import CatalogPage from "./pages/customer/CatalogPage";
import CartPage from "./pages/customer/CartPage";
import PaymentPage from "./pages/customer/PaymentPage";
import TrackPage from "./pages/customer/TrackPage";

// Auth
import LoginPage from "./pages/LoginPage";

// Staff
import StaffOrdersPage from "./pages/staff/StaffOrdersPage";

// Admin
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminStaffPage from "./pages/admin/AdminStaffPage";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";
import AdminAuditPage from "./pages/admin/AdminAuditPage";
import AdminPickupTimesPage from "./pages/admin/AdminPickupTimesPage";

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* ── Customer (public) ── */}
            <Route path="/" element={<CatalogPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/payment/:orderId" element={<PaymentPage />} />
            <Route path="/track" element={<TrackPage />} />

            {/* ── Staff ── */}
            <Route
              path="/staff/login"
              element={<LoginPage portalRole="staff" />}
            />
            <Route
              path="/staff/orders"
              element={
                <ProtectedRoute requiredRole="staff">
                  <StaffOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff"
              element={<Navigate to="/staff/orders" replace />}
            />

            {/* ── Admin ── */}
            <Route
              path="/admin/login"
              element={<LoginPage portalRole="admin" />}
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/products"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/staff"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminStaffPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/payments"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPaymentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminAuditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pickup-times"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPickupTimesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={<Navigate to="/admin/dashboard" replace />}
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
