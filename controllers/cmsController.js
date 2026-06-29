const CmsContent = require("../models/CmsContent");
const CmsHistory = require("../models/CmsHistory");
const CmsMedia = require("../models/CmsMedia");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// In-memory cache for published CMS sections
const cmsCache = {};

// Helper to sanitize HTML content to prevent XSS
const sanitizeHtml = (html) => {
  if (typeof html !== "string") return html;
  return html
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
    .replace(/<iframe[^>]*>([\s\S]*?)<\/iframe>/gi, (match) => {
      // Allow Google Maps embeds only
      if (match.includes("google.com/maps/embed")) {
        return match;
      }
      return "";
    })
    .replace(/on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/on\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:[^"']*/gi, "");
};

// Recursive helper to sanitize all string fields in an object
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  const sanitized = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (typeof val === "string") {
        sanitized[key] = sanitizeHtml(val);
      } else if (typeof val === "object") {
        sanitized[key] = sanitizeObject(val);
      } else {
        sanitized[key] = val;
      }
    }
  }
  return sanitized;
};

// 1. GET CMS Section Content (Public)
const getCmsContent = async (req, res) => {
  const { section } = req.params;
  try {
    // Return cached value if available
    if (cmsCache[section]) {
      return res.status(200).json(cmsCache[section]);
    }

    const content = await CmsContent.findOne({ section });
    if (!content) {
      return res.status(404).json({ message: `CMS section '${section}' not found.` });
    }

    const responseData = {
      section: content.section,
      content: content.publishedContent,
      seo: content.seo,
    };

    // Cache the output
    cmsCache[section] = responseData;

    return res.status(200).json(responseData);
  } catch (error) {
    console.error(`Error fetching CMS content for ${section}:`, error.message);
    return res.status(500).json({ message: "Failed to load content." });
  }
};

// 2. GET CMS Shell Content (Aggregated Layout & Settings)
const getShellContent = async (req, res) => {
  try {
    // Serve from cache if fully populated
    if (cmsCache["cms_shell"]) {
      return res.status(200).json(cmsCache["cms_shell"]);
    }

    const sections = ["header", "footer", "announcements", "popups"];
    const records = await CmsContent.find({ section: { $in: sections } });
    const allCms = await CmsContent.find({});

    const shell = {};
    records.forEach((rec) => {
      shell[rec.section] = rec.publishedContent;
    });

    // Generate path-to-SEO mapping
    const seoMap = {};
    allCms.forEach((item) => {
      let pathKey = "";
      if (item.section === "homepage") pathKey = "/";
      else if (item.section === "about") pathKey = "/about";
      else if (item.section === "contact") pathKey = "/contact";
      else if (item.section === "policies") pathKey = "/policies";
      else if (item.section === "faq") pathKey = "/faq";
      else if (item.section === "blog") pathKey = "/blog";

      if (pathKey && item.seo && item.seo.title) {
        seoMap[pathKey] = item.seo;
      }
    });
    shell.seoMap = seoMap;

    cmsCache["cms_shell"] = shell;
    return res.status(200).json(shell);
  } catch (error) {
    console.error("Error fetching CMS shell:", error.message);
    return res.status(500).json({ message: "Failed to load site configurations." });
  }
};

// 3. GET CMS Section Content for Edit/Preview (Admin Mode)
const getCmsContentDraft = async (req, res) => {
  const { section } = req.params;
  try {
    const content = await CmsContent.findOne({ section });
    if (!content) {
      return res.status(404).json({ message: `CMS section '${section}' not found.` });
    }
    return res.status(200).json(content);
  } catch (error) {
    console.error(`Error fetching CMS draft for ${section}:`, error.message);
    return res.status(500).json({ message: "Failed to load draft content." });
  }
};

// 4. Save Draft Content (Admin Mode)
const saveDraft = async (req, res) => {
  const { section } = req.params;
  const { content, seo } = req.body;

  try {
    let cmsRecord = await CmsContent.findOne({ section });
    if (!cmsRecord) {
      return res.status(404).json({ message: `CMS section '${section}' not found.` });
    }

    // Sanitize values to prevent XSS
    const sanitizedContent = sanitizeObject(content);
    const sanitizedSeo = sanitizeObject(seo);

    cmsRecord.draftContent = sanitizedContent;
    cmsRecord.draftSeo = sanitizedSeo;
    cmsRecord.hasDraftChanges = true;
    cmsRecord.lastUpdatedBy = req.user._id;
    cmsRecord.lastUpdatedByName = req.user.name;

    await cmsRecord.save();

    return res.status(200).json({
      message: "Draft saved successfully.",
      cmsRecord,
    });
  } catch (error) {
    console.error(`Error saving draft for ${section}:`, error.message);
    return res.status(500).json({ message: "Failed to save draft." });
  }
};

