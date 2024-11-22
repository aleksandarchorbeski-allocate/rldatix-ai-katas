import React from "react";
import { Product } from "./Product";

type ProductTableProps = {
    products: Product[];
};

const ProductTable: React.FC<ProductTableProps> = ({ products }) => {
    return (
        <table border={1} style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
                <tr>
                    {Object.keys(products[0]).map((key) => (
                        <th key={key} style={{ padding: "10px", textAlign: "left" }}>
                            {key}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {products.map((product, index) => (
                    <tr key={index}>
                        {Object.values(product).map((value, idx) => (
                            <td key={idx} style={{ padding: "10px" }}>
                                {value}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default ProductTable;
