import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("bachat.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT,
    target_price REAL,
    platform TEXT,
    current_price REAL,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT,
    platform TEXT,
    price REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mock Search API
  app.get("/api/search", (req, res) => {
    const query = req.query.q as string;
    if (!query) return res.status(400).json({ error: "Query required" });

    // Comprehensive list of Indian platforms with verified search URL patterns
    const platforms = [
      { name: "Amazon", basePrice: 1.0, delivery: "Free", rating: 4.5, urlPattern: "https://www.amazon.in/s?k=" },
      { name: "Flipkart", basePrice: 0.95, delivery: "₹40", rating: 4.2, urlPattern: "https://www.flipkart.com/search?q=" },
      { name: "Myntra", basePrice: 1.1, delivery: "Free", rating: 4.6, urlPattern: "https://www.myntra.com/" },
      { name: "Ajio", basePrice: 1.08, delivery: "₹99", rating: 4.4, urlPattern: "https://www.ajio.com/search/?text=" },
      { name: "Blinkit", basePrice: 1.1, delivery: "₹25", rating: 4.8, urlPattern: "https://blinkit.com/s/?q=" },
      { name: "Zepto", basePrice: 1.05, delivery: "₹15", rating: 4.7, urlPattern: "https://www.zeptonow.com/search?query=" },
      { name: "BigBasket", basePrice: 0.98, delivery: "Free", rating: 4.4, urlPattern: "https://www.bigbasket.com/ps/?q=" },
      { name: "Zomato", basePrice: 1.2, delivery: "₹45", rating: 4.1, urlPattern: "https://www.zomato.com/india?q=" },
      { name: "Swiggy", basePrice: 1.15, delivery: "₹35", rating: 4.3, urlPattern: "https://www.swiggy.com/search?query=" },
      { name: "Nykaa", basePrice: 1.02, delivery: "Free", rating: 4.5, urlPattern: "https://www.nykaa.com/search/result/?q=" },
    ];

    // Generate pseudo-random but consistent prices based on the query
    const seed = query.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const baseValue = (seed % 1000) + 100;

    const results = platforms.map(p => {
      const price = Math.round(baseValue * p.basePrice);
      const encodedQuery = encodeURIComponent(query);
      const isFood = ["Zomato", "Swiggy"].includes(p.name);
      const isFashion = ["Myntra", "Ajio", "Nykaa"].includes(p.name);
      const deliveryTime = isFood ? `${Math.floor(Math.random() * 20) + 20} mins` : p.delivery;
      
      // Fix specific platform URL patterns
      let finalLink = `${p.urlPattern}${encodedQuery}`;
      if (p.name === "Myntra") {
        finalLink = `https://www.myntra.com/${query.toLowerCase().replace(/\s+/g, '-')}`;
      } else if (p.name === "Zomato") {
        finalLink = `https://www.zomato.com/search?q=${encodedQuery}`;
      }

      // Use a more reliable image source with multiple keywords
      const imgKeywords = `${query.split(' ').join(',')},product,${p.name.toLowerCase()}`;
      const imageUrl = `https://loremflickr.com/400/400/${encodeURIComponent(query.split(' ')[0])}?lock=${seed}`;

      return {
        id: `${p.name}-${seed}`,
        name: `${query.charAt(0).toUpperCase() + query.slice(1)}`,
        platform: p.name,
        price,
        delivery: deliveryTime,
        rating: p.rating,
        image: imageUrl,
        link: finalLink
      };
    });

    res.json(results);
  });

  // Alerts API
  app.post("/api/alerts", (req, res) => {
    const { product_name, target_price, platform, current_price, image_url } = req.body;
    const stmt = db.prepare("INSERT INTO alerts (product_name, target_price, platform, current_price, image_url) VALUES (?, ?, ?, ?, ?)");
    const info = stmt.run(product_name, target_price, platform, current_price, image_url);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/alerts", (req, res) => {
    const alerts = db.prepare("SELECT * FROM alerts ORDER BY created_at DESC").all();
    res.json(alerts);
  });

  app.delete("/api/alerts/:id", (req, res) => {
    db.prepare("DELETE FROM alerts WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
