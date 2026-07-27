import { auth } from "./firebase";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) return { "Content-Type": "application/json" };
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function request(method, path, body) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

export const api = {
  // Orders
  placeOrder:      (payload)          => request("POST", "/api/orders", payload),
  uploadProof:     (orderId, payload) => request("POST", `/api/orders/${orderId}/proof`, payload),
  trackOrder:      (params)           => request("GET",  `/api/orders/track?${new URLSearchParams(params)}`),
  updateStatus:    (orderId, status)  => request("PATCH", `/api/orders/${orderId}/status`, { status }),

  // Dashboard & Reports
  getDashboard:    ()                 => request("GET", "/api/dashboard/summary"),
  getReports:      (from, to)         => request("GET", `/api/reports?from=${from}&to=${to}`),

  // Products
  getProducts:     ()                 => request("GET", "/api/products"),
  createProduct:   (payload)          => request("POST", "/api/products", payload),
  updateProduct:   (id, payload)      => request("PUT", `/api/products/${id}`, payload),
  deleteProduct:   (id)               => request("DELETE", `/api/products/${id}`),

  // Staff
  getStaff:        ()                 => request("GET", "/api/staff"),
  createStaff:     (payload)          => request("POST", "/api/staff", payload),
  updateStaff:     (uid, payload)     => request("PUT", `/api/staff/${uid}`, payload),
  deactivateStaff: (uid)              => request("DELETE", `/api/staff/${uid}`),

  // Payments
  verifyPayment:   (id, action)       => request("PATCH", `/api/payments/${id}/verify`, { action }),
};
