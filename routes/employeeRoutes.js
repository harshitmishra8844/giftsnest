const express = require("express");
const {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeePerformance
} = require("../controllers/employeeController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/rbacMiddleware");

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.get("/", checkPermission("EMPLOYEES_MANAGE"), getEmployees);
router.post("/", checkPermission("EMPLOYEES_MANAGE"), createEmployee);
router.put("/:id", checkPermission("EMPLOYEES_MANAGE"), updateEmployee);
router.delete("/:id", checkPermission("EMPLOYEES_MANAGE"), deleteEmployee);

router.get("/performance", checkPermission("BUSINESS_ANALYTICS_VIEW"), getEmployeePerformance);

module.exports = router;
