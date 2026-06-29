import { createContext, useContext, useState, useEffect } from "react";
import { getUserAuth, saveUserAuth, clearUserAuth } from "../services/userAuth";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [auth, setAuthState] = useState(getUserAuth());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCallback, setModalCallback] = useState(null);

  const login = (data) => {
    saveUserAuth(data);
    setAuthState(data);
    setIsModalOpen(false);
    if (modalCallback) {
      modalCallback();
      setModalCallback(null);
    }
  };

  const logout = () => {
    clearUserAuth();
    setAuthState(null);
  };

  const showLoginModal = (callback = null) => {
    setModalCallback(() => callback);
    setIsModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsModalOpen(false);
    setModalCallback(null);
  };

  return (
    <AuthContext.Provider
      value={{
        auth,
        isAuthenticated: !!auth?.token,
        login,
        logout,
        isModalOpen,
        showLoginModal,
        closeLoginModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};
