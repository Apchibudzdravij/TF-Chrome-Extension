function saveUrlToList(comment) {
  document.querySelector('#addUrl').disabled = true;

  // Get the current date and time in CET
  let currentDate = new Date();
  let cetDate = new Date(currentDate.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  let formattedDate = cetDate.toLocaleDateString();
  let formattedTime = cetDate.toLocaleTimeString() + " CET";
  
  // Send a message to the content script to get the artist and about info
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    let currentTab = tabs[0];
    let originalUrl = currentTab.url;
    let profileUrl = originalUrl;
    if (originalUrl.indexOf('artstation.com') === -1) {
      alert("This is not an artstation.com");
      document.querySelector('#addUrl').disabled = false;
      return;
    }
    if (originalUrl.indexOf('artwork') !== -1) {
        chrome.tabs.sendMessage(currentTab.id, {method: "getArtistUrl"}, response => {
          if(response && (response.method=="getArtistUrl")){
            if (response.url) {
              profileUrl = `https://www.artstation.com${response.url}/profile`;
              let count = 0;
              chrome.tabs.update(currentTab.id, {url: profileUrl}, function(updatedTab) {
                // Wait for the tab to be fully loaded before sending the message
                chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                  if (info.status === 'complete' && tabId === updatedTab.id) {
                    chrome.tabs.sendMessage(updatedTab.id, {action: "getArtistAndAboutInfo"}, function(response) {
                      if (count === 0){
                        ++count;
                        let artistInfo = null;
                        if (response) {
                          artistInfo = {
                            name: response.name,
                            location: response.location,
                            summary: response.summary,
                            skills: response.skills,
                            software: response.software,
                            contacts: response.contacts
                          };
                        }
                        // Save the URL with artist info, date, time, and comment
                        saveToStorage(profileUrl, comment, artistInfo, formattedDate, formattedTime);
                        // Navigate back to the original URL
                        chrome.tabs.update(currentTab.id, {url: originalUrl});
                        // Remove the listener after it's executed to avoid multiple calls
                        chrome.tabs.onUpdated.removeListener(listener);
                        document.querySelector('#addUrl').disabled = false;
                      }
                    });
                  }
                });
              });
              document.querySelector('#addUrl').disabled = false;
            } else if (response.method == "noContent") {
              alert('No URL found'); 
              document.querySelector('#addUrl').disabled = false;
            }else {
              document.querySelector('#addUrl').disabled = false;
            }
          }
          document.querySelector('#addUrl').disabled = false;
        });
    } else if (originalUrl.indexOf('dimension=') === -1) {
      // Check if the URL matches the pattern https://www.artstation.com/USER/ANYTHING-ELSE
      let match = originalUrl.match(/^https:\/\/www\.artstation\.com\/([^\/]+)\/.+/);
      // If it matches, reconstruct the URL to be https://www.artstation.com/USER
      if (match) {
        originalUrl = `https://www.artstation.com/${match[1]}`;
        profileUrl = originalUrl;
      }

      if (!profileUrl.endsWith('/profile')) {
        profileUrl += '/profile';
      }
      let count = 0;
      // Navigate to the profile page
      chrome.tabs.update(currentTab.id, {url: profileUrl}, function(updatedTab) {
        // Wait for the tab to be fully loaded before sending the message
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (info.status === 'complete' && tabId === updatedTab.id) {
            chrome.tabs.sendMessage(updatedTab.id, {action: "getArtistAndAboutInfo"}, function(response) {
              if (count === 0){
                ++count;
                let artistInfo = null;
                if (response) {
                  artistInfo = {
                    name: response.name,
                    location: response.location,
                    summary: response.summary,
                    skills: response.skills,
                    software: response.software,
                    contacts: response.contacts
                  };
                }
                // Save the URL with artist info, date, time, and comment
                saveToStorage(profileUrl, comment, artistInfo, formattedDate, formattedTime);
                // Navigate back to the original URL
                chrome.tabs.update(currentTab.id, {url: originalUrl});
                // Remove the listener after it's executed to avoid multiple calls
                chrome.tabs.onUpdated.removeListener(listener);
                document.querySelector('#addUrl').disabled = false;
              }
            });
          }
        });
      });
    } else {
      alert("No selected artist found!");
      document.querySelector('#addUrl').disabled = false;
    }
  });
}

