import Document from '../models/Document.js';

// @route  POST /api/documents/upload  (multipart/form-data)
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

    const filename = `${Date.now()}-${req.file.originalname}`;
    const tempId = new (await import('mongoose')).default.Types.ObjectId();
    const fileUrl = `${req.protocol}://${req.get('host')}/api/documents/${tempId}/download`;

    const doc = await Document.create({
      _id: tempId,
      originalName: req.file.originalname,
      filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      fileBuffer: req.file.buffer,
      url: fileUrl,
      uploadedBy: req.user._id,
      description: req.body.description || '',
      tags: req.body.tags ? req.body.tags.split(',').map((t) => t.trim()) : [],
    });

    // Strip the buffer from the response to keep JSON lean
    const docObj = doc.toObject();
    delete docObj.fileBuffer;
    await doc.populate('uploadedBy', 'name email avatarUrl');

    const response = doc.toObject();
    delete response.fileBuffer;
    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  GET /api/documents
export const getDocuments = async (req, res) => {
  try {
    const docs = await Document.find({
      $or: [{ uploadedBy: req.user._id }, { sharedWith: req.user._id }],
    })
      .populate('uploadedBy', 'name email avatarUrl')
      .sort({ createdAt: -1 });

    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  DELETE /api/documents/:id
export const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found.' });

    if (doc.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this document.' });
    }

    await doc.deleteOne();
    res.json({ message: 'Document deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  PUT /api/documents/:id/share
export const toggleShare = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found.' });
    if (doc.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    const { userIds, isPublic } = req.body;
    if (isPublic !== undefined) doc.isPubliclyShared = isPublic;
    if (userIds) doc.sharedWith = userIds;

    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  PUT /api/documents/:id/sign
export const signDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found.' });

    const { signatureDataUrl } = req.body;
    if (!signatureDataUrl) {
      return res.status(400).json({ message: 'Signature data URL required.' });
    }

    doc.signatureUrl = signatureDataUrl;
    doc.signedBy = req.user._id;
    doc.signedAt = new Date();
    doc.status = 'approved';
    await doc.save();

    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  GET /api/documents/:id/download
export const downloadDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc || !doc.fileBuffer) return res.status(404).send('Not found');

    res.set('Content-Type', doc.mimeType);
    res.set('Content-Disposition', `inline; filename="${doc.originalName}"`);
    res.send(doc.fileBuffer);
  } catch (err) {
    res.status(500).send(err.message);
  }
};
