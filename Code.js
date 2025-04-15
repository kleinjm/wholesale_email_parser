// Script to search for emails from wholesalers in Gmail, parse using Gemini, and log to a Google Sheet.
// Tied to the lincolnmanagement361@gmail.com account.
// Use the clasp cli tool to push and deploy the script to Google Apps Script.

/**
 * Main function to search for emails, parse using Gemini, log, and label.
 */
function parseEmailsWithGemini() {
  if (!GEMINI_API_KEY) {
    Logger.log("ERROR: GEMINI_API_KEY script property is not set. Please set it in File > Project properties > Script properties.");
    SpreadsheetApp.getUi().alert("ERROR: GEMINI_API_KEY script property is not set."); // User-friendly alert
    return;
  }

  // Get or create the label
  let processedLabel = GmailApp.getUserLabelByName(PROCESSED_LABEL_NAME);
  if (!processedLabel) {
    try {
      processedLabel = GmailApp.createLabel(PROCESSED_LABEL_NAME);
      Logger.log(`Created label: "${PROCESSED_LABEL_NAME}"`);
    } catch (e) {
      Logger.log(`Error creating label "${PROCESSED_LABEL_NAME}". Please create it manually. Error: ${e}`);
      return;
    }
  }

  // Search for threads
  // Process fewer threads at once due to API latency & quotas
  const threads = GmailApp.search(SEARCH_QUERY, 0, MAX_THREADS); // Process N max threads per run
  Logger.log(`Found ${threads.length} threads matching query: "${SEARCH_QUERY}"`);

  threads.forEach(thread => {
    const messages = thread.getMessages();
    Logger.log(`Processing Thread Subject: "${thread.getFirstMessageSubject()}" (${messages.length} message(s))`);

    messages.forEach(message => {
      // Basic check if already processed
      let isAlreadyProcessed = message.getThread().getLabels().some(label => label.getName() === PROCESSED_LABEL_NAME);
      if (isAlreadyProcessed) {
        Logger.log(`   Skipping message - already processed ID: ${message.getId()}`);
        return; // Skip to the next message
      }

      const messageId = message.getId();
      const subject = message.getSubject();
      const sender = message.getFrom();
      const date = message.getDate();
      const body = message.getPlainBody(); // Using plain body is often sufficient for Gemini

      Logger.log(`  Processing Message ID: ${messageId}`);
      Logger.log(`    From: ${sender}`);
      Logger.log(`    Date: ${date}`);
      Logger.log(`    Subject: ${subject}`);

      if (!body || body.trim().length === 0) {
        Logger.log(`    Skipping message ID ${messageId} due to empty body.`);
        return; // Skip if body is empty
      }

      // --- Call Gemini for Extraction ---
      let extractedData = null;
      try {
        extractedData = extractDataWithGemini(body, EXTRACTION_PROMPT_INSTRUCTIONS);
      } catch (e) {
        Logger.log(`    ERROR calling Gemini API for message ID ${messageId}: ${e}`);
        // Optionally: Add a specific error label? Retry later?
        // For now, we'll skip processing actions for this email.
        return; // Stop processing this message on Gemini error
      }

      if (extractedData) {
        Logger.log(`    Extracted Data: ${JSON.stringify(extractedData, null, 2)}`);

        // --- Hit the BeenVerified Scraper API ---
        const beenVerifiedResponse = fetchBeenVerifiedOwnerInfo(extractedData);
        const allPropertyInfo = { ...extractedData, ...beenVerifiedResponse };

        // --- Log Data to a Google Sheet ---
        if (LOG_TO_SHEET && SPREADSHEET_ID) {
          logDataToSheet(date, sender, subject, allPropertyInfo);
        }

        // --- Perform Actions on the Message/Thread ---
        try {
          message.markRead();
          thread.addLabel(processedLabel);
          // thread.moveToArchive(); // Optionally archive
          Logger.log(`    Marked message read and added label "${PROCESSED_LABEL_NAME}" to thread.`);
        } catch (e) {
          Logger.log(`    Error applying actions to message/thread ID ${messageId}: ${e}`);
        }

      } else {
        Logger.log(`    Could not extract data using Gemini for message ID ${messageId}. Response might have been empty or malformed.`);
        // Optionally add an "Extraction-Failed" label
      }
    }); // End message loop
  }); // End thread loop

  Logger.log("Email parsing with Gemini complete.");
}
