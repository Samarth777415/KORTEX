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

function appendMessage(message, type, save = true) {
    const div = document.createElement("div");

    if (type === "user") {
        div.className = "message user-message";
    } else {
        div.className = "message bot-message";
    }

    div.innerHTML = formatMessage(message || "");  // fallback to empty string
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (save && currentUrl) {
        saveChatHistory(currentUrl);
    }
}

function formatMessage(text) {
    if (!text || typeof text !== "string") return "";

    return text
        // Headings
        .replace(/^### (.*$)/gim, '<strong>$1</strong>')
        .replace(/^## (.*$)/gim, '<strong>$1</strong>')
        .replace(/^# (.*$)/gim, '<strong>$1</strong>')

        // Bold
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")

        // Italic
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/_(.*?)_/g, "<em>$1</em>")

        // Inline code
        .replace(/`([^`\n]+?)`/g, "<code>$1</code>")

        // Fenced code blocks (```code```)
        .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")

        // Bulleted list (dash or asterisk)
        .replace(/^[-*] (.*)/gm, "• $1")

        // Double newlines = paragraph
        .replace(/\n{2,}/g, "<br><br>")

        // Single newline = line break
        .replace(/\n/g, "<br>");
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

        const data = await res.json();

        if (!res.ok) {
            appendMessage("❌ " + data.detail, "bot", false);
            return;
        }

        // ✅ Show backend-generated system messages in chat
        if (data.chat_history && Array.isArray(data.chat_history)) {
            chatMessages.innerHTML = ""; // Clear demo messages
            data.chat_history.forEach(msg => {
                const role = msg.role === "user" ? "user" : "bot"; // dynamic role
                appendMessage(msg.content, role);
            });
        }

    } catch (err) {
        appendMessage("❌ Could not initialize website context.", "bot", false);
        console.error(err);
    }
}

// ===== 💬 Message Sending =====

async function sendMessage() {
    const userMessage = input.value.trim();
    if (!userMessage) return;

    appendMessage(userMessage, "user"); // user message
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
            appendMessage(data.response, "bot"); // bot response
        } else if (data.chat_history) {
            data.chat_history.forEach(msg => {
                appendMessage(msg, "bot");
            });
        } else {
            appendMessage("❌ No response from AI.", "bot", false);
        }
    } catch (error) {
        console.error("Chat error:", error);
        appendMessage("❌ Backend not responding.", "bot", false);
    }
}

// ===== 🚀 Init on Load =====

(async () => {
    try {
        currentUrl = await getCurrentTabUrl();
        await initSession(currentUrl);

        // Load chat history for today's visit to this URL (if not already shown)
        loadChatHistory(currentUrl);
        if (!chatMessages.innerHTML.trim()) {
            appendMessage("👋 You can now ask me anything about this page!", "bot");
        }
    } catch (err) {
        appendMessage("❌ Failed to get current URL.", "bot", false);
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
