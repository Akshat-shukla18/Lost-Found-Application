import express from 'express';
import axios from 'axios';
import { requireAuth } from '../middleware/auth.js';
import { Assessment } from '../models/Assessment.js';
import { computeHarvestingPotential, getRunoffCoefficient, pickStructure, estimateCost } from '../utils/calc.js';

const router = express.Router();

router.post('/assess', requireAuth, async (req, res) => {
  try {
    const { name, location, coordinates, roofArea, dwellers, openSpace, roofMaterial } = req.body;
    if (!name || !location || !roofArea || !dwellers || !openSpace) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    let annualRainfall = 0;
    if (coordinates?.lat && coordinates?.lng) {
      const url = `https://api.open-meteo.com/v1/climate?latitude=${coordinates.lat}&longitude=${coordinates.lng}&hourly=precipitation`;
      try {
        await axios.get(url); // Placeholder to validate coords; real aggregation can be added later
      } catch {}
    }

    // For MVP, allow rainfall to be provided by frontend; otherwise use a default
    annualRainfall = Number(req.body.rainfall) || 800; // mm/year typical in many Indian cities

    const runoffCoefficient = getRunoffCoefficient(roofMaterial);
    const potential = computeHarvestingPotential({ roofArea, annualRainfall, runoffCoefficient, efficiency: 0.85 });
    const structure = pickStructure({ roofArea, openSpace });
    const costEstimate = estimateCost({ potential, structureType: structure.type });

    const doc = await Assessment.create({
      userId: req.userId,
      name,
      location,
      coordinates,
      roofArea,
      dwellers,
      openSpace,
      roofMaterial,
      rainfall: annualRainfall,
      groundwaterDepth: req.body.groundwaterDepth || undefined,
      aquiferType: req.body.aquiferType || undefined,
      potential,
      recommendedStructure: structure.type,
      dimensions: structure.dimensions,
      costEstimate,
    });

    res.status(201).json({ assessment: doc });
  } catch (err) {
    res.status(500).json({ message: 'Assessment failed' });
  }
});

router.get('/assessments', requireAuth, async (req, res) => {
  const items = await Assessment.find({ userId: req.userId }).sort({ createdAt: -1 }).lean();
  res.json({ assessments: items });
});

export default router;