// 5. Publish Content (Admin Mode)
const publishDraft = async (req, res) => {
  const { section } = req.params;

  try {
    const cmsRecord = await CmsContent.findOne({ section });
    if (!cmsRecord) {
      return res.status(404).json({ message: `CMS section '${section}' not found.` });
    }

    // Capture previous version for history log
    const prevContent = cmsRecord.publishedContent;
    const prevSeo = cmsRecord.seo;

    // Apply draft to published
    cmsRecord.publishedContent = cmsRecord.draftContent;
    cmsRecord.seo = cmsRecord.draftSeo;
    cmsRecord.hasDraftChanges = false;
    cmsRecord.lastUpdatedBy = req.user._id;
    cmsRecord.lastUpdatedByName = req.user.name;

    await cmsRecord.save();

    // Create Audit Version Log
    await CmsHistory.create({
      section,
      admin: req.user._id,
      adminName: req.user.name,
      previousContent: prevContent,
      newContent: cmsRecord.publishedContent,
      previousSeo: prevSeo,
      newSeo: cmsRecord.seo,
      action: "publish",
    });

    // Invalidate local in-memory caches
    delete cmsCache[section];
    delete cmsCache["cms_shell"];

    return res.status(200).json({
      message: "Draft published successfully.",
      cmsRecord,
    });
  } catch (error) {
    console.error(`Error publishing draft for ${section}:`, error.message);
    return res.status(500).json({ message: "Failed to publish content." });
  }
};

// 6. Revert Draft to Published Version
const revertDraft = async (req, res) => {
  const { section } = req.params;
  try {
    const cmsRecord = await CmsContent.findOne({ section });
    if (!cmsRecord) {
      return res.status(404).json({ message: `CMS section '${section}' not found.` });
    }

    cmsRecord.draftContent = cmsRecord.publishedContent;
    cmsRecord.draftSeo = cmsRecord.seo;
    cmsRecord.hasDraftChanges = false;
    await cmsRecord.save();

    return res.status(200).json({
      message: "Draft changes reverted successfully.",
      cmsRecord,
    });
  } catch (error) {
    console.error(`Error reverting draft for ${section}:`, error.message);
    return res.status(500).json({ message: "Failed to revert draft." });
  }
};

// 7. Get Section Edit Version History logs
const getHistory = async (req, res) => {
  const { section } = req.params;
  try {
    const logs = await CmsHistory.find({ section }).sort({ createdAt: -1 }).limit(30);
    return res.status(200).json(logs);
  } catch (error) {
    console.error(`Error fetching history for ${section}:`, error.message);
    return res.status(500).json({ message: "Failed to load audit history." });
  }
};

// 8. Restore specific version from history to draft content
const restoreVersion = async (req, res) => {
  const { section } = req.params;
  const { historyId } = req.body;

  try {
    const historyLog = await CmsHistory.findById(historyId);
    if (!historyLog) {
      return res.status(404).json({ message: "Version record not found." });
    }

    const cmsRecord = await CmsContent.findOne({ section });
    if (!cmsRecord) {
      return res.status(404).json({ message: `CMS section '${section}' not found.` });
    }

    // Set the historical values back to draft state
    cmsRecord.draftContent = historyLog.newContent;
    cmsRecord.draftSeo = historyLog.newSeo;
    cmsRecord.hasDraftChanges = true;
    cmsRecord.lastUpdatedBy = req.user._id;
    cmsRecord.lastUpdatedByName = req.user.name;

    await cmsRecord.save();

    // Create Audit Version Log for restore action
    await CmsHistory.create({
      section,
      admin: req.user._id,
      adminName: req.user.name,
      previousContent: cmsRecord.publishedContent,
      newContent: cmsRecord.draftContent,
      previousSeo: cmsRecord.seo,
      newSeo: cmsRecord.draftSeo,
      action: `restore_version_${historyId.substring(0, 8)}`,
    });

    return res.status(200).json({
      message: "Restored content into draft mode. Please review and publish to make it live.",
      cmsRecord,
    });
  } catch (error) {
    console.error(`Error restoring version for ${section}:`, error.message);
    return res.status(500).json({ message: "Failed to restore version." });
  }
};

