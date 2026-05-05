const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const upload = require("../middleware/upload");
const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

// GET all projects with images
router.get("/", async (req, res) => {
  try {
    const projects = await Project.find({ status: "PUBLISHED" })
      .populate("userId", "name email profileImage")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: projects.length, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single project with carousel images
router.get("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate("userId", "name email profileImage");
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });
    
    // Sort images by order
    project.images.sort((a, b) => a.order - b.order);
    
    res.json({
      success: true,
      data: project,
      carousel: {
        totalImages: project.images.length,
        images: project.images,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create a new project with multiple images
router.post("/create-project", upload.any(), async (req, res) => {
  try {
    const {
      title1,
      title2,
      description,
      overview,
      keyFeatures,
      role,
      deliverables,
      tags,
      figmaLink,
      liveLink,
      category,
      subcategory,
      userId,
      status = "DRAFT"
    } = req.body;

    // Validate required fields
    if (!title1 || !description || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: title1, description, userId"
      });
    }

    const uploadedImages = [];

    // Upload images to Cloudinary if provided
    if (req.files && req.files.length > 0) {
      // Filter only image files (not other form fields)
      const imageFiles = req.files.filter(file => file.fieldname === 'images');

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const uploadPromise = new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "express-mongo-server/projects",
              resource_type: "auto",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );

          Readable.from(file.buffer).pipe(uploadStream);
        });

        const result = await uploadPromise;
        uploadedImages.push({
          url: result.secure_url,
          public_id: result.public_id,
          caption: req.body.captions && req.body.captions[i] ? req.body.captions[i] : null,
          order: i,
        });
      }
    }

    // Parse JSON arrays if they come as strings
    const parsedKeyFeatures = typeof keyFeatures === 'string' ? JSON.parse(keyFeatures) : keyFeatures;
    const parsedDeliverables = typeof deliverables === 'string' ? JSON.parse(deliverables) : deliverables;
    const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;

    // Create project data
    const projectData = {
      title: title1, // Use title1 as main title
      category: category || "OTHER",
      subcategory,
      description,
      overview,
      keyFeatures: parsedKeyFeatures || [],
      role,
      deliverables: parsedDeliverables || [],
      images: uploadedImages,
      tags: parsedTags || [],
      figmaLink,
      liveLink,
      status,
      userId,
    };

    // Add title2 if provided
    if (title2) {
      projectData.title2 = title2;
    }

    const project = await Project.create(projectData);

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      projectId: project._id,
      data: project,
      uploadedImages: uploadedImages.length,
    });
  } catch (err) {
    console.error("Create project error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET all projects (admin view - includes drafts)
router.get("/admin/all", async (req, res) => {
  try {
    const { status, category, userId } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (userId) filter.userId = userId;

    const projects = await Project.find(filter)
      .populate("userId", "name email profileImage")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: projects.length, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET projects by user
router.get("/user/:userId", async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.params.userId })
      .populate("userId", "name email profileImage")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: projects.length, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH update project (partial update)
router.patch("/:id", upload.any(), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    const {
      title1,
      title2,
      description,
      overview,
      keyFeatures,
      role,
      deliverables,
      tags,
      figmaLink,
      liveLink,
      category,
      subcategory,
      status
    } = req.body;

    // Handle new image uploads
    const newImages = [];
    if (req.files && req.files.length > 0) {
      // Filter only image files
      const imageFiles = req.files.filter(file => file.fieldname === 'images');

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const uploadPromise = new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "express-mongo-server/projects",
              resource_type: "auto",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );

          Readable.from(file.buffer).pipe(uploadStream);
        });

        const result = await uploadPromise;
        newImages.push({
          url: result.secure_url,
          public_id: result.public_id,
          caption: req.body.captions && req.body.captions[i] ? req.body.captions[i] : null,
          order: project.images.length + i,
        });
      }
    }

    // Prepare update data
    const updateData = {};

    if (title1 !== undefined) updateData.title = title1;
    if (title2 !== undefined) updateData.title2 = title2;
    if (description !== undefined) updateData.description = description;
    if (overview !== undefined) updateData.overview = overview;
    if (role !== undefined) updateData.role = role;
    if (category !== undefined) updateData.category = category;
    if (subcategory !== undefined) updateData.subcategory = subcategory;
    if (status !== undefined) updateData.status = status;
    if (figmaLink !== undefined) updateData.figmaLink = figmaLink;
    if (liveLink !== undefined) updateData.liveLink = liveLink;

    // Parse and update arrays
    if (keyFeatures !== undefined) {
      updateData.keyFeatures = typeof keyFeatures === 'string' ? JSON.parse(keyFeatures) : keyFeatures;
    }
    if (deliverables !== undefined) {
      updateData.deliverables = typeof deliverables === 'string' ? JSON.parse(deliverables) : deliverables;
    }
    if (tags !== undefined) {
      updateData.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    }

    // Add new images to existing ones
    if (newImages.length > 0) {
      updateData.$push = { images: { $each: newImages } };
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("userId", "name email profileImage");

    res.json({
      success: true,
      message: "Project updated successfully",
      data: updatedProject,
      newImagesUploaded: newImages.length,
    });
  } catch (err) {
    console.error("Update project error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT replace entire project (full update)
router.put("/:id", upload.any(), async (req, res) => {
  try {
    const {
      title1,
      title2,
      description,
      overview,
      keyFeatures,
      role,
      deliverables,
      tags,
      figmaLink,
      liveLink,
      category,
      subcategory,
      userId,
      status = "DRAFT"
    } = req.body;

    // Validate required fields
    if (!title1 || !description || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: title1, description, userId"
      });
    }

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    // Delete existing images from Cloudinary
    for (const image of project.images) {
      await cloudinary.uploader.destroy(image.public_id);
    }

    // Upload new images
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      // Filter only image files
      const imageFiles = req.files.filter(file => file.fieldname === 'images');

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const uploadPromise = new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "express-mongo-server/projects",
              resource_type: "auto",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );

          Readable.from(file.buffer).pipe(uploadStream);
        });

        const result = await uploadPromise;
        uploadedImages.push({
          url: result.secure_url,
          public_id: result.public_id,
          caption: req.body.captions && req.body.captions[i] ? req.body.captions[i] : null,
          order: i,
        });
      }
    }

    // Parse JSON arrays
    const parsedKeyFeatures = typeof keyFeatures === 'string' ? JSON.parse(keyFeatures) : keyFeatures;
    const parsedDeliverables = typeof deliverables === 'string' ? JSON.parse(deliverables) : deliverables;
    const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;

    // Replace entire project
    const projectData = {
      title: title1,
      category: category || "OTHER",
      subcategory,
      description,
      overview,
      keyFeatures: parsedKeyFeatures || [],
      role,
      deliverables: parsedDeliverables || [],
      images: uploadedImages,
      tags: parsedTags || [],
      figmaLink,
      liveLink,
      status,
      userId,
    };

    if (title2) projectData.title2 = title2;

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      projectData,
      { new: true, runValidators: true, overwrite: true }
    ).populate("userId", "name email profileImage");

    res.json({
      success: true,
      message: "Project replaced successfully",
      data: updatedProject,
    });
  } catch (err) {
    console.error("Replace project error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST upload multiple images to project
router.post("/:id/upload-images", upload.any(), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No images provided" });
    }

    // Filter only image files
    const imageFiles = req.files.filter(file => file.fieldname === 'images');
    if (imageFiles.length === 0) {
      return res.status(400).json({ success: false, message: "No images provided" });
    }

    const uploadedImages = [];

    // Upload each image to Cloudinary
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "express-mongo-server/projects",
            resource_type: "auto",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        Readable.from(file.buffer).pipe(uploadStream);
      });

      const result = await uploadPromise;
      uploadedImages.push({
        url: result.secure_url,
        public_id: result.public_id,
        caption: req.body.captions && req.body.captions[i] ? req.body.captions[i] : null,
        order: project.images.length + i,
      });
    }

    // Add images to project
    project.images.push(...uploadedImages);
    await project.save();

    res.status(201).json({
      success: true,
      message: `${uploadedImages.length} images uploaded successfully`,
      data: project,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT update project details
router.put("/:id", async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE image from project carousel
router.delete("/:id/images/:imageId", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    const imageIndex = project.images.findIndex(
      (img) => img._id.toString() === req.params.imageId
    );
    if (imageIndex === -1) {
      return res.status(404).json({ success: false, message: "Image not found" });
    }

    const deletedImage = project.images[imageIndex];

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(deletedImage.public_id);

    // Remove from array
    project.images.splice(imageIndex, 1);
    await project.save();

    res.json({
      success: true,
      message: "Image deleted successfully",
      data: project,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE entire project
router.delete("/:id", async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    // Delete all images from Cloudinary
    for (const image of project.images) {
      await cloudinary.uploader.destroy(image.public_id);
    }

    res.json({ success: true, message: "Project deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT reorder carousel images
router.put("/:id/reorder-images", async (req, res) => {
  try {
    const { imageOrder } = req.body; // Array of image IDs in desired order

    if (!imageOrder || !Array.isArray(imageOrder)) {
      return res.status(400).json({ success: false, message: "Invalid image order" });
    }

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    // Update order for each image
    imageOrder.forEach((imageId, index) => {
      const image = project.images.find((img) => img._id.toString() === imageId);
      if (image) {
        image.order = index;
      }
    });

    await project.save();

    // Sort and return
    project.images.sort((a, b) => a.order - b.order);

    res.json({
      success: true,
      message: "Images reordered successfully",
      data: project,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
