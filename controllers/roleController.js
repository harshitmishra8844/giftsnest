const Role = require("../models/Role");
const { predefinedPermissions } = require("../services/seedService");
const { logActivity } = require("../services/logService");

const getPermissionsList = async (req, res) => {
  try {
    return res.status(200).json(predefinedPermissions);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load permissions configuration list" });
  }
};

const getRoles = async (req, res) => {
  try {
    const roles = await Role.find({}).sort({ isCustom: 1, name: 1 });
    return res.status(200).json(roles);
  } catch (error) {
    console.error("Get roles error:", error.message);
    return res.status(500).json({ message: "Failed to retrieve roles" });
  }
};

const createCustomRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Role name is required" });
    }

    const nameTrimmed = name.trim();
    const roleExists = await Role.findOne({ name: { $regex: new RegExp(`^${nameTrimmed}$`, "i") } });
    if (roleExists) {
      return res.status(400).json({ message: "A role with this name already exists" });
    }

    const role = await Role.create({
      name: nameTrimmed,
      description: description || "",
      permissions: permissions || [],
      isCustom: true
    });

    await logActivity(
      req.user._id,
      req.user.name,
      "ROLE_CREATED",
      `Created custom security role: ${role.name}`,
      req
    );

    return res.status(201).json({
      message: "Role created successfully",
      role
    });
  } catch (error) {
    console.error("Create role error:", error.message);
    return res.status(500).json({ message: "Failed to create custom role" });
  }
};

const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Predefined roles names cannot be modified, but description or custom roles can
    if (role.isCustom && name) {
      const nameTrimmed = name.trim();
      if (nameTrimmed.toLowerCase() !== role.name.toLowerCase()) {
        const roleExists = await Role.findOne({ name: { $regex: new RegExp(`^${nameTrimmed}$`, "i") }, _id: { $ne: id } });
        if (roleExists) {
          return res.status(400).json({ message: "Role name already in use by another role" });
        }
        role.name = nameTrimmed;
      }
    }

    if (description !== undefined) role.description = description;
    if (permissions !== undefined) role.permissions = permissions;

    await role.save();

    await logActivity(
      req.user._id,
      req.user.name,
      "ROLE_UPDATED",
      `Updated role: ${role.name}`,
      req
    );

    return res.status(200).json({
      message: "Role updated successfully",
      role
    });
  } catch (error) {
    console.error("Update role error:", error.message);
    return res.status(500).json({ message: "Failed to update role" });
  }
};

const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (!role.isCustom) {
      return res.status(403).json({ message: "Predefined system roles cannot be deleted" });
    }

    await Role.findByIdAndDelete(id);

    await logActivity(
      req.user._id,
      req.user.name,
      "ROLE_DELETED",
      `Deleted custom security role: ${role.name}`,
      req
    );

    return res.status(200).json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Delete role error:", error.message);
    return res.status(500).json({ message: "Failed to delete role" });
  }
};

module.exports = {
  getPermissionsList,
  getRoles,
  createCustomRole,
  updateRole,
  deleteRole
};
