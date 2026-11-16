import { api } from "./api.js";

const data = (promise) => promise.then((res) => res.data);

export const authService = {
  login: (credentials) => data(api.post("/auth/login", credentials)),
  register: (payload) => data(api.post("/auth/register", payload)),
  me: () => data(api.get("/auth/me")),
  logout: () => api.post("/auth/logout").catch(() => {}),
};

export const catalogService = {
  categories: () => data(api.get("/categories")),
  products: (params) => data(api.get("/products", { params })),
  popular: () => data(api.get("/products/popular")),
};

export const orderService = {
  create: (items) => data(api.post("/orders", { items })),
  mine: () => data(api.get("/orders/my")),
  get: (id) => data(api.get(`/orders/${id}`)),
  cancel: (id) => data(api.patch(`/orders/${id}/cancel`)),
};

export const adminService = {
  dashboard: () => data(api.get("/admin/dashboard")),
  orders: (params) => data(api.get("/admin/orders", { params })),
  updateOrderStatus: (id, status) => data(api.patch(`/admin/orders/${id}/status`, { status })),

  products: (params) => data(api.get("/admin/products", { params })),
  createProduct: (payload) => data(api.post("/admin/products", payload)),
  updateProduct: (id, payload) => data(api.put(`/admin/products/${id}`, payload)),
  deleteProduct: (id) => data(api.delete(`/admin/products/${id}`)),

  createCategory: (payload) => data(api.post("/admin/categories", payload)),
  updateCategory: (id, payload) => data(api.put(`/admin/categories/${id}`, payload)),
  deleteCategory: (id) => data(api.delete(`/admin/categories/${id}`)),
};
