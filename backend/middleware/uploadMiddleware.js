import multer from 'multer';
import { storage } from '../utils/cloudinary.js';

const upload = multer({ storage });

export default upload;
// This middleware uses multer to handle file uploads.
// It uses Cloudinary for storage, allowing files to be uploaded directly to the cloud.