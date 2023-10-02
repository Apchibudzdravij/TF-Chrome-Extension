function saveUrlToList(url, comment) {
  
  document.getElementById('addUrl').disabled = true;
  
  let selectedList = document.getElementById('existingLists').value;
  let newListName = document.getElementById('newListName').value;
  let listName = newListName || selectedList;

  // Get the current date and time in CET
  let currentDate = new Date();
  let cetDate = new Date(currentDate.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  let formattedDate = cetDate.toLocaleDateString();
  let formattedTime = cetDate.toLocaleTimeString() + " CET";

  // Send a message to the content script to get the artist and about info
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    let currentTab = tabs[0];
    let originalUrl = currentTab.url;

    // Check if the URL matches the pattern https://www.artstation.com/USER/ANYTHING-ELSE
    let match = originalUrl.match(/^https:\/\/www\.artstation\.com\/([^\/]+)\/.+/);

    // If it matches, reconstruct the URL to be https://www.artstation.com/USER
    if (match) {
        originalUrl = `https://www.artstation.com/${match[1]}`;
    }

    let profileUrl = originalUrl;
    if (!profileUrl.endsWith('/profile')) {
        profileUrl += '/profile';
    }

    // Navigate to the profile page
    chrome.tabs.update(currentTab.id, {url: profileUrl}, function(updatedTab) {
        // Wait for the tab to be fully loaded before sending the message
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (info.status === 'complete' && tabId === updatedTab.id) {
                chrome.tabs.sendMessage(updatedTab.id, {action: "getArtistAndAboutInfo"}, function(response) {
                    let artistInfo = null;
                    if (response) {
                        artistInfo = {
                            name: response.name,
                            location: response.location,
                            summary: response.summary,
                            skills: response.skills,
                            software: response.software
                        };
                    }
                    // Save the URL with artist info, date, time, and comment
                    saveToStorage(originalUrl, comment, artistInfo, formattedDate, formattedTime);

                    // Navigate back to the original URL
                    chrome.tabs.update(currentTab.id, {url: originalUrl});

                    // Remove the listener after it's executed to avoid multiple calls
                    chrome.tabs.onUpdated.removeListener(listener);
                });
            }
        });
    });
  });
}

// Helper function to save the URL and associated data to Chrome storage
function saveToStorage(url, comment, artistInfo, date, time) {
  let selectedList = document.getElementById('existingLists').value;
  let newListName = document.getElementById('newListName').value;
  let listName = newListName || selectedList;

  chrome.storage.sync.get(listName, function(data) {
    let list = data[listName] || [];
    list.push({
      url: url,
      comment: comment,
      date: date,
      time: time,
      artistInfo: artistInfo,
      status: "Unmarked"  // Default status
    });
    let saveObj = {};
    saveObj[listName] = list;

    chrome.storage.sync.set(saveObj, function() {
      console.log('URL saved to list:', listName);
      showFeedback('URL saved successfully!');
      
      // Refresh the dropdown to reflect the changes
      populateExistingLists();
      document.getElementById('addUrl').disabled = false;
    });
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
  feedbackDiv.style.backgroundColor = '#007BFF';
  feedbackDiv.style.color = 'white';
  feedbackDiv.style.padding = '5px 10px';
  feedbackDiv.style.borderRadius = '5px';
  document.body.appendChild(feedbackDiv);

  setTimeout(function() {
    document.body.removeChild(feedbackDiv);
  }, 3000);
}

function populateExistingLists() {
  // Get all keys (list names) from storage
  chrome.storage.sync.get(null, function(items) {
    let existingListsDropdown = document.getElementById('existingLists');
    
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
    let selectedList = document.getElementById('existingLists').value;
    if (selectedList) {
        displaySavedProfiles(selectedList);
    }
  });
}

function deleteSelectedList() {
  let selectedList = document.getElementById('existingLists').value;
  if (selectedList) {
      // Add a confirmation dialog
      if (confirm('Are you sure you want to delete the entire list? This action cannot be undone.')) {
          chrome.storage.sync.remove(selectedList, function() {
              console.log('List deleted:', selectedList);
              // Refresh the dropdown to reflect the changes
              populateExistingLists();
          });
      }
  }
}

document.getElementById('addUrl').addEventListener('click', function() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    let currentTab = tabs[0];
    let currentUrl = currentTab.url;
    let comment = document.getElementById('comment').value;

    saveUrlToList(currentUrl, comment);
    // Clear the comment field
    document.getElementById('comment').value = '';
  });
});

