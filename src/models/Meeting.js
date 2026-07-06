import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
    },
    description: { type: String, default: '' },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled time is required'],
    },
    duration: {
      type: Number, // in minutes
      default: 30,
    },
    endsAt: {
      type: Date, // computed: scheduledAt + duration
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'],
      default: 'pending',
    },
    videoRoomId: {
      type: String,
      default: '',
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

// Auto-compute endsAt before saving
meetingSchema.pre('save', function () {
  if (this.scheduledAt && this.duration) {
    this.endsAt = new Date(this.scheduledAt.getTime() + this.duration * 60000);
  }
});

const Meeting = mongoose.model('Meeting', meetingSchema);
export default Meeting;
