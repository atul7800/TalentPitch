chrome.runtime.onInstalled.addListener(() => {
  console.log("Job Mailer Extension Installed.");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("📩 Received message:", request);

  if (request.action === "testMessage") {
    console.log("✅ Test message received from popup!");
    sendResponse({success: true});
  }

  if (request.action === "sendEmail") {
    console.log("📧 Sending email to:", request.to);

    sendEmail(request.to, request.subject, request.body)
      .then(() => {
        console.log("✅ Email sent successfully!");
        sendResponse({success: true});
      })
      .catch((error) => {
        console.error("❌ Failed to send email:", error);
        sendResponse({success: false, error: error.message});
      });

    return true; // Required for async response
  }
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
    `To: ${to}\r\n` +
    `Subject: ${subject}\r\n` +
    `Content-Type: text/plain; charset="UTF-8"\r\n\r\n` +
    `${body}`;

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

// Listen for messages from the popup UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sendEmail") {
    sendEmail(request.to, request.subject, request.body)
      .then(() => sendResponse({success: true}))
      .catch((error) => sendResponse({success: false, error}));
  }
  return true;
});
