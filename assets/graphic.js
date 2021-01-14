// Dom elements
const cv = document.getElementById('cv');
// Global vars
let camera, controls, scene, renderer, composer;
let canvasSize = {
    width: window.innerWidth,
    height: window.innerHeight,
}
let cameraZoom = 1;
let cameraMaxZoom = 4;
let gridRadius = 20;
let mouse = {};
let rayCaster = new THREE.Raycaster();
let cameraFixed = false;

// Create a sphere with square faces, Thanks to https://stackoverflow.com/a/44289391
function createSphereOfQuadsWireframe(radius, widthSegments, heightSegments, color, showWidthSegments, showHeightSegments) {
    var sphereObj = new THREE.Group();

    if (showWidthSegments) {
        // width segments
        var arcGeom = createArc(radius, heightSegments, false); // as the amount of width segments may be odd, it's better to use half-circles, that's why the third parameter is `false`
        var widthSector = Math.PI * 2 / widthSegments;
        for (var ws = 0; ws < widthSegments; ws++) {
            var arcGeomTmp = arcGeom.clone();
            arcGeomTmp.rotateY(widthSector * ws);
            var arcLine = new THREE.Line(arcGeomTmp, new THREE.LineBasicMaterial({
                color: color,
            }));
            sphereObj.add(arcLine);
        }
    }

    if (showHeightSegments) {
        //height segments
        var heightSector = Math.PI / heightSegments;
        for (var hs = 1; hs < heightSegments; hs++) {
            var hRadius = Math.sin(hs * heightSector) * radius;
            var height = Math.cos(hs * heightSector) * radius;
            var arcHeightGeom = createArc(hRadius, widthSegments, true);
            arcHeightGeom.rotateX(Math.PI / 2);
            arcHeightGeom.translate(0, height, 0);
            var arcHeightLine = new THREE.Line(arcHeightGeom, new THREE.LineBasicMaterial({
                color: (heightSegments / 2 == hs) ? '#b5b5b5' : color
            }));
            sphereObj.add(arcHeightLine);
        }
    }
    return sphereObj;
}

// Create a line (mostly used for the grid sphere)
function createArc(radius, segments, full) {
    var geom = new THREE.CircleGeometry(radius, segments, Math.PI / 2, full ? Math.PI * 2 : Math.PI);
    geom.vertices.shift();
    if (full) geom.vertices.push(geom.vertices[0].clone());
    return geom;
}

// Create a cube with a hollow section based on the radius in the parameters
function createInvertedSphere(r, h, v) {
    const sphere = new THREE.SphereGeometry(r, h, v);
    const cube = new THREE.BoxGeometry(r*3, r*3, r*3);
    var bsp_sphere = new ThreeBSP(cube);
    var bsp_cube = new ThreeBSP(sphere);
    var bsp_CubesubSphere = bsp_sphere.subtract(bsp_cube);
    var obj = bsp_CubesubSphere.toMesh();
    obj.material = new THREE.MeshLambertMaterial({opacity: 0.0, transparent: true});
    obj.opacity = 0.0
    
    return obj;
}

