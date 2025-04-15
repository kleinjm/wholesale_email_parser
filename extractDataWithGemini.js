/**
 * Calls the Gemini API to extract structured data from email text.
 * @param {string} emailBody The plain text body of the email.
 * @param {string} promptInstructions The specific instructions for Gemini.
 * @return {object|null} The parsed JSON object from Gemini's response, or null on error/failure.
 */
function extractDataWithGemini(emailBody, promptInstructions) {
  const fullPrompt = `${promptInstructions}\n\n--- EMAIL BODY START ---\n${emailBody}\n--- EMAIL BODY END ---`;

  // Truncate very long bodies to avoid exceeding API limits (adjust limit as needed)
  const MAX_BODY_LENGTH = 15000; // Gemini Pro context window is large, but keep requests reasonable
  const truncatedBodyPrompt = fullPrompt.length > MAX_BODY_LENGTH
    ? `${promptInstructions}\n\n--- EMAIL BODY START (TRUNCATED) ---\n${emailBody.substring(0, MAX_BODY_LENGTH)}\n--- EMAIL BODY END ---`
    : fullPrompt;


  const payload = JSON.stringify({
    contents: [{
      parts: [{
        text: truncatedBodyPrompt
      }]
    }],
    // Optional: Add safety settings and generation config if needed
    // generationConfig: {
    //   temperature: 0.2, // Lower temperature for more deterministic extraction
    //   maxOutputTokens: 1024,
    // },
    // safetySettings: [
    //  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    //  // Add other categories as needed, be careful disabling blocks
    // ]
  });

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: payload,
    muteHttpExceptions: true // IMPORTANT: Allows us to handle errors manually
  };

  let response;
  let responseCode;
  let responseBody;

  try {
    response = UrlFetchApp.fetch(GEMINI_API_ENDPOINT, options);
    responseCode = response.getResponseCode();
    responseBody = response.getContentText();
  } catch (e) {
    // Catch network errors during the fetch itself
    Logger.log(`   ERROR during UrlFetchApp.fetch: ${e}`);
    Logger.log(`   Endpoint: ${GEMINI_API_ENDPOINT.substring(0, 80)}...`) // Don't log full URL with key
    throw new Error(`Network error calling Gemini API: ${e.message}`); // Re-throw to be caught by the main loop
  }


  if (responseCode === 200) {
    try {
      const responseJson = JSON.parse(responseBody);

      // Navigate the Gemini response structure
      // Check existence of nested properties carefully
      const candidate = responseJson?.candidates?.[0];
      const content = candidate?.content;
      const part = content?.parts?.[0];
      const generatedText = part?.text;

      if (generatedText) {
        // Attempt to parse the generated text AS JSON (since we asked for it)
        try {
          // Clean potential markdown code fences (```json ... ```) sometimes added by the model
          const cleanedJsonText = generatedText.replace(/^```json\s*|```$/g, '').trim();
          const extractedJson = JSON.parse(cleanedJsonText);
          return extractedJson; // Success! Return the parsed object
        } catch (jsonParseError) {
          Logger.log(`   ERROR parsing JSON response from Gemini: ${jsonParseError}`);
          Logger.log(`   Gemini raw response text: ${generatedText}`);
          return null; // Failed to parse the JSON Gemini returned
        }
      } else {
        Logger.log("   WARN: Gemini response received, but no text content found.");
        Logger.log(`   Full API Response (check for errors/finishReason): ${responseBody}`);
        if (candidate?.finishReason && candidate.finishReason !== "STOP") {
          Logger.log(`   Gemini Finish Reason: ${candidate.finishReason}. Prompt might be unsafe or API issue.`);
        }
        return null;
      }
    } catch (e) {
      Logger.log(`   ERROR parsing the main API JSON structure: ${e}`);
      Logger.log(`   Raw Response Body: ${responseBody}`);
      return null;
    }
  } else {
    // Log API errors (like 4xx, 5xx)
    Logger.log(`   ERROR from Gemini API. Status Code: ${responseCode}`);
    Logger.log(`   Response Body: ${responseBody}`);
    // Consider throwing an error to signal failure more strongly to the calling function
    throw new Error(`Gemini API Error (${responseCode}): ${responseBody.substring(0, 500)}`); // Throw error to be caught in main loop
  }
}
