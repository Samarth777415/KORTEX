// Enhanced content script to extract comprehensive page information

function getVisibleText() {
  const walker = document.createTreeWalker(
    document.body, 
    NodeFilter.SHOW_TEXT, 
    {
      acceptNode: function(node) {
        // Skip script and style elements
        if (node.parentElement && 
            ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.parentElement.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        // Skip hidden elements
        const style = window.getComputedStyle(node.parentElement);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }, 
    false
  );
  
  let text = '';
  while (walker.nextNode()) {
    const nodeText = walker.currentNode.nodeValue.trim();
    if (nodeText) {
      text += nodeText + ' ';
    }
  }
  return text.trim();
}

function getPageMetadata() {
  const title = document.title || '';
  const description = document.querySelector('meta[name="description"]')?.content || '';
  const keywords = document.querySelector('meta[name="keywords"]')?.content || '';
  const url = window.location.href;
  
  // Extract headings for better context
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .map(h => h.textContent.trim())
    .filter(text => text.length > 0);
  
  // Extract main content areas
  const mainContent = document.querySelector('main, article, .content, #content')?.textContent?.trim() || '';
  
  return {
    title,
    description,
    keywords,
    url,
    headings: headings.slice(0, 10), // Limit to first 10 headings
    mainContent: mainContent.substring(0, 2000) // Limit main content
  };
}

function getStructuredPageData() {
  const visibleText = getVisibleText();
  const metadata = getPageMetadata();
  
  return {
    text: visibleText.substring(0, 5000), // Limit to prevent payload issues
    metadata: metadata,
    timestamp: new Date().toISOString(),
    wordCount: visibleText.split(/\s+/).length
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_PAGE_TEXT") {
    try {
      const pageData = getStructuredPageData();
      sendResponse({ 
        success: true, 
        data: pageData 
      });
    } catch (error) {
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }
  return true; // Keep message channel open for async response
});

// Optional: Monitor page changes for dynamic content
let lastContent = '';
function checkForContentUpdates() {
  const currentContent = getVisibleText().substring(0, 1000);
  if (currentContent !== lastContent && currentContent.length > 100) {
    lastContent = currentContent;
    // Notify background script of content change
    chrome.runtime.sendMessage({
      type: "CONTENT_UPDATED",
      url: window.location.href
    });
  }
}

// Check for content updates every 5 seconds
setInterval(checkForContentUpdates, 5000);