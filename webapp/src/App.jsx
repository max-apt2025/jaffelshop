import { useEffect, useState } from "react";

// These URLs are embedded at build time. The Kubernetes build uses same-origin
// routes; Docker Compose supplies the host-published API URLs as build args.
const CATALOG_API_URL = import.meta.env.VITE_CATALOG_API_URL || "/api/catalog";
const ORDERS_API_URL = import.meta.env.VITE_ORDERS_API_URL || "/api";

const price = (cents) => `$${(cents / 100).toFixed(2)}`;

async function getJson(url) {
  const reply = await fetch(url);
  if (!reply.ok) throw new Error(`Request failed (${reply.status})`);
  return reply.json();
}

function Header({ page }) {
  return (
    <header>
      <h1>Jaffel shop</h1>
      <p>A tiny coffee shop built from three services.</p>
      <nav aria-label="Main navigation">
        <a href="/" aria-current={page === "shop" ? "page" : undefined}>Shop</a>
        <a href="/orders" aria-current={page === "orders" ? "page" : undefined}>Latest orders</a>
      </nav>
    </header>
  );
}

function ShopPage() {
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadProducts() {
    try {
      setProducts(await getJson(`${CATALOG_API_URL}/products`));
      setError("");
    } catch {
      setError("Could not reach the catalog API. Check its URL and availability.");
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function buy(product) {
    setMessage("");
    setError("");
    try {
      const reply = await fetch(`${ORDERS_API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id, quantity: 1 }),
      });
      const body = await reply.json();
      if (!reply.ok) throw new Error(body.detail || "The order could not be placed.");
      setMessage(`Order #${body.id} placed: ${body.product}.`);
      await loadProducts();
    } catch (buyError) {
      setError(buyError.message || "Could not reach the orders API.");
    }
  }

  return (
    <section>
      <h2>Products <span className="source">from catalog-api</span></h2>
      {error && <p className="error" role="alert">{error}</p>}
      {message && <p className="message" role="status">{message} <a href="/orders">View orders</a></p>}
      <ul className="products">
        {products.map((product) => (
          <li key={product.id}>
            <strong>{product.name}</strong>
            <span>{price(product.price_cents)}</span>
            <span className={`stock ${product.stock_status === "low" ? "low" : ""}`}>
              {product.stock_status ? `${product.stock_status} (${product.stock})` : `${product.stock} in stock`}
            </span>
            <button onClick={() => buy(product)} disabled={product.stock === 0}>
              Buy
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      getJson(`${ORDERS_API_URL}/orders`),
      getJson(`${CATALOG_API_URL}/products`),
    ])
      .then(([latestOrders, catalog]) => {
        setOrders(latestOrders);
        setProducts(catalog);
      })
      .catch(() => setError("Could not load order history. Check that both APIs are available."));
  }, []);

  const totalQuantity = orders.reduce((sum, order) => sum + order.quantity, 0);
  const totalPriceCents = orders.reduce((sum, order) => sum + order.total_cents, 0);

  return (
    <section>
      <h2>Latest orders <span className="source">from orders-api</span></h2>
      {error && <p className="error" role="alert">{error}</p>}
      {orders.length === 0 ? (
        <p className="empty">No orders yet. <a href="/">Browse products</a></p>
      ) : (
        <>
          <div className="order-totals" aria-label={`Totals for the latest ${orders.length} orders`}>
            <div className="order-total">
              <span>Quantity in latest {orders.length} orders</span>
              <strong>{totalQuantity}</strong>
            </div>
            <div className="order-total">
              <span>Price total</span>
              <strong>{price(totalPriceCents)}</strong>
            </div>
          </div>
          <table>
            <thead>
              <tr><th>Order</th><th>Product</th><th>Qty</th><th>Total</th></tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{products.find((product) => product.id === order.product_id)?.name ?? order.product_id}</td>
                  <td>{order.quantity}</td>
                  <td>{price(order.total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

export default function App() {
  const page = window.location.pathname.replace(/\/+$/, "") === "/orders" ? "orders" : "shop";

  return (
    <main>
      <Header page={page} />
      {page === "orders" ? <OrdersPage /> : <ShopPage />}
    </main>
  );
}
