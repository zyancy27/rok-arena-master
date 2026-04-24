import { useSearchParams } from 'react-router-dom';
import CharacterForm from '@/components/characters/CharacterForm';
import GuidedCreateCharacter from '@/components/onboarding/GuidedCreateCharacter';

/**
 * Default: guided 6-step wizard (matches the friendly onboarding flow).
 * Power users can opt into the original full-form editor with `?advanced=1`.
 */
export default function CreateCharacter() {
  const [params] = useSearchParams();
  if (params.get('advanced') === '1') {
    return <CharacterForm mode="create" />;
  }
  return <GuidedCreateCharacter />;
}
