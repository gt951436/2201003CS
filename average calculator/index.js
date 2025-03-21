const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 5000;
const WINDOW_SIZE = 10;
let slidingWindow = []; // sliding window of numbers

// Authentication token (use the provided token)
const AUTH_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzQyNTY0MTQ0LCJpYXQiOjE3NDI1NjM4NDQsImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6ImI2YjY0OTRkLWI3ZDktNDE0My1iNWI5LTlhNzA3ZGJjNThiZiIsInN1YiI6ImdhcnYuMjIwMTAwM2NzQGlpaXRiaC5hYy5pbiJ9LCJjb21wYW55TmFtZSI6IklJSVQgQkhBR0FMUFVSIiwiY2xpZW50SUQiOiJiNmI2NDk0ZC1iN2Q5LTQxNDMtYjViOS05YTcwN2RiYzU4YmYiLCJjbGllbnRTZWNyZXQiOiJRUW1qS3RvREVYc3pyak5yIiwib3duZXJOYW1lIjoiR2FydiBUeWFnaSIsIm93bmVyRW1haWwiOiJnYXJ2LjIyMDEwMDNjc0BpaWl0YmguYWMuaW4iLCJyb2xsTm8iOiIyMjAxMDAzQ1MifQ.CKzXghMRSZhcKnOQ1eSFWIQIHWoicRsLpHuuSv28Lp8";

// Map qualified number IDs to their corresponding external API endpoints.
const API_URLS = {
  p: "http://20.244.56.144/test/primes",
  f: "http://20.244.56.144/test/fibo",
  e: "http://20.244.56.144/test/even",
  r: "http://20.244.56.144/test/rand",
};

app.get("/numbers/:numberid", async (req, res) => {
  const { numberid } = req.params;
  console.log(numberid);
  if (!API_URLS[numberid]) {
    return res
      .status(400)
      .json({ error: "Invalid number id. Use one of p, f, e, r." });
  }

  // Preserve the current window state before updating.
  const windowPrevState = [...slidingWindow];
  let apiNumbers = [];

  try {
    // Call the external API with a 500ms timeout and include the authentication token in the header.
    const response = await axios.get(API_URLS[numberid], {
      timeout: 500,
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    });
    apiNumbers = response.data.numbers;
  } catch (error) {
    // On error or timeout, return previous state without updating.
    const avg =
      slidingWindow.length > 0
        ? (
            slidingWindow.reduce((a, b) => a + b, 0) / slidingWindow.length
          ).toFixed(2)
        : "0.00";
    return res.json({
      windowPrevState: windowPrevState,
      windowCurrState: windowPrevState,
      numbers: [],
      avg: avg,
    });
  }

  // Add unique numbers from the API response to the sliding window.
  apiNumbers.forEach((num) => {
    if (!slidingWindow.includes(num)) {
      slidingWindow.push(num);
    }
  });

  // Ensure the window does not exceed WINDOW_SIZE.
  while (slidingWindow.length > WINDOW_SIZE) {
    slidingWindow.shift(); // Remove the oldest number (FIFO)
  }

  // Calculate the average of the numbers currently in the window.
  const avg =
    slidingWindow.length > 0
      ? (
          slidingWindow.reduce((a, b) => a + b, 0) / slidingWindow.length
        ).toFixed(2)
      : "0.00";

  // Respond with the previous window state, current window state, the numbers from the API, and the computed average.
  res.json({
    windowPrevState: windowPrevState,
    windowCurrState: slidingWindow,
    numbers: apiNumbers,
    avg: avg,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
