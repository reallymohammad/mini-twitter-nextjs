import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const type = form.get("type") as "avatar" | "cover" | null;

    if (!file || !type) {
      return NextResponse.json({ error: "Missing file or type" }, { status: 400 });
    }

    const transformation =
      type === "avatar"
        ? [{ width: 400, height: 400, crop: "fill", gravity: "face" }]
        : [{ width: 1500, height: 500, crop: "fill" }];

    const buffer = Buffer.from(await file.arrayBuffer());

    // استفاده از try/catch برای مدیریت خطاهای احتمالی کلودینری
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `y/${user.id}/${type}`,
          transformation,
          resource_type: "image",
        },
        (err, res) => {
          if (err) {
            console.error("Cloudinary Error Details:", err); // برای دیدن خطا در کنسول ترمینال سرور
            return reject(err);
          }
          if (!res) {
            return reject(new Error("No response from Cloudinary"));
          }
          resolve(res);
        }
      );
      stream.end(buffer);
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (error: any) {
    console.error("Upload API main error:", error);
    // بازگرداندن جزئیات دقیق خطا به کلاینت به جای کرش کردن شبکه
    return NextResponse.json(
      { error: error?.message || "Internal Upload Server Error" },
      { status: 500 }
    );
  }
}
