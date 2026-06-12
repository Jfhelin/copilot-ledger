# Harness differences — analysis notes (Article 2 material)

**Framing:** Same Sonnet weights behind every harness. The question is *what the
harness sends to the model before/while you work*. That payload is **model-agnostic**
— it's a harness design choice, not a 4.5 vs 4.6 thing. So we analyze "what data the
harness puts on the wire," and split every aspect into **LOCKED by Anthropic
(model + API contract)** vs **HARNESS DISCRETION**.

Harnesses tracked: **Copilot CLI**, **Claude CLI**, **VS Code Copilot**, **Claude Code in VS Code**.

**Evidence base (all on the `claude-sonnet-4-5-20250929` snapshot; same repo-explainer task):**
- Copilot CLI: raw wire-request bodies in
  `52203f3d…/files/structural/copilot/logs/process-1781029040975-75037.log` (7 requests).
- Claude CLI: relay-captured raw request bodies in
  `52203f3d…/files/agentsmd-test/claude-captures/*.json` + `structural/claude/digest.json`.
- VS Code Copilot / Claude-in-VS-Code: aggregate prefix numbers already in the draft
  (`hi18`, `Claudeok`, `hi_VSCInsider_claude`) — 22k / 86k / 131k. Not re-verified at
  wire level this session.

---

## 1. The lock-down vs discretion matrix (the centerpiece)

### LOCKED by Anthropic (every Sonnet harness inherits these)
| Locked surface | What it means for a harness builder |
|---|---|
| **Wire contract** | Must use `system`, `messages` with strict user/assistant alternation, `tools[]` with JSON-Schema `input_schema`, and the `tool_use` / `tool_result` content-block shapes. No alternative tool protocol. |
| **Extended-thinking mechanism** | The only thinking knob is `thinking:{type:"enabled", budget_tokens}`; summarized vs raw is Anthropic's; thinking blocks **must be echoed back** in subsequent message history or the call errors. |
| **Prompt caching mechanism** | Caching only via `cache_control:{type:"ephemeral"}` breakpoints, **≤4**, prefix-only, Anthropic-set TTL. Harness can place them but can't change the mechanism. |
| **Ceilings & identity** | temperature range, `max_tokens` ceiling, tokenizer, the dated snapshot id, and the **safety/refusal floor** trained into the weights (plus Anthropic's recommended security preamble). |

### HARNESS DISCRETION (where the 4 actually differ)
| Knob | Why it's the harness's call |
|---|---|
| System prompt content / voice / length / **shape (string vs block array)** | Free text. |
| `max_tokens`, `temperature`, `thinking.budget_tokens`, thinking on/off **per turn** | Harness picks the values within Anthropic's ranges. |
| Tool **catalog**: which tools, how many, names/casing, description verbosity, schema design | Entirely harness-authored. |
| Tool **delivery**: flat vs virtualized/deferred | The one genuinely structural harness difference. |
| **Skills**: whether they exist, the catalog, and **where injected** (system prefix vs user-message reminder) | Harness mechanism, not a model feature. |
| **Cache breakpoint placement** strategy | Drives hit-rate → cost. |
| Memory-file injection (`CLAUDE.md`, `copilot-instructions.md`) | Harness decides what/whether to load. |
| Sub-agent / Task fan-out design | Harness orchestration. |
| Org / content-policy enforcement | Platform layer (GitHub), not the model. |
| Billing denomination | Platform layer. |

---

## 2. Measured wire-level diff — the two CLIs (same task, same snapshot)

| Aspect | Copilot CLI | Claude CLI | Source |
|---|---|---|---|
| `system` shape | **array of text blocks** w/ cache_control | **string** | log L1080 / capture 008 |
| System opener | "You are the GitHub Copilot CLI…" | "You are a Claude agent, built on Anthropic's Claude Agent SDK" + security preamble | same |
| `max_tokens` | **8192** | **32000** | log L1079 / capture |
| `temperature` | **1** (explicit) | **unset** (Anthropic default) | log L1602 / capture |
| `thinking` | `{enabled, budget_tokens:1024, display:summarized}`, **every request** | not set on 1st request (transcript still shows a thinking block) | log L1603 |
| Tools sent | **19**, FLAT, full schemas | **27**, FLAT, full schemas | log / capture |
| Tool-def share of prefix | ~8.1k tok = **54%** | ~18.9k tok = **73%** | digests |
| Tool naming | `bash`, `view`, `edit`, `report_intent` (snake) | `Bash`, `Read`, `Edit`, `Agent`, `Task*` (Pascal) | catalogs |
| Skills | `skill` tool + skill catalog | **13 skills** via `<system-reminder>` in **first user message** + `Skill` tool | capture messages[0] |
| Cache breakpoints | ~3 ephemeral/turn (system, tools boundary, rolling msg) | (relay normalized; not byte-exact) | log cache_control lines |
| Cache hit rate | **87.2%** | **90.2%** | digests |
| Billing | **native GitHub AI credits** (exact, ~16.3 cr / $0.163) | none in transcript → token-normalized (~$0.50) | digests |
| Org policy | enforces content-exclusion (`secrets.json` blocked) | n/a in capture | log L1610-1612 |

**Reading:** both CLIs send tools *flat* (neither virtualizes at this catalog size), so the
prefix is dominated by tool schemas — 54% vs 73%. The "system prompt debate" is a rounding
error next to the tool catalog. The biggest *behavioral* divergences are harness choices:
4× `max_tokens`, thinking-every-turn vs not, and a 19- vs 27-tool catalog.

---

## 3. Cross-environment knob: tool delivery (from existing draft)
- **VS Code Copilot**: virtualizes / **defers** tools — advertises most name-only above a
  threshold, loads schemas on demand. Trivial-turn prefix ~22k.
- **Claude Code in VS Code**: sends enabled tools **flat**; grouping saved 0 tokens; tool
  defs were **84–87%** of an 86k–131k prefix.
- **Both CLIs**: flat (confirmed above).
> Hand the same MCP set to VS Code Copilot vs Claude-in-VS-Code and the Claude harness
> carries a larger per-turn prefix — not because the model is heavier, but because the
> harness around it doesn't defer tool schemas.

---

## 4. Corrections needed in the current draft (`what-actually-differs.md`)
1. **§2 is now wrong.** It claims "Skills are Copilot-native; E2/E3 carried zero." The newer
   Claude CLI capture shows **13 skills** injected via a system-reminder + `Skill` tool.
   Claude Code *has* skills — just delivered in the user turn, not the system prefix.
2. Reframe around **"what the harness sends" (model-agnostic)** rather than "Sonnet 4.5",
   and fold in the **lock-down vs discretion** matrix as the spine.
3. Add the measured CLI wire table (§2 above) — it's first-party raw-request evidence,
   stronger than the trivial-turn aggregates.

---

## 5. Open follow-ups (not blocking)
- Re-verify the two IDE harnesses at wire level if we want first-party numbers there too.
- Optional: a clean trivial-turn capture on 4.6 to confirm the structure is unchanged
  (expected: identical shape, since it's harness-side).
