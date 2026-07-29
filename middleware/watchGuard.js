function watchGuard(req, res, next) {
  const clientKey = req.headers['x-secret-key']; 
  const serverKey = process.env.SECRET_KEY; 

  //const excludedPaths = ['/n8n_cosmia/shippingbo/callback', '/n8n_cosmia/gmail/callback', '/n8n_cosmia/gmail/auth', '/n8n_cosmia/public/']; // developpement

  const excludedPaths = ['/n8n_cosmia/shippingbo/callback', '/n8n_cosmia/gmail/callback', '/n8n_cosmia/gmail/auth', '/n8n_cosmia/public/', '/shippingbo/callback', '/gmail/callback', '/gmail/auth', '/public/']; // production 

  // if (excludedPaths.includes(req.path)) {
  //   return next(); // skip the check
  // }

  // Check if the current path matches any excluded prefix
  const isExcluded = excludedPaths.some(path => req.path.startsWith(path));

  if (isExcluded) {
    return next(); // skip middleware
  }

  if (!clientKey) {
    return res.status(401).json({ error: 'Missing secret key' });
  }

  if (clientKey !== serverKey) {
    return res.status(403).json({ error: 'Invalid secret key' });
  }

  next();
}

module.exports = watchGuard;
