// voice recognition
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US';
recognition.interimResults = true;
recognition.maxAlternatives = 1;

// sys prompt
const customPrompt = "Hi, you are Ai assistant on app called WebAI for LG devices/Tv's with webos on them. Keep your answers simple and short. You get your messages from user from speech recognition so sometimes messages can be cut off. Users get your messages with both text and text to speech. Since you dont have memory we gave you some info from this conversation:";

// chat history
let chatHistory = [
    { role: "system", content: customPrompt }
];

let isListening = false;

function startRecognition() {
    const voiceButton = document.getElementById('voiceButton');
    if (isListening) {
        recognition.stop();
        isListening = false;
        voiceButton.textContent = 'Start Voice Recognition';
        voiceButton.classList.remove('pulsing');
        console.log('Voice recognition stopped.');
    } else {
        recognition.start();
        isListening = true;
        voiceButton.textContent = 'Stop Voice Recognition';
        voiceButton.classList.add('pulsing');
        console.log('Voice recognition started.');
    }
}

recognition.onend = () => {
    const voiceButton = document.getElementById('voiceButton');
    voiceButton.classList.remove('pulsing');
    voiceButton.textContent = 'Start Voice Recognition';
    isListening = false;
    console.log('Voice recognition ended.');
};

recognition.onresult = async (event) => {
    if (!isListening) return;

    const voiceInput = event.results[0][0].transcript;
    document.getElementById('transcription').textContent = 'Transcription: ' + voiceInput;

    if (event.results[0].isFinal) {
        console.log('Final Voice Input:', voiceInput);

        const response = await getAIResponse(voiceInput);
        console.log('AI Response:', response);

        updateChatHistory(voiceInput, response);

        await textToSpeech(response);
    }
};

recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
};

async function getAIResponse(message, retries = 3, delay = 2000) {
    const model = document.getElementById('modelSelect').value;
    const apiKey = document.getElementById('apiKey').value;

    chatHistory.push({ role: "user", content: message });

    try {
        const response = await fetch(`https://api-inference.huggingface.co/models/${model}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: chatHistory,
                max_tokens: 500,
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', response.status, errorText);
            return "Sorry, there was an error processing your request.";
        }

        const data = await response.json();
        console.log('API Response:', data);

        if (data.choices && data.choices.length > 0) {
            const aiResponse = data.choices[0].message.content;
            chatHistory.push({ role: "assistant", content: aiResponse });
            return aiResponse;
        } else {
            return "Sorry, I couldn't process your request.";
        }
    } catch (error) {
        console.error('Error fetching AI response:', error.message);

        if (retries > 0) {
            console.log(`Retrying in ${delay / 1000} seconds... (${3 - retries + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return getAIResponse(message, retries - 1, delay * 2);
        }

        return "Sorry, I couldn't process your request.";
    }
}

function textToSpeech(text) {
    try {
        meSpeak.loadConfig("src/mespeak__standard_config.json");
        meSpeak.loadVoice("voices/en/en-us.json", function(success, message) {
            if (success) {
                meSpeak.speak(text, {
                    amplitude: 100,
                    wordgap: 0,
                    pitch: 50,
                    speed: 175
                });
            } else {
                console.error('Failed to load voice:', message);
            }
        });
    } catch (error) {
        console.error('Error with meSpeak TTS:', error);
    }
}

function clearChatHistory() {
    // Clear chat
    chatHistory = [{ role: "system", content: customPrompt }];

    // Clear chat in ui
    const chatList = document.getElementById('chatList');
    chatList.innerHTML = '';

    console.log('Chat history cleared.');
}


const md = window.markdownit();
function updateChatHistory(userMessage, aiResponse) {
    const chatList = document.getElementById('chatList');

    const userItem = document.createElement('li');
    userItem.className = 'user';
    userItem.textContent = `User: ${userMessage}`;
    chatList.appendChild(userItem);

    const aiItem = document.createElement('li');
    aiItem.className = 'ai';
    aiItem.innerHTML = md.render(`AI: ${aiResponse}`);
    chatList.appendChild(aiItem);
}

async function importApiKey() {
    const pastebinId = document.getElementById('pastebinId').value;
    if (!pastebinId) {
        alert('Please enter a Pastebin File ID.');
        return;
    }

    const pastebinBaseUrl = 'https://pastebin.com/raw/';
    const pastebinUrl = `${pastebinBaseUrl}${pastebinId}`;
    const corsProxy = 'https://corsproxy.io/?url=';

    try {
        const response = await fetch(corsProxy + pastebinUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch the Pastebin content.');
        }
        const apiKey = await response.text();
        document.getElementById('apiKey').value = apiKey.trim();
        localStorage.setItem('apiKey', apiKey.trim());
        alert('API Key imported successfully!');
    } catch (error) {
        console.error('Error importing API Key:', error);
        alert('Failed to import API Key. Please check the Pastebin File ID.');
    }
}

window.onload = function() {
    const savedApiKey = localStorage.getItem('apiKey');
    if (savedApiKey) {
        document.getElementById('apiKey').value = savedApiKey;
    }

    // attach the clearchathistory function to the buttons click
    const clearChatButton = document.getElementById('clearChatButton');
    clearChatButton.addEventListener('click', clearChatHistory);
};


