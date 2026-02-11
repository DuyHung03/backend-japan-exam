import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
    const allowedAudioTypes = /mp3|wav|ogg|m4a/;

    const extname = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype;

    if (file.fieldname === "image" || file.fieldname === "images") {
        const isImage = allowedImageTypes.test(extname) && mimetype.startsWith("image/");

        if (isImage) {
            return cb(null, true);
        } else {
            return cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"));
        }
    }

    if (file.fieldname === "audio") {
        const isAudio = allowedAudioTypes.test(extname) && mimetype.startsWith("audio/");

        if (isAudio) {
            return cb(null, true);
        } else {
            return cb(new Error("Only audio files are allowed (mp3, wav, ogg, m4a)"));
        }
    }

    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
});

export default upload;
