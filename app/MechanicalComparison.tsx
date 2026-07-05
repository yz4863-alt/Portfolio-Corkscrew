"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

type ModelKind = "conventional" | "spiral";

type MechanicalPanelProps = {
  kind: ModelKind;
  title: string;
};

type NormalizedGeometry = {
  geometry: THREE.BufferGeometry;
  height: number;
  radius: number;
};

type DeformState = {
  geometry: THREE.BufferGeometry;
  basePositions: Float32Array;
  positionAttribute: THREE.BufferAttribute;
  colorAttribute: THREE.BufferAttribute;
};

const MODEL_PATHS: Record<ModelKind, string> = {
  conventional: "/conventional-catheter.stl",
  spiral: "/mechanical-corkscrew.stl",
};

function easeInOut(value: number) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = THREE.MathUtils.clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function pulse(elapsed: number, duration: number) {
  const phase = (elapsed % duration) / duration;
  if (phase < 0.72) {
    return easeInOut(phase / 0.72);
  }

  return 1 - easeInOut((phase - 0.72) / 0.28);
}

function rampAndHold(elapsed: number, duration: number) {
  const phase = (elapsed % duration) / duration;
  if (phase < 0.72) {
    return easeInOut(phase / 0.72);
  }

  return 1;
}

function getLongestAxis(size: THREE.Vector3) {
  if (size.x >= size.y && size.x >= size.z) {
    return "x";
  }

  if (size.z >= size.x && size.z >= size.y) {
    return "z";
  }

  return "y";
}

function normalizeModelGeometry(sourceGeometry: THREE.BufferGeometry): NormalizedGeometry {
  const geometry = sourceGeometry.index ? sourceGeometry.toNonIndexed() : sourceGeometry.clone();
  geometry.computeBoundingBox();
  const firstBox = geometry.boundingBox;
  if (!firstBox) {
    return { geometry, height: 1, radius: 1 };
  }

  const firstSize = new THREE.Vector3();
  firstBox.getSize(firstSize);
  const axis = getLongestAxis(firstSize);

  if (axis === "x") {
    geometry.rotateZ(Math.PI / 2);
  } else if (axis === "z") {
    geometry.rotateX(-Math.PI / 2);
  }

  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) {
    return { geometry, height: 1, radius: 1 };
  }

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const scale = 2.26 / Math.max(size.y, 0.0001);
  geometry.translate(-center.x, -box.min.y, -center.z);
  geometry.scale(scale, scale, scale);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  const normalizedBox = geometry.boundingBox;
  const normalizedSize = new THREE.Vector3();
  normalizedBox?.getSize(normalizedSize);
  const radius = Math.max(normalizedSize.x, normalizedSize.z, 0.1) * 0.5;

  return { geometry, height: Math.max(normalizedSize.y, 1), radius };
}

function makeCatheterMaterial(kind: ModelKind) {
  return new THREE.MeshPhysicalMaterial({
    color: kind === "spiral" ? 0xb5ffff : 0xffffff,
    vertexColors: true,
    roughness: kind === "spiral" ? 0.2 : 0.34,
    metalness: 0,
    transmission: kind === "spiral" ? 0.16 : 0.08,
    thickness: kind === "spiral" ? 0.58 : 0.42,
    transparent: true,
    opacity: kind === "spiral" ? 0.96 : 0.94,
    clearcoat: kind === "spiral" ? 0.78 : 0.5,
    clearcoatRoughness: kind === "spiral" ? 0.16 : 0.22,
    emissive: kind === "spiral" ? new THREE.Color(0x00abc8) : new THREE.Color(0x06131c),
    emissiveIntensity: kind === "spiral" ? 0.3 : 0.04,
  });
}

