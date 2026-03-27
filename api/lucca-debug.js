export default async function handler(req, res) {
  const envKeys = Object.keys(process.env).sort()
  const luccaKeys = envKeys.filter(k => k.toLowerCase().includes('lucca'))
  res.status(200).json({
    luccaKeys,
    hasKey: !!process.env.LUCCA_API_KEY,
    keyLength: (process.env.LUCCA_API_KEY || '').length,
    totalEnvVars: envKeys.length,
    allKeys: envKeys,
    vercelEnv: process.env.VERCEL_ENV || 'NOT_SET',
    nodeEnv: process.env.NODE_ENV || 'NOT_SET',
  })
}
