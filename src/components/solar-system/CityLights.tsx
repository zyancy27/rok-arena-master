/**
 * City Lights Component
 * 
 * Renders glowing city lights on the night side of planets
 * when the description mentions cities, civilization, or populated areas.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

interface CityLightsProps {
  size: number;
  description: string;
  intensity?: number;
  color?: string;
}

// City light shader that only shows on the dark side
const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uLightDirection;
  uniform vec3 uCityColor;
  uniform float uIntensity;
  uniform float uTime;
  uniform sampler2D uCityMap;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  
  void main() {
    // Calculate how much this fragment faces away from the sun (night side)
    float sunFacing = dot(vNormal, uLightDirection);
    
    // Only show lights on the dark side (facing away from sun)
    float nightFactor = smoothstep(-0.1, -0.4, sunFacing);
    
    // Sample city pattern from texture
    float cityPattern = texture2D(uCityMap, vUv).r;
    
    // Add slight flickering for realism
    float flicker = 0.95 + 0.05 * sin(uTime * 3.0 + vUv.x * 100.0);
    
    // Combine effects
    float lightIntensity = cityPattern * nightFactor * uIntensity * flicker;
    
    // City light color with warm glow
    vec3 finalColor = uCityColor * lightIntensity;
    
    // Add slight bloom effect at edges
    float bloom = smoothstep(0.3, 0.0, lightIntensity) * 0.1;
    finalColor += uCityColor * bloom * nightFactor;
    
    gl_FragColor = vec4(finalColor, lightIntensity * 0.9);
  }
`;

export default function CityLights({
  size,
  description,
  intensity = 1.0,
  color = '#FFD700'
}: CityLightsProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Generate procedural city light pattern based on description
  const cityTexture = useMemo(() => {
    // Seed from description
    let seed = 0;
    for (let i = 0; i < description.length; i++) {
      seed = description.charCodeAt(i) + ((seed << 5) - seed);
    }
    seed = Math.abs(seed) || 12345;
    
    const noise3D = createNoise3D(() => (seed % 10000) / 10000);
    const noise3D2 = createNoise3D(() => ((seed + 12345) % 10000) / 10000);
    
    // Create texture for city lights
    const resolution = 512;
    const data = new Uint8Array(resolution * resolution);
    
    const lowerDesc = description.toLowerCase();
    
    // Determine city density based on keywords
    let cityDensity = 0.15;
    if (lowerDesc.includes('megacity') || lowerDesc.includes('ecumenopolis') || lowerDesc.includes('hive city')) {
      cityDensity = 0.6;
    } else if (lowerDesc.includes('metropolis') || lowerDesc.includes('sprawl') || lowerDesc.includes('industrial')) {
      cityDensity = 0.4;
    } else if (lowerDesc.includes('cities') || lowerDesc.includes('populated') || lowerDesc.includes('civilization')) {
      cityDensity = 0.25;
    } else if (lowerDesc.includes('city') || lowerDesc.includes('capital') || lowerDesc.includes('settlement')) {
      cityDensity = 0.18;
    } else if (lowerDesc.includes('village') || lowerDesc.includes('outpost') || lowerDesc.includes('colony')) {
      cityDensity = 0.08;
    }
    
    // Check for water world (reduce city placement in oceans)
    const isWaterWorld = lowerDesc.includes('ocean') || lowerDesc.includes('water world') || lowerDesc.includes('aquatic');
    
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const idx = y * resolution + x;
        
        // Convert to spherical coordinates
        const u = x / resolution;
        const v = y / resolution;
        const phi = u * Math.PI * 2;
        const theta = v * Math.PI;
        
        const nx = Math.sin(theta) * Math.cos(phi);
        const ny = Math.cos(theta);
        const nz = Math.sin(theta) * Math.sin(phi);
        
        // Continental mask (cities appear on land, not water)
        const continentNoise = (noise3D(nx * 2, ny * 2, nz * 2) + 1) * 0.5;
        const isLand = isWaterWorld ? continentNoise > 0.65 : continentNoise > 0.35;
        
        if (!isLand) {
          data[idx] = 0;
          continue;
        }
        
        // Avoid polar regions (less population)
        const latitudeFactor = 1 - Math.pow(Math.abs(ny), 2);
        
        // City cluster noise (creates concentrated areas)
        const clusterNoise = (noise3D(nx * 4, ny * 4, nz * 4) + 1) * 0.5;
        const isUrbanArea = clusterNoise > (1 - cityDensity);
        
        if (!isUrbanArea) {
          data[idx] = 0;
          continue;
        }
        
        // Fine detail for individual cities/lights
        const detailNoise = (noise3D2(nx * 30, ny * 30, nz * 30) + 1) * 0.5;
        const fineDetail = (noise3D2(nx * 60, ny * 60, nz * 60) + 1) * 0.5;
        
        // City light intensity
        let lightValue = 0;
        
        // Major cities (bright cores)
        if (detailNoise > 0.7 && clusterNoise > 0.6) {
          lightValue = 200 + Math.floor(fineDetail * 55);
        }
        // Suburban areas
        else if (detailNoise > 0.55 && clusterNoise > 0.5) {
          lightValue = 100 + Math.floor(fineDetail * 80);
        }
        // Scattered settlements
        else if (detailNoise > 0.75) {
          lightValue = 60 + Math.floor(fineDetail * 40);
        }
        
        // Apply latitude factor
        lightValue = Math.floor(lightValue * latitudeFactor);
        
        data[idx] = Math.min(255, lightValue);
      }
    }
    
    const texture = new THREE.DataTexture(
      data,
      resolution,
      resolution,
      THREE.RedFormat,
      THREE.UnsignedByteType
    );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    
    return texture;
  }, [description]);
  
  // Uniforms for shader
  const uniforms = useMemo(() => ({
    uLightDirection: { value: new THREE.Vector3(1, 0, 0) },
    uCityColor: { value: new THREE.Color(color) },
    uIntensity: { value: intensity },
    uTime: { value: 0 },
    uCityMap: { value: cityTexture }
  }), [color, intensity, cityTexture]);
  
  // Update sun direction and time
  useFrame((state) => {
    if (materialRef.current) {
      // Calculate light direction from scene (sun is at origin)
      const meshPosition = meshRef.current?.getWorldPosition(new THREE.Vector3()) || new THREE.Vector3();
      const lightDir = meshPosition.clone().normalize().negate();
      materialRef.current.uniforms.uLightDirection.value.copy(lightDir);
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });
  
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[size * 1.002, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}
