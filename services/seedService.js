const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Role = require("../models/Role");
const Department = require("../models/Department");
const EmailSetting = require("../models/EmailSetting");
const CmsContent = require("../models/CmsContent");

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
  { code: "CUSTOMERS_VIEW", name: "View Customers & History", group: "Customers" },
  { code: "CUSTOMERS_EDIT", name: "Edit Customer Status & Private Notes", group: "Customers" },
  { code: "CUSTOMERS_NOTIFY", name: "Send Administrative Notifications", group: "Customers" },
  { code: "CUSTOMERS_EXPORT", name: "Export Customer Records Data", group: "Customers" },
  { code: "CUSTOMERS_DELETE", name: "Deactivate/Soft Delete Customers", group: "Customers" },
  { code: "CUSTOMERS_PURGE", name: "Permanently Purge Customer Accounts", group: "Customers" },
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
          "CUSTOMERS_VIEW", "CUSTOMERS_EDIT", "CUSTOMERS_NOTIFY", "TICKETS_MANAGE", "SUPPORT_CHAT", "SUPPORT_EMAIL"
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

    // 5. Seed CMS content
    await seedCmsContent();

    console.log("[seeder] Database seeding finished successfully.");
  } catch (error) {
    console.error("[seeder] Database seeding error:", error);
  }
};

