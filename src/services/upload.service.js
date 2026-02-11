import { Readable } from "stream";
import cloudinary from "../config/cloudinary.js";

class UploadService {
    async uploadImage(fileBuffer, folder = "jlpt/images") {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    resource_type: "image",
                    transformation: [
                        { width: 1200, crop: "limit" },
                        { quality: "auto" },
                        { fetch_format: "auto" },
                    ],
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({
                            url: result.secure_url,
                            publicId: result.public_id,
                        });
                    }
                },
            );

            Readable.from(fileBuffer).pipe(uploadStream);
        });
    }

    async uploadAudio(fileBuffer, folder = "jlpt/audio") {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    resource_type: "video",
                    format: "mp3",
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({
                            url: result.secure_url,
                            publicId: result.public_id,
                            duration: result.duration,
                        });
                    }
                },
            );

            Readable.from(fileBuffer).pipe(uploadStream);
        });
    }

    async deleteFile(publicId) {
        try {
            const result = await cloudinary.uploader.destroy(publicId);
            return result;
        } catch (error) {
            throw new Error("Failed to delete file from Cloudinary");
        }
    }

    async uploadMultipleImages(files, folder = "jlpt/images") {
        const uploadPromises = files.map((file) => this.uploadImage(file.buffer, folder));
        return Promise.all(uploadPromises);
    }
}

export default new UploadService();
