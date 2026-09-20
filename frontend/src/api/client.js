const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

let accessToken = null;
let refreshPromise = null;

export const tokenStorage = {
  get: () => accessToken,
  set: (token) => {
    accessToken = token;
  },
  clear: () => {
    accessToken = null;
  },
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const getErrorMessage = async (response) => {
  try {
    const data = await response.json();
    return data.message || "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
};

const sendRequest = async (path, options = {}) => {
  const { body, headers, ...requestOptions } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    credentials: "include",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) throw new ApiError(await getErrorMessage(response), response.status);
  return response.status === 204 ? null : response.json();
};

export const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = sendRequest("/api/auth/refresh", { method: "POST" })
      .then((data) => {
        tokenStorage.set(data.accessToken);
        return data.accessToken;
      })
      .catch((error) => {
        tokenStorage.clear();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

export const apiRequest = async (path, options = {}) => {
  const { requiresAuth = false, retryOnUnauthorized = true, ...requestOptions } = options;
  const token = tokenStorage.get();
  const headers = {
    ...requestOptions.headers,
    ...(requiresAuth && token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    return await sendRequest(path, { ...requestOptions, headers });
  } catch (error) {
    if (!requiresAuth || error.status !== 401 || !retryOnUnauthorized) throw error;
    await refreshAccessToken();
    return apiRequest(path, { ...options, retryOnUnauthorized: false });
  }
};
