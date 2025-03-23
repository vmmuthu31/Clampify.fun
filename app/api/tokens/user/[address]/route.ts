import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Token from "@/models/Token";

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
): Promise<NextResponse> => {
  try {
    const { address } = await params;

    await dbConnect();
    // Find tokens where creator matches the address
    const tokens = await Token.find({ creator: address });

    return NextResponse.json({ success: true, tokens });
  } catch (error) {
    console.error("Error fetching user tokens:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user tokens" },
      { status: 500 }
    );
  }
};
