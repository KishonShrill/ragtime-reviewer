import { ResultAsync } from "neverthrow";
import type { Subtopic } from "./knowledge_score";

// Define the user roles based on your requirements
export type UserRole = 'admin' | 'free_trial' | 'regular' | '';

export interface AuthResponseData {
    access_token: string;
    role: UserRole;
    username: string;
    knowledge_scores: Subtopic;
}

export interface AuthenticationError {
    title: string;
    reason: string;
}

export interface AuthenticationSuccess {
    username: string;
    role: UserRole;
}

export interface AuthContextType {
    user: string | null;
    role: UserRole;
    token: string | null;
    backendUrl: string | null;
    knowledgeScores: Subtopic | null;
    login: (username: string, pass: string, url: string) => ResultAsync<AuthenticationSuccess, AuthenticationError>;
    signup: (username: string, pass: string, url: string, secret: string) => ResultAsync<AuthenticationSuccess, AuthenticationError>;
    logout: () => void;
    isLoading: boolean;
}
