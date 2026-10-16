# Travel Guide — Fixed Project

## Features
- Search and select the six destinations in the original page.
- Choose Summary or Detailed guide.
- Generate built-in destination descriptions without an API key.
- Optional OpenAI-generated and translated guide text with `OPENAI_API_KEY`.
- Browser speech synthesis for audio playback.
- English, Hindi, Tamil, and Telugu language selection.
- Flask health endpoint at `/api/health`.

## Project structure
```text
TRAVEL_GUIDE_FIXED/
├── Backend/app.py
├── Frontend/index.html
├── Frontend/index.js
├── requirements.txt
└── README.md
```

## Run on Windows
1. Install Python 3.10 or newer and extract this ZIP.
2. Open Command Prompt in the `TRAVEL_GUIDE_FIXED` folder.
3. Run:
   ```bat
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   python Backend\app.py
   ```
4. Open `http://127.0.0.1:5000` in Chrome.

## Optional OpenAI integration
Set the API key in the same terminal before starting the server:
```bat
set OPENAI_API_KEY=your_api_key_here
set OPENAI_MODEL=gpt-4o-mini
python Backend\app.py
```
Keep the key private. Do not add it to frontend files or upload it to GitHub. Without the key, built-in descriptions work in English. To generate translated guide text in Hindi, Tamil, or Telugu, configure the OpenAI API key.

## Test
Open `http://127.0.0.1:5000/api/health`. It should return JSON with `"status": "ok"`.

PowerShell API test:
```powershell
Invoke-RestMethod -Uri http://127.0.0.1:5000/api/generate-guide -Method Post -ContentType "application/json" -Body '{"place":"Taj Mahal","answerType":"Summary","language":"English","voice":"Male"}'
```

## Notes
Audio playback uses voices supplied by the browser/operating system. Voice gender selection is best-effort, and language voices may need to be installed on the device. Current opening hours, ticket prices, closures, and local rules should be checked with official sources. The original page uses remote images, Google Fonts, and Tailwind CDN, so those visual assets need an internet connection.
