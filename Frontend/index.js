// Travel Guide frontend. Run the Flask backend and open http://127.0.0.1:5000.
const state = {
  place: "", image: "", length: "Summary", voice: "Male",
  language: "English", speechLanguage: "English", description: "", isSpeaking: false
};

const cardsContainer = document.querySelector(".cards");
const experiencePanel = document.getElementById("experience");
const previewTitle = document.getElementById("previewTitle");
const audioSection = document.getElementById("audioSection");
const audioPlayer = document.getElementById("audioPlayer");
const transcriptText = document.getElementById("scriptText");
const generateButton = document.getElementById("generateBtn");
const languageSelect = document.getElementById("selectLanguage");
const closeButton = document.getElementById("closeExperience");
const searchPreviewCard = document.getElementById("searchPreviewCard");
const searchPreviewImage = document.getElementById("searchPreviewImage");
const searchPreviewTitle = document.getElementById("searchPreviewTitle");
const transcriptToggle = document.getElementById("transcriptToggle");
const transcriptContent = document.getElementById("transcriptContent");
const transcriptArrow = document.getElementById("transcriptArrow");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchBtn");
const appStatus = document.getElementById("appStatus");

const LANGUAGE_CODES = {
  English: "en-US", Hindi: "hi-IN", Tamil: "ta-IN", Telugu: "te-IN"
};

function setStatus(message, isError = false) {
  if (!appStatus) return;
  appStatus.textContent = message;
  appStatus.className = `max-w-7xl mx-auto mb-4 text-sm ${isError ? "text-red-600" : "text-gray-500"}`;
}

function selectDestination(place, image, clickedCard = null) {
  state.place = place;
  state.image = image || "";
  state.description = "";
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();

  if (previewTitle) previewTitle.textContent = place;
  cardsContainer?.classList.add("faded");
  document.querySelectorAll(".place-card").forEach(card => card.classList.remove("active"));
  searchPreviewCard?.classList.add("hidden");

  if (clickedCard) {
    clickedCard.classList.add("active");
  } else if (searchPreviewCard && searchPreviewImage && searchPreviewTitle) {
    searchPreviewImage.src = image || "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80";
    searchPreviewImage.alt = place;
    searchPreviewTitle.textContent = place;
    searchPreviewCard.classList.remove("hidden");
    searchPreviewCard.classList.add("active");
  }

  audioSection?.classList.add("hidden");
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.removeAttribute("src");
    audioPlayer.classList.add("hidden");
  }
  if (transcriptText) transcriptText.textContent = "";
  if (generateButton) {
    generateButton.textContent = "Generate Audio Guide";
    generateButton.disabled = false;
  }
  if (experiencePanel) {
    experiencePanel.classList.remove("hidden");
    window.requestAnimationFrame(() => experiencePanel.classList.add("visible"));
  }
  setStatus(`Selected destination: ${place}`);
}

function deselectDestination() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  experiencePanel?.classList.remove("visible");
  window.setTimeout(() => {
    experiencePanel?.classList.add("hidden");
    cardsContainer?.classList.remove("faded");
    searchPreviewCard?.classList.add("hidden");
    document.querySelectorAll(".place-card").forEach(card => card.classList.remove("active"));
    state.place = "";
    state.description = "";
    setStatus("Choose a destination or search for one to begin.");
  }, 300);
}

function searchDestination() {
  const query = (searchInput?.value || "").trim().toLowerCase();
  if (!query) {
    setStatus("Type a destination name or city to search.", true);
    searchInput?.focus();
    return;
  }
  const cards = [...document.querySelectorAll(".place-card:not(.search-preview-card)")];
  const match = cards.find(card => {
    const place = (card.dataset.place || "").toLowerCase();
    return place.includes(query) || query.includes(place) || card.innerText.toLowerCase().includes(query);
  });
  if (!match) {
    setStatus("No match found. Try Taj Mahal, Red Fort, Gateway of India, Hawa Mahal, Golden Temple, or Mysore Palace.", true);
    return;
  }
  selectDestination(match.dataset.place, match.dataset.image, match);
}

function getBrowserVoice(language, preferredGender) {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const prefix = (LANGUAGE_CODES[language] || "en-US").split("-")[0].toLowerCase();
  const languageVoices = voices.filter(v => v.lang.toLowerCase().startsWith(prefix));
  if (!languageVoices.length) return null;
  // Browser voice names do not reliably identify gender; this is best-effort only.
  const hints = preferredGender === "Female"
    ? ["female", "woman", "zira", "samantha", "susan", "heera", "kalpana", "lekha"]
    : ["male", "man", "david", "mark", "ravi", "hemant", "mohan"];
  return languageVoices.find(v => hints.some(h => v.name.toLowerCase().includes(h))) || languageVoices[0];
}

