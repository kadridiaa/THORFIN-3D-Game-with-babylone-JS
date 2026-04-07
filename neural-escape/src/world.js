import { MAP } from "./config.js";

export function createWorld(scene) {
  const worldSize = MAP.gridSize * MAP.cellSize;

  scene.clearColor = new BABYLON.Color4(0.01, 0.01, 0.03, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
  scene.fogDensity = MAP.fogDensity;
  scene.fogColor = new BABYLON.Color3(0.04, 0.04, 0.07);

  const hemi = new BABYLON.HemisphericLight(
    "moonLight",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  hemi.intensity = 0.08;

  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground",
    { width: worldSize, height: worldSize, subdivisions: MAP.gridSize },
    scene
  );
  const gMat = new BABYLON.StandardMaterial("groundMat", scene);
  gMat.diffuseColor = new BABYLON.Color3(0.12, 0.12, 0.14);
  gMat.specularColor = BABYLON.Color3.Black();
  ground.material = gMat;
  ground.checkCollisions = true;

  const sky = BABYLON.MeshBuilder.CreateBox("sky", { size: worldSize * 1.7 }, scene);
  const skyMat = new BABYLON.StandardMaterial("skyMat", scene);
  skyMat.backFaceCulling = false;
  skyMat.disableLighting = true;
  skyMat.diffuseColor = new BABYLON.Color3(0.01, 0.02, 0.06);
  sky.material = skyMat;

  const world = {
    worldSize,
    ground,
    houses: [],
    lockedHouses: [],
    trapHouses: [],
    bossBuilding: null,
    navGrid: createNavGrid(MAP.gridSize),
    zoneFromPosition(pos) {
      if (pos.z < -15) {
        return "zone1";
      }
      if (pos.z < 20) {
        return "zone2";
      }
      if (pos.z < 55) {
        return "zone3";
      }
      return "boss";
    }
  };

  spawnDecor(scene);
  createHouses(scene, world);
  createBossBuilding(scene, world);

  return world;
}

function createHouses(scene, world) {
  const entries = [
    { zone: "zone1", pos: new BABYLON.Vector3(-28, 3, -43), trap: false, locked: false },
    { zone: "zone1", pos: new BABYLON.Vector3(0, 3, -38), trap: true, locked: false },
    { zone: "zone1", pos: new BABYLON.Vector3(26, 3, -44), trap: false, locked: false },

    { zone: "zone2", pos: new BABYLON.Vector3(-28, 3, -4), trap: false, locked: true },
    { zone: "zone2", pos: new BABYLON.Vector3(0, 3, 0), trap: true, locked: false },
    { zone: "zone2", pos: new BABYLON.Vector3(28, 3, 5), trap: false, locked: false },

    { zone: "zone3", pos: new BABYLON.Vector3(-28, 3, 34), trap: false, locked: false },
    { zone: "zone3", pos: new BABYLON.Vector3(0, 3, 40), trap: true, locked: true },
    { zone: "zone3", pos: new BABYLON.Vector3(28, 3, 33), trap: false, locked: false }
  ];

  entries.forEach((entry, index) => {
    const house = BABYLON.MeshBuilder.CreateBox(
      `house_${index}`,
      { width: 10, depth: 10, height: 6 },
      scene
    );
    house.position = entry.pos.clone();
    house.checkCollisions = true;

    const mat = new BABYLON.StandardMaterial(`houseMat_${index}`, scene);
    mat.diffuseColor = new BABYLON.Color3(0.15 + Math.random() * 0.05, 0.15, 0.16);
    mat.specularColor = BABYLON.Color3.Black();
    house.material = mat;

    const door = BABYLON.MeshBuilder.CreateBox(
      `door_${index}`,
      { width: 1.8, depth: 0.2, height: 2.8 },
      scene
    );
    door.position = house.position.add(new BABYLON.Vector3(0, -1.5, -5.1));
    door.parent = house;
    door.metadata = { isDoor: true, isLocked: entry.locked, houseId: house.name };

    if (entry.locked) {
      const dMat = new BABYLON.StandardMaterial(`doorLockMat_${index}`, scene);
      dMat.diffuseColor = new BABYLON.Color3(0.32, 0.2, 0.08);
      dMat.emissiveColor = new BABYLON.Color3(0.2, 0.12, 0.0);
      door.material = dMat;
      world.lockedHouses.push({ house, door, zone: entry.zone, unlocked: false });
    }

    if (entry.trap) {
      const trapLight = new BABYLON.SpotLight(
        `trapHint_${index}`,
        door.absolutePosition.add(new BABYLON.Vector3(0, -2.5, 0.6)),
        new BABYLON.Vector3(0, -1, 0),
        Math.PI / 2,
        12,
        scene
      );
      trapLight.diffuse = new BABYLON.Color3(0.35, 0.04, 0.04);
      trapLight.intensity = 0.18;
      world.trapHouses.push({ house, zone: entry.zone, triggered: false });
    }

    house.metadata = {
      zone: entry.zone,
      trap: entry.trap,
      locked: entry.locked,
      hasQuiz: !entry.trap
    };

    world.houses.push({ house, door, ...entry });
  });
}

function createBossBuilding(scene, world) {
  const boss = BABYLON.MeshBuilder.CreateBox(
    "bossBuilding",
    { width: 18, depth: 16, height: 10 },
    scene
  );
  boss.position = new BABYLON.Vector3(0, 5, 70);

  const mat = new BABYLON.StandardMaterial("bossMat", scene);
  mat.diffuseColor = new BABYLON.Color3(0.2, 0.04, 0.04);
  mat.emissiveColor = new BABYLON.Color3(0.2, 0, 0);
  boss.material = mat;

  world.bossBuilding = boss;
}

function createNavGrid(size) {
  const data = [];
  for (let z = 0; z < size; z += 1) {
    const row = [];
    for (let x = 0; x < size; x += 1) {
      row.push(0);
    }
    data.push(row);
  }
  return data;
}

function spawnDecor(scene) {
  for (let i = 0; i < 25; i += 1) {
    const deadTree = BABYLON.MeshBuilder.CreateCylinder(
      `tree_${i}`,
      { diameterTop: 0.3, diameterBottom: 0.8, height: 4 + Math.random() * 4 },
      scene
    );
    deadTree.position = new BABYLON.Vector3(
      (Math.random() - 0.5) * 110,
      deadTree.scaling.y * 2,
      (Math.random() - 0.5) * 110
    );
    const mat = new BABYLON.StandardMaterial(`treeMat_${i}`, scene);
    mat.diffuseColor = new BABYLON.Color3(0.13, 0.1, 0.1);
    deadTree.material = mat;
  }
}
