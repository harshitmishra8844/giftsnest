const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Role = require("../models/Role");
const Department = require("../models/Department");
const ActivityLog = require("../models/ActivityLog");
const { logActivity } = require("../services/logService");

// Auto-generate employee sequential IDs
const generateEmployeeId = async () => {
  const count = await User.countDocuments({ isAdmin: true });
  const index = 1000 + count + 1;
  return `EMP-2026-${index}`;
};

const getEmployees = async (req, res) => {
  try {
    const employees = await User.find({ isAdmin: true })
      .populate("roles", "name permissions")
      .populate("department", "name")
      .select("-password -twoFactorSecret")
      .sort({ createdAt: -1 });

    return res.status(200).json(employees);
  } catch (error) {
    console.error("Get employees error:", error.message);
    return res.status(500).json({ message: "Failed to retrieve employee list" });
  }
};

const createEmployee = async (req, res) => {
  try {
    const { name, email, mobileNumber, password, department, designation, status, roles } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const emailLower = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      return res.status(400).json({ message: "An account with this email address already exists" });
    }

    // Auto-generate ID
    const empId = await generateEmployeeId();
    const hashedPassword = await bcrypt.hash(password, 10);

    const employee = await User.create({
      name: name.trim(),
      email: emailLower,
      password: hashedPassword,
      mobileNumber: mobileNumber || "",
      department: department || null,
      designation: designation || "",
      employeeId: empId,
      status: status || "Active",
      roles: roles || [],
      isAdmin: true,
      isMasterAdmin: false
    });

    const populatedEmployee = await User.findById(employee._id)
      .populate("roles", "name")
      .populate("department", "name")
      .select("-password");

    // Log this action
    await logActivity(
      req.user._id,
      req.user.name,
      "EMPLOYEE_CREATED",
      `Created employee account ${populatedEmployee.name} (${populatedEmployee.employeeId})`,
      req
    );

    return res.status(201).json({
      message: "Employee account created successfully",
      employee: populatedEmployee
    });
  } catch (error) {
    console.error("Create employee error:", error.message);
    return res.status(500).json({ message: "Failed to create employee account" });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobileNumber, department, designation, status, roles, password } = req.body;

    const employee = await User.findById(id);
    if (!employee || !employee.isAdmin) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Prevent modifying the Master Admin properties from standard update unless self
    if (employee.isMasterAdmin && String(req.user._id) !== String(employee._id)) {
      return res.status(403).json({ message: "Cannot modify Master Admin settings" });
    }

    if (email) {
      const emailLower = email.toLowerCase().trim();
      if (emailLower !== employee.email) {
        const emailExists = await User.findOne({ email: emailLower, _id: { $ne: id } });
        if (emailExists) {
          return res.status(400).json({ message: "Email is already taken by another account" });
        }
        employee.email = emailLower;
      }
    }

    if (name) employee.name = name.trim();
    if (mobileNumber !== undefined) employee.mobileNumber = mobileNumber;
    if (department !== undefined) employee.department = department || null;
    if (designation !== undefined) employee.designation = designation;
    if (status) employee.status = status;
    if (roles) employee.roles = roles;

    if (password) {
      employee.password = await bcrypt.hash(password, 10);
    }

    await employee.save();

    const populatedEmployee = await User.findById(employee._id)
      .populate("roles", "name")
      .populate("department", "name")
      .select("-password");

    // Log action
    await logActivity(
      req.user._id,
      req.user.name,
      "EMPLOYEE_UPDATED",
      `Updated employee account ${populatedEmployee.name} (${populatedEmployee.employeeId})`,
      req
    );

    return res.status(200).json({
      message: "Employee updated successfully",
      employee: populatedEmployee
    });
  } catch (error) {
    console.error("Update employee error:", error.message);
    return res.status(500).json({ message: "Failed to update employee account" });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await User.findById(id);
    if (!employee || !employee.isAdmin) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (employee.isMasterAdmin) {
      return res.status(403).json({ message: "Master Admin account cannot be deleted" });
    }

    await User.findByIdAndDelete(id);

    // Log action
    await logActivity(
      req.user._id,
      req.user.name,
      "EMPLOYEE_DELETED",
      `Deleted employee account ${employee.name} (${employee.employeeId})`,
      req
    );

    return res.status(200).json({ message: "Employee account deleted successfully" });
  } catch (error) {
    console.error("Delete employee error:", error.message);
    return res.status(500).json({ message: "Failed to delete employee account" });
  }
};

const getEmployeePerformance = async (req, res) => {
  try {
    // Calculate performance based on activity counts in audit logs for active admins/employees only
    const performance = await ActivityLog.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      {
        $match: {
          "userDetails": { $ne: [] },
          "userDetails.isAdmin": true
        }
      },
      {
        $group: {
          _id: { userId: "$userId", action: "$action", userName: "$userName" },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.userId",
          userName: { $first: "$_id.userName" },
          actions: {
            $push: {
              action: "$_id.action",
              count: "$count"
            }
          },
          totalActions: { $sum: "$count" }
        }
      },
      { $sort: { totalActions: -1 } }
    ]);

    return res.status(200).json(performance);
  } catch (error) {
    console.error("Get employee performance error:", error.message);
    return res.status(500).json({ message: "Failed to aggregate employee stats" });
  }
};

module.exports = {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeePerformance
};
