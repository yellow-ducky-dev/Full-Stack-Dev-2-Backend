import Meeting from '../models/Meeting.js';

// Helper: check for scheduling conflicts
const hasConflict = async (participants, scheduledAt, duration, excludeId = null) => {
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + duration * 60000);

  const query = {
    participants: { $in: participants },
    status: { $in: ['pending', 'accepted'] },
    $or: [
      { scheduledAt: { $lt: end }, endsAt: { $gt: start } },
    ],
  };
  if (excludeId) query._id = { $ne: excludeId };

  return Meeting.findOne(query);
};

// @route  POST /api/meetings
export const createMeeting = async (req, res) => {
  try {
    const { title, description, participants, scheduledAt, duration = 30, notes } = req.body;

    const allParticipants = [...new Set([req.user._id.toString(), ...participants])];
    const conflict = await hasConflict(allParticipants, scheduledAt, duration);
    if (conflict) {
      return res.status(409).json({
        message: 'Scheduling conflict: one or more participants already have a meeting at that time.',
        conflict: { scheduledAt: conflict.scheduledAt, title: conflict.title },
      });
    }

    const meeting = await Meeting.create({
      title,
      description,
      organizer: req.user._id,
      participants: allParticipants,
      scheduledAt,
      duration,
      notes,
      videoRoomId: `room-${Date.now()}`,
    });

    await meeting.populate('organizer participants', 'name email avatarUrl role');
    res.status(201).json(meeting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  GET /api/meetings
export const getMeetings = async (req, res) => {
  try {
    const { status, upcoming } = req.query;
    const query = { participants: req.user._id };
    if (status) query.status = status;
    if (upcoming === 'true') query.scheduledAt = { $gte: new Date() };

    const meetings = await Meeting.find(query)
      .populate('organizer participants', 'name email avatarUrl role')
      .sort({ scheduledAt: 1 });

    res.json(meetings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  PUT /api/meetings/:id
export const updateMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found.' });

    const isParticipant = meeting.participants.map(String).includes(req.user._id.toString());
    const isOrganizer = meeting.organizer.toString() === req.user._id.toString();

    if (!isParticipant && !isOrganizer) {
      return res.status(403).json({ message: 'Not part of this meeting.' });
    }

    const { status, notes, scheduledAt, duration } = req.body;

    // Only organizer can reschedule
    if ((scheduledAt || duration) && !isOrganizer) {
      return res.status(403).json({ message: 'Only the organizer can reschedule.' });
    }

    if (scheduledAt || duration) {
      const newDuration = duration || meeting.duration;
      const newTime = scheduledAt || meeting.scheduledAt;
      const conflict = await hasConflict(
        meeting.participants.map(String),
        newTime,
        newDuration,
        meeting._id
      );
      if (conflict) {
        return res.status(409).json({ message: 'Rescheduled time conflicts with another meeting.' });
      }
      if (scheduledAt) meeting.scheduledAt = scheduledAt;
      if (duration) meeting.duration = duration;
    }

    if (status) meeting.status = status;
    if (notes !== undefined) meeting.notes = notes;

    await meeting.save();
    await meeting.populate('organizer participants', 'name email avatarUrl role');
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  DELETE /api/meetings/:id
export const deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found.' });
    if (meeting.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the organizer can delete this meeting.' });
    }
    await meeting.deleteOne();
    res.json({ message: 'Meeting deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
