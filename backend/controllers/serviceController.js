import Service from "../models/Service.js";

// @desc    Create a service (provider only)
// @route   POST /api/services
// @access  Private (provider only)
export const createService = async (req, res) => {
  const { serviceName, description, price, media } = req.body;

  if (req.user.role !== "provider") {
    return res.status(403).json({ message: "Only providers can create services" });
  }

  // Convert media base64 data to Buffers
  const mediaArray = Array.isArray(media) ? media.map(item => ({
    data: Buffer.from(item.data, 'base64'),
    contentType: item.contentType,
    filename: item.filename || undefined,
  })) : [];

  const service = await Service.create({
    provider: req.user._id,
    serviceName,
    description,
    price,
    media: mediaArray,
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

// @desc    Update a service (provider only, owner only)
// @route   PUT /api/services/:id
// @access  Private (provider only)
export const updateService = async (req, res) => {
  try {
    const { serviceName, description, price, media } = req.body;
    const serviceId = req.params.id;

    // Find the service
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Check if user is the owner of the service
    if (service.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only update your own services" });
    }

    // Convert media base64 data to Buffers
    const mediaArray = Array.isArray(media) ? media.map(item => ({
      data: Buffer.from(item.data, 'base64'),
      contentType: item.contentType,
      filename: item.filename || undefined,
    })) : [];

    // Update the service
    const updatedService = await Service.findByIdAndUpdate(
      serviceId,
      {
        serviceName,
        description,
        price,
        media: mediaArray,
      },
      { new: true }
    ).populate('provider', 'name contact');

    res.json(updatedService);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete a service (provider only, owner only)
// @route   DELETE /api/services/:id
// @access  Private (provider only)
export const deleteService = async (req, res) => {
  try {
    const serviceId = req.params.id;

    // Find the service
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Check if user is the owner of the service
    if (service.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own services" });
    }

    // Delete the service
    await Service.findByIdAndDelete(serviceId);

    res.json({ message: "Service deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// This controller handles service-related operations.
// It includes functionality to create a service (restricted to providers) and to retrieve services with optional filtering and sorting.