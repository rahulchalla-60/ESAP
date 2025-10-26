import Service from "../models/Service.js";
import { asyncHandler } from "../middleware/errorMiddleware.js";
import config from "../config/environment.js";

// @desc    Create a service (provider only)
// @route   POST /api/services
// @access  Private (provider only)
export const createService = asyncHandler(async (req, res) => {
  const { serviceName, description, price, media } = req.body;

  // Validate required fields
  if (!serviceName || !price) {
    return res.status(400).json({ 
      success: false,
      message: "Service name and price are required" 
    });
  }

  // Check user role
  if (req.user.role !== "provider") {
    return res.status(403).json({ 
      success: false,
      message: "Only providers can create services" 
    });
  }

  // Validate price
  if (isNaN(price) || price < 0) {
    return res.status(400).json({ 
      success: false,
      message: "Price must be a valid positive number" 
    });
  }

  // Process and validate media files
  let mediaArray = [];
  if (media && Array.isArray(media)) {
    for (const item of media) {
      if (!item.data || !item.contentType) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid media file format" 
        });
      }

      // Validate content type
      if (!config.allowedImageTypes.includes(item.contentType)) {
        return res.status(400).json({ 
          success: false,
          message: `Invalid file type. Allowed types: ${config.allowedImageTypes.join(', ')}` 
        });
      }

      try {
        const buffer = Buffer.from(item.data, 'base64');
        
        // Check file size (base64 is ~33% larger than original)
        if (buffer.length > config.maxFileSize) {
          return res.status(400).json({ 
            success: false,
            message: `File size too large. Maximum size: ${Math.floor(config.maxFileSize / (1024 * 1024))}MB` 
          });
        }

        mediaArray.push({
          data: buffer,
          contentType: item.contentType,
          filename: item.filename || undefined,
        });
      } catch (error) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid base64 image data" 
        });
      }
    }
  }

  const service = await Service.create({
    provider: req.user._id,
    serviceName: serviceName.trim(),
    description: description ? description.trim() : undefined,
    price: parseFloat(price),
    media: mediaArray,
  });

  res.status(201).json({
    success: true,
    message: "Service created successfully",
    data: service
  });
});

// @desc    Get all services or filter by name/provider
// @route   GET /api/services
// @access  Public
export const getServices = asyncHandler(async (req, res) => {
  const { search, sortBy, order = 'asc', minPrice, maxPrice, page = 1, limit = 10 } = req.query;

  // Validate pagination parameters
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10)); // Max 50 items per page

  let filter = {};
  if (search) {
    const searchTerm = search.trim();
    if (searchTerm) {
      filter.$or = [
        { serviceName: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
      ];
    }
  }

  // Validate price filters
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min) && min >= 0) {
        filter.price.$gte = min;
      }
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max) && max >= 0) {
        filter.price.$lte = max;
      }
    }
  }

  const sortOptions = {};
  const validSortFields = ['serviceName', 'price', 'createdAt', 'ratings'];
  if (sortBy && validSortFields.includes(sortBy)) {
    sortOptions[sortBy] = order === 'desc' ? -1 : 1;
  } else {
    sortOptions.createdAt = -1; // Default sort by newest
  }

  const skip = (pageNum - 1) * limitNum;

  const services = await Service.find(filter)
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .populate('provider', 'name contact');

  const total = await Service.countDocuments(filter);

  res.json({
    success: true,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    services,
  });
});

// @desc    Update a service (provider only, owner only)
// @route   PUT /api/services/:id
// @access  Private (provider only)
export const updateService = asyncHandler(async (req, res) => {
  const { serviceName, description, price, media } = req.body;
  const serviceId = req.params.id;

  // Validate required fields
  if (!serviceName || !price) {
    return res.status(400).json({ 
      success: false,
      message: "Service name and price are required" 
    });
  }

  // Validate price
  if (isNaN(price) || price < 0) {
    return res.status(400).json({ 
      success: false,
      message: "Price must be a valid positive number" 
    });
  }

  // Find the service
  const service = await Service.findById(serviceId);
  if (!service) {
    return res.status(404).json({ 
      success: false,
      message: "Service not found" 
    });
  }

  // Check if user is the owner of the service
  if (service.provider.toString() !== req.user._id.toString()) {
    return res.status(403).json({ 
      success: false,
      message: "You can only update your own services" 
    });
  }

  // Process and validate media files
  let mediaArray = [];
  if (media && Array.isArray(media)) {
    for (const item of media) {
      if (!item.data || !item.contentType) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid media file format" 
        });
      }

      // Validate content type
      if (!config.allowedImageTypes.includes(item.contentType)) {
        return res.status(400).json({ 
          success: false,
          message: `Invalid file type. Allowed types: ${config.allowedImageTypes.join(', ')}` 
        });
      }

      try {
        const buffer = Buffer.from(item.data, 'base64');
        
        // Check file size
        if (buffer.length > config.maxFileSize) {
          return res.status(400).json({ 
            success: false,
            message: `File size too large. Maximum size: ${Math.floor(config.maxFileSize / (1024 * 1024))}MB` 
          });
        }

        mediaArray.push({
          data: buffer,
          contentType: item.contentType,
          filename: item.filename || undefined,
        });
      } catch (error) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid base64 image data" 
        });
      }
    }
  }

  // Update the service
  const updatedService = await Service.findByIdAndUpdate(
    serviceId,
    {
      serviceName: serviceName.trim(),
      description: description ? description.trim() : undefined,
      price: parseFloat(price),
      media: mediaArray,
    },
    { new: true }
  ).populate('provider', 'name contact');

  res.json({
    success: true,
    message: "Service updated successfully",
    data: updatedService
  });
});

// @desc    Delete a service (provider only, owner only)
// @route   DELETE /api/services/:id
// @access  Private (provider only)
export const deleteService = asyncHandler(async (req, res) => {
  const serviceId = req.params.id;

  // Find the service
  const service = await Service.findById(serviceId);
  if (!service) {
    return res.status(404).json({ 
      success: false,
      message: "Service not found" 
    });
  }

  // Check if user is the owner of the service
  if (service.provider.toString() !== req.user._id.toString()) {
    return res.status(403).json({ 
      success: false,
      message: "You can only delete your own services" 
    });
  }

  // Delete the service
  await Service.findByIdAndDelete(serviceId);

  res.json({ 
    success: true,
    message: "Service deleted successfully" 
  });
});

// This controller handles service-related operations.
// It includes functionality to create a service (restricted to providers) and to retrieve services with optional filtering and sorting.