// Helper function to save the URL and associated data to Chrome storage
function saveToStorage(url, comment, artistInfo, date) {
  let listName = document.getElementById('existingLists').value;
  chrome.storage.sync.get(listName, function(data) {
    let list = data[listName];
    for (item in list) {
      if (list[item].url == url) {
        if (confirm('Profile already exists in list: ' + listName + '! Override profile?')) {
          let tempStatus = document.querySelector('#addStar').style.backgroundColor == 'gold'
            ? 'Yes'
            : document.querySelector('#addQuestion').style.backgroundColor == 'gold'
            ? 'To review later'
            : 'Unmarked';
          document.querySelector('#addStar').style.backgroundColor = '#99ebd1';
          document.querySelector('#addQuestion').style.backgroundColor = '#99ebd1';
          
          list[item].comment = comment;
          list[item].date = date;
          list[item].artistInfo = artistInfo;
          list[item].status = tempStatus;
          let saveObj = {};
          saveObj[listName] = list;
          let bodyObj = {
            parm: "artist",
            artist: {
              url: url,
              comment: comment,
              artistInfo: {
                name: artistInfo.name,
                location: artistInfo.location,
                summary: artistInfo.summary,
                skills: artistInfo.skills,
                software: artistInfo.software,
                contacts: {
                  contacts: artistInfo.contacts.contacts? artistInfo.contacts.contacts.join(', '): "",
                  linkedin: artistInfo.contacts.linkedin? artistInfo.contacts.linkedin : '',
                  facebook: artistInfo.contacts.facebook? artistInfo.contacts.facebook : '',
                  instagram: artistInfo.contacts.instagram? artistInfo.contacts.instagram : '',
                  twitter: artistInfo.contacts.twitter? artistInfo.contacts.twitter : ''
                }
              }
            },
            vacancy: listName
          };
          chrome.storage.sync.set(saveObj, function() {
            showFeedback('URL saved successfully!');
            populateExistingLists();
            document.getElementById('addUrl').disabled = false;
            fetch("https://tf-extension-assistant.onrender.com/upload", {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(bodyObj)
            });
          });
          selectNew();
          return;
        }
        return;
      }
    }
    let tempStatus = document.querySelector('#addStar').style.backgroundColor == 'gold'
      ? 'Yes'
      : document.querySelector('#addQuestion').style.backgroundColor == 'gold'
      ? 'To review later'
      : 'Unmarked';
    document.querySelector('#addStar').style.backgroundColor = '#99ebd1';
    document.querySelector('#addQuestion').style.backgroundColor = '#99ebd1';
    
    chrome.storage.sync.get(listName, function(data) {
      let list = data[listName] || [];
      list.push({
        url: url,
        comment: comment,
        date: date,
        artistInfo: artistInfo,
        status: tempStatus
      });
      let saveObj = {};
      saveObj[listName] = list;
      let bodyObj = {
        parm: "artist",
        artist: {
          url: url,
          comment: comment,
          artistInfo: {
            name: artistInfo.name,
            location: artistInfo.location,
            summary: artistInfo.summary,
            skills: artistInfo.skills,
            software: artistInfo.software,
            contacts: {
              contacts: artistInfo.contacts.contacts? artistInfo.contacts.contacts.join(', '): "",
              linkedin: artistInfo.contacts.linkedin? artistInfo.contacts.linkedin : '',
              facebook: artistInfo.contacts.facebook? artistInfo.contacts.facebook : '',
              instagram: artistInfo.contacts.instagram? artistInfo.contacts.instagram : '',
              twitter: artistInfo.contacts.twitter? artistInfo.contacts.twitter : ''
            }
          }
        },
        vacancy: listName
      };
      chrome.storage.sync.set(saveObj, function() {
        showFeedback('URL saved successfully!');
        // Refresh the dropdown to reflect the changes
        populateExistingLists();
        document.getElementById('addUrl').disabled = false;
        fetch("https://tf-extension-assistant.onrender.com/upload", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bodyObj)
        });
      });
    });
    selectNew();
  });
}

