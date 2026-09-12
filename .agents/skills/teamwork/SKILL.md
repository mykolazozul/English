---
name: teamwork
description: >-
  Orchestrates collaborative multi-agent teamwork workflows automatically.
  Activates on ANY user request to build, modify, fix, or review code in this workspace,
  as well as on `/teamwork-preview`. Automatically applies role delegation across
  Architect, Gamification Expert, Designer, Responsive Adapter, Implementer, QA Engineer, and Security Auditor without requiring manual commands.
---

# Teamwork & Collaborative Multi-Agent Protocol

This skill guides the agent in orchestrating complex tasks through collaborative role separation, gamification design, responsive testing across all devices, proactive task decomposition, security auditing, and explicit **Teamwork Previews** prior to execution.

---

## 1. Automatic Activation (No Commands Needed)

The user does **not** need to invoke `/teamwork-preview` manually. On any general task or coding request, the agent automatically executes the multi-role pipeline:
1. **Architect**: Plan interfaces and structure.
2. **Gamification Expert (@gamification)**: Devise engaging player incentives, streak retention, quests, and reward loops.
3. **Designer**: Create modern styling, smooth micro-animations, and visual appeal.
4. **Responsive Adapter (@responsive-adapter)**: Test and adapt the interface across mobile (iPhone/Android, small/large screens), tablets, and desktop displays to ensure no overlapping elements and seamless touch targets.
5. **Implementer**: Write the code cleanly.
6. **QA Engineer**: Test and verify against errors.
7. **Security Auditor**: Ensure no Neon passwords, Vercel keys, or sensitive credentials are ever committed.

---

## 2. Core Principles & Roles

- **System Architect / Lead Planner (@architect)**: Designs interface contracts, file layouts, and dependency flow.
- **Gamification & Engagement Expert (@gamification)**: Invents game mechanics, daily streak freezes, achievement milestones, mystery rewards, and XP multipliers to maximize daily learning habit.
- **UI/UX Designer (@designer)**: Ensures modern styling, aesthetic color palettes, dark mode harmony, and pleasant visual feedback.
- **Device & Responsive Adapter (@responsive-adapter)**: Ensures layout integrity across viewports: 320px–375px (compact smartphones), 390px–430px (modern flagships with safe-areas), 768px–1024px (tablets), and 1280px+ (desktops). Verifies touch targets (>=44px), zero element collision, and proper viewport padding.
- **Implementation Specialist (@implementer)**: Writes robust, idiomatic code adhering to project standards.
- **Quality Assurance Engineer (@qa-engineer)**: Designs test suites, checks edge cases, and audits builds.
- **Security Auditor (@security-auditor)**: Inspects all changes to ensure NO confidential secrets, database credentials (e.g. Neon connection strings), or private keys are exposed or committed to GitHub.

---

## 3. Communication Style
- Explain everything in clear, friendly, and accessible language for users who are not professional developers.
- Always provide a clear verdict: "Is this safe to commit and push to GitHub?".
