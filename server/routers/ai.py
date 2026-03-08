from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from utils.schema import QuestionRequest, LogicEngineResponse, QuestionResponse
from utils.db import get_question
from utils.engine import prepare_next_question
from ollama import AsyncClient
import time
import json
import random

router: APIRouter = APIRouter(prefix="/api/ai", tags=["Large Language Model"])


@router.post("/debug/question")
async def debug_get_question(request: QuestionRequest):
    result: LogicEngineResponse = prepare_next_question(request)
    return get_question(query_fields=result)

@router.post("/question")
async def get_rag_question(request: QuestionRequest) -> dict[str, Any]:
    
    query: LogicEngineResponse = prepare_next_question(request)
    fetched_item: QuestionResponse = get_question(query)
    
    image_instruction = ""
    if fetched_item.get("image"):
        image_instruction = (
            "WARNING: The seed question relies on an accompanying image/graph. You MUST phrase your new question so that it explicitly describes the visual scenario, or clearly references 'the provided diagram'."
        )

    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert Science Assessment AI. Your task is to generate a VARIATION of a given seed question. "
                "Strictly adhere to these rules:\n"
                "1. CONSERVATION: Test the exact same scientific concept as the Seed Question.\n"
                "2. CONSISTENCY: The correct answer MUST remain exactly the same as the input. Do not change it.\n"
                "3. FRESHNESS: Change the phrasing or sentence structure of the question, but keep the underlying science identical.\n"
                "4. OPTIONS: Provide exactly 4 multiple-choice options. One of them MUST be the exact Correct Answer.\n"
                "5. FORMAT: Output only a single valid JSON object.\n"
                f"{image_instruction}\n"
            )
        },
        {
            "role": "user",
            "content": f"""
                Seed Question: '{fetched_item.get('question')}'
                Correct Answer: '{fetched_item.get('answer')}'
                Bloom Taxonomy: '{fetched_item.get('bloom_taxonomy')}'
                Difficulty: '{fetched_item.get('difficulty')}'
                Subtopic: '{fetched_item.get('subtopic')}'

                Task: Create a variation of this question. You must include the Correct Answer in the options array.

                Output JSON format:
                {{
                "question": "...",
                "options": ["...", "...", "...", "..."],
                "answer": "{fetched_item.get('answer')}",
                "bloom_taxonomy": "{fetched_item.get('bloom_taxonomy')}",
                "difficulty": "{fetched_item.get('difficulty')}",
                "subtopic": "{fetched_item.get('subtopic')}"
                }}"""
        }
    ]

    start_time = time.perf_counter()
    response = await AsyncClient().chat(
        model='llama3.1:8b', 
        messages=messages,
        format='json'
    )
    end_time = time.perf_counter()

    try:
        clean_result = json.loads(response.message.content)
        options = clean_result.get("options", [])

        # Shuffle them in place
        random.shuffle(options)

        # Put them back
        clean_result["options"] = options

    except json.JSONDecodeError:
        # Fallback if for some reason it's not valid JSON
        clean_result = {"error": "Invalid JSON returned", "raw": response.message.content}

    generation_time = end_time - start_time

    return {
        "queries": fetched_item,
        "result": clean_result,
        "execution_time_seconds": round(generation_time, 3)
    }


 
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
