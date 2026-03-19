import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const container = document.getElementById('viewer-container');
const loaderIndicator = document.getElementById('loader-indicator');
const homeBtn = document.getElementById('home-btn');
const fitViewBtn = document.getElementById('fit-view-btn');
const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const viewcubeContainerParent = document.getElementById('view-controls');
const explodeBtn = document.getElementById('explode-btn');
const explodeSliderContainer = document.getElementById('explode-slider-container');
const explodeSlider = document.getElementById('explode-slider');

const INV_SQRT3 = 1 / Math.sqrt(3);

const appState = {
    render: { needsUpdate: true },
    camera: { isAnimating: false, targetPosition: new THREE.Vector3(), targetLookAt: new THREE.Vector3() },
    explode: { currentFactor: 0, targetFactor: 0, isExploded: false, isAnimating: false },
    viewcube: { isDragging: false },
    model: { currentObject: null, explodedMeshes: [] }
};

const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.90;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const environment = new RoomEnvironment();
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const envMap = pmremGenerator.fromScene(environment).texture;
scene.background = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--brand-light').trim());
scene.environment = envMap;
environment.dispose();
pmremGenerator.dispose();

const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xcccccc, 0.5);
scene.add(hemisphereLight);

const dirLightTopFront = new THREE.DirectionalLight(0xffffff, 0.6);
dirLightTopFront.position.set(-5, 10, 5);
dirLightTopFront.castShadow = true;
scene.add(dirLightTopFront);

const dirLightFrontRight = new THREE.DirectionalLight(0xffffff, 0.3);
dirLightFrontRight.position.set(5, 0, 5);
scene.add(dirLightFrontRight);

const dirLightBackUp = new THREE.DirectionalLight(0xffffff, 0.4);
dirLightBackUp.position.set(0, 10, -10);
scene.add(dirLightBackUp);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.addEventListener('change', () => { appState.render.needsUpdate = true; });

const viewcubeContainer = document.getElementById('viewcube-container');
const viewcubeRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
viewcubeContainerParent.insertBefore(viewcubeContainer, viewcubeContainerParent.firstChild);
viewcubeContainer.appendChild(viewcubeRenderer.domElement);

const viewcubeScene = new THREE.Scene();
const viewcubeCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
const viewcubeRaycaster = new THREE.Raycaster();
const viewcube = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), createFaceMaterials());
viewcubeScene.add(viewcube);

function createTextCanvas(text) {
    const canvas = document.createElement('canvas'); const context = canvas.getContext('2d');
    canvas.width = 128; canvas.height = 128;
    context.fillStyle = 'rgba(241, 245, 249, 0.9)'; context.fillRect(0, 0, 128, 128);
    context.strokeStyle = 'rgba(0, 0, 0, 0.1)'; context.lineWidth = 2; context.strokeRect(1, 1, 126, 126);
    context.font = "700 20px Poppins"; context.fillStyle = "#1E293B";
    context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(text, 64, 64);
    return canvas;
}

function createFaceMaterials() {
    return [
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(createTextCanvas('DERECHA')) }),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(createTextCanvas('IZQUIERDA')) }),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(createTextCanvas('SUPERIOR')) }),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(createTextCanvas('INFERIOR')) }),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(createTextCanvas('FRONTAL')) }),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(createTextCanvas('POSTERIOR')) })
    ];
}

const previousMousePosition = { x: 0, y: 0 };
const dragStart = { x: 0, y: 0 };

viewcubeRenderer.domElement.addEventListener('mousedown', (e) => { appState.viewcube.isDragging = true; dragStart.x = e.clientX; dragStart.y = e.clientY; previousMousePosition.x = e.clientX; previousMousePosition.y = e.clientY; });
viewcubeRenderer.domElement.addEventListener('mousemove', (e) => {
    if (!appState.viewcube.isDragging) return;
    const deltaX = e.clientX - previousMousePosition.x, deltaY = e.clientY - previousMousePosition.y;
    const factor = 2 * Math.PI / container.clientHeight, offset = camera.position.clone().sub(controls.target);
    const quatAzimuthal = new THREE.Quaternion().setFromAxisAngle(camera.up, -deltaX * factor); offset.applyQuaternion(quatAzimuthal);
    const right = new THREE.Vector3().crossVectors(camera.up, offset).normalize();
    const quatPolar = new THREE.Quaternion().setFromAxisAngle(right, -deltaY * factor); offset.applyQuaternion(quatPolar);
    camera.position.copy(controls.target).add(offset);
    previousMousePosition.x = e.clientX; previousMousePosition.y = e.clientY;
});
viewcubeRenderer.domElement.addEventListener('mouseup', (e) => {
    const dragDistance = Math.sqrt(Math.pow(e.clientX - dragStart.x, 2) + Math.pow(e.clientY - dragStart.y, 2));
    if (dragDistance < 5) {
        const rect = viewcubeRenderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        viewcubeRaycaster.setFromCamera(mouse, viewcubeCamera);
        const intersects = viewcubeRaycaster.intersectObject(viewcube);
        if (intersects.length > 0) {
            const normal = intersects[0].face.normal.clone(), dist = camera.position.length();
            transitionToView(normal.multiplyScalar(dist), new THREE.Vector3(0, 0, 0));
        }
    }
    appState.viewcube.isDragging = false;
});
viewcubeRenderer.domElement.addEventListener('mouseleave', () => { appState.viewcube.isDragging = false; });

