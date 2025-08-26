import express from 'express';

const router = express.Router();

router.get('/rainfall/:location', async (req, res) => {
  // Placeholder static map; frontend may provide coordinates for precise fetch
  const city = (req.params.location || '').toLowerCase();
  const data = {
    delhi: 800,
    mumbai: 2200,
    chennai: 1400,
    bengaluru: 970,
    kolkata: 1800,
  };
  res.json({ location: req.params.location, annualRainfall: data[city] || 1000 });
});

router.get('/aquifer/:location', async (req, res) => {
  const city = (req.params.location || '').toLowerCase();
  const data = {
    delhi: { groundwaterDepth: 25, aquiferType: 'Alluvial' },
    mumbai: { groundwaterDepth: 8, aquiferType: 'Basalt (Deccan Traps)' },
    chennai: { groundwaterDepth: 12, aquiferType: 'Alluvium/Sandstone' },
    bengaluru: { groundwaterDepth: 18, aquiferType: 'Granite/Gneiss' },
    kolkata: { groundwaterDepth: 10, aquiferType: 'Alluvial' },
  };
  res.json({ location: req.params.location, ...(data[city] || { groundwaterDepth: 15, aquiferType: 'Mixed' }) });
});

router.get('/structures', async (_req, res) => {
  res.json({
    structures: [
      { type: 'Percolation Pit', dimensions: { length_m: 1.5, width_m: 1.5, depth_m: 2 }, cost: '₹25k-40k' },
      { type: 'Recharge Trench', dimensions: { length_m: 10, width_m: 0.6, depth_m: 1.5 }, cost: '₹60k-1.2L' },
      { type: 'Recharge Shaft', dimensions: { diameter_m: 0.6, depth_m: 6 }, cost: '₹1L-1.8L' },
      { type: 'Recharge Well + Trench', dimensions: { well_diameter_m: 1, well_depth_m: 8, trench_length_m: 20 }, cost: '₹2L-3.5L' },
    ],
  });
});

export default router;