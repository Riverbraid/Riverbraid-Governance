import fs from "node:fs";
import crypto from "node:crypto";
const repo = "Riverbraid-Governance";
const requiredFiles = ["package.json", "AUTHORITY.md", "RING.md", "CEREMONY.md"];
const missingFiles = requiredFiles.filter((file) => !fs.existsSync(file));
let structuralFieldsPresent = false;
let signaturePresent = false;
let signatureVerified = false;
let status = "FAILED";
let claimBoundary = "governance-unverified";
let failureCodes = [];
if (missingFiles.length > 0) {
  failureCodes.push("REQUIRED_FILES_MISSING");
} else {
  const ceremony = fs.readFileSync("CEREMONY.md", "utf8");
  const requiredFields = [
    "Custodian",
    "Fingerprint",
    "Merkle Root",
    "Status",
    "Signature"
  ];
  structuralFieldsPresent = requiredFields.every((field) => ceremony.includes(field));
  signaturePresent = ceremony.includes("-----BEGIN PGP SIGNATURE-----");
  if (!structuralFieldsPresent) {
    failureCodes.push("CEREMONY_STRUCTURAL_FIELDS_MISSING");
  } else {
    status = "FILES_PRESENT_UNVERIFIED";
    claimBoundary = signaturePresent
      ? "ceremony-structure-present-signature-unverified"
      : "ceremony-structure-only";
    failureCodes.push(
      signaturePresent
        ? "CRYPTOGRAPHIC_SIGNATURE_NOT_VERIFIED"
        : "SIGNATURE_BLOCK_MISSING"
    );
  }
}
const hash = crypto.createHash("sha256");
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    hash.update(file);
    hash.update("\0");
    hash.update(fs.readFileSync(file));
    hash.update("\0");
  }
}
const output = {
  repo,
  status,
  verification_scope: "governance-ceremony-structure",
  structural_fields_present: structuralFieldsPresent,
  signature_present: signaturePresent,
  signature_verified: signatureVerified,
  claim_boundary: claimBoundary,
  required_files: requiredFiles,
  missing_files: missingFiles,
  failure_codes: failureCodes,
  digest: "sha256:" + hash.digest("hex")
};
fs.writeFileSync("verify-output.json", JSON.stringify(output, null, 2));
process.exit(status === "FAILED" ? 1 : 0);