import Service from "../models/Service.js";

// @desc    Create a service (provider only)
// @route   POST /api/services
// @access  Private (provider only)
export const createService = async (req, res) => {
  const { serviceName, description, price } = req.body;

  if (req.user.role !== "provider") {
    return res.status(403).json({ message: "Only providers can create services" });
  }

  // Get uploaded image URLs
  const media = req.files.map(file => file.path);

  const service = await Service.create({
    provider: req.user._id,
    serviceName,
    description,
    price,
    media,
  });

  res.status(201).json(service);
};

// @desc    Get all services or filter by name/provider
// @route   GET /api/services
// @access  Public
export const getServices = async (req, res) => {
  const { search, sortBy, order = 'asc', minPrice, maxPrice, page = 1, limit = 10 } = req.query;

  let filter = {};
  if (search) {
    filter.$or = [
      { serviceName: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const sortOptions = {};
  if (sortBy) sortOptions[sortBy] = order === 'desc' ? -1 : 1;

  const skip = (Number(page) - 1) * Number(limit);

  const services = await Service.find(filter)
    .sort(sortOptions)
    .skip(skip)
    .limit(Number(limit))
    .populate('provider', 'name contact');

  const total = await Service.countDocuments(filter);

  res.json({
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    services,
  });
};

// This controller handles service-related operations.
// It includes functionality to create a service (restricted to providers) and to retrieve services with optional filtering and sorting.