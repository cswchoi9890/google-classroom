export interface Env {
  AI: any;
  GITHUB_REPO: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS 헤더 설정 (프론트엔드에서의 API 호출 허용)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 프리플라이트 요청 처리
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // AI 분석 API 엔드포인트
    if (request.method === "POST" && url.pathname === "/api/analyze") {
      try {
        const { item } = await request.json() as { item: string };
        
        // Cloudflare AI 프롬프트 구성 (분리배출 카테고리, 탄소/물 발자국 추정)
        const systemPrompt = `
          You are an eco-friendly waste sorting AI. 
          The user is disposing of or buying: "${item}". 
          Classify it into one of these categories: food, clothing, electronics, daily, transport.
          Estimate the Carbon Footprint (kg CO2e) and Water Footprint (Liters).
          Respond ONLY in strict JSON format:
          {"category": "daily", "co2": 0.5, "water": 10, "name": "Translated name in Korean"}
        `;

        // Cloudflare 무료 Llama 3 모델 호출
        const aiResponse = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
          messages: [{ role: "user", content: systemPrompt }]
        });

        // AI 응답에서 JSON 추출
        const text = aiResponse.response;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "AI 응답 파싱 실패" };

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }

    return new Response(`Cloudflare Worker is running. Repo: ${env.GITHUB_REPO}`, { 
      headers: corsHeaders 
    });
  }
};
