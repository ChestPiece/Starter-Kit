import { NextRequest, NextResponse } from "next/server";

export const GET = async (request: NextRequest) => {
  try {
    // Get the URL from the query parameter
    const url = request.nextUrl.searchParams.get("url");
    
    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    // Fetch the file from the external source with timeout
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30000), // 30 second timeout for file downloads
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch from source: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the file content as an array buffer
    const arrayBuffer = await response.arrayBuffer();
    
    // Get the content type from the response
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    
    // Create a new response with the file content
    const newResponse = new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "attachment",
      },
    });

    return newResponse;
  } catch (error: any) {
    console.error("Proxy download error:", error);
    
    // Handle timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: "Download timed out - file may be too large" },
        { status: 408 }
      );
    }
    
    // Handle connection errors
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
      return NextResponse.json(
        { error: "Connection failed - please check the URL and try again" },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to proxy download" },
      { status: 500 }
    );
  }
}; 