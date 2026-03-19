export const NpcRoleFramework = {
  build(role?: string | null) {
    const normalized = (role || 'civilian').toLowerCase();
    return {
      role: normalized,
      socialPosture: normalized.includes('guard') ? ['authoritative checkpoint posture'] : normalized.includes('merchant') ? ['transactional posture'] : ['situational posture'],
      combatPressureStyle: normalized.includes('guard') ? ['zone holding'] : normalized.includes('assassin') ? ['sudden burst'] : ['reactive pressure'],
    };
  },
};
