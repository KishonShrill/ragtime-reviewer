from utils.schema import QuestionRequest, LogicEngineResponse
import random
import numpy as np

rng = np.random.default_rng()


def get_subject_for_question(index: int) -> str:
    if index < 10:
        return "General Science"
    if index < 20:
        return "Biology"
    if index < 30:
        return "Chemistry"
    if index < 40:
        return "Physics"
    
    # For index 40 to 49 (the final batch), pick randomly
    subjects = ["General Science", "Biology", "Chemistry", "Physics"]
    return rng.choice(subjects)

def prepare_next_question(request: QuestionRequest, log_count: int) -> LogicEngineResponse:
    """
    Determines the difficulty and Bloom's level for the next question 
    based on the learner's knowledge state vector.
    """
    # 1. Get the specific knowledge object for the chosen subject
    difficulty: str = ""
    bloom: str = ""
    subject = get_subject_for_question(log_count % 50) if request.is_trial is not True else request.subject

    # --- BRANCH 1: TRIAL MODE ---
    if request.is_trial and request.difficulty:
        difficulty = request.difficulty.capitalize() # Ensure "Easy", "Medium", "Hard"
        
        # Assign a Bloom level based on the selected trial difficulty
        if difficulty == "Easy":
            bloom = "Remembering"
        elif difficulty == "Medium":
            bloom = "Understanding"
        else:
            bloom = "Applying"

    # 2. Adaptive Logic based on Bloom's Taxonomy
    # --- BRANCH 2: ADAPTIVE MODE ---
    # Rank 1: Novice (Score < 0.4) - Focuses on building foundation[cite: 521].
    elif request.scores:
        subject_data = request.scores.get(subject)
        score: float = subject_data.mastery_score if subject_data else 0.0

        if score < 0.4:
            difficulty = "Easy"
            bloom = rng.choice(
                ["Remembering", "Understanding", "Applying"], 
                p=[0.80, 0.20, 0.0] # 80% Remembering, 20% Understanding[cite: 522, 523, 555].
            )
            
        # Rank 2: Competent (Score 0.4-0.7) - Focuses on strengthening comprehension[cite: 527].
        elif score <= 0.7:
            difficulty = "Medium"
            bloom = rng.choice(
                ["Remembering", "Understanding", "Applying"], 
                p=[0.20, 0.60, 0.20] # 20% Remembering, 60% Understanding, 20% Applying[cite: 528, 529, 530].
            )
            
        # Rank 3: Expert (Score > 0.7) - Focuses on mastery and application[cite: 531].
        else:
            difficulty = "Hard"
            bloom = rng.choice(
                ["Remembering", "Understanding", "Applying"], 
                p=[0.10, 0.20, 0.70] # 10% Remembering, 20% Understanding, 70% Applying[cite: 532, 533, 534].
            )
        
    return LogicEngineResponse(
        subtopic=subject,
        difficulty=difficulty,
        bloom_taxonomy=bloom
    )

