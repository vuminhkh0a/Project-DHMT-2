import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';
import GUI from 'lil-gui';

// 1. DOM Manipulation
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

const labelsContainer = document.createElement('div');
labelsContainer.style.position = 'absolute';
labelsContainer.style.top = '0';
labelsContainer.style.left = '0';
labelsContainer.style.width = '100%';
labelsContainer.style.height = '100%';
labelsContainer.style.pointerEvents = 'none';
labelsContainer.style.overflow = 'hidden';
document.body.appendChild(labelsContainer);

const localAxes = [];
const trackedObjects = [];

function addTrackedObject(mesh, name) {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.color = '#ffffff';
    el.style.fontFamily = 'monospace';
    el.style.fontSize = '11px';
    el.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    el.style.padding = '4px 6px';
    el.style.borderRadius = '4px';
    el.style.transform = 'translate(-50%, 0)';
    el.style.pointerEvents = 'none';
    el.style.textAlign = 'center';
    el.style.lineHeight = '1.3';
    labelsContainer.appendChild(el);
    trackedObjects.push({ mesh, element: el, name });
}

// 2. Perspective Projection
const aspect = window.innerWidth / window.innerHeight;
const perspectiveCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 3000); 
perspectiveCamera.position.set(0, 60, 100);

// 3. Orthographic Projection
const orthographicCamera = new THREE.OrthographicCamera(-80 * aspect, 80 * aspect, 80, -80, 0.1, 3000); 
orthographicCamera.position.set(0, 60, 100);
orthographicCamera.lookAt(0, 0, 0);

let activeCamera = perspectiveCamera;

// 4. Percentage-Closer Filtering (PCF) Soft Shadows
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true; 
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(perspectiveCamera, renderer.domElement);
const orthoControls = new OrbitControls(orthographicCamera, renderer.domElement);

// 5. Procedural Texture
function createCheckerTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const context = canvas.getContext('2d');
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            context.fillStyle = (i + j) % 2 === 0 ? '#ffffff' : '#888888';
            context.fillRect(i * 32, j * 32, 32, 32);
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}
const textureMap = createCheckerTexture();

// 6. Environment Mapping (Skybox)
const gltfLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

const skyboxTexture = textureLoader.load('skybox.png');
skyboxTexture.colorSpace = THREE.SRGBColorSpace;

const texSun = textureLoader.load('texture_sun.jpg');
texSun.colorSpace = THREE.SRGBColorSpace;

const texEarth = textureLoader.load('texture_earth.jpg');
texEarth.colorSpace = THREE.SRGBColorSpace;

const texMoon = textureLoader.load('texture_moon.jpg');
texMoon.colorSpace = THREE.SRGBColorSpace;

const texMercury = textureLoader.load('texture_mercury.jpg');
texMercury.colorSpace = THREE.SRGBColorSpace;

const texVenus = textureLoader.load('texture_venus.jpg');
texVenus.colorSpace = THREE.SRGBColorSpace;

const texMars = textureLoader.load('texture_mars.jpg');
texMars.colorSpace = THREE.SRGBColorSpace;

const texJupiter = textureLoader.load('texture_jupiter.jpg');
texJupiter.colorSpace = THREE.SRGBColorSpace;

const texSaturn = textureLoader.load('texture_saturn.jpg');
texSaturn.colorSpace = THREE.SRGBColorSpace;

const texSaturnRing = textureLoader.load('texture_saturn_ring.png');
texSaturnRing.colorSpace = THREE.SRGBColorSpace;
// Xoay texture của vành đai đi 90 độ (PI / 2) và đặt tâm xoay vào giữa
texSaturnRing.center.set(0.5, 0.5); 
texSaturnRing.rotation = Math.PI / 2;

const texUranus = textureLoader.load('texture_uranus.jpg');
texUranus.colorSpace = THREE.SRGBColorSpace;

const texNeptune = textureLoader.load('texture_neptune.jpg');
texNeptune.colorSpace = THREE.SRGBColorSpace;

gltfLoader.load('skybox.glb', (gltf) => {
    const skybox = gltf.scene;
    skybox.scale.set(1500, 1500, 1500); 
    skybox.traverse((child) => {
        if (child.isMesh) {
            child.material = new THREE.MeshBasicMaterial({
                map: skyboxTexture,
                side: THREE.BackSide, 
                depthWrite: false    
            });
        }
    });
    scene.add(skybox);
});

