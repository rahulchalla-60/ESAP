import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'esap-services',
    allowed_formats: ['jpg', 'png', 'jpeg', 'mp4'],
  },
});

export { cloudinary, storage };
// This module configures Cloudinary for file uploads.
// It sets up the Cloudinary instance with credentials from environment variables