document.getElementById('importButton').addEventListener('click', function() {
  document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', function(event) {
  let file = event.target.files[0];
  let reader = new FileReader();
  
  reader.onload = function(e) {
    let importedData = JSON.parse(e.target.result);
    
    // Clear the storage first
    chrome.storage.sync.clear(function() {
      // Set the new values
      chrome.storage.sync.set(importedData, function() {
        showFeedback('URLs imported successfully!');
      });
    });
  };
  
  reader.readAsText(file);
});

document.getElementById('exportButton').addEventListener('click', function() {
  chrome.storage.sync.get(null, function(data) {
    let exportedData = JSON.stringify(data, null, 2);
    let blob = new Blob([exportedData], {type: 'application/json'});
    let url = URL.createObjectURL(blob);

    let a = document.createElement('a');
    a.href = url;
    a.download = 'exportedLists.json';
    a.click();

    URL.revokeObjectURL(url);
  });
});

// Event listener for the delete button
document.getElementById('deleteList').addEventListener('click', deleteSelectedList);

// Populate the dropdown when the popup is loaded 
document.addEventListener('DOMContentLoaded', populateExistingLists);

// Listener for the exportToExcel button
document.getElementById('exportToExcel').addEventListener('click', function() {
  let selectedList = document.getElementById('existingLists').value;
  exportToExcel(selectedList);
});

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
          xlsxData.push(["URL", "Comment", "Date", "Time", "Artist Name", "Artist Location", "Summary", "Skills", "Software"]);
          
          list.forEach(function(item) {
              let artistName = item.artistInfo ? item.artistInfo.name : '';
              let artistLocation = item.artistInfo ? item.artistInfo.location : '';
              let summary = item.artistInfo ? item.artistInfo.summary : '';
              let skills = item.artistInfo && item.artistInfo.skills ? item.artistInfo.skills.join(', ') : '';
              let software = item.artistInfo && item.artistInfo.software ? item.artistInfo.software.join(', ') : '';
              xlsxData.push([item.url, item.comment, item.date, item.time, artistName, artistLocation, summary, skills, software]);
          });

          // Create a new worksheet from the data
          var ws = XLSX.utils.aoa_to_sheet(xlsxData);

          // Append the worksheet to the workbook
          XLSX.utils.book_append_sheet(wb, ws, ws_name);

          // Write the workbook to a file and trigger download
          XLSX.writeFile(wb, listName + ".xlsx");
      } else {
          console.error('No data found for list:', listName);
      }
  });
}

// Listener to display saved profiles
document.getElementById('existingLists').addEventListener('change', function() {
  let selectedList = this.value;
  displaySavedProfiles(selectedList);
});

