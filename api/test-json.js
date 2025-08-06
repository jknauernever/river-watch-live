export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const geeServiceAccount = process.env.GEE_SERVICE_ACCOUNT;
  
  if (!geeServiceAccount) {
    return res.json({ error: "GEE_SERVICE_ACCOUNT not found" });
  }
  
  try {
    const parsed = JSON.parse(geeServiceAccount);
    res.json({
      success: true,
      parsed: {
        type: parsed.type,
        project_id: parsed.project_id,
        client_email: parsed.client_email,
        hasPrivateKey: !!parsed.private_key
      }
    });
  } catch (error) {
    res.json({
      error: "JSON parsing failed",
      message: error.message,
      first50Chars: geeServiceAccount.substring(0, 50),
      last50Chars: geeServiceAccount.substring(geeServiceAccount.length - 50)
    });
  }
}; 