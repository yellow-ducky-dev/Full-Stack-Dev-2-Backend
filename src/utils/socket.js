// WebRTC Signaling Server via Socket.IO
export const setupSocketIO = (io) => {
  const rooms = new Map(); // roomId -> Set of socket IDs

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // ── Join a video room ──────────────────────────────────────────────────
    socket.on('join-room', ({ roomId, userId }) => {
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.userId = userId;

      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      rooms.get(roomId).add(socket.id);

      // Notify others in the room that someone new joined
      socket.to(roomId).emit('user-connected', { userId, socketId: socket.id });

      // Send list of existing participants (excluding self) to newcomer
      const participants = [...rooms.get(roomId)].filter((id) => id !== socket.id);
      socket.emit('room-participants', participants);

      console.log(`User ${userId} (${socket.id}) joined room: ${roomId}. Participants: ${rooms.get(roomId).size}`);
    });

    // ── WebRTC Signaling ──────────────────────────────────────────────────
    // Offer: new joiner → broadcast to room (others will answer)
    socket.on('offer', ({ roomId, offer }) => {
      console.log(`Offer from ${socket.id} in room ${roomId}`);
      socket.to(roomId).emit('offer', { from: socket.id, offer });
    });

    // Answer: existing peer → send directly back to caller
    socket.on('answer', ({ answer, to }) => {
      console.log(`Answer from ${socket.id} to ${to}`);
      io.to(to).emit('answer', { from: socket.id, answer });
    });

    // ICE Candidate: broadcast to room (simpler, works for 2-person calls)
    socket.on('ice-candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('ice-candidate', { from: socket.id, candidate });
    });

    // ── Call controls ─────────────────────────────────────────────────────
    socket.on('toggle-audio', ({ roomId, muted }) => {
      socket.to(roomId).emit('participant-audio-toggle', { socketId: socket.id, muted });
    });

    socket.on('toggle-video', ({ roomId, enabled }) => {
      socket.to(roomId).emit('participant-video-toggle', { socketId: socket.id, enabled });
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const { roomId, userId } = socket.data;
      if (roomId && rooms.has(roomId)) {
        rooms.get(roomId).delete(socket.id);
        if (rooms.get(roomId).size === 0) rooms.delete(roomId);
        socket.to(roomId).emit('user-disconnected', { userId, socketId: socket.id });
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};
