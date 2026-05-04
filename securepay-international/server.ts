import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import csrf from "csurf";
import { isValidIBAN, extractIBAN } from "ibantools";
import db from "./src/lib/db";
import { SECURITY_PATTERNS } from "./src/lib/constants";

import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  // Map to store active WS connections by User ID
  const clients = new Map<number, WebSocket>();

  wss.on('connection', (ws, req) => {
    // Extract cookies from the request headers
    const cookies = req.headers.cookie;
    if (!cookies) {
      ws.close(1008, 'Authentication Required');
      return;
    }

    const authCookie = cookies.split(';').find(c => c.trim().startsWith('auth_token='));
    if (!authCookie) {
      ws.close(1008, 'Authentication Required');
      return;
    }

    const token = authCookie.split('=')[1];
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        ws.close(1008, 'Invalid Session');
        return;
      }
      
      clients.set(user.id, ws);
      console.log(`WebSocket connected for user: ${user.email}`);

      ws.on('close', () => {
        clients.delete(user.id);
        console.log(`WebSocket disconnected for user: ${user.email}`);
      });
    });
  });

  // Simulated Settlement Engine
  setInterval(() => {
    // Loop through all connected clients and send a simulated settlement hit
    // In a real app, this would be tied to actual status changes in the DB
    clients.forEach((ws, userId) => {
      // Find a random pending transaction for this user to update
      const pendingTx = db.prepare('SELECT * FROM transactions WHERE user_id = ? AND status = ? LIMIT 1')
        .get(userId, 'COMPLETED') as any; // Using completed as mock because pending might not exist yet, 
        // normally we would update a real pending one. Let's send a pulse instead.
      
      const statuses = ['Processing Settlement', 'Bank Relay Active', 'Liquidity Verified', 'Finalizing'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      ws.send(JSON.stringify({
        type: 'SETTLEMENT_UPDATE',
        payload: {
          timestamp: new Date().toISOString(),
          status,
          nodeId: `NODE-${Math.floor(Math.random() * 1000)}`,
          load: Math.random() * 100
        }
      }));
    });
  }, 5000);

  // Trust Proxy - Required for AI Studio's infrastructure to handle rate limiting correctly
  app.set("trust proxy", 1);

  // Security Middlewares - Relaxed for AI Studio Preview Compatibility
  app.use(helmet({
    contentSecurityPolicy: false,
  }));
  
  app.use(cors());
  
  app.use(express.json({ limit: '10kb' })); 
  app.use(cookieParser());

  // CSRF Protection
  const csrfProtection = csrf({ cookie: { 
    httpOnly: true, 
    secure: true, 
    sameSite: 'none' 
  } });

  // Get CSRF Token
  app.get("/api/csrf-token", csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "SecurePay Server is Running", time: new Date().toISOString() });
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests from this IP, please try again after 15 minutes",
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip as string, // Use the IP resolved by Express (trust proxy)
    validate: { trustProxy: false },
  });
  app.use("/api/", apiLimiter);

  // Auth Middleware - Support both Cookies and Authorization Header for reliability in iframes
  const authenticateToken = (req: any, res: any, next: any) => {
    let token = req.cookies.auth_token;
    req.isBearerAuth = false;
    
    // Fallback to Authorization Header
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        req.isBearerAuth = true;
      }
    }

    if (!token) {
      console.warn(`[AUTH] Unauthorized request to ${req.path} - No token found`);
      return res.status(401).json({ error: "Unauthorized" });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        console.warn(`[AUTH] Forbidden request to ${req.path} - Invalid token: ${err.message}`);
        return res.status(403).json({ error: "Invalid session" });
      }
      req.user = user;
      next();
    });
  };

  // Optional CSRF middleware that skips if request is Bearer-authenticated
  const conditionalCsrf = (req: any, res: any, next: any) => {
    if (req.isBearerAuth) {
      return next();
    }
    return csrfProtection(req, res, next);
  };

  // --- API ROUTES ---

  // Register
  app.post("/api/register", [
    body('email').matches(SECURITY_PATTERNS.EMAIL).withMessage('Invalid email format'),
    body('password').matches(SECURITY_PATTERNS.PASSWORD).withMessage('Password must be at least 8 chars, 1 upper, 1 lower, 1 digit')
  ], async (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 12);
      const insert = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
      insert.run(email, hashedPassword);
      res.status(201).json({ message: "User registered" });
    } catch (e: any) {
      if (e.message.includes('UNIQUE')) return res.status(400).json({ error: "Email already exists" });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Login
  app.post("/api/login", async (req: any, res: any) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true, // Secure is required for SameSite=None
      sameSite: 'none', // Required for 3rd-party contexts (iframes)
      maxAge: 3600000
    });

    res.json({ 
      user: { email: user.email },
      token // Return token for client-side storage fallback
    });
  });

  // Get current user info
  app.get("/api/me", authenticateToken, (req: any, res: any) => {
    res.json({ user: { email: req.user.email } });
  });

  // Logout
  app.post("/api/logout", (req, res) => {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });
    res.json({ message: "Logged out" });
  });

  // Get User Dashboard Data
  app.get("/api/dashboard", authenticateToken, (req: any, res: any) => {
    try {
      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id) as any;
      if (!user) {
        console.error(`[DASHBOARD] User ${req.user.id} (${req.user.email}) not found in database`);
        return res.status(404).json({ error: "Identity not found in ledger" });
      }
      
      const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
      res.json({ balance: user.balance, transactions });
    } catch (e: any) {
      console.error(`[DASHBOARD] Critical fault for user ${req.user.id}:`, e);
      res.status(500).json({ error: "Internal ledger fault" });
    }
  });

  // Process Payment
  app.post("/api/pay", authenticateToken, conditionalCsrf, [
    body('recipientName').matches(SECURITY_PATTERNS.RECIPIENT_NAME),
    body('iban').custom((value) => {
      const ibanValue = value.replace(/\s/g, '').toUpperCase();
      
      // 1. Try strict IBAN validation first
      if (isValidIBAN(ibanValue)) return true;

      // 2. Fallback for non-IBAN countries or simulation data
      // For a global portal, we allow structural validation for known non-IBAN regions (US, CA, JP, ZA, etc.)
      const countryCode = ibanValue.substring(0, 2);
      const isKnownNonIBAN = ['US', 'ZA', 'JP', 'CA', 'AU', 'NZ'].includes(countryCode);
      
      if (isKnownNonIBAN) {
        if (SECURITY_PATTERNS.IBAN.test(ibanValue)) {
          console.log(`[PAY] Allowing non-strict IBAN format for ${countryCode}: ${ibanValue}`);
          return true;
        }
        throw new Error(`Invalid structural format for ${countryCode} account anchor`);
      }

      // 3. Detailed error reporting for failed IBANs in IBAN-compliant countries
      const extraction = extractIBAN(ibanValue);
      if (!/^[A-Z]{2}$/.test(countryCode)) {
        throw new Error('Invalid or missing country code');
      } else if (!extraction.valid) {
        throw new Error(`The sector ${countryCode} is not currently synchronized with strict IBAN protocols. Please use structural format.`);
      } else {
        throw new Error(`Checksum mismatch for ${countryCode} secure anchor. Please verify digits.`);
      }
    }),
    body('swiftBic').matches(SECURITY_PATTERNS.SWIFT_BIC),
    body('amount').isFloat({ min: 0.01 }),
    body('currency').isIn(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'ZAR']),
    body('reason').matches(SECURITY_PATTERNS.REASON)
  ], (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn(`[PAY] Validation failed for user ${req.user.email}:`, errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { recipientName, iban, swiftBic, amount, currency, reason } = req.body;
    
    try {
      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id) as any;
      if (user.balance < amount) {
        console.warn(`[PAY] Insufficient funds for user ${req.user.email}: balance ${user.balance}, attempted ${amount}`);
        return res.status(400).json({ error: "Insufficient balance for settlement." });
      }

      const transaction = db.transaction(() => {
        const updateBalance = db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?');
        updateBalance.run(amount, req.user.id);

        const insertTx = db.prepare(`
          INSERT INTO transactions (user_id, recipient_name, iban, swift_bic, amount, currency, reason)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        insertTx.run(req.user.id, recipientName, iban, swiftBic, amount, currency, reason);
      });

      transaction();
      console.log(`[PAY] Settlement success: ${amount} ${currency} from user ${req.user.id} to ${recipientName}`);
      res.json({ message: "Payment successful" });
    } catch (e: any) {
      console.error(`[PAY] Critical failure for user ${req.user.id}:`, e);
      res.status(500).json({ error: "Payment processing failed: internal engine error." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in production mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Final Catch-all Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    if (err.code === 'EBADCSRFTOKEN') {
      return res.status(403).json({ error: "Invalid CSRF token - potential cross-site request detected" });
    }
    console.error("Unhandled Server Error:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
