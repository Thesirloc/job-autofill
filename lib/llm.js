/* JobFill — LLM provider abstraction
 * Supports OpenAI, Anthropic, Google Gemini, and any OpenAI-compatible "custom" endpoint.
 * Single entry: chat({ system, user, json }) → string.
 */
(function () {
  async function chat({ system, user, json = false, temperature = 0.4, maxTokens = 800 }) {
    const settings = (await self.JobFillStorage.getAll()).settings;
    if (!settings.llmApiKey) {
      throw new Error("No API key configured. Open JobFill options to add one.");
    }
    const provider = settings.llmProvider || "openai";
    const model = settings.llmModel || defaultModel(provider);

    if (provider === "anthropic") {
      return await anthropicChat({ apiKey: settings.llmApiKey, model, system, user, json, temperature, maxTokens });
    }
    if (provider === "gemini") {
      return await geminiChat({ apiKey: settings.llmApiKey, model, system, user, json, temperature, maxTokens });
    }
    // openai or openai-compatible custom
    const endpoint =
      provider === "custom" && settings.llmEndpoint
        ? trimSlash(settings.llmEndpoint) + "/chat/completions"
        : "https://api.openai.com/v1/chat/completions";
    return await openaiChat({ apiKey: settings.llmApiKey, endpoint, model, system, user, json, temperature, maxTokens });
  }

  function defaultModel(provider) {
    if (provider === "anthropic") return "claude-haiku-4-5-20251001";
    if (provider === "gemini") return "gemini-2.5-flash";
    return "gpt-4o-mini";
  }
  function trimSlash(s) {
    return (s || "").replace(/\/+$/, "");
  }

  async function openaiChat({ apiKey, endpoint, model, system, user, json, temperature, maxTokens }) {
    const body = {
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    };
    if (json) body.response_format = { type: "json_object" };
    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`OpenAI error ${r.status}: ${t.slice(0, 300)}`);
    }
    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content || "";
    return content;
  }

  async function anthropicChat({ apiKey, model, system, user, json, temperature, maxTokens }) {
    const body = {
      model,
      max_tokens: maxTokens,
      temperature,
      system: system,
      messages: [{ role: "user", content: user }],
    };
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`Anthropic error ${r.status}: ${t.slice(0, 300)}`);
    }
    const data = await r.json();
    const text = (data?.content || []).map((c) => c.text || "").join("\n").trim();
    if (json) {
      // best-effort JSON extraction
      const m = text.match(/\{[\s\S]*\}/);
      return m ? m[0] : text;
    }
    return text;
  }

  async function geminiChat({ apiKey, model, system, user, json, temperature, maxTokens }) {
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(model) +
      ":generateContent?key=" +
      encodeURIComponent(apiKey);
    const body = {
      systemInstruction: { role: "system", parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        ...(json ? { responseMimeType: "application/json" } : {}),
      },
    };
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`Gemini error ${r.status}: ${t.slice(0, 300)}`);
    }
    const data = await r.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p) => p.text || "").join("").trim();
    if (json) {
      const m = text.match(/\{[\s\S]*\}/);
      return m ? m[0] : text;
    }
    return text;
  }

  self.JobFillLLM = { chat };
})();
