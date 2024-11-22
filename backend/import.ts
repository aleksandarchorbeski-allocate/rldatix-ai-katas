import axios from 'axios';
import { ChromaClient } from 'chromadb';
import { FileType, getConfig, getImportType } from '../utils';
import csvParser from 'csv-parser';
import * as fs from 'fs';

const { EMBEDDING_MODEL, OPENAI_API_KEY, OPENAI_API_URL_EMBEDDINGS, CHROMA_URL } = getConfig();

const chroma = new ChromaClient({ path: CHROMA_URL });

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let dynamicCategories: Set<string> = new Set();
let productKeywords: Set<string> = new Set();
let orderKeywords: Set<string> = new Set();

export const importDataFromFile = async (filePath: string, fileType: FileType) => {
    const collectionName = getImportType(fileType);

    try {
        await chroma.deleteCollection({ name: collectionName });
    } catch (error) {
        console.error('Error deleting collection:', error);
    }

    const collection = await chroma.getOrCreateCollection({
        name: collectionName,
        metadata: { 'hnsw:space': 'cosine' },
    });

    const records: any[] = [];
    console.log(fileType)
    if (fileType === FileType.PRODUCTS) {
        await new Promise<void>((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csvParser())
                .on('header', (headers) => {
                    console.log(headers)
                    headers.forEach((header: string) => productKeywords.add(header.trim().toLowerCase()));
                })
                .on('data', (row) => {
                    console.log(row)
                    dynamicCategories.add(row.Category.trim());
                    const productSummary = generateProductSummary(row);
                    records.push(productSummary);
                })
                .on('end', resolve)
                .on('error', reject);
        });
    } else if (fileType === FileType.ORDERS) {
        await new Promise<void>((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csvParser())
                .on('header', (headers) => {
                    headers.forEach((header: string) => orderKeywords.add(header.trim().toLowerCase()));
                })
                .on('data', (row) => {
                    const orderSummary = generateOrderSummary(row);
                    records.push(orderSummary);
                })
                .on('end', resolve)
                .on('error', reject);
        });
    }

    const batchSize = 50;
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);

        try {
            await delay(1000); // Delay in milliseconds

            const embeddings = await Promise.all(batch.map(async record => {
                try {
                    return await getEmbedding(record.summary);
                } catch (error) {
                    console.error('Error getting embedding:', error);
                    return null; // Handle gracefully, skip failed embeddings
                }
            }));

            // Filter out any null embeddings due to failed requests
            const validEmbeddings = embeddings.filter(embedding => embedding !== null);

            if (validEmbeddings.length > 0) {
                if (fileType === FileType.PRODUCTS) {
                    await collection.add({
                        ids: batch.map((_, index) => `${filePath}-${i + index}`),
                        embeddings: validEmbeddings,
                        metadatas: batch.map(record => ({
                            source: filePath,
                            category: record.metadata.category,
                            price: record.metadata.price,
                            rating: record.metadata.rating,
                            productName: record.metadata.productName,
                            merchantID: record.metadata.merchantID,
                            clusterLabel: record.metadata.clusterLabel,
                        })),
                        documents: batch.map(record => record.summary),
                    });
                } else if (fileType === FileType.ORDERS) {
                    await collection.add({
                        ids: batch.map((_, index) => `${filePath}-${i + index}`),
                        embeddings: validEmbeddings,
                        metadatas: batch.map(record => ({
                            source: filePath,
                            category: record.metadata.category,
                            shippingDate: record.metadata.shippingDate,
                            returnEligible: record.metadata.returnEligible,
                            productName: record.metadata.productName,
                            customerID: record.metadata.customerID,
                            orderID: record.metadata.orderID,
                        })),
                        documents: batch.map(record => record.summary),
                    });
                }
                
                console.log(`Processed ${Math.min(i + batchSize, records.length)} of ${records.length} records`);
            } else {
                console.log(`All embeddings in batch starting at ${i} failed.`);
            }
        } catch (error) {
            console.error(`Failed processing batch at index ${i}:`, error);
        }
    };
    console.log('Dynamic Categories:', Array.from(dynamicCategories));
    console.log('Product Keywords:', Array.from(productKeywords));
    console.log('Order Keywords:', Array.from(orderKeywords));
}
export const getDynamicCategories = () => Array.from(dynamicCategories);
export const getProductKeywords = () => Array.from(productKeywords);
export const getOrderKeywords = () => Array.from(orderKeywords);

async function getEmbedding(text: string): Promise<number[]> {
    try {
        const response = await axios.post(
            OPENAI_API_URL_EMBEDDINGS,
            {
                model: EMBEDDING_MODEL,
                input: text
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                }
            }
        );

        return response.data.data[0].embedding;
    } catch (error) {
        console.error('Error fetching embedding from OpenAI:', error);
        throw error;
    }
}

function generateProductSummary(row: Record<string, string>): {
    summary: string,
    metadata: { category: string, price: string, rating: string, productName: string, merchantID: string, clusterLabel: string }
} {
    const normalizedRow: any = Object.keys(row).reduce((acc, key) => {
        const normalizedKey = key.trim().replace(/ /g, '');
        acc[normalizedKey] = row[key];
        return acc;
    }, {});

    const {
        ProductID,
        ProductName,
        MerchantID,
        ClusterID,
        ClusterLabel,
        CategoryID,
        Category,
        Price,
        StockQuantity,
        Description,
        Rating,
    } = normalizedRow;

    const summary = `
    Product ID: ${ProductID}.
    Product Name: "${ProductName}".
    Merchant ID: ${MerchantID}.
    Cluster ID: ${ClusterID}.
    Cluster Label: "${ClusterLabel}".
    Category ID: ${CategoryID}.
    Category: ${Category}.
    Price: $${Price}.
    Stock Quantity: ${StockQuantity}.
    Description: "${Description}".
    Rating: ${Rating} stars.
    `.trim().replace(/\s+/g, ' ');

    const metadata = {
        category: Category,
        price: Price,
        rating: Rating,
        productName: ProductName,
        merchantID: MerchantID,
        clusterLabel: ClusterLabel,
    };

    return { summary, metadata };
}

function generateOrderSummary(row: Record<string, string>): {
    summary: string,
    metadata: { category: string, shippingDate: string, returnEligible: string, productName: string, customerID: string, orderID: string }
} {
    const normalizedRow: any = Object.keys(row).reduce((acc, key) => {
        const normalizedKey = key.trim().replace(/ /g, '');
        acc[normalizedKey] = row[key];
        return acc;
    }, {});

    const {
        ProductID,
        ProductName,
        CustomerID,
        OrderID,
        CategoryID,
        Category,
        OrderStatus,
        ShippingDate,
        ReturnEligible,
    } = normalizedRow;

    const summary = `
    Product ID: ${ProductID}.
    Product Name: "${ProductName}".
    Customer ID: ${CustomerID}.
    OrderID: "${OrderID}".
    Category ID: ${CategoryID}.
    Category: ${Category}.
    OrderStatus: ${OrderStatus}.
    ShippingDate: $${ShippingDate}.
    ReturnEligible: ${ReturnEligible}.
    `.trim().replace(/\s+/g, ' ');

    const metadata = {
        category: Category,
        shippingDate: ShippingDate,
        returnEligible: ReturnEligible,
        productName: ProductName,
        customerID: CustomerID,
        orderID: OrderID,
        orderStatus: OrderStatus
    };

    return { summary, metadata };
}