const ktx2Loader = new KTX2Loader().setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/basis/');
const dracoLoader = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');
const gltfLoader = new GLTFLoader().setKTX2Loader(ktx2Loader).setDRACOLoader(dracoLoader).setMeshoptDecoder(MeshoptDecoder);

// Libera geometrías, materiales y texturas de la GPU
function disposeObject(obj) {
    const textureKeys = [
        'map', 'normalMap', 'roughnessMap', 'metalnessMap',
        'aoMap', 'emissiveMap', 'bumpMap', 'displacementMap',
        'alphaMap', 'envMap', 'lightMap', 'specularMap'
    ];
    obj.traverse((child) => {
        if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat) => {
                if (!mat) return;
                textureKeys.forEach((key) => {
                    if (mat[key]) mat[key].dispose();
                });
                mat.dispose();
            });
        }
    });
}

// Cargar automáticamente el modelo 3D
function loadInitialModel() {
    setLoading(true);
    gltfLoader.load(
        './robot3d.glb',
        (gltf) => {
            loadModel(gltf.scene);
        },
        undefined,
        (error) => {
            console.error('Error al cargar robot3d.glb:', error);
            setLoading(false);
            alert('Error al cargar el modelo 3D. Verifica que el archivo robot3d.glb esté en la misma carpeta.');
        }
    );
}

function loadModel(model) {
    if (appState.model.currentObject) {
        disposeObject(appState.model.currentObject);
        scene.remove(appState.model.currentObject);
    }
    prepareExplode(model);
    frameArea(model, true);
    scene.add(model);
    appState.model.currentObject = model;
    appState.render.needsUpdate = true;
    setLoading(false);
}

function prepareExplode(model) {
    appState.model.explodedMeshes = [];
    model.traverse((child) => {
        if (child.isMesh) {
            appState.model.explodedMeshes.push(child);
            if (child.material) {
                child.material.metalness = 0.0;
                child.material.roughness = 0.45;
            }
        }
    });
    if (appState.model.explodedMeshes.length > 1) {
        const modelBox = new THREE.Box3().setFromObject(model);
        const modelCenter = modelBox.getCenter(new THREE.Vector3());
        appState.model.explodedMeshes.forEach(mesh => {
            mesh.userData.originalPosition = mesh.getWorldPosition(new THREE.Vector3());
            const meshCenter = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
            mesh.userData.explodeVector = meshCenter.sub(modelCenter);
        });
        explodeBtn.disabled = false;
    } else {
        explodeBtn.disabled = true;
        explodeSliderContainer.style.display = 'none';
        explodeSlider.value = 0;
    }
}

function updateExplosion(factor) {
    if (appState.model.explodedMeshes.length <= 1) return;
    appState.model.explodedMeshes.forEach(mesh => {
        const offset = mesh.userData.explodeVector.clone().multiplyScalar(factor);
        const newWorldPosition = mesh.userData.originalPosition.clone().add(offset);
        if (mesh.parent) mesh.parent.worldToLocal(newWorldPosition);
        mesh.position.copy(newWorldPosition);
    });
}

explodeBtn.addEventListener('click', () => {
    appState.explode.isExploded = !appState.explode.isExploded;
    explodeBtn.classList.toggle('active', appState.explode.isExploded);
    if (appState.explode.isExploded) {
        explodeSliderContainer.style.display = 'block';
        appState.explode.targetFactor = 2.0;
    } else {
        explodeSliderContainer.style.display = 'none';
        appState.explode.targetFactor = 0.0;
    }
    appState.explode.isAnimating = true;
    appState.render.needsUpdate = true;
});
explodeSlider.addEventListener('input', (e) => {
    appState.explode.isAnimating = false;
    let manualValue = e.target.value / 25.0;
    appState.explode.currentFactor = manualValue;
    appState.explode.targetFactor = manualValue;
    updateExplosion(appState.explode.currentFactor);
    appState.render.needsUpdate = true;
});

