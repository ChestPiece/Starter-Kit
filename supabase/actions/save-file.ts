"use server";

// Mock file upload function (Supabase and authentication removed)
export const saveFile = async (file: File) => {
  try {
    // Simulate file upload process
    console.log("Mock file upload:", {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Create a mock URL that would represent an uploaded file
    const mockUrl = `https://mock-storage.example.com/uploads/${Date.now()}-${file.name}`;
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return mockUrl;
  } catch (error) {
    console.error("Mock file upload error:", error);
    return null;
  }
};
