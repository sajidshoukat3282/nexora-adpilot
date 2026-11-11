import { useEffect, useState } from "react";
import { initializePaddle, Paddle } from "@paddle/paddle-js";

export function usePaddle() {
  const [paddle, setPaddle] = useState<Paddle>();

  useEffect(() => {
    const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
    if (!token) return;
    const environment = import.meta.env.VITE_PADDLE_ENV === "production" ? "production" : "sandbox";
    initializePaddle({ environment, token }).then(setPaddle);
  }, []);

  const openCheckout = (opts: { priceId: string; email?: string; customData?: Record<string, string> }) => {
    paddle?.Checkout.open({
      items: [{ priceId: opts.priceId, quantity: 1 }],
      customer: opts.email ? { email: opts.email } : undefined,
      customData: opts.customData,
    });
  };

  return { ready: !!paddle, openCheckout };
}
