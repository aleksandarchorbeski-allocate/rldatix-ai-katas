# ShopWise Solutions - AI-Powered Customer Support Assistant

## Overview

Welcome to the ShopWise Solutions AI-Powered Customer Support Assistant repository! This project is designed to enhance customer experience by providing a responsive AI assistant for addressing inquiries related to products, orders, returns, and refunds. Our solution integrates cutting-edge AI with a scalable and efficient infrastructure, hosted on AWS EC2 and built with modern web technologies.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Option 1: Using Docker Compose](#option-1-using-docker-compose)
  - [Option 2: Manual Setup Using Bun](#option-2-manual-setup-using-bun)
- [Usage](#usage)
- [Technologies Used](#technologies-used)
- [Project Structure](#project-structure)
- [Contribution](#contribution)
- [License](#license)

## Features
- **Natural Language Understanding**: The AI assistant is capable of understanding and processing customer inquiries, leveraging OpenAI's GPT-4.
- **Product and Order Management**: Integration with existing datasets for real-time product and order information.
- **Scalable and Robust Architecture**: Docker containerization ensures isolated environments for each component, making deployment straightforward.
- **In-Memory Context Handling**: To deliver a more personalized experience, the assistant maintains conversation context throughout interactions.

## Getting Started
To get started with the AI-powered assistant, you have two primary options for setting up the project:

### Option 1: Using Docker Compose
This is the quickest way to spin up all necessary services in isolated containers.

1. **Clone the repository**:
   ```sh
   git clone https://github.com/aleksandarchorbeski-allocate/rldatix-ai-katas.git
   cd rldatix-ai-katas
   ```

2. **Run Docker Compose**:
   ```sh
   docker-compose up --build
   ```

   This command will build and start all the required services: frontend, backend, and the AI assistant.

3. **Access the Application**:
   - The frontend will be available at `http://localhost:5173`
   - The backend and API will be accessible as defined in the Docker configuration.

### Option 2: Manual Setup Using Bun
If you prefer a more hands-on setup or want to run individual components separately, follow these steps:

1. **Clone the repository**:
   ```sh
   git clone https://github.com/aleksandarchorbeski-allocate/rldatix-ai-katas.git
   cd rldatix-ai-katas
   ```

2. **Install dependencies**:
   Make sure you have [Bun](https://bun.sh) installed. Then, run:
   ```sh
   bun install
   ```

3. **Start the Backend**:
   Navigate to the backend folder and start the server:
   ```sh
   bun backend
   ```

4. **Start the Frontend**:
   In a separate terminal window, navigate to the frontend folder:
   ```sh
   bun dev
   ```

5. **Access the Application**:
   - The frontend will be available at `http://localhost:5173`.

## Usage
Once the application is running, users can interact with the AI assistant directly through the web interface. The AI assistant is designed to handle:
- Product inquiries (e.g., availability, comparisons)
- Order-related questions (e.g., order status, return eligibility)

The assistant provides a responsive and context-aware experience by leveraging embedded data stored in ChromaDB and real-time integration with product and order datasets.

## Technologies Used
- **Frontend**: TypeScript, React, Vite
- **Backend**: Bun, TypeScript
- **AI Model**: OpenAI's GPT-4
- **Vector Database**: ChromaDB for semantic embedding and search
- **Containerization**: Docker & Docker Compose

## Project Structure
```
root/
  ├── backend/              # Backend services using Bun
  ├── frontend/             # React frontend
  ├── docker-compose.yml    # Docker Compose configuration
  ├── datasets/             # Product and order datasets
  ├── README.md             # Project documentation
```

## Contribution
Contributions are welcome! If you'd like to contribute to the project, please fork the repository and use a feature branch. Pull requests are reviewed actively.

---
Thank you for taking the time to explore our AI-Powered Customer Support Assistant. We hope you find the solution effective, and we look forward to your feedback. Happy coding!