// Display saved profiles
function displaySavedProfiles(listName) {
  chrome.storage.sync.get(listName, function(data) {
    let list = data[listName];
    let profileListDiv = document.getElementById('profileList');
    profileListDiv.innerHTML = ''; // Clear previous profiles

    // Update the profile count
    let profileCountElement = document.getElementById('profileCount');
    profileCountElement.textContent = list ? list.length : 0;

    // Filter options
    let filterDiv = document.createElement('div');
    filterDiv.className = 'filterDiv';

    let allBtn = document.createElement('button');
    allBtn.textContent = 'All';
    allBtn.addEventListener('click', function() {
        filterProfiles('All');
    });

    // For the "Yes" filter button
    let yesBtnFilter = document.createElement('button');
    yesBtnFilter.className = "filterButton";  // Add a class to the button
    let yesIconFilter = document.createElement('img');
    yesIconFilter.src = 'images/IconStar.svg';  // Path to your star image for "Yes"
    yesIconFilter.alt = 'Yes';
    yesBtnFilter.appendChild(yesIconFilter);
    yesBtnFilter.addEventListener('click', function() {
        filterProfiles('Yes');
    });

    // For the "Review Later" filter button
    let reviewLaterBtnFilter = document.createElement('button');
    reviewLaterBtnFilter.className = "filterButton";  // Add a class to the button
    let reviewIconFilter = document.createElement('img');
    reviewIconFilter.src = 'images/IconQuestionMark.svg';  // Path to your question mark image for "Review Later"
    reviewIconFilter.alt = 'Review Later';
    reviewLaterBtnFilter.appendChild(reviewIconFilter);
    reviewLaterBtnFilter.addEventListener('click', function() {
        filterProfiles('To review later');
    });

    filterDiv.appendChild(allBtn);
    filterDiv.appendChild(yesBtnFilter);
    filterDiv.appendChild(reviewLaterBtnFilter);
    profileListDiv.appendChild(filterDiv);

    // Add a line to separate filters and profiles
    let hrElement = document.createElement('hr');
    profileListDiv.appendChild(hrElement);

    if (list && list.length) {
      list.forEach(function(item) {
        let profileDiv = document.createElement('div');
        profileDiv.className = 'profileItem';

        // Make the profile name a clickable link
        let profileNameLink = document.createElement('a');
        profileNameLink.href = item.url;
        profileNameLink.target = '_blank'; // Open in a new tab
        profileNameLink.textContent = item.artistInfo ? item.artistInfo.name : 'Unknown Artist';
        profileNameLink.className = 'profileNameLink';
        profileNameLink.setAttribute('data-status', item.status || 'Unknown');

        // Status buttons
        let yesBtn = document.createElement('button');
        yesBtn.className = (item.status === "Yes") ? 'statusBtn active' : 'statusBtn';
        let yesIcon = document.createElement('img');
        yesIcon.src = 'images/IconStar.svg';  // Path to your star image
        yesIcon.alt = 'Yes';
        yesBtn.appendChild(yesIcon);
        yesBtn.addEventListener('click', function() {
            updateProfileStatus(item.url, "Yes");
        });

        let reviewLaterBtn = document.createElement('button');
        reviewLaterBtn.className = (item.status === "To review later") ? 'statusBtn reviewLater active' : 'statusBtn reviewLater';
        let reviewIcon = document.createElement('img');
        reviewIcon.src = 'images/IconQuestionMark.svg';  // Path to your question mark image
        reviewIcon.alt = 'Review Later';
        reviewLaterBtn.appendChild(reviewIcon);
        reviewLaterBtn.addEventListener('click', function() {
            updateProfileStatus(item.url, "To review later");
        });

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

        let buttonContainer = document.createElement('div');
        buttonContainer.className = 'buttonContainer';

        buttonContainer.appendChild(yesBtn);  // Add the "Yes" button
        buttonContainer.appendChild(reviewLaterBtn);  // Add the "Review Later" button
        buttonContainer.appendChild(deleteBtn);

        profileDiv.appendChild(profileNameLink);
        profileDiv.appendChild(buttonContainer);  // Add the button container to the profile div

        profileListDiv.appendChild(profileDiv);
      });
    } else {
        profileListDiv.innerHTML = '<p>No profiles saved.</p>';
    }
  });
}

// Search functionality
document.getElementById('searchProfile').addEventListener('input', function() {
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

// Listener to get advanced options in HTML file
document.getElementById('advancedOptionsToggle').addEventListener('click', function() {
  let advancedOptions = document.getElementById('advancedOptions');
  if (advancedOptions.style.display === "none") {
      advancedOptions.style.display = "block";
  } else {
      advancedOptions.style.display = "none";
  }
});

function updateProfileStatus(url, status) {
    let listName = document.getElementById('existingLists').value;
    chrome.storage.sync.get(listName, function(data) {
        let list = data[listName];
        let profile = list.find(p => p.url === url);
        if (profile) {
            profile.status = status;
            chrome.storage.sync.set({ [listName]: list }, function() {
                displaySavedProfiles(listName); // Refresh the list
            });
        }
    });
}

function filterProfiles(status) {
  let allProfiles = document.querySelectorAll('.profileItem');
  allProfiles.forEach(profile => {
      let nameLink = profile.querySelector('.profileNameLink');
      if (status === 'All' || (nameLink && nameLink.getAttribute('data-status') === status)) {
          profile.style.visibility = 'visible';
          profile.style.height = 'auto';
      } else {
          profile.style.visibility = 'hidden';
          profile.style.height = '0';
      }
  });
}

