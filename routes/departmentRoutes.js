const express = require("express");
const {
  getDepartments,
  createDepartment,
  deleteDepartment
} = require("../controllers/departmentController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/rbacMiddleware");

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.get("/", checkPermission("DEPARTMENTS_MANAGE"), getDepartments);
router.post("/", checkPermission("DEPARTMENTS_MANAGE"), createDepartment);
router.delete("/:id", checkPermission("DEPARTMENTS_MANAGE"), deleteDepartment);

module.exports = router;