// Function to show feedback to the user
function showFeedback(message) {
  let feedbackDiv = document.createElement('div');
  feedbackDiv.textContent = message;
  feedbackDiv.style.position = 'fixed';
  feedbackDiv.style.bottom = '10px';
  feedbackDiv.style.left = '50%';
  feedbackDiv.style.transform = 'translateX(-50%)';
  feedbackDiv.style.backgroundColor = '#99ebd1';
  feedbackDiv.style.color = 'white';
  feedbackDiv.style.padding = '5px 10px';
  feedbackDiv.style.borderRadius = '5px';
  document.body.appendChild(feedbackDiv);
  setTimeout(() => {
    document.body.removeChild(feedbackDiv);
  }, 3000);
}

function populateExistingLists() {
  // Get all keys (list names) from storage
  chrome.storage.sync.get(null, items => {
    let existingListsDropdown = document.querySelector('#existingListGroup');
    // Clear the current options in the dropdown
    existingListsDropdown.innerHTML = '';
    // Populate the dropdown with the names of existing lists
    for (let listName in items) {
        let option = document.createElement('option');
        option.value = listName;
        option.textContent = listName;
        existingListsDropdown.appendChild(option);
    }
    // After refreshing the dropdown, display the saved profiles for the selected list
    let selectedList = document.querySelector('#existingLists').value;
    if (selectedList) {
        displaySavedProfiles(selectedList);
    }
  });
}

function deleteSelectedList() {
  let selectedList = document.querySelector('#existingLists').value;
  if (selectedList) {
    // Add a confirmation dialog
    if (confirm('Are you sure you want to delete the entire list? This action cannot be undone.')) {
      chrome.storage.sync.remove(selectedList, () => {
        // Refresh the dropdown to reflect the changes
        populateExistingLists();
      });
      selectNew();
    }
  }
}
function createSelectedList() {
  let newList = document.querySelector('#newListName').value;
  if (newList) {
  chrome.storage.sync.get(null, items => {
    let isNotExisting = true;
    for (let listName in items) {
        if (listName == newList) {
          isNotExisting = false;
          break;
        }
    }
    if (isNotExisting) {
      let saveObj = {};
      saveObj[newList] = [];
      chrome.storage.sync.set(saveObj, () => {
        populateExistingLists();
        showFeedback('List created successfully!');
        document.querySelector('#newListName').value = '';
      });
    } else {
      alert('A list with that name already exists!');
    }
  });
  } else {
    alert('Please enter a list name!');
  }
}

document.querySelector('#addList').addEventListener('click', createSelectedList);
document.querySelector('#existingLists').addEventListener('change', checkIfNewList);

let star = document.querySelector("#addStar");
let question = document.querySelector("#addQuestion");

star.onclick = () => {
  let starIsActive = star.style.backgroundColor == 'gold';
  if (starIsActive) {
    star.style.backgroundColor = '#99ebd1';
  } else {
    star.style.backgroundColor = 'gold';
    question.style.backgroundColor = '#99ebd1';
  }
};
question.onclick = () => {
  let questionIsActive = question.style.backgroundColor == 'gold';
  if (questionIsActive) {
    question.style.backgroundColor = '#99ebd1';
  } else {
    question.style.backgroundColor = 'gold';
    star.style.backgroundColor = '#99ebd1';
  }
};

document.querySelector('#addUrl').onclick = addUrlEvent;

function addUrlEvent() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    let comment = document.getElementById('comment').value;
    saveUrlToList(comment);
    // Clear the comment field
    document.querySelector('#comment').value = '';
  });
};

