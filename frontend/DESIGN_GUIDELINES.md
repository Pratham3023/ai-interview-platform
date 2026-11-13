# InterviewAI design guidelines

The reference for anyone designing or building InterviewAI's web frontend. If code and this document disagree, fix one of them so they match.

**Product:** adaptive mock technical interviews. You upload a resume and answer 15 aptitude questions, 15 role questions and 5 adaptive follow-ups. You then get a scored report and a study plan.
**Design direction:** *First light.* A near-black canvas with one warm light source: an orange "eclipse", the glowing rim of a dark planet. On the landing page it lights the product as you scroll. Everywhere else it appears sparingly, as a rim of light on the most important surface.
**Source of truth for tokens:** `src/index.css` (`:root`).

---

## 1. Design principles

People arrive nervous, often the week before a real interview. A dark, quiet interface keeps attention on the question, and the single warm light says "this is where to look".

| Principle | What it means for InterviewAI |
|---|---|
| **Clarity** | One primary (orange) action per view. The question is always the largest text on an interview screen. |
| **Consistency** | Orange always means "act here" or "needs work". It is never decoration on its own. |
| **Simplicity** | One light source. The eclipse appears at most once per screen: the hero, the closing band, the auth panel and the report verdict. |
| **Feedback** | Every action responds within 100 ms: a pressed state, a spinner with a verb ("Marking…"), or a toast. Long waits explain themselves. |

**Key takeaways**
- One light source and one primary button per view.
- Orange carries meaning: act here, or needs work.

---

## 2. Understanding the audience

**How we learn about users:** watch 5 people take a full session (think-aloud), and read the free-text feedback and support emails. Track where people drop off: upload, role choice, the multiple-choice questions (MCQs), the follow-ups, and the report.

**Aanya, final-year CS student (primary).** 21, campus placements in 3 weeks, practises at night on a laptop. Needs to know which topic will sink her. → Weak topics glow orange on every results surface, and the study plan is one click from the report.

**Rahul, 2 years in, switching jobs (secondary).** Short on time and wants realistic follow-ups. → Follow-ups are labelled as the interviewer speaking, and the role is the first decision after upload.

**Meera, uses a screen reader (accessibility persona).** → Visible labels, the question as `h2`, MCQ options with `aria-pressed`, and the decorative eclipse hidden from assistive tech (`aria-hidden`).

**Key takeaways**
- Design for nerves, night-time use and limited time.

---

## 3. Colour

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#08090B` | Page |
| `--bg-2` | `#0C0D10` | Sidebars, inset areas |
| `--surface` | `#121317` | Panels |
| `--surface-2` | `#181A1F` | Inputs, raised items |
| `--line` / `--line-2` | `#23252B` / `#30333A` | Borders |
| `--text` | `#F5F5F4` | Primary text |
| `--muted` | `#A3A3AD` | Secondary text |
| `--muted-2` | `#7C7C86` | Tertiary text and meta |
| `--orange` / `--orange-2` | `#FF6A2B` / `#FF8240` | Primary action, eclipse rim, needs work |
| `--amber` | `#FFB15C` | Highlight text, focus ring |
| `--on-orange` | `#170A03` | Text on orange |
| `--ok` | `#5BD38A` | Strong topics, success |
| `--err` | `#FF7A6E` | System errors only |

**Distribution:** 85% near-black surfaces, 10% text, 5% orange. Orange glows (`--glow-btn` and the eclipse) are the only shadows that use colour.

### Contrast (WCAG 2.2)

| Pair | Ratio | Use |
|---|---|---|
| Text on bg | 18.3 : 1 | Body |
| Muted on bg | 8.0 : 1 | Secondary |
| Muted-2 on bg | 4.8 : 1 | Meta (AA) |
| On-orange on orange | 6.8 : 1 | Primary buttons |
| Amber on bg | 11.1 : 1 | Highlights, focus |
| Err on bg | 7.8 : 1 | Errors |

White text on orange is **not allowed** (2.9 : 1).

