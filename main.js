import fs from "fs/promises";
import fetch from "node-fetch";
import { OpenAI } from "openai";
import { colors } from "./config/colors.js";
import { displayBanner } from "./config/banner.js";
import { CountdownTimer } from "./config/countdown.js";
import { logger } from "./config/logger.js";

const API_CONFIG = {
  GAIA_DOMAIN: "pornhub",
  BASE_URL: "gaia.domains",
  ENDPOINT: "/v1/chat/completions",
  ORIGIN: "https://www.gaianet.ai",
  REFERER: "https://www.gaianet.ai/",
};

const API_URLS = {
  GAIANET: `https://${API_CONFIG.GAIA_DOMAIN}.${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINT}`,
};

const API_KEYS = {
  OPENAI: "",  // Replace with your OpenAI API key
};

const MODEL_CONFIG = {
  OPENAI: {
    NAME: "gpt-3.5-turbo",
    TEMPERATURE: 0.9,
    MAX_TOKENS: 64,
  },
  GAIA: {
    NAME: "qwen2-0.5b-instruct",
  },
};
const RETRY_CONFIG = {
  MAX_ATTEMPTS: 10,
  INITIAL_WAIT: 3,
  NORMAL_WAIT: 5,
  ERROR_WAIT: 10,
};

const TOPICS = [
  "Ask about the history of the FIFA World Cup",
  "Ask about famous football players like Messi, Ronaldo, and Pele",
  "Ask about how VAR (Video Assistant Referee) works in football",
  "Ask about the biggest football leagues, such as the Premier League and La Liga",
  "Ask about the rules of football and how they have evolved over time",
  "Ask about the upcoming football events or tournaments",
  "Ask about the role of coaches in football teams",
  "Ask about football tactics and formations",
  "Ask about the impact of football on global culture",
  "Ask about the biggest football rivalries, such as El Clasico",
];

const SYSTEM_PROMPTS = {
  OPENAI_USER: "You are a football enthusiast asking about the sport, its history, players, and upcoming events.",
  GAIA_GUIDE: "You are an expert guide on football, answering questions with clear and concise details about the sport.",
};

// (Rest of the code remains unchanged)


const BROWSER_CONFIG = {
  USER_AGENT:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  CHROME_VERSION: "131",
  BRAND_VERSION: "24",
};

const openai = new OpenAI({
  apiKey: API_KEYS.OPENAI,
});

const timer = new CountdownTimer();

async function getAuthToken() {
  try {
    const data = await fs.readFile("data.txt", "utf8");
    return data.trim();
  } catch (error) {
    logger.error(
      `${colors.error}Error reading auth token: ${error}${colors.reset}`
    );
    return null;
  }
}

function createGaianetHeaders(authToken) {
  return {
    authority: `${API_CONFIG.GAIA_DOMAIN}.${API_CONFIG.BASE_URL}`,
    method: "POST",
    path: API_CONFIG.ENDPOINT,
    scheme: "https",
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9",
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json",
    Origin: API_CONFIG.ORIGIN,
    Referer: API_CONFIG.REFERER,
    "Sec-Ch-Ua": `"Google Chrome";v="${BROWSER_CONFIG.CHROME_VERSION}", "Not_A_Brand";v="${BROWSER_CONFIG.BRAND_VERSION}"`,
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
    "User-Agent": BROWSER_CONFIG.USER_AGENT,
  };
}

async function getOpenAIResponse(prompt) {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.OPENAI_USER },
        { role: "user", content: prompt },
      ],
      model: MODEL_CONFIG.OPENAI.NAME,
      temperature: MODEL_CONFIG.OPENAI.TEMPERATURE,
      max_tokens: MODEL_CONFIG.OPENAI.MAX_TOKENS,
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    logger.error(`${colors.error}Error in OpenAI chat: ${error}${colors.reset}`);
    throw error;
  }
}

