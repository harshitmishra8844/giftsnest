require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");

// Load Models
const Ticket = require("../models/Ticket");
const TicketMessage = require("../models/TicketMessage");
const CallbackRequest = require("../models/CallbackRequest");
const CallbackRemark = require("../models/CallbackRemark");
const TaskAssignment = require("../models/TaskAssignment");
const TaskTransfer = require("../models/TaskTransfer");
const SupportNote = require("../models/SupportNote");
const EmployeeActivityLog = require("../models/EmployeeActivityLog");
const CustomerInteraction = require("../models/CustomerInteraction");
const SlaTracking = require("../models/SlaTracking");
const Role = require("../models/Role");

const ENTERPRISE_ROLES = [
  {
    name: "Master Admin",
    description: "Full unrestricted platform authority, departments, task overrides, audit logs, and system configuration.",
    permissions: [
      "ALL",
      "PRODUCTS_VIEW",
      "PRODUCTS_MANAGE",
      "INVENTORY_VIEW",
      "INVENTORY_MANAGE",
      "ORDERS_VIEW",
      "ORDERS_MANAGE",
      "ORDERS_RETURNS",
      "CUSTOMERS_VIEW",
      "CUSTOMERS_EDIT",
      "MARKETING_CAMPAIGNS",
      "TICKETS_MANAGE",
      "SUPPORT_CHAT",
      "CALLBACK_MANAGE",
      "TASK_TRANSFER",
      "TASK_REASSIGN",
      "SLA_MANAGE",
      "REPORTS_EXPORT",
      "BUSINESS_ANALYTICS_VIEW",
      "EMPLOYEES_MANAGE",
      "ROLES_MANAGE",
      "DEPARTMENTS_MANAGE",
      "ACTIVITY_LOGS_VIEW",
      "CONTENT_HOMEPAGE",
      "FINANCE_MANAGE",
    ],
    isCustom: false,
  },
  {
    name: "Operations Manager",
    description: "Operational oversight across tickets, callbacks, SLAs, inventory, returns, and reports.",
    permissions: [
      "OPERATIONS_MANAGE",
      "TICKETS_MANAGE",
      "CALLBACK_MANAGE",
      "TASK_TRANSFER",
      "ORDERS_VIEW",
      "ORDERS_RETURNS",
      "INVENTORY_VIEW",
      "CUSTOMERS_VIEW",
      "SLA_MANAGE",
      "REPORTS_EXPORT",
      "BUSINESS_ANALYTICS_VIEW",
      "ACTIVITY_LOGS_VIEW",
    ],
    isCustom: false,
  },
  {
    name: "Customer Support Manager",
    description: "Support desk leadership, agent queue management, escalation resolution, and CSAT monitoring.",
    permissions: [
      "TICKETS_MANAGE",
      "SUPPORT_CHAT",
      "CALLBACK_MANAGE",
      "TASK_TRANSFER",
      "CUSTOMERS_VIEW",
      "ORDERS_VIEW",
      "SLA_MANAGE",
      "REPORTS_EXPORT",
    ],
    isCustom: false,
  },
  {
    name: "Sales Manager",
    description: "Sales inquiry routing, commercial callbacks, marketing campaigns, and conversion analytics.",
    permissions: [
      "CALLBACK_MANAGE",
      "CUSTOMERS_VIEW",
      "ORDERS_VIEW",
      "MARKETING_CAMPAIGNS",
      "REPORTS_EXPORT",
      "BUSINESS_ANALYTICS_VIEW",
    ],
    isCustom: false,
  },
  {
    name: "Callback Executive",
    description: "Dedicated outbound calling, 11-outcome logging, follow-up scheduling, and lead qualification.",
    permissions: [
      "CALLBACK_MANAGE",
      "TICKETS_MANAGE",
      "CUSTOMERS_VIEW",
      "TASK_TRANSFER",
    ],
    isCustom: false,
  },
  {
    name: "Support Executive",
    description: "Inbound ticket resolution, live customer concierge support, and issue triaging.",
    permissions: [
      "TICKETS_MANAGE",
      "SUPPORT_CHAT",
      "CUSTOMERS_VIEW",
      "TASK_TRANSFER",
    ],
    isCustom: false,
  },
  {
    name: "Return Executive",
    description: "Return and replacement claims processing, evidence inspection, and reverse pickup scheduling.",
    permissions: [
      "ORDERS_RETURNS",
      "ORDERS_VIEW",
      "TICKETS_MANAGE",
      "TASK_TRANSFER",
    ],
    isCustom: false,
  },
  {
    name: "Refund Executive",
    description: "Financial review of refund claims, gateway verification, and settlement payouts.",
    permissions: [
      "FINANCE_MANAGE",
      "ORDERS_RETURNS",
      "ORDERS_VIEW",
      "TICKETS_MANAGE",
      "TASK_TRANSFER",
    ],
    isCustom: false,
  },
  {
    name: "Order Executive",
    description: "Order lifecycle processing, address verification, and delivery coordination.",
    permissions: [
      "ORDERS_VIEW",
      "ORDERS_MANAGE",
      "CUSTOMERS_VIEW",
      "TASK_TRANSFER",
    ],
    isCustom: false,
  },
  {
    name: "Logistics Executive",
    description: "Courier reverse pickup dispatch, tracking coordination, and shipment status management.",
    permissions: [
      "ORDERS_VIEW",
      "ORDERS_RETURNS",
      "TASK_TRANSFER",
    ],
    isCustom: false,
  },
  {
    name: "Inventory Executive",
    description: "Warehouse stock management, restocking verified returned items, and inventory thresholds.",
    permissions: [
      "INVENTORY_VIEW",
      "INVENTORY_MANAGE",
      "PRODUCTS_VIEW",
      "TASK_TRANSFER",
    ],
    isCustom: false,
  },
];

