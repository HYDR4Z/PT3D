// Dom elements
const cv = document.getElementById('cv');

// Global vars
let camera, controls, scene, renderer;
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
let cameraFixedPosition;

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
                color: (heightSegments / 2 == hs) ? '#fff' : color
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
        let mat = new THREE.MeshLambertMaterial({map: texture});
        let planet = new THREE.Mesh(geom, mat);
        planet.position.x = gridRadius * Math.cos(target.el) * Math.cos(target.az);
        planet.position.y = gridRadius * Math.cos(target.el) * Math.sin(target.az);
        planet.position.z = gridRadius * Math.sin(target.el);
        planet.name = target.name;
        planet.targetIndex = targets.indexOf(target);
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
                mat = new THREE.MeshStandardMaterial( { map: texture, side: THREE.DoubleSide, transparent: true } );
                let ring = new THREE.Mesh(geom, mat);
                ring.rotateX(27);
                planet.add(ring);
            });
        } else if (target.name == 'Sun') {
            const light = new THREE.PointLight('#d4caba', 1, 500, 0 );
            light.position.x = (gridRadius - 1) * Math.cos(target.el) * Math.cos(target.az);
            light.position.y = (gridRadius - 1) * Math.cos(target.el) * Math.sin(target.az);
            light.position.z = (gridRadius - 1) * Math.sin(target.el);
            scene.add(light);
        }
        planet.lookAt(0, 0, 0);
        planet.rotateY(target.az);
        scene.add(planet);
    });
}

// Linear interpolation function to smoothen actions
function lerp (start, end, amt){
    return (1-amt)*start+amt*end
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
}

// Update sizes on window resize
function onWindowResize() {
    canvasSize.width = window.innerWidth;
    canvasSize.height = window.innerHeight;

    camera.aspect = canvasSize.width / canvasSize.height;
    camera.updateProjectionMatrix();
    renderer.setSize( canvasSize.width, canvasSize.height );
}

// Register gridsphere click or target click
function onClick(e) {
    e.preventDefault();
    let clickCoords;
    rayCaster.setFromCamera(mouse, camera);
    let objects = rayCaster.intersectObjects(scene.children);
    objects.slice().reverse().forEach((obj) => {
        if (obj.object.name == 'clickSphere') {
            clickCoords = obj.point;
            selectTarget(null);
        } else if (obj.object.name != "") {
            selectTarget(obj.object.targetIndex);
        }
    });
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

// Loop
function animate() {
    requestAnimationFrame( animate );
    camera.zoom = lerp(camera.zoom, cameraZoom, (selectedTargetObject != null) ? 0.02 : 0.1);
    if (selectedTargetObject != null) {
        controls.enabled = false;
        camera.position.x = lerp(camera.position.x, selectedTargetObject.position.x / gridRadius * -1, 0.08);
        camera.position.y = lerp(camera.position.y, selectedTargetObject.position.y / gridRadius * -1, 0.08);
        camera.position.z = lerp(camera.position.z, selectedTargetObject.position.z / 20 * -1, 0.08);
    } else { controls.enabled = true }
    camera.updateProjectionMatrix();
    controls.update();
    render();
}

// Render scene
function render() {
    renderer.render( scene, camera );
}

// Setup
function init() {
    // Scene
    scene = new THREE.Scene();
    // Camera setup
    camera = new THREE.PerspectiveCamera(75, canvasSize.width / canvasSize.height, 0.1, 1000);
    camera.position.set(1, 0, 0);
    // Renderer setup
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setSize(canvasSize.width, canvasSize.height);
    cv.appendChild(renderer.domElement);
    // Visible grid sphere
    let gridSphere = createSphereOfQuadsWireframe(gridRadius, 36, 18, "#2e2e2e", true, true);
    gridSphere.name = 'gridSphere';
    scene.add(gridSphere);
    // Clickable inverted sphere (transparent hollow cube)
    let invertedSphere = createInvertedSphere(gridRadius, 36, 18)
    invertedSphere.name = 'clickSphere';
    scene.add(invertedSphere);
    // Create orientation text
    createOrientationText().forEach(el => {
        scene.add(el);
    });
    // Create targets
    targets.forEach(target => {
        create3DTarget(target);
    });
    // Skybox
    var urls = ['./assets/img/skybox/px.png', './assets/img/skybox/nx.png', './assets/img/skybox/py.png', './assets/img/skybox/ny.png', './assets/img/skybox/pz.png', './assets/img/skybox/nz.png'];
    var skybox = new THREE.CubeTextureLoader().load(urls);
    scene.background = skybox;
    // Global / AmbientLight
    const light = new THREE.AmbientLight('#d4caba');
    light.intensity = 0.2;
    scene.add(light);
    // Controls
    initializeControls();
    // Event listeners and handlers
    window.addEventListener('resize', onWindowResize, false);
    cv.addEventListener('wheel', onScroll, false);
    cv.addEventListener( 'pointerdown', pointerDown, false);
    cv.addEventListener( 'pointerup', pointerUp, false);
    //TODO Croshair
    // // cv.addEventListener('mousemove', function(e){updateCroshair(e)}, false);

    // scene.add(new THREE.AxesHelper( 5 ))

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