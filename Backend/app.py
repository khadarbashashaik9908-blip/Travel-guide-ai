"""Flask backend for the Travel Guide project.

Optional AI mode: set OPENAI_API_KEY in the environment.
Without a key, built-in destination descriptions are returned.
"""
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from murf import Murf

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "Frontend"
app = Flask(__name__, static_folder=None)
murf_client = Murf() if os.getenv("MURF_API_KEY") else None

LANGUAGES = {"English": "English", "Hindi": "Hindi", "Tamil": "Tamil", "Telugu": "Telugu"}

DESTINATIONS = {
    "taj mahal": ("Agra, Uttar Pradesh",
        "The Taj Mahal is a white-marble mausoleum in Agra, commissioned by Mughal emperor Shah Jahan in memory of Mumtaz Mahal. Its balanced design, detailed inlay work, and gardens make it one of India's best-known monuments.",
        "The Taj Mahal stands on the banks of the Yamuna River in Agra, Uttar Pradesh. Mughal emperor Shah Jahan commissioned it in memory of his wife Mumtaz Mahal, and construction took place mainly during the seventeenth century. The complex is known for its white marble, symmetrical layout, calligraphy, pietra dura inlay, reflecting pools, and formal gardens. The marble changes subtly with the light throughout the day. Visitors should check current ticketing, opening hours, and rules before travelling, and allow time to explore the gardens and surrounding complex."),
    "red fort": ("New Delhi",
        "The Red Fort is a historic Mughal fort in Old Delhi, built under Emperor Shah Jahan in the seventeenth century. Its red sandstone walls enclose palaces, halls, and gardens, and it is closely associated with India's Independence Day.",
        "The Red Fort, or Lal Qila, is a major historic complex in Old Delhi. Emperor Shah Jahan commissioned it when he moved his capital to Shahjahanabad in the seventeenth century. Its massive red sandstone walls surround gateways, audience halls, palace buildings, and landscaped spaces. The fort reflects Mughal architecture and later layers of Indian history. The Prime Minister traditionally addresses the nation from the fort on Independence Day. Check official visitor information for current opening hours, ticket rules, and restricted areas before visiting."),
    "gateway of india": ("Mumbai, Maharashtra",
        "The Gateway of India is a monumental arch on Mumbai's waterfront near the Arabian Sea. Completed in the early twentieth century, it is a landmark associated with the city's harbour and historic Colaba district.",
        "The Gateway of India stands beside the waterfront at Apollo Bunder in Mumbai's Colaba area. Designed in an Indo-Saracenic style with influences from Gujarati architecture, it was completed in 1924. The monument overlooks the Arabian Sea and is a popular place to view the harbour and nearby boats. The Taj Mahal Palace hotel is close by, and the wider Colaba area has markets, cafés, and historic streets. Crowds and access rules can vary, so check local information before travelling."),
    "hawa mahal": ("Jaipur, Rajasthan",
        "Hawa Mahal, the Palace of Winds, is a pink sandstone landmark in Jaipur. Its distinctive honeycomb façade has many small windows designed to allow breezes through the building.",
        "Hawa Mahal is one of Jaipur's best-known landmarks, built in 1799 by Maharaja Sawai Pratap Singh. Its five-storey façade features rows of small windows and screened openings, traditionally associated with allowing royal women to observe street life while maintaining privacy. The pink sandstone façade is striking from the street, while the interior offers a different perspective on its architecture. Hawa Mahal is located in Jaipur's historic centre near markets and other heritage sites. Check current entry details and local traffic conditions before visiting."),
    "golden temple": ("Amritsar, Punjab",
        "The Golden Temple, also known as Harmandir Sahib, is a revered Sikh place of worship in Amritsar. Its gilded upper structure is reflected in the sacred pool surrounding the complex.",
        "Harmandir Sahib, commonly called the Golden Temple, is the central place of worship in Sikhism and is located in Amritsar, Punjab. The shrine stands amid the Amrit Sarovar, a sacred pool, and its gilded upper structure is reflected in the water. Visitors of all backgrounds are welcome, but modest dress, covering the head, removing shoes, and following site etiquette are important. The community kitchen, or langar, serves meals to visitors. Check current visitor guidance, respect prayer areas, and allow time for security and crowds."),
    "mysore palace": ("Mysuru, Karnataka",
        "Mysore Palace is a grand royal residence in Mysuru, known for its Indo-Saracenic architecture, ornate interiors, and illuminated appearance during special occasions.",
        "Mysore Palace, also called Amba Vilas Palace, is a historic royal residence in Mysuru, Karnataka. The present palace was completed in the early twentieth century and combines Indo-Saracenic design with Hindu, Muslim, Rajput, and Gothic influences. Visitors can see decorative arches, carved doors, painted ceilings, and richly ornamented halls, subject to current access rules. The palace is famous for its illumination during the Dasara festival, when the city hosts cultural celebrations. Check current visiting hours, photography rules, and event schedules before planning your trip.")
}

