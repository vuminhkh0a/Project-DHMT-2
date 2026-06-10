import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; // Thêm GLTFLoader để tải file .glb
import GUI from 'lil-gui';

// --- 1. SETUP CƠ BẢN ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

// --- 2. CAMERA & PROJECTION ---
const aspect = window.innerWidth / window.innerHeight;
// Mở rộng camera để nhìn thấy toàn bộ hệ mặt trời
const perspectiveCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 3000); // Tăng far clipping plane lên 3000 để thấy skybox
perspectiveCamera.position.set(0, 60, 100);

const orthographicCamera = new THREE.OrthographicCamera(-80 * aspect, 80 * aspect, 80, -80, 0.1, 3000); // Tương tự
orthographicCamera.position.set(0, 60, 100);
orthographicCamera.lookAt(0, 0, 0);

let activeCamera = perspectiveCamera;

// --- 3. RENDERER & SHADOW MAPPING ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true; // Bật Shadow Mapping
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(perspectiveCamera, renderer.domElement);
const orthoControls = new OrbitControls(orthographicCamera, renderer.domElement);

// --- 4. TEXTURE MAPPING (Procedural Canvas) ---
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

// --- 4.5. SETUP SKYBOX ---
const gltfLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

// Tải texture
const skyboxTexture = textureLoader.load('skybox.png');
skyboxTexture.colorSpace = THREE.SRGBColorSpace;

// Tải model hình cầu
gltfLoader.load('skybox.glb', (gltf) => {
    const skybox = gltf.scene;
    
    // Scale to ra để bao trọn hệ mặt trời
    skybox.scale.set(1500, 1500, 1500); 

    skybox.traverse((child) => {
        if (child.isMesh) {
            // Dùng MeshBasicMaterial để skybox không bị tối khi thiếu đèn chiếu sáng
            child.material = new THREE.MeshBasicMaterial({
                map: skyboxTexture,
                side: THREE.BackSide, // Chỉ render mặt trong của hình cầu
                depthWrite: false     // Không ghi đè depth, giúp skybox luôn nằm dưới cùng
            });
        }
    });

    scene.add(skybox);
});

// Mảng lưu trữ để dễ dàng cập nhật thông qua GUI
const allMaterials = [];
const allMeshes = [];

// --- 5. MESH, MATERIALS & SHADING ---
// Mặt trời (Phát sáng, không nhận bóng)
const sunGeo = new THREE.SphereGeometry(5, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 }); 
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);
allMaterials.push(sunMat);

// Trái đất & Mặt trăng (Giữ nguyên cấu trúc gốc)
const earthOrbit = new THREE.Group();
scene.add(earthOrbit);

const earthGeo = new THREE.SphereGeometry(2, 32, 32);
const earthMat = new THREE.MeshStandardMaterial({ color: 0x2233ff, roughness: 0.5 });
const earth = new THREE.Mesh(earthGeo, earthMat);
earth.position.set(20, 0, 0);
earth.castShadow = true;
earth.receiveShadow = true;
earthOrbit.add(earth);

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

allMaterials.push(earthMat, moonMat);
allMeshes.push(earth, moon);

