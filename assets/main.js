// Dom elements
const targetList = document.getElementById('targetList');
const menuList = document.getElementById('menuList');
const menuSection = document.getElementById('menuSection');
const latInput = document.getElementById('latInput');
const lonInput = document.getElementById('lonInput');
const updateLocationButton = document.getElementById('updateLocationButton');
const targetNAME = document.getElementById('targetNAME');
const targetCONST = document.getElementById('targetCONST');
const targetAZ = document.getElementById('targetAZ');
const targetEL = document.getElementById('targetEL');
const targetDIST = document.getElementById('targetDIST');
const targetDIAM = document.getElementById('targetDIAM');
const targetABOVE = document.getElementById('targetABOVE');
const targetBELOW = document.getElementById('targetBELOW');
const targetTable = document.getElementById('targetInfoTable');

// Global vars
let targets;
let selectedTargetIndex;
let selectedTargetObject;
let selectedMenuIndex;
let userCoordinates = {};

// Update user's location from the geolocation api
navigator.geolocation.getCurrentPosition((position) => {
    let lat = position.coords.latitude.toString().slice(0, 8);
    let lon = position.coords.longitude.toString().slice(0, 8);
    userCoordinates.latitude = lat;
    userCoordinates.longitude = lon;
    latInput.value = lat;
    lonInput.value = lon;
    updateLocationUpdateButton();
});

// Fetch data from api
const fetchData = () => {
    // https://api.hydr4z.nl/?key=BhEx0WJP5Y75qwK%5EE1i8
    targets = JSON.parse(`
    {
        "data": [
            {
              "name": "Mercury",
              "el": -33,
              "az": 278.5,
              "dist": 1.232,
              "diam": 4879,
              "const": "Sagittarius",
              "above": "09:38",
              "below": "17:56"
            },
            {
              "name": "Venus",
              "el": -54.5,
              "az": 312,
              "dist": 1.6,
              "diam": 12104,
              "const": "Aries",
              "above": "07:39",
              "below": "15:20"
            },
            {
              "name": "Mars",
              "el": 41.4,
              "az": 232.3,
              "dist": 1.008,
              "diam": 6779,
              "const": "Capricornus",
              "above": "12:00",
              "below": "02:18"
            },
            {
              "name": "Jupiter",
              "el": -33.5,
              "az": 280.9,
              "dist": 6.047,
              "diam": 139820,
              "const": "Capricornus",
              "above": "09:26",
              "below": "17:55"
            },
            {
              "name": "Saturn",
              "el": -35.5,
              "az": 282.8,
              "dist": 10.952,
              "diam": 139820,
              "const": "Aries",
              "above": "09:19",
              "below": "17:42"
            },
            {
              "name": "Uranus",
              "el": 43.4,
              "az": 227.2,
              "dist": 19.512,
              "diam": 50724,
              "const": "Aquarius",
              "above": "12:19",
              "below": "02:37"
            },
            {
              "name": "Neptune",
              "el": 3.3,
              "az": 256.9,
              "dist": 30.468,
              "diam": 49244,
              "const": "Sagittarius",
              "above": "10:58",
              "below": "22:00"
            },
            {
              "name": "Pluto",
              "el": -42.6,
              "az": 288.7,
              "dist": 35.182,
              "diam": 2376,
              "const": null,
              "above": "09:01",
              "below": "16:51"
            },
            {
              "name": "Moon",
              "el": -48.6,
              "az": 292.9,
              "dist": 0.002,
              "diam": 3474,
              "const": "Sagittarius",
              "above": "08:20",
              "below": "15:53"
            },
            {
              "name": "Sun",
              "el": -42.9,
              "az": 291.2,
              "dist": 0.984,
              "diam": 1392700,
              "const": "Sagittarius",
              "above": "08:39",
              "below": "16:55"
            }
          ]
      }
    `).data;
    updateTargetList();
}