function createDeformState(geometry: THREE.BufferGeometry): DeformState {
  const positionAttribute = geometry.getAttribute("position") as THREE.BufferAttribute;
  const basePositions = new Float32Array(positionAttribute.array as ArrayLike<number>);
  const colors = new Float32Array(positionAttribute.count * 3);
  const colorAttribute = new THREE.BufferAttribute(colors, 3);
  geometry.setAttribute("color", colorAttribute);

  return { geometry, basePositions, positionAttribute, colorAttribute };
}

function writeStressColor(colors: Float32Array, vertexIndex: number, stressValue: number, kind: ModelKind = "conventional") {
  const stress = THREE.MathUtils.clamp(stressValue, 0, 1);
  const stops =
    kind === "spiral"
      ? [
          { at: 0, color: [0.02, 0.18, 0.38] },
          { at: 0.28, color: [0.0, 0.58, 0.86] },
          { at: 0.64, color: [0.0, 0.98, 0.9] },
          { at: 1, color: [0.74, 1.0, 0.94] },
        ]
      : [
          { at: 0, color: [0.18, 0.58, 0.98] },
          { at: 0.38, color: [0.35, 0.96, 0.92] },
          { at: 0.68, color: [0.95, 0.9, 0.34] },
          { at: 1, color: [1, 0.3, 0.2] },
        ];
  let lower = stops[0];
  let upper = stops[stops.length - 1];

  for (let index = 0; index < stops.length - 1; index += 1) {
    if (stress >= stops[index].at && stress <= stops[index + 1].at) {
      lower = stops[index];
      upper = stops[index + 1];
      break;
    }
  }

  const t = (stress - lower.at) / Math.max(0.0001, upper.at - lower.at);
  const offset = vertexIndex * 3;
  colors[offset] = THREE.MathUtils.lerp(lower.color[0], upper.color[0], t);
  colors[offset + 1] = THREE.MathUtils.lerp(lower.color[1], upper.color[1], t);
  colors[offset + 2] = THREE.MathUtils.lerp(lower.color[2], upper.color[2], t);
}

type FailureMarker = {
  group: THREE.Group;
  material: THREE.MeshBasicMaterial;
};

type ConventionalTubeModel = {
  lowerMesh: THREE.Mesh;
  upperMesh: THREE.Mesh;
  marker: FailureMarker;
};

function getStraightTubeCenter(t: number, loading: number, height: number) {
  const axialShortening = 0.12 * loading;
  const topY = height * (1 - axialShortening);
  const arch = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.78);
  const shoulder = 0.92 + 0.12 * Math.sin(Math.PI * t * 1.25);
  const x = -0.56 * loading * arch * shoulder;
  const y = topY * t;
  return new THREE.Vector3(x, y, 0);
}

function getStraightTubePoint(t: number, loading: number, snap: number, height: number, side: -1 | 1) {
  const point = getStraightTubeCenter(t, loading, height);
  const midDistance = Math.min(Math.abs(t - 0.5) / 0.5, 1);
  const breakFalloff = Math.pow(Math.max(0, 1 - midDistance), 0.62);
  const gap = snap * snap * breakFalloff;
  point.x += side * gap * 0.036;
  point.y += side * gap * height * 0.07;
  return point;
}

function makeFailureMarker(): FailureMarker {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: 0xff2a2a,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
  });
  const geometry = new THREE.CylinderGeometry(0.011, 0.011, 0.24, 14);
  const slashA = new THREE.Mesh(geometry.clone(), material);
  const slashB = new THREE.Mesh(geometry.clone(), material);
  slashA.rotation.z = Math.PI / 4;
  slashB.rotation.z = -Math.PI / 4;
  group.add(slashA, slashB);
  group.visible = false;
  return { group, material };
}