const allMeshes = [];

// 7. Primitives & Transforms
const sunGeo = new THREE.SphereGeometry(5, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 }); 
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

const sunAxes = new THREE.AxesHelper(8);
sun.add(sunAxes);
localAxes.push(sunAxes);
addTrackedObject(sun, 'Sun');

const earthOrbit = new THREE.Group();
scene.add(earthOrbit);

const earthGeo = new THREE.SphereGeometry(2, 32, 32);
const earthMat = new THREE.MeshStandardMaterial({ color: 0x2233ff, roughness: 0.5 });
const earth = new THREE.Mesh(earthGeo, earthMat);
earth.position.set(20, 0, 0);
earth.castShadow = true;
earth.receiveShadow = true;
earthOrbit.add(earth);

const earthAxes = new THREE.AxesHelper(4);
earth.add(earthAxes);
localAxes.push(earthAxes);
addTrackedObject(earth, 'Earth');

const moonOrbit = new THREE.Group();
moonOrbit.position.set(20, 0, 0);
earthOrbit.add(moonOrbit);

const moonGeo = new THREE.SphereGeometry(0.5, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });
const moon = new THREE.Mesh(moonGeo, moonMat);
moon.position.set(3.5, 0, 0);
moon.castShadow = true;
moon.receiveShadow = true;
moonOrbit.add(moon);

const moonAxes = new THREE.AxesHelper(1.5);
moon.add(moonAxes);
localAxes.push(moonAxes);
addTrackedObject(moon, 'Moon');

allMeshes.push(earth, moon);

const additionalPlanets = [];

function createPlanet(size, distance, color, hasRing = false, rotSpeed, orbSpeed, name, textureFile = null, ringTextureFile = null) {
    const orbit = new THREE.Group();
    scene.add(orbit);

    const geo = new THREE.SphereGeometry(size, 32, 32);
    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(distance, 0, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.userData.originalColor = color;
    mesh.userData.planetTexture = textureFile;

    orbit.add(mesh);

    const planetAxes = new THREE.AxesHelper(size * 2);
    mesh.add(planetAxes);
    localAxes.push(planetAxes);
    addTrackedObject(mesh, name);

    allMeshes.push(mesh);

    if (hasRing) {
        const ringGeo = new THREE.TorusGeometry(size * 1.5, size * 0.2, 2, 100);
        const ringMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5, transparent: true });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2 - 0.2; 
        ringMesh.castShadow = true;
        ringMesh.receiveShadow = true;

        ringMesh.userData.originalColor = color;
        ringMesh.userData.planetTexture = ringTextureFile; 

        mesh.add(ringMesh);
        allMeshes.push(ringMesh);
    }

    additionalPlanets.push({ mesh, orbit, rotSpeed, orbSpeed });
}

createPlanet(0.8, 10, 0xaaaaaa, false, 0.8, 1.2, 'Mercury', texMercury);  
createPlanet(1.5, 15, 0xe3bb76, false, 0.6, 0.9, 'Venus', texVenus);    
createPlanet(1.2, 26, 0xc1440e, false, 1.0, 0.4, 'Mars', texMars);      
createPlanet(3.5, 38, 0xd8ca9d, false, 2.0, 0.2, 'Jupiter', texJupiter);  
createPlanet(3.0, 52, 0xead6b8, true,  1.8, 0.15, 'Saturn', texSaturn, texSaturnRing);  
createPlanet(2.2, 64, 0xd1e7e7, false, 1.5, 0.1, 'Uranus', texUranus);   
createPlanet(2.1, 76, 0x5b5ddf, false, 1.4, 0.08, 'Neptune', texNeptune); 

// 8. Face Normals & Vector Normalization
const vertexHelpers = [];
const faceHelpers = [];

function createFaceNormalsHelper(mesh, size = 1.5, color = 0xff0000) {
    const geometry = mesh.geometry;
    const posAttr = geometry.attributes.position;
    const index = geometry.index;
    const linePos = [];
    
    const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
    const cb = new THREE.Vector3(), ab = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const center = new THREE.Vector3();

    // 9. Cross Product
    const processFace = (a, b, c) => {
        vA.fromBufferAttribute(posAttr, a);
        vB.fromBufferAttribute(posAttr, b);
        vC.fromBufferAttribute(posAttr, c);
        
        cb.subVectors(vC, vB);
        ab.subVectors(vA, vB);
        cb.cross(ab);
        normal.copy(cb).normalize();
        
        center.copy(vA).add(vB).add(vC).divideScalar(3);
        
        linePos.push(center.x, center.y, center.z);
        linePos.push(center.x + normal.x * size, center.y + normal.y * size, center.z + normal.z * size);
    };

    if (index) {
        for (let i = 0; i < index.count; i += 3) processFace(index.getX(i), index.getX(i + 1), index.getX(i + 2));
    } else {
        for (let i = 0; i < posAttr.count; i += 3) processFace(i, i + 1, i + 2);
    }
    
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: color });
    return new THREE.LineSegments(lineGeo, lineMat);
}

