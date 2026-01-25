/**
 * Custom hook for managing the Planet Hub Three.js scene
 * Optimized for mobile performance
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { 
  PlanetParams, 
  MoonParams,
  createPlanet, 
  createMoon, 
  updateMoonOrbit,
  clearGeneratedObjects 
} from '@/lib/planet-generator';

interface UsePlanetSceneOptions {
  containerRef: React.RefObject<HTMLDivElement>;
}

interface SceneState {
  isReady: boolean;
  fps: number;
}

export function usePlanetScene({ containerRef }: UsePlanetSceneOptions) {
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const planetRef = useRef<THREE.Mesh | null>(null);
  const moonsRef = useRef<THREE.Mesh[]>([]);
  const animationRef = useRef<number | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  
  const [sceneState, setSceneState] = useState<SceneState>({
    isReady: false,
    fps: 0,
  });

  // Initialize scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0A0A0F');
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 1, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Create renderer - optimized for mobile
    const renderer = new THREE.WebGLRenderer({
      antialias: false, // Disabled for mobile performance
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x
    renderer.shadowMap.enabled = false; // Disabled for performance
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Add starfield background
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 50 + Math.random() * 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Slight color variation
      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness + Math.random() * 0.2;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starsMaterial = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    stars.name = 'stars';
    scene.add(stars);

    // Animation loop
    let frameCount = 0;
    let lastFpsUpdate = 0;

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      const delta = clockRef.current.getDelta();
      const elapsed = clockRef.current.getElapsedTime();

      // FPS counter
      frameCount++;
      if (elapsed - lastFpsUpdate >= 1) {
        setSceneState(prev => ({ ...prev, fps: frameCount }));
        frameCount = 0;
        lastFpsUpdate = elapsed;
      }

      // Rotate planet slowly
      if (planetRef.current) {
        planetRef.current.rotation.y += delta * 0.1;
      }

      // Update moon orbits
      moonsRef.current.forEach(moon => {
        updateMoonOrbit(moon, delta);
        moon.rotation.y += delta * 0.2;
      });

      renderer.render(scene, camera);
    };

    animate();
    setSceneState({ isReady: true, fps: 0 });

    // Handle resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (rendererRef.current) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      
      if (sceneRef.current) {
        sceneRef.current.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            if (Array.isArray(obj.material)) {
              obj.material.forEach(m => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        });
      }
    };
  }, [containerRef]);

  // Generate planet
  const generatePlanet = useCallback((params: PlanetParams) => {
    if (!sceneRef.current) return;

    // Clear existing objects
    clearGeneratedObjects(sceneRef.current);
    planetRef.current = null;
    moonsRef.current = [];

    // Create new planet
    const planet = createPlanet(sceneRef.current, params);
    planetRef.current = planet;
  }, []);

  // Generate moons
  const generateMoons = useCallback((moonParams: MoonParams[]) => {
    if (!sceneRef.current) return;

    // Remove existing moons
    moonsRef.current.forEach(moon => {
      if (moon.geometry) moon.geometry.dispose();
      if (moon.material) {
        if (Array.isArray(moon.material)) {
          moon.material.forEach(m => m.dispose());
        } else {
          moon.material.dispose();
        }
      }
      sceneRef.current?.remove(moon);
    });
    moonsRef.current = [];

    // Create new moons (max 3 for performance)
    const limitedParams = moonParams.slice(0, 3);
    limitedParams.forEach(params => {
      if (!sceneRef.current) return;
      const moon = createMoon(sceneRef.current, params);
      moonsRef.current.push(moon);
    });
  }, []);

  // Clear all generated content
  const clearScene = useCallback(() => {
    if (!sceneRef.current) return;
    clearGeneratedObjects(sceneRef.current);
    planetRef.current = null;
    moonsRef.current = [];
  }, []);

  // Update camera position
  const setCameraDistance = useCallback((distance: number) => {
    if (!cameraRef.current) return;
    cameraRef.current.position.z = distance;
  }, []);

  return {
    sceneState,
    generatePlanet,
    generateMoons,
    clearScene,
    setCameraDistance,
    scene: sceneRef.current,
  };
}
