import { useEffect, useState } from "react";
import { initializePaddle, Paddle } from "@paddle/paddle-js";

export function usePaddle() {
  const [paddle, setPaddle] = useState<Paddle>();

  useEffect(() => {
    const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
    if (!token) return;
    initializePaddle({ environment: "sandbox", token }).then(setPaddle);
  }, []);

  const openCheckout = (opts?: { email?: string; customData?: Record<string, string> }) => {
    paddle?.Checkout.open({
      items: [{ priceId: import.meta.env.VITE_PADDLE_PRICE_ID, quantity: 1 }],
      customer: opts?.email ? { email: opts.email } : undefined,
      customData: opts?.customData,
    });
  };

  return { ready: !!paddle, openCheckout };
}
