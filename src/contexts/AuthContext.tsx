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
    const [user, setUser] = useState<string | null>(localStorage.getItem('reviewer_user'));
    const [role, setRole] = useState<UserRole>(localStorage.getItem('reviewer_role') as UserRole);
    const [token, setToken] = useState<string | null>(localStorage.getItem('reviewer_token'));
    const [email, setEmail] = useState<string | null>(localStorage.getItem('reviewer_email'));
    const [backendUrl, setBackendUrl] = useState<string | null>(localStorage.getItem('reviewer_backend_url'));
    const [knowledgeScores, setKnowledgeScores] = useState<Subtopic>(() => {
        const stored = JSON.parse(localStorage.getItem('reviewer_knowledge_scores') ?? '{}');
        return stored.subtopic ? stored.subtopic : stored;
    });
    const [isLoading, setIsLoading] = useState(false);

    function initializeSetup(data: AuthResponseData, url: string) {
        console.log(JSON.stringify(data))
        setToken(data.access_token);
        setRole(data.role);
        setEmail(data.email);
        setUser(data.username);
        setBackendUrl(url);
        setKnowledgeScores(data.knowledge_scores.subtopic)

        localStorage.setItem('reviewer_token', data.access_token);
        localStorage.setItem('reviewer_role', data.role ?? '');
        localStorage.setItem('reviewer_email', data.email ?? '');
        localStorage.setItem('reviewer_user', data.username);
        localStorage.setItem('reviewer_backend_url', url);
        localStorage.setItem('reviewer_knowledge_scores', JSON.stringify(data.knowledge_scores.subtopic));
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
        setEmail('');
        setUser(null);
        setBackendUrl(null);
        setKnowledgeScores(JSON.parse('{}'))
        localStorage.removeItem('reviewer_token');
        localStorage.removeItem('reviewer_role');
        localStorage.removeItem('reviewer_email')
        localStorage.removeItem('reviewer_user');
        localStorage.removeItem('reviewer_backend_url');
        localStorage.removeItem('reviewer_knowledge_scores');
        localStorage.removeItem(`reviewer_quizLogs_${user}`);
    };

    const updateKnowledgeScores = (topic: string, newScore: number) => {
        setKnowledgeScores((prevScores) => {
            // Safety check: Don't update if the topic doesn't exist
            const updatedScore = Number.isNaN(newScore) ? 0 : newScore
            if (!prevScores[topic]) return prevScores;

            // Immutably copy the old state and inject the new score
            const updatedScores = {
                ...prevScores,
                [topic]: {
                    ...prevScores[topic],
                    mastery_score: updatedScore
                }
            };

            // Save the newly updated object to local storage
            localStorage.setItem('reviewer_knowledge_scores', JSON.stringify(updatedScores));

            return updatedScores;
        });
    };

    return (
        <AuthContext.Provider value={{
            user,
            email,
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
