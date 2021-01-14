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

// Check if the element's value is a float between the min and max
const checkNumericInput = (el) => {
    let min = parseFloat(el.min);
    let max = parseFloat(el.max);
    let val = parseFloat(el.value);
    if (val > max) { el.value = max }
    else if (val < min) { el.value = min }
    updateLocationUpdateButton();
}

// Check if BLE is available in the browser
const isWebBLEAvailable = () => {
    if (!navigator.bluetooth) {
        console.log('BLE not available');
        return false;
    } return true;
}