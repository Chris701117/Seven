import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Setup storage engine for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'fb-page-manager',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi'],
    resource_type: 'auto' // auto-detect whether it's an image or video
  } as any
});

// Create upload middleware
export const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Utility function to upload a file directly via URL
export const uploadFromUrl = async (imageUrl: string) => {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: 'fb-page-manager',
    });
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading image from URL:', error);
    throw error;
  }
};

// Function to delete a file from Cloudinary
export const deleteFile = async (publicId: string) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    return false;
  }
};

// Extract publicId from a Cloudinary URL
export const getPublicIdFromUrl = (url: string) => {
  if (!url) return null;
  
  const urlParts = url.split('/');
  const filenameWithExtension = urlParts[urlParts.length - 1];
  const publicId = filenameWithExtension.split('.')[0];
  
  return `fb-page-manager/${publicId}`;
};

export default cloudinary;