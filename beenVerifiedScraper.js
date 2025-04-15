function fetchBeenVerifiedOwnerInfo({ propertyStreetAddress, propertyCity, propertyState, propertyZip }) {
  const fullAddress = `${propertyStreetAddress}, ${propertyCity}, ${propertyState} ${propertyZip}`;

  const response = UrlFetchApp.fetch(BEENVERIFIED_SCRAPER_URL, {
    method: 'GET',
    payload: { fullAddress },
    headers: { 'Content-Type': 'application/json' }
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('Failed to fetch BeenVerified owner info');
  }
  Logger.log('BeenVerified Scraper Response:');
  Logger.log(response.getContentText());

  const ownerInfo = JSON.parse(response.getContentText());
  return { ownerName: ownerInfo.result.owner_name };
}