async function chatWithGaianet(
  openaiMessage,
  authToken,
  retryCount = RETRY_CONFIG.MAX_ATTEMPTS
) {
  for (let i = 0; i < retryCount; i++) {
    try {
      const headers = createGaianetHeaders(authToken);
      headers["Connection"] = "keep-alive";
      headers["Keep-Alive"] = "max=0";
      headers["Accept"] = "text/event-stream";

      const payload = {
        model: MODEL_CONFIG.GAIA.NAME,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPTS.GAIA_GUIDE,
          },
          {
            role: "user",
            content: openaiMessage,
          },
        ],
        stream: true,
        stream_options: {
          include_usage: true,
        },
      };

      const response = await fetch(API_URLS.GAIANET, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
        keepalive: true,
      });

      if (response.status === 401) {
        throw new Error(
          "Authentication failed - token may be invalid or expired"
        );
      }

      if (response.status === 504 || response.status === 429) {
        const delay = Math.pow(2, i) * 1000;
        logger.warn(
          `${colors.warning}Server busy, retrying in ${delay / 1000} seconds... (Attempt ${i + 1}/${retryCount})${colors.reset}`
        );
        await timer.start(delay / 1000, {
          colors: {
            message: colors.brightYellow,
            timer: colors.yellow,
            reset: colors.reset,
          },
        });
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const stream = response.body;
      const decoder = new TextDecoder();
      let fullResponse = "";
      let buffer = "";

      for await (const chunk of stream) {
        const textChunk = decoder.decode(chunk);
        buffer += textChunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6);
            if (jsonStr === "[DONE]") continue;

            try {
              const data = JSON.parse(jsonStr);
              const content = data.choices[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                process.stdout.write(
                  `${colors.brightCyan}${content}${colors.reset}`
                );
              }
            } catch (e) {
              logger.error(
                `${colors.error}Error parsing response: ${e}${colors.reset}`
              );
            }
          }
        }
      }

      return fullResponse;
    } catch (error) {
      if (i === retryCount - 1) {
        throw error;
      }
      logger.error(
        `${colors.error}Error in attempt ${i + 1}: ${error}${colors.reset}`
      );
      await timer.start(RETRY_CONFIG.INITIAL_WAIT, {
        colors: {
          message: colors.brightRed,
          timer: colors.red,
          reset: colors.reset,
        },
      });
    }
  }
}

async function main() {
  try {
    console.clear();
    displayBanner();
    logger.info(`${colors.info}Starting Auto Chat Program...${colors.reset}`);

    const gaianetToken = await getAuthToken();
    if (!gaianetToken) {
      throw new Error("Failed to get Gaianet authorization token");
    }
    logger.success(
      `${colors.success}Authentication token loaded successfully${colors.reset}`
    );

    let interactionCount = 1;
    let topicIndex = 0;

    while (true) {
      try {
        logger.info(
          `${colors.bannerBorder}━━━━━━━━━━ ${colors.brightYellow}Interaction #${interactionCount}${colors.bannerBorder} ━━━━━━━━━━${colors.reset}`
        );

        const currentTopic = TOPICS[topicIndex % TOPICS.length];
        const openaiMessage = await getOpenAIResponse(currentTopic);
        logger.info(`${colors.brightCyan}OpenAI (as User):${colors.reset}`);
        logger.info(`${colors.cyan}└─ ${colors.reset}${openaiMessage}`);

        logger.info(`${colors.brightMagenta}Gaianet Assistant:${colors.reset}`);
        logger.info(`${colors.magenta}└─ ${colors.reset}`);
        const gaiaResponse = await chatWithGaianet(openaiMessage, gaianetToken);

        interactionCount++;
        topicIndex++;

        logger.warn(
          `${colors.warning}Waiting for next interaction...${colors.reset}`
        );
        await timer.start(RETRY_CONFIG.NORMAL_WAIT, {
          colors: {
            message: colors.brightYellow,
            timer: colors.yellow,
            reset: colors.reset,
          },
        });
      } catch (error) {
        logger.error(
          `${colors.error}Error in interaction: ${error}${colors.reset}`
        );
        logger.warn(`${colors.warning}Waiting before retry...${colors.reset}`);
        await timer.start(RETRY_CONFIG.ERROR_WAIT, {
          colors: {
            message: colors.brightRed,
            timer: colors.red,
            reset: colors.reset,
          },
        });
      }
    }
  } catch (error) {
    logger.error(`${colors.error}Critical error: ${error}${colors.reset}`);
  }
}

main();
