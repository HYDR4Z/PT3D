const connectButton = document.getElementById('connectButton');
const sendTargetButton = document.getElementById('sendTargetButton');
const statusSpan = document.getElementById('statusSpan');

let serviceUUID = '06cd0a01-f2af-4739-83ac-2be012508cd6';
let bleCharacteristicTX = '4a59aa02-2178-427b-926a-ff86cfb87571';
let bleCharacteristicRX = '068e8403-583a-41f2-882f-8b0a218ab77b';
let notificationGATTCharacteristic;
let writeGATTCharacteristic;
let bleConnected = false;
let textDecoder = new TextDecoder();
let textEncoder = new TextEncoder();

// Update the status span
const updateStatus = (e) => {
    let value = textDecoder.decode(e.target.value);
    statusSpan.innerHTML = value;
    if (value == 'Moving') {
        statusSpan.className = 'warning';
    } else if (value == 'Ready' || value == 'Tracking') {
        statusSpan.className = 'success';
    }
}

// Update the status span and re-able the connect button
const onDisconnected = () => {
    bleConnected = false;
    connectButton.disabled = bleConnected;
    sendTargetButton.disabled = true;
    statusSpan.innerHTML = 'Disconnected';
    statusSpan.className = 'error';
}

// Send planet ID to ESP
const sendTarget = () => {
    let value = textEncoder.encode(selectedTargetIndex);
    writeGATTCharacteristic.writeValue(value)
    .catch(error => {
        console.log(error);
    });
}

// Connect bluetooth device (ESP)
const connectESP = () => {
    if (navigator.bluetooth) {
        let options = {
            optionalServices: [serviceUUID],
            filters: [
                { name: 'PlanetTracker' },
            ]
        }
    
        navigator.bluetooth.requestDevice(options)
        .then(device => {
            bleDevice = device;
            device.addEventListener('gattserverdisconnected', onDisconnected);
            return device.gatt.connect();
        })
        .then(server => {
            return server.getPrimaryService(serviceUUID);
        })
        .then(service => {
            service.getCharacteristic(bleCharacteristicTX)
            .then(result => writeGATTCharacteristic = result);
            return service.getCharacteristic(bleCharacteristicRX);
        })
        .then(characteristic => {
            bleConnected = true;
            notificationGATTCharacteristic = characteristic;
            connectButton.disabled = bleConnected;
            sendTargetButton.disabled = targetIndex != null;
            statusSpan.innerHTML = 'Ready';
            statusSpan.className = 'success';
            return notificationGATTCharacteristic.startNotifications().then(_ => {
                notificationGATTCharacteristic.addEventListener('characteristicvaluechanged', updateStatus);
            });
        })
        .catch(error => {
            console.log(error);
        });
    }
}