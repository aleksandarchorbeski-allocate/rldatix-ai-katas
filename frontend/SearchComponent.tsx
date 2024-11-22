import { useState, useRef, useEffect } from "react";
import ProductTable from "./ProductTable";
import { Product } from "./Product";
import { getConfig } from '../utils';

const SearchComponent = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState<boolean>(false);
    const [previousChats, setPreviousChats] = useState<any[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [showData, setShowData] = useState(false);
    const chatHistoryRef = useRef<HTMLDivElement>(null);
    const { BACKEND_URL } = getConfig();

    const scrollToBottom = () => {
        if (chatHistoryRef.current) chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    };

    useEffect(() => {
        scrollToBottom();
    }, [previousChats]);

    const handleSearch = async () => {
        setSearchQuery('');
        if (!searchQuery) {
            alert("Please enter a query to search.");
            return;
        }
        const context = previousChats.map(chat => chat.prompt);
        setPreviousChats((prevChats) => [...prevChats, { prompt: searchQuery, answer: "..." }]);
        setLoading(true);
        setProducts([]);
        try {
            const response = await fetch(`${BACKEND_URL}/api/search`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: searchQuery, context }),
            });
            const data = await response.json();
            setLoading(false);
            setPreviousChats((prevChats) => [
                ...prevChats.slice(0, -1),
                { prompt: searchQuery, answer: data.result || data.message || "No results found." }
            ]);
            if (data.data) setProducts(data.data);
        } catch {
            setLoading(false);
            setPreviousChats((prevChats) => [
                ...prevChats.slice(0, -1),
                { prompt: searchQuery, answer: "Error occurred while searching." }
            ]);
        }
    };

    const handleKeyDown = (event: any) => {
        if (event.key === 'Enter') handleSearch();
    };

    return (
        <div className="container">
            <div className="right-panel">
                <div className="chat-box">
                    <div className="chat-history" ref={chatHistoryRef}>
                        {previousChats.map((chat, index) => (
                            <div key={index} className="chat-item">
                                <pre className="chat-bubble user-bubble">{chat.prompt}</pre>
                                <pre className="chat-bubble assistant-bubble">{chat.answer}</pre>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="input-section">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={loading}
                        placeholder="Enter search query"
                        className="input-panel"
                        onKeyDown={handleKeyDown}
                    />
                    <button className="input-button" onClick={handleSearch} disabled={loading}>
                        {loading ? "..." : "➜"}
                    </button>
                </div>
                <button className="show-data-button" onClick={() => setShowData(!showData)}>
                    ...
                </button>
            </div>
            {showData && (
                <div className="left-panel">
                    {products.length > 0 && <ProductTable products={products} />}
                </div>
            )}
        </div>
    );
};

export default SearchComponent;
