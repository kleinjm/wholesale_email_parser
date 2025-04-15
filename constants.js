// --- Configuration ---
const SEARCH_QUERY = 'label:flipping-search !label:flipping-search-ai-processed '; // Your Gmail search query
const PROCESSED_LABEL_NAME = "Flipping/Search/AI Processed";         // <<< Label for processed emails
const SPREADSHEET_ID = "14fnZieQGrDd0g5Mp62wHV0rEC3JtIOlAFuYrXXE-TeE";           // <<< ID of Google Sheet for logging
const SHEET_NAME = "Wholesale Emails";                 // <<< Sheet name
const LOG_TO_SHEET = true;                              // <<< Set to true to enable Sheet logging
const MAX_THREADS = 1; // Number of emails to process for one run of the script. Based on the trigger schedule, adjust this to capture all emails between runs.

// --- Gemini Configuration ---
// IMPORTANT: Set your API Key in File > Project properties > Script properties
const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
const GEMINI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

// --- !!! DEFINE YOUR EXTRACTION PROMPT !!! ---
// This is CRITICAL. Tell Gemini exactly what to extract and in what format.
// Requesting JSON output makes parsing easier in the script.
const EXTRACTION_PROMPT_INSTRUCTIONS = `
Analyze the following email body and extract the following information:
- Sender Name (string, the name tied to the email address or found in the body of the email, if available)
- Sender Phone Number (string, the phone number of the sender, if available)
- Property Street Address (string, in the format of a street address, ie. 123 Main St. It may contain a unit or apartment number and that can be included after a comma. Do not include the city, state, or zip as those are separate fields)
- Property City (string)
- Property State (string, likely CO or Colorado)
- Property Zip (string, could be 5 digits or it could have a dash and more digits. Either is fine to be saved as a string)
- Bedrooms (integer, number of bedrooms at the property, if available)
- Bathrooms (integer, number of bathrooms at the property, if available)
- Garage Spaces (integer, number of garage spaces at the property, if available)
- Square Footage (integer, the total interior square footage of the inside of the property, if available)
- Lot Size (integer, the total square footage of the lot that the property is on, if available)
- Year Built (integer, when the property was built, if available. Could be called the "build", the "year", or the "vintage")
- Earnest Money (integer, the amount of money they are asking for to get the deal, if available. It may or may not have a dollar sign. It could be called the Earnest Money, cash to close, down payment, non-refundable amount, etc.)
- Closing Date (date, the date that the property will close, if available. It may be called the contract close date, possession date, etc. If there are multiple dates, use the one that is most relevant to the closing, not possession. If the year is missing, assume the current year. If the closing month is in January and the current month is December, assume the following year after this current year)
- Asking Price (integer, the dollar amount they are asking for the property. This may or may not have a dollar sign before it. It may have thousands expressed as k or K, ie. 450K or $450k. If so, convert K to thousands, ie. 450000. This may be called starting price, asking price, purchase price, wholesale price, first come first serve price, etc.)
- Provided ARV (integer, the dollar amount they think the property will sell for, if available. This may or may not have a dollar sign before it. It may have thousands expressed as k or K, ie. 450K or $450k. If so, convert K to thousands, ie. 450000. It may be called the ARV, estimated ARV, estimated value, resale value, sell for value, etc. If there are options for how the property is rehabed, ie. light versus full, use the higher value number. If there is a plus symbol, remove it. This is not the rehab, renovation cost, profit, or margin. Ignore those numbers.)
- Source URL (string, the url to the listing of the property, if available. This may be an https link or it may be a hyperlink text. Extract the URL.)
- Notes (string, any other details about the property, if available. This is often in the email in paragraph format. This information does not need to be further parsed. It may come include the style of the home, how old the appliances are, what the neighborhood is like, etc.)

Return the extracted information strictly as a JSON object with the keys:
"senderName" (string)
"senderPhoneNumber" (string)
"propertyStreetAddress" (string)
"propertyCity" (strings)
"propertyState" (string)
"propertyZip" (string)
"bedrooms" (integer)
"bathrooms" (integer)
"garageSpaces" (integer)
"squareFootage" (integer)
"lotSize" (integer)
"yearBuilt" (integer)
"earnestMoney" (integer)
"closingDate" (ISO 8601)
"askingPrice" (integer)
"providedARV" (integer)
"sourceURL" (string)
"notes" (string)

If a piece of information cannot be found, leave it empty/null.
Do not include any explanatory text, comments, or markdown formatting before or after the JSON object itself.
Only output the JSON.
`;
// --- End Gemini Configuration ---

// --- BeenVerified Configuration ---
const BEENVERIFIED_SCRAPER_URL = 'https://us-central1-gen-lang-client-0639051470.cloudfunctions.net/beenverified_scraper'