function playGuide(text) {
  if (!("speechSynthesis" in window)) {
    setStatus("Speech audio is not supported in this browser. Try an updated Chrome browser.", true);
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANGUAGE_CODES[state.speechLanguage] || "en-US";
  utterance.rate = 0.92;
  utterance.pitch = state.voice === "Female" ? 1.08 : 0.92;
  const voice = getBrowserVoice(state.language, state.voice);
  if (voice) utterance.voice = voice;
  utterance.onstart = () => {
    state.isSpeaking = true;
    generateButton.textContent = "Playing Audio…";
    setStatus(`Playing the ${state.language} guide for ${state.place}.`);
  };
  utterance.onend = () => {
    state.isSpeaking = false;
    generateButton.textContent = "Play Audio Guide Again";
    setStatus("Audio guide finished. You can play it again or select another destination.");
  };
  utterance.onerror = () => {
    state.isSpeaking = false;
    generateButton.textContent = "Play Audio Guide";
    setStatus("Audio playback failed. Check your browser's speech settings.", true);
  };
  window.speechSynthesis.speak(utterance);
}

async function generateGuide() {
  if (!state.place) {
    setStatus("Please select a destination first.", true);
    return;
  }
  if (state.description) {
    playGuide(state.description);
    return;
  }
  generateButton.disabled = true;
  generateButton.textContent = "Generating Guide…";
  setStatus("Preparing your travel guide…");
  state.language = languageSelect?.value || "English";

  try {
    const response = await fetch("/api/generate-guide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        place: state.place, answerType: state.length,
        language: state.language, voice: state.voice
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "The server could not generate the guide.");
    state.description = data.description || "";
    state.speechLanguage = data.aiGenerated || state.language === "English" ? state.language : "English";
    if (!state.description) throw new Error("The server returned an empty guide.");

    transcriptText.textContent = state.description;
    audioSection?.classList.remove("hidden");
    transcriptContent?.classList.remove("hidden");
    transcriptArrow?.classList.add("rotate-180");
    generateButton.textContent = "Play Audio Guide";
    generateButton.disabled = false;
    setStatus(data.aiGenerated
      ? "AI-generated guide ready."
      : (state.language !== "English"
        ? "Built-in guide is in English. Add OPENAI_API_KEY to enable AI-generated translation into the selected language."
        : "Built-in guide ready. Add OPENAI_API_KEY to enable AI-generated descriptions."));
    if (data.audioUrl) {
  const audioPlayer = document.getElementById("audioPlayer");

  if (audioPlayer) {
    audioPlayer.src = data.audioUrl;
    audioPlayer.classList.remove("hidden");
    audioPlayer.currentTime = 0;

    try {
      await audioPlayer.play();
    } catch (error) {
      console.error("Murf audio playback failed:", error);
      setStatus("Tap Play on the audio player to listen.", true);
    }
  } else {
    playGuide(state.description);
  }
} else {
  playGuide(state.description);
}
  } catch (error) {
    console.error("Guide generation error:", error);
    setStatus(`${error.message} Make sure Flask is running at http://127.0.0.1:5000.`, true);
    generateButton.textContent = "Try Again";
    generateButton.disabled = false;
  }
}

document.querySelectorAll(".place-card:not(.search-preview-card)").forEach(card => {
  card.addEventListener("click", () => selectDestination(card.dataset.place, card.dataset.image, card));
});
closeButton?.addEventListener("click", deselectDestination);
searchButton?.addEventListener("click", searchDestination);
searchInput?.addEventListener("keydown", event => {
  if (event.key === "Enter") searchDestination();
});
generateButton?.addEventListener("click", generateGuide);

document.querySelectorAll('[data-group="length"] button').forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll('[data-group="length"] button').forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    state.length = button.dataset.value || "Summary";
    state.description = "";
    audioSection?.classList.add("hidden");
    if (generateButton) {
      generateButton.textContent = "Generate Audio Guide";
      generateButton.disabled = false;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  });
});

document.querySelectorAll('[data-group="voice"] button').forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll('[data-group="voice"] button').forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    state.voice = button.dataset.value || "Male";
  });
});

languageSelect?.addEventListener("change", () => {
  state.language = languageSelect.value;
  state.description = "";
  audioSection?.classList.add("hidden");
  if (generateButton) {
    generateButton.textContent = "Generate Audio Guide";
    generateButton.disabled = false;
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
});

transcriptToggle?.addEventListener("click", () => {
  transcriptContent?.classList.toggle("hidden");
  transcriptArrow?.classList.toggle("rotate-180");
});

setStatus("Choose a destination or search for one to begin.");
