import { createContext, useContext, useState } from 'react';
import { okAsync, errAsync, ResultAsync } from 'neverthrow';
import type { ReactNode } from 'react';
import type { Subtopic } from '@/types/knowledge_score';
import type {
    UserRole,
    AuthContextType,
    AuthResponseData,
    AuthenticationError,
    AuthenticationSuccess
} from '@/types/authentication';


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<string | null>(localStorage.getItem('user'));
    const [role, setRole] = useState<UserRole>(localStorage.getItem('role') as UserRole);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [backendUrl, setBackendUrl] = useState<string | null>(localStorage.getItem('backend_url'));
    const [knowledgeScores, setKnowledgeScores] = useState<Subtopic>(JSON.parse(localStorage.getItem('knowledge_scores') ?? '{}') as Subtopic);
    const [isLoading, setIsLoading] = useState(false);

    function initializeSetup(data: AuthResponseData, url: string) {
        setToken(data.access_token);
        setRole(data.role);
        setUser(data.username);
        setBackendUrl(url);
        setKnowledgeScores(data.knowledge_scores)

        localStorage.setItem('token', data.access_token);
        localStorage.setItem('role', data.role ?? '');
        localStorage.setItem('user', data.username);
        localStorage.setItem('backend_url', url);
        localStorage.setItem('knowledge_scores', JSON.stringify(data.knowledge_scores));
    }

    /**
     * Shared logic for all Auth POST requests
     */
    const executeAuth = (
        endpoint: string,
        body: object,
        url: string
    ): ResultAsync<AuthenticationSuccess, AuthenticationError> => {
        setIsLoading(true);
        const cleanUrl = url.replace(/\/$/, "");

        return ResultAsync.fromPromise(
            fetch(`${cleanUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }),
            (error) => ({ title: "Unreachable Server", reason: `Network Error: ${String(error)}` })
        ).andThen((response) => {
            if (response.status === 404)
                return errAsync({ title: "Unreachable Server", reason: "The backend link is wrong." });

            return ResultAsync.fromPromise(
                response.json(),
                () => ({ title: "Parsing Error", reason: "Failed to parse response..." })
            ).andThen((data) => {
                if (!response.ok) {
                    return errAsync({
                        title: data?.detail?.title || "Error",
                        reason: data?.detail?.reason || "An unknown error occurred"
                    });
                }

                initializeSetup(data as AuthResponseData, cleanUrl);
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

    const signup = (username: string, email: string, password: string, url: string, secret: string) =>
        executeAuth('/api/auth/signup', { username, email, password, secret }, url);

    const login = (username: string, password: string, url: string) =>
        executeAuth('/api/auth/login', { username, password }, url);

    const logout = () => {
        setToken(null);
        setRole('');
        setUser(null);
        setBackendUrl(null);
        setKnowledgeScores(JSON.parse('{}'))
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user');
        localStorage.removeItem('backend_url');
        localStorage.removeItem('knowledge_scores');
    };

    const updateKnowledgeScores = (data: Subtopic) => {
        setKnowledgeScores(data)
    }

    return (
        <AuthContext.Provider value={{
            user,
            role,
            token,
            login,
            signup,
            logout,
            knowledgeScores,
            updateKnowledgeScores,
            backendUrl,
            isLoading
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
};
