import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the user roles based on your requirements
type UserRole = 'admin' | 'free_trial' | 'regular' | null;

interface AuthContextType {
  user: string | null;
  role: UserRole;
  token: string | null;
  login: (username: string, url: string, pass: string, secret: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Initialize from localStorage so data survives a refresh
  const [user, setUser] = useState<string | null>(localStorage.getItem('user'));
  const [role, setRole] = useState<UserRole>(localStorage.getItem('role') as UserRole);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [baseUrl, setBaseUrl] = useState<string | null>(localStorage.getItem('backend_url'));
  const [isLoading, setIsLoading] = useState(false);

  const login = async (username: string, url: string, pass: string, secret: string) => {
    setIsLoading(true);
    try {
      // 1. Validate the URL format first
      const cleanUrl = url.replace(/\/$/, "");
      
      const response = await fetch(`${cleanUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          password: pass, 
          secret,
          salt: import.meta.env.VITE_AUTH_SALT 
        }),
      });

      // Specific error handling as requested
      if (response.status === 404) {
        throw new Error("The backend link is wrong.");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Password or Secret is incorrect.");
      }

      // Success: Set state and local storage
      setToken(data.access_token);
      setRole(data.role); // Role returned from FastAPI (admin, free_trial, regular)
      setUser(username);
      setBaseUrl(cleanUrl);

      // PERSIST EVERYTHING TO LOCALSTORAGE
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('user', username);
      localStorage.setItem('backend_url', cleanUrl);
      
    } catch (error: any) {
      throw error; // Re-throw to be caught by the Landing Page UI
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    setUser(null);
    setBaseUrl(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, role, token, baseUrl, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
