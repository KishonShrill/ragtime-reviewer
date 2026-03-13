import { ResultAsync } from "neverthrow";
import type { KnowledgeScores, Subtopic } from "./knowledge_score";

// Define the user roles based on your requirements
export type UserRole = 'admin' | 'free_trial' | 'regular' | '';

export interface AuthResponseData {
    access_token: string;
    role: UserRole;
    email: string;
    username: string;
    knowledge_scores: KnowledgeScores;
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
    email: string | null;
    role: UserRole;
    token: string | null;
    backendUrl: string | null;
    knowledgeScores: Subtopic;
    updateKnowledgeScores: (topic: string, newScore: number) => void;
    login: (username: string, pass: string, url: string) => ResultAsync<AuthenticationSuccess, AuthenticationError>;
    signup: (username: string, email: string, pass: string, url: string, secret: string) => ResultAsync<AuthenticationSuccess, AuthenticationError>;
    logout: () => void;
    isLoading: boolean;
}