// 9. Media Library Upload
const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File is required." });
    }

    const cloudinaryUrl = String(process.env.CLOUDINARY_URL || "").trim();
    const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
    const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
    const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
    const hasCloudinaryUrl = Boolean(cloudinaryUrl);
    const hasValidDiscreteCreds =
      cloudName && cloudName !== "demo-cloud" &&
      apiKey && apiKey !== "demo-key" &&
      apiSecret && apiSecret !== "demo-secret";
    const canUploadToCloudinary = hasCloudinaryUrl || hasValidDiscreteCreds;

    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    let imageUrl = "";
    let publicId = "";

    const localCmsUploadsDir = path.join(process.cwd(), "uploads", "cms");
    const ensureLocalDir = async () => {
      await fs.promises.mkdir(localCmsUploadsDir, { recursive: true });
    };

    const extensionMap = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/bmp": "bmp",
      "image/svg+xml": "svg",
      "image/avif": "avif",
      "image/heic": "heic",
      "image/heif": "heif",
    };
    const fileExt = extensionMap[req.file.mimetype] || "jpg";
    const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${fileExt}`;

    if (!canUploadToCloudinary) {
      // Fallback local storage
      await ensureLocalDir();
      const absolutePath = path.join(localCmsUploadsDir, fileName);
      await fs.promises.writeFile(absolutePath, req.file.buffer);
      imageUrl = `${protocol}://${req.get("host")}/uploads/cms/${fileName}`;
    } else {
      // Upload to Cloudinary
      try {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "gift-store/cms", resource_type: "image" },
            (error, uploaded) => {
              if (error) reject(error);
              else resolve(uploaded);
            }
          );
          stream.end(req.file.buffer);
        });
        imageUrl = result.secure_url;
        publicId = result.public_id;
      } catch (cloudinaryError) {
        console.warn("Cloudinary upload failed for CMS media, falling back to local:", cloudinaryError.message);
        // Fallback local storage
        await ensureLocalDir();
        const absolutePath = path.join(localCmsUploadsDir, fileName);
        await fs.promises.writeFile(absolutePath, req.file.buffer);
        imageUrl = `${protocol}://${req.get("host")}/uploads/cms/${fileName}`;
      }
    }

    // Save media details in the database library
    const media = await CmsMedia.create({
      url: imageUrl,
      publicId,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

    return res.status(201).json({
      message: "Media file uploaded and recorded successfully.",
      media,
    });
  } catch (error) {
    console.error("Error uploading CMS media:", error.message);
    return res.status(500).json({ message: "Failed to upload media asset." });
  }
};

// 10. GET Media Library Files
const getMedia = async (req, res) => {
  try {
    const list = await CmsMedia.find({}).sort({ createdAt: -1 });
    return res.status(200).json(list);
  } catch (error) {
    console.error("Error loading media library:", error.message);
    return res.status(500).json({ message: "Failed to load media assets." });
  }
};

// 11. DELETE Media Library File
const deleteMedia = async (req, res) => {
  const { id } = req.params;
  try {
    const media = await CmsMedia.findById(id);
    if (!media) {
      return res.status(404).json({ message: "Media asset not found." });
    }

    // Delete from Cloudinary if applicable
    if (media.publicId) {
      try {
        await cloudinary.uploader.destroy(media.publicId);
      } catch (cloudinaryError) {
        console.warn(`Failed to destroy Cloudinary resource ${media.publicId}:`, cloudinaryError.message);
      }
    } else {
      // Delete local disk file
      const filename = path.basename(media.url);
      const localFilePath = path.join(process.cwd(), "uploads", "cms", filename);
      if (fs.existsSync(localFilePath)) {
        try {
          fs.unlinkSync(localFilePath);
        } catch (fsError) {
          console.warn(`Failed to delete local file ${localFilePath}:`, fsError.message);
        }
      }
    }

    await CmsMedia.findByIdAndDelete(id);

    return res.status(200).json({ message: "Media asset deleted successfully." });
  } catch (error) {
    console.error("Error deleting CMS media asset:", error.message);
    return res.status(500).json({ message: "Failed to delete media asset." });
  }
};

module.exports = {
  getCmsContent,
  getShellContent,
  getCmsContentDraft,
  saveDraft,
  publishDraft,
  revertDraft,
  getHistory,
  restoreVersion,
  uploadMedia,
  getMedia,
  deleteMedia,
};
