console.log("🔍 LinkedIn Scraper Loaded!");

let isSearching = false; // Prevent multiple search triggers
let extractedProfiles = [];

// Notify `background.js` that `content.js` is running
chrome.runtime.sendMessage({action: "contentScriptLoaded"});

// Listen for messages from `background.js`
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "scrapeLinkedInEmails" && !isSearching) {
    isSearching = true; // Prevent duplicate search execution
    scrapeLinkedInEmails(request.companyName);
  }
});

// Detect LinkedIn page changes (LinkedIn uses AJAX navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    isSearching = false; // Reset search flag on navigation
    observer.disconnect(); // disconnecting observer
    chrome.runtime.sendMessage({action: "contentScriptLoaded"}); // Notify background.js
  }
}).observe(document, {subtree: true, childList: true});

function scrapeLinkedInEmails(companyName) {
  let searchBox = document.querySelector('input[aria-label="Search"]');
  if (!searchBox) {
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

  setTimeout(() => {
    applyCompaniesFilter(); // Re-enable this line to proceed after search
  }, 3000);
}

// Apply the "Companies" Filter
function applyCompaniesFilter() {
  let filters = document.querySelectorAll(
    ".search-reusables__filter-pill-button"
  );

  let companiesFilter = Array.from(filters).find(
    (btn) => btn.innerText.trim() === "Companies"
  );

  if (!companiesFilter) {
    alert("Companies filter not found!");
    return;
  }

  companiesFilter.click();

  setTimeout(() => {
    openCompanyPage();
  }, 3000);
}

// Open the First Company Result
function openCompanyPage() {
  // New Selector for Company Results
  let companyLinks = document.querySelectorAll(
    "div.WDysKnKwntWqWKjqDIQwMiddxTJWLEMUE a[data-test-app-aware-link]"
  );

  if (companyLinks.length > 0) {
    companyLinks[0].click();

    setTimeout(() => {
      goToPeopleSection();
    }, 5000);
  } else {
    // Alternate method if the first method fails
    let alternativeCompanyLinks = document.querySelectorAll(
      "a[href*='/company/']"
    );
    if (alternativeCompanyLinks.length > 0) {
      alternativeCompanyLinks[0].click();

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
    peopleTab.click();

    setTimeout(() => {
      extractLinkedInProfiles();
    }, 5000);
  } else {
    alert("'People' tab not found!");
  }
}

// Extract valid profiles
function extractLinkedInProfiles() {
  let profiles = document.querySelectorAll(
    ".org-people-profile-card__profile-card-spacing"
  );

  profiles.forEach((profile) => {
    let profileLink = "";
    const rawURL = profile.querySelector("a[href*='/in/']")?.href;
    console.log("Atul rawURL : ", rawURL);
    if (rawURL) {
      const parsedURL = new URL(rawURL);
      console.log("Atul parsedURL : ", parsedURL);
      profileLink = parsedURL.origin + parsedURL.pathname;
      console.log("Atul profileLink : ", profileLink);
    }

    let nameElement = profile
      .querySelector(".artdeco-entity-lockup__title a div")
      ?.innerText.trim();
    let jobTitleElement = profile
      .querySelector(".artdeco-entity-lockup__subtitle div")
      ?.innerText.trim();
    let imageElement = profile
      .querySelector(".artdeco-entity-lockup__image img")
      ?.src.includes("/dms/");

    if (profileLink && nameElement && jobTitleElement && imageElement) {
      extractedProfiles.push({
        nameElement,
        profileLink,
      });
    }
  });
  console.warn("Atul DATA : ", extractedProfiles);
  iterateOverProfiles();
}

// Iterate over the valid profiles to extract emails
function iterateOverProfiles() {
  // extractedProfiles.forEach((profile) => {
  //     console.log("Scrapper itterating over profile : ", profile)
  //     //extractEmail(extractedProfiles.profileLink);
  // })
  const firstProfileKey = Object.keys(extractedProfiles)[0];
  const firstProfile = extractedProfiles[firstProfileKey];
  console.warn("Atul first profile link : ", firstProfile.profileLink);
  chrome.storage.local.set({openThisProfile: firstProfile.profileLink}, () => {
    console.warn("Atul first profile link : ", firstProfile.profileLink);
    window.location.href = firstProfile.profileLink;
  });
}

chrome.storage.local.get("openThisProfile", (data) => {
  console.log("Atul openThisProfile : ", data);
  if (
    data.openThisProfile &&
    window.location.href.includes(data.openThisProfile)
  ) {
    console.log("Atul calling extractEmail");
    chrome.storage.local.remove("openThisProfile", () => {
      // Clear BEFORE calling extractEmail()
      extractEmail(); // Now safe to run
    });
  }
});

// Extract Emails from a Persion's profile
function extractEmail() {
  let contactElement = "";

  setTimeout(() => {
    contactElement = document.querySelector(
      "#top-card-text-details-contact-info"
    );
    console.log("Scrapper contactElement : ", contactElement);
    contactElement.click();
  }, 2000);

  let email = "";

  setTimeout(() => {
    email = document.querySelector(
      ".pv-contact-info__contact-type a[href^='mailto:']"
    )?.innerText;
    console.log("Atul email inside : ", email);

    const closeButton = document.querySelector(
      ".artdeco-modal button[aria-label = 'Dismiss']"
    );
    console.log("Atul close button : ", closeButton);
    closeButton.click();
  }, 5000);
}