function paintConventionalTube(geometry: THREE.BufferGeometry, load: number, height: number) {
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const loading = easeInOut(Math.min(load / 0.78, 1));
  const snap = smoothstep(0.8, 0.98, load);
  const topY = height * (1 - 0.12 * loading);

  for (let index = 0; index < position.count; index += 1) {
    const t = THREE.MathUtils.clamp(position.getY(index) / Math.max(topY, 0.0001), 0, 1);
    const arch = Math.sin(Math.PI * t);
    const midBand = Math.exp(-Math.pow((t - 0.5) / 0.16, 2));
    const stress = 0.08 + 0.34 * loading * Math.pow(Math.max(0, arch), 1.18) + midBand * (0.46 * loading + 0.5 * snap);
    writeStressColor(colors, index, stress, "conventional");
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

function makeConventionalTubeGeometry(startT: number, endT: number, side: -1 | 1, load: number, height: number, tubeRadius: number) {
  const loading = easeInOut(Math.min(load / 0.78, 1));
  const snap = smoothstep(0.8, 0.98, load);
  const points: THREE.Vector3[] = [];
  const count = 44;

  for (let index = 0; index <= count; index += 1) {
    const t = THREE.MathUtils.lerp(startT, endT, index / count);
    points.push(getStraightTubePoint(t, loading, snap, height, side));
  }

  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.35);
  const geometry = new THREE.TubeGeometry(curve, count, tubeRadius, 18, false);
  paintConventionalTube(geometry, load, height);
  return geometry;
}

function makeConventionalTubeModel(material: THREE.Material): ConventionalTubeModel {
  const marker = makeFailureMarker();
  return {
    lowerMesh: new THREE.Mesh(new THREE.BufferGeometry(), material.clone()),
    upperMesh: new THREE.Mesh(new THREE.BufferGeometry(), material.clone()),
    marker,
  };
}

function updateConventionalTubeModel(model: ConventionalTubeModel, load: number, height: number, tubeRadius: number) {
  const loading = easeInOut(Math.min(load / 0.78, 1));
  const snap = smoothstep(0.8, 0.98, load);
  const lowerGeometry = makeConventionalTubeGeometry(0, 0.5, -1, load, height, tubeRadius);
  const upperGeometry = makeConventionalTubeGeometry(0.5, 1, 1, load, height, tubeRadius);
  const oldLowerGeometry = model.lowerMesh.geometry;
  const oldUpperGeometry = model.upperMesh.geometry;
  const markerPosition = getStraightTubeCenter(0.5, loading, height);

  model.lowerMesh.geometry = lowerGeometry;
  model.upperMesh.geometry = upperGeometry;
  oldLowerGeometry.dispose();
  oldUpperGeometry.dispose();

  model.marker.group.position.set(markerPosition.x, markerPosition.y, 0.18);
  model.marker.group.scale.setScalar(0.72 + 0.36 * snap);
  model.marker.group.visible = snap > 0.08;
  model.marker.material.opacity = Math.min(0.9, snap * 1.35);
}

function deformSpiralState(state: DeformState, load: number, height: number, radius: number) {
  const positions = state.positionAttribute.array as Float32Array;
  const colors = state.colorAttribute.array as Float32Array;
  const base = state.basePositions;
  const compression = 0.7 * load;
  const visualShortening = 0.18 * load;
  const buckle = smoothstep(0.24, 1, load);

  for (let index = 0; index < base.length; index += 3) {
    const vertex = index / 3;
    const x = base[index];
    const y = base[index + 1];
    const z = base[index + 2];
    const t = THREE.MathUtils.clamp(y / height, 0, 1);
    const radial = Math.sqrt(x * x + z * z);
    const radialWeight = Math.min(radial / Math.max(radius, 0.0001), 1.4);
    const coilCompliance = Math.sin(Math.PI * t);
    const twist = compression * 0.32 * t;
    const radiusScale = 1 + compression * 0.06 * coilCompliance;
    const cos = Math.cos(twist);
    const sin = Math.sin(twist);
    const rotatedX = (x * cos - z * sin) * radiusScale;
    const rotatedZ = (x * sin + z * cos) * radiusScale;
    const bucklingMode = Math.sin(Math.PI * t);
    const lateralX = 0.28 * buckle * bucklingMode * Math.sin(Math.PI * 1.15 * t + 0.35);
    const lateralZ = 0.13 * buckle * bucklingMode * Math.sin(Math.PI * 2.1 * t + 1.1);
    const localPitchRipple = 0.022 * compression * Math.sin(t * Math.PI * 9 + load * 2.4);

    positions[index] = rotatedX + lateralX;
    positions[index + 1] = y - height * visualShortening * (0.08 * t + 0.92 * t * t) + localPitchRipple;
    positions[index + 2] = rotatedZ + lateralZ;

    const turnStress = 0.5 + 0.5 * Math.sin(t * Math.PI * 8.5 + 0.6);
    const bucklingStress = Math.pow(Math.abs(Math.sin(Math.PI * 1.4 * t + 0.5)), 1.2) * buckle * coilCompliance;
    const stress = 0.18 + 0.26 * compression + 0.2 * radialWeight * coilCompliance + 0.28 * turnStress * compression * coilCompliance + 0.28 * bucklingStress;
    writeStressColor(colors, vertex, stress, "spiral");
  }

  state.positionAttribute.needsUpdate = true;
  state.colorAttribute.needsUpdate = true;
}

function makeForceArrows() {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: 0x4bdcf5,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  const offsets = [-0.34, 0, 0.34];

  offsets.forEach((offset) => {
    const arrow = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 18), material);
    shaft.position.y = -0.18;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.072, 0.16, 28), material);
    cone.rotation.x = Math.PI;
    cone.position.y = -0.47;
    arrow.add(shaft, cone);
    arrow.position.x = offset;
    group.add(arrow);
  });

  return group;
}

function makeBasePlate(width: number) {
  const material = new THREE.MeshBasicMaterial({
    color: 0x8eeeff,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  return new THREE.Mesh(new THREE.BoxGeometry(width, 0.018, 0.92), material);
}

function setupMechanicalScene(mount: HTMLDivElement, kind: ModelKind) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 20);
  camera.position.set(0.72, 0.42, 5.2);
  camera.lookAt(0, 0.05, 0);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.domElement.className = "mechanical-model-canvas";
  mount.appendChild(renderer.domElement);

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(-2.2, 3.6, 4.4);
  const fillLight = new THREE.DirectionalLight(0x8feeff, 1.2);
  fillLight.position.set(2.8, 1.4, 3.8);
  const rimLight = new THREE.DirectionalLight(0xbef8ff, 2.1);
  rimLight.position.set(0, 2.6, -3.4);
  const ambient = new THREE.AmbientLight(0xbeddeb, 0.9);
  scene.add(keyLight, fillLight, rimLight, ambient);

  const root = new THREE.Group();
  scene.add(root);

  const loader = new STLLoader();
  const baseMaterial = makeCatheterMaterial(kind);
  const arrows = makeForceArrows();
  root.add(arrows);

  let disposed = false;
  let animationFrame = 0;
  let height = 2.26;
  let radius = 0.5;
  let compressionGroup: THREE.Group | null = null;
  let deformState: DeformState | null = null;
  let conventionalTube: ConventionalTubeModel | null = null;

  loader.load(
    MODEL_PATHS[kind],
    (loadedGeometry) => {
      if (disposed) {
        loadedGeometry.dispose();
        return;
      }

      const normalized = normalizeModelGeometry(loadedGeometry);
      loadedGeometry.dispose();
      height = normalized.height;
      radius = normalized.radius;
      compressionGroup = new THREE.Group();
      compressionGroup.position.y = -height / 2;
      root.add(compressionGroup);

      if (kind === "conventional") {
        normalized.geometry.dispose();
        conventionalTube = makeConventionalTubeModel(baseMaterial);
        compressionGroup.add(conventionalTube.lowerMesh, conventionalTube.upperMesh, conventionalTube.marker.group);
        updateConventionalTubeModel(conventionalTube, 0, height, Math.max(0.024, Math.min(0.04, radius * 0.07)));
      } else {
        deformState = createDeformState(normalized.geometry);
        compressionGroup.add(new THREE.Mesh(normalized.geometry, baseMaterial));
      }

      const baseWidth = kind === "spiral" ? 1.35 : 0.96;
      const basePlate = makeBasePlate(baseWidth);
      basePlate.position.y = -height / 2 - 0.02;
      root.add(basePlate);
    },
    undefined,
    () => {
      mount.classList.add("is-load-error");
    },
  );

  const resize = () => {
    const rect = mount.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const panelHeight = Math.max(1, rect.height);
    const aspect = width / panelHeight;
    const viewHeight = width < 520 ? 3.7 : 3.35;
    camera.left = (-viewHeight * aspect) / 2;
    camera.right = (viewHeight * aspect) / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, panelHeight, false);
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(mount);
  resize();

  const clock = new THREE.Clock();
  const animate = () => {
    const elapsed = clock.getElapsedTime();
    const load = kind === "spiral" ? pulse(elapsed, 5.2) : rampAndHold(elapsed, 5.2);

    if (compressionGroup) {
      if (kind === "spiral") {
        const compression = 0.7 * load;
        const visualShortening = 0.18 * load;
        if (deformState) {
          deformSpiralState(deformState, load, height, radius);
        }
        arrows.position.set(0.03 * compression, -height / 2 + height * (1 - visualShortening) + 0.58, 0);
        arrows.scale.setScalar(1 + compression * 0.08);
      } else {
        const loading = easeInOut(Math.min(load / 0.78, 1));
        const snap = smoothstep(0.8, 0.98, load);
        const topY = height * (1 - 0.12 * loading) + snap * snap * height * 0.07;

        if (conventionalTube) {
          updateConventionalTubeModel(conventionalTube, load, height, Math.max(0.024, Math.min(0.04, radius * 0.07)));
        }

        arrows.position.set(0, -height / 2 + topY + 0.58, 0);
        arrows.scale.setScalar(1 + load * 0.07);
      }

      root.rotation.y = Math.sin(elapsed * 0.26 + (kind === "spiral" ? 0.8 : -0.4)) * 0.08;
    }

    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(animate);
  };

  animate();

  return () => {
    disposed = true;
    cancelAnimationFrame(animationFrame);
    resizeObserver.disconnect();
    renderer.dispose();
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      const objectMaterial = (mesh as unknown as { material?: THREE.Material | THREE.Material[] }).material;
      if (Array.isArray(objectMaterial)) {
        objectMaterial.forEach((entry) => entry.dispose());
      } else if (objectMaterial) {
        objectMaterial.dispose();
      }
    });
    baseMaterial.dispose();
    if (renderer.domElement.parentElement === mount) {
      mount.removeChild(renderer.domElement);
    }
  };
}

function MechanicalPanel({ kind, title }: MechanicalPanelProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return undefined;
    }

    return setupMechanicalScene(mount, kind);
  }, [kind]);

  return (
    <article className="mechanical-panel">
      <div className="mechanical-panel-header">
        <h3>{title}</h3>
      </div>
      <div ref={mountRef} className="mechanical-stage" aria-hidden="true" />
    </article>
  );
}

export default function MechanicalComparison() {
  return (
    <div className="mechanical-comparison" aria-label="Catheter compression comparison">
      <div className="mechanical-panel-grid">
        <MechanicalPanel kind="conventional" title="Conventional Catheter" />
        <MechanicalPanel kind="spiral" title="SPIRAL Helical Catheter" />
      </div>
      <div className="mechanical-disclaimer-band">
        <p>
          Conceptual visualization only; device geometry, force direction, compression behavior, and scale are illustrative and not experimentally or dimensionally representative. Refer to the publication for accurate details.
        </p>
      </div>
    </div>
  );
}