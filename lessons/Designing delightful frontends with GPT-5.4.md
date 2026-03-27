---
title: Designing delightful frontends with GPT-5.4
category: Фронтенд
tags: [frontend, GPT, дизайн, UI]
---

# **Designing delightful frontends with GPT-5.4**

Practical techniques for steering GPT-5.4 toward polished, production-ready frontend designs.

**Authors:** Brian Fioca, Alistair Gillespie, Kevin Leneway, Robert Tinn

![Designing delightful frontends with GPT-5.4](https://developers.openai.com/images/blog/designing-beautiful-frontends.png "Designing delightful frontends with GPT-5.4")

GPT-5.4 is a better web developer than its predecessors—generating more visually appealing and ambitious frontends. Notably, we trained GPT-5.4 with a focus on improved UI capabilities and use of images. With the right guidance, the model can produce production-ready frontends incorporating subtle touches, well-crafted interactions, and beautiful imagery.

Web design can produce a large surface area of outcomes. Great design balances restraint with invention—drawing from patterns that have stood the test of time while introducing something new. GPT-5.4 has learned this wide spectrum of design approaches and understands many different ways a website can be built.

When prompts are underspecified, models often fall back to high-frequency patterns from the training data. Some of these are proven conventions, but many are simply overrepresented habits we want to avoid. The result is usually plausible and functional, but it can drift toward generic structure, weak visual hierarchy, and design choices that fall short of what we visualize in our heads.

This guide explains practical techniques for steering GPT-5.4 toward crafting the designs you envision.

## **Model Improvements**

While GPT-5.4 improves across a **[range of axes](https://openai.com/index/introducing-gpt-5-4/)**, for front-end work we focused on three practical gains:

* stronger image understanding throughout the design process
* more functionally complete apps and websites
* better use of tools to inspect, test, and verify its own work

### **Image understanding and tool use**

GPT-5.4 was trained to use image search and image generation tools natively, allowing it to incorporate visual reasoning directly into its design process. For best results, instruct the model to first generate a mood board or several visual options before selecting the final assets.

You can guide the model toward strong visual references by explicitly describing the attributes the images should capture (e.g., style, color palette, composition, or mood). You should also include prompt instructions that guide the model to reuse previously generated images, call the image generation tool to create new visuals, or reference specific external images when required.

```plaintext
Default to using any uploaded/pre-generated images. Otherwise use the image generation tool to create visually stunning image artifacts. Do not reference or link to web images unless the user explicitly asks for them.
```

### **Functionality improvements**

The model was trained to develop more complete and functionally sound apps. Expect the model to be more reliable over long-horizon tasks. Games and complex user experiences you previously thought were impossible are a reality in one or two turns.

### **Computer Use and Verification**

GPT-5.4 is our first mainline model trained for computer use. It can natively navigate interfaces, and combined with tools such as Playwright, it can iteratively inspect its work, validate behavior, and refine implementations—enabling longer, more autonomous development workflows.

Watch our **[launch video](https://openai.com/index/introducing-gpt-5-4/?video=1170427106%20)** to see these capabilities in action.

Playwright is particularly valuable for front-end development. It allows the model to inspect rendered pages, test multiple viewports, navigate application flows, and detect issues with state or navigation. Providing a Playwright tool or skill significantly improves the likelihood that GPT-5.4 produces polished, functionally complete interfaces. With improved image understanding, it also provides a way for the model to verify its work visually and check that it matches the reference UI if provided.

## **Practical tips quickstart**

If you adopt only a few practices from this document, start with these:

1. Select low reasoning level to begin with.
2. Define your design system and constraints upfront (i.e., typography, color palette, layout).
3. Provide visual references or a mood board (i.e., attach a screenshot) to provide visual guardrails for the model.
4. Define a narrative or content strategy upfront to guide the model’s content creation.

Here’s a prompt to get started.

```plaintext
## Frontend tasks

When doing frontend design tasks, avoid generic, overbuilt layouts.

**Use these hard rules:**
- One composition: The first viewport must read as one composition, not a dashboard (unless it's a dashboard).
- Brand first: On branded pages, the brand or product name must be a hero-level signal, not just nav text or an eyebrow. No headline should overpower the brand.
- Brand test: If the first viewport could belong to another brand after removing the nav, the branding is too weak.
- Typography: Use expressive, purposeful fonts and avoid default stacks (Inter, Roboto, Arial, system).
- Background: Don't rely on flat, single-color backgrounds; use gradients, images, or subtle patterns to build atmosphere.
- Full-bleed hero only: On landing pages and promotional surfaces, the hero image should be a dominant edge-to-edge visual plane or background by default. Do not use inset hero images, side-panel hero images, rounded media cards, tiled collages, or floating image blocks unless the existing design system clearly requires it.
- Hero budget: The first viewport should usually contain only the brand, one headline, one short supporting sentence, one CTA group, and one dominant image. Do not place stats, schedules, event listings, address blocks, promos, "this week" callouts, metadata rows, or secondary marketing content in the first viewport.
- No hero overlays: Do not place detached labels, floating badges, promo stickers, info chips, or callout boxes on top of hero media.
- Cards: Default: no cards. Never use cards in the hero. Cards are allowed only when they are the container for a user interaction. If removing a border, shadow, background, or radius does not hurt interaction or understanding, it should not be a card.
- One job per section: Each section should have one purpose, one headline, and usually one short supporting sentence.
- Real visual anchor: Imagery should show the product, place, atmosphere, or context. Decorative gradients and abstract backgrounds do not count as the main visual idea.
- Reduce clutter: Avoid pill clusters, stat strips, icon rows, boxed promos, schedule snippets, and multiple competing text blocks.
- Use motion to create presence and hierarchy, not noise. Ship at least 2-3 intentional motions for visually led work.
- Color & Look: Choose a clear visual direction; define CSS variables; avoid purple-on-white defaults. No purple bias or dark mode bias.
- Ensure the page loads properly on both desktop and mobile.
- For React code, prefer modern patterns including useEffectEvent, startTransition, and useDeferredValue when appropriate if used by the team. Do not add useMemo/useCallback by default unless already used; follow the repo's React Compiler guidance.

Exception: If working within an existing website or design system, preserve the established patterns, structure, and visual language.
```

## **Techniques for better designs**

### **Start with design principles**

Define constraints such as one H1 headline, no more than six sections, two typefaces maximum, one accent color, and one primary CTA above the fold.

### **Provide visual references**

Reference screenshots or mood boards help the model infer layout rhythm, typography scale, spacing systems, and imagery treatment. Below is an example of GPT-5.4 generating its own mood board for the user to review.

![Example mood board used to guide GPT-5.4 toward a cohesive visual direction](https://cdn.openai.com/devhub/blog/codex_moodboard.png "Example mood board used to guide GPT-5.4 toward a cohesive visual direction")

<br />

*Mood board created with GPT-5.4 in Codex inspired by NYC coffee culture and Y2K aesthetics*

<br />

### **Structure the page as a narrative**

Typical marketing page structure:

1. Hero — establish identity and promise
2. Supporting imagery — show context or environment
3. Product detail — explain the offering
4. Social proof — establish credibility
5. Final CTA — convert interest into action

### **Instruct design system adherence**

Encourage the model to establish a clear design system early in the build. Define core design tokens such as `background`, `surface`, `primary text`, `muted text`, and `accent`, along with typography roles like `display`, `headline`, `body`, and `caption`. This structure helps the model produce consistent, scalable UI patterns across the application.

For most web projects, starting with a familiar stack such as **React and Tailwind** works well. GPT-5.4 performs particularly strongly with these tools, making it easier to iterate quickly and reach polished results.

Motion and layered UI elements can introduce complexity, especially when fixed or floating components interact with primary content. When working with animations, overlays, or decorative layers, it helps to include guidance that encourages safe layout behavior. For example:

```plaintext
Keep fixed or floating UI elements from overlapping text, buttons, or other key content across screen sizes. Place them in safe areas, behind primary content where appropriate, and maintain sufficient spacing.
```

### **Dial back the reasoning**

For simpler websites, more reasoning is not always better. In practice, **low and medium reasoning levels often lead to stronger front-end results**, helping the model stay fast, focused, and less prone to overthinking, while still leaving headroom to turn reasoning up for more ambitious designs.

### **Ground the design in real content**

Providing the model with real copy, product context, or a clear project goal is one of the simplest ways to improve front-end results. That context helps it choose the right site structure, shape clearer section-level narratives, and write more believable messaging instead of falling back to generic placeholder patterns.

## **Bringing it all together with the Frontend Skill**

To help people get the most out of GPT-5.4 on general front-end tasks, we’ve also prepared a dedicated [`frontend-skill`](https://github.com/openai/skills/tree/main/skills/.curated/frontend-skill) you can find below. It gives the model stronger guidance on structure, taste, and interaction patterns, helping it produce more polished, intentional, and delightful designs out of the box.
