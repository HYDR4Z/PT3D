// Dom elements
const targetList = document.getElementById('targetList');
const menuList = document.getElementById('menuList');
const menuSection = document.getElementById('menuSection');
const sendTargetButton = document.getElementById('sendTargetButton');
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

// Linear interpolation function to smoothen actions
function lerp (start, end, amt){
    return (1-amt)*start+amt*end
}

// Convert degrees to radians
Math.radians = function(degrees) {
	return degrees * Math.PI / 180;
}

// Convert radians to degrees
Math.degrees = function(radians) {
	return radians * 180 / Math.PI;
}

// Convert spherical in degrees to cartesian
Math.cartesian = function(azimuth, elevation, radius) {
    return {
        x: radius * Math.cos(Math.radians(elevation)) * Math.cos(Math.radians(azimuth)),
        z: radius * Math.cos(Math.radians(elevation)) * Math.sin(Math.radians(azimuth)),
        y: radius * Math.sin(Math.radians(elevation))
    }
}

// Convert cartesian to spherical in degrees
Math.spherical = function(radius, y, z) {
    return {
        el: Math.degrees(Math.asin(y / radius)),
        az: Math.degrees(Math.asin(z / (-radius * Math.cos(Math.asin(y / radius)))))
    }
}

// Fetch data from api
const fetchData = () => {
    // http://api.hydr4z.nl/?key=BhEx0WJP5Y75qwK%5EE1i8
    targets = JSON.parse(`
    {
        "data": [
          {
            "name": "Mercury",
            "el": -29.2,
            "az": 266.9,
            "dist": 1.382,
            "diam": 4879,
            "const": "Ophiuchus",
            "above": "09:31",
            "below": "16:57"
          },
          {
            "name": "Venus",
            "el": -46.3,
            "az": 295,
            "dist": 1.563,
            "diam": 12104,
            "const": "Pisces",
            "above": "07:18",
            "below": "15:09"
          },
          {
            "name": "Mars",
            "el": 48.7,
            "az": 198.9,
            "dist": 0.906,
            "diam": 6779,
            "const": "Capricornus",
            "above": "12:35",
            "below": "02:32"
          },
          {
            "name": "Jupiter",
            "el": -17.1,
            "az": 259.1,
            "dist": 5.998,
            "diam": 139820,
            "const": "Capricornus",
            "above": "10:03",
            "below": "18:24"
          },
          {
            "name": "Saturn",
            "el": -18.1,
            "az": 260,
            "dist": 10.904,
            "diam": 139820,
            "const": "Aries",
            "above": "09:59",
            "below": "18:18"
          },
          {
            "name": "Uranus",
            "el": 51.8,
            "az": 185.3,
            "dist": 19.334,
            "diam": 50724,
            "const": "Aquarius",
            "above": "13:02",
            "below": "03:21"
          },
          {
            "name": "Neptune",
            "el": 19.7,
            "az": 231.9,
            "dist": 30.299,
            "diam": 49244,
            "const": "Sagittarius",
            "above": "11:40",
            "below": "22:42"
          },
          {
            "name": "Pluto",
            "el": -24.6,
            "az": 264.1,
            "dist": 35.151,
            "diam": 2376,
            "const": null,
            "above": "09:43",
            "below": "17:32"
          },
          {
            "name": "Moon",
            "el": 9.6,
            "az": 69.7,
            "dist": 0.003,
            "diam": 3474,
            "const": "Cancer",
            "above": "19:04",
            "below": "10:41"
          },
          {
            "name": "Sun",
            "el": -33.2,
            "az": 274.2,
            "dist": 0.983,
            "diam": 1392700,
            "const": "Sagittarius",
            "above": "08:44",
            "below": "16:41"
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
        sendTargetButton.disabled = false;
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

// Check if the element's value is a float between the min and max
const checkNumericInput = (el) => {
    let min = parseFloat(el.min);
    let max = parseFloat(el.max);
    let val = parseFloat(el.value);
    if (val > max) { el.value = max }
    else if (val < min) { el.value = min }
    updateLocationUpdateButton();
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

// Send planet ID to ESP
const sendTarget = () => {
    //TODO Send target to ESP
}

fetchData();
init();
animate();