// 10. Vertex Normals
[sun, ...allMeshes].forEach(mesh => {
    const vnh = new VertexNormalsHelper(mesh, 1.5, 0x00ff00);
    vnh.visible = false;
    scene.add(vnh);
    vertexHelpers.push(vnh);

    const fnh = createFaceNormalsHelper(mesh, 1.5, 0xff0000);
    fnh.visible = false;
    mesh.add(fnh); 
    faceHelpers.push(fnh);
});

// 11. Ambient Light
const ambientLight = new THREE.AmbientLight(0x222222);
scene.add(ambientLight);

// 12. Point Light
const pointLight = new THREE.PointLight(0xffffff, 1500, 300); 
pointLight.position.set(0, 0, 0);
pointLight.castShadow = true; 
pointLight.shadow.mapSize.width = 2048; 
pointLight.shadow.mapSize.height = 2048;
scene.add(pointLight);

// 13. Directional Light
const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(100, 100, 100);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.left = -100;
directionalLight.shadow.camera.right = 100;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -100;
scene.add(directionalLight);
directionalLight.visible = false; 

// 14. Spot Light
const spotLight = new THREE.SpotLight(0xffffff, 5000, 300, Math.PI / 4, 0.5, 1);
spotLight.position.set(0, 100, 0);
spotLight.castShadow = true;
spotLight.shadow.mapSize.width = 2048;
spotLight.shadow.mapSize.height = 2048;
scene.add(spotLight);
spotLight.visible = false;

// 15. Local Coordinate System
const axesHelper = new THREE.AxesHelper(15);
scene.add(axesHelper);

