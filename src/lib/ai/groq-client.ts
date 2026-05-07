// Cliente de fallback de Groq
export class GroqFallbackClient {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || ''
  }

  async generateText(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY missing. No se pudo utilizar el fallback.')
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Groq API Error: ${err}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  }
}