### Emotional intent
Darkness is calm and focused, like a quiet room. The orange light is warmth and momentum: it points to your next step and to what you should work on. "Needs work" is orange, never red, and red is kept for system errors.

---

## 4. Typography

| Role | Family |
|---|---|
| Everything | **Geist**, weights 400 / 450 / 500 / 550 / 600 |
| Code and test cases only | **JetBrains Mono** |

| Token | Size / line height | Use |
|---|---|---|
| `display` | clamp(42–74) / 1.02, −0.045em, 550 | Landing headline only. White fading to light grey. |
| `h1` | 32 / 1.15 | Page title |
| `h2` | 24 / 1.2 | Section title |
| `question` | clamp(21–27) / 1.35, 500 | Interview question |
| `h3` | 18 / 1.3 | Panel title |
| `body` | 16 / 1.55–1.6 | Default |
| `small` | 14 / 1.45 | Meta, hints |

Use sentence case, keep prose to 52–64 ch, and use tabular figures for every score.

---

## 5. Iconography

- Use **lucide-react** with stroke 1.75, at 16 / 18 / 20 px.
- Icons sit next to a label, never instead of one. Icon-only buttons need `aria-label` and a `title`.
- Icons take the colour of the text they sit beside, with no coloured icon tiles.
- One icon per meaning: `Mic` dictate, `Volume2` read aloud, `LogOut` sign out, `X` close, `ExternalLink` opens a new tab, `Check` done.

---

## 6. Layout and grid

- Container max width **1200 px**, with side padding of 32 px (16 px at ≤ 768 px). 12 columns with a 24 px gutter.
- Spacing tokens: `4 8 12 16 20 24 32 40 56 80 120`.
- Landing sections are centred around the eclipse. App pages are left-aligned.
- Radius by role:

  | Element | Radius |
  |---|---|
  | Buttons, tags, pills | full |
  | Inputs, choices | 10 px |
  | Panels | 16 px |
  | App preview frame | 18 px |

- Breakpoints: `480`, `768`, `860`, `1024`, `1200`, plus a **height** breakpoint at `760px`.
- **Fit to the screen.** On laptops, each landing section should fit in one screen below the pinned nav:
  - The hero is `100svh` minus the nav. Its headline, gaps and circuit are sized with `vh` units so they shrink on short screens instead of being cut off.
  - The report showcase caps its preview by screen height, and drops its subtitle below 760px tall.
  - Test at 1366×657 and 1536×730 (common laptop sizes after browser toolbars).

```
Landing (desktop)
┌ nav: logo · links (centred) · Sign in [Start free] ┐
│            (New) Follow-up questions…              │
│        Interview practice that pushes back.        │
│        [See how it works] [Start practising]       │
│   ________________________________________         │
│  /  ← glowing eclipse rim                 \        │
│ ┌──────────── app preview (rises, lights) ┐        │
└────────────────────────────────────────────────────┘
```

---

## 7. Navigation

- **Signed out (landing):** a sticky, translucent bar with the logo, three in-page links (How it works / Follow-ups / Roles), "Sign in" and the orange "Start free".
- **Signed in:** a translucent bar with the logo, Dashboard, New interview, a "Jump to…" search (Ctrl K), and the avatar with sign out. The active link gets a soft pill background.
- **During an interview** the site nav is hidden and replaced by a session bar showing the phase, progress and "Save and leave".
- **Setup flow:** a pill step indicator, 1 Resume / 2 Role / 3 Interview. The current step is orange.

---

## 8. Interactive elements

| Component | Default | Hover | Selected / active | Disabled | Loading |
|---|---|---|---|---|---|
| Primary button | orange gradient, dark text, glow | brighter + stronger glow | pressed 1 px | 45% | spinner + verb |
| Secondary button | 4% white, `--line-2` border | 8% white | pressed 1 px | 45% | — |
| Choice (role / option) | 2% white, border | 4% white | orange border + inner ring + soft glow, letter disc filled | — | — |
| Input | `--surface-2` | lighter border | orange border + 3 px orange ring | 45% | — |
| Question cell | outline | lighter border | answered: filled grey. current: orange border with glow | — | — |