// Event listener for the delete button
document.getElementById('deleteList').onclick = deleteSelectedList;

// Populate the dropdown when the popup is loaded 
document.addEventListener('DOMContentLoaded', populateExistingLists);

// Listener for the exportToExcel button
document.getElementById('exportToExcel').onclick = () => {
  let selectedList = document.getElementById('existingLists').value;
  exportToExcel(selectedList);
};

// Function to export lists into Excel
function exportToExcel(listName) {
  chrome.storage.sync.get(listName, function(data) {
    let list = data[listName];
    if (list && list.length) {
      // Create a new workbook and a new worksheet
      var wb = XLSX.utils.book_new();
      var ws_name = "SheetJS";

      // Prepare data in a format suitable for XLSX
      let xlsxData = [];
      xlsxData.push(["URL", "Comment", "Date", "Artist Name", "Artist Location", "Summary", "Skills", "Software", "Status", "Vacancy", "LinkedIn", "Twitter", "Facebook", "Instagram", "Contacts"]);
          
      list.forEach(function(item) {
        let artistName = item.artistInfo ? item.artistInfo.name : '';
        let artistLocation = item.artistInfo ? item.artistInfo.location : '';
        let summary = item.artistInfo ? item.artistInfo.summary : '';
        let skills = item.artistInfo && item.artistInfo.skills ? item.artistInfo.skills.join(', ') : '';
        let software = item.artistInfo && item.artistInfo.software ? item.artistInfo.software.join(', ') : '';
        let linkedin = item.artistInfo && item.artistInfo.contacts && item.artistInfo.contacts.linkedin ? item.artistInfo.contacts.linkedin : '';
        let twitter = item.artistInfo && item.artistInfo.contacts && item.artistInfo.contacts.twitter? item.artistInfo.contacts.twitter : '';
        let facebook = item.artistInfo && item.artistInfo.contacts && item.artistInfo.contacts.facebook? item.artistInfo.contacts.facebook : '';
        let instagram = item.artistInfo && item.artistInfo.contacts && item.artistInfo.contacts.instagram? item.artistInfo.contacts.instagram : '';
        let contacts = item.artistInfo && item.artistInfo.contacts && item.artistInfo.contacts.contacts? item.artistInfo.contacts.contacts.join(', ') : '';
        xlsxData.push([item.url, item.comment, item.date, artistName, artistLocation, summary, skills, software, item.status, listName, linkedin, twitter, facebook, instagram, contacts]);
      });

      // Create a new worksheet from the data
      var ws = XLSX.utils.aoa_to_sheet(xlsxData);
      // Append the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, ws_name);
      // Write the workbook to a file and trigger download
      XLSX.writeFile(wb, listName + ".xlsx");
    } else {
      alert('No data found for list:'+ listName);
    }
  });
}

// Listener to display saved profiles
document.querySelector('#existingLists').addEventListener('change', function() {
  let selectedList = this.value;
  displaySavedProfiles(selectedList);
});