const seedCmsContent = async () => {
  try {
    const defaultSections = [
      {
        section: "homepage",
        publishedContent: {
          heroTitle: "Celebrate every moment with premium gifts",
          heroSubtitle: "Curated Boutique",
          heroDescription: "Flowers, cakes, and personalized surprises crafted with elegance, delivered with care, and remembered forever.",
          heroButtonText: "Explore Catalog",
          heroButtonLink: "/products",
          heroImages: [
            "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=1200&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1200&auto=format&fit=crop&q=80"
          ],
          featuredCategories: [
            { name: "Birthday", image: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=300&h=300&fit=crop&crop=center" },
            { name: "Anniversary", image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=300&h=300&fit=crop&crop=center" },
            { name: "Flowers", image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=300&h=300&fit=crop&crop=center" },
            { name: "Cakes", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&h=300&fit=crop&crop=center" },
            { name: "Personalized Gifts", image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300&h=300&fit=crop&crop=center" },
            { name: "Plants", image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300&h=300&fit=crop&crop=center" }
          ],
          featuredProductsSection: {
            title: "Shop by Category",
            subtitle: "Elegant selections"
          },
          testimonials: [
            { name: "Riya S.", text: "Beautiful packaging and super fast same-day delivery. Loved it!", verified: true },
            { name: "Aman K.", text: "The bouquet + cake combo was exactly like the photo. Great experience.", verified: true },
            { name: "Neha P.", text: "Personalized gift quality was premium. Will order again.", verified: true }
          ],
          whyChooseUs: [
            { title: "Handpicked Quality", text: "Every product is curated with a focus on freshness, premium presentation and gifting value." },
            { title: "Reliable Delivery", text: "Same-day and slot-based delivery options help your surprise reach on time, every time." },
            { title: "Personal Touch", text: "From custom messages to thoughtful packaging, we help you make each gift truly memorable." }
          ],
          newsletterSection: {
            title: "Stay Updated",
            description: "Get festive offers and latest collections in your inbox."
          }
        },
        seo: {
          title: "Niyora Gifts | Flowers, Cakes & Personalized Gifts",
          description: "Shop flowers, cakes and personalized gifts at Niyora Gifts with same-day delivery and premium packaging.",
          keywords: "gift store, flowers delivery, cakes online, personalized gifts, same day delivery",
          ogTitle: "Niyora Gifts | Flowers, Cakes & Personalized Gifts",
          ogDescription: "Discover curated gifts for birthdays, anniversaries and special moments with fast delivery.",
          ogImage: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800"
        }
      },
      {
        section: "header",
        publishedContent: {
          logoText: "Niyora Gifts",
          logoImage: "",
          navigationMenu: [
            { label: "Home", link: "/" },
            { label: "Products", link: "/products" },
            { label: "About Us", link: "/about" }
          ],
          contactNumber: "+91 90000 00000",
          emailAddress: "niyoragifts@gmail.com",
          searchPlaceholder: "Search for premium flowers, cakes, customized gifts..."
        },
        seo: {}
      },
      {
        section: "footer",
        publishedContent: {
          logoText: "Niyora Gifts",
          logoImage: "",
          aboutText: "Premium flowers, cakes and personalized gifts curated for celebrations that deserve a beautiful, lasting memory.",
          quickLinks: [
            { label: "Home", link: "/" },
            { label: "About", link: "/about" },
            { label: "Products", link: "/products" },
            { label: "Cart", link: "/cart" }
          ],
          customerServiceLinks: [
            { label: "Track Order", link: "/track-order" },
            { label: "Shipping Policy", link: "/shipping-policy" },
            { label: "Returns, Refunds & Replacement", link: "/returns-refunds" }
          ],
          contactDetails: {
            address: "Premium Gifting Hub, Delhi, India",
            phone: "+91 90000 00000",
            email: "niyoragifts@gmail.com"
          },
          socialMediaLinks: [
            { name: "instagram", link: "https://instagram.com" },
            { name: "facebook", link: "https://facebook.com" },
            { name: "x", link: "https://x.com" }
          ],
          copyrightText: "© 2026 Niyora Gifts. All rights reserved."
        },
        seo: {}
      },
      {
        section: "about",
        publishedContent: {
          heading: "We help people celebrate with meaningful gifts.",
          description: "Niyora Gifts is built for moments that matter. Whether it's a birthday, anniversary, thank-you gesture, or festive celebration, we combine premium products with dependable service to create gifting experiences people remember.",
          images: [
            "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800"
          ],
          mission: "Our mission is to bring joy to every celebration through high quality, handpicked gifts delivered right on time.",
          vision: "To be the most trusted and premium online gifting brand known for exceptional customer satisfaction and elegant collections.",
          companyStory: "Founded in 2026, Niyora Gifts started with a simple belief: that every gift should carry a deep emotion. Over time, we've grown into a destination for luxury flowers, gourmet cakes, and bespoke customized keepsakes.",
          values: [
            { title: "Thoughtful Curation", text: "Every flower, cake and gift in our catalog is handpicked for quality, design and gifting impact." },
            { title: "On-Time Delivery", text: "From same-day surprises to planned celebrations, we focus on timely and reliable doorstep delivery." },
            { title: "Personalized Experience", text: "Custom notes, elegant packaging and occasion-based recommendations make every gift feel unique." }
          ]
        },
        seo: {
          title: "About Niyora Gifts | Premium Gift Store",
          description: "Learn about Niyora Gifts, your trusted online gift store for flowers, cakes and personalized gifts with reliable delivery.",
          keywords: "Niyora Gifts, online gifts, flowers delivery, cakes, personalized gifts, gift store",
          ogTitle: "About Niyora Gifts | Premium Gift Store",
          ogDescription: "Discover Niyora Gifts's mission, gifting values and premium celebration experiences."
        }
      },
      {
        section: "contact",
        publishedContent: {
          address: "Premium Gifting Hub, Delhi, India",
          email: "niyoragifts@gmail.com",
          phone: "+91 90000 00000",
          googleMap: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3502.562064115163!2d77.22725227630232!3d28.61393907567406!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390cfd5d31111111%3A0x1111111111111111!2sIndia%20Gate!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin",
          workingHours: "Mon - Sun: 9:00 AM - 10:00 PM"
        },
        seo: {
          title: "Contact Us | Niyora Gifts",
          description: "Get in touch with Niyora Gifts customer support. We are available for query resolutions, customized orders, and feedback.",
          keywords: "contact niyora gifts, customer service, support email, phone number"
        }
      },
      {
        section: "policies",
        publishedContent: {
          privacyPolicy: "<p>Your privacy is important to us. We collect, store and protect your personal information in accordance with regulations.</p>",
          refundPolicy: "<p>For cancelled or returned items, refunds are processed back to the original payment source within 5-7 business days.</p>",
          shippingPolicy: "<p>We offer standard, same-day and midnight delivery options. Please ensure correct details to avoid delays.</p>",
          termsConditions: "<p>By using our website, you agree to our terms of service. All content is owned by Niyora Gifts.</p>"
        },
        seo: {
          title: "Store Policies | Niyora Gifts",
          description: "Read about Niyora Gifts policies including Shipping, Returns, Refunds, Privacy, and Terms & Conditions."
        }
      },
      {
        section: "faq",
        publishedContent: {
          items: [
            { q: "How can I track my package?", a: "Once your order has Shipped, a Tracking ID and Carrier link will appear under your 'Order Tracking' tab. Click 'Track Package' to see real-time updates." },
            { q: "Can I change my delivery address after placing an order?", a: "You can request address updates before the order transitions to 'Shipped'. Please contact niyoragifts@gmail.com or WhatsApp us immediately with your Order ID." },
            { q: "How do I request a cancellation?", a: "Go to the 'My Orders' tab and click 'Request Cancellation' on any eligible order (orders that are Shipped or Delivered cannot be cancelled). Our admin team will review and approve eligible requests." },
            { q: "What is your refund policy?", a: "For cancelled or returned items, refunds are processed back to the original payment source within 5-7 business days." }
          ]
        },
        seo: {
          title: "Frequently Asked Questions | Niyora Gifts",
          description: "Find answers to commonly asked questions about order tracking, shipping, cancellation requests, refunds, and exchanges."
        }
      },
      {
        section: "blog",
        publishedContent: {
          posts: [
            {
              title: "5 Thoughtful Anniversary Gift Ideas",
              slug: "anniversary-gift-ideas",
              summary: "Make your partner feel special with these custom handpicked anniversary gift options.",
              content: "<p>Anniversaries are special milestones. Here are 5 thoughtful gift ideas that can make the day unforgettable...</p>",
              image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=500",
              author: "Niyora Team",
              publishedAt: new Date()
            }
          ]
        },
        seo: {
          title: "Celebration Gifting Blog | Niyora Gifts",
          description: "Read helpful curation tips, gift shopping advice, and event preparation ideas from our experts."
        }
      },
      {
        section: "banners",
        publishedContent: {
          items: [
            { title: "Luxury Flower Boxes", subtitle: "Elegant blooms for premium gifting", tag: "Best Seller", link: "/products" },
            { title: "Cake + Bouquet Combos", subtitle: "Perfect celebration pairing", tag: "Most Loved", link: "/products" },
            { title: "Personalized Keepsakes", subtitle: "Custom gifts with lasting memories", tag: "Trending", link: "/products" }
          ]
        },
        seo: {}
      },
      {
        section: "popups",
        publishedContent: {
          active: false,
          title: "Special Discount!",
          text: "Get 10% off your first purchase. Use code NIYORA10.",
          buttonText: "Shop Now",
          buttonLink: "/products",
          imageUrl: ""
        },
        seo: {}
      },
      {
        section: "announcements",
        publishedContent: {
          active: true,
          text: "🎉 Free same-day delivery in metro cities on orders above ₹1499!",
          bgColor: "#B28A30",
          textColor: "#ffffff",
          link: "/products"
        },
        seo: {}
      },
      {
        section: "seo",
        publishedContent: {
          title: "Niyora Gifts | Luxury Curated Gifting",
          canonical: "",
          description: "Premium flowers, cakes and personalized gifts curated for celebrations that deserve a beautiful, lasting memory."
        },
        seo: {}
      }
    ];

    for (const item of defaultSections) {
      const existing = await CmsContent.findOne({ section: item.section });
      if (!existing) {
        // Create both published and draft with same defaults initially
        await CmsContent.create({
          section: item.section,
          publishedContent: item.publishedContent,
          draftContent: item.publishedContent,
          seo: item.seo,
          draftSeo: item.seo,
          hasDraftChanges: false,
        });
        console.log(`[seeder] Created default CMS section: ${item.section}`);
      }
    }
  } catch (error) {
    console.error("[seeder] CMS seeding error:", error);
  }
};

module.exports = { seedDB, predefinedPermissions };
