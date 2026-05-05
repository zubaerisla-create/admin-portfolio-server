const multer = require("multer");
const path = require("path");

// Configure multer for in-memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allow only image files
  const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Custom middleware to handle both files and text fields
const uploadWithFields = (fields) => {
  return (req, res, next) => {
    const multerUpload = multer({
      storage,
      fileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }).fields(fields);

    multerUpload(req, res, (err) => {
      if (err) {
        return next(err);
      }

      // Ensure req.body is populated from form fields
      if (!req.body) {
        req.body = {};
      }

      // Move form fields to req.body
      for (const field of fields) {
        if (field.name !== 'images' && req.body[field.name]) {
          // Keep as is
        }
      }

      next();
    });
  };
};

module.exports = upload;
module.exports.uploadWithFields = uploadWithFields;
