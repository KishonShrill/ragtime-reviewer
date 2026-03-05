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


def prepare_next_question(profile_dict: dict[str, any]) -> dict[str, any]:
    """
    Determines the difficulty and Bloom's level for the next question 
    based on the learner's knowledge state vector.
    """
    score: float = profile_dict.get("mastery_score", 0.0)
    
    # Rank 1: Novice (Score < 0.4) - Focuses on building foundation[cite: 521].
    if score < 0.4:
        difficulty: str = "Easy"
        bloom: str = random.choices(
            population=["Remembering", "Understanding", "Applying"], 
            weights=[80, 20, 0] # 80% Remembering, 20% Understanding[cite: 522, 523, 555].
        )[0]
        
    # Rank 2: Competent (Score 0.4-0.7) - Focuses on strengthening comprehension[cite: 527].
    elif score <= 0.7:
        difficulty: str = "Medium"
        bloom: str = random.choices(
            population=["Remembering", "Understanding", "Applying"], 
            weights=[20, 60, 20] # 20% Remembering, 60% Understanding, 20% Applying[cite: 528, 529, 530].
        )[0]
        
    # Rank 3: Expert (Score > 0.7) - Focuses on mastery and application[cite: 531].
    else:
        difficulty: str = "Hard"
        bloom: str = random.choices(
            population=["Remembering", "Understanding", "Applying"], 
            weights=[10, 20, 70] # 10% Remembering, 20% Understanding, 70% Applying[cite: 532, 533, 534].
        )[0]
        
    return {
        "subtopic": profile_dict.get("subtopic"),
        "difficulty": difficulty,
        "bloom_level": bloom
    }

