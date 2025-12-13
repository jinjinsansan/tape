const bcrypt = require("bcryptjs");

const password = "kusano";
const hash = bcrypt.hashSync(password, 10);

console.log("\n=== Master Admin Password Hash ===");
console.log("Password:", password);
console.log("Hash:", hash);
console.log("\nAdd this to your .env.local:");
console.log(`MASTER_ADMIN_PASSWORD_HASH="${hash}"`);
console.log("===================================\n");
