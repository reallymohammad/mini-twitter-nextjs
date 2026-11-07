import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

const FOLDER = "posts";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

    if (!cloudName || !apiKey || !apiSecret) {
      console.error("Cloudinary server environment variables are missing");
      return NextResponse.json(
        { error: "Upload is not configured" },
        { status: 500 }
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);

    // پارامترها به ترتیب الفبایی امضا می‌شوند: folder سپس timestamp
    const signature = createHash("sha1")
      .update(`folder=${FOLDER}&timestamp=${timestamp}${apiSecret}`)
      .digest("hex");

    return NextResponse.json(
      { cloudName, apiKey, timestamp, signature, folder: FOLDER },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error creating Cloudinary signature:", error);
    return NextResponse.json(
      { error: "Could not authorize upload" },
      { status: 500 }
    );
  }
}
