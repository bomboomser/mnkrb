# GaiaBOT - AI Chat Integration

A Node.js application that integrates Groq and Gaianet AI services for interactive chat conversations about Paris tourism.

## Features

- Dual AI interaction (Groq as user, Gaianet as assistant)
- Automatic topic rotation
- Colorful console output
- Smart retry mechanism
- Progress countdown timer
- Error handling and recovery

## Prerequisites

- Node.js 18 or higher
- npm (Node Package Manager)
- Gaianet account
- Groq API key

## Installation

1. Clone the repository:

```bash
git clone https://github.com/bomboomser/mnkrb
cd mnkrb
```

2. Install dependencies:

```bash
npm install
```

3. edit configuration files:

## Configuration

### 1. Gaianet Setup

1. Register at [Gaianet]
2. Install node
3. After install node go to `https://your node id.us.gaianet.network`
4. Open browser Developer Tools (F12)
5. Send one test message
6. In Network tab, find request to `/v1/chat/completions`
7. From request headers, copy the Bearer token value
8. Paste the token into `data.txt`

### 2. Groq Setup

1. Visit [Groq Console](https://console.groq.com/keys)
2. Create a new API key
3. Copy the API key and replace it in `main.js`:

```javascript
const API_KEYS = {
  GROQ: "your_groq_api_key_here",
};
```

## Usage

Run the application:

```bash
node main.js
```

The bot will:

1. Load configurations and display banner
2. Connect to both AI services
3. Start cycling through tourism topics
4. Display colored conversation output
5. Handle errors and retry automatically

## Configuration Options

You can modify various settings in `main.js`:

- `RETRY_CONFIG`: Adjust retry attempts and wait times
- `TOPICS`: Customize conversation topics
- `SYSTEM_PROMPTS`: Modify AI behavior prompts
- `MODEL_CONFIG`: Adjust AI model parameters

## Error Handling

The application includes:

- Exponential backoff for retries
- Token validation
- Stream parsing error recovery
- Network error handling

## Dependencies

- `node-fetch`: HTTP client
- `groq-sdk`: Groq AI integration
- `figlet`: ASCII art banner
- `winston`: Logging system

## Project Structure

```
gaiabot/
├── config/
│   ├── banner.js
│   ├── colors.js
│   ├── countdown.js
│   └── logger.js
├── main.js
├── data.txt
└── README.md
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions:

1. Check the error logs
2. Verify your API keys and tokens
3. Ensure all prerequisites are met
4. Create an issue in the repository
