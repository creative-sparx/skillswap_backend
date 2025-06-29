// Certificate Controller - CRUD operations
import Certificate from '../models/Certificate.js';

// Create a new certificate
export const createCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.create(req.body);
    res.status(201).json(certificate);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all certificates (optionally filter by user/course)
export const getAllCertificates = async (req, res) => {
  try {
    const filter = {};
    if (req.query.user) {filter.user = req.query.user;}
    if (req.query.course) {filter.course = req.query.course;}
    const certificates = await Certificate.find(filter).populate('user', 'username').populate('course', 'title');
    res.json(certificates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a certificate by ID
export const getCertificateById = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id).populate('user', 'username').populate('course', 'title');
    if (!certificate) {return res.status(404).json({ error: 'Certificate not found' });}
    res.json(certificate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a certificate
export const updateCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!certificate) {return res.status(404).json({ error: 'Certificate not found' });}
    res.json(certificate);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete a certificate
export const deleteCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findByIdAndDelete(req.params.id);
    if (!certificate) {return res.status(404).json({ error: 'Certificate not found' });}
    res.json({ message: 'Certificate deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
