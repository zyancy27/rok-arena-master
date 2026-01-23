import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CameraControllerProps {
  targetPosition: THREE.Vector3 | null;
  targetLookAt: THREE.Vector3 | null;
  isZooming: boolean;
  onZoomComplete?: () => void;
}

export default function CameraController({
  targetPosition,
  targetLookAt,
  isZooming,
  onZoomComplete,
}: CameraControllerProps) {
  const { camera } = useThree();
  const progressRef = useRef(0);
  const startPositionRef = useRef(new THREE.Vector3());
  const startLookAtRef = useRef(new THREE.Vector3());
  const currentLookAtRef = useRef(new THREE.Vector3(0, 0, 0));
  const hasStartedRef = useRef(false);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (isZooming && targetPosition) {
      // Store starting position when zoom begins
      startPositionRef.current.copy(camera.position);
      startLookAtRef.current.copy(currentLookAtRef.current);
      progressRef.current = 0;
      hasStartedRef.current = true;
      hasCompletedRef.current = false;
    } else if (!isZooming) {
      hasStartedRef.current = false;
      hasCompletedRef.current = false;
    }
  }, [isZooming, targetPosition, camera]);

  useFrame((state, delta) => {
    if (!hasStartedRef.current || !targetPosition || !targetLookAt) return;

    if (progressRef.current < 1) {
      // Smooth easing function (ease-out cubic)
      progressRef.current = Math.min(progressRef.current + delta * 0.8, 1);
      const t = 1 - Math.pow(1 - progressRef.current, 3);

      // Interpolate camera position
      camera.position.lerpVectors(startPositionRef.current, targetPosition, t);

      // Interpolate look-at target
      currentLookAtRef.current.lerpVectors(startLookAtRef.current, targetLookAt, t);
      camera.lookAt(currentLookAtRef.current);

      // Trigger completion callback
      if (progressRef.current >= 1 && !hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onZoomComplete?.();
      }
    }
  });

  return null;
}
