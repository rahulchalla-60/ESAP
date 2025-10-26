import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { asyncHandler } from "../middleware/errorMiddleware.js";
import config from "../config/environment.js";

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
export const registerUser = asyncHandler(async (req, res) => {
  const { name, contact, password, role, photo } = req.body;

  // Validate required fields
  if (!name || !contact || !password) {
    return res.status(400).json({ 
      success: false,
      message: "Name, contact, and password are required" 
    });
  }

  // Validate role
  if (role && !['provider', 'getter'].includes(role)) {
    return res.status(400).json({ 
      success: false,
      message: "Role must be either 'provider' or 'getter'" 
    });
  }

  // Validate password strength
  if (password.length < 6) {
    return res.status(400).json({ 
      success: false,
      message: "Password must be at least 6 characters long" 
    });
  }

  // Check if user already exists
  const userExists = await User.findOne({ contact });
  if (userExists) {
    return res.status(400).json({ 
      success: false,
      message: "User with this contact already exists" 
    });
  }

  // Prepare photo field if provided
  let photoField = undefined;
  if (photo && photo.data && photo.contentType) {
    // Validate photo content type
    if (!config.allowedImageTypes.includes(photo.contentType)) {
      return res.status(400).json({ 
        success: false,
        message: `Invalid image type. Allowed types: ${config.allowedImageTypes.join(', ')}` 
      });
    }

    try {
      const buffer = Buffer.from(photo.data, 'base64');
      
      // Check file size
      if (buffer.length > config.maxFileSize) {
        return res.status(400).json({ 
          success: false,
          message: `Image size too large. Maximum size: ${Math.floor(config.maxFileSize / (1024 * 1024))}MB` 
        });
      }

      photoField = {
        data: buffer,
        contentType: photo.contentType,
      };
    } catch (error) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid base64 image data" 
      });
    }
  }

  // Create new user
  const user = await User.create({ 
    name: name.trim(), 
    contact: contact.trim().toLowerCase(), 
    password, 
    role: role || 'getter', 
    photo: photoField 
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      _id: user._id,
      name: user.name,
      contact: user.contact,
      role: user.role,
      hasPhoto: !!user.photo && !!user.photo.data,
      token: generateToken(user._id),
    }
  });
});

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
export const loginUser = asyncHandler(async (req, res) => {
  const { contact, password } = req.body;

  // Validate required fields
  if (!contact || !password) {
    return res.status(400).json({ 
      success: false,
      message: "Contact and password are required" 
    });
  }

  // Find user and check password
  const user = await User.findOne({ contact: contact.trim().toLowerCase() });

  if (user && (await user.comparePassword(password))) {
    res.json({
      success: true,
      message: "Login successful",
      data: {
        _id: user._id,
        name: user.name,
        contact: user.contact,
        role: user.role,
        token: generateToken(user._id),
      }
    });
  } else {
    res.status(401).json({ 
      success: false,
      message: "Invalid contact or password" 
    });
  }
});
