import axios from 'axios'
import { ChromaClient } from 'chromadb'
import { FileType, getConfig, getImportType } from '../utils'
import { getProductKeywords, getOrderKeywords, getDynamicCategories } from './import'

const { EMBEDDING_MODEL, OPENAI_API_KEY, mainmodel, OPENAI_API_URL_EMBEDDINGS, OPENAI_API_URL_COMPLETIONS, CHROMA_URL } = getConfig()

const chroma = new ChromaClient({ path: CHROMA_URL })

const desiredNumberOfResults = 10000

const getCategoryEmbeddings = async () => {
    const categoryEmbeddings = {}
	const categories = [ "Fridges", "TVs", "Mobile Phones", "Digital Cameras", "Fridge Freezers",
        "Dishwashers", "CPUs", "Freezers", "Washing Machines", "Microwaves" , "Status", "Order ID"  
      ]
    console.log(categories)
    for (const category of categories) {
        categoryEmbeddings[category] = await getOpenAIEmbedding(category)
    }

    return categoryEmbeddings
}

async function determineSearchCollection(query: string): Promise<FileType> {
    const prompt = `
         You are a classifier that assigns user queries to two categories: "Product" or "Order".

        - "Product": The user is looking for items to browse, compare, or learn about.
        - "Order": The user is asking about buying, shipping, returns, or payment related actions. This includes order status, tracking, returns, payments, etc.

        Here are some examples:

        - "I want to see TVs and laptops." -> Product
        - "Can I track my order?" -> Order
        - "I'm interested in buying a PC." -> Product
        - "Where is my order?" -> Order
        - "Has my order shipped?" -> Order
        - "How much does the AMD Ryzen 5 cost?" -> Product
        - "What is the status of my order for the AMD Ryzen 5?" -> Order (even though it mentions the product, the query is about the order status)

        Query: "${query}"
        Respond with one word only: "Product" or "Order".
    `;

    try {
        const response = await axios.post(
            OPENAI_API_URL_COMPLETIONS,
            {
                model: mainmodel,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 10,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                },
            }
        );

        const classification = response.data.choices?.[0]?.message?.content.trim();
        console.log(classification)
        return classification === 'Product' ? FileType.PRODUCTS : FileType.ORDERS;
    } catch (error) {
        console.error('Error in GPT classification:', error.response?.data || error.message);
        throw error;
    }
}

async function extractCategoryFromInput(userInput: string) {
    const inputEmbedding = await getOpenAIEmbedding(userInput.toLowerCase()) // Embed user input
    const categoryEmbeddings = await getCategoryEmbeddings() // Get predefined category embeddings

    // Find the most similar category using cosine similarity
    let maxSimilarity = -1
    let bestMatchCategory

    for (const [category, categoryEmbedding] of Object.entries(categoryEmbeddings)) {
        const similarity = cosineSimilarity(inputEmbedding, categoryEmbedding)

        if (similarity > maxSimilarity) {
            maxSimilarity = similarity
            bestMatchCategory = category
        }
    }

    return { bestMatchCategory, maxSimilarity }
}

function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, val, index) => sum + val * vecB[index], 0)
    const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0))
    const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0))

    return dotProduct / (magnitudeA * magnitudeB)
}

async function getCollectionBasedOnInput(query: string, embedding: number[]): Promise<any> {
    const fileType = await determineSearchCollection(query)
    const collection = await chroma.getOrCreateCollection({
        name: getImportType(fileType),
        metadata: { "hnsw:space": "cosine" }
    })

    const searchResults = await collection.query({
        queryEmbeddings: [embedding],
        nResults: desiredNumberOfResults,
    })
    

    return {searchResults, fileType}
}

function processSearchResults(searchResults: any, category: string, fileType: FileType): any[] {
    let filteredDocs = searchResults.documents[0]
        .map((doc: string | null, index: number) => ({
            doc,
            metadata: searchResults.metadatas[0][index]
        }))

    if(fileType == FileType.PRODUCTS)
        filteredDocs = filteredDocs.filter(({ doc, metadata }) => doc !== null && metadata.category === category)

    return parseData(filteredDocs.map(({ doc }) => doc))
}

async function getOpenAIEmbedding(text: string): Promise<number[]> {
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
        )

        return response.data.data[0].embedding
    } catch (error) {
        console.error('Error fetching embedding from OpenAI:', error.response?.data || error.message)
        throw error
    }
}