function displaySavedProfiles(listName) {
  let profileListDiv = document.querySelector('#profileList');
  // The most beatyful profile list is table IMHO
  let table = document.createElement('table');

  // Filter options
  let thead = document.createElement('thead');
  let filterRow = document.createElement('tr');
  let filterCell = document.createElement('th');
  filterCell.textContent = 'Filters:';
  
  let allBtnCell = document.createElement('th');
  let allBtn = document.createElement('button');
  allBtn.id = "filterAllButton";  // Add a class to the button
  allBtn.className = "filterButton";
  allBtn.textContent = 'All';
  allBtn.addEventListener('click', function() {
    document.querySelectorAll('.filterButton').forEach(btn => {btn.style.backgroundColor = '#99ebd1'});
    filterProfiles('All');
  });
  allBtnCell.appendChild(allBtn);

  // For the "Yes" filter button
  let yesBtnCell = document.createElement('th');
  let yesBtn = document.createElement('button');
  yesBtn.className = "filterButton";  // Add a class to the button
  let yesIcon = document.createElement('img');
  yesIcon.src = 'images/star.svg';  // Path to your star image for "Yes"
  yesIcon.alt = 'Yes';
  yesBtn.appendChild(yesIcon);
  yesBtn.addEventListener('click', function() {
    document.querySelectorAll('.filterButton').forEach(btn => {btn.style.backgroundColor = '#99ebd1'});
    yesBtn.style.backgroundColor = 'gold';
    filterProfiles('Yes');
  });
  yesBtnCell.appendChild(yesBtn);

  // For the "Review Later" filter button
  let reviewLaterBtnCell = document.createElement('th');
  let reviewLaterBtn = document.createElement('button');
  reviewLaterBtn.className = "filterButton";  // Add a class to the button
  let reviewLaterIcon = document.createElement('img');
  reviewLaterIcon.src = 'images/IconQuestionMark.svg';  // Path to your question mark image for "Review Later"
  reviewLaterIcon.alt = 'Review Later';
  reviewLaterBtn.appendChild(reviewLaterIcon);
  reviewLaterBtn.addEventListener('click', function() {
    document.querySelectorAll('.filterButton').forEach(btn => {btn.style.backgroundColor = '#99ebd1'});
    reviewLaterBtn.style.backgroundColor = 'gold';
    filterProfiles('To review later');
  });
  reviewLaterBtnCell.appendChild(reviewLaterBtn);

  filterRow.appendChild(filterCell);
  filterRow.appendChild(yesBtnCell);
  filterRow.appendChild(reviewLaterBtnCell);
  filterRow.appendChild(allBtnCell);
  thead.appendChild(filterRow);
  table.appendChild(thead);

  chrome.storage.sync.get(listName, function(data) {
    let list = data[listName];
    profileListDiv.innerHTML = ''; // Clear previous profiles

    // Update the profile count
    let profileCountElement = document.querySelector('#profileCount');
    profileCountElement.textContent = list ? list.length : 0;

    if (list && list.length) {
      let tbody = document.createElement('tbody');
      list.forEach(item => { //lambda expression is a little bit easier to read
        let profileRow = document.createElement('tr');
        profileRow.className = 'profileItem';

        // Make the profile name a clickable link
        let profileNameLinkCell = document.createElement('td');
        let tooltipDiv = document.createElement('div');
        let profileNameLink = document.createElement('a');
        profileNameLink.href = item.url;
        profileNameLink.target = '_blank'; // Open in a new tab
        profileNameLink.textContent = item.artistInfo ? item.artistInfo.name : 'Unknown Artist';
        profileNameLink.className = 'profileNameLink';
        tooltipDiv.className = 'tooltip';
        profileNameLink.setAttribute('data-status', item.status || 'Unknown');
        tooltipDiv.appendChild(profileNameLink);
        // Tooltip for the profile name link
        if (item.comment != '') {
          let tooltip = document.createElement('span');
          tooltip.textContent = item.comment;
          tooltip.className = 'tooltiptext';
          tooltipDiv.appendChild(tooltip);
        }
        profileNameLinkCell.appendChild(tooltipDiv);

        // Status buttons
        let yesBtnCell = document.createElement('td');
        let yesBtn = document.createElement('button');
        yesBtn.className = (item.status === "Yes") ? 'statusBtn active' : 'statusBtn';
        let yesIcon = document.createElement('img');
        yesIcon.src = 'images/star.svg';  // Path to your star image
        yesIcon.alt = 'Yes';
        yesBtn.appendChild(yesIcon);
        yesBtn.addEventListener('click', function() {
            updateProfileStatus(item.url, "Yes");
        });
        yesBtnCell.appendChild(yesBtn);

        let reviewLaterBtnCell = document.createElement('td');
        let reviewLaterBtn = document.createElement('button');
        reviewLaterBtn.className = (item.status === "To review later") ? 'statusBtn reviewLater active' : 'statusBtn reviewLater';
        let reviewIcon = document.createElement('img');
        reviewIcon.src = 'images/IconQuestionMark.svg';  // Path to your question mark image
        reviewIcon.alt = 'Review Later';
        reviewLaterBtn.appendChild(reviewIcon);
        reviewLaterBtn.addEventListener('click', function() {
            updateProfileStatus(item.url, "To review later");
        });
        reviewLaterBtnCell.appendChild(reviewLaterBtn);

        let deleteBtnCell = document.createElement('td');
        let deleteBtn = document.createElement('button');
        deleteBtn.className = 'statusBtn';
        let deleteIcon = document.createElement('img');
        deleteIcon.src = 'images/IconDelete.svg';  // Path to your cross image
        deleteIcon.alt = 'Delete';
        deleteBtn.appendChild(deleteIcon);
        deleteBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete this profile?')) {
                let index = list.findIndex(profile => profile.url === item.url);
                if (index > -1) {
                    list.splice(index, 1);
                    chrome.storage.sync.set({ [listName]: list }, function() {
                        displaySavedProfiles(listName); // Refresh the list
                    });
                }
            }
        });
        deleteBtnCell.appendChild(deleteBtn);

        profileRow.appendChild(profileNameLinkCell);
        profileRow.appendChild(yesBtnCell);
        profileRow.appendChild(reviewLaterBtnCell);
        profileRow.appendChild(deleteBtnCell);
        tbody.appendChild(profileRow);
        table.appendChild(tbody);
      });
      profileListDiv.appendChild(table);
    } else {
      profileListDiv.innerHTML = '<p>No profiles saved.</p>';
    }
  });
}

