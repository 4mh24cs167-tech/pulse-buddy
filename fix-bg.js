const fs = require('fs');
let html = fs.readFileSync('www/index.html', 'utf8');

const regex = /\/\/ Crazy 3D Background[\s\S]*?animBG\(\);/;
const replacement = `function init3DBackground() {
  try {
    if(!window.Buddy3D || !window.Buddy3D.THREE) return;
    const THREE = window.Buddy3D.THREE;
    // Crazy 3D Background
    const bgCanvas = document.createElement('canvas');
    bgCanvas.style.position = 'fixed';
    bgCanvas.style.top = '0'; bgCanvas.style.left = '0'; bgCanvas.style.zIndex = '0'; bgCanvas.style.pointerEvents = 'none';
    document.body.prepend(bgCanvas);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({canvas: bgCanvas, alpha: true, antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    const geom = new THREE.BufferGeometry();
    const pts = [];
    for(let i=0; i<1000; i++) pts.push((Math.random()-0.5)*20, (Math.random()-0.5)*20, (Math.random()-0.5)*20);
    geom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.PointsMaterial({color: 0x43e97b, size: 0.05, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending});
    const stars = new THREE.Points(geom, mat);
    scene.add(stars);
    camera.position.z = 5;
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', e => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    function animBG() {
      requestAnimationFrame(animBG);
      stars.rotation.x += 0.001; stars.rotation.y += 0.002;
      camera.position.x += (mouseX * 2 - camera.position.x) * 0.05;
      camera.position.y += (mouseY * 2 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
    }
    animBG();
  } catch(e) { console.error("BG Render failed", e); }
}`;

html = html.replace(regex, replacement);
fs.writeFileSync('www/index.html', html, 'utf8');
