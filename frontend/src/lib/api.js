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

  let data = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const message =
      typeof data === "string" && data.trim()
        ? data
        : data?.error || data?.message || "Request failed.";
    throw new Error(message);
  }

  return data;
}

export const api = {
  // Orders
  placeOrder: (payload) => request("POST", "/api/orders", payload),
  placeOrderWithPayment: (payload) =>
    request("POST", "/api/orders/with-payment", payload),
  uploadProof: (orderId, payload) =>
    request("POST", `/api/orders/${orderId}/proof`, payload),
  trackOrder: (params) =>
    request("GET", `/api/orders/track?${new URLSearchParams(params)}`),
  updateStatus: (orderId, status) =>
    request("PATCH", `/api/orders/${orderId}/status`, { status }),

  // Dashboard & Reports
  getDashboard: () => request("GET", "/api/dashboard/summary"),
  getReports: (from, to) =>
    request("GET", `/api/reports?from=${from}&to=${to}`),

  // Products
  getProducts: () => request("GET", "/api/products"),
  createProduct: (payload) => request("POST", "/api/products", payload),
  updateProduct: (id, payload) =>
    request("PUT", `/api/products/${id}`, payload),
  deleteProduct: (id) => request("DELETE", `/api/products/${id}`),

  // Staff
  getStaff: () => request("GET", "/api/staff"),
  createStaff: (payload) => request("POST", "/api/staff", payload),
  updateStaff: (uid, payload) => request("PUT", `/api/staff/${uid}`, payload),
  deactivateStaff: (uid) => request("DELETE", `/api/staff/${uid}`),

  // Payments
  verifyPayment: (id, action) =>
    request("PATCH", `/api/payments/${id}/verify`, { action }),
  getPaymentModes: () => request("GET", "/api/payment-modes"),
  getAdminPaymentModes: () => request("GET", "/api/payments/modes"),
  createPaymentMode: (payload) => request("POST", "/api/payments/modes", payload),
  updatePaymentMode: (id, payload) =>
    request("PUT", `/api/payments/modes/${id}`, payload),
  deletePaymentMode: (id) => request("DELETE", `/api/payments/modes/${id}`),

  // Pickup Times (admin)
  getPickupConfigs: () => request("GET", "/api/pickup-times/configs"),
  createPickupConfig: (payload) =>
    request("POST", "/api/pickup-times/configs", payload),
  updatePickupConfig: (id, payload) =>
    request("PUT", `/api/pickup-times/configs/${id}`, payload),
  deletePickupConfig: (id) =>
    request("DELETE", `/api/pickup-times/configs/${id}`),

  // Pickup Times (public — no auth needed but goes through api helper for consistency)
  getAvailableDates: () => request("GET", "/api/pickup-times/available-dates"),
  getAvailableSlots: (date) =>
    request("GET", `/api/pickup-times/available?date=${date}`),
};
