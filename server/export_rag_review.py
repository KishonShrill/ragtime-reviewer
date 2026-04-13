import os
import csv
import json
import numpy as np
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import ollama  # Make sure ollama is running in the background!

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
    print("1. Fetching a balanced sample from the Knowledge Base...")

    pipeline = [
        { "$match": { "$nor": [ {"bloom_taxonomy": "Remembering", "difficulty": "Easy"}, {"bloom_taxonomy": "Applying", "difficulty": "Easy"} ] } },
        { "$group": { "_id": { "subtopic": "$subtopic", "bloom_taxonomy": "$bloom_taxonomy", "difficulty": "$difficulty" }, "questions": { "$push": "$$ROOT" } } },
        { "$project": { "sampled_questions": { "$slice": ["$questions", QUESTIONS_PER_CATEGORY] } } },
        { "$unwind": "$sampled_questions" },
        { "$replaceRoot": { "newRoot": "$sampled_questions" } }
        # { "$sort": { "subtopic": 1, "bloom_taxonomy": 1, "difficulty": 1 } }
    ]

    balanced_questions = list(knowledge_base.aggregate(pipeline))

    # --- NEW: STRICT 50 LOGIC ---
    if len(balanced_questions) > 50:
        print(f"   Fetched {len(balanced_questions)} questions. Shaving randomly down to exactly 50...")
        random_indices = rng.choice(len(balanced_questions), size=50, replace=False)

        balanced_questions = [balanced_questions[i] for i in random_indices]

    # Sort them nicely for the professors after the random shave
    balanced_questions.sort(key=lambda x: (x.get("subtopic", ""), x.get("bloom_taxonomy", ""), x.get("difficulty", "")))
    # ----------------------------

    filename = "rag_sme_validation_sheet_50.csv"
    
    print(f"2. Generating RAG variations for {len(balanced_questions)} questions. This might take a minute...")

    with open(filename, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        
        # Write the headers with the new SME evaluation columns
        writer.writerow([
            "Question ID", 
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
            
            # Ask Ollama to generate the variation
            rag_output = generate_rag_variation(q)
            
            # Format options nicely for Excel
            options_list = rag_output.get("options", [])
            formatted_options = "\n".join([f"- {opt}" for opt in options_list]) if isinstance(options_list, list) else str(options_list)

            writer.writerow([
                q.get("question_id", ""),
                q.get("subtopic", ""),
                q.get("bloom_taxonomy", ""),
                q.get("difficulty", ""),
                q.get("question", ""),
                rag_output.get("question", ""), # The LLM variation
                q.get("answer", ""),
                formatted_options, # The LLM options
                "", # Blank for Professor
                "", # Blank for Professor
                ""  # Blank for Professor
            ])

    print(f"✅ Successfully exported and generated {filename}!")

if __name__ == "__main__":
    generate_balanced_review_sheet()

