import axios from "axios";
import { getUserAuth } from "./userAuth";

const isDev = import.meta.env.DEV;
const localBaseURL = "http://localhost:5000/api";
const remoteBaseURL = "https://giftsnest-backend.onrender.com/api";
const envBaseURL = import.meta.env.VITE_API_BASE_URL;
const baseURL = envBaseURL || (isDev ? localBaseURL : remoteBaseURL);
const fallbackBaseURL = isDev && baseURL !== localBaseURL ? localBaseURL : null;

const api = axios.create({
  baseURL,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const userAuth = getUserAuth();

  if (userAuth?.token && !config.headers?.Authorization) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${userAuth.token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const canRetryWithFallback =
      Boolean(fallbackBaseURL) &&
      error?.config &&
      !error.config.__isFallbackRetry &&
      !String(error.config.url || "").startsWith("http");

    if (!canRetryWithFallback) {
      return Promise.reject(error);
    }

    return api.request({
      ...error.config,
      baseURL: fallbackBaseURL,
      __isFallbackRetry: true,
    });
  }
);

export default api;