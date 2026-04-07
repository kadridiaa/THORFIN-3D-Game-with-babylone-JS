const canvas = document.getElementById("renderCanvas");
const statusEl = document.getElementById("status");

const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

scene.clearColor = new BABYLON.Color4(0.03, 0.04, 0.07, 1);

const camera = new BABYLON.ArcRotateCamera(
  "cam",
  -Math.PI / 2,
  1.08,
  34,
  new BABYLON.Vector3(0, 2, 0),
  scene
);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 14;
camera.upperRadiusLimit = 80;

const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
hemi.intensity = 0.6;

const dir = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(-0.4, -1, 0.2), scene);
dir.position = new BABYLON.Vector3(12, 20, -10);
dir.intensity = 0.85;

const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 90, height: 90 }, scene);
const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
groundMat.diffuseColor = new BABYLON.Color3(0.12, 0.15, 0.2);
groundMat.specularColor = BABYLON.Color3.Black();
ground.material = groundMat;

const axisSize = 4;
const xAxis = BABYLON.MeshBuilder.CreateLines("xAxis", {
  points: [new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(axisSize, 0, 0)]
});
xAxis.color = new BABYLON.Color3(1, 0.2, 0.2);

const yAxis = BABYLON.MeshBuilder.CreateLines("yAxis", {
  points: [new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, axisSize, 0)]
});
yAxis.color = new BABYLON.Color3(0.2, 1, 0.2);

const zAxis = BABYLON.MeshBuilder.CreateLines("zAxis", {
  points: [new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, 0, axisSize)]
});
zAxis.color = new BABYLON.Color3(0.2, 0.6, 1);

const slots = [
  {
    label: "player_run.glb",
    fileCandidates: ["player_run.glb", "run.glb"],
    position: new BABYLON.Vector3(-16, 0, 0),
    color: new BABYLON.Color3(0.25, 0.75, 1.0)
  },
  {
    label: "player_boxing.glb",
    fileCandidates: ["player_boxing.glb", "boxing.glb"],
    position: new BABYLON.Vector3(-8, 0, 0),
    color: new BABYLON.Color3(1.0, 0.35, 0.35)
  },
  {
    label: "player_walk.glb",
    fileCandidates: ["player_walk.glb", "walk.glb"],
    position: new BABYLON.Vector3(0, 0, 0),
    color: new BABYLON.Color3(0.35, 1.0, 0.55)
  },
  {
    label: "player_talk.glb",
    fileCandidates: ["player_talk.glb", "player_talking.glb", "talk.glb", "talking.glb"],
    position: new BABYLON.Vector3(8, 0, 0),
    color: new BABYLON.Color3(0.85, 0.9, 0.35)
  },
  {
    label: "player_death.glb",
    fileCandidates: ["player_death.glb", "death.glb"],
    position: new BABYLON.Vector3(16, 0, 0),
    color: new BABYLON.Color3(1.0, 0.45, 0.7)
  },
];

const loadedSlots = [];

function addLabel(text, position, color) {
  const plane = BABYLON.MeshBuilder.CreatePlane(`label_${text}`, { size: 4.2 }, scene);
  plane.position = position.add(new BABYLON.Vector3(0, 5.2, 0));

  const texture = new BABYLON.DynamicTexture(`dt_${text}`, { width: 1024, height: 256 }, scene, true);
  texture.drawText(text, 20, 150, "bold 64px Segoe UI", "white", "transparent", true);

  const material = new BABYLON.StandardMaterial(`labelMat_${text}`, scene);
  material.diffuseTexture = texture;
  material.opacityTexture = texture;
  material.emissiveColor = color;
  plane.material = material;
}

function normalizeRoot(root) {
  root.position.y = 0;
  root.scaling = new BABYLON.Vector3(1.2, 1.2, 1.2);
  root.rotation = new BABYLON.Vector3(0, Math.PI, 0);
}

async function importFirstAvailableModel(fileCandidates) {
  let lastError = null;

  for (const file of fileCandidates) {
    try {
      const result = await BABYLON.SceneLoader.ImportMeshAsync("", "./assets/models/", file, scene);
      result._loadedFileName = file;
      return result;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Aucun modele chargeable.");
}

async function loadSlot(slot) {
  const result = await importFirstAvailableModel(slot.fileCandidates);
  const root = result.meshes[0] ?? null;

  if (!root) {
    throw new Error(`Aucune racine trouvee pour ${slot.label}`);
  }

  normalizeRoot(root);
  root.position.copyFrom(slot.position);

  result.meshes.forEach((mesh) => {
    if (mesh && mesh !== root) {
      mesh.isPickable = false;
    }
  });

  result.animationGroups?.forEach((group) => {
    if (group.targetedAnimations?.length || group.animatables?.length) {
      group.reset();
      group.start(true);
    }
  });

  addLabel(slot.label, slot.position, slot.color);
  loadedSlots.push({ slot, result });
}

async function bootComparisonScene() {
  try {
    await Promise.all(slots.map((slot) => loadSlot(slot)));
    statusEl.innerHTML = [
      '<span class="ok">OK</span> 5 personnages charges',
      'Objectif: comparer run / boxing / walk / talk / death en meme temps',
      'Regarde si chaque fichier correspond a une animation differente'
    ].join("<br>");
  } catch (error) {
    console.error(error);
    statusEl.innerHTML = '<span class="ko">KO</span> Erreur de chargement des 5 models';
  }
}

bootComparisonScene();

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => engine.resize());
