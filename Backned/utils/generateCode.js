import crypto from "crypto";

const generate6CharCode = () => {
  return crypto.randomBytes(3).toString("hex").toUpperCase(); // like "A3F9B1"
}
export default generate6CharCode