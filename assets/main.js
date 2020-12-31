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

// Fetch data from api
const fetchData = () => {
    // http://api.hydr4z.nl/?key=BhEx0WJP5Y75qwK%5EE1i8
    targets = JSON.parse(`
    {
        "data": [
            {
                "name": "Mercury",
                "el": -60.4,
                "az": 326.1,
                "dist": 1.434,
                "diam": 4879,
                "const": "Ophiuchus",
                "above": "09:12",
                "below": "16:25"
            },
            {
                "name": "Venus",
                "el": -59,
                "az": 16.7,
                "dist": 1.534,
                "diam": 12104,
                "const": "Pisces",
                "above": "06:57",
                "below": "15:07"
            },
            {
                "name": "Mars",
                "el": 28.1,
                "az": 249.3,
                "dist": 0.836,
                "diam": 6779,
                "const": "Capricornus",
                "above": "13:02",
                "below": "02:44"
            },
            {
                "name": "Jupiter",
                "el": -43.8,
                "az": 295.1,
                "dist": 5.949,
                "diam": 139820,
                "const": "Capricornus",
                "above": "10:29",
                "below": "18:46"
            },
            {
                "name": "Saturn",
                "el": -44,
                "az": 295.6,
                "dist": 10.852,
                "diam": 139820,
                "const": "Aries",
                "above": "10:27",
                "below": "18:44"
            },
            {
                "name": "Uranus",
                "el": 37.8,
                "az": 239.8,
                "dist": 19.216,
                "diam": 50724,
                "const": "Aquarius",
                "above": "13:34",
                "below": "03:53"
            },
            {
                "name": "Neptune",
                "el": -4.2,
                "az": 266.1,
                "dist": 30.17,
                "diam": 49244,
                "const": "Sagittarius",
                "above": "12:12",
                "below": "23:12"
            },
            {
                "name": "Pluto",
                "el": -49.6,
                "az": 301.5,
                "dist": 35.107,
                "diam": 2376,
                "const": "Sagittarius",
                "above": "10:13",
                "below": "18:02"
            },
            {
                "name": "Moon",
                "el": 34.4,
                "az": 237.2,
                "dist": 0.003,
                "diam": 3474,
                "const": "Cetus",
                "above": "13:45",
                "below": "02:36"
            },
            {
                "name": "Sun",
                "el": -59.7,
                "az": 332,
                "dist": 0.983,
                "diam": 1392700,
                "const": "Sagittarius",
                "above": "08:43",
                "below": "16:34"
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