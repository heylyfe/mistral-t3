# Changelog

All notable changes to Mistral T3. Versions follow [semver](https://semver.org); betas are pre-releases.

## [1.0.0-beta.1] - 2026-11-19

### Added
- 18 animated pixel cats, drawn from the Mistral Large 4 cat (red collar, gold bell): idle, thinking, working, reading, delegating, subagent, waiting, error, done, sleeping, compacting, terminal, editing, browsing, planning, listening, grooming and le gros chaton.
- Big cat on the message box that follows the open thread, a cat beside "Working for…", a tiny cream cat beside each running subagent and walking across empty chats; while delegating, tiny cats crouch and pounce out left and right, and a status cat per thread in the sidebar.
- After a turn: cheer, idle, a quick groom, le gros chaton, then sleep.
- `t3-mistral.json`: a dark and light Mistral palette, rainbow accents, a VIBE tag and a pixel send button.
- `cats/mistral-cats.css` and `cats/mistral-cats-mod.css` for using the cats in other themes.
- `gallery.html`, a Vibe-terminal-style preview of every cat.
- True pixel art: every frame is whole pixels, with motion as whole-pixel jumps or hand-drawn frame swaps.
- Tests using T3 Code's own theme filter and loader, including a headless-browser run over 25 situations; `npm run preview` writes a fake T3 Code page for each one.
- CI and release workflows, issue templates and a PR template.

[1.0.0-beta.1]: https://github.com/heylyfe/mistral-t3/releases/tag/v1.0.0-beta.1
