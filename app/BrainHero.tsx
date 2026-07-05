"use client";

import { useEffect, useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

const MODEL_PATH = "/brain-cad-modified.stl";
const CORKSCREW_PATH = "/corkscrew.stl";
const XZ_FRONT_ROTATION_X = -Math.PI / 2;
const BRAIN_DISPLAY_SCALE = 0.721395;
const BRAIN_RIGHT_SHIFT_X = 1.7;
const BRAIN_TABLET_RIGHT_SHIFT_X = 1.24;
const BRAIN_MOBILE_RIGHT_SHIFT_X = 0.88;
const CORKSCREW_TARGET_LENGTH_RATIO = 0.55;
const CORKSCREW_LEFT_X_RATIO = 0.42;
const CORKSCREW_DEPTH_Y_RATIO = 0.52;
const CORKSCREW_TOP_INSET_RATIO = 0.04;
const MEDICINE_INLET_PLUME_SPRITES = 520;
const MEDICINE_RELEASE_PORT_COUNT = 8;
const MEDICINE_PLUME_SPRITES_PER_PORT = 1383;
const MEDICINE_RELEASE_HAZE_SPRITES_PER_PORT = 132;
const MEDICINE_SOURCE_SPRITES_PER_PORT = 116;
const ROTATION_STEP = 0.085;
const BASE_ROOT_Y = -0.03;
const IDLE_FLOAT_Y = 0.026;
const IDLE_ROTATION_X = 0.026;
const IDLE_ROTATION_Y = 0.038;
const HERO_IDLE_FRAME_INTERVAL = 1000 / 48;
const HERO_ACTIVE_WAKE_MS = 900;

type CorkscrewReleasePort = {
  origin: THREE.Vector3;
  radial: THREE.Vector3;
  tangent: THREE.Vector3;
};

type MedicinePlumeParticle = {
  origin: THREE.Vector3;
  drift: THREE.Vector3;
  swirl: THREE.Vector3;
  depth: THREE.Vector3;
  baseScale: number;
  baseOpacity: number;
  phase: number;
  anchored: boolean;
  haze?: boolean;
  color: number;
};

type MedicineParticleBatch = {
  mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  material: THREE.ShaderMaterial;
  centers: Float32Array;
  opacities: Float32Array;
  sizes: Float32Array;
  particles: MedicinePlumeParticle[];
  centerAttribute: THREE.InstancedBufferAttribute;
  opacityAttribute: THREE.InstancedBufferAttribute;
  sizeAttribute: THREE.InstancedBufferAttribute;
  worldScale: number;
};
type OrientationControls = {
  rotate: (axis: "x" | "y", direction: number) => void;
  reset: () => void;
};

function getBrainRightShift(viewportWidth: number) {
  if (viewportWidth < 680) {
    return BRAIN_MOBILE_RIGHT_SHIFT_X;
  }

  if (viewportWidth < 980) {
    return BRAIN_TABLET_RIGHT_SHIFT_X;
  }

  return BRAIN_RIGHT_SHIFT_X;
}

function computeGeometryCentroid(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  const centroid = new THREE.Vector3();

  for (let index = 0; index < position.count; index += 1) {
    centroid.x += position.getX(index);
    centroid.y += position.getY(index);
    centroid.z += position.getZ(index);
  }

  return centroid.divideScalar(Math.max(1, position.count));
}

function normalizeProgress(value: number) {
  return ((value % 1) + 1) % 1;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 78.233 + 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function getCorkscrewReleasePorts(geometry: THREE.BufferGeometry, box: THREE.Box3, count: number) {
  const position = geometry.getAttribute("position");
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const helixTop = box.max.y - size.y * 0.15;
  const helixBottom = box.min.y + size.y * 0.1;
  let centerX = 0;
  let centerZ = 0;
  let centerCount = 0;

  for (let index = 0; index < position.count; index += 1) {
    const y = position.getY(index);
    if (y <= helixTop && y >= helixBottom) {
      centerX += position.getX(index);
      centerZ += position.getZ(index);
      centerCount += 1;
    }
  }

  if (centerCount > 0) {
    centerX /= centerCount;
    centerZ /= centerCount;
  } else {
    centerX = center.x;
    centerZ = center.z;
  }

  const ports: CorkscrewReleasePort[] = [];
  const tubeRadius = Math.max(size.x, size.z) * 0.012;
  const sideBias = Math.max(size.x, size.z) * 0.42;
  const sidePattern = count === 8 ? [-1, 1, -1, 1, -1, 1, 1, -1] : [-1, 1, -1, 1, -1, 1, -1];
  const inferredPositions = count === 8 ? [0, 1 / 6, 0.3, 0.433, 0.567, 0.7, 5 / 6, 1] : null;
  const verticalCorrections = count === 8 ? [] : [0, 0, 0.045, 0, 0, 0, 0];

  for (let portIndex = 0; portIndex < count; portIndex += 1) {
    const baseT = inferredPositions?.[portIndex] ?? (count <= 1 ? 0.5 : portIndex / (count - 1));
    const t = THREE.MathUtils.clamp(baseT + (verticalCorrections[portIndex] ?? 0), 0, 1);
    const targetY = THREE.MathUtils.lerp(helixTop, helixBottom, t);
    const targetSide = sidePattern[portIndex] ?? (portIndex % 2 === 0 ? -1 : 1);
    const bestPoint = new THREE.Vector3(centerX, targetY, centerZ);
    let bestScore = -Infinity;

    for (let attempt = 0; attempt < 8 && bestScore === -Infinity; attempt += 1) {
      const sliceHeight = size.y * (0.014 + attempt * 0.012);

      for (let vertexIndex = 0; vertexIndex < position.count; vertexIndex += 1) {
        const y = position.getY(vertexIndex);
        if (Math.abs(y - targetY) > sliceHeight) {
          continue;
        }

        const x = position.getX(vertexIndex);
        const z = position.getZ(vertexIndex);
        const dx = x - centerX;
        const dz = z - centerZ;
        const radialDistance = Math.sqrt(dx * dx + dz * dz);
        const sideScore = targetSide * dx > 0 ? sideBias : -sideBias;
        const score = radialDistance + sideScore - Math.abs(y - targetY) * 0.12;

        if (score > bestScore) {
          bestScore = score;
          bestPoint.set(x, y, z);
        }
      }
    }

    const radial = new THREE.Vector3(bestPoint.x - centerX, 0, bestPoint.z - centerZ);
    if (radial.lengthSq() < 0.0001) {
      radial.set(targetSide, 0, 0);
    }
    radial.normalize();

    const tangent = new THREE.Vector3(-radial.z, 0, radial.x).normalize();
    ports.push({
      origin: bestPoint.clone().addScaledVector(radial, tubeRadius),
      radial,
      tangent,
    });
  }

  return ports;
}
function makeMistTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");

  if (context) {
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 62);
    gradient.addColorStop(0, "rgba(230,230,230,0.52)");
    gradient.addColorStop(0.16, "rgba(200,221,230,0.34)");
    gradient.addColorStop(0.4, "rgba(86,166,230,0.15)");
    gradient.addColorStop(0.68, "rgba(38,113,203,0.035)");
    gradient.addColorStop(1, "rgba(38,113,203,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeMistBillboardMaterial(texture: THREE.Texture) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
    uniforms: {
      mistTexture: { value: texture },
    },
    vertexShader: `
      attribute vec3 instanceCenter;
      attribute float instanceSize;
      attribute float instanceOpacity;
      attribute vec3 instanceColor;
      varying vec2 vUv;
      varying float vOpacity;
      varying vec3 vColor;
      void main() {
        vec4 centerView = modelViewMatrix * vec4(instanceCenter, 1.0);
        centerView.xy += position.xy * instanceSize;
        vUv = uv;
        vOpacity = instanceOpacity;
        vColor = instanceColor;
        gl_Position = projectionMatrix * centerView;
      }
    `,
    fragmentShader: `
      uniform sampler2D mistTexture;
      varying vec2 vUv;
      varying float vOpacity;
      varying vec3 vColor;
      void main() {
        vec4 mist = texture2D(mistTexture, vUv);
        float alpha = mist.a * vOpacity;
        if (alpha < 0.006) discard;
        gl_FragColor = vec4(vColor * (0.84 + mist.rgb * 0.18), alpha);
      }
    `,
  });
}