const runMigration = async () => {
  console.log("=================================================");
  console.log("🚀 STARTING ENTERPRISE PLATFORM DATABASE MIGRATION");
  console.log("=================================================");

  try {
    await connectDB();

    console.log("\n📦 1. Initializing and Syncing Indexes for All 10 Enterprise Collections...");
    const models = [
      { name: "tickets", model: Ticket },
      { name: "ticket_messages", model: TicketMessage },
      { name: "callback_requests", model: CallbackRequest },
      { name: "callback_remarks", model: CallbackRemark },
      { name: "task_assignments", model: TaskAssignment },
      { name: "task_transfers", model: TaskTransfer },
      { name: "support_notes", model: SupportNote },
      { name: "employee_activity_logs", model: EmployeeActivityLog },
      { name: "customer_interactions", model: CustomerInteraction },
      { name: "sla_tracking", model: SlaTracking },
    ];

    for (const item of models) {
      try {
        await item.model.init();
        await item.model.syncIndexes();
        const count = await item.model.countDocuments();
        console.log(`  ✓ Collection '${item.name}' indexed successfully (${count} existing documents).`);
      } catch (colErr) {
        console.warn(`  ⚠️ Warning on collection '${item.name}':`, colErr.message);
      }
    }

    console.log("\n👥 2. Seeding / Updating 11 Enterprise Roles with Granular RBAC Permissions...");
    for (const roleData of ENTERPRISE_ROLES) {
      const updatedRole = await Role.findOneAndUpdate(
        { name: roleData.name },
        {
          $set: {
            description: roleData.description,
            permissions: roleData.permissions,
            isCustom: roleData.isCustom,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`  ✓ Role '${updatedRole.name}' configured with ${updatedRole.permissions.length} permissions.`);
    }

    console.log("\n=================================================");
    console.log("✅ ENTERPRISE DATABASE MIGRATION COMPLETED SUCCESSFULLY");
    console.log("=================================================");
  } catch (err) {
    console.error("\n❌ MIGRATION FAILED:", err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed cleanly.");
  }
};

runMigration();