// Create the n, w, s, e and ne, se, sw, nw indicators
function createOrientationText() {
    let textArray = [];

    // Text
    let N = new THREE.TextSprite({color: '#7649fe', fontFamily: '"Times New Roman", Times, serif' });
    let E = new THREE.TextSprite({color: '#7649fe', fontFamily: '"Times New Roman", Times, serif' });
    let S = new THREE.TextSprite({color: '#7649fe', fontFamily: '"Times New Roman", Times, serif' });
    let W = new THREE.TextSprite({color: '#7649fe', fontFamily: '"Times New Roman", Times, serif' });
    let NE = new THREE.TextSprite({color: '#e4e4e4', fontFamily: '"Times New Roman", Times, serif' });
    let NW = new THREE.TextSprite({color: '#e4e4e4', fontFamily: '"Times New Roman", Times, serif' });
    let SE = new THREE.TextSprite({color: '#e4e4e4', fontFamily: '"Times New Roman", Times, serif' });
    let SW = new THREE.TextSprite({color: '#e4e4e4', fontFamily: '"Times New Roman", Times, serif' });
    // Font size for primary orientation indicators
    N.fontSize = E.fontSize = S.fontSize = W.fontSize = 1.5;
    // Font size for secondary orientation indicators
    NE.fontSize = NW.fontSize = SE.fontSize = SW.fontSize = .75;
    N.position.y = E.position.y = S.position.y = W.position.y = NE.position.y = NW.position.y = SE.position.y = SW.position.y = .8;

    N.position.x = -gridRadius - .25;
    N.text = 'N';

    S.position.x = gridRadius - .25;
    S.text = 'S';

    E.position.z = -gridRadius - .25;
    E.text = 'E';

    W.position.z = gridRadius - .25;
    W.text = 'W';

    NE.position.x = -gridRadius*Math.cos(45 * Math.PI / 180);
    NE.position.z = -gridRadius*Math.sin(45 * Math.PI / 180);
    NE.text = 'NE';

    NW.position.x = -gridRadius*Math.cos(45 * Math.PI / 180);
    NW.position.z = gridRadius*Math.sin(45 * Math.PI / 180);
    NW.text = 'NW';

    SE.position.x = gridRadius*Math.cos(45 * Math.PI / 180);
    SE.position.z = -gridRadius*Math.sin(45 * Math.PI / 180);
    SE.text = 'SE';

    SW.position.x = gridRadius*Math.cos(45 * Math.PI / 180);
    SW.position.z = gridRadius*Math.sin(45 * Math.PI / 180);
    SW.text = 'SW';

    textArray.push(N, E, S, W, NE, NW, SE, SW);

    return textArray;
}

// Create 3d object for target
function create3DTarget(target) {
    let loader = new THREE.TextureLoader();
    let planetSize = .5;
    loader.load(`./assets/img/targets/${target.name}.jpg`, (texture) => {
        let geom = new THREE.SphereGeometry(planetSize, 30, 30);
        let mat = (target.name == 'Sun') ? new THREE.MeshBasicMaterial({map: texture}) : new THREE.MeshLambertMaterial({map: texture});
        let planet = new THREE.Mesh(geom, mat);
        planet.name = target.name; planet.targetIndex = targets.indexOf(target);
        // Positioning
        let targetCartesian = Math.cartesian(target.az, target.el, gridRadius);
        planet.position.x = -targetCartesian.x;
        planet.position.z = -targetCartesian.z;
        planet.position.y = targetCartesian.y;
        planet.lookAt(0, 0, 0); planet.rotateY(Math.radians(target.az));
        // Target specific features
        if (planet.name == 'Saturn') {
            loader.load(`./assets/img/targets/SaturnRing.png`, (texture) => {
                geom = new THREE.RingGeometry(planetSize * 1.116086235489221, planetSize * 2.326699834162521, 84, 1);
                for(var yi = 0; yi < geom.parameters.phiSegments; yi++) {
                    var u0 = yi / geom.parameters.phiSegments;
                    var u1=(yi + 1) / geom.parameters.phiSegments;
                    for(var xi = 0; xi < geom.parameters.thetaSegments; xi++) {
                		var fi = 2 * (xi + geom.parameters.thetaSegments * yi);
                        var v0 = xi / geom.parameters.thetaSegments;
                        var v1 = (xi + 1) / geom.parameters.thetaSegments;
                        geom.faceVertexUvs[0][fi][0].x = u0; geom.faceVertexUvs[0][fi][0].y = v0;
                        geom.faceVertexUvs[0][fi][1].x = u1; geom.faceVertexUvs[0][fi][1].y = v0;
                        geom.faceVertexUvs[0][fi][2].x = u0; geom.faceVertexUvs[0][fi][2].y = v1;
                        fi++;
                        geom.faceVertexUvs[0][fi][0].x = u1; geom.faceVertexUvs[0][fi][0].y = v0;
                        geom.faceVertexUvs[0][fi][1].x = u1; geom.faceVertexUvs[0][fi][1].y = v1;
                        geom.faceVertexUvs[0][fi][2].x = u0; geom.faceVertexUvs[0][fi][2].y = v1;
                    }
                }
                mat = new THREE.MeshLambertMaterial( { map: texture, side: THREE.DoubleSide, transparent: true } );
                let ring = new THREE.Mesh(geom, mat);
                ring.rotateX(27);
                planet.add(ring);
            });
        } else if (target.name == 'Sun') {
            const light = new THREE.PointLight('#d4caba', 1, 500, 0 );
            let lightCartesian = Math.cartesian(target.az, target.el, gridRadius - .5);
            light.position.x = -lightCartesian.x;
            light.position.y = lightCartesian.y;
            light.position.z = -lightCartesian.z;
            scene.add(light);
        }
        // planet.add(new THREE.AxesHelper(5));
        scene.add(planet);
    });
}

