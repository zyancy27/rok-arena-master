import { useSearchParams } from 'react-router-dom';
import SolarSystem from '@/components/solar-system/SolarSystem';

export default function CharacterDirectory() {
  const [searchParams] = useSearchParams();
  const viewSystemId = searchParams.get('system');
  
  return <SolarSystem viewSystemId={viewSystemId} />;
}
