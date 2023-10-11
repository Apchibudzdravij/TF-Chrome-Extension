chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  
  if (request.action && (request.action === "getArtistAndAboutInfo")) {
    const observer = new MutationObserver(function(mutationsList, observer) {
      for (let mutation of mutationsList) {
        if (mutation.type === 'childList') {
          // Check if the name and skills are now in the DOM
          if (document.querySelector(".user-info > h1") && document.querySelector(".skills > div > badge-list > ul > li > .profile-badge")) {
            extractAndSendInfo();
            observer.disconnect();  // Stop observing once we've found the elements
            return;
          // Check if the name and EMPTY summary are now in the DOM
          } else if (document.querySelector(".user-info > h1") && document.querySelector(".resume-section-content .user-resume-summary-empty")) {
            extractAndSendInfo();
            observer.disconnect();  // Stop observing once we've found the elements
            return;
          } else if (document.querySelector(".user-info > h1") && document.querySelector(".resume-section-content .user-resume-summary-content")) {
            extractAndSendInfo();
            observer.disconnect();  // Stop observing once we've found the elements
            return;
          }
        }
      }
    });
    // Start observing the document with the configured parameters
    observer.observe(document.body, { childList: true, subtree: true });
  } else if (request.method && (request.method == "getArtistUrl")){
    if (document.querySelectorAll(".project-author-name > h3 > a")) {
      let artist = getArtistName();
      sendResponse({
        method: "getArtistUrl",
        url: artist
      });
      return;
    }
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


function getArtistName() {
  let name = document.querySelectorAll("header > .align-items-start > a");
  let prelude = Array.from(name).map(el => el.href.trim());
  const index = prelude[0].lastIndexOf("/");
  const word = prelude[0].substring(index);
  return word;
}

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
  //let noSummaryElement = document.querySelector(".resume-section-content .user-resume-summary-empty");
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
