# Image queue

AI pictures for guides, made by Gemini when the repository secret `GEMINI_API_KEY` exists. The free daily
maintenance workflow (`maintain.yml`) runs `scripts/gen-images.mjs`, which makes up to 3 queued images a day into
`public/img/<name>.jpg` (16:9, 1200 px wide) and ticks them here.

How the agent uses it:
1. Add a line under "Queue": `- [ ] <name>.jpg — <prompt>` (name: lowercase words and dashes).
2. Add a roadmap item to put it in a guide later. A guide shows it with a line of its own:
   `![Short description of the picture](../img/<name>.jpg)`. The build fails if the file doesn't exist yet, so only
   do that item once the image is ticked below.

Prompts: a clean, modern illustration that explains one idea (for example many messy rows merging into one clean
row); brand colours mint #19D3A2 and violet #7C5CFF on a dark navy background; flat or soft 3D; no text, numbers,
logos of other companies or real people. Pictures help readers; they never replace the explanation in words.

## Queue
- [ ] swap-rows-merge.jpg — A clean modern illustration: several scattered, messy transaction rows on the left flow into one neat glowing row on the right, symbolising one crypto swap becoming one clean record. Brand colours mint #19D3A2 and violet #7C5CFF on a dark navy background, soft 3D, lots of space, no text, no numbers, no logos.
