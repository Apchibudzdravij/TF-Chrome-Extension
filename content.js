chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getArtistAndAboutInfo") {

    // Check if the desired elements are already in the DOM
    if (document.querySelector(".user-info > h1") && document.querySelector(".skills > div > badge-list > ul > li > .profile-badge")) {
      extractAndSendInfo();
      return;
    }

    // If not, set up a MutationObserver
    const observer = new MutationObserver(function(mutationsList, observer) {
      for (let mutation of mutationsList) {
        if (mutation.type === 'childList') {
          // Check if the desired elements are now in the DOM
          if (document.querySelector(".user-info > h1") && document.querySelector(".skills > div > badge-list > ul > li > .profile-badge")) {
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
    let contacts = getContactInfo();
    sendResponse({
        name: artistInfo.name,
        location: artistInfo.location,
        summary: aboutInfo.summary,
        skills: aboutInfo.skills,
        software: aboutInfo.software,
        contacts: contacts
    });
  }

  return true;  // This line is important when using asynchronous sendResponse
});


function getArtistInfo() {
  let artistNameElement = document.querySelector(".user-info > h1");
  let artistName = artistNameElement ? artistNameElement.innerText.trim() : null;

  // Extract the location
  let locationElement = document.querySelector('.addition-info-list > li > span');
  let artistLocation = locationElement ? locationElement.innerText.trim() : null;

  return { name: artistName, location: artistLocation };
}

function getAboutInfo() {
  let aboutInfo = {};

  // Extract the summary
  let summaryElement = document.querySelector(".resume-section-content .user-resume-summary-content");
  aboutInfo.summary = summaryElement ? summaryElement.innerText.trim() : null;

  // Extract skills
  let skillsElements = document.querySelectorAll(".skills > div > badge-list > ul > li > .profile-badge");
  aboutInfo.skills = Array.from(skillsElements).map(el => el.innerText.trim());
  
  // Extract software
  let softwareElements = document.querySelectorAll(".software > div > badge-list > ul > li > .profile-badge");
  aboutInfo.software = Array.from(softwareElements).map(el => el.innerText.trim());

  return aboutInfo;
}

function getContactInfo() {
  let contactInfo = {};
  contactInfo.contacts = [];
  let contactElements = document.querySelectorAll(`.sidebar-block > social-links > ul > li > a`);
  let tempContacts = Array.from(contactElements).map(el => el.href.trim());

  for (el in tempContacts) {
    if (tempContacts[el].indexOf('twitter') !== -1) {
      contactInfo.twitter = tempContacts[el];
    } else if (tempContacts[el].indexOf('linkedin') !== -1) {
      contactInfo.linkedin = tempContacts[el];
    } else if (tempContacts[el].indexOf('instagram') !== -1) {
      contactInfo.instagram = tempContacts[el];
    } else if (tempContacts[el].indexOf('facebook') !== -1) {
      contactInfo.facebook = tempContacts[el];
    } else {
      contactInfo.contacts.push(tempContacts[el]);
    }
  }
  return contactInfo;
}
