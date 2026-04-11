const USER_STORAGE_KEY = "giftnest_user_auth";

export const saveUserAuth = (data) => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
};

export const getUserAuth = () => {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearUserAuth = () => {
  localStorage.removeItem(USER_STORAGE_KEY);
};
