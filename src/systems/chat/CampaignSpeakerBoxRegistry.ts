import { buildEnemyPresentationProfile } from './presentation/EnemyPresentationProfile';
import { buildNarratorPresentationProfile } from './presentation/NarratorPresentationProfile';
import { buildNpcPresentationProfile } from './presentation/NpcPresentationProfile';
import { buildPartyAllyPresentationProfile } from './presentation/PartyAllyPresentationProfile';
import { buildPlayerPresentationProfile } from './presentation/PlayerPresentationProfile';
import type { ChatSpeakerRole, SpeakerPresentationProfile, SpeakerPresentationProfileInput } from './presentation/SpeakerPresentationProfile';
import { buildSystemPresentationProfile } from './presentation/SystemPresentationProfile';

export const CampaignSpeakerBoxRegistry = {
  resolve(role: ChatSpeakerRole, input: SpeakerPresentationProfileInput): SpeakerPresentationProfile {
    switch (role) {
      case 'narrator':
        return buildNarratorPresentationProfile(input);
      case 'player':
        return buildPlayerPresentationProfile(input);
      case 'party_ally':
        return buildPartyAllyPresentationProfile(input);
      case 'enemy_combatant':
        return buildEnemyPresentationProfile(input);
      case 'system':
        return buildSystemPresentationProfile(input);
      case 'npc':
      default:
        return buildNpcPresentationProfile(input);
    }
  },
};