function createMedicineParticleBatch(
  particles: MedicinePlumeParticle[],
  texture: THREE.Texture,
  worldScale: number,
): MedicineParticleBatch {
  const centers = new Float32Array(particles.length * 3);
  const colors = new Float32Array(particles.length * 3);
  const opacities = new Float32Array(particles.length);
  const sizes = new Float32Array(particles.length);
  const color = new THREE.Color();

  particles.forEach((particle, index) => {
    color.set(particle.color);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
    opacities[index] = 0;
    sizes[index] = 0;
  });

  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3),
  );
  geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));

  const centerAttribute = new THREE.InstancedBufferAttribute(centers, 3);
  const opacityAttribute = new THREE.InstancedBufferAttribute(opacities, 1);
  const sizeAttribute = new THREE.InstancedBufferAttribute(sizes, 1);
  centerAttribute.setUsage(THREE.DynamicDrawUsage);
  opacityAttribute.setUsage(THREE.DynamicDrawUsage);
  sizeAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("instanceCenter", centerAttribute);
  geometry.setAttribute("instanceColor", new THREE.InstancedBufferAttribute(colors, 3));
  geometry.setAttribute("instanceOpacity", opacityAttribute);
  geometry.setAttribute("instanceSize", sizeAttribute);
  geometry.instanceCount = particles.length;

  const material = makeMistBillboardMaterial(texture);
  const mesh = new THREE.Mesh(geometry, material) as THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  mesh.frustumCulled = false;

  return {
    mesh,
    material,
    centers,
    opacities,
    sizes,
    particles,
    centerAttribute,
    opacityAttribute,
    sizeAttribute,
    worldScale,
  };
}

