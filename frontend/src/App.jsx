import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { PageLoader } from "./components/ui/Spinner";

const CatalogPage = lazy(() => import("./pages/customer/CatalogPage"));
const LandingPage = lazy(() => import("./pages/customer/LandingPage"));
const CartPage = lazy(() => import("./pages/customer/CartPage"));
const PaymentPage = lazy(() => import("./pages/customer/PaymentPage"));
const TrackPage = lazy(() => import("./pages/customer/TrackPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const StaffOrdersPage = lazy(() => import("./pages/staff/StaffOrdersPage"));
const StaffWalkInPage = lazy(() => import("./pages/staff/StaffWalkInPage"));
const AdminDashboardPage = lazy(
  () => import("./pages/admin/AdminDashboardPage"),
);
const AdminOrdersPage = lazy(() => import("./pages/admin/AdminOrdersPage"));
const AdminProductsPage = lazy(() => import("./pages/admin/AdminProductsPage"));
const AdminStaffPage = lazy(() => import("./pages/admin/AdminStaffPage"));
const AdminPaymentsPage = lazy(() => import("./pages/admin/AdminPaymentsPage"));
const AdminReportsPage = lazy(() => import("./pages/admin/AdminReportsPage"));
const AdminAuditPage = lazy(() => import("./pages/admin/AdminAuditPage"));
const AdminPickupTimesPage = lazy(
  () => import("./pages/admin/AdminPickupTimesPage"),
);

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
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ── Customer (public) ── */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/payment" element={<PaymentPage />} />
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
                path="/staff/walk-in"
                element={
                  <ProtectedRoute requiredRole="staff">
                    <StaffWalkInPage />
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
          </Suspense>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
