/**
 * API endpoint to fetch available models from a custom API endpoint
 *
 * This endpoint acts as a proxy to handle CORS issues when fetching models
 * from custom LLM providers. The frontend makes requests to this endpoint,
 * and this endpoint makes the actual request to the LLM provider backend.
 *
 * @route POST /api/config/models
 * @param {string} baseURL - The base URL of the custom LLM provider
 * @param {string} apiKey - The API key for authentication with the LLM provider
 * @returns {object} Models list in OpenAI-compatible format { data: [{ id: "model-name" }, ...] }
 */

import type { NextApiRequest, NextApiResponse } from 'next';

type ResponseData =
  | { data: Array<{ id: string; [key: string]: any }> }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { baseURL, apiKey } = req.body;

  // Validate required parameters
  if (!baseURL) {
    return res.status(400).json({ error: 'baseURL is required' });
  }

  try {
    // Construct the models endpoint URL
    const cleanBaseURL = baseURL.replace(/\/+$/, '').replace(/\/v1$/, '');
    const modelsUrl = `${cleanBaseURL}/v1/models`;

    console.log(`[API] Fetching models from: ${modelsUrl}`);

    // Make the request to the LLM provider backend (server-side, no CORS issues)
    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    if (!response.ok) {
      console.error(`[API] Failed to fetch models: HTTP ${response.status}`);
      return res.status(response.status).json({
        error: `HTTP ${response.status}: ${response.statusText}`
      });
    }

    const data = await response.json();

    // Validate response format (OpenAI-compatible)
    if (data.data && Array.isArray(data.data)) {
      console.log(`[API] Successfully fetched ${data.data.length} models`);
      return res.status(200).json({ data: data.data });
    }

    // If response format is unexpected, return empty data
    console.warn('[API] Unexpected response format from /v1/models endpoint');
    return res.status(200).json({ data: [] });
  } catch (error: any) {
    console.error('[API] Error fetching models:', error.message);
    return res.status(500).json({
      error: error.message || 'Failed to fetch models from API'
    });
  }
}
