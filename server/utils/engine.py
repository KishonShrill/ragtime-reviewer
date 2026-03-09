# def evaluate_answer(profile: dict[str, [str, float]], is_correct: bool) -> dict[str, any]:
#     """
#     Updates the mastery score and applies the Scaffolding Routine if necessary.
#     """
#     score: float = profile["mastery_score"]
#     current_bloom: str = profile["bloom_level"]
# 
#     if is_correct:
#         # TODO: Increment logic (define the exact math later acc to difficulty)
#         score = min(1.0, score + 0.1)
#         scaffold_bloom = current_bloom
#     else:
#         # TODO: Decrement logic and flag as Weak Concept
#         score = max(0.0, score - 0.1)
# 
#         # Scaffolding: Step down Bloom's level if it's above Remembering
#         bloom_heirarchy = ["Remembering", "Understanding", "Applying"]
#         if current_bloom in bloom_heirarchy and current_bloom != "Remembering":
#             current_index = bloom_heirarchy.index(current_bloom)
#             scaffold_bloom = bloom_heirarchy[current_index - 1]
#         else:
#             scaffold_bloom = "Remembering"
# 
#     profile["mastery_score"] = round(score, 2)
#     profile["last_bloom_level"] = scaffold_bloom
# 
#     return profile


from utils.schema import QuestionRequest, LogicEngineResponse
import random
import numpy as np

rng = np.random.default_rng()

def prepare_next_question(request: QuestionRequest) -> LogicEngineResponse:
    """
    Determines the difficulty and Bloom's level for the next question 
    based on the learner's knowledge state vector.
    """
    # 1. Get the specific knowledge object for the chosen subject
    difficulty: str = ""
    bloom: str = ""
    subject = request.subject

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