**Motion**
- Hero: orange pulses travel along the circuit traces from each subject tile into the interviewer chip (3.3 s loop, staggered). With reduced motion, the traces show as a static dim orange.
- One scroll-driven moment: the report preview tilts up (24° → 0°), scales up (0.9 → 1) and is lit as it rises out of the eclipse.
- Everything else is a 140–220 ms change of colour or border only.
- With `prefers-reduced-motion`, the preview stays flat and still.

---

## 9. Consistency

- Tokens live only in `:root`, and components use classes from `index.css`.
- Shared pieces live in `src/components/Marks.jsx` (`Wordmark`, `Eclipse`, `Turn`, `Level`, `verdictLine`) and `src/components/Circuit.jsx` (the hero circuit).
- Vocabulary:

  | Use | Not |
  |---|---|
  | interview | session, simulation |
  | follow-up | deep-dive |
  | report | results analysis |
  | study plan | roadmap |
  | needs work | weak, failure |

---

## 10. Accessibility (WCAG 2.2 AA)

- Every element is keyboard reachable in visual order. The command palette uses Ctrl K / ↑↓ / Enter / Esc.
- Focus shows as a 2 px **amber** outline offset by 2 px, on every focusable element.
- Visible `<label>`s, one `h1` per page, and the question as `h2`. Decorative glows are `aria-hidden`.
- Targets are at least 40 × 40 px.
- Colour is never the only signal: weak topics are also listed under "Needs work".

---

## 11. Optimising the experience

- **Performance:** the glows are pure CSS (gradients and box-shadows), with no images or canvas. Routes are lazy-loaded, and charts and Monaco load only where they're used. Geist is a single variable font file.
- **Cold starts:** the free-tier backend can take up to 60 s to wake. Setup pings `/health` and explains the wait.
- **Responsive:** test at 375, 768, 1024 and 1280 px, with no horizontal scroll at 375. Below 1024 px the app preview drops its sidebar, and below 860 px the auth eclipse panel hides.
- **Browsers:** latest Chrome, Edge, Firefox and Safari. `overflow-x: clip` on the hero needs Safari 16+.

---

## 12. Documentation and collaboration

**Handoff checklist** (copy into the PR):
- [ ] Uses existing tokens and classes
- [ ] All five states for each new control
- [ ] No new light source: at most one eclipse per screen
- [ ] Checked at 375 and 1280 px, plus a keyboard pass
- [ ] Copy is sentence case, uses verbs and follows the vocabulary table

### Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-11-13 | Dark "First light" direction with an orange eclipse | Chosen by the product owner from a reference; gives one strong signature |
| 2026-11-13 | Orange for "needs work", red only for errors | Red grading raises anxiety |
| 2026-11-13 | Landing preview shows a real report, not abstract charts | Shows the actual product |
| 2026-11-13 | No invented statistics or testimonials | Trust matters more than persuasion |
| 2026-11-13 | Hero becomes a one-screen layout with a circuit (subjects → interviewer chip) | Second reference from the product owner; everything important visible without scrolling on a laptop |

---

## Appendix A: token quick reference

```css
--bg #08090B  --bg-2 #0C0D10  --surface #121317  --surface-2 #181A1F
--line #23252B  --line-2 #30333A  --text #F5F5F4  --muted #A3A3AD  --muted-2 #7C7C86
--orange #FF6A2B  --orange-2 #FF8240  --amber #FFB15C  --on-orange #170A03
--ok #5BD38A  --err #FF7A6E
space: 4 8 12 16 20 24 32 40 56 80 120
radius: pill | 10 | 16 | 18
```

## Appendix B: tools

- Contrast: WebAIM contrast checker; Chrome DevTools rendering panel with "Emulate vision deficiencies" and "prefers-reduced-motion".
- Screen readers: NVDA (Windows), VoiceOver (macOS / iOS).
