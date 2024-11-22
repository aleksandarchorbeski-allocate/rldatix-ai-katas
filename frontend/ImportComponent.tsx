import { useState } from "react";
import { getConfig } from "../utils";

enum FileType { PRODUCTS, ORDERS }

const ImportComponent = () => {
    const [importMessage, setImportMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [file, setFile] = useState<File | null>(null);
    const [importTime, setImportTime] = useState<number | null>(null);
    const [fileType, setFileType] = useState<FileType | null>(null);

    const { BACKEND_URL } = getConfig()

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: FileType) => {
        setFileType(fileType)
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const getImportType = (fileType: FileType) => {
        switch (fileType) {
            case FileType.PRODUCTS:
                return "importProducts";
            case FileType.ORDERS:
                return "importOrders";
            default:
                return "importProducts";
        }
    }

    const handleImport = async (fileType: FileType) => {
        setImportMessage('')
        setImportTime(null);

        if (!file) {
            alert("Please select a file to upload.");
            return;
        }

        setLoading(true);
        const startTime = Date.now();

        const formData = new FormData();
        formData.append("file", file);


        try {
            const response = await fetch(`${BACKEND_URL}/api/${getImportType(fileType)}`, {
                method: "POST",
                body: formData,
            });
            const data = await response.json();
            setImportTime(Date.now() - startTime);

            setImportMessage(data.message || "Data import completed.");
        } catch (error) {
            setImportMessage("Error during data import.");
        }
        setFile(null)
        setFileType(null)
        setLoading(false);
    };

    return (
        <>
            <div className="import-section">
                <input
                    type="file"
                    onChange={e => handleFileChange(e, FileType.PRODUCTS)}
                    disabled={loading}
                />
                <button onClick={() => handleImport(FileType.PRODUCTS)} disabled={loading || !file || fileType !== FileType.PRODUCTS}>
                    {loading ? "Importing..." : "Import Products File"}
                </button>
            </div>
            <div className="import-section">
                <input
                    type="file"
                    onChange={e => handleFileChange(e, FileType.ORDERS)}
                    disabled={loading}
                />
                <button onClick={() => handleImport(FileType.ORDERS)} disabled={loading || !file || fileType !== FileType.ORDERS}>
                    {loading ? "Importing..." : "Import Orders File"}
                </button>
            </div>
            <div className="import-section">
                {importMessage && <>
                    <p>{importMessage}</p>
                    {importTime !== null &&
                        <p>Import completed in {importTime} ms</p>}
                </>
                }
            </div>
        </>
    );
};

export default ImportComponent;
