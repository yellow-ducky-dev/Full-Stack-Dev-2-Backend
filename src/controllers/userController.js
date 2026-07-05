import User from '../models/User.js';

// @route  GET /api/users/me
export const getMe = async (req, res) => {
  res.json(req.user);
};

// @route  GET /api/users
// Returns paginated list, optionally filtered by role
export const getUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 20, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { startupName: { $regex: search, $options: 'i' } },
        { industry: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);
    res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  GET /api/users/:id
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  PUT /api/users/:id
export const updateUser = async (req, res) => {
  try {
    // Only allow owner or don't allow password changes through this route
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Not authorized to update this profile.' });
    }

    const disallowed = ['password', 'email', 'role', '_id', 'walletBalance'];
    disallowed.forEach((field) => delete req.body[field]);

    const updated = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  PUT /api/users/me/avatar  (base64 avatar update)
export const updateAvatar = async (req, res) => {
  try {
    const { avatarUrl } = req.body;
    req.user.avatarUrl = avatarUrl;
    await req.user.save();
    res.json({ avatarUrl: req.user.avatarUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