// Initialise the orbitcontrols
function initializeControls() {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.1;
	controls.minDistance = 1;
    controls.maxDistance = .01;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.ROTATE,
        RIGHT: THREE.MOUSE.ROTATE
    }
    // Add event listeners for click, resize scroll etc.
    addEventListeners();
}

// Update sizes on window resize
function onWindowResize() {
    canvasSize.width = window.innerWidth;
    canvasSize.height = window.innerHeight;
    camera.aspect = canvasSize.width / canvasSize.height;
    camera.updateProjectionMatrix();
    composer.setSize(canvasSize.width, canvasSize.height );
}

// Register gridsphere click or target click
function onClick(e) {
    e.preventDefault();
    rayCaster.setFromCamera(mouse, camera);
    let objects = rayCaster.intersectObjects(scene.children);
    objects.slice().reverse().forEach((obj) => {
        if (obj.object.name == 'clickSphere') {
            selectTarget(null);
        } else if (obj.object.name != "") {
            selectTarget(obj.object.targetIndex);
        }
    });
}

// Register doubleclick inside canvas to add a target
function onDoubleClick(e) {
    rayCaster.setFromCamera({x: (e.clientX/window.innerWidth)*2-1, y: (e.clientY/window.innerHeight)*-2+1}, camera);
    let coords = rayCaster.intersectObjects(scene.children)[0].point;
    let sphericalCoords = Math.spherical(gridRadius, coords.y, coords.z);
    if (targets.length == 10) {
        targets.push({
            "name": "Custom target",
            "el": sphericalCoords.el,
            "az": sphericalCoords.az,
            "dist": "Unknown",
            "diam": "Unknown",
            "const": "Unknown",
            "above": "N/A",
            "below": "N/A"
        });
    } else {
        targets[10].el = sphericalCoords.el;
        targets[10].az = sphericalCoords.az;
    }
    console.log(targets[10])
}

// OnScroll event used for camera zoom
function onScroll(e) {
    if (cameraZoom >= 1 && cameraZoom <= cameraMaxZoom) {
        if (cameraZoom + -e.deltaY / 500 < 1 || cameraZoom + -e.deltaY / 500 > cameraMaxZoom) { return; }
        cameraZoom += -e.deltaY / 500;
    }
}

// Set cursor mousedown coordinates to compare and differentiate between drag click and normal click
function pointerDown(e) {
    mouse.x = (e.clientX/window.innerWidth)*2-1;
    mouse.y = (e.clientY/window.innerHeight)*-2+1;
}

// If the coordinates from pointerDown are the same : register a click
function pointerUp(e) {
    let newMouse = {x: (e.clientX/window.innerWidth)*2-1, y: (e.clientY/window.innerHeight)*-2+1};
    if (mouse.x == newMouse.x && mouse.y == newMouse.y) { onClick(e) }
}

// Setup the scene, camera, renderer and postprocessing
function generalSetup() {
    // Scene
    scene = new THREE.Scene();
    // Camera setup
    camera = new THREE.PerspectiveCamera(75, canvasSize.width / canvasSize.height, 0.1, 1000);
    camera.position.set(1, 0, 0);
    // Renderer setup
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(canvasSize.width, canvasSize.height);
    cv.appendChild(renderer.domElement);
    // Post processing setup
    composer = new POSTPROCESSING.EffectComposer(renderer);
    composer.addPass(new POSTPROCESSING.RenderPass(scene, camera));
    const effectPass = new POSTPROCESSING.EffectPass(camera, new POSTPROCESSING.BloomEffect());
    effectPass.renderToScreen = true;
    composer.addPass(effectPass);
}

// Add the gridsphere and clicksphere
function addSpheres() {
    // Visible grid sphere
    const gridSphere = createSphereOfQuadsWireframe(gridRadius, 36, 18, "#2e2e2e", true, true);
    gridSphere.name = 'gridSphere';
    scene.add(gridSphere);
    // Clickable inverted sphere (transparent hollow cube)
    const invertedSphere = createInvertedSphere(gridRadius, 36, 18)
    invertedSphere.name = 'clickSphere';
    scene.add(invertedSphere);
}

