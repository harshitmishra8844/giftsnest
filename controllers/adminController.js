const bcrypt = require("bcryptjs");
const User = require("../models/User");
const StoreSetting = require("../models/StoreSetting");
const { generateToken } = require("./authController");

const defaultOffers = [
  {
    title: "Midnight Surprise Drop",
    subtitle: "Order before 11 PM and unlock priority prep on select gifts.",
    code: "MIDNIGHT12",
    ctaText: "Shop Late Night",
    active: true,
  },
  {
    title: "Birthday Bundle Wave",
    subtitle: "Combo gifts with curated cards and packaging at festival pricing.",
    code: "BDAYBLISS",
    ctaText: "View Bundles",
    active: true,
  },
  {
    title: "Personalized Express",
    subtitle: "Fast-track custom gifts with handcrafted finishing.",
    code: "CUSTOM10",
    ctaText: "Customize Now",
    active: true,
  },
];

const defaultSpecialOffer = {
  title: "Festive Mega Sale",
  subtitle: "Celebrate the season with curated gifts and limited-time savings.",
  eventName: "Festive Special",
  code: "FESTIVE20",
  ctaText: "Grab Offer",
  startDate: "",
  endDate: "",
  active: false,
};

const normalizeDateInput = (value) => {
  if (!value) return "";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";
  return parsedDate.toISOString();
};

const sanitizeSpecialOffer = (specialOffer) => ({
  title: String(specialOffer?.title || defaultSpecialOffer.title).trim(),
  subtitle: String(specialOffer?.subtitle || defaultSpecialOffer.subtitle).trim(),
  eventName: String(specialOffer?.eventName || defaultSpecialOffer.eventName).trim(),
  code: String(specialOffer?.code || "").trim().toUpperCase(),
  ctaText: String(specialOffer?.ctaText || defaultSpecialOffer.ctaText).trim(),
  startDate: normalizeDateInput(specialOffer?.startDate),
  endDate: normalizeDateInput(specialOffer?.endDate),
  active: Boolean(specialOffer?.active),
});

const sanitizeOffers = (offers) => {
  if (!Array.isArray(offers)) return defaultOffers;

  return offers
    .slice(0, 6)
    .map((offer) => ({
      title: String(offer?.title || "").trim(),
      subtitle: String(offer?.subtitle || "").trim(),
      code: String(offer?.code || "").trim().toUpperCase(),
      ctaText: String(offer?.ctaText || "Explore").trim(),
      active: Boolean(offer?.active),
    }))
    .filter((offer) => offer.title && offer.subtitle);
};

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    let admin = await User.findOne({ email: email.toLowerCase(), isAdmin: true });
    if (!admin) {
      const fallbackEmail = process.env.ADMIN_EMAIL || "harshitmishra9897@gmail.com";
      const fallbackPassword = process.env.ADMIN_PASSWORD || "harshit@123";

      if (email.toLowerCase() !== fallbackEmail.toLowerCase() || password !== fallbackPassword) {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }

      const hashedPassword = await bcrypt.hash(fallbackPassword, 10);
      admin = await User.create({
        name: "Store Admin",
        email: fallbackEmail.toLowerCase(),
        password: hashedPassword,
        isAdmin: true,
      });
    }

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    return res.status(200).json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      isAdmin: true,
      token: generateToken(admin._id),
    });
  } catch (error) {
    console.error("Admin login error:", error.message);
    return res.status(500).json({ message: "Admin login failed" });
  }
};

const getStoreInfo = async (req, res) => {
  try {
    const dbStoreInfo = await StoreSetting.findOne({ singletonKey: "store" }).lean();
    return res.status(200).json({
      storeName: dbStoreInfo?.storeName || process.env.STORE_NAME || "Gift Store",
      storePhone: dbStoreInfo?.storePhone || process.env.STORE_PHONE || "+91-90000-00000",
      storeAddress: dbStoreInfo?.storeAddress || process.env.STORE_ADDRESS || "123 Commerce Street, Mumbai, Maharashtra 400001, India",
      storeLogoUrl: dbStoreInfo?.storeLogoUrl || "",
      specialOffer: sanitizeSpecialOffer(dbStoreInfo?.specialOffer),
      offers: sanitizeOffers(dbStoreInfo?.offers),
    });
  } catch (error) {
    console.error("Get store info error:", error.message);
    return res.status(500).json({ message: "Failed to fetch store info" });
  }
};

const updateStoreInfo = async (req, res) => {
  try {
    const { storeName, storePhone, storeAddress, storeLogoUrl, specialOffer, offers } = req.body;
    if (!storeName || !storePhone || !storeAddress) {
      return res.status(400).json({ message: "storeName, storePhone and storeAddress are required" });
    }

    const storeInfo = await StoreSetting.findOneAndUpdate(
      { singletonKey: "store" },
      {
        singletonKey: "store",
        storeName: String(storeName).trim(),
        storePhone: String(storePhone).trim(),
        storeAddress: String(storeAddress).trim(),
        storeLogoUrl: String(storeLogoUrl || "").trim(),
        specialOffer: sanitizeSpecialOffer(specialOffer),
        offers: sanitizeOffers(offers),
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: "Store info updated successfully",
      storeInfo: {
        storeName: storeInfo.storeName,
        storePhone: storeInfo.storePhone,
        storeAddress: storeInfo.storeAddress,
        storeLogoUrl: storeInfo.storeLogoUrl || "",
        specialOffer: sanitizeSpecialOffer(storeInfo.specialOffer),
        offers: sanitizeOffers(storeInfo.offers),
      },
    });
  } catch (error) {
    console.error("Update store info error:", error.message);
    return res.status(500).json({ message: "Failed to update store info" });
  }
};

module.exports = { adminLogin, getStoreInfo, updateStoreInfo };
