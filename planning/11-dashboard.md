# Dashboard Specification

# Overview

The Dashboard is the heart of CaseCompass AI.

It is not a traditional dashboard filled with analytics or administrative widgets. Instead, it acts as the user's personalized legal research workspace—a place where they always know where they are in their journey, what they have learned, and what they should do next.

Every time a user logs in, the dashboard should answer one simple question:

> **"What's my next step?"**

The dashboard should feel calm, organized, and motivating, encouraging users to continue learning rather than overwhelming them with information.

---

# Primary Goals

The dashboard should allow users to:

- Continue their current research roadmap
- Ask educational legal questions
- View learning progress
- Access saved research
- Explore recommended topics
- Quickly resume unfinished work

---

# Dashboard Layout

Desktop Layout

```text
--------------------------------------------------------
Sidebar        |             Main Workspace
               |
               |----------------------------------------
               | Current Roadmap
               |
               |----------------------------------------
               | Continue Learning
               |
               |----------------------------------------
               | Recommended Research
               |
               |----------------------------------------
               | Saved Items
               |
--------------------------------------------------------
Right Sidebar
--------------------------------
AI Assistant
Progress
Quick Actions
Research Stats
```

---

# Sidebar Navigation

The sidebar should remain visible on desktop and collapse into a drawer on mobile.

Navigation Items

🏠 Dashboard

🧭 My Roadmaps

💬 AI Assistant

📖 Plain Language Translator

⚖ Legal Dictionary

📄 Case Breakdown

🔍 Research Library

⭐ Saved Items

👤 Profile

⚙ Settings

The active page should be highlighted using the Compass Purple accent.

---

# Welcome Header

Display a personalized greeting.

Example

Good Morning, Marcus.

Continue building your legal understanding.

Display beneath it:

Current Research Goal

Appeal Research

Current Progress

68%

Roadmap Status

In Progress

---

# Hero Widget

## Continue Your Research Roadmap

This is the largest widget on the dashboard.

Display:

Roadmap title

Current step

Estimated remaining steps

Progress bar

Primary button

Continue Research

Secondary

View Full Roadmap

Example

```
Current Roadmap

Appeal Research

████████░░░░ 68%

Current Step

Understanding Ineffective Assistance of Counsel

Continue Research →
```

---

# AI Assistant Widget

Floating panel on desktop.

Full-width card on mobile.

Title

Ask CaseCompass AI

Placeholder

Ask a legal research question...

Suggested prompts

- What is PCR?
- Explain parole eligibility.
- What does this opinion mean?
- What's the difference between an appeal and PCR?

The AI Assistant should always display:

Educational Guidance Only

---

# Continue Learning

Recommended cards generated from roadmap progress.

Examples

Continue Learning

Understanding Appeals

Related Court Opinions

Jurisdiction Basics

Reading Court Opinions

Each card contains:

Icon

Title

Short description

Estimated reading time

Continue button

---

# Progress Widget

Display:

Overall Learning Progress

Roadmap Completion

Definitions Learned

Cases Reviewed

Research Sessions

Example

```
Learning Progress

Roadmap
███████░░░

Definitions
28

Cases Reviewed
14

Research Sessions
8
```

Gamification should remain subtle.

---

# Recommended Research

AI-generated suggestions based on the user's roadmap.

Example

Because you're researching appeals, you may also want to understand:

- Procedural Default
- Habeas Corpus
- Brady Violations
- PCR Deadlines

Each recommendation includes

Why this matters

Estimated reading time

Open Topic

---

# Saved Items

Recent bookmarks.

Display

Cases

Definitions

Roadmaps

Notes

Statutes

Recent AI conversations

Users should resume with one click.

---

# Recent Activity

Timeline

Yesterday

Reviewed Appeal Procedures

Saved:

Brady v. Maryland

2 Days Ago

Asked

"What is ineffective assistance?"

Last Week

Created Appeal Research Roadmap

---

# Research Statistics

Small informational widget.

Display

Roadmaps Created

Topics Completed

Research Hours

Definitions Learned

Cases Explored

The statistics are motivational—not competitive.

---

# Daily Insight

Small educational card.

Example

Today's Insight

Most successful legal research begins with understanding procedural rules before searching case law.

Learn More

This changes daily.

---

# Educational Reminder

Persistent banner.

"We don't provide legal advice.

We help you understand where to begin."

Small shield icon.

Dismissible.

---

# Quick Actions

Floating action buttons.

Build New Roadmap

Translate Legal Text

Explain Legal Term

Upload Court Opinion

Ask AI

---

# Search Bar

Global search.

Search:

Cases

Definitions

Roadmaps

Statutes

AI Conversations

Saved Notes

Placeholder

"What would you like to understand today?"

---

# Empty State

For new users.

Illustration

Compass

Headline

Let's build your first legal research roadmap.

Body

Answer a few simple questions and we'll help you understand where to begin.

Primary CTA

Start My Roadmap

---

# Notifications

Examples

Roadmap Updated

Definition Saved

Research Complete

New Educational Resource

Notifications should never interrupt users.

---

# Mobile Dashboard

Sections stack vertically.

Order

Welcome

Roadmap

AI Assistant

Continue Learning

Progress

Saved Items

Recommended Topics

Bottom Navigation

Dashboard

Roadmap

AI

Research

Profile

---

# Personalization

The dashboard should adapt based on:

Current legal topic

Jurisdiction

Research history

Completed lessons

Saved items

Learning progress

Recently asked questions

---

# Visual Style

The dashboard should feel:

Focused

Organized

Minimal

Premium

Comfortable

Purposeful

Never cluttered.

Never resemble enterprise software.

---

# Dashboard Components

## Large Cards

Current Roadmap

AI Assistant

Continue Learning

---

## Medium Cards

Saved Research

Progress

Recommendations

Research Stats

---

## Small Cards

Daily Insight

Educational Reminder

Quick Actions

Notifications

---

# Dashboard States

Loading

Skeleton placeholders

Friendly loading messages

Empty

Encouraging illustrations

Error

Explain the issue

Offer retry

Offline (Future)

Read-only mode

Previously saved research

---

# Accessibility

Support:

Keyboard navigation

Screen readers

Reduced motion

High contrast

Large clickable areas

ARIA labels

Logical focus order

Semantic headings

---

# Dashboard Success Criteria

A successful dashboard enables users to answer these questions immediately:

- What am I currently working on?
- How much progress have I made?
- What should I learn next?
- Where is my saved research?
- How can I ask for help?
- What is the next action I should take?

If those answers are immediately visible without searching through menus, the dashboard has succeeded.

---

# Future Dashboard Features

Future versions may include:

- Facility announcements
- Attorney collaboration
- Family member portal
- AI-generated study plans
- Voice navigation
- Offline research mode
- Institutional analytics
- Document comparison
- Citation relationship graph
- Smart reminders
- Reading streaks

---

# Dashboard Philosophy

The dashboard should never feel like a control panel.

It should feel like a personalized learning workspace that gently guides users toward their next step.

Every widget should answer one question:

> **"How does this help the user better understand their legal situation?"**

If a widget does not directly support learning, research, or progress, it should be removed or redesigned.

---

# Dashboard Mission

> **The Dashboard is the user's home base—a calm, personalized workspace that transforms overwhelming legal research into a clear, guided learning journey. Every visit should leave the user knowing exactly where they are, what they've accomplished, and what they should do next.**