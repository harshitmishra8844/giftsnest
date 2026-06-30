const express = require("express");
const {
  getPermissionsList,
  getRoles,
  createCustomRole,
  updateRole,
  deleteRole
} = require("../controllers/roleController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/rbacMiddleware");

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.get("/permissions", getPermissionsList);
router.get("/", getRoles);
router.post("/", checkPermission("ROLES_MANAGE"), createCustomRole);
router.put("/:id", checkPermission("ROLES_MANAGE"), updateRole);
router.delete("/:id", checkPermission("ROLES_MANAGE"), deleteRole);

module.exports = router;
