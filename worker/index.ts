cat > worker/index.ts <<'EOF'
export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({
          ok: true,
          service: 'Nexora AdPilot API',
          database: !!env.DB,
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    return env.ASSETS.fetch(request);
  },
};
EOF
