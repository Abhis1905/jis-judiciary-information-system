'use strict';

const Hierarchy = require('../models/Hierarchy');

exports.getStates = async (req, res) => {
  try {
    const states = await Hierarchy.getAllStates();
    res.json({ success: true, data: states });
  } catch (err) {
    console.error('Error fetching states:', err);
    res.status(500).json({ success: false, message: 'Failed to load states' });
  }
};

exports.getHighCourts = async (req, res) => {
  try {
    const { state_ut_id } = req.query;
    let highCourts;
    if (state_ut_id) {
      highCourts = await Hierarchy.getHighCourtsByState(state_ut_id);
    } else {
      highCourts = await Hierarchy.getAllHighCourts();
    }
    res.json({ success: true, data: highCourts });
  } catch (err) {
    console.error('Error fetching high courts:', err);
    res.status(500).json({ success: false, message: 'Failed to load high courts' });
  }
};

exports.getBenches = async (req, res) => {
  try {
    const { high_court_id } = req.query;
    if (!high_court_id) {
      return res.status(400).json({ success: false, message: 'high_court_id is required' });
    }
    const benches = await Hierarchy.getBenchesByHighCourt(high_court_id);
    res.json({ success: true, data: benches });
  } catch (err) {
    console.error('Error fetching benches:', err);
    res.status(500).json({ success: false, message: 'Failed to load high court benches' });
  }
};

exports.getDistricts = async (req, res) => {
  try {
    const { state_ut_id, high_court_id, bench_id, district_id } = req.query;
    const districts = await Hierarchy.getDistricts({
      stateUtId: state_ut_id ? parseInt(state_ut_id, 10) : null,
      highCourtId: high_court_id ? parseInt(high_court_id, 10) : null,
      benchId: bench_id ? parseInt(bench_id, 10) : null,
      districtId: district_id ? parseInt(district_id, 10) : null
    });
    res.json({ success: true, data: districts });
  } catch (err) {
    console.error('Error fetching districts:', err);
    res.status(500).json({ success: false, message: 'Failed to load districts' });
  }
};

exports.getCourtLevels = async (req, res) => {
  try {
    const levels = await Hierarchy.getCourtLevels();
    res.json({ success: true, data: levels });
  } catch (err) {
    console.error('Error fetching court levels:', err);
    res.status(500).json({ success: false, message: 'Failed to load court levels' });
  }
};

exports.getSubordinateCourts = async (req, res) => {
  try {
    const { district_id, court_level_id } = req.query;
    const courts = await Hierarchy.getSubordinateCourts({
      districtId: district_id ? parseInt(district_id, 10) : null,
      courtLevelId: court_level_id ? parseInt(court_level_id, 10) : null
    });
    res.json({ success: true, data: courts });
  } catch (err) {
    console.error('Error fetching subordinate courts:', err);
    res.status(500).json({ success: false, message: 'Failed to load subordinate courts' });
  }
};

exports.getAppellatePath = async (req, res) => {
  try {
    const { category, court_level_id } = req.query;
    const chain = await Hierarchy.getFullAppellateChain(category, court_level_id ? parseInt(court_level_id, 10) : null);
    res.json({ success: true, data: chain });
  } catch (err) {
    console.error('Error fetching appellate path:', err);
    res.status(500).json({ success: false, message: 'Failed to load appellate path' });
  }
};