// Setup the skybox and lighting
function setupEnviroment() {
    // Skybox
    const urls = ['./assets/img/skybox/px.png', './assets/img/skybox/nx.png', './assets/img/skybox/py.png', './assets/img/skybox/ny.png', './assets/img/skybox/pz.png', './assets/img/skybox/nz.png'];
    const skybox = new THREE.CubeTextureLoader().load(urls);
    scene.background = skybox;
    // Global / AmbientLight
    const light = new THREE.AmbientLight('#d4caba');
    light.intensity = 0.2;
    scene.add(light);
}

// Add event listeners for click, move, scroll etc.
function addEventListeners() {
    // Event listeners and handlers
    window.addEventListener('resize', onWindowResize, false);
    cv.addEventListener('wheel', onScroll, false);
    cv.addEventListener('pointerdown', pointerDown, false);
    cv.addEventListener('pointerup', pointerUp, false);
    cv.addEventListener('dblclick', onDoubleClick, false);
}

// Loop
function animate() {
    requestAnimationFrame(animate);
    // Update the camera's zoom level if the zoom target value is not the current zoom
    if (camera.zoom != cameraZoom) { camera.zoom = lerp(camera.zoom, cameraZoom, (selectedTargetObject != null) ? 0.02 : 0.1) }
    // If a target is selected, point the camera at the target and disable controls
    if (selectedTargetObject != null) {
        controls.enabled = false;
        camera.position.x = lerp(camera.position.x, selectedTargetObject.position.x / gridRadius * -1, 0.08);
        camera.position.y = lerp(camera.position.y, selectedTargetObject.position.y / gridRadius * -1, 0.08);
        camera.position.z = lerp(camera.position.z, selectedTargetObject.position.z / 20 * -1, 0.08);
    } else { controls.enabled = true }
    camera.updateProjectionMatrix();
    controls.update();
    composer.render();
}

// Setup
function init() {
    // Setup the scene, camera, renderer and postprocessing
    generalSetup();
    // Add the grid sphere and clicksphere
    addSpheres();
    // Create orientation text
    createOrientationText().forEach(el => {
        scene.add(el);
    });
    // Create targets
    targets.forEach(target => {
        create3DTarget(target);
    });
    // Add skybox and lighting
    setupEnviroment();
    // Setup the controls
    initializeControls();
    
    //TODO Croshair
    // // cv.addEventListener('mousemove', function(e){updateCroshair(e)}, false);
    //TODO Croshair
    // // var hRadius = Math.sin(100 * (Math.PI / 40)) * gridRadius;
    // // var height = Math.cos(100 * (Math.PI / 40)) * gridRadius;
    // // var arcHeightGeom = createArc(hRadius, 36, true);
    // // arcHeightGeom.rotateX(Math.PI / 2);
    // // arcHeightGeom.translate(0, height, 0);
    // // var arcHeightLine = new THREE.Line(arcHeightGeom, new THREE.LineBasicMaterial({color: '#7649fe'}));
    // // arcHeightLine.name = 'horizLine';
    // // gridSphere.add(arcHeightLine);
}

//TODO Croshair
// function updateCroshair (e) {
//     rayCaster.setFromCamera({x: (e.clientX/window.innerWidth)*2-1, y: (e.clientY/window.innerHeight)*-2+1}, camera);
//     let coords = rayCaster.intersectObjects(scene.children)[0].point;
//     console.log(coords.x, coords.y, coords.z)

//     var hRadius = Math.sin((40 - (coords.y + 20)) * (Math.PI / 40)) * gridRadius;
//     var height = Math.cos((40 - (coords.y + 20)) * (Math.PI / 40)) * gridRadius;

//     var arcHeightGeom = createArc(hRadius, 36, true);
//     arcHeightGeom.rotateX(Math.PI / 2);
//     arcHeightGeom.translate(0, height, 0);

//     let mainLine = scene.getObjectByName('gridSphere').getObjectByName('horizLine');

//     mainLine.geometry = arcHeightGeom;

//     let cursorCoords = rayCaster.intersectObjects(scene.children)[0].point;
// }