// Hàm Helper để tạo các hành tinh khác nhanh chóng
const additionalPlanets = [];
function createPlanet(size, distance, color, hasRing = false, rotSpeed, orbSpeed) {
    const orbit = new THREE.Group();
    scene.add(orbit);

    const geo = new THREE.SphereGeometry(size, 32, 32);
    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(distance, 0, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    orbit.add(mesh);

    allMaterials.push(mat);
    allMeshes.push(mesh);

    if (hasRing) {
        // Tạo vành đai cho Sao Thổ
        const ringGeo = new THREE.TorusGeometry(size * 1.5, size * 0.2, 16, 100);
        const ringMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2 - 0.2; // Nghiêng vành đai
        ringMesh.castShadow = true;
        ringMesh.receiveShadow = true;
        mesh.add(ringMesh);
        allMaterials.push(ringMat);
        allMeshes.push(ringMesh);
    }

    additionalPlanets.push({ mesh, orbit, rotSpeed, orbSpeed });
}

// Thêm các hành tinh còn lại (Kích thước, Khoảng cách, Màu sắc, Có vành đai không, Tốc độ xoay, Tốc độ quỹ đạo)
createPlanet(0.8, 10, 0xaaaaaa, false, 0.8, 1.2); // Mercury (Sao Thủy)
createPlanet(1.5, 15, 0xe3bb76, false, 0.6, 0.9); // Venus (Sao Kim)
// Trái đất ở vị trí 20
createPlanet(1.2, 26, 0xc1440e, false, 1.0, 0.4); // Mars (Sao Hỏa)
createPlanet(3.5, 38, 0xd8ca9d, false, 2.0, 0.2); // Jupiter (Sao Mộc)
createPlanet(3.0, 52, 0xead6b8, true,  1.8, 0.15); // Saturn (Sao Thổ)
createPlanet(2.2, 64, 0xd1e7e7, false, 1.5, 0.1); // Uranus (Sao Thiên Vương)
createPlanet(2.1, 76, 0x5b5ddf, false, 1.4, 0.08); // Neptune (Sao Hải Vương)

// --- 6. LIGHTING MODELS ---
const ambientLight = new THREE.AmbientLight(0x222222);
scene.add(ambientLight);

// Tăng tầm xa của PointLight để chiếu sáng tới các hành tinh xa
const pointLight = new THREE.PointLight(0xffffff, 1500, 300); 
pointLight.position.set(0, 0, 0);
pointLight.castShadow = true; // Mặt trời tạo bóng
pointLight.shadow.mapSize.width = 2048; // Tăng độ phân giải bóng cho không gian lớn
pointLight.shadow.mapSize.height = 2048;
scene.add(pointLight);

// --- 7. COORDINATE SYSTEMS ---
const axesHelper = new THREE.AxesHelper(15);
scene.add(axesHelper);

// --- 8. POST PROCESSING (Bloom Effect) ---
const renderScene = new RenderPass(scene, activeCamera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0;
bloomPass.strength = 1.5; // Cường độ phát sáng
bloomPass.radius = 0;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// --- 9. UI CONTROL (Bật/Tắt kiến thức) ---
const settings = {
    animation: true,
    coordinateSystem: true,
    wireframe: false,
    projection: 'Perspective',
    texture: false,
    lighting: true,
    shadows: true,
    postProcessing: true
};

const gui = new GUI({ title: 'CG Concepts Toggles' });
gui.add(settings, 'animation').name('Animation');
gui.add(settings, 'coordinateSystem').name('Coordinate System').onChange(v => axesHelper.visible = v);

gui.add(settings, 'wireframe').name('Mesh Wireframe').onChange(v => {
    // Cập nhật tất cả các vật liệu
    allMaterials.forEach(mat => mat.wireframe = v);
});

gui.add(settings, 'projection', ['Perspective', 'Orthographic']).name('Camera Projection').onChange(v => {
    activeCamera = v === 'Perspective' ? perspectiveCamera : orthographicCamera;
    renderScene.camera = activeCamera;
});

gui.add(settings, 'texture').name('Texture Mapping').onChange(v => {
    // Áp dụng texture cho tất cả trừ Mặt Trời
    allMaterials.forEach(mat => {
        if (mat !== sunMat) {
            mat.map = v ? textureMap : null;
            mat.needsUpdate = true;
        }
    });
});

gui.add(settings, 'lighting').name('Lighting Models').onChange(v => pointLight.visible = v);

gui.add(settings, 'shadows').name('Shadow Mapping').onChange(v => {
    renderer.shadowMap.enabled = v;
    // Cập nhật tất cả mesh
    allMeshes.forEach(mesh => {
        mesh.castShadow = v;
        mesh.receiveShadow = v;
    });
    scene.traverse(child => { if (child.material) child.material.needsUpdate = true; });
});

gui.add(settings, 'postProcessing').name('Post Processing (Bloom)');

// --- 10. ANIMATION LOOP ---
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

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (settings.animation) {
        // Transformation: Xoay quanh trục & Quỹ đạo của Trái đất/Mặt trăng
        sun.rotation.y += delta * 0.2;
        earth.rotation.y += delta * 1.0;
        moon.rotation.y += delta * 0.5;
        earthOrbit.rotation.y += delta * 0.5;
        moonOrbit.rotation.y += delta * 2.0;

        // Transformation: Các hành tinh còn lại
        additionalPlanets.forEach(p => {
            p.mesh.rotation.y += delta * p.rotSpeed;
            p.orbit.rotation.y += delta * p.orbSpeed;
        });
    }

    if (settings.projection === 'Perspective') controls.update();
    else orthoControls.update();

    // Render qua Post Processing hoặc trực tiếp
    if (settings.postProcessing) composer.render();
    else renderer.render(scene, activeCamera);
}

animate();