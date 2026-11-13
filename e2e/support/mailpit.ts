const MAILPIT = 'http://localhost:8025/api/v1';

interface Summary {
  ID: string;
}

/** Waits for an email to arrive in Mailpit and returns the in-app path of the link it contains. */
export async function linkFromLatestEmail(to: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const search = await fetch(`${MAILPIT}/search?query=${encodeURIComponent(`to:${to}`)}`);
    const { messages } = (await search.json()) as { messages: Summary[] };
    if (messages.length > 0) {
      const message = await fetch(`${MAILPIT}/message/${messages[0].ID}`);
      const { Text } = (await message.json()) as { Text: string };
      const link = Text.match(/https?:\/\/[^\s]+token=[\w-]+/)?.[0];
      if (link) {
        const url = new URL(link);
        return url.pathname + url.search;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No email with a link arrived for ${to}`);
}
