from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from utils.schema import DebugQuestionRequest

router: APIRouter = APIRouter(prefix="/api/ai", tags=["ai"])


# @router.post("/debug/question")
# async def debug_get_question(request: DebugQuestionRequest):
#     """
#     Debug endpoint to force the generation of a question with exact parameters.
#     """
#     # Convert Pydantic model to dict to feed into our function
#     spec_dict = request.model_dump() 
#     
#     # Fetch the mocked question
#     mocked_question: str = get_question(spec_dict)
#     
#     return {
#         "status": "success",
#         "requested_specs": spec_dict,
#         "generated_question": mocked_question
#     }
# 
# 
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