function frameArea(object, initialLoad = false) {
    updateExplosion(0);
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    object.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let dist = (Math.abs(maxDim / 2 / Math.tan(fov / 2))) * 1.5;
    if (initialLoad) {
        camera.position.set(dist * INV_SQRT3, dist * INV_SQRT3, dist * INV_SQRT3);
    } else {
        transitionToView(camera.position.clone().normalize().multiplyScalar(dist), new THREE.Vector3(0, 0, 0));
    }
    camera.far = Math.max(dist * 5, 5000);
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.update();
}

function setLoading(isLoading) {
    loaderIndicator.style.display = isLoading ? 'flex' : 'none';
}

function transitionToView(targetPos, targetLookAt) {
    appState.camera.targetPosition.copy(targetPos); appState.camera.targetLookAt.copy(targetLookAt);
    appState.camera.isAnimating = true;
}

function resizeAll() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);

    const viewcubeSize = viewcubeContainer.clientWidth;
    viewcubeCamera.aspect = 1;
    viewcubeCamera.updateProjectionMatrix();
    viewcubeRenderer.setSize(viewcubeSize, viewcubeSize);
    appState.render.needsUpdate = true;
}

homeBtn.addEventListener('click', () => { const dist = camera.position.length(); transitionToView(new THREE.Vector3(dist * INV_SQRT3, dist * INV_SQRT3, dist * INV_SQRT3), new THREE.Vector3(0, 0, 0)); appState.render.needsUpdate = true; });
fitViewBtn.addEventListener('click', () => { if (appState.model.currentObject) frameArea(appState.model.currentObject); appState.render.needsUpdate = true; });
zoomInBtn.addEventListener('click', () => { transitionToView(camera.position.clone().multiplyScalar(0.85), controls.target); appState.render.needsUpdate = true; });
zoomOutBtn.addEventListener('click', () => { transitionToView(camera.position.clone().multiplyScalar(1.15), controls.target); appState.render.needsUpdate = true; });

function animate() {
    requestAnimationFrame(animate);
    if (appState.camera.isAnimating) {
        camera.position.lerp(appState.camera.targetPosition, 0.1);
        controls.target.lerp(appState.camera.targetLookAt, 0.1);
        if (camera.position.distanceTo(appState.camera.targetPosition) < 0.05) {
            camera.position.copy(appState.camera.targetPosition); controls.target.copy(appState.camera.targetLookAt); appState.camera.isAnimating = false;
        }
    } else { controls.update(); }

    if (appState.explode.isAnimating) {
        appState.explode.currentFactor += (appState.explode.targetFactor - appState.explode.currentFactor) * 0.1;
        if (Math.abs(appState.explode.targetFactor - appState.explode.currentFactor) < 0.005) {
            appState.explode.currentFactor = appState.explode.targetFactor;
            appState.explode.isAnimating = false;
        }
        updateExplosion(appState.explode.currentFactor);
        explodeSlider.value = appState.explode.currentFactor * 25;
        appState.render.needsUpdate = true;
    }

    if (appState.render.needsUpdate || appState.camera.isAnimating || appState.explode.isAnimating || appState.viewcube.isDragging) {
        viewcubeCamera.position.copy(camera.position).sub(controls.target).setLength(5);
        viewcubeCamera.lookAt(viewcubeScene.position);
        renderer.render(scene, camera);
        viewcubeRenderer.render(viewcubeScene, viewcubeCamera);
        appState.render.needsUpdate = false;
    }
}

window.addEventListener('resize', debounce(resizeAll, 150));
resizeAll();

// Cargar el modelo inicial
loadInitialModel();
animate();

const fullscreenBtn = document.getElementById('fullscreen-btn');
const fullscreenIcon = document.getElementById('fullscreen-icon');
fullscreenBtn.addEventListener('click', () => { if (!document.fullscreenElement) container.requestFullscreen(); else document.exitFullscreen(); });
document.addEventListener('fullscreenchange', () => {
    fullscreenIcon.innerHTML = document.fullscreenElement ? `<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>` : `<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>`;
});
