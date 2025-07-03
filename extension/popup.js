let currentUrl = "";
const chatMessages = document.getElementById("chat-messages");
const input = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

// ===== 📦 Local Storage Utilities =====

function getStorageKeyForToday(url) {
    const today = new Date().toISOString().split("T")[0]; // e.g. "2025-07-03"
    return `chat_${url}_${today}`;
}

function saveChatHistory(url) {
    const key = getStorageKeyForToday(url);
    localStorage.setItem(key, JSON.stringify(chatMessages.innerHTML));
}

function loadChatHistory(url) {
    const key = getStorageKeyForToday(url);
    const stored = localStorage.getItem(key);
    if (stored) {
        chatMessages.innerHTML = JSON.parse(stored);
    }
}

// ===== 📬 Message Display =====

function appendMessage(message, type) {
    const div = document.createElement("div");
    div.className = `message ${type}`;
    div.innerHTML = formatMessage(message); // convert formatting
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Save chat after adding new message
    saveChatHistory(currentUrl);
}

// Prettify message (**bold**, \n → <br>)
function formatMessage(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")  // bold
        .replace(/\n{2,}/g, "<br><br>")                     // double newline
        .replace(/\n/g, "<br>");                            // single newline
}

// ===== 🌐 URL + Backend Initialization =====

async function getCurrentTabUrl() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0) {
                resolve(tabs[0].url);
            } else {
                reject("No active tab found");
            }
        });
    });
}

async function initSession(url) {
    try {
        const res = await fetch("http://localhost:8000/init", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url })
        });

        if (!res.ok) {
            const error = await res.json();
            appendMessage("❌ " + error.detail, "bot");
        }
    } catch (err) {
        appendMessage("❌ Could not initialize website context.", "bot");
        console.error(err);
    }
}

// ===== 💬 Message Sending =====

async function sendMessage() {
    const userMessage = input.value.trim();
    if (!userMessage) return;

    appendMessage(userMessage, "user");
    input.value = "";

    try {
        const res = await fetch("http://localhost:8000/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: currentUrl,
                message: userMessage
            })
        });

        const data = await res.json();
        if (data.response) {
            appendMessage(data.response, "bot");
        } else {
            appendMessage("❌ No response from AI.", "bot");
        }
    } catch (error) {
        console.error("Chat error:", error);
        appendMessage("❌ Backend not responding.", "bot");
    }
}

// ===== 🚀 Init on Load =====

(async () => {
    try {
        currentUrl = await getCurrentTabUrl();
        await initSession(currentUrl);

        // Load chat history for today's visit to this URL
        loadChatHistory(currentUrl);

        // Show welcome message only if history is empty
        if (!chatMessages.innerHTML.trim()) {
            appendMessage("👋 You can now ask me anything about this page!", "bot");
        }
    } catch (err) {
        appendMessage("❌ Failed to get current URL.", "bot");
        console.error(err);
    }
})();

// ===== ⌨️ Event Listeners =====

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});
