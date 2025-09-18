import * as THREE from 'three';

let renderer, scene, camera, knot, particles, rings;
let onPulse = ()=>{};

export function pulseHook(fn){ onPulse = fn; }

export function createScene(canvas){
  renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b1020, 8, 22);

  camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 100);
  camera.position.set(0, 1.2, 10);

  // Lighting
  const ambient = new THREE.AmbientLight(0x88ccff, .4);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, .6);
  dir.position.set(2,3,4);
  scene.add(dir);

  const point = new THREE.PointLight(0x00d4ff, 1, 20);
  point.position.set(0, 0, 0);
  scene.add(point);

  // Main object with glow
  const mat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff,
    metalness: 0.5,
    roughness: 0.2,
    emissive: 0x00d4ff,
    emissiveIntensity: 0.3
  });

  knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.1, .34, 180, 32, 2, 3), mat);
  scene.add(knot);

  // Animated rings
  rings = new THREE.Group();
  for(let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.5 + i * 0.5, 0.05, 8, 64),
      new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        opacity: 0.3 - i * 0.1,
        transparent: true
      })
    );
    ring.rotation.x = Math.PI * 0.5;
    rings.add(ring);
  }
  scene.add(rings);

  // Enhanced particles
  const N = 2000;
  const pos = new Float32Array(N*3);
  const colors = new Float32Array(N*3);

  for(let i=0;i<N;i++){
    pos[i*3+0] = (Math.random()-0.5)*20;
    pos[i*3+1] = (Math.random()-0.5)*12;
    pos[i*3+2] = (Math.random()-0.5)*20;

    // Random colors (cyan, purple, pink)
    const colorChoice = Math.random();
    if(colorChoice < 0.33) {
      colors[i*3+0] = 0; colors[i*3+1] = 0.831; colors[i*3+2] = 1;
    } else if(colorChoice < 0.66) {
      colors[i*3+0] = 0.576; colors[i*3+1] = 0.2; colors[i*3+2] = 0.918;
    } else {
      colors[i*3+0] = 0.925; colors[i*3+1] = 0.282; colors[i*3+2] = 0.6;
    }
  }

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(pos,3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors,3));

  particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      size: .03,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8
    })
  );
  scene.add(particles);

  function onResize(){
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', onResize);
  onResize();

  let t0 = performance.now();
  function animate(){
    const t = (performance.now()-t0)/1000;

    // Main knot animation
    knot.rotation.y = t*.3;
    knot.rotation.x = Math.sin(t*.6)*.15;
    knot.scale.setScalar(1 + Math.sin(t*2)*0.05);

    // Rings animation
    rings.children.forEach((ring, i) => {
      ring.rotation.z = t * (0.2 + i * 0.1);
      ring.scale.setScalar(1 + Math.sin(t*2 + i)*0.1);
    });

    // Particles animation
    particles.rotation.y = t*.02;
    particles.rotation.x = Math.sin(t*.1)*.1;

    // Camera subtle movement
    camera.position.y = 1.2 + Math.sin(t*0.5)*0.2;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  // expose for GSAP pulse
  window.__knotScale = knot.scale;
}