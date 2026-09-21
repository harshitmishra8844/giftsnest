const express = require("express");
const {
  getEmployeeWorkDesk,
  getManagerOverview,
  transferTask,
  reassignTask,
} = require("../controllers/taskController");
const { protect } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/rbacMiddleware");

const router = express.Router();

router.use(protect);

// Employee Work Desk (Scoped to logged in employee)
router.get("/my-desk", getEmployeeWorkDesk);

// Manager & Escalation Overview
router.get("/manager-overview", checkPermission(["SLA_MANAGE", "TICKETS_MANAGE", "OPERATIONS_MANAGE", "CUSTOMERS_VIEW"]), getManagerOverview);

// Task Transfer Engine (Universal across roles)
router.post("/transfer", checkPermission(["TASK_TRANSFER", "TICKETS_MANAGE", "CALLBACK_MANAGE", "ORDERS_RETURNS"]), transferTask);

// Master Admin Override
router.patch("/:id/reassign", checkPermission(["EMPLOYEES_MANAGE", "ROLES_MANAGE"]), reassignTask);

module.exports = router;
