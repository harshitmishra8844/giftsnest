const cleanupService = require("../services/cleanupService");

const getPreview = async (req, res) => {
  try {
    const preview = await cleanupService.getCleanupPreview();
    return res.status(200).json(preview);
  } catch (err) {
    console.error("Cleanup preview error:", err);
    return res.status(500).json({ message: "Failed to generate cleanup preview", error: err.message });
  }
};

const triggerBackup = async (req, res) => {
  try {
    const backupMetadata = await cleanupService.createFullBackup();
    return res.status(200).json({
      message: "Complete database backup created successfully",
      backup: backupMetadata
    });
  } catch (err) {
    console.error("Backup creation error:", err);
    return res.status(500).json({ message: "Failed to create database backup", error: err.message });
  }
};

const executeCleanup = async (req, res) => {
  try {
    const { confirmation } = req.body;
    if (!confirmation || confirmation !== "CONFIRM_PRODUCTION_CLEANUP") {
      return res.status(400).json({
        message: "Invalid or missing confirmation. You must provide confirmation: 'CONFIRM_PRODUCTION_CLEANUP'"
      });
    }

    const report = await cleanupService.executeCleanup({
      confirmation,
      executedBy: req.user ? `${req.user.name} (${req.user.email})` : "Master Admin"
    });

    return res.status(200).json({
      message: "Production cleanup completed successfully",
      report
    });
  } catch (err) {
    console.error("Execute cleanup error:", err);
    return res.status(500).json({ message: "Cleanup execution failed", error: err.message });
  }
};

const getBackups = async (req, res) => {
  try {
    const backups = await cleanupService.listBackups();
    return res.status(200).json(backups);
  } catch (err) {
    console.error("Get backups error:", err);
    return res.status(500).json({ message: "Failed to list backups", error: err.message });
  }
};

const rollback = async (req, res) => {
  try {
    const { backupId, confirmation } = req.body;
    if (!backupId) {
      return res.status(400).json({ message: "backupId is required" });
    }
    if (confirmation !== "RESTORE_DATABASE") {
      return res.status(400).json({ message: "Confirmation string 'RESTORE_DATABASE' is required" });
    }

    const result = await cleanupService.rollbackFromBackup(backupId);
    return res.status(200).json({
      message: `Database successfully restored from ${backupId}`,
      result
    });
  } catch (err) {
    console.error("Rollback error:", err);
    return res.status(500).json({ message: "Rollback failed", error: err.message });
  }
};

const downloadExport = async (req, res) => {
  try {
    const { type, backupId } = req.query;
    const { filePath, filename } = cleanupService.getExportFilePath(type, backupId);
    return res.download(filePath, filename);
  } catch (err) {
    console.error("Download export error:", err);
    return res.status(404).json({ message: err.message });
  }
};

module.exports = {
  getPreview,
  triggerBackup,
  executeCleanup,
  getBackups,
  rollback,
  downloadExport
};
