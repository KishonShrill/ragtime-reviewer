export interface Question {
    original_question_id: string | null;
    question: string;
    description: string;
    options: string[];
    answer: string;
    bloom_taxonomy: string;
    difficulty: string;
    subtopic: string;
    image: string | null;
    isMock: boolean | null;
    mockMessage: string | null;
}
