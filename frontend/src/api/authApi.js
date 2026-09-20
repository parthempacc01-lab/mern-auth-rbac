import { apiRequest, tokenStorage } from "./client";

export const authApi = {
  register: (details) => apiRequest("/api/auth/register", { method: "POST", body: details }),
  login: async (credentials) => {
    const data = await apiRequest("/api/auth/login", { method: "POST", body: credentials });
    tokenStorage.set(data.accessToken);
    return data;
  },
  logout: async () => {
    try {
      return await apiRequest("/api/auth/logout", { method: "POST" });
    } finally {
      tokenStorage.clear();
    }
  },
  forgotPassword: (email) => apiRequest("/api/auth/forgot-password", { method: "POST", body: { email } }),
  resetPassword: (token, newPassword) => apiRequest("/api/auth/reset-password", { method: "POST", body: { token, newPassword } }),
  resendVerification: (email) => apiRequest("/api/auth/resend-verification", { method: "POST", body: { email } }),
  startGoogleLogin: () => window.location.assign(`${import.meta.env.VITE_API_URL || ""}/api/auth/google`),
};
