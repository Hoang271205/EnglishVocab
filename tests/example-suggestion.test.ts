import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateExample } from '../server/src/modules/dictionary/generate-example';
import { exampleSuggestionInput } from '../src/dictionary/exampleSuggestion';

test('the fallback sends the selected sense at runtime and rejects unusable answers', async () => {
  const input = exampleSuggestionInput.parse({
    word: 'Draft',
    partOfSpeech: 'noun',
    definition: 'A current of air moving through an enclosed space.',
    forms: ['drafts'],
  });
  const reply = (sentence: string) =>
    Response.json({
      status: 'completed',
      output: [
        {
          type: 'message',
          content: [
            { type: 'output_text', text: JSON.stringify({ sentence }) },
          ],
        },
      ],
    });
  const config = { key: 'test-key', model: 'test-model' };
  const expected = 'Cold drafts came through the gap under the door.';
  const actual = await generateExample(input, config, async (_url, request) => {
    const body = JSON.parse(String(request?.body));
    assert.deepEqual(JSON.parse(body.input), input);
    return reply(expected);
  });
  assert.equal(actual, expected);
  assert.equal(
    await generateExample(input, config, async () =>
      reply(
        'Drafts entered under the door, and a draft came in through the window.',
      ),
    ),
    null,
  );
  assert.equal(
    await generateExample(input, config, async () =>
      reply('A draft came in. The room felt cold.'),
    ),
    null,
  );
});
