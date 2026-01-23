import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface HeatShimmerProps {
  sunRadius: number;
}

// Create a custom shader for heat distortion effect
const shimmerVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  uniform float time;
  
  void main() {
    vUv = uv;
    vPosition = position;
    
    // Animated displacement for shimmer
    vec3 pos = position;
    float displacement = sin(position.x * 3.0 + time * 2.0) * cos(position.z * 3.0 + time * 1.5) * 0.15;
    pos.y += displacement;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const shimmerFragmentShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  uniform float time;
  uniform float innerRadius;
  uniform float outerRadius;
  
  void main() {
    float dist = length(vPosition.xz);
    
    // Normalize distance within the ring
    float t = (dist - innerRadius) / (outerRadius - innerRadius);
    
    // Multi-layered noise for organic shimmer
    float shimmer1 = sin(dist * 8.0 - time * 3.0) * 0.5 + 0.5;
    float shimmer2 = sin(dist * 12.0 + time * 2.5 + vPosition.x * 2.0) * 0.5 + 0.5;
    float shimmer3 = cos(dist * 6.0 - time * 1.8 + vPosition.z * 3.0) * 0.5 + 0.5;
    
    float combinedShimmer = (shimmer1 * 0.4 + shimmer2 * 0.35 + shimmer3 * 0.25);
    
    // Fade at edges - stronger near sun, fading outward
    float edgeFade = 1.0 - smoothstep(0.0, 0.3, t) * 0.5;
    float outerFade = 1.0 - smoothstep(0.7, 1.0, t);
    
    // Very subtle warm tint - almost invisible but adds heat feel
    vec3 warmColor = vec3(1.0, 0.95, 0.85);
    
    float alpha = combinedShimmer * edgeFade * outerFade * 0.08;
    
    gl_FragColor = vec4(warmColor, alpha);
  }
`;

export default function HeatShimmer({ sunRadius }: HeatShimmerProps) {
  const shimmerRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  
  const innerRadius = sunRadius * 0.9;
  const outerRadius = sunRadius + 4;

  const uniforms = useMemo(() => ({
    time: { value: 0 },
    innerRadius: { value: innerRadius },
    outerRadius: { value: outerRadius },
  }), [innerRadius, outerRadius]);

  // Heat particles for extra effect
  const particles = useMemo(() => {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.random() * 2;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      velocities[i] = 0.5 + Math.random() * 1.5;
    }
    
    return { positions, velocities, count };
  }, [innerRadius, outerRadius]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Update shader uniform
    uniforms.time.value = time;
    
    // Animate heat particles rising
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particles.count; i++) {
        const i3 = i * 3;
        
        // Rise upward with slight wave
        positions[i3 + 1] += particles.velocities[i] * 0.02;
        
        // Add horizontal drift
        const angle = Math.atan2(positions[i3 + 2], positions[i3]);
        positions[i3] += Math.sin(time + i) * 0.005;
        positions[i3 + 2] += Math.cos(time + i * 0.7) * 0.005;
        
        // Reset when too high
        if (positions[i3 + 1] > 4) {
          const newAngle = Math.random() * Math.PI * 2;
          const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
          positions[i3] = Math.cos(newAngle) * radius;
          positions[i3 + 1] = 0;
          positions[i3 + 2] = Math.sin(newAngle) * radius;
        }
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Heat shimmer distortion ring */}
      <mesh 
        ref={shimmerRef}
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0.1, 0]}
      >
        <ringGeometry args={[innerRadius, outerRadius, 128, 8]} />
        <shaderMaterial
          vertexShader={shimmerVertexShader}
          fragmentShader={shimmerFragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      
      {/* Rising heat particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particles.count}
            array={particles.positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          color="#fff8e7"
          transparent
          opacity={0.25}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}