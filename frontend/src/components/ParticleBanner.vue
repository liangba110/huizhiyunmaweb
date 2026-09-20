<template>
  <section class="page-hero">
    <!-- Canvas 粒子背景 -->
    <canvas ref="particleCanvas" class="particle-canvas"></canvas>

    <!-- 装饰层 -->
    <div class="hero-bg">
      <div class="grid-bg"></div>
      <div class="glow glow-1"></div>
      <div class="glow glow-2"></div>
    </div>

    <div class="container hero-inner">
      <slot />
    </div>

    <!-- 鼠标光圈 -->
    <div class="cursor-glow" :style="{ left: cursor.x + 'px', top: cursor.y + 'px' }"></div>
  </section>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  // 粒子密度档位: 'low' | 'medium' | 'high'
  density: { type: String, default: 'low' }
});

const particleCanvas = ref(null);
let particles = [];
let animationId = null;
let mouseX = 0;
let mouseY = 0;
let canvasWidth = 0;
let canvasHeight = 0;

const cursor = reactive({ x: 0, y: 0 });

function getParticleCount() {
  const area = canvasWidth * canvasHeight;
  const densityMap = {
    low: 60000,    // 较少（适合内页 banner，1/6 屏）
    medium: 30000, // 中等
    high: 15000    // 密集（首页 hero）
  };
  return Math.min(100, Math.floor(area / densityMap[props.density] || 60000));
}

function initParticles() {
  const canvas = particleCanvas.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvasWidth = canvas.offsetWidth;
  canvasHeight = canvas.offsetHeight;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const particleCount = getParticleCount();
  particles = [];

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      radius: Math.random() * 1.8 + 0.8,
      color: Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.7)' : 'rgba(6, 182, 212, 0.6)'
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvasWidth) p.vx *= -1;
      if (p.y < 0 || p.y > canvasHeight) p.vy *= -1;

      const dx = mouseX - p.x;
      const dy = mouseY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 130) {
        p.x += dx * 0.005;
        p.y += dy * 0.005;
      }
    });

    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    });

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - dist / 100) * 0.2})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
      const dx = particles[i].x - mouseX;
      const dy = particles[i].y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(mouseX, mouseY);
        ctx.strokeStyle = `rgba(6, 182, 212, ${(1 - dist / 150) * 0.35})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    animationId = requestAnimationFrame(animate);
  }
  animate();
}

function handleResize() {
  if (!particleCanvas.value) return;
  canvasWidth = particleCanvas.value.offsetWidth;
  canvasHeight = particleCanvas.value.offsetHeight;
  particleCanvas.value.width = canvasWidth;
  particleCanvas.value.height = canvasHeight;
}

function handleMouseMove(e) {
  if (!particleCanvas.value) return;
  const rect = particleCanvas.value.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  cursor.x = e.clientX;
  cursor.y = e.clientY;
}

onMounted(() => {
  setTimeout(() => {
    initParticles();
  }, 50);
  window.addEventListener('resize', handleResize);
  window.addEventListener('mousemove', handleMouseMove);
});

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId);
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('mousemove', handleMouseMove);
});
</script>

<style scoped>
.page-hero {
  position: relative;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent-2) 100%);
  color: white;
  padding: 100px 0 80px;
  text-align: center;
  overflow: hidden;
}

/* Canvas 粒子背景 */
.particle-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.hero-bg {
  position: absolute; inset: 0;
  pointer-events: none;
  z-index: 2;
}
.grid-bg {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 70%);
}
.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: float 8s ease-in-out infinite;
}
.glow-1 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.35) 0%, transparent 70%);
  top: -30%; left: -10%;
  animation-delay: 0s;
}
.glow-2 {
  width: 350px; height: 350px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%);
  top: 30%; right: -10%;
  animation-delay: 2s;
}

.hero-inner {
  position: relative;
  z-index: 3;
}

/* 鼠标光圈 */
.cursor-glow {
  position: fixed;
  width: 400px; height: 400px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 60%);
  pointer-events: none;
  transform: translate(-50%, -50%);
  z-index: 0;
  transition: opacity 0.3s;
}

@media (max-width: 768px) {
  .cursor-glow { display: none; }
}
</style>