const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const ReturnRequest = require("../models/ReturnRequest");
const ReplacementRequest = require("../models/ReplacementRequest");
const ReplacementOrder = require("../models/ReplacementOrder");
const RefundRecord = require("../models/RefundRecord");
const ReturnActivityLog = require("../models/ReturnActivityLog");
const ReturnSetting = require("../models/ReturnSetting");
const { generateRequestId } = require("../services/returnActivityService");

async function runMigration() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/niyora-gifts";
  console.log("Connecting to MongoDB for Return & Replacement System Migration...");
  await mongoose.connect(mongoUri);
  console.log("Connected successfully to:", mongoose.connection.name);

  try {
    // 1. Ensure Return Settings Singleton
    console.log("Checking Return & Replacement store settings...");
    let settings = await ReturnSetting.findOne({ singletonKey: "settings" });
    if (!settings) {
      settings = await ReturnSetting.create({
        singletonKey: "settings",
        returnWindowDays: 7,
        replacementWindowDays: 7,
        allowPersonalizedExceptions: true,
        returnPolicyText: "Returns and replacements must be requested within 7 days of delivery with original packaging and product photos.",
        enabled: true,
      });
      console.log("Created default ReturnSetting singleton (7 days return / replacement window).");
    } else {
      if (!settings.replacementWindowDays) settings.replacementWindowDays = 7;
      if (settings.allowPersonalizedExceptions === undefined) settings.allowPersonalizedExceptions = true;
      await settings.save();
      console.log("Verified ReturnSetting singleton.");
    }

    // 2. Ensure Collections and Indexes
    console.log("Syncing database indexes...");
    await ReturnRequest.syncIndexes();
    await ReplacementOrder.syncIndexes();
    await RefundRecord.syncIndexes();
    await ReturnActivityLog.syncIndexes();
    console.log("All indexes synchronized successfully.");

    // 3. Backfill existing ReturnRequest documents
    const existingReturns = await ReturnRequest.find();
    console.log(`Found ${existingReturns.length} existing ReturnRequest documents.`);
    let migratedReturns = 0;

    for (const ret of existingReturns) {
      let modified = false;

      // Populate requestId if missing
      if (!ret.requestId) {
        ret.requestId = ret.returnCode || generateRequestId("Return");
        modified = true;
      }
      if (!ret.returnCode) {
        ret.returnCode = ret.requestId;
        modified = true;
      }

      // Populate requestType if missing
      if (!ret.requestType) {
        ret.requestType = "Return";
        modified = true;
      }

      // Map legacy status to 10-status standard
      if (ret.status === "Pending") {
        ret.status = "Submitted";
        modified = true;
      } else if (ret.status === "Refund Processed") {
        ret.status = "Refund Completed";
        ret.refundStatus = "Completed";
        modified = true;
      }

      // Ensure customerMessage and returnReason
      if (!ret.customerMessage && ret.description) {
        ret.customerMessage = ret.description;
        modified = true;
      }
      if (!ret.returnReason && ret.reason) {
        ret.returnReason = ret.reason;
        modified = true;
      }

      // Check if ReturnActivityLog exists
      const hasLog = await ReturnActivityLog.findOne({ requestId: ret._id });
      if (!hasLog) {
        await ReturnActivityLog.create({
          activityId: `ACT-MIG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          requestId: ret._id,
          action: "REQUEST_SUBMITTED",
          status: ret.status,
          performedByName: "Migration Backfill",
          remarks: `Legacy request ${ret.requestId} backfilled into activity tracking.`,
          timestamp: ret.createdAt || new Date(),
        });
      }

      if (modified) {
        await ret.save();
        migratedReturns++;
      }
    }
    console.log(`Migrated / normalized ${migratedReturns} ReturnRequest records.`);

    // 4. Migrate ReplacementRequest to ReturnRequest if any exist separately
    const existingReplacements = await ReplacementRequest.find();
    console.log(`Found ${existingReplacements.length} legacy ReplacementRequest documents.`);
    let migratedReplacements = 0;

    for (const rep of existingReplacements) {
      // Check if already in ReturnRequest
      const alreadyExists = await ReturnRequest.findOne({
        $or: [{ returnCode: rep.replacementCode }, { requestId: rep.replacementCode }],
      });

      if (!alreadyExists) {
        const newReq = await ReturnRequest.create({
          requestId: rep.replacementCode || generateRequestId("Replacement"),
          returnCode: rep.replacementCode || generateRequestId("Replacement"),
          orderId: rep.orderId,
          customerId: rep.customerId,
          requestType: "Replacement",
          returnReason: rep.reason,
          reason: rep.reason,
          customerMessage: rep.description,
          description: rep.description,
          evidenceImages: rep.images || [],
          images: rep.images || [],
          items: rep.items || [],
          status: rep.status === "Pending" ? "Submitted" : rep.status,
          pickupDetails: rep.pickupDetails,
          createdAt: rep.createdAt,
          updatedAt: rep.updatedAt,
        });

        if (rep.replacementOrderId) {
          await ReplacementOrder.create({
            replacementId: generateRequestId("Replacement"),
            requestId: newReq._id,
            originalOrderId: rep.orderId,
            replacementOrderId: rep.replacementOrderId,
            replacementStatus: "Confirmed",
            createdAt: rep.createdAt,
          });
        }

        await ReturnActivityLog.create({
          activityId: `ACT-REP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          requestId: newReq._id,
          action: "REQUEST_SUBMITTED",
          status: newReq.status,
          performedByName: "Migration Backfill",
          remarks: `Replacement request ${rep.replacementCode} backfilled into unified system.`,
          timestamp: rep.createdAt || new Date(),
        });

        migratedReplacements++;
      }
    }
    console.log(`Synchronized ${migratedReplacements} legacy ReplacementRequest records into unified collection.`);

    console.log("--- Migration Completed Successfully ---");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
