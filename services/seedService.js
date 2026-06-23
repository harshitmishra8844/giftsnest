const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Role = require("../models/Role");
const Department = require("../models/Department");
const EmailSetting = require("../models/EmailSetting");

const predefinedPermissions = [
  // Products
  { code: "PRODUCTS_VIEW", name: "View Products", group: "Products" },
  { code: "PRODUCTS_CREATE", name: "Create Products", group: "Products" },
  { code: "PRODUCTS_EDIT", name: "Edit Products", group: "Products" },
  { code: "PRODUCTS_DELETE", name: "Delete Products", group: "Products" },
  { code: "CATEGORIES_MANAGE", name: "Manage Categories", group: "Products" },

  // Inventory
  { code: "INVENTORY_VIEW", name: "View Inventory", group: "Inventory" },
  { code: "INVENTORY_MANAGE", name: "Manage Inventory", group: "Inventory" },

  // Orders
  { code: "ORDERS_VIEW", name: "View Orders", group: "Orders" },
  { code: "ORDERS_STATUS", name: "Update Order Status", group: "Orders" },
  { code: "ORDERS_SHIPPING", name: "Generate Shipping Labels", group: "Orders" },
  { code: "ORDERS_RETURNS", name: "Manage Returns & Refunds", group: "Orders" },

  // Customers
  { code: "CUSTOMERS_VIEW", name: "View Customers", group: "Customers" },
  { code: "TICKETS_MANAGE", name: "Manage Support Tickets", group: "Customers" },
  { code: "SUPPORT_CHAT", name: "Handle Live Chat Support", group: "Customers" },
  { code: "SUPPORT_EMAIL", name: "Handle Email Support", group: "Customers" },

  // Marketing
  { code: "COUPONS_MANAGE", name: "Manage Coupons", group: "Marketing" },
  { code: "MARKETING_CAMPAIGNS", name: "Manage Campaigns (SMS/Email/Push)", group: "Marketing" },
  { code: "BANNER_MANAGE", name: "Manage Banners & Promos", group: "Marketing" },

  // Finance
  { code: "FINANCE_VIEW", name: "View Finance Reports & Revenue", group: "Finance" },
  { code: "FINANCE_MANAGE", name: "Manage Transactions & Payouts", group: "Finance" },

  // Content
  { code: "CONTENT_HOMEPAGE", name: "Manage Homepage Content", group: "Content" },
  { code: "CONTENT_BLOGS", name: "Manage Blog Posts", group: "Content" },
  { code: "CONTENT_SEO", name: "Manage SEO & Sitemaps", group: "Content" },

  // Management & Security (Super Admin)
  { code: "EMPLOYEES_MANAGE", name: "Manage Employee Accounts", group: "Administration" },
  { code: "ROLES_MANAGE", name: "Manage Roles & Permissions Matrix", group: "Administration" },
  { code: "DEPARTMENTS_MANAGE", name: "Manage Departments", group: "Administration" },
  { code: "ACTIVITY_LOGS_VIEW", name: "View System Activity Logs", group: "Administration" },
  { code: "BUSINESS_ANALYTICS_VIEW", name: "View Complete Business Analytics", group: "Administration" },
];

