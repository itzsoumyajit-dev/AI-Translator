# 🌐 AI Translator

![AI Translator Banner](https://raw.githubusercontent.com/itzsomebody/ai-translator/main/assets/banner.png)

> [!NOTE]
> **AI Translator** is a high-fidelity, standalone desktop application designed for seamless, high-performance translations using advanced AI engines.

## ✨ Key Features

- **🎯 Dual-Mode Interface**: 
  - **Hub**: A central command center for browser detection and application management.
  - **Translator**: A compact, always-on-top focused translation view.
- **🧠 Smart Chunking Engine**: Automatically handles massive text queries (up to 500,000+ characters) by intelligently splitting text into sentence-aware chunks.
- **⚡ Performance First**: Local TTL-based caching significantly speeds up repeated translation queries.
- **🎨 Premium Design**: Built with a modern glassmorphism aesthetic, featuring transparent windows, fluid animations, and a sleek dark-mode interface.
- **🔌 Standalone Power**: No background server required. Everything runs locally via Electron IPC for maximum privacy and speed.
- **🌍 Global Language Support**: Integrated with the MyMemory AI API for high-accuracy translation across hundreds of language pairs.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/itzsomebody/ai-translator.git
   ```

2. Navigate to the project directory:
   ```bash
   cd ai-translator
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

### Usage

To launch the application in development mode:
```bash
npm run dev
```

For standard production launch:
```bash
npm start
```

## 🛠️ Architecture

The application is structured for modularity and performance:

- **`main.js`**: The Electron main process, handling window management and IPC communication.
- **`server/`**: The core logic engine (Language definitions, Translation logic, and API integration).
- **`hub/`**: The launcher UI and browser bridge.
- **`translator/`**: The standalone translation interface.

## ⚙️ Technical Highlights

- **Translation Engine**: Uses the MyMemory API with a custom-built retry mechanism and exponential backoff.
- **Text Processing**: Implements a robust `chunkText` algorithm to respect sentence boundaries during large query processing.
- **IPC Communication**: Secure `contextIsolation` and `preload` scripts for safe communication between the UI and system logic.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">Made with ❤️ for global communication.</p>
