# Changelog

All notable changes to Mistral T3. Versions follow [semver](https://semver.org); betas are pre-releases.

## [1.0.0-beta.2] - 2026-11-19

### Added
- Sidebar: hover a chat and a tiny cream cat peeks up from under it.
- Sidebar: drag a chat (to move, pin or snooze it) or sweep several and the cat's paw bats at the row; dropping on **Settle** brings a second paw from the other side.
- The "Settled, Undo" notice gets a paw swipe as it appears.
- Settings: a kitten sits on the section you're in, a tiny cat peeks from the others on hover, and a cat in the page corner matches the section (it paints the Mistral rainbow on Appearance, types on Keybindings, naps on Archived, turns into le gros chaton on About…).
- Three new sprites: painting, peek and paw (21 in all).
- Browser tests for dragging, settling, the undo notice and seven settings pages (42 checks in all).

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

[1.0.0-beta.2]: https://github.com/heylyfe/mistral-t3/releases/tag/v1.0.0-beta.2
[1.0.0-beta.1]: https://github.com/heylyfe/mistral-t3/releases/tag/v1.0.0-beta.1
