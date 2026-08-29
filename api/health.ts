export default function handler(req: any, res: any) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiKeyConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
  });
}
