import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';

interface ZoomTransitionControllerProps {
  onZoomOutThreshold: () => void;
  threshold?: number;
  enabled?: boolean;
}

export default function ZoomTransitionController({
  onZoomOutThreshold,
  threshold = 45,
  enabled = true,
}: ZoomTransitionControllerProps) {
  const { camera } = useThree();
  const hasTriggered = useRef(false);
  const wasAboveThreshold = useRef(false);

  useFrame(() => {
    if (!enabled) {
      hasTriggered.current = false;
      wasAboveThreshold.current = false;
      return;
    }

    const distance = camera.position.length();
    
    // Check if we've crossed the threshold going outward
    if (distance >= threshold && !hasTriggered.current && wasAboveThreshold.current) {
      hasTriggered.current = true;
      onZoomOutThreshold();
    }
    
    // Track if we were below threshold (to detect crossing)
    if (distance < threshold - 5) {
      wasAboveThreshold.current = true;
      hasTriggered.current = false;
    }
  });

  return null;
}
