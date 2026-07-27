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

const cache = {};
const CACHE_TTL = 10000; // 10 seconds
const CACHEABLE_URLS = ["/products", "/cms/shell", "/store-info", "/cms/content/homepage"];

api.interceptors.request.use((config) => {
  const userAuth = getUserAuth();

  if (userAuth?.token && !config.headers?.Authorization) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${userAuth.token}`;
  }

  if (config.method === "get" && CACHEABLE_URLS.includes(config.url)) {
    const cacheKey = config.url + (config.params ? JSON.stringify(config.params) : "");
    const cached = cache[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      config.adapter = () => {
        return Promise.resolve({
          data: cached.data,
          status: cached.status,
          statusText: cached.statusText,
          headers: cached.headers,
          config,
          request: {}
        });
      };
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.config.method === "get" && CACHEABLE_URLS.includes(response.config.url)) {
      const cacheKey = response.config.url + (response.config.params ? JSON.stringify(response.config.params) : "");
      cache[cacheKey] = {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        timestamp: Date.now(),
      };
    }
    return response;
  },
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

export const resolveMediaUrl = (url) => {
  if (!url) return "";
  if (typeof url !== "string") return url;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    if (url.includes("cloudinary.com")) {
      return url;
    }
    if (url.includes("/uploads/")) {
      const path = url.substring(url.indexOf("/uploads/"));
      const backendOrigin = baseURL.replace(/\/api$/, "");
      return `${backendOrigin}${path}`;
    }
    return url;
  }

  if (url.startsWith("/uploads/") || url.startsWith("uploads/")) {
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    const backendOrigin = baseURL.replace(/\/api$/, "");
    return `${backendOrigin}${cleanPath}`;
  }

  return url;
};

export default api;