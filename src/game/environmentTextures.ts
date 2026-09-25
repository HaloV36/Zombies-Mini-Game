import * as THREE from 'three';

// Procedural texture generators to make the environment look amazingly atmospheric!
export function createBrickTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Background mortar
  ctx.fillStyle = '#2e2d2b';
  ctx.fillRect(0, 0, 256, 256);

  // Draw bricks
  ctx.fillStyle = '#6e3025';
  const rows = 16;
  const cols = 8;
  const brickH = 256 / rows;
  const brickW = 256 / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (brickW / 2);
    ctx.fillStyle = r % 2 === 0 ? '#54261f' : '#632c24';

    // Add dirt
    for (let c = -1; c <= cols + 1; c++) {
      ctx.fillStyle = r % 2 === 0 ? '#54261f' : '#632c24';
      ctx.fillRect(c * brickW + offset + 1, r * brickH + 1, brickW - 2, brickH - 2);

      // Grainy highlights
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      if (Math.random() > 0.5) {
        ctx.fillRect(c * brickW + offset + 2, r * brickH + 2, brickW * 0.3, brickH * 0.3);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
}

export function createConcreteTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#303236';
  ctx.fillRect(0, 0, 256, 256);

  // Add dark grunge specks
  for (let i = 0; i < 400; i++) {
    const size = Math.random() * 3 + 1;
    const opacity = Math.random() * 0.25;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(0, 0, 0, ${opacity})` : `rgba(255, 255, 255, ${opacity * 0.3})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, size, size);
  }

  // Draw faded yellow border safety lines
  ctx.strokeStyle = 'rgba(234, 179, 8, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, 236, 236);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createWoodTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base light brown
  ctx.fillStyle = '#8a5c37';
  ctx.fillRect(0, 0, 128, 512);

  // Darker wood grain lines
  ctx.strokeStyle = '#5c3d23';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    let x = (128 / 8) * i + Math.random() * 10;
    ctx.moveTo(x, 0);
    // wavy grain
    for (let y = 0; y <= 512; y += 32) {
      x += Math.sin(y * 0.05) * 2 + (Math.random() * 2 - 1);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Split accents
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(5, 0, 10, 512);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export function createSteelTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#5c5f66';
  ctx.fillRect(0, 0, 128, 128);

  // Rust stains
  ctx.fillStyle = 'rgba(139, 69, 19, 0.35)'; // Rust orange
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 128, Math.random() * 128, Math.random() * 25 + 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Metallic rivets on corners
  ctx.fillStyle = '#3c3e42';
  ctx.beginPath();
  ctx.arc(10, 10, 4, 0, Math.PI * 2);
  ctx.arc(118, 10, 4, 0, Math.PI * 2);
  ctx.arc(10, 118, 4, 0, Math.PI * 2);
  ctx.arc(118, 118, 4, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