// Add targets to target list
const updateTargetList = () => {
    let listHtml = '';
    targets.forEach(t => {
        listHtml += `
            <li onclick="selectTarget(${targets.indexOf(t)})">
                <span class="tooltiptext">${t.name}</span>
                <img src="./assets/icons/${t.name}.png" />
            </li>
        `;
    });
    targetList.innerHTML = listHtml;
}

// Update the target data table or hide if no target is selected
const updateInfoSection = () => {
    if (selectedTargetIndex != null) {
        targetTable.classList.add('active');
        targetNAME.innerHTML = targets[selectedTargetIndex].name;
        targetCONST.innerHTML = targets[selectedTargetIndex].const;
        targetAZ.innerHTML = targets[selectedTargetIndex].az + '°';
        targetEL.innerHTML = targets[selectedTargetIndex].el + '°';
        targetDIST.innerHTML = targets[selectedTargetIndex].dist + ' Au';
        targetDIAM.innerHTML = targets[selectedTargetIndex].diam + ' Km';
        targetABOVE.innerHTML = targets[selectedTargetIndex].above;
        targetBELOW.innerHTML = targets[selectedTargetIndex].below;
    } else {
        targetTable.classList.remove('active');
    }
}

// Display the selected menu
const displayMenu = (index) => {
    let currentMenu = menuSection.getElementsByClassName('active')[0];
    if (index != null && currentMenu != undefined) {
        currentMenu.classList.remove('visible');
        setTimeout(function(){ 
            currentMenu.classList.remove('active'); 
            menuSection.getElementsByTagName('div')[index].classList.add('active');
            menuSection.getElementsByTagName('div')[index].classList.add('visible');
        }, 150);
    } else if (index != null && currentMenu == undefined) {
        menuSection.getElementsByTagName('div')[index].classList.add('active');
        menuSection.getElementsByTagName('div')[index].classList.add('visible');
    } else {
        if (currentMenu != undefined) {
            currentMenu.classList.remove('visible');
            setTimeout(function(){ currentMenu.classList.remove('active'); }, 150);
        }
    }
}

// When clicked on a target in the gui or list : set the target accoardingly and lock the gui's camera
const selectTarget = (targetIndex) => {
    let currentTarget = targetList.getElementsByClassName('active')[0];
    try { currentTarget.classList.remove('active'); } catch {}
    if (selectedTargetIndex != targetIndex && targetIndex != null) {
        targetList.getElementsByTagName('LI')[targetIndex].classList.add('active');
        selectedTargetIndex = targetIndex;
        selectedTargetObject = scene.getObjectByName(targets[targetIndex].name);
        cameraZoom = 10;
        sendTargetButton.disabled = !bleConnected;
    } else {
        selectedTargetIndex = null;
        selectedTargetObject = null;
        cameraZoom = 1;
        sendTargetButton.disabled = true;
    }
    updateInfoSection();
}

// When clicked on a menu item : set correct menu to active
const selectMenu = (menuIndex) => {
    let currentMenu = menuList.getElementsByClassName('active')[0];
    try { currentMenu.classList.remove('active'); } catch {}
    if (selectedMenuIndex != menuIndex && menuIndex != null) {
        menuList.getElementsByTagName('LI')[menuIndex].classList.add('active');
        selectedMenuIndex = menuIndex;
        displayMenu(selectedMenuIndex);
    } else {
        selectedMenuIndex = null;
        displayMenu(null);
    }
}

// Update location update button status
const updateLocationUpdateButton = () => {
    if (lonInput.value != NaN && latInput.value != NaN && latInput.value != '' && lonInput.value != '' && (parseFloat(latInput.value) != userCoordinates.latitude || parseFloat(lonInput.value) != userCoordinates.longitude)) {
        updateLocationButton.disabled = false;
    } else {
        updateLocationButton.disabled = true;
    }
}

// Update user's location
const updateLocation = () => {
    userCoordinates.latitude = latInput.value;
    userCoordinates.longitude = lonInput.value;
    updateLocationUpdateButton();
    fetchData();
}

fetchData();
setInterval(() => {
    fetchData();
}, 30000);

init();
animate();