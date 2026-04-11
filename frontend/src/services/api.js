import axios from "axios";
import { getUserAuth } from "./userAuth";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://giftsnest-backend.onrender.com/api";

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const userAuth = getUserAuth();

  if (userAuth?.token && !config.headers?.Authorization) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${userAuth.token}`;
  }

  return config;
});

export default api;