const Department = require("../models/Department");
const { logActivity } = require("../services/logService");

const getDepartments = async (req, res) => {
  try {
    const depts = await Department.find({}).sort({ name: 1 });
    return res.status(200).json(depts);
  } catch (error) {
    console.error("Get departments error:", error.message);
    return res.status(500).json({ message: "Failed to retrieve departments" });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Department name is required" });
    }

    const nameTrimmed = name.trim();
    const deptExists = await Department.findOne({ name: { $regex: new RegExp(`^${nameTrimmed}$`, "i") } });
    if (deptExists) {
      return res.status(400).json({ message: "Department already exists" });
    }

    const dept = await Department.create({
      name: nameTrimmed,
      description: description || ""
    });

    await logActivity(
      req.user._id,
      req.user.name,
      "DEPARTMENT_CREATED",
      `Created department: ${dept.name}`,
      req
    );

    return res.status(201).json({
      message: "Department created successfully",
      department: dept
    });
  } catch (error) {
    console.error("Create department error:", error.message);
    return res.status(500).json({ message: "Failed to create department" });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ message: "Department not found" });
    }

    await Department.findByIdAndDelete(id);

    await logActivity(
      req.user._id,
      req.user.name,
      "DEPARTMENT_DELETED",
      `Deleted department: ${dept.name}`,
      req
    );

    return res.status(200).json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error("Delete department error:", error.message);
    return res.status(500).json({ message: "Failed to delete department" });
  }
};

module.exports = {
  getDepartments,
  createDepartment,
  deleteDepartment
};
