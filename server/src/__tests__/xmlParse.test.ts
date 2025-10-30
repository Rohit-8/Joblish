import { parseStringPromise } from 'xml2js';

const sample = `<?xml version="1.0"?><rss><channel><item><guid>1</guid><title>Engineer</title><description>Build things</description><pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate></item></channel></rss>`;

describe('xml parsing', () => {
  it('parses sample xml', async () => {
    const json = await parseStringPromise(sample, { explicitArray: true });
    expect(json.rss.channel[0].item[0].title[0]).toBe('Engineer');
  });
});