// 16. Post-Processing (Bloom Effect)
const renderScene = new RenderPass(scene, activeCamera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0;
bloomPass.strength = 1.1; 
bloomPass.radius = 0;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// 17. GUI Setup
const settings = {
    animation: 1, 
    coordinateSystem: true,
    wireframe: false,
    projection: 'Perspective',
    texture: true,
    lighting: true,
    lightType: 'Point Light', 
    shading: 'Standard Shading', 
    showNormals: false, 
    normalType: 'Vertex Normal', 
    shadows: true,
    postProcessing: true,
    cameraTarget: 'Default',
    reflection: 'None',            
    illuminationModel: 'Phong'     
};

const gui = new GUI({ title: 'Menu' });

// 18. Shading Models
function updateShading(v) {
    allMeshes.forEach(mesh => {
        const oldMat = mesh.material;
        let newMat;
        
        const matParams = { color: oldMat.color, map: oldMat.map, wireframe: oldMat.wireframe, transparent: oldMat.transparent };

        if (v === 'None') newMat = new THREE.MeshBasicMaterial(matParams);
        else if (v === 'Standard Shading') newMat = new THREE.MeshStandardMaterial({ ...matParams, roughness: 0.6 });
        else if (v === 'Gouraud Shading') newMat = new THREE.MeshLambertMaterial(matParams);
        else if (v === 'Phong Shading') newMat = new THREE.MeshPhongMaterial({ ...matParams, flatShading: false });
        else if (v === 'Flat Shading') newMat = new THREE.MeshPhongMaterial({ ...matParams, flatShading: true });

        mesh.material = newMat;
        oldMat.dispose();
    });
}

function updateLighting() {
    if (settings.lighting) {
        pointLight.visible = (settings.lightType === 'Point Light');
        directionalLight.visible = (settings.lightType === 'Directional Light');
        spotLight.visible = (settings.lightType === 'Spot Light'); 
    } else {
        pointLight.visible = false;
        directionalLight.visible = false;
        spotLight.visible = false;
    }
}

function applyNormalMode() {
    if (!settings.showNormals) {
        vertexHelpers.forEach(h => h.visible = false);
        faceHelpers.forEach(h => h.visible = false);
        return;
    }

    if (settings.normalType === 'Vertex Normal') {
        vertexHelpers.forEach(h => h.visible = true);
        faceHelpers.forEach(h => h.visible = false);
        
        settings.shading = 'Phong Shading'; 
        settings.lightType = 'Point Light';
    } else {
        vertexHelpers.forEach(h => h.visible = false);
        faceHelpers.forEach(h => h.visible = true);
        
        settings.shading = 'Flat Shading'; 
        settings.lightType = 'Directional Light';
    }

    if (shadingController) shadingController.updateDisplay();
    if (lightTypeController) lightTypeController.updateDisplay();

    updateShading(settings.shading);
    updateLighting();
}

gui.add(settings, 'animation', 0, 3, 0.1).name('Animation speed');

gui.add(settings, 'coordinateSystem').name('Coordinate').onChange(v => {
    axesHelper.visible = v;
    localAxes.forEach(ax => ax.visible = v);
});

// 19. Shading Application
const shadingController = gui.add(settings, 'shading', ['None', 'Standard Shading', 'Flat Shading', 'Gouraud Shading', 'Phong Shading'])
    .name('Shading').onChange(updateShading);

gui.add(settings, 'wireframe').name('Mesh').onChange(v => {
    sun.material.wireframe = v;
    allMeshes.forEach(mesh => { mesh.material.wireframe = v; mesh.material.needsUpdate = true; });
});

function applyTextures(v) {
    sun.material.map = v ? texSun : null;
    sun.material.color.setHex(v ? 0xffffff : 0xffaa00); 
    sun.material.needsUpdate = true;

    allMeshes.forEach(mesh => {
        if (mesh === earth) {
            mesh.material.map = v ? texEarth : null;
            mesh.material.color.setHex(v ? 0xffffff : 0x2233ff); 
        } else if (mesh === moon) {
            mesh.material.map = v ? texMoon : null;
            mesh.material.color.setHex(v ? 0xffffff : 0x888888); 
        } else if (mesh.userData && mesh.userData.planetTexture) {
            mesh.material.map = v ? mesh.userData.planetTexture : null;
            mesh.material.color.setHex(v ? 0xffffff : mesh.userData.originalColor);
        } else {
            mesh.material.map = v ? textureMap : null;
            const defaultColor = mesh.userData && mesh.userData.originalColor ? mesh.userData.originalColor : mesh.material.color.getHex();
            mesh.material.color.setHex(v ? 0xffffff : defaultColor); 
        }
        mesh.material.needsUpdate = true;
    });
}

gui.add(settings, 'texture').name('Texture').onChange(applyTextures);
applyTextures(settings.texture);

gui.add(settings, 'projection', ['Perspective', 'Orthographic']).name('Camera projection').onChange(v => {
    activeCamera = v === 'Perspective' ? perspectiveCamera : orthographicCamera;
    renderScene.camera = activeCamera;
});

const folderNormal = gui.addFolder('Normals Vectors');
folderNormal.add(settings, 'showNormals').name('Show vectors').onChange(applyNormalMode);
folderNormal.add(settings, 'normalType', ['Vertex Normal', 'Face Normal']).name('Normal type').onChange(applyNormalMode);

const folderLighting = gui.addFolder('Lighting Models');
folderLighting.add(settings, 'lighting').name('Enable Lighting').onChange(updateLighting);

const lightTypeController = folderLighting.add(settings, 'lightType', ['Point Light', 'Directional Light', 'Spot Light']).name('Light source').onChange(updateLighting);

// 20. Reflection Models
folderLighting.add(settings, 'reflection', ['None', 'Mirror Like', 'Diffuse', 'Ambient']).name('Reflection').onChange(v => {
    allMeshes.forEach(mesh => {
        if (!mesh.material) return;
        if (v === 'Mirror Like') {
            mesh.material.roughness = 0.0;
            mesh.material.metalness = 1.0;
        } else if (v === 'Diffuse') {
            mesh.material.roughness = 0.9;
            mesh.material.metalness = 0.1;
        } else if (v === 'Ambient') {
            mesh.material.roughness = 0.5;
            mesh.material.metalness = 0.0;
        } else { 
            mesh.material.roughness = 0.6;
            mesh.material.metalness = 0.0;
        }
        mesh.material.needsUpdate = true;
    });
});

// 21. Illumination Models
folderLighting.add(settings, 'illuminationModel', ['None', 'Phong', 'Blinn-Phong', 'Cook-Torrance', 'Oren-Nayar']).name('Illumination model').onChange(v => {
    allMeshes.forEach(mesh => {
        const oldMat = mesh.material;
        let newMat;
        const matParams = { color: oldMat.color, map: oldMat.map, wireframe: oldMat.wireframe, transparent: oldMat.transparent };

        if (v === 'None') {
            newMat = new THREE.MeshBasicMaterial(matParams);
        } else if (v === 'Phong' || v === 'Blinn-Phong') {
            newMat = new THREE.MeshPhongMaterial({ ...matParams, flatShading: false });
        } else if (v === 'Cook-Torrance') {
            newMat = new THREE.MeshStandardMaterial({ ...matParams, roughness: 0.2, metalness: 0.8 });
        } else if (v === 'Oren-Nayar') {
            newMat = new THREE.MeshStandardMaterial({ ...matParams, roughness: 1.0, metalness: 0.0 });
        }

        if (newMat) {
            mesh.material = newMat;
            oldMat.dispose();
        }
    });
});

gui.add(settings, 'shadows').name('Shadow').onChange(v => {
    renderer.shadowMap.enabled = v;
    allMeshes.forEach(mesh => { mesh.castShadow = v; mesh.receiveShadow = v; });
    directionalLight.castShadow = v;
    pointLight.castShadow = v;
    spotLight.castShadow = v; 
    scene.traverse(child => { if (child.material) child.material.needsUpdate = true; });
});

gui.add(settings, 'postProcessing').name('Bloom post processing');

gui.add(settings, 'cameraTarget', ['Default', 'Sun', 'Mercury', 'Venus', 'Earth', 'Moon', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'])
   .name('Camera focus target')
   .onChange(v => {
       if (v === 'Default') {
           controls.target.set(0, 0, 0);
           orthoControls.target.set(0, 0, 0);
       }
   });

// 22. Animation Loop & Delta Time
window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    perspectiveCamera.aspect = aspect;
    perspectiveCamera.updateProjectionMatrix();
    orthographicCamera.left = -80 * aspect;
    orthographicCamera.right = 80 * aspect;
    orthographicCamera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
const tempV = new THREE.Vector3();
const targetV = new THREE.Vector3(); 

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    sun.rotation.y += delta * 0.2 * settings.animation;
    earth.rotation.y += delta * 1.0 * settings.animation;
    moon.rotation.y += delta * 0.5 * settings.animation;
    earthOrbit.rotation.y += delta * 0.5 * settings.animation;
    moonOrbit.rotation.y += delta * 2.0 * settings.animation;

    additionalPlanets.forEach(p => {
        p.mesh.rotation.y += delta * p.rotSpeed * settings.animation;
        p.orbit.rotation.y += delta * p.orbSpeed * settings.animation;
    });

    if (settings.showNormals && settings.normalType === 'Vertex Normal') {
        vertexHelpers.forEach(h => h.update());
    }

    // 23. Screen Coordinates Projection
    trackedObjects.forEach(obj => {
        if (!settings.coordinateSystem) {
            obj.element.style.display = 'none';
            return;
        }

        obj.mesh.getWorldPosition(tempV);
        obj.element.innerHTML = `<strong>${obj.name}</strong><br>X: ${tempV.x.toFixed(1)}<br>Y: ${tempV.y.toFixed(1)}<br>Z: ${tempV.z.toFixed(1)}`;
        tempV.project(activeCamera);

        if (tempV.z > 1) {
            obj.element.style.display = 'none';
        } else {
            obj.element.style.display = 'block';
            const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
            const y = (tempV.y * -0.5 + 0.5) * window.innerHeight;
            obj.element.style.left = `${x}px`;
            obj.element.style.top = `${y + (obj.name === 'Sun' ? 35 : 20)}px`; 
        }
    });

    if (settings.cameraTarget !== 'Default') {
        const targetObj = trackedObjects.find(obj => obj.name === settings.cameraTarget);
        if (targetObj) {
            targetObj.mesh.getWorldPosition(targetV);
            controls.target.copy(targetV);
            orthoControls.target.copy(targetV);
        }
    }

    if (settings.projection === 'Perspective') controls.update();
    else orthoControls.update();

    if (settings.postProcessing) composer.render();
    else renderer.render(scene, activeCamera);
}

animate();