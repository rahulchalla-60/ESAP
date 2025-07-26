import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
export const registerUser = async (req, res) => {
  const { name, contact, password, role, photo } = req.body;

  try {
    // Check if user already exists
    const userExists = await User.findOne({ contact });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Prepare photo field if provided
    let photoField = undefined;
    if (photo && photo.data && photo.contentType) {
      photoField = {
        data: Buffer.from(photo.data, 'base64'),
        contentType: photo.contentType,
      };
    }

    // Create new user
    const user = await User.create({ name, contact, password, role, photo: photoField });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        contact: user.contact,
        role: user.role,
        hasPhoto: !!user.photo && !!user.photo.data,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req, res) => {
  const { contact, password } = req.body;

  try {
    const user = await User.findOne({ contact });

    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        contact: user.contact,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid contact or password" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
