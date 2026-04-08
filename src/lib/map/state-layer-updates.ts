/**
 * State Layer Updates
 *
 * Functions for updating the state layer (hazards, atmosphere, visibility)
 * without touching the base or entity layers.
 */

import type {
  MapStateLayer,
  MapActiveHazard,
  MapDamageMarker,
  MapVisibility,
  MapQuestPressure,
} from './normalized-map-types';

/**
 * Add a new hazard to the state layer.
 */
export function addHazard(
  state: MapStateLayer,
  hazard: MapActiveHazard,
): MapStateLayer {
  return { ...state, hazards: [...state.hazards, hazard] };
}

/**
 * Remove a hazard by ID.
 */
export function removeHazard(
  state: MapStateLayer,
  hazardId: string,
): MapStateLayer {
  return { ...state, hazards: state.hazards.filter(h => h.id !== hazardId) };
}

/**
 * Add a damage marker to the battlefield.
 */
export function addDamageMarker(
  state: MapStateLayer,
  marker: MapDamageMarker,
): MapStateLayer {
  return { ...state, damageMarkers: [...state.damageMarkers, marker] };
}

/**
 * Age damage markers and remove very old ones.
 */
export function ageDamageMarkers(state: MapStateLayer): MapStateLayer {
  const aged = state.damageMarkers
    .map(m => ({ ...m, age: m.age + 1 }))
    .filter(m => m.age < 20);
  return { ...state, damageMarkers: aged };
}

/**
 * Update atmosphere/visibility settings.
 */
export function updateAtmosphere(
  state: MapStateLayer,
  visibility: MapStateLayer['atmosphere']['visibility'],
  weatherEffect?: string,
): MapStateLayer {
  return {
    ...state,
    atmosphere: { ...state.atmosphere, visibility, weatherEffect },
  };
}

/**
 * Update fog/awareness visibility data.
 */
export function updateVisibility(
  state: MapStateLayer,
  updates: Partial<MapVisibility>,
): MapStateLayer {
  return {
    ...state,
    visibility: { ...state.visibility, ...updates },
  };
}

/**
 * Set quest pressure overlay.
 */
export function setQuestPressure(
  state: MapStateLayer,
  pressure: MapQuestPressure | undefined,
): MapStateLayer {
  return { ...state, questPressure: pressure };
}

/**
 * Spread a hazard (increase radius) or intensify it.
 */
export function intensifyHazard(
  state: MapStateLayer,
  hazardId: string,
  radiusIncrease: number,
): MapStateLayer {
  return {
    ...state,
    hazards: state.hazards.map(h => {
      if (h.id !== hazardId) return h;
      const newRadius = h.radius + radiusIncrease;
      const severity = newRadius > 15 ? 'high' : newRadius > 8 ? 'medium' : 'low';
      return { ...h, radius: newRadius, severity } as MapActiveHazard;
    }),
  };
}
