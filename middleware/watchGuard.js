function watchGuard(req, res, next) {
  const clientKey = req.headers['x-secret-key']; 
  const serverKey = process.env.SECRET_KEY; 

  if (!clientKey) {
    return res.status(401).json({ error: 'Missing secret key' });
  }

  if (clientKey !== serverKey) {
    return res.status(403).json({ error: 'Invalid secret key' });
  }

  next();
}

module.exports = watchGuard;