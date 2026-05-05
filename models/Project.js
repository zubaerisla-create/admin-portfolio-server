const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Project title is required"],
      trim: true,
    },
    title2: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["SAAS", "WEB", "MOBILE", "DESIGN", "OTHER"],
    },
    subcategory: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    overview: {
      type: String,
      trim: true,
    },
    keyFeatures: [
      {
        type: String,
      },
    ],
    role: {
      type: String,
      trim: true,
    },
    deliverables: [
      {
        type: String,
      },
    ],
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        public_id: {
          type: String,
          required: true,
        },
        caption: {
          type: String,
          default: null,
        },
        order: {
          type: Number,
          default: 0,
        },
      },
    ],
    tags: [
      {
        type: String,
      },
    ],
    figmaLink: {
      type: String,
      default: null,
    },
    liveLink: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      default: "DRAFT",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Project", projectSchema);
