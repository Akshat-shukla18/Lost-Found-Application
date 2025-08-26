export function computeHarvestingPotential({ roofArea, annualRainfall, runoffCoefficient, efficiency }) {
  const safeRoofArea = Number(roofArea) || 0;
  const safeRain = Number(annualRainfall) || 0;
  const safeRC = Number(runoffCoefficient) || 0.8;
  const safeEff = Number(efficiency) || 0.85;
  const potential = safeRoofArea * safeRain * safeRC * safeEff;
  return Math.max(0, Math.round(potential));
}

export function getRunoffCoefficient(roofMaterial) {
  const map = {
    concrete: 0.85,
    metal: 0.9,
    tile: 0.75,
    thatch: 0.5,
    other: 0.7,
  };
  return map[String(roofMaterial || 'other').toLowerCase()] ?? 0.7;
}

export function pickStructure({ roofArea, openSpace }) {
  if (openSpace < 10) return { type: 'Recharge Shaft', dimensions: { diameter_m: 0.6, depth_m: 6 } };
  if (roofArea < 100) return { type: 'Percolation Pit', dimensions: { length_m: 1.5, width_m: 1.5, depth_m: 2 } };
  if (roofArea < 300) return { type: 'Recharge Trench', dimensions: { length_m: 10, width_m: 0.6, depth_m: 1.5 } };
  return { type: 'Recharge Well + Trench', dimensions: { well_diameter_m: 1, well_depth_m: 8, trench_length_m: 20, trench_width_m: 0.6, trench_depth_m: 1.5 } };
}

export function estimateCost({ potential, structureType }) {
  const base = 20000; // base INR
  const perKiloLiter = 150; // per KL potential
  const structureMultiplier = {
    'Percolation Pit': 1,
    'Recharge Trench': 1.4,
    'Recharge Shaft': 1.6,
    'Recharge Well + Trench': 2.2,
  }[structureType] || 1;
  const kl = potential / 1000;
  return Math.round((base + kl * perKiloLiter) * structureMultiplier);
}