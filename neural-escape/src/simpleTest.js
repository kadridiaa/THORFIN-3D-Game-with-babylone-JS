const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

scene.clearColor = new BABYLON.Color4(0.62, 0.84, 1.0, 1);
scene.gravity = new BABYLON.Vector3(0, -0.35, 0);
scene.collisionsEnabled = true;

const camera = new BABYLON.ArcRotateCamera(
  "camera",
  -Math.PI / 2,
  1.05,
  20,
  new BABYLON.Vector3(0, 1.8, 0),
  scene
);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 8;
camera.upperRadiusLimit = 35;
camera.wheelDeltaPercentage = 0.01;

const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
hemi.intensity = 0.95;
hemi.diffuse = new BABYLON.Color3(0.95, 0.98, 1.0);
hemi.groundColor = new BABYLON.Color3(0.45, 0.58, 0.42);

const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.3, -1, 0.2), scene);
sun.position = new BABYLON.Vector3(20, 30, -20);
sun.intensity = 1.1;

const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 120, height: 120, subdivisions: 2 }, scene);
const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
groundMat.diffuseColor = new BABYLON.Color3(0.18, 0.62, 0.2);
groundMat.specularColor = BABYLON.Color3.Black();
ground.material = groundMat;
ground.receiveShadows = true;
ground.checkCollisions = true;

const border = BABYLON.MeshBuilder.CreateGround("border", { width: 124, height: 124 }, scene);
const borderMat = new BABYLON.StandardMaterial("borderMat", scene);
borderMat.diffuseColor = new BABYLON.Color3(0.1, 0.35, 0.12);
borderMat.alpha = 0.35;
border.material = borderMat;
border.position.y = -0.02;

const sky = BABYLON.MeshBuilder.CreateBox("sky", { size: 300 }, scene);
const skyMat = new BABYLON.StandardMaterial("skyMat", scene);
skyMat.backFaceCulling = false;
skyMat.disableLighting = true;
skyMat.diffuseColor = new BABYLON.Color3(0.62, 0.84, 1.0);
sky.material = skyMat;

const playerRoot = BABYLON.MeshBuilder.CreateBox("playerFallback", { size: 1 }, scene);
playerRoot.isVisible = false;
playerRoot.position = new BABYLON.Vector3(0, 0, 0);

const state = {
  model: null,
  group: null,
  moving: false,
  speed: 3.2
};

function normalizeModel(root) {
  root.position = new BABYLON.Vector3(0, 0, 0);
  root.scaling = new BABYLON.Vector3(1.05, 1.05, 1.05);
  root.rotation = new BABYLON.Vector3(0, Math.PI, 0);
}

function setActiveModel(modelName) {
  if (!state.model) {
    return;
  }

  state.model.setEnabled(true);
  if (modelName === "walk") {
    state.group?.start(true, 1.0, state.group.from, state.group.to, false);
  } else {
    state.group?.stop();
  }
}

async function loadPlayer() {
  try {
    const result = await BABYLON.SceneLoader.ImportMeshAsync("", "./assets/models/", "player_walk.glb", scene);
    const root = result.meshes[0] ?? null;
    if (!root) {
      throw new Error("No mesh root in player_walk.glb");
    }

    root.parent = playerRoot;
    normalizeModel(root);
    result.animationGroups?.forEach((group) => group.stop());

    state.model = root;
    state.group = result.animationGroups?.[0] ?? null;
    state.group?.start(true);
    playerRoot.isVisible = false;
  } catch (error) {
    console.error(error);
    const fallback = BABYLON.MeshBuilder.CreateCapsule("fallbackPlayer", { height: 2.1, radius: 0.45 }, scene);
    fallback.position = new BABYLON.Vector3(0, 1.1, 0);
    const mat = new BABYLON.StandardMaterial("fallbackMat", scene);
    mat.diffuseColor = new BABYLON.Color3(0.8, 0.45, 0.2);
    fallback.material = mat;
    state.model = fallback;
  }
}

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyZ" || event.code === "KeyW") {
    state.moving = true;
    if (state.group) {
      state.group.start(true, 1.0, state.group.from, state.group.to, false);
    }
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "KeyZ" || event.code === "KeyW") {
    state.moving = false;
    if (state.group) {
      state.group.stop();
    }
  }
});

loadPlayer();

scene.onBeforeRenderObservable.add(() => {
  if (state.model && state.moving) {
    state.model.position.z += (engine.getDeltaTime() / 1000) * state.speed;
    camera.setTarget(state.model.position.add(new BABYLON.Vector3(0, 1.2, 0)));
  }
});

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => engine.resize());
