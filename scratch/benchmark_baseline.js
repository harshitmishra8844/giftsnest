const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function runBenchmark() {
  const results = {
    timestamp: new Date().toISOString(),
    databaseQueries: {},
    apiEndpoints: {},
    bundleSizes: {},
    imageAnalysis: {}
  };

  // 1. Measure DB Query Execution Times
  await mongoose.connect(process.env.MONGO_URI);
  const Product = require("../models/Product");
  const StoreSetting = require("../models/StoreSetting");
  const CmsContent = require("../models/CmsContent");
  const Role = require("../models/Role");
  const User = require("../models/User");

  // Query: Products list (unindexed vs indexed, hydration vs lean)
  const t0 = performance.now();
  await Product.find().sort({ createdAt: -1 });
  results.databaseQueries.productsFindHydratedMs = Number((performance.now() - t0).toFixed(2));

  const t1 = performance.now();
  await Product.find().select("name slug price originalPrice discountPercentage image category stock rating numReviews codEnabled").lean();
  results.databaseQueries.productsFindLeanCardFieldsMs = Number((performance.now() - t1).toFixed(2));

  // Query: StoreSetting singleton
  const t2 = performance.now();
  await StoreSetting.findOne({ singletonKey: "store" }).lean();
  results.databaseQueries.storeSettingFindMs = Number((performance.now() - t2).toFixed(2));

  // Query: CMS Homepage
  const t3 = performance.now();
  await CmsContent.findOne({ section: "homepage" }).lean();
  results.databaseQueries.cmsHomepageFindMs = Number((performance.now() - t3).toFixed(2));

  // Query: Single product by slug
  const sampleProduct = await Product.findOne().select("slug");
  if (sampleProduct) {
    const t4 = performance.now();
    await Product.findOne({ slug: sampleProduct.slug });
    results.databaseQueries.productBySlugMs = Number((performance.now() - t4).toFixed(2));
  }

  await mongoose.disconnect();

  // 2. Measure API Response Times
  const baseUrl = "http://127.0.0.1:5000/api";
  const measureApi = async (url) => {
    const start = performance.now();
    try {
      const res = await fetch(url);
      const ms = Number((performance.now() - start).toFixed(2));
      const text = await res.text();
      return { status: res.status, timeMs: ms, bytes: text.length };
    } catch (err) {
      return { error: err.message };
    }
  };

  results.apiEndpoints.products = await measureApi(`${baseUrl}/products`);
  results.apiEndpoints.storeInfo = await measureApi(`${baseUrl}/store-info`);
  results.apiEndpoints.cmsHomepage = await measureApi(`${baseUrl}/cms/content/homepage`);
  results.apiEndpoints.singleProduct = sampleProduct ? await measureApi(`${baseUrl}/products/${sampleProduct.slug}`) : null;

  // 3. Measure Bundle Sizes
  const distDir = path.join(process.cwd(), "frontend", "dist", "assets");
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    let totalJs = 0;
    let totalCss = 0;
    const fileBreakdown = [];

    for (const f of files) {
      const fPath = path.join(distDir, f);
      const stat = fs.statSync(fPath);
      const sizeKb = Number((stat.size / 1024).toFixed(2));
      if (f.endsWith(".js")) {
        totalJs += stat.size;
        fileBreakdown.push({ file: f, type: "JS", sizeKb });
      } else if (f.endsWith(".css")) {
        totalCss += stat.size;
        fileBreakdown.push({ file: f, type: "CSS", sizeKb });
      }
    }

    fileBreakdown.sort((a, b) => b.sizeKb - a.sizeKb);
    results.bundleSizes = {
      totalJsKb: Number((totalJs / 1024).toFixed(2)),
      totalCssKb: Number((totalCss / 1024).toFixed(2)),
      largestChunks: fileBreakdown.slice(0, 10)
    };
  }

  // 4. Image Analysis
  await mongoose.connect(process.env.MONGO_URI);
  const allProds = await Product.find().select("name image images");
  let externalCount = 0;
  let cloudinaryCount = 0;
  let uncompressedCount = 0;
  const sampleImages = [];

  allProds.forEach(p => {
    const img = p.image || "";
    if (img.includes("res.cloudinary.com")) {
      cloudinaryCount++;
      // Check if auto-format / q_auto is used
      if (!img.includes("f_auto") || !img.includes("q_auto")) {
        uncompressedCount++;
      }
    } else {
      externalCount++;
    }
    if (sampleImages.length < 5 && img) sampleImages.push({ name: p.name, image: img });
  });

  results.imageAnalysis = {
    totalProducts: allProds.length,
    cloudinaryImages: cloudinaryCount,
    uncompressedCloudinary: uncompressedCount,
    externalImages: externalCount,
    sampleImages
  };

  await mongoose.disconnect();

  console.log("=== PERFORMANCE AUDIT BASELINE REPORT ===");
  console.log(JSON.stringify(results, null, 2));

  // Write report to scratch
  fs.writeFileSync(
    path.join(process.cwd(), "scratch", "baseline_audit_report.json"),
    JSON.stringify(results, null, 2),
    "utf8"
  );
}

runBenchmark().catch(console.error);
