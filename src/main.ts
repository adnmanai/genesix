import './style.css';
import { ThreeScene } from './scene';
import { registerSW } from 'virtual:pwa-register';

// Initialize Three.js 3D Scene
const canvas = document.querySelector<HTMLCanvasElement>('#webgl-canvas');

if (!canvas) {
  throw new Error('WebGL Canvas element not found in DOM.');
}

const scene = new ThreeScene(canvas);

// PWA Service Worker Registration & Offline Support
const statusPill = document.querySelector<HTMLDivElement>('#pwa-status');
const statusText = document.querySelector<HTMLSpanElement>('#pwa-status-text');

function updateNetworkStatus() {
  if (!statusPill || !statusText) return;

  if (navigator.onLine) {
    statusPill.classList.remove('offline');
    statusText.textContent = 'Online';
  } else {
    statusPill.classList.add('offline');
    statusText.textContent = 'Offline Mode';
  }
}

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
updateNetworkStatus();

// Register auto-updating Service Worker from vite-plugin-pwa
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] New update available, updating service worker...');
    updateSW(true);
  },
  onOfflineReady() {
    console.log('[PWA] Application is cached and ready to work offline.');
  },
  onRegisteredSW(swUrl, registration) {
    console.log(`[PWA] Service Worker registered at: ${swUrl}`, registration);
  },
  onRegisterError(error) {
    console.error('[PWA] Service Worker registration failed:', error);
  }
});

// Expose scene pulse for interactive keyboard testing
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    scene.triggerPulse();
  }
});
