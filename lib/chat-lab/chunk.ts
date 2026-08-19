/** Group words so Streamdown blur-in can finish between chunks. */
export function chunkWords(text: string, wordsPerChunk = 3): string[] {
  const words = text.split(/(\s+)/).filter((part) => part.length > 0);
  if (words.length === 0) return [""];

  const chunks: string[] = [];
  let buffer = "";
  let wordCount = 0;

  for (const part of words) {
    buffer += part;
    if (!/^\s+$/.test(part)) {
      wordCount += 1;
      if (wordCount >= wordsPerChunk) {
        chunks.push(buffer);
        buffer = "";
        wordCount = 0;
      }
    }
  }

  if (buffer.length > 0) {
    chunks.push(buffer);
  }

  return chunks.length > 0 ? chunks : [text];
}

/** Reasoning arrives as heading/sentence pulses, not 12-character ticks. */
export function chunkReasoning(text: string): string[] {
  const lines = text.split("\n");
  const chunks: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const suffix = index < lines.length - 1 ? "\n" : "";
    const body = line + suffix;
    if (body.trim().length === 0) {
      if (chunks.length > 0) {
        chunks[chunks.length - 1] += body;
      }
      else {
        chunks.push(body);
      }
      continue;
    }

    if (line.length <= 90 || line.startsWith("#")) {
      chunks.push(body);
      continue;
    }

    const sentences = line.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [line];
    for (let sentenceIndex = 0; sentenceIndex < sentences.length; sentenceIndex += 1) {
      const sentence = sentences[sentenceIndex]!;
      const last = sentenceIndex === sentences.length - 1;
      chunks.push(last ? sentence + suffix : sentence);
    }
  }

  return chunks.length > 0 ? chunks : [text];
}