// Search functionality
document.querySelector('#searchProfile').addEventListener('input', function() {
  let query = this.value.toLowerCase();
  let profiles = document.querySelectorAll('.profileItem');
  profiles.forEach(function(profile) {
      if (profile.textContent.toLowerCase().includes(query)) {
          profile.style.display = 'flex';
      } else {
          profile.style.display = 'none';
      }
  });
});

function updateProfileStatus(url, status) {
    let listName = document.querySelector('#existingLists').value;
    chrome.storage.sync.get(listName, function(data) {
        let list = data[listName];
        let profile = list.find(p => p.url === url);
        if (profile) {
          if (profile.status == status) {
            profile.status = 'Unmarked';
            chrome.storage.sync.set({ [listName]: list }, function() {
                displaySavedProfiles(listName); // Refresh the list
            });
          } else {
            profile.status = status;
            chrome.storage.sync.set({ [listName]: list }, function() {
                displaySavedProfiles(listName); // Refresh the list
            });
          }
        }
    });
}

function filterProfiles(status) {
  let allProfiles = document.querySelectorAll('.profileItem');
  allProfiles.forEach(profile => {
      let nameLink = profile.querySelector('.profileNameLink');
      if (status === 'All' || (nameLink && nameLink.getAttribute('data-status') === status)) {
          profile.style.display = 'table-row';
      } else {
          profile.style.display = 'none';
      }
  });
}

function checkIfNewList() {
  if (this.value == 'New list'){
    selectNew();
  } else {
    selectExisting();
  }
}

function selectNew() {
  document.querySelector('#newListName').style.display = 'inline-block';
  document.querySelector('#notNewList').style.display = 'none';
  document.querySelector('#comment').style.display = 'none';
  document.querySelectorAll('.button-row')[0].style.display = 'none';
  document.querySelectorAll('.button-row')[1].style.display = 'flex';
}

function selectExisting() {
  document.querySelector('#newListName').style.display = 'none';
  document.querySelector('#notNewList').style.display = 'block';
  document.querySelector('#comment').style.display = 'inline-block';
  document.querySelectorAll('.button-row')[0].style.display = 'flex';
  document.querySelectorAll('.button-row')[1].style.display = 'none';
}
