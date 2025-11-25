# NFC Digital Business Card System

A complete solution for creating, customizing, and sharing digital business cards with NFC support.

## Features

*   **Interactive Card Editor**: Drag-and-drop interface to customize your card.
*   **Live Preview**: See changes in real-time.
*   **Multiple Layouts**: Choose from Classic, Modern, and Vertical layouts.
*   **Custom Backgrounds**: Upload your own or choose from a gallery.
*   **Social Media Integration**: Link to WhatsApp, Facebook, LinkedIn, Instagram, and more.
*   **QR Code Generation**: Auto-generate QR codes for your card or vCard.
*   **Export Options**: Download as PNG, PDF, or VCF (vCard).
*   **Gallery**: Browse and manage your saved designs.
*   **Viewer Page**: Professional public view for your digital card.
*   **Analytics**: Track views and clicks (basic implementation).
*   **SEO Optimized**: Meta tags for social sharing.

## Tech Stack

*   **Backend**: Node.js, Express.js
*   **Database**: MongoDB
*   **Frontend**: Vanilla JavaScript, HTML5, CSS3
*   **Templating**: EJS
*   **Image Processing**: Sharp, Multer
*   **Security**: Helmet, CORS, Rate Limiting, DOMPurify

## Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/nfc-business-card.git
    cd nfc-business-card
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory (or rename `.env.example`):
    ```env
    PORT=3000
    MONGO_URI=mongodb://localhost:27017/nfc-cards
    MONGO_DB=nfc-cards
    NODE_ENV=development
    ```

4.  **Start the server:**
    ```bash
    npm start
    ```
    For development with auto-restart:
    ```bash
    npm run dev
    ```

5.  **Access the application:**
    Open `http://localhost:3000` in your browser.

## Deployment

This project is ready for deployment on Render.com.
See [deployment_guide.md](deployment_guide.md) for detailed instructions.

## API Endpoints

*   `POST /api/save-design`: Save a new card design.
*   `GET /api/get-design/:id`: Retrieve a design by ID.
*   `GET /api/gallery`: List public designs.
*   `GET /api/gallery/backgrounds`: List available background images.
*   `POST /api/upload-image`: Upload an image file.

## License

MIT License
