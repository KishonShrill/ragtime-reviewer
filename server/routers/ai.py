from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from utils.schema import QuestionRequest
from utils.db import get_question

router: APIRouter = APIRouter(prefix="/api/ai", tags=["Large Language Model"])


@router.post("/debug/question")
async def debug_get_question(request: QuestionRequest):
    return get_question(request)

@router.post("/question")
async def get_rag_question(request: QuestionRequest) -> dict[str,str]:
    fetched_item = get_question(request)

    prompt = {
        "instruction": "You are an expert Science Assessment AI. Your task is to generate a VARIATION of a given seed question. Strictly adhere to these rules:\n1. CONSERVATION: Test the exact same scientific concept as the Seed Question.\n2. CONSISTENCY: The correct answer must remain scientifically accurate and match the logic of the Seed.\n3. FRESHNESS: Completely rewrite the scenario, variables, or phrasing so it is a distinct version of the Seed.\n4. OPTIONS: Provide 4 multiple-choice options, including the correct answer.\n5. FORMAT: Output only a single valid JSON object.",
        "user_prompt": f"""
Seed Question: '{fetched_item.get('question')}'
Correct Answer: '{fetched_item.get('answer')}'
Bloom Taxonomy: '{fetched_item.get('bloom_taxonomy')}'

Task: Create a variation of this question.

Output JSON format:
{{
"question": "...",
"options": ["Option A", "Option B", "Option C", "Option D"],
"answer": "The correct answer..."
}}"""
    }

    return prompt


 
# @router.post("/quiz/submit_answer")
# async def submit_answer(profile: LearnerProfile, is_correct: bool):
#     # Convert incoming profile to dict
#     profile_dict = profile.model_dump()
#     
#     # 1. Evaluate the answer and update mastery/scaffolding
#     updated_profile = evaluate_answer(profile_dict, is_correct)
#     
#     # 2. Prepare specs for the next question based on new mastery
#     next_question_specs = prepare_next_question(updated_profile)
#     
#     # 3. Retrieve/Generate the actual question
#     next_question_data = get_question(next_question_specs)
#     
#     return {
#         "updated_profile": updated_profile,
#         "next_question": next_question_data
#     }
