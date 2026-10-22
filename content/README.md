# Shared Sentence Library — development candidate

This is a **data-only extraction**, not a live migration. The production Sentence Invaders `index.html` remains the authoritative runtime source until a separately tested adapter is approved.

## Canonical candidate

`content/sentences.v1.json` has a versioned structure:

- `schemaVersion`: 1
- `languages[locale][grammarTopic]`: list of `[English, target-language]` pairs
- Supported locales: `es-ES`, `de-DE`, `da-DK`, `fr-FR`, `it-IT`
- Existing CURATED overrides were applied to the corresponding LIB topics, matching the current game's effective bank.

## Planned consumption contract

A game adapter loads and validates this JSON, selects locale and grammar topic, and passes the resulting sentence pairs to gameplay. Each game continues to own its mechanics, sentence tokenization, answer generation, sounds, and presentation. A missing or malformed library must produce a clear error or use an explicitly versioned last-known-good fallback; never silently switch language.

Version-pinned content and a controlled publishing path are required before more than one game consumes this file. This repository path is **not** yet a stable public cross-game URL. Sentence Eater must be integrated and browser-tested separately.

Teacher-created shared sentence sets remain independent of this built-in grammar bank. No changes to Cloudflare D1, staging/production APIs, vocabulary infrastructure, the arcade, or published game routes are part of this branch.

## Release gates

1. Validate schema, locales, topic counts, pair shape, duplicate pairs, and UTF-8 content.
2. Confirm exact effective content parity with the published Sentence Invaders source.
3. Add a version-pinned loader in an isolated preview branch, preserving the approved menu and gameplay.
4. Test all five languages and both built-in and teacher-created content in a real browser.
5. Obtain visual and functional approval, then migrate one game at a time with rollback.
