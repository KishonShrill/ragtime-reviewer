import os
import csv
import json
import numpy as np
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import ollama  # Make sure ollama is running in the background
from collections import defaultdict

rng = np.random.default_rng()

# Connect to MongoDB
MONGO_URI = os.getenv("mongodb+srv://public_user:public_user@chirscentportfolio.qj3tx5b.mongodb.net/FinalThesis") 
client = MongoClient(host=MONGO_URI, server_api=ServerApi(version='1'))
db = client.get_database(name="FinalThesis")
knowledge_base = db.get_collection(name="KnowledgeBase")

QUESTIONS_PER_CATEGORY = 2

def generate_rag_variation(seed_item):
    """Passes the seed to Ollama to get the RAG variation."""
    image_instruction = ""
    if seed_item.get("image"):
        image_instruction = "WARNING: The seed question relies on an accompanying image/graph. You MUST phrase your new question so that it explicitly describes the visual scenario, or clearly references 'the provided diagram'."

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
                Seed Question: '{seed_item.get('question')}'
                Correct Answer: '{seed_item.get('answer')}'
                Bloom Taxonomy: '{seed_item.get('bloom_taxonomy')}'
                Difficulty: '{seed_item.get('difficulty')}'
                Subtopic: '{seed_item.get('subtopic')}'

                Output JSON format:
                {{
                "question": "...",
                "options": ["...", "...", "...", "..."],
                "answer": "{seed_item.get('answer')}"
                }}"""
        }
    ]

    try:
        # Using the synchronous chat for a simple export script
        response = ollama.chat(
            model='qwen3.5:0.8b', 
            messages=messages,
            format='json'
        )
        return json.loads(response['message']['content'])
    except Exception as e:
        print(f"Failed to generate variation for ID {seed_item.get('question_id')}: {e}")
        return {
            "question": f"[MOCK RAG VARIATION] {seed_item.get('question')} (Pretend this is rewritten!)",
            "options": [
                seed_item.get('answer'),
                "[Mock Distractor A]",
                "[Mock Distractor B]",
                "[Mock Distractor C]"
            ],
            "answer": seed_item.get('answer')
        }

def generate_balanced_review_sheet():
    print("1. Fetching valid questions from the Knowledge Base...")

    # We only use MongoDB to filter out the excluded categories
    pipeline = [
        { "$match": { "$nor": [ {"bloom_taxonomy": "Remembering", "difficulty": "Easy"}, {"bloom_taxonomy": "Applying", "difficulty": "Easy"} ] } }
    ]
    
    all_valid_questions = list(knowledge_base.aggregate(pipeline))

    # --- NEW: TRULY RANDOM GROUPING IN PYTHON ---
    print("2. Shuffling and categorizing questions...")
    grouped_questions = defaultdict(list)
    
    # Group every question into its specific category bucket
    for q in all_valid_questions:
        key = (q.get("subtopic"), q.get("bloom_taxonomy"), q.get("difficulty"))
        grouped_questions[key].append(q)

    balanced_questions = []
    
    # Randomly pick 2 from every single bucket
    for key, group in grouped_questions.items():
        sample_size = min(len(group), QUESTIONS_PER_CATEGORY)
        sampled = rng.choice(group, sample_size) # True random pick!
        balanced_questions.extend(sampled)

    # --- NUMPY STRICT 50 LOGIC ---
    if len(balanced_questions) > 50:
        print(f"   Fetched {len(balanced_questions)} balanced questions. Shaving randomly to exactly 50...")
        random_indices = np.random.choice(len(balanced_questions), size=50, replace=False)
        balanced_questions = [balanced_questions[i] for i in random_indices]
        
    # Sort them nicely for the professors after the random shave
    balanced_questions.sort(key=lambda x: (x.get("subtopic", ""), x.get("bloom_taxonomy", ""), x.get("difficulty", "")))
    # ----------------------------

    filename = "rag_sme_validation_sheet_strict_50.csv"
    
    print(f"3. Generating RAG variations for exactly {len(balanced_questions)} questions. This might take a minute...")

    with open(filename, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        
        writer.writerow([
            "Question ID", 
            "Image", 
            "Subtopic", 
            "Bloom's", 
            "Difficulty", 
            "Original Seed Question", 
            "RAG Generated Question", 
            "Real Answer", 
            "RAG Generated Options",
            "SME: Accuracy (1-5)",
            "SME: Clarity (1-5)",
            "SME: Remarks"
        ])

        for i, q in enumerate(balanced_questions, 1):
            print(f"   Processing {i}/{len(balanced_questions)}: {q.get('question_id')}")
            
            rag_output = generate_rag_variation(q) 
            
            options_list = rag_output.get("options", [])
            formatted_options = "\n".join([f"- {opt}" for opt in options_list]) if isinstance(options_list, list) else str(options_list)

            writer.writerow([
                q.get("question_id", ""),
                q.get("image", ""),
                q.get("subtopic", ""),
                q.get("bloom_taxonomy", ""),
                q.get("difficulty", ""),
                q.get("question", ""),
                rag_output.get("question", ""), 
                q.get("answer", ""),
                formatted_options, 
                "", 
                "", 
                ""  
            ])

    print(f"✅ Successfully exported and generated {filename}!")

if __name__ == "__main__":
    generate_balanced_review_sheet()

