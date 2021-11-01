const moment = require("moment");

// Version format is vYYYY.MM.DD.PatchVersion
const TAG_MOMENT_FORMAT = "YYYY.MM.DD";

class Versioning {
  constructor() {}

  getVersionFromDate(date, patchVersion = 1) {
    const datePart = moment(date).format(TAG_MOMENT_FORMAT);
    return `v${datePart}.${patchVersion}`;
  }

  getVersionDatePart(version) {
    return version.substring(1, version.lastIndexOf("."));
  }

  versionMoreRecentThan(currentVersion, otherVersion) {
    if (
      !this.isValidVersion(currentVersion) ||
      !this.isValidVersion(otherVersion)
    ) {
      return false; // TODO: should actually throw an exception
    }
    return (
      this.getMomentFromVersion(currentVersion) >
      this.getMomentFromVersion(otherVersion)
    );
  }

  isValidVersion(version) {
    if (!version.startsWith("v")) {
      return false;
    }
    return true;
  }

  getMomentFromVersion(version) {
    const date = this.getVersionDatePart(version);
    return moment(date, TAG_MOMENT_FORMAT);
  }

  isFirstPatch(version) {
    return version.endsWith(".1");
  }

  /**
   *
   * @param {Integer} hour time to release in local time, 0 midnight, 15 is 3pm, etc
   */
  getIsoStringFromVersion(version, hour = 0) {
    const versionMoment = this.getMomentFromVersion(version);
    return versionMoment.add(hour, "hours").toISOString();
  }
}

module.exports = Versioning;