def find_destination(place):
    key = (place or "").strip().lower()
    if key in DESTINATIONS:
        return key, DESTINATIONS[key]
    for name, data in DESTINATIONS.items():
        if key and (key in name or name in key):
            return name, data
    return None, None

def generate_with_openai(place, answer_type, language, fallback):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return fallback, False
    length_instruction = (
        "Write a detailed audio-guide script of about 250 to 350 words."
        if answer_type == "Detailed"
        else "Write a concise audio-guide script of about 80 to 120 words."
    )
    language_instruction = {
        "English": "Write the entire guide in English.",
        "Hindi": "Write the entire guide in Hindi using Devanagari script.",
        "Tamil": "Write the entire guide in Tamil script.",
        "Telugu": "Write the entire guide in Telugu script."
    }.get(language, "Write the entire guide in English.")

    payload = {
        "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        "messages": [
            {"role": "system", "content": "You are a careful, informative travel guide. Do not invent current prices or opening hours."},
            {"role": "user", "content": f"Create a welcoming travel audio guide for {place}. {length_instruction} {language_instruction} Use clear, natural language and focus on history, important attractions, and visitor tips."}
        ],
        "temperature": 0.5
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            result = json.loads(response.read().decode("utf-8"))
        generated = result["choices"][0]["message"]["content"].strip()
        return (generated or fallback), bool(generated)
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, IndexError, ValueError, TimeoutError):
        return fallback, False

@app.get("/")
def home():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.get("/index.js")
def javascript():
    return send_from_directory(FRONTEND_DIR, "index.js", mimetype="application/javascript")

@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "aiEnabled": bool(os.getenv("OPENAI_API_KEY"))})

@app.post("/api/generate-guide")
def generate_guide():
    body = request.get_json(silent=True) or {}
    place = str(body.get("place", "")).strip()
    answer_type = str(body.get("answerType", "Summary")).strip()
    language = str(body.get("language", "English")).strip()
    voice = str(body.get("voice", "Male")).strip()

    if not place:
        return jsonify({"error": "Please provide a destination name."}), 400
    if language not in LANGUAGES:
        return jsonify({"error": "Unsupported language. Choose English, Hindi, Tamil, or Telugu."}), 400
    if answer_type not in {"Summary", "Detailed"}:
        answer_type = "Summary"
    if voice not in {"Male", "Female"}:
        voice = "Male"

    key, destination = find_destination(place)
    if destination:
        city, short_text, detailed_text = destination
        canonical_name = key.title()
        fallback = short_text if answer_type == "Summary" else detailed_text
    else:
        city = ""
        canonical_name = place
        fallback = (
            f"{place} is the destination you selected for your travel guide. Before your visit, "
            "check trusted local tourism sources for its history, transport options, opening hours, "
            "ticket information, and visitor guidelines. Plan enough time for travel and respect local customs."
        )

    description, ai_generated = generate_with_openai(canonical_name, answer_type, LANGUAGES[language], fallback)
    audio_url = None

    if murf_client and description:
        try:
            voice_settings = {
    "English": ("Natalie", "en-US"),
    "Hindi": ("Anisha", "hi-IN"),
    "Tamil": ("Anisha", "ta-IN"),
    "Telugu": ("Anisha", "te-IN"),
}
            voice_id, locale = voice_settings.get(
                language, ("en-US-natalie", "en-US")
            )
            murf_response = murf_client.text_to_speech.generate(
                text=description[:3000],
                voice_id=voice_id,
                locale=locale,
                format="MP3"
            )
            audio_url = murf_response.audio_file
        except Exception:
            app.logger.exception("Murf audio generation failed")

    return jsonify({
        "place": canonical_name, "city": city, "answerType": answer_type,
        "language": language, "voice": voice, "description": description,
        "aiGenerated": ai_generated,
"audioMode": "murf" if audio_url else "browser-speech-synthesis",
"audioUrl": audio_url
    })

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=False)
