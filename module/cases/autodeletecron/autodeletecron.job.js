import { CnrDetail } from "../case.model.js";
import cron from "node-cron";

async function autoDeleteArchiveCnr() {
  try {
    const archiveCnr = await CnrDetail.find({
      archive: { $exists: true, $ne: [] },
    });
    if (archiveCnr.length > 0) {
      for (const archiveItem of archiveCnr) {
        const updatedArchive = archiveItem.archive.filter(
          (item) => item?.expireTime >= Date.now()
        );
        if (updatedArchive.length !== archiveItem.archive.length) {
          archiveItem.archive = updatedArchive;
          await archiveItem.save();
        }
      }
    }
  } catch (error) {
    console.error("Error in autoDeleteArchiveCnr function: ", error);
  }
}

export function cleanUpArchiveCnr() {
  cron.schedule("* 0 * * *", () => {
    autoDeleteArchiveCnr();
  });
}
