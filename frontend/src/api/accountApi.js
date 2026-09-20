import { apiRequest } from "./client";

export const accountApi = {
  getProfile: () => apiRequest("/api/auth/profile", { requiresAuth: true }),
  getAdminArea: () => apiRequest("/api/auth/admin", { requiresAuth: true }),
  getStaffArea: () => apiRequest("/api/auth/staff", { requiresAuth: true }),
};
