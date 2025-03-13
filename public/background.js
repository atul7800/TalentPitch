chrome.runtime.onInstalled.addListener(() => {
  console.log("Job Mailer Extension Installed.");
});

// Function to get authentication token
async function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({interactive: true}, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}

// Function to send email using Gmail API
async function sendEmail(to, subject, body) {
  const token = await getAuthToken();

  const emailContent =
    `MIME-Version: 1.0\r\n` +
    `To: ${to}\r\n` +
    `Subject: ${subject}\r\n` +
    `Content-Type: text/html; charset="UTF-8"\r\n` +
    `Content-Transfer-Encoding: 7bit\r\n\r\n` +
    body;

  const encodedMessage = btoa(emailContent)
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const response = await fetch(
    "https://www.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({raw: encodedMessage}),
    }
  );

  if (!response.ok) {
    console.error("Failed to send email:", await response.json());
  } else {
    console.log("Email sent successfully!");
  }
}

let contentScriptLoaded = false;

// Listen for messages from the popup UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sendEmail") {
    sendEmail(request.to, request.subject, request.body)
      .then(() => sendResponse({success: true}))
      .catch((error) => sendResponse({success: false, error}));
  }

  let contentScriptLoaded = false;
  if (request.action === "contentScriptLoaded") {
      contentScriptLoaded = true;
      console.log("✅ Content Script is Running");
  }

  if (request.action === "startScraping") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length === 0) {
              console.error("🔴 No active tab found!");
              sendResponse({ status: "error" });
              return;
          }

          let activeTab = tabs[0];

          if (!activeTab.url.includes("linkedin.com")) {
              console.error("🔴 Not a LinkedIn page! Cannot inject content script.");
              sendResponse({ status: "error" });
              return;
          }

          if (!contentScriptLoaded) {
              console.log("🔹 Injecting content.js because it's not yet loaded...");

              // ✅ Inject content.js
              chrome.scripting.executeScript({
                  target: { tabId: activeTab.id },
                  files: ["content.js"]
              }, () => {
                  console.log("✅ Scraper injected into LinkedIn.");
                  contentScriptLoaded = true;

                  // ✅ Wait before sending message
                  setTimeout(() => {
                      chrome.tabs.sendMessage(activeTab.id, {
                          action: "scrapeLinkedInEmails",
                          companyName: request.jobDescription
                      }, (response) => {
                          if (chrome.runtime.lastError) {
                              console.error("🔴 Error sending message to content.js:", chrome.runtime.lastError);
                              sendResponse({ status: "error" });
                          } else {
                              sendResponse({ status: "success" });
                          }
                      });
                  }, 2000);
              });
          } else {
              // ✅ If content.js is already injected, send the message immediately
              chrome.tabs.sendMessage(activeTab.id, {
                  action: "scrapeLinkedInEmails",
                  companyName: request.jobDescription
              }, (response) => {
                  if (chrome.runtime.lastError) {
                      console.error("🔴 Error sending message to content.js:", chrome.runtime.lastError);
                      sendResponse({ status: "error" });
                  } else {
                      sendResponse({ status: "success" });
                  }
              });
          }
      });

  }

  return true;
});
