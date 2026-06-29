export interface Question {
    original_question_id: string | null;
    original_question: string;
    downgraded_question: string | null;
    downgraded_answer: string;
    description: string | null;
    options: string[];
    answer: string;
    bloom_taxonomy: string;
    difficulty: string;
    subtopic: string;
    image: string | null;
    isMock: boolean | null;
    mockMessage: string | null;
}

export type LogEntry = {
    isCorrect: boolean;
    timestamp: string;
    knowledge_base: {
        original_question_id?: string;
        area: string;
    };
    augmented: {
        question: string;
        subtopic: string;
        difficulty: string;
        bloom_taxonomy: string;
    };
};
