import config from './config.json'

export function getConfig(): {
    EMBEDDING_MODEL: string, mainmodel: string, OPENAI_API_KEY: string
        , OPENAI_API_URL_EMBEDDINGS: string, OPENAI_API_URL_COMPLETIONS: string, CHROMA_URL: string
        , BACKEND_URL: string
} {
    return config
}

export enum FileType { PRODUCTS, ORDERS }

export const getImportType = (fileType: FileType) => {
    switch (fileType) {
        case FileType.PRODUCTS:
            return "productsearchcollection";
        case FileType.ORDERS:
            return "orderssearchcollection";
        default:
            return "productsearchcollection";
    }
}
