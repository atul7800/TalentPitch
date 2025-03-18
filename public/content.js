console.log("🔍 LinkedIn Scraper Loaded!");

let isSearching = false; // Prevent multiple search triggers
let extractedProfiles = [];

// Notify `background.js` that `content.js` is running
chrome.runtime.sendMessage({action: "contentScriptLoaded"});

// Listen for messages from `background.js`
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "scrapeLinkedInEmails" && !isSearching) {
    isSearching = true; // Prevent duplicate search execution
    console.log("Received scrape request:", request.companyName);
    scrapeLinkedInEmails(request.companyName);
  }
});

// Detect LinkedIn page changes (LinkedIn uses AJAX navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    console.log("🔄 LinkedIn page changed! Re-attaching content script...");
    lastUrl = location.href;
    isSearching = false; // Reset search flag on navigation
    chrome.runtime.sendMessage({action: "contentScriptLoaded"}); // Notify background.js
  }
}).observe(document, {subtree: true, childList: true});

function scrapeLinkedInEmails(companyName) {
  console.log(`🔍 Searching for company: ${companyName}`);

  let searchBox = document.querySelector('input[aria-label="Search"]');
  if (!searchBox) {
    console.error("🔴 LinkedIn search bar not found!");
    alert("LinkedIn search bar not found!");
    return;
  }

  searchBox.value = companyName;
  searchBox.dispatchEvent(new Event("input", {bubbles: true}));

  let enterKeyEvent = new KeyboardEvent("keydown", {
    key: "Enter",
    keyCode: 13,
    code: "Enter",
    which: 13,
    bubbles: true,
  });
  searchBox.dispatchEvent(enterKeyEvent);

  console.log("Search triggered for:", companyName);

  setTimeout(() => {
    applyCompaniesFilter(); // Re-enable this line to proceed after search
  }, 3000);
}

// Apply the "Companies" Filter
function applyCompaniesFilter() {
  console.log("🔎 Searching for the 'Companies' filter...");

  let filters = document.querySelectorAll(
    ".search-reusables__filter-pill-button"
  );

  let companiesFilter = Array.from(filters).find(
    (btn) => btn.innerText.trim() === "Companies"
  );

  if (!companiesFilter) {
    console.error("🔴 'Companies' filter not found!");
    alert("Companies filter not found!");
    return;
  }

  companiesFilter.click();
  console.log("'Companies' Filter Applied.");

  setTimeout(() => {
    openCompanyPage();
  }, 3000);
}

// Open the First Company Result
function openCompanyPage() {
  console.log("🔎 Looking for the first company result...");

  // New Selector for Company Results
  let companyLinks = document.querySelectorAll(
    "div.WDysKnKwntWqWKjqDIQwMiddxTJWLEMUE a[data-test-app-aware-link]"
  );

  if (companyLinks.length > 0) {
    console.log("Found company results, clicking the first one...");
    companyLinks[0].click();

    setTimeout(() => {
      goToPeopleSection();
    }, 5000);
  } else {
    console.error("No company results found! Trying alternate method...");

    // Alternate method if the first method fails
    let alternativeCompanyLinks = document.querySelectorAll(
      "a[href*='/company/']"
    );
    if (alternativeCompanyLinks.length > 0) {
      alternativeCompanyLinks[0].click();
      console.log("Opened company page using alternate method");

      setTimeout(() => {
        goToPeopleSection();
      }, 5000);
    } else {
      alert(
        "No company results found on this page. Try manually selecting a company."
      );
    }
  }
}

// Navigate to "People" Section
function goToPeopleSection() {
  console.log("🔎 Navigating to People section...");

  const peopleTabParentTag = document.querySelector(
    'nav[aria-label="Organization’s page navigation"]'
  );

  let peopleTab = [...peopleTabParentTag.querySelectorAll("a")].find((a) => {
    return (
      a.innerText.includes("People") &&
      a.href.split("/").at(-2).toLowerCase() === "people"
    );
  });

  if (peopleTab) {
    console.log("People tab found");
    peopleTab.click();
    console.log("Navigated to People Section");

    setTimeout(() => {
      extractLinkedInProfiles();
    }, 5000);
  } else {
    console.error("🔴 'People' tab not found!");
    alert("'People' tab not found!");
  }
}

// Extract valid profiles
function extractLinkedInProfiles() {
  console.log("🔍 Extracting employee details...");

  let profiles = document.querySelectorAll(
    ".org-people-profile-card__profile-card-spacing"
  );

  profiles.forEach((profile) => {
    let profileLink = profile.querySelector("a[href*='/in/']")?.href;
    let name = profile
      .querySelector(".artdeco-entity-lockup__title a div")
      ?.innerText.trim();
    let job = profile
      .querySelector(".artdeco-entity-lockup__subtitle div")
      ?.innerText.trim();
    let imageElement = profile
      .querySelector(".artdeco-entity-lockup__image img")
      ?.src.includes("/dms/");

    if (profileLink && name && job && imageElement) {
      extractedProfiles.push(
        profile.querySelector(".artdeco-entity-lockup__title a")
      );
    }
  });

  iterateOverProfiles();
  console.log("end of extractLinkedInProfiles");
}

// Iterate over the valid profiles to extract emails
function iterateOverProfiles() {
  extractedProfiles[0].click();
  console.log("before callinge extracEmail");
  extractEmail();
  console.log("iterateOverProfiles is over");

  // extractedProfiles.forEach((profile) => {
  //   console.log("Scrapper itterating over profile : ", profile);
  //   profile.click();
  //   //extractEmail(extractedProfiles.profileLink);
  // });
  // const firstProfileKey = Object.keys(extractedProfiles)[0];
  // const firstProfile = extractedProfiles[firstProfileKey];
  // console.log("Scrapper employeeProfileLink : ", firstProfile.profileLink);
  // extractEmail(firstProfile.profileLink);
}

// Extract Emails from a Persion's profile
function extractEmail() {
  console.log("🔍Opening employee profile...");
  let contactElement = "";
  setTimeout(() => {
    contactElement = document.querySelector(
      'a[href*="/overlay/contact-info/"]'
    );
    console.log("Scrapper contactElement : ", contactElement);
    contactElement.click();
  }, 2000);

  setTimeout(() => {
    const closeButton = document.querySelector(
      "div[data-test-modal-container] div[data-test-modal] button[aria-label='Dismiss']"
    );

    if (closeButton) {
      console.log("Scrapper dismiss btn inner : ", closeButton.innerHTML);
      closeButton.click();
    } else {
      console.log("Scrapper dismiss btn not found");
    }
  }, 2000);

  // setTimeout(() => {
  //     closeButton.click()
  // }, 2000)
}
