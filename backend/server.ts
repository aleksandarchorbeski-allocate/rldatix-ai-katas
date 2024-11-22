import { serve } from "bun";
import { handleSearchAndRespond } from "./search";
import { importDataFromFile } from "./import";
import { FileType } from "../utils";

const jsonResponse = (data: any, status: number = 200) => {
    return new Response(JSON.stringify(data), {
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
        status,
    });
};

const handleSearch = async (req: Request) => {
    try {
        const { query, context } = await req.json();
        const results = await handleSearchAndRespond(query, context);
        return jsonResponse(results);
    } catch (error) {
        console.error("Error in search API:", error);
        return jsonResponse({ error: "Search failed" }, 500);
    }
};

const handleImport = async (req: Request, fileType: FileType) => {
    try {
        const contentType = req.headers.get("Content-Type") || "";

        if (!contentType.includes("multipart/form-data")) {
            return jsonResponse({ error: "Invalid content type" }, 400);
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return jsonResponse({ error: "No file uploaded." }, 400);
        }

        const filePath = `./data/${file.name}`;
        const buffer = await file.arrayBuffer();
        await Bun.write(filePath, new Uint8Array(buffer));

        try {
            await importDataFromFile(filePath, fileType);
            return jsonResponse({ message: "File uploaded and processed successfully." });
        } catch (error) {
            console.error("Error during file processing:", error);
            return jsonResponse({ error: "Error during file processing." }, 500);
        }
    } catch (error) {
        console.error("Error during file upload:", error);
        return jsonResponse({ error: "File upload failed" }, 500);
    }
};

const handleOptions = () => {
    return new Response(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
};

serve({
    fetch: (req) => {
        const url = new URL(req.url);
        const pathname = url.pathname;

        if (req.method === "OPTIONS") {
            return handleOptions();
        }

        if (req.method === "POST" && pathname === "/api/search") {
            return handleSearch(req);
        }

        if (req.method === "POST" && pathname === "/api/importProducts") {
            return handleImport(req, FileType.PRODUCTS);
        }

        if (req.method === "POST" && pathname === "/api/importOrders") {
            return handleImport(req, FileType.ORDERS);
        }

        return new Response("Not found", { status: 404 });
    },
    port: 8001,
});

console.log("Server is running on port 8001");
