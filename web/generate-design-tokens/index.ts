import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

async function fetchDesignTokens() {
  try {
    const designTokensUrl = process.env.DESIGN_TOKENS_API_URL;
    const designTokensSecret = process.env.DESIGN_TOKENS_API_SECRET;

    if (!designTokensUrl || !designTokensSecret) {
      console.warn("⚠️  Design tokens API not configured — using checked-in fallback.");
      return;
    }

    console.log("🔄 Fetching design tokens from:", `${designTokensUrl}/api/design-tokens`);

    const response = await fetch(`${designTokensUrl}/api/design-tokens`, {
      headers: { Authorization: `Bearer ${designTokensSecret}` },
      cache: "no-store" as RequestCache,
    });

    if (!response.ok) {
      console.error("❌ API Error:", response.status, response.statusText);
      return;
    }

    const data = await response.json();
    console.log("✅ Design tokens fetched successfully");

    await fs.writeFile(
      path.join(process.cwd(), "src/design-tokens.json"),
      JSON.stringify(data, null, 2)
    );
  } catch (error) {
    console.error("❌ Error fetching design tokens:", error);
    process.exit(1);
  }
}

fetchDesignTokens().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