const seedDB = async () => {
  try {
    console.log("[seeder] Starting database seeding...");

    // 1. Seed Departments
    const departments = [
      { name: "Sales", description: "Sales department, deals, leads, and orders." },
      { name: "Marketing", description: "Promotional campaigns, coupons, and newsletters." },
      { name: "Operations", description: "General daily tasks, order processing, and warehousing." },
      { name: "Customer Support", description: "Customer chat, complaints, queries, and refunds." },
      { name: "Finance", description: "Accounting, revenue tracking, tax filings, and payout audits." },
      { name: "Content", description: "Blog administration, homepage content, banners, and store descriptions." },
      { name: "Inventory", description: "Stock lists, item catalog replenishment, and low stock planning." },
      { name: "IT", description: "System maintenance, settings controls, and developer operations." }
    ];

    const departmentMap = {};
    for (const dept of departments) {
      let doc = await Department.findOne({ name: dept.name });
      if (!doc) {
        doc = await Department.create(dept);
        console.log(`[seeder] Created department: ${dept.name}`);
      }
      departmentMap[dept.name] = doc._id;
    }

    // 2. Seed Predefined Roles
    const roles = [
      {
        name: "Product Manager",
        description: "Manages catalog, inventory levels, categories and items details.",
        isCustom: false,
        permissions: [
          "PRODUCTS_VIEW", "PRODUCTS_CREATE", "PRODUCTS_EDIT", "PRODUCTS_DELETE",
          "CATEGORIES_MANAGE", "INVENTORY_VIEW", "INVENTORY_MANAGE"
        ]
      },
      {
        name: "Order Manager",
        description: "Handles logistics, updates processing flags, downloads bills and handles refunds.",
        isCustom: false,
        permissions: [
          "ORDERS_VIEW", "ORDERS_STATUS", "ORDERS_SHIPPING", "ORDERS_RETURNS"
        ]
      },
      {
        name: "Customer Support",
        description: "Assists users, responds to complains, live chat triggers and email support tickets.",
        isCustom: false,
        permissions: [
          "CUSTOMERS_VIEW", "TICKETS_MANAGE", "SUPPORT_CHAT", "SUPPORT_EMAIL"
        ]
      },
      {
        name: "Marketing Manager",
        description: "Administers discount systems, manages promotional popups and campaign builders.",
        isCustom: false,
        permissions: [
          "COUPONS_MANAGE", "MARKETING_CAMPAIGNS", "BANNER_MANAGE"
        ]
      },
      {
        name: "Finance Manager",
        description: "Audits income, inspects payment gateway reports and initiates payout requests.",
        isCustom: false,
        permissions: [
          "FINANCE_VIEW", "FINANCE_MANAGE"
        ]
      },
      {
        name: "Content Manager",
        description: "Designs landing setups, writes SEO descriptions and hosts content logs.",
        isCustom: false,
        permissions: [
          "CONTENT_HOMEPAGE", "CONTENT_BLOGS", "BANNER_MANAGE", "CONTENT_SEO"
        ]
      }
    ];

    for (const r of roles) {
      let doc = await Role.findOne({ name: r.name });
      if (!doc) {
        await Role.create(r);
        console.log(`[seeder] Created predefined role: ${r.name}`);
      } else {
        // Automatically sync permissions of predefined roles if needed, or leave custom roles
        if (!doc.isCustom) {
          doc.permissions = r.permissions;
          doc.description = r.description;
          await doc.save();
        }
      }
    }

    // 3. Ensure Master Admin account exists
    const masterEmail = (process.env.ADMIN_EMAIL || "niyoragifts@gmail.com").toLowerCase().trim();
    const masterPassword = process.env.ADMIN_PASSWORD || "harshit@123";

    let masterAdmin = await User.findOne({ email: masterEmail });
    if (!masterAdmin) {
      const hashedPassword = await bcrypt.hash(masterPassword, 10);
      
      // Assign IT department if found
      const itDeptId = departmentMap["IT"] || null;

      masterAdmin = await User.create({
        name: "Master Admin",
        email: masterEmail,
        password: hashedPassword,
        isAdmin: true,
        isMasterAdmin: true,
        employeeId: "EMP-MASTER-001",
        designation: "Chief Technical Officer",
        department: itDeptId,
        status: "Active",
      });
      console.log(`[seeder] Created default Master Admin account: ${masterEmail}`);
    } else {
      // Ensure existing admin document matches master flags if it has the master email
      let changed = false;
      if (!masterAdmin.isAdmin) {
        masterAdmin.isAdmin = true;
        changed = true;
      }
      if (!masterAdmin.isMasterAdmin) {
        masterAdmin.isMasterAdmin = true;
        changed = true;
      }
      if (changed) {
        await masterAdmin.save();
        console.log(`[seeder] Updated existing user ${masterEmail} to hold Master Admin privileges`);
      }
    }

    // 4. Seed Default Email Configurations
    const emailSettingsExist = await EmailSetting.findOne({ singletonKey: "email" });
    if (!emailSettingsExist) {
      await EmailSetting.create({
        singletonKey: "email",
        adminEmails: [masterEmail],
        supportEmails: [masterEmail],
      });
      console.log(`[seeder] Created default Email Settings with recipient: ${masterEmail}`);
    }

    console.log("[seeder] Database seeding finished successfully.");
  } catch (error) {
    console.error("[seeder] Database seeding error:", error);
  }
};

module.exports = { seedDB, predefinedPermissions };
