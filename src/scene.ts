import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class ThreeScene {
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  // Visual scene objects
  private polyhedronGroup: THREE.Group;
  private outerPolyhedron: THREE.Mesh;
  private wireframeCage: THREE.Mesh;
  private innerCore: THREE.Mesh;
  private particleSystem: THREE.Points;
  private particlePositions: Float32Array;
  private initialParticlePositions: Float32Array;

  // Lights
  private lightCyan: THREE.PointLight;
  private lightMagenta: THREE.PointLight;

  // Animation & Interactivity State
  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private pulseIntensity = 0;
  private targetPulse = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();

    // 1. Scene Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);
    this.scene.fog = new THREE.FogExp2(0x0a0a0a, 0.04);

    // 2. Camera Setup
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 100);
    this.camera.position.set(0, 2, 7.5);

    // 3. WebGL Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    // 4. Orbit Controls Setup
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3.5;
    this.controls.maxDistance = 18;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.8;
    this.controls.enablePan = false;

    // 5. Build Lighting
    const ambientLight = new THREE.AmbientLight(0x141428, 2.5);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    this.scene.add(dirLight);

    this.lightCyan = new THREE.PointLight(0x00f2fe, 4.0, 18);
    this.scene.add(this.lightCyan);

    this.lightMagenta = new THREE.PointLight(0xf72585, 4.0, 18);
    this.scene.add(this.lightMagenta);

    // 6. Build 3D Objects
    this.polyhedronGroup = new THREE.Group();

    // Outer Faceted Polyhedron
    const outerGeo = new THREE.IcosahedronGeometry(2, 0);
    const outerMat = new THREE.MeshPhysicalMaterial({
      color: 0x121829,
      roughness: 0.15,
      metalness: 0.85,
      flatShading: true,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      reflectivity: 0.9
    });
    this.outerPolyhedron = new THREE.Mesh(outerGeo, outerMat);
    this.polyhedronGroup.add(this.outerPolyhedron);

    // Wireframe Accent Cage
    const cageGeo = new THREE.IcosahedronGeometry(2.05, 0);
    const cageMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    this.wireframeCage = new THREE.Mesh(cageGeo, cageMat);
    this.polyhedronGroup.add(this.wireframeCage);

    // Inner Glowing Core
    const innerGeo = new THREE.OctahedronGeometry(0.9, 0);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x7000ff,
      emissive: 0x7000ff,
      emissiveIntensity: 1.2,
      wireframe: true
    });
    this.innerCore = new THREE.Mesh(innerGeo, innerMat);
    this.polyhedronGroup.add(this.innerCore);

    this.scene.add(this.polyhedronGroup);

    // 7. Dynamic Particle Nebula
    const particleCount = 2800;
    const pGeo = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(particleCount * 3);
    this.initialParticlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0x00f2fe);
    const color2 = new THREE.Color(0x7000ff);
    const color3 = new THREE.Color(0xf72585);
    const tempColor = new THREE.Color();

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // Spherical shell distribution with variance
      const radius = 3.2 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      this.particlePositions[i3] = x;
      this.particlePositions[i3 + 1] = y;
      this.particlePositions[i3 + 2] = z;

      this.initialParticlePositions[i3] = x;
      this.initialParticlePositions[i3 + 1] = y;
      this.initialParticlePositions[i3 + 2] = z;

      // Color gradient blend
      const ratio = Math.random();
      if (ratio < 0.45) {
        tempColor.copy(color1).lerp(color2, ratio / 0.45);
      } else {
        tempColor.copy(color2).lerp(color3, (ratio - 0.45) / 0.55);
      }

      particleColors[i3] = tempColor.r;
      particleColors[i3 + 1] = tempColor.g;
      particleColors[i3 + 2] = tempColor.b;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particleSystem = new THREE.Points(pGeo, pMat);
    this.scene.add(this.particleSystem);

    // 8. Bind Listeners
    this.onWindowResize = this.onWindowResize.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);

    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('pointerdown', this.onPointerDown);

    // 9. Start Render Loop
    this.animate();
  }

  // Window resize handler: maintains aspect ratio and clamps DPR
  private onWindowResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  // Pointer click/tap trigger: triggers an expanding energy pulse
  private onPointerDown(): void {
    this.targetPulse = 1.0;
  }

  // Public method allowing external UI triggers
  public triggerPulse(): void {
    this.targetPulse = 1.0;
  }

  // Render & Animation Loop
  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // Smooth pulse interpolation
    this.pulseIntensity += (this.targetPulse - this.pulseIntensity) * 0.12;
    this.targetPulse = Math.max(0, this.targetPulse - delta * 1.5);

    // Update orbit controls
    this.controls.update();

    // Rotate Polyhedron Group
    this.polyhedronGroup.rotation.x = elapsedTime * 0.15;
    this.polyhedronGroup.rotation.y = elapsedTime * 0.25;

    // Pulse Polyhedron Scale
    const scale = 1.0 + Math.sin(elapsedTime * 2) * 0.03 + this.pulseIntensity * 0.2;
    this.polyhedronGroup.scale.set(scale, scale, scale);

    // Counter-rotate inner core
    this.innerCore.rotation.x = -elapsedTime * 0.4;
    this.innerCore.rotation.z = elapsedTime * 0.3;

    // Emissive reaction to pulse
    const innerMat = this.innerCore.material as THREE.MeshStandardMaterial;
    innerMat.emissiveIntensity = 1.2 + this.pulseIntensity * 3.5;

    // Dynamic Orbiting Point Lights
    const lightTime1 = elapsedTime * 0.8;
    this.lightCyan.position.set(
      Math.cos(lightTime1) * 4.5,
      Math.sin(lightTime1 * 0.7) * 3,
      Math.sin(lightTime1) * 4.5
    );
    this.lightCyan.intensity = 4.0 + this.pulseIntensity * 6.0;

    const lightTime2 = elapsedTime * -0.7;
    this.lightMagenta.position.set(
      Math.cos(lightTime2) * 4.5,
      Math.sin(lightTime2 * 0.9) * 3,
      Math.sin(lightTime2) * 4.5
    );
    this.lightMagenta.intensity = 4.0 + this.pulseIntensity * 6.0;

    // Animate Particles
    this.particleSystem.rotation.y = elapsedTime * 0.05;
    this.particleSystem.rotation.x = Math.sin(elapsedTime * 0.04) * 0.1;

    if (this.pulseIntensity > 0.01) {
      const posAttr = this.particleSystem.geometry.attributes.position;
      const count = posAttr.count;
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const initX = this.initialParticlePositions[i3];
        const initY = this.initialParticlePositions[i3 + 1];
        const initZ = this.initialParticlePositions[i3 + 2];

        // Expansion ripple outward
        const factor = 1.0 + this.pulseIntensity * 0.25;
        this.particlePositions[i3] = initX * factor;
        this.particlePositions[i3 + 1] = initY * factor;
        this.particlePositions[i3 + 2] = initZ * factor;
      }
      posAttr.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  };

  // Cleanup & Disposal
  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('pointerdown', this.onPointerDown);

    this.controls.dispose();

    // Dispose Geometries and Materials
    this.outerPolyhedron.geometry.dispose();
    (this.outerPolyhedron.material as THREE.Material).dispose();

    this.wireframeCage.geometry.dispose();
    (this.wireframeCage.material as THREE.Material).dispose();

    this.innerCore.geometry.dispose();
    (this.innerCore.material as THREE.Material).dispose();

    this.particleSystem.geometry.dispose();
    (this.particleSystem.material as THREE.Material).dispose();

    this.renderer.dispose();
  }
}
