chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getArtistAndAboutInfo") {

    // Check if the desired elements are already in the DOM
    if (document.querySelector(".artist-name") && document.querySelector(".school-tag-item")) {
      extractAndSendInfo();
      return;
    }

    // If not, set up a MutationObserver
    const observer = new MutationObserver(function(mutationsList, observer) {
      for (let mutation of mutationsList) {
        if (mutation.type === 'childList') {
          // Check if the desired elements are now in the DOM
          if (document.querySelector(".artist-name") && document.querySelector(".school-tag-item")) {
            extractAndSendInfo();
            observer.disconnect();  // Stop observing once we've found the elements
            return;
          }
        }
      }
    });

    // Start observing the document with the configured parameters
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function extractAndSendInfo() {
    let artistInfo = getArtistInfo();
    let aboutInfo = getAboutInfo();
    sendResponse({
        name: artistInfo.name,
        location: artistInfo.location,
        summary: aboutInfo.summary,
        skills: aboutInfo.skills,
        software: aboutInfo.software
    });
  }

  return true;  // This line is important when using asynchronous sendResponse
});


function getArtistInfo() {
    let artistNameElement = document.querySelector(".artist-name");
    let artistName = artistNameElement ? artistNameElement.innerText.trim() : null;

    // Check if artistName exists and if it ends with "PRO", then remove it
    if (artistName && artistName.endsWith("PRO")) {
      artistName = artistName.slice(0, -3); // Remove the last 3 characters ("PRO")
    }

    // Extract the location
    let locationElement = document.querySelector('.artist-additional-info > span');
    let artistLocation = locationElement ? locationElement.innerText.trim() : null;

    return { name: artistName, location: artistLocation };
}

function getAboutInfo() {
  let aboutInfo = {};

  // Extract the summary
  let summaryElement = document.querySelector(".profile-section-summary .summary-content");
  aboutInfo.summary = summaryElement ? summaryElement.innerText.trim() : null;

  // Extract skills
  let skillsElements = document.querySelectorAll(".school-tag-item");
  aboutInfo.skills = Array.from(skillsElements).map(el => el.innerText.trim());

  // Extract software
  let softwareElements = document.querySelectorAll(".software-name");
  aboutInfo.software = Array.from(softwareElements).map(el => el.innerText.trim());

  return aboutInfo;
}