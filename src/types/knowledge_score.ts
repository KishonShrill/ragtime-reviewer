export interface SubtopicKnowledgeScore {
    mastery_score: number; // Python float -> TS number
    rank: 'Easy' | 'Medium' | 'Hard' | string; // Matches your difficulty levels
    weak_concepts: string[];
}

// This handles the dict[str, SubtopicKnowledgeScore]
export interface Subtopic {
    // Key is the name of the subtopic (e.g., "Photosynthesis")
    [subtopicName: string]: SubtopicKnowledgeScore;
}

export interface KnowledgeScores {
    subtopic: Subtopic;
}
