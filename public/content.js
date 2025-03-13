console.log("🔍 LinkedIn Scraper Loaded!");

// ✅ Prevent multiple search triggers
let isSearching = false;

// ✅ Notify `background.js` that `content.js` is running
chrome.runtime.sendMessage({ action: "contentScriptLoaded" });

// ✅ Listen for messages from `background.js`
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "scrapeLinkedInEmails" && !isSearching) {
        isSearching = true; // Prevent duplicate search execution
        console.log("✅ Received scrape request:", request.companyName);
        scrapeLinkedInEmails(request.companyName);
    }
});

// ✅ Detect LinkedIn page changes (LinkedIn uses AJAX navigation)
let lastUrl = location.href;
new MutationObserver(() => {
    if (location.href !== lastUrl) {
        console.log("🔄 LinkedIn page changed! Re-attaching content script...");
        lastUrl = location.href;
        isSearching = false; // Reset search flag on navigation
        chrome.runtime.sendMessage({ action: "contentScriptLoaded" }); // Notify background.js
    }
}).observe(document, { subtree: true, childList: true });

function scrapeLinkedInEmails(companyName) {
    console.log(`🔍 Searching for company: ${companyName}`);

    let searchBox = document.querySelector('input[aria-label="Search"]');
    if (!searchBox) {
        console.error("🔴 LinkedIn search bar not found!");
        alert("LinkedIn search bar not found!");
        return;
    }

    searchBox.value = companyName;
    searchBox.dispatchEvent(new Event("input", { bubbles: true }));

    let enterKeyEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        keyCode: 13,
        code: "Enter",
        which: 13,
        bubbles: true
    });
    searchBox.dispatchEvent(enterKeyEvent);

    console.log("✅ Search triggered for:", companyName);

    setTimeout(() => {
        applyCompaniesFilter(); // ✅ Re-enable this line to proceed after search
    }, 3000);
}

// ✅ Apply the "Companies" Filter
function applyCompaniesFilter() {
    console.log("🔎 Searching for the 'Companies' filter...");

    let filters = document.querySelectorAll(".search-reusables__filter-pill-button");

    let companiesFilter = Array.from(filters).find(
        (btn) => btn.innerText.trim() === "Companies"
    );

    if (!companiesFilter) {
        console.error("🔴 'Companies' filter not found!");
        alert("Companies filter not found!");
        return;
    }

    companiesFilter.click();
    console.log("✅ 'Companies' Filter Applied.");

    setTimeout(() => {
        openCompanyPage();
    }, 3000);
}

// ✅ Open the First Company Result
function openCompanyPage() {
    console.log("🔎 Looking for the first company result...");

    // New Selector for Company Results
    let companyLinks = document.querySelectorAll("div.WDysKnKwntWqWKjqDIQwMiddxTJWLEMUE a[data-test-app-aware-link]");

    if (companyLinks.length > 0) {
        console.log("✅ Found company results, clicking the first one...");
        companyLinks[0].click();

        setTimeout(() => {
            goToPeopleSection();
        }, 5000);
    } else {
        console.error("🔴 No company results found! Trying alternate method...");
        
        // Alternate method if the first method fails
        let alternativeCompanyLinks = document.querySelectorAll("a[href*='/company/']");
        if (alternativeCompanyLinks.length > 0) {
            alternativeCompanyLinks[0].click();
            console.log("✅ Opened company page using alternate method");

            setTimeout(() => {
                goToPeopleSection();
            }, 5000);
        } else {
            alert("No company results found on this page. Try manually selecting a company.");
        }
    }
}

// ✅ Navigate to "People" Section
function goToPeopleSection() {
    console.log("🔎 Navigating to People section...");
    
    let peopleTab = [...document.querySelectorAll("a")].find(link => link.innerText.includes("People"));
    if (peopleTab) {
        peopleTab.click();
        console.log("✅ Navigated to People Section");

        setTimeout(() => {
            extractEmails();
        }, 5000);
    } else {
        console.error("🔴 'People' tab not found!");
        alert("'People' tab not found!");
    }
}

// ✅ Extract Emails from "People" Section
function extractEmails() {
    console.log("🔍 Extracting employee emails...");

    let employees = [];
    let profiles = document.querySelectorAll(".org-people-profile-card");

    profiles.forEach((profile) => {
        let name = profile.querySelector(".t-16")?.innerText.trim() || "Unknown";
        let jobTitle = profile.querySelector(".t-14")?.innerText.trim() || "Unknown";
        let email = "Not Visible";

        let emailElement = profile.querySelector("a[href^='mailto:']");
        if (emailElement) {
            email = emailElement.innerText.trim();
        }

        employees.push({ name, jobTitle, email });
    });

    console.log("✅ Extracted Employees:", employees);

    // ✅ Send extracted emails back to the extension UI
    chrome.runtime.sendMessage({ action: "storeEmails", employees });
}