// Function to generate response using OpenAI
async function generateChatResponse(userQuery: string, fileType: FileType, relevantData?: any[]): Promise<string> {
    let systemPrompt: string
    let completePrompt: string

    if (relevantData && relevantData.length > 0) {
        if(fileType == FileType.PRODUCTS){
            systemPrompt = `
    You are an assistant helping users find the best products based on their preferences.
    Your responses should only include products that are relevant to the user's query and based on the available product data ${relevantData}. 
    Focus on providing recommendations that match the user's interest.

    Start the answer with a simple friendly sentence.

    When asked for product recommendations, provide a list of up to 5 products from the relevant data with the following format:

    - [ProductName] - [Price] | [Rating]
      [1-2 sentence description] focusing on the product's key features in a natural, conversational tone. Mention the product's main advantages, such as price, size, or special features. Keep the description short and to the point, making sure it's easy to read.

    Keep the tone informal yet informative. Avoid too many technical details, and focus on **why this product is a good choice** for the user. Focus on the product's unique selling points, such as price, features, and target audience.

    If the user specifies the number of products they want to get listed, list only as many as requested. In all other cases, provide a list of the top 5 relevant products.

    If the user asks for the best or the worst product, give only one product (worst or best) depending on the query.

    For example:
    - Sony KD75XF8596BU - $1,599.99 | ★★★
      A great 75" 4K HDR TV with excellent color accuracy, perfect for movie lovers looking for a home theater experience.

    When asked for product comparisons between two models, only compare the two models from the relevant data.

    Stick to products from the relevant data array: ${relevantData}.
    Ensure all products mentioned come from this data, and match the user's query as closely as possible.
`;




            const formattedData = relevantData.map((product) => {
                return `- ${product.ProductID} - ${product.ProductName} - ${product.Price} | ${product.Rating}\n  ${product.Description}`;
            }).join("\n");
            
            completePrompt = `
            User Query: "${userQuery}"
            
            Here are the top 5 [ProductName] based on your query for comparison:
            
            ${formattedData}
            
            Due to space, here are the top 5 options. Let me know if you'd like to explore more or need further assistance!
            `;
        }

        else {
            systemPrompt = `
    You are an assistant helping users with order-related inquiries. Your goal is to provide users with clear and concise information about their orders in a friendly, conversational tone.

     1. **Order Details:**
        - When the user queries an order, respond with a detailed but easy-to-read summary in the following format:
            - [ProductName] with ID: [OrderID] - It shipped on [Shipping Date] and is [OrderStatus]. You can still [Return Eligible].

    2. **Limit the Number of Orders:**
        - If there are multiple orders related to the user's query, return a **maximum of 5** orders.
        - Format each order as:
            - [ProductName] with ID: [OrderID] - It shipped on [Shipping Date] and is [OrderStatus]. You can still [Return Eligible].
    
            3. **Clarification Request:**
        - If the query is too broad or doesn’t return enough matching results, ask the user for more specific information.
        - For example:
            - "Could you clarify the **Order ID**, **Product Name**, or **Customer ID** so I can refine the search?"
            - "I found some orders, but they may not exactly match what you’re looking for. Can you specify an **Order ID**, **Product Name**, or **Customer ID**?"
    
    4. **Response Tone:**
        - Use a natural, friendly tone, avoiding any robotic phrasing.
        - The focus should always be on helping the user refine their search and ensuring they get the information they need.

    5. **Strict Output Format:**
        - Ensure that you always start with the **Product Name** followed by **Order ID**.
        - If the order is found, include the [Shipping Date], [OrderStatus], and [Return Eligible] in the response.
        - If the order status is undefined, make sure to state it clearly as: "Order status unavailable."
`;



const formattedData = relevantData?.map(order => {
    return `
    **Order ID: ${order.OrderID}** - Order Status: ${order.OrderStatus} | Shipping Date: ${order.ShippingDate} | Return Eligible: ${order.ReturnEligible}
    `
}).join("\n\n")

            completePrompt = `
            User Query: "${userQuery}"
            
            Here are the wanted orders based on your query:
            ${formattedData}
            `
        }
        

    } else {
        systemPrompt = `
            You are a helpful and friendly assistant. When users express any emotion or ask for help, encourage them by acknowledging their feelings and suggesting a product or service that could improve their mood or situation. Always keep the tone upbeat, empathetic, and subtly promotional. 
    For example:
    - If the user says they're sad, respond with something like, "That's okay, everyone has a tough day sometimes! But hey, a little treat from our store could help brighten your day!"
    - If they ask for advice, provide product suggestions while emphasizing how it could meet their needs.
    - Be supportive, understanding, and encourage action in a positive, light-hearted way.
            `
            completePrompt = `
            User Query: "${userQuery}"
            System Prompt: ${systemPrompt}
            `
    }

    try {
        const response = await axios.post(
            OPENAI_API_URL_COMPLETIONS,
            {
                model: mainmodel,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: completePrompt }
                ],
                max_tokens: 500,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                }
            }
        )

        return response.data.choices?.[0]?.message?.content.trim() || ''
    } catch (error) {
        console.error('Error generating chat response from OpenAI:', error.response?.data || error.message)
        throw error
    }
}


// Main export function to handle search and response
export const handleSearchAndRespond = async (query: string, context: string[] = []) => {
    console.log(context)
    const contextualQuery = context.length > 0 
    ? `
    Here's the relevant chat history for context. Use this to inform your answer, but focus on the main user input:

    Chat History:
    ${context.map((entry, index) => `(${index + 1}) ${entry}`).join("\n")}

    Main User Input:
    ${query}
    ` 
    : query;

    const embedding = await getOpenAIEmbedding(contextualQuery)
    const categoryFromInput = await extractCategoryFromInput(contextualQuery)
    const creativityMargin = 0.25
    console.log(categoryFromInput)
    const searchResults = await getCollectionBasedOnInput(contextualQuery, embedding)
    if (categoryFromInput.maxSimilarity < creativityMargin) {
        return { result: await generateChatResponse(contextualQuery, searchResults.fileType), data: [] }
    }
    const relevantData = processSearchResults(searchResults.searchResults, categoryFromInput.bestMatchCategory, searchResults.fileType)
    const response = await generateChatResponse(contextualQuery, searchResults.fileType, relevantData)

    return { result: response, data: relevantData }
}

// Parse data by removing specific unwanted results
const parseData = (data: (string | null)[]) => {
    return data.map(item => {
        const obj: Record<string, any> = {}
        item?.split('. ').forEach(field => {
            const [key, value] = field.split(': ')
            if (key && value) {
                const cleanedKey = key.trim()
                const cleanedValue = value.trim().replace(/"(.+)"/, '$1')
                const numberValue = parseFloat(cleanedValue)
                obj[cleanedKey] = isNaN(numberValue) || cleanedValue.includes('$')
                    ? cleanedValue
                    : numberValue
            }
        })
        return obj
    })
}