function makeBrainMaterial() {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x256b9e,
    emissive: 0x03162d,
    emissiveIntensity: 0.12,
    metalness: 0,
    roughness: 0.22,
    transparent: true,
    opacity: 0.32,
    transmission: 0.38,
    thickness: 1.35,
    attenuationColor: new THREE.Color(0x307eb8),
    attenuationDistance: 1.75,
    ior: 1.37,
    clearcoat: 0.34,
    clearcoatRoughness: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
varying vec3 vSssWorldNormal;
varying vec3 vSssWorldPosition;`,
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <worldpos_vertex>",
      `#include <worldpos_vertex>
vSssWorldPosition = worldPosition.xyz;
vSssWorldNormal = normalize(mat3(modelMatrix) * normal);`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
varying vec3 vSssWorldNormal;
varying vec3 vSssWorldPosition;`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `vec3 sssView = normalize(cameraPosition - vSssWorldPosition);
float sssRim = pow(1.0 - clamp(abs(dot(normalize(vSssWorldNormal), sssView)), 0.0, 1.0), 2.2);
float sssBackscatter = pow(clamp(dot(normalize(vSssWorldNormal), normalize(vec3(-0.35, 0.42, 0.84))) * 0.5 + 0.5, 0.0, 1.0), 3.0);
gl_FragColor.rgb += vec3(0.08, 0.28, 0.43) * (sssRim * 0.34 + sssBackscatter * 0.07);
gl_FragColor.a = clamp(gl_FragColor.a * 0.82 + sssRim * 0.09, 0.0, 0.42);
#include <dithering_fragment>`,
    );
  };

  return material;
}

function makeFresnelMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    uniforms: {
      color: { value: new THREE.Color(0x70d9ff) },
      opacity: { value: 0.13 },
    },
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float opacity;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - clamp(abs(dot(normalize(vWorldNormal), viewDirection)), 0.0, 1.0), 2.4);
        gl_FragColor = vec4(color, fresnel * opacity);
      }
    `,
  });
}

function makeCorkscrewMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xd8fbff,
    emissive: 0x0a4964,
    emissiveIntensity: 0.12,
    metalness: 0,
    roughness: 0.18,
    transparent: true,
    opacity: 0.66,
    transmission: 0.46,
    thickness: 0.18,
    attenuationColor: new THREE.Color(0x9feeff),
    attenuationDistance: 0.85,
    ior: 1.43,
    clearcoat: 0.52,
    clearcoatRoughness: 0.2,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export default function BrainHero() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<OrientationControls | null>(null);
  const joystickHoldRef = useRef<number | null>(null);

  const readControlDirection = (button: HTMLButtonElement) => {
    const axis: "x" | "y" = button.dataset.axis === "x" ? "x" : "y";
    const direction = button.dataset.direction === "-1" ? -1 : 1;
    return { axis, direction };
  };

  const handleJoystickPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const { axis, direction } = readControlDirection(event.currentTarget);

    if (joystickHoldRef.current !== null) {
      window.clearInterval(joystickHoldRef.current);
      joystickHoldRef.current = null;
    }

    controlsRef.current?.rotate(axis, direction);
    joystickHoldRef.current = window.setInterval(() => controlsRef.current?.rotate(axis, direction), 48);
  };

  const handleJoystickRelease = () => {
    if (joystickHoldRef.current !== null) {
      window.clearInterval(joystickHoldRef.current);
      joystickHoldRef.current = null;
    }
  };

  const handleJoystickKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    const { axis, direction } = readControlDirection(event.currentTarget);
    controlsRef.current?.rotate(axis, direction);
  };

  const handleResetPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (joystickHoldRef.current !== null) {
      window.clearInterval(joystickHoldRef.current);
      joystickHoldRef.current = null;
    }

    controlsRef.current?.reset();
  };

  const handleResetKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    controlsRef.current?.reset();
  };

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x020916, 7.4, 10.8);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0.06, 0.02, 5.9);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.domElement.className = "brain-webgl";
    mount.appendChild(renderer.domElement);

    const root = new THREE.Group();
    root.position.set(BRAIN_RIGHT_SHIFT_X, BASE_ROOT_Y, 0);
    root.rotation.set(0, 0, 0);
    scene.add(root);

    const brainFrame = new THREE.Group();
    brainFrame.rotation.x = XZ_FRONT_ROTATION_X;
    brainFrame.renderOrder = 1;
    root.add(brainFrame);

    const brainMaterial = makeBrainMaterial();
    const fresnelMaterial = makeFresnelMaterial();
    const corkscrewMaterial = makeCorkscrewMaterial();
    const mistTexture = makeMistTexture();
    const sceneGeometries = new Set<THREE.BufferGeometry>();
    const inletParticles: MedicinePlumeParticle[] = [];
    const releaseParticles: MedicinePlumeParticle[] = [];
    let inletBatch: MedicineParticleBatch | null = null;
    let releaseBatch: MedicineParticleBatch | null = null;
    const reusableAnimatedPoint = new THREE.Vector3();
    const reusableBrainFramePoint = new THREE.Vector3();
    const reusableBrainBoundsPoint = new THREE.Vector3();
    const loader = new STLLoader();
    let clampReleasePoint: ((point: THREE.Vector3) => void) | null = null;
    let targetRotationX = 0;
    let targetRotationY = 0;
    let medicineFlowPhase = 0.13;
    let flowBoost = 0;
    let targetFlowBoost = 0;
    let lastPointerX = window.innerWidth * 0.5;
    let lastPointerY = window.innerHeight * 0.5;
    let lastPointerTime = performance.now();
    let disposed = false;
    let width = 1;
    let height = 1;
    let animationFrame: number | null = null;
    let isHeroVisible = true;
    let isDocumentVisible = document.visibilityState === "visible";
    let lastRenderTime = performance.now();
    let activeUntil = lastRenderTime + HERO_ACTIVE_WAKE_MS;

    const shouldAnimate = () => !disposed && isHeroVisible && isDocumentVisible;

    const scheduleAnimation = () => {
      if (animationFrame === null && shouldAnimate()) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    const wakeAnimation = () => {
      activeUntil = performance.now() + HERO_ACTIVE_WAKE_MS;
      scheduleAnimation();
    };

    controlsRef.current = {
      rotate: (axis, direction) => {
        wakeAnimation();

        if (axis === "x") {
          targetRotationX = THREE.MathUtils.clamp(targetRotationX + direction * ROTATION_STEP, -0.88, 0.88);
          return;
        }

        targetRotationY += direction * ROTATION_STEP;
      },
      reset: () => {
        wakeAnimation();
        targetRotationX = 0;
        targetRotationY = 0;
      },
    };

    loader.load(MODEL_PATH, (geometry) => {
      if (disposed) {
        geometry.dispose();
        return;
      }

      geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      if (!box) {
        return;
      }

      const centroid = computeGeometryCentroid(geometry);
      const size = new THREE.Vector3();
      box.getSize(size);
      const scale = (2.9 * BRAIN_DISPLAY_SCALE) / Math.max(size.x, size.y, size.z);
      const brainBoundsFrame = new THREE.Box3(
        box.min.clone().sub(centroid).multiplyScalar(scale),
        box.max.clone().sub(centroid).multiplyScalar(scale),
      );
      const brainBoundsCenter = brainBoundsFrame.getCenter(new THREE.Vector3());
      const brainBoundsHalfSize = brainBoundsFrame.getSize(new THREE.Vector3()).multiplyScalar(0.48);
      brainBoundsHalfSize.y *= 0.9;
      sceneGeometries.add(geometry);

      const brainMesh = new THREE.Mesh(geometry, brainMaterial);
      brainMesh.position.set(-centroid.x * scale, -centroid.y * scale, -centroid.z * scale);
      brainMesh.scale.setScalar(scale);
      brainMesh.renderOrder = 1;
      brainFrame.add(brainMesh);

      const fresnelMesh = new THREE.Mesh(geometry, fresnelMaterial);
      fresnelMesh.position.copy(brainMesh.position);
      fresnelMesh.scale.copy(brainMesh.scale);
      fresnelMesh.renderOrder = 2;
      brainFrame.add(fresnelMesh);

      loader.load(CORKSCREW_PATH, (corkscrewGeometry) => {
        if (disposed) {
          corkscrewGeometry.dispose();
          return;
        }

        corkscrewGeometry.computeBoundingBox();
        corkscrewGeometry.computeVertexNormals();
        const corkBox = corkscrewGeometry.boundingBox;
        if (!corkBox) {
          corkscrewGeometry.dispose();
          return;
        }

        const corkCenter = new THREE.Vector3();
        const corkSize = new THREE.Vector3();
        corkBox.getCenter(corkCenter);
        corkBox.getSize(corkSize);
        const implantLength = size.z * CORKSCREW_TARGET_LENGTH_RATIO;
        const implantUnitScale = implantLength / Math.max(corkSize.y, 0.001);
        const implantScale = scale * implantUnitScale;
        const implantRotation = new THREE.Euler(Math.PI / 2, 0, 0);
        const targetBrainPosition = new THREE.Vector3(
          box.min.x + size.x * CORKSCREW_LEFT_X_RATIO,
          box.min.y + size.y * CORKSCREW_DEPTH_Y_RATIO,
          box.max.z - implantLength * (0.5 + CORKSCREW_TOP_INSET_RATIO),
        );
        const centeredTarget = targetBrainPosition.sub(centroid).multiplyScalar(scale);
        const transformedCorkCenter = corkCenter.clone().multiplyScalar(implantScale).applyEuler(implantRotation);

        sceneGeometries.add(corkscrewGeometry);

        const corkscrewMesh = new THREE.Mesh(corkscrewGeometry, corkscrewMaterial);
        corkscrewMesh.position.copy(centeredTarget.sub(transformedCorkCenter));
        corkscrewMesh.rotation.copy(implantRotation);
        corkscrewMesh.scale.setScalar(implantScale);
        corkscrewMesh.renderOrder = 4;
        brainFrame.add(corkscrewMesh);

        const medicineGroup = new THREE.Group();
        medicineGroup.position.copy(corkscrewMesh.position);
        medicineGroup.rotation.copy(implantRotation);
        medicineGroup.scale.setScalar(implantScale);
        medicineGroup.renderOrder = 5;
        brainFrame.add(medicineGroup);

        const implantQuaternion = new THREE.Quaternion().setFromEuler(implantRotation);
        const inverseImplantQuaternion = implantQuaternion.clone().invert();
        clampReleasePoint = (point) => {
          reusableBrainFramePoint
            .copy(point)
            .multiplyScalar(implantScale)
            .applyQuaternion(implantQuaternion)
            .add(corkscrewMesh.position);
          reusableBrainBoundsPoint.copy(reusableBrainFramePoint).sub(brainBoundsCenter);
          const normalizedX = reusableBrainBoundsPoint.x / Math.max(brainBoundsHalfSize.x, 0.001);
          const normalizedY = reusableBrainBoundsPoint.y / Math.max(brainBoundsHalfSize.y, 0.001);
          const normalizedZ = reusableBrainBoundsPoint.z / Math.max(brainBoundsHalfSize.z, 0.001);
          const normalizedLengthSq = normalizedX * normalizedX + normalizedY * normalizedY + normalizedZ * normalizedZ;

          if (normalizedLengthSq > 1) {
            reusableBrainBoundsPoint.multiplyScalar(1 / Math.sqrt(normalizedLengthSq));
            reusableBrainFramePoint.copy(brainBoundsCenter).add(reusableBrainBoundsPoint);
          }

          point
            .copy(reusableBrainFramePoint.sub(corkscrewMesh.position))
            .applyQuaternion(inverseImplantQuaternion)
            .divideScalar(implantScale);
        };

        const mistScale = Math.max(corkSize.x, corkSize.z);
        const inletOrigin = new THREE.Vector3(corkCenter.x, corkBox.max.y, corkCenter.z);
        const inletDirection = new THREE.Vector3(0, 1, 0);
        const inletSpreadAxis = new THREE.Vector3(1, 0, 0);
        const inletDepthAxis = new THREE.Vector3(0, 0, 1);

        for (let index = 0; index < MEDICINE_INLET_PLUME_SPRITES; index += 1) {
          const seed = index + 101;
          inletParticles.push({
            origin: inletOrigin.clone(),
            drift: inletDirection
              .clone()
              .multiplyScalar(mistScale * (0.42 + seededRandom(seed) * 0.16))
              .add(new THREE.Vector3((seededRandom(seed + 9) - 0.5) * mistScale * 0.018, 0, 0)),
            swirl: inletSpreadAxis
              .clone()
              .multiplyScalar(mistScale * (seededRandom(seed + 13) - 0.5) * 0.28)
              .add(new THREE.Vector3(0, (seededRandom(seed + 19) - 0.5) * mistScale * 0.018, 0)),
            depth: inletDepthAxis
              .clone()
              .multiplyScalar(mistScale * (seededRandom(seed + 43) - 0.5) * 0.46),
            baseScale: mistScale * (0.063 + seededRandom(seed + 29) * 0.027),
            baseOpacity: 0.44 + seededRandom(seed + 37) * 0.1,
            phase: index / MEDICINE_INLET_PLUME_SPRITES,
            anchored: false,
            color: index % 3 === 0 ? 0xffffff : index % 3 === 1 ? 0xe4f9ff : 0xbbebff,
          });
        }

        inletBatch = createMedicineParticleBatch(inletParticles, mistTexture, implantScale);
        inletBatch.mesh.renderOrder = 9;
        medicineGroup.add(inletBatch.mesh);

        const releasePorts = getCorkscrewReleasePorts(corkscrewGeometry, corkBox, MEDICINE_RELEASE_PORT_COUNT);
        releasePorts.forEach((port, portIndex) => {
          const releaseSide = Math.abs(port.radial.x) > 0.18 ? Math.sign(port.radial.x) : portIndex % 2 === 0 ? -1 : 1;
          const releaseDirection = new THREE.Vector3(releaseSide, 0, port.radial.z * 0.18).normalize();
          const spreadAxis = new THREE.Vector3(0, 1, 0).addScaledVector(port.tangent, 0.08).normalize();
          const depthAxis = new THREE.Vector3().crossVectors(releaseDirection, spreadAxis).normalize();
          for (let index = 0; index < MEDICINE_SOURCE_SPRITES_PER_PORT; index += 1) {
            const seed = portIndex * 100 + index + 601;
            releaseParticles.push({
              origin: port.origin.clone(),
              drift: releaseDirection
                .clone()
                .multiplyScalar(mistScale * (0.015 + seededRandom(seed) * 0.018)),
              swirl: spreadAxis
                .clone()
                .multiplyScalar(mistScale * (seededRandom(seed + 13) - 0.5) * 0.012)
                .add(new THREE.Vector3(0, (seededRandom(seed + 19) - 0.5) * mistScale * 0.008, 0)),
              depth: depthAxis
                .clone()
                .multiplyScalar(mistScale * (seededRandom(seed + 43) - 0.5) * 0.02),
              baseScale: mistScale * (0.068 + seededRandom(seed + 29) * 0.024),
              baseOpacity: 0.5 + seededRandom(seed + 37) * 0.1,
              phase: index / MEDICINE_SOURCE_SPRITES_PER_PORT,
              anchored: true,
              color: index % 2 === 0 ? 0xffffff : 0xe8fbff,
            });
          }

          for (let index = 0; index < MEDICINE_PLUME_SPRITES_PER_PORT; index += 1) {
            const seed = portIndex * 100 + index + 701;
            releaseParticles.push({
              origin: port.origin.clone(),
              drift: releaseDirection
                .clone()
                .multiplyScalar(mistScale * (0.42 + seededRandom(seed) * 0.16))
                .add(new THREE.Vector3(0, (seededRandom(seed + 9) - 0.5) * mistScale * 0.025, 0)),
              swirl: spreadAxis
                .clone()
                .multiplyScalar(mistScale * (seededRandom(seed + 13) - 0.5) * 0.32)
                .add(new THREE.Vector3(0, (seededRandom(seed + 19) - 0.5) * mistScale * 0.025, 0)),
              depth: depthAxis
                .clone()
                .multiplyScalar(mistScale * (seededRandom(seed + 43) - 0.5) * 0.52),
              baseScale: mistScale * (0.056 + seededRandom(seed + 29) * 0.024),
              baseOpacity: 0.44 + seededRandom(seed + 37) * 0.1,
              phase: index / MEDICINE_PLUME_SPRITES_PER_PORT,
              anchored: false,
              color: index % 3 === 0 ? 0xffffff : index % 3 === 1 ? 0xe4f9ff : 0xbbebff,
            });
          }

          for (let index = 0; index < MEDICINE_RELEASE_HAZE_SPRITES_PER_PORT; index += 1) {
            const seed = portIndex * 1000 + index + 1901;
            releaseParticles.push({
              origin: port.origin.clone(),
              drift: releaseDirection
                .clone()
                .multiplyScalar(mistScale * (0.46 + seededRandom(seed) * 0.16))
                .add(new THREE.Vector3(0, (seededRandom(seed + 9) - 0.5) * mistScale * 0.02, 0)),
              swirl: spreadAxis
                .clone()
                .multiplyScalar(mistScale * (seededRandom(seed + 13) - 0.5) * 0.5)
                .add(new THREE.Vector3(0, (seededRandom(seed + 19) - 0.5) * mistScale * 0.02, 0)),
              depth: depthAxis
                .clone()
                .multiplyScalar(mistScale * (seededRandom(seed + 43) - 0.5) * 0.68),
              baseScale: mistScale * (0.104 + seededRandom(seed + 29) * 0.044),
              baseOpacity: 0.38 + seededRandom(seed + 37) * 0.1,
              phase: index / MEDICINE_RELEASE_HAZE_SPRITES_PER_PORT,
              anchored: false,
              haze: true,
              color: index % 2 === 0 ? 0xffffff : 0xcff4ff,
            });
          }
        });

        releaseBatch = createMedicineParticleBatch(releaseParticles, mistTexture, implantScale);
        releaseBatch.mesh.renderOrder = 10;
        medicineGroup.add(releaseBatch.mesh);
        mount.classList.add("is-webgl-ready");
        wakeAnimation();
      });
    });

    scene.add(new THREE.HemisphereLight(0xc8ecff, 0x020814, 0.52));
    const keyLight = new THREE.DirectionalLight(0xf2fcff, 3.5);
    keyLight.position.set(-2.6, 2.5, 4.2);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x4bbdff, 2.6);
    rimLight.position.set(2.2, 0.7, 3.5);
    scene.add(rimLight);
    const softFill = new THREE.PointLight(0x6edcff, 2.4, 7.2);
    softFill.position.set(0.8, -1.1, 2.9);
    scene.add(softFill);
    const resize = () => {
      const bounds = mount.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      root.position.x = getBrainRightShift(width);
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      wakeAnimation();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const handlePointerMove = (event: PointerEvent) => {
      if (!isHeroVisible) {
        return;
      }

      const now = performance.now();
      const elapsedPointer = Math.max(12, now - lastPointerTime);
      const dx = event.clientX - lastPointerX;
      const dy = event.clientY - lastPointerY;
      const rawPointerSpeed = Math.hypot(dx, dy) / elapsedPointer;
      const normalizedSpeed = THREE.MathUtils.clamp(rawPointerSpeed / 2.25, 0, 1);
      const gradedFlow = normalizedSpeed * normalizedSpeed * (3 - 2 * normalizedSpeed);
      targetFlowBoost = Math.max(THREE.MathUtils.lerp(targetFlowBoost, gradedFlow, 0.62), targetFlowBoost * 0.84);
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      lastPointerTime = now;
      activeUntil = now + HERO_ACTIVE_WAKE_MS;
      scheduleAnimation();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    const clock = new THREE.Clock();
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isHeroVisible = entry.isIntersecting;
        if (isHeroVisible) {
          clock.getDelta();
          scheduleAnimation();
        }
      },
      { rootMargin: "180px 0px" },
    );
    visibilityObserver.observe(mount);

    const handleVisibilityChange = () => {
      isDocumentVisible = document.visibilityState === "visible";
      if (isDocumentVisible) {
        clock.getDelta();
        scheduleAnimation();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    function animate(frameTime: number) {
      animationFrame = null;

      if (!shouldAnimate()) {
        return;
      }

      const isActive = frameTime < activeUntil;
      if (!isActive && frameTime - lastRenderTime < HERO_IDLE_FRAME_INTERVAL) {
        scheduleAnimation();
        return;
      }

      lastRenderTime = frameTime;
      const delta = Math.min(clock.getDelta(), 0.04);
      const elapsed = clock.elapsedTime;
      targetFlowBoost = THREE.MathUtils.damp(targetFlowBoost, 0, 7.4, delta);
      flowBoost = THREE.MathUtils.damp(flowBoost, targetFlowBoost, targetFlowBoost > flowBoost ? 28 : 10, delta);
      const flowDensity = THREE.MathUtils.clamp(flowBoost, 0, 1);
      const densityBoost = 1 + flowDensity * 0.5;
      const flowCycleRate = 1.35 + flowDensity * 0.24;
      medicineFlowPhase = normalizeProgress(medicineFlowPhase + delta * (0.16 + flowDensity * 0.5));

      if (inletBatch) {
        const { particles, centers, opacities, sizes, centerAttribute, opacityAttribute, sizeAttribute, worldScale } = inletBatch;

        particles.forEach((mist, index) => {
          const inletCycle = normalizeProgress(medicineFlowPhase * flowCycleRate + mist.phase);
          const streamProgress = THREE.MathUtils.clamp(inletCycle, 0.03, 0.98);
          const distanceFromTip = 1 - streamProgress;
          const shimmer = 0.92 + Math.sin(inletCycle * Math.PI * 2) * 0.08;
          const inletLengthBoost = 1 + flowDensity * 0.2;
          const driftTravel = 2.0493 * 0.3 * inletLengthBoost;
          const lateralGrowth = 0.035 + distanceFromTip * 0.86;
          const depthGrowth = 0.04 + distanceFromTip * 0.7;
          const lateralWobble = Math.sin(elapsed * 1.25 + inletCycle * Math.PI * 2) * 0.026;
          const depthWobble = Math.cos(elapsed * 1.1 + inletCycle * Math.PI * 2) * 0.03;
          reusableAnimatedPoint
            .copy(mist.origin)
            .addScaledVector(mist.drift, 0.018 + distanceFromTip * driftTravel)
            .addScaledVector(mist.swirl, lateralGrowth + lateralWobble)
            .addScaledVector(mist.depth, depthGrowth + depthWobble);

          const positionIndex = index * 3;
          centers[positionIndex] = reusableAnimatedPoint.x;
          centers[positionIndex + 1] = reusableAnimatedPoint.y;
          centers[positionIndex + 2] = reusableAnimatedPoint.z;

          const tipTaper = 0.62 + streamProgress * 0.3;
          sizes[index] = mist.baseScale * (0.72 + distanceFromTip * 0.48) * (1 + flowDensity * 0.08) * worldScale;
          opacities[index] = THREE.MathUtils.clamp(mist.baseOpacity * shimmer * tipTaper * densityBoost, 0.24, 0.62);
        });

        centerAttribute.needsUpdate = true;
        opacityAttribute.needsUpdate = true;
        sizeAttribute.needsUpdate = true;
      }
      if (releaseBatch) {
        const { particles, centers, opacities, sizes, centerAttribute, opacityAttribute, sizeAttribute, worldScale } = releaseBatch;

        particles.forEach((mist, index) => {
          const releaseCycle = normalizeProgress(medicineFlowPhase * flowCycleRate + mist.phase);
          const shimmer = 0.92 + Math.sin(releaseCycle * Math.PI * 2) * 0.08;
          const streamProgress = mist.anchored ? releaseCycle * 0.18 : THREE.MathUtils.clamp(releaseCycle, 0.03, 0.98);
          const driftStart = mist.anchored ? 0.008 : 0.025;
          const releaseLengthBoost = 1 + flowDensity * 0.2;
          const driftTravel = mist.anchored ? 0.26 : 2.0493 * releaseLengthBoost;
          const lateralGrowth = mist.anchored ? 0.05 : 0.035 + streamProgress * 1.18;
          const depthGrowth = mist.anchored ? 0.04 : mist.haze ? 0.08 + streamProgress * 1.05 : 0.06 + streamProgress * 0.85;
          const lateralWobble = Math.sin(elapsed * 1.25 + releaseCycle * Math.PI * 2) * (mist.anchored ? 0.01 : 0.03);
          const depthWobble = Math.cos(elapsed * 1.1 + releaseCycle * Math.PI * 2) * (mist.anchored ? 0.008 : 0.035);
          reusableAnimatedPoint
            .copy(mist.origin)
            .addScaledVector(mist.drift, driftStart + streamProgress * driftTravel)
            .addScaledVector(mist.swirl, lateralGrowth + lateralWobble)
            .addScaledVector(mist.depth, depthGrowth + depthWobble);
          clampReleasePoint?.(reusableAnimatedPoint);

          const positionIndex = index * 3;
          centers[positionIndex] = reusableAnimatedPoint.x;
          centers[positionIndex + 1] = reusableAnimatedPoint.y;
          centers[positionIndex + 2] = reusableAnimatedPoint.z;

          if (mist.anchored) {
            sizes[index] = mist.baseScale * (0.82 + flowDensity * 0.06) * worldScale;
            opacities[index] = THREE.MathUtils.clamp(mist.baseOpacity * shimmer * densityBoost, 0.36, 0.72);
          } else if (mist.haze) {
            const downstreamTaper = 1 - streamProgress * 0.2;
            sizes[index] = mist.baseScale * (0.72 + streamProgress * 0.56) * (1 + flowDensity * 0.06) * worldScale;
            opacities[index] = THREE.MathUtils.clamp(mist.baseOpacity * downstreamTaper * densityBoost, 0.24, 0.58);
          } else {
            const downstreamTaper = 1 - streamProgress * 0.12;
            sizes[index] = mist.baseScale * (0.74 + streamProgress * 0.52) * (1 + flowDensity * 0.06) * worldScale;
            opacities[index] = THREE.MathUtils.clamp(mist.baseOpacity * downstreamTaper * densityBoost, 0.32, 0.68);
          }
        });

        centerAttribute.needsUpdate = true;
        opacityAttribute.needsUpdate = true;
        sizeAttribute.needsUpdate = true;
      }

      root.position.y = BASE_ROOT_Y + Math.sin(elapsed * 0.72) * IDLE_FLOAT_Y;
      root.rotation.x = THREE.MathUtils.damp(root.rotation.x, targetRotationX + Math.sin(elapsed * 0.58) * IDLE_ROTATION_X, 7.2, delta);
      root.rotation.y = THREE.MathUtils.damp(root.rotation.y, targetRotationY + Math.sin(elapsed * 0.46 + 0.9) * IDLE_ROTATION_Y, 7.2, delta);
      root.rotation.z = THREE.MathUtils.damp(root.rotation.z, Math.sin(elapsed * 0.52 + 1.7) * 0.012, 4.5, delta);

      renderer.render(scene, camera);
      scheduleAnimation();
    }

    scheduleAnimation();

    return () => {
      disposed = true;
      controlsRef.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (joystickHoldRef.current !== null) {
        window.clearInterval(joystickHoldRef.current);
        joystickHoldRef.current = null;
      }
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      mount.classList.remove("is-webgl-ready");
      renderer.dispose();
      const disposedMaterials = new Set<THREE.Material>();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry && !sceneGeometries.has(mesh.geometry)) {
          mesh.geometry.dispose();
        }
        const material = (mesh as unknown as { material?: THREE.Material | THREE.Material[] }).material;
        if (Array.isArray(material)) {
          material.forEach((entry) => {
            if (!disposedMaterials.has(entry)) {
              entry.dispose();
              disposedMaterials.add(entry);
            }
          });
        } else if (material && !disposedMaterials.has(material)) {
          material.dispose();
          disposedMaterials.add(material);
        }
      });
      [brainMaterial, fresnelMaterial, corkscrewMaterial].forEach((material) => {
        if (!disposedMaterials.has(material)) {
          material.dispose();
          disposedMaterials.add(material);
        }
      });
      mistTexture.dispose();
      sceneGeometries.forEach((geometry) => geometry.dispose());
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <>
      <div ref={mountRef} className="brain-canvas" aria-hidden="true" />
      <div className="orientation-joystick" aria-label="Brain orientation controls">
        <button
          className="orientation-arrow orientation-arrow-up"
          type="button"
          aria-label="Rotate brain upward"
          title="Rotate upward"
          data-axis="x"
          data-direction="-1"
          onPointerDown={handleJoystickPointerDown}
          onPointerUp={handleJoystickRelease}
          onPointerCancel={handleJoystickRelease}
          onPointerLeave={handleJoystickRelease}
          onKeyDown={handleJoystickKeyDown}
        >
          <span aria-hidden="true" />
        </button>
        <button
          className="orientation-arrow orientation-arrow-left"
          type="button"
          aria-label="Rotate brain left"
          title="Rotate left"
          data-axis="y"
          data-direction="-1"
          onPointerDown={handleJoystickPointerDown}
          onPointerUp={handleJoystickRelease}
          onPointerCancel={handleJoystickRelease}
          onPointerLeave={handleJoystickRelease}
          onKeyDown={handleJoystickKeyDown}
        >
          <span aria-hidden="true" />
        </button>
        <button
          className="orientation-cube"
          type="button"
          aria-label="Reset brain orientation"
          title="Reset orientation"
          onPointerDown={handleResetPointerDown}
          onKeyDown={handleResetKeyDown}
        >
          <svg className="orientation-home-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4.5 11.1 12 4.8l7.5 6.3" />
            <path d="M6.8 10.4v8.2h4v-5h2.4v5h4v-8.2" />
          </svg>
        </button>
        <button
          className="orientation-arrow orientation-arrow-right"
          type="button"
          aria-label="Rotate brain right"
          title="Rotate right"
          data-axis="y"
          data-direction="1"
          onPointerDown={handleJoystickPointerDown}
          onPointerUp={handleJoystickRelease}
          onPointerCancel={handleJoystickRelease}
          onPointerLeave={handleJoystickRelease}
          onKeyDown={handleJoystickKeyDown}
        >
          <span aria-hidden="true" />
        </button>
        <button
          className="orientation-arrow orientation-arrow-down"
          type="button"
          aria-label="Rotate brain downward"
          title="Rotate downward"
          data-axis="x"
          data-direction="1"
          onPointerDown={handleJoystickPointerDown}
          onPointerUp={handleJoystickRelease}
          onPointerCancel={handleJoystickRelease}
          onPointerLeave={handleJoystickRelease}
          onKeyDown={handleJoystickKeyDown}
        >
          <span aria-hidden="true" />
        </button>
      </div>
    </>
  );
}



