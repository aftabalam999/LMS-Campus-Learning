// Mock the Google generative sdk to simulate model fallback behavior
jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => {
      return {
        getGenerativeModel: ({ model }) => {
          if (model === 'gemini-2.5-flash') {
            return {
              generateContent: jest.fn().mockImplementation(() => {
                const err = new Error('503 Service Unavailable');
                err.message = '503 Service Unavailable';
                throw err;
              })
            };
          }
          return {
            generateContent: jest.fn().mockResolvedValue({
              candidates: [{ content: [{ text: 'Issue: Missing deadline\n\n- Is this goal time-bound?' }] }]
            })
          };
        }
      };
    })
  };
});

test('mocked GoogleGenerativeAI fallback behaves as expected', async () => {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const gen = new GoogleGenerativeAI('fake-key');
  const model1 = gen.getGenerativeModel({ model: 'gemini-2.5-flash' });
  await expect(() => model1.generateContent()).toThrow();
  const model2 = gen.getGenerativeModel({ model: 'gemini-pro-latest' });
  const res = await model2.generateContent();
  expect(res.candidates[0].content[0].text).toContain('Issue: Missing deadline');
});
