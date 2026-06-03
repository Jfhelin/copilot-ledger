---
name: copilot-behavior-lab
description: Use when working on GitHub Pages, Copilot Behavior Lab, Copilot Ledger evidence exports, LinkedIn articles, short videos, or experiments about GitHub Copilot agent behavior and usage-based billing.
---

# Copilot Behavior Lab Skill

## Purpose

Help create high-quality GitHub Pages, LinkedIn content, videos, and experiment writeups about GitHub Copilot agent behavior and usage-based billing.

The main goal is LinkedIn attention and knowledge sharing.

The goal is not to promote Copilot Ledger as a product.

## Core Positioning

Use this positioning:

> Copilot Behavior Lab helps developers understand how AI coding agents think, work, and spend credits.

Cost is important, but the broader story is agent behavior.

## Content Strategy

LinkedIn is the primary publishing surface.

GitHub Pages is the evidence layer.

Copilot Ledger is the measurement tool behind the observations.

## Preferred Content Pattern

Use this structure:

1. Surprising observation
2. What happened in the session
3. Why it happened
4. Cost impact
5. Practical guidance
6. Evidence link or export

## Strong LinkedIn Hooks

Prefer hooks like:

- The README was cheap. Finding it wasn't.
- I thought the answer was expensive. It wasn't.
- Caveman Prompting saved less than 3% in my Copilot session.
- The most expensive information is often information the agent has to go find.
- What 23,000 tokens of context actually looks like.
- Vague prompts cost more than precise prompts.
- The agent did not just answer. It planned, searched, read files, and then answered.

Avoid hooks like:

- New article published
- Cost optimization technique number 3
- My tool can analyze Copilot usage

## GitHub Pages Structure

Each experiment page should include (this matches
`docs/content-lab/experiment-template.md` — keep the two in sync):

1. Title
2. LinkedIn hook
3. Executive summary
4. Hypothesis
5. Why this matters
6. Session summary
7. Key findings
8. What happened
9. Interpretation
10. Practical guidance
11. Confidence level
12. Evidence / Copilot Ledger export
13. LinkedIn post draft
14. Video outline

## Tone

Use a curious, technical, evidence-based tone.

Be clear and practical.

Avoid sounding like product marketing.

Avoid attacking existing Microsoft or GitHub material.

Prefer:

- “This surprised me.”
- “The measurement changed how I think about this.”
- “This reinforces the recommendation to…”
- “This is a single-session observation, not a universal benchmark.”

## Recommendations to Reinforce

When ending an article, reinforce practical recommendations:

- Choose the right model for the job.
- Use Auto Mode where appropriate.
- Provide useful context up front so the agent does not need extra exploration.
- Avoid sending excessive context, such as too much codebase content.
- Use precise prompts with clear guardrails.
- Review tools and skills periodically.
- Avoid optimizing away useful planning or reviewability.

## Current Planned Experiments

1. Context Quality  
   Main hook: The README was cheap. Finding it wasn't.

2. Model Selection  
   Main hook: The biggest cost lever is often model selection.

3. Prompt Precision  
   Main hook: Vague prompts cost more than precise prompts.

4. Caveman Prompting  
   Main hook: Caveman Prompting saved less than 3% in my Copilot session.

5. Context Growth  
   Main hook: What 23,000 tokens of context actually looks like.

6. Agent Planning  
   Main hook: I thought the answer was expensive. The plan was.

7. Tool and Skill Overhead  
   Status: under investigation. Do not overclaim.

## Handling Uncertain Findings

If an experiment is not reproducible, mark it as:

- Under investigation
- Single observation
- Low confidence
- Needs more testing

Do not force a conclusion.

## Video Guidance

For LinkedIn-first videos:

- Prefer 60–120 seconds.
- Use screen recording from Copilot Ledger.
- Focus on one surprising observation.
- End with one practical recommendation.

For GitHub Pages embedded videos:

- 5–8 minutes is acceptable.
- Show the full session flow and evidence.

## Final Reminder

The strongest content is not “how to save credits.”

The strongest content is:

> Here is what the agent actually did, why it mattered, and what developers can learn from it.