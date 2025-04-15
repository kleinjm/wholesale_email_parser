/**
 * (Optional Helper Function) Logs extracted data to a Google Sheet.
 * ADAPT this function based on the structure of 'extractedData' from Gemini.
 * @param {Date} date The email date.
 * @param {string} sender The email sender.
 * @param {string} subject The email subject.
 * @param {object} allPropertyInfo The object returned by Gemini and BeenVerified.
 */
function logDataToSheet(date, sender, subject, allPropertyInfo) {
  if (!LOG_TO_SHEET || !SPREADSHEET_ID) return; // Exit if logging disabled or no ID

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);

    // --- Headers to match your EXTRACTION_PROMPT_INSTRUCTIONS + BeenVerified ---
    const expectedHeaders = [
      "Timestamp",
      "Email Date",
      "Sender",
      "Subject",
      "Sender Name",
      "Sender Phone Number",
      "Property Street Address",
      "Property City",
      "Property State",
      "Property Zip",
      "Bedrooms",
      "Bathrooms",
      "Garage Spaces",
      "Square Footage",
      "Lot Size",
      "Year Built",
      "Earnest Money",
      "Closing Date",
      "Asking Price",
      "Provided ARV",
      "Source URL",
      "Notes",
      "Owner Name",
    ];

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(expectedHeaders); // Use the defined headers
      sheet.setFrozenRows(1);
      Logger.log(`Created new sheet: "${SHEET_NAME}"`);
    } else {
      // Optional: Check if headers match, recreate if necessary or log warning
      const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      if (JSON.stringify(currentHeaders) !== JSON.stringify(expectedHeaders)) {
        Logger.log("WARNING: Sheet headers don't match expected headers. Data might be logged incorrectly.");
        // Optional: Could attempt to fix headers or stop logging.
      }
    }

    // --- Adapt Data Appending to match your EXTRACTION_PROMPT_INSTRUCTIONS ---
    // Use || 'Not Found' (or appropriate defaults) for safety in case Gemini returns incomplete JSON
    sheet.appendRow([
      new Date(), // Timestamp of logging
      date,
      sender,
      subject,
      allPropertyInfo?.senderName,
      allPropertyInfo?.senderPhoneNumber,
      allPropertyInfo?.propertyStreetAddress,
      allPropertyInfo?.propertyCity,
      allPropertyInfo?.propertyState,
      allPropertyInfo?.propertyZip,
      allPropertyInfo?.bedrooms,
      allPropertyInfo?.bathrooms,
      allPropertyInfo?.garageSpaces,
      allPropertyInfo?.squareFootage,
      allPropertyInfo?.lotSize,
      allPropertyInfo?.yearBuilt,
      allPropertyInfo?.earnestMoney,
      allPropertyInfo?.closingDate,
      allPropertyInfo?.askingPrice,
      allPropertyInfo?.providedARV,
      allPropertyInfo?.sourceURL,
      allPropertyInfo?.notes,
      allPropertyInfo?.ownerName,
    ]);

  } catch (e) {
    Logger.log(`Error logging data to Google Sheet (ID: ${SPREADSHEET_ID}): ${e}`);
    Logger.log(`Data attempted to log: ${JSON.stringify(extractedData)}`);
  }
}