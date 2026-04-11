const ADMIN_STORAGE_KEY = "giftnest_admin_auth";

export const saveAdminAuth = (data) => {
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(data));
};

export const getAdminAuth = () => {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearAdminAuth = () => {
  localStorage.removeItem(ADMIN_STORAGE_KEY);
};
