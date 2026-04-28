const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key_change_in_production";

if (process.env.NODE_ENV === 'production' && JWT_SECRET === "your_secret_key_change_in_production") {
    console.error('❌ Please set a secure JWT_SECRET in production');
    process.exit(1);
}

const jwtConfig = {
    secret: JWT_SECRET,
    expiresIn: "24h",
    cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
};

module.exports = jwtConfig;
