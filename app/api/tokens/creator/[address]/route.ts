import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Token from "@/models/Token";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const address = (await params).address;
    await dbConnect();
    const token = await Token.findOne({ address });

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.error("Error fetching token:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch token" },
      { status: 500 }
    );
  }
}
