import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `y/${user.id}/${type}`,
        transformation,
        resource_type: "image",
      },
      (err, res) => (err || !res ? reject(err) : resolve(res))
    );
    stream.end(buffer);
  });

  return NextResponse.json({ url: result.secure_url });
}
