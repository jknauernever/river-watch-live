export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const geeServiceAccount = process.env.GEE_SERVICE_ACCOUNT;
  const apiKey = process.env.API_KEY;
  
  res.json({
    message: "Debug endpoint",
    geeServiceAccountExists: !!geeServiceAccount,
    geeServiceAccountLength: geeServiceAccount ? geeServiceAccount.length : 0,
    apiKeyExists: !!apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    first100Chars: geeServiceAccount ? geeServiceAccount.substring(0, 100) : null,
    last100Chars: geeServiceAccount ? geeServiceAccount.substring(geeServiceAccount.length - 100) : null
  });
}; 