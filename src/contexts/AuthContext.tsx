import React, { createContext, useContext, useState, ReactNode } from 'react';
import { okAsync, errAsync, ResultAsync } from 'neverthrow'

// Define the user roles based on your requirements
type UserRole = 'admin' | 'free_trial' | 'regular' | null;

interface AuthenticationError {
    title: string;
    reason: string;
}

interface AuthenticationSuccess {
    username: string;
    role: UserRole;
}

interface AuthContextType {
    user: string | null;
    role: UserRole;
    token: string | null;
    login: (username: string, pass: string, url: string) => ResultAsync<AuthenticationSuccess, AuthenticationError>;
    signup: (username: string, pass: string, url: string, secret: string) => ResultAsync<AuthenticationSuccess, AuthenticationError>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    // Initialize from localStorage so data survives a refresh
    const [user, setUser] = useState<string | null>(localStorage.getItem('user'));
    const [role, setRole] = useState<UserRole>(localStorage.getItem('role') as UserRole);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(false);

    const signup = (username: string, pass: string, url: string, secret: string): ResultAsync<AuthenticationSuccess, AuthenticationError> => {
        setIsLoading(true);
        const cleanUrl = url.replace(/\/$/, "");

        return ResultAsync.fromPromise(
            fetch(`${cleanUrl}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    password: pass,
                    secret,
                }),
            }),
            (error) => ({ title: "Unreachable Server", reason: `Network Error: ${(error)}` })
        ).andThen((response) => {
            // Specific error handling as requested
            if (response.status === 404) return errAsync({ title: "Uncreachable Server", reason: "The backend link is wrong. Please try again..." });

            return ResultAsync.fromPromise(
                response.json(),
                () => ({ title: "Parsing Error", reason: "Failed to parse response..." })
            ).andThen((data) => {
                console.log(JSON.stringify(data))
                console.log(response)

                if (!response.ok) {
                    return errAsync({
                        title: data?.detail?.title || "Error",
                        reason: data?.detail?.reason || "An unknown error occurred"
                    });
                }

                // Success Logic
                setToken(data.access_token);
                setRole(data.role);
                setUser(data.username);

                localStorage.setItem('token', data.access_token);
                localStorage.setItem('role', data.role);
                localStorage.setItem('user', data.username);
                localStorage.setItem('backend_url', cleanUrl);

                return okAsync({ username: data.username, role: data.role });
            });
        }).mapErr((err) => {
            // Ensure loading is off on error
            setIsLoading(false);
            return err;
        }).map((val) => {
            // Ensure loading is off on success
            setIsLoading(false);
            return val;
        });
    };

    const login = (username: string, pass: string, url: string): ResultAsync<AuthenticationSuccess, AuthenticationError> => {
        setIsLoading(true);
        const cleanUrl = url.replace(/\/$/, "");

        return ResultAsync.fromPromise(
            fetch(`${cleanUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    password: pass,
                }),
            }),
            (error) => ({ title: "Unreachable Server", reason: `Network Erorr: ${(error)}` })
        ).andThen((response) => {
            // Specific error handling as requested
            if (response.status === 404) return errAsync({ title: "Uncreachable Server", reason: "The backend link is wrong. Please try again..." });

            return ResultAsync.fromPromise(
                response.json(),
                () => ({ title: "Parsing Error", reason: "Failed to parse response..." })
            ).andThen((data) => {
                console.log(JSON.stringify(data))
                console.log(response)

                if (!response.ok) {
                    return errAsync({
                        title: data?.detail?.title || "Error",
                        reason: data?.detail?.reason || "An unknown error occurred"
                    });
                }

                // Success Logic
                setToken(data.access_token);
                setRole(data.role);
                setUser(data.username);

                localStorage.setItem('token', data.access_token);
                localStorage.setItem('role', data.role);
                localStorage.setItem('user', data.username);
                localStorage.setItem('backend_url', cleanUrl);

                return okAsync({ username: data.username, role: data.role });
            });
        }).mapErr((err) => {
            // Ensure loading is off on error
            setIsLoading(false);
            return err;
        }).map((val) => {
            // Ensure loading is off on success
            setIsLoading(false);
            return val;
        });
    }

    const logout = () => {
        setToken(null);
        setRole(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, role, token, login, signup, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
};
