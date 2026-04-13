from typing import Any, Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from utils.schema import QuestionRequest, LogicEngineResponse, QuestionResponse
from utils.db import get_question, get_logs_count, get_specific_question
from utils.engine import prepare_next_question
from utils.token import user_required, admin_required
from ollama import AsyncClient
import time
import json
import numpy as np

# Use the new random generator
rng = np.random.default_rng()

router: APIRouter = APIRouter(prefix="/api/ai", tags=["Large Language Model"])


@router.post("/debug/question")
async def debug_get_question(request: QuestionRequest):
    print(request)
    result: LogicEngineResponse = prepare_next_question(request)
    print(f"Q_Request: {result}")
    return get_question(query_fields=result)

@router.post("/question")
async def get_rag_question(
        user: Annotated[dict[str,str], Depends(dependency=user_required)],
        request: QuestionRequest
        ) -> dict[str, Any]:
    log_count = get_logs_count(user)
    query: LogicEngineResponse = prepare_next_question(request, log_count)
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

    try:
        response = await AsyncClient().chat(
            model='qwen3.5:0.8b', 
            messages=messages,
            format='json',
            think=False
        )
        end_time = time.perf_counter()

        # Parse the real response
        clean_result = {"error": False, "response": json.loads(response.message.content)}

    except json.JSONDecodeError:
        clean_result = {"error": "Inalid Json Returned", "response": response.message.content}

    except Exception as e:
        # 2. OLLAMA FALLBACK: Runs if the server is offline or fails
        print(f"⚠️ Ollama Generation Failed: {e}. Falling back to mock data.")
        end_time = time.perf_counter()
        
        # Build a safe mock using the actual MongoDB seed data
        clean_result = {
            "error": "Offline mode for debugging!", # Flag this as an error/fallback for the frontend
            "response": {
                "question": f"[MOCK] {fetched_item.get('question')} (Please pretend this is rewritten!)",
                "options": [
                    fetched_item.get('answer'),
                    "Generated Distractor A",
                    "Generated Distractor B",
                    "Generated Distractor C"
                ],
                "answer": fetched_item.get('answer'),
                "bloom_taxonomy": fetched_item.get('bloom_taxonomy'),
                "difficulty": fetched_item.get('difficulty'),
                "subtopic": fetched_item.get('subtopic')
            }
        }

    try:
        response_dict = clean_result.get("response", {})
        options = response_dict.get("options", [])
        answer = response_dict.get("answer")
        
        if isinstance(options, list) and answer:
            # 1. SAFETY CHECK: Ensure the exact answer string is inside the options list
            if answer not in options:
                print("⚠️ Warning: Answer was missing from options. Injecting manually.")
                
                # If the LLM gave us 4 or more options, replace the last one so we don't end up with 5 options
                if len(options) >= 4:
                    options[-1] = answer
                else:
                    # If it gave us fewer than 4, just append it
                    options.append(answer)

            # 2. SHUFFLE: Randomize the order so the injected answer isn't always last
            rng.shuffle(options)
            
            # 3. REASSIGN: Save the cleaned and shuffled options back to the dictionary
            clean_result["response"]["options"] = options

    except Exception as e:
        # Fallback if for some reason it's not valid JSON
        clean_result = {"error": "Failed to shuffle options", "response": str(e)}

    generation_time = end_time - start_time

    return {
        "queries": fetched_item,
        "result": clean_result,
        "log_count": log_count,
        "execution_time_seconds": round(generation_time, 3)
    }


@router.post("/trial")
async def get_trial_question( 
        user: Annotated[dict[str,str], Depends(dependency=admin_required)],
        request: QuestionRequest) -> dict[str, Any]:
    
    print(f"🔧 ADMIN TRIAL REQUEST: {request}")
    
    # 1. Fetch the seed question
    if request.question_id:
        # Scenario A: Clicked "Test" from the Knowledge Base table
        fetched_item: QuestionResponse = get_specific_question(request.question_id)
    else:
        # Scenario B: Used the dropdowns on the Selection Page
        query = LogicEngineResponse(
            subtopic=request.subject,
            difficulty=request.difficulty,
            bloom_taxonomy="Understanding"
        )
        fetched_item: QuestionResponse = get_question(query)
    
    # We don't need a log_count for the trial, we just want the generation
    
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

    try:
        response = await AsyncClient().chat(
            model='qwen3.5:0.8b', 
            messages=messages,
            format='json',
            think=False
        )
        end_time = time.perf_counter()
        clean_result = {"error": False, "response": json.loads(response.message.content)}

    except json.JSONDecodeError:
        clean_result = {"error": "Invalid Json Returned", "response": response.message.content}
        end_time = time.perf_counter()

    except Exception as e:
        print(f"⚠️ Ollama Generation Failed: {e}. Falling back to mock data.")
        end_time = time.perf_counter()
        
        clean_result = {
            "error": "Offline mode for debugging!", 
            "response": {
                "question": f"[MOCK] {fetched_item.get('question')} (Please pretend this is rewritten!)",
                "options": [
                    fetched_item.get('answer'),
                    "Generated Distractor A",
                    "Generated Distractor B",
                    "Generated Distractor C"
                ],
                "answer": fetched_item.get('answer'),
                "bloom_taxonomy": fetched_item.get('bloom_taxonomy'),
                "difficulty": fetched_item.get('difficulty'),
                "subtopic": fetched_item.get('subtopic')
            }
        }

    # --- THE SAFETY SHUFFLE INJECTION ---
    try:
        response_dict = clean_result.get("response", {})
        options = response_dict.get("options", [])
        answer = response_dict.get("answer")

        if isinstance(options, list) and answer:
            # SAFETY CHECK: Inject the answer if the LLM hallucinated and forgot it
            if answer not in options:
                print("⚠️ Warning: Answer missing from options. Injecting manually.")
                if len(options) >= 4:
                    options[-1] = answer
                else:
                    options.append(answer)

            rng.shuffle(options)
            clean_result["response"]["options"] = options

    except Exception as e:
        clean_result = {"error": "Failed to shuffle options", "response": str(e)}

    generation_time = end_time - start_time

    return {
        "queries": fetched_item,
        "result": clean_result,
        "log_count": 1,
        "execution_time_seconds": round(generation_time, 3)
    }
