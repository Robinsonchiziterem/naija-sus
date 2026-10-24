// Public settings the browser needs. Only public keys belong here:
// the Supabase anon key is designed to be public (the database rules decide
// what it can do), and the Paystack public key is meant for checkout pages.
export default function handler(req, res) {
  res.setHeader("Cache-Control", "public, max-age=60");
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || "",
  });
}
