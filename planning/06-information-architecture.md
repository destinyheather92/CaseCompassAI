# Information Architecture

# Overview

The information architecture for CaseCompass AI is designed around a single guiding principle:

> **Users should always know where they are, what they are doing, and what comes next.**

Unlike traditional legal research platforms that prioritize search, CaseCompass AI prioritizes **guided learning**. The application's structure leads users through a clear progression—from asking a question to building understanding through a personalized legal research roadmap.

The navigation, page hierarchy, and user flows are intentionally simple to reduce cognitive load and improve accessibility for users with limited legal or technical experience.

---

# Site Map

```text
Landing Page
│
├── About
├── Features
├── How It Works
├── Resources
├── Contact
│
└── Get Started
      │
      ▼
Authentication
│
├── Sign Up
├── Sign In
└── Forgot Password
      │
      ▼
Onboarding
│
├── Welcome
├── Disclaimer
├── Accessibility Preferences
└── Begin Guided Intake
      │
      ▼
Guided Intake
│
├── Personal Information
├── Case Information
├── Legal History
├── Current Questions
└── Review Responses
      │
      ▼
AI Analysis
      │
      ▼
Dashboard
│
├── Current Research Roadmap
├── Continue Learning
├── Saved Research
├── AI Assistant
├── Recommended Topics
├── Recent Activity
└── Progress Overview
      │
      ▼
Research Workspace
│
├── Personalized Roadmap
├── Plain Language Translator
├── Legal Dictionary
├── Case Breakdown
├── Guided Research
├── Citation Explorer
└── Saved Notes
      │
      ▼
Profile
│
├── Account
├── Accessibility
├── Preferences
├── Notifications
└── Security
```

---

# Primary Navigation

The primary navigation should remain minimal and focused.

## Public Navigation

- Home
- How It Works
- Features
- Resources
- About
- Get Started

---

## Authenticated Navigation

Sidebar Navigation

- Dashboard
- My Roadmaps
- AI Assistant
- Translator
- Legal Dictionary
- Case Breakdown
- Research Library
- Saved Items
- Profile
- Settings

---

# Landing Page Architecture

```text
Navigation

↓

Hero Section

↓

Problem Statement

↓

How It Works

↓

Personalized Roadmap Preview

↓

Core Features

↓

Why CaseCompass

↓

Testimonials (Future)

↓

FAQ

↓

Call to Action

↓

Footer
```

Purpose:

Introduce the problem before introducing the solution.

---

# Authentication Flow

```text
Landing

↓

Get Started

↓

Create Account

↓

Verify Email

↓

Accept Disclaimer

↓

Accessibility Preferences

↓

Welcome

↓

Begin Guided Intake
```

Users should never be dropped directly into a dashboard without understanding the application's purpose.

---

# Guided Intake Architecture

```text
Welcome

↓

Basic Information

↓

Jurisdiction

↓

Case Type

↓

Current Legal Stage

↓

Primary Question

↓

Additional Context

↓

Review Answers

↓

Generate Research Roadmap
```

Each screen should ask only one or two questions to minimize cognitive load.

---

# Dashboard Architecture

The dashboard acts as the user's home base.

## Sections

### Current Roadmap

Continue where the user left off.

---

### AI Assistant

Quick access to educational questions.

---

### Saved Research

Recently viewed cases

Saved statutes

Definitions

Bookmarks

---

### Continue Learning

Suggested next topics.

---

### Progress

Visual roadmap progress.

---

### Recent Activity

Latest searches

Completed topics

Saved notes

---

# Research Workspace

The Research Workspace is the heart of the application.

It contains multiple educational tools that work together.

```text
Research Workspace

│

├── Personalized Roadmap

├── Plain Language Translator

├── Legal Dictionary

├── Case Breakdown

├── Citation Explorer

├── Guided Research

└── Notes
```

The roadmap remains visible throughout the experience to reinforce direction.

---

# Personalized Roadmap Structure

Each roadmap consists of learning modules.

Example

```text
Question

↓

Legal Issue

↓

Definitions

↓

Relevant Statutes

↓

Related Cases

↓

Procedural Rules

↓

Questions to Research

↓

Next Learning Goal
```

Users may expand each section independently.

---

# Plain Language Translator

Navigation

```text
Paste Text

↓

AI Translation

↓

Key Terms

↓

Important Concepts

↓

Save

↓

Continue Research
```

---

# Legal Dictionary

Navigation

```text
Search

↓

Definition

↓

Plain Language

↓

Related Terms

↓

Related Cases

↓

Save
```

---

# Case Breakdown

Navigation

```text
Upload Opinion

↓

AI Analysis

↓

Facts

↓

Issue

↓

Holding

↓

Reasoning

↓

Plain Language

↓

Related Research
```

---

# AI Assistant

Conversation Layout

```text
Conversation

↓

AI Response

↓

Educational Sources

↓

Suggested Follow-Up Questions

↓

Continue Research
```

The assistant should always provide educational guidance rather than conclusions.

---

# User Profile

Sections

- Personal Information
- Accessibility
- Saved Research
- Preferences
- Notifications
- Security
- Privacy

---

# Footer Navigation

Resources

- About
- Contact
- Privacy Policy
- Terms of Service
- Accessibility
- Legal Disclaimer

Support

- Help Center
- FAQs
- Report a Problem

---

# Content Hierarchy

The interface should present information in this order:

1. What am I looking at?
2. Why does it matter?
3. What should I do next?
4. Where can I learn more?

This hierarchy should remain consistent throughout the application.

---

# Navigation Principles

Navigation should always be:

- Predictable
- Consistent
- Minimal
- Accessible
- Mobile-friendly
- Task-oriented

Users should never have to guess where to click next.

---

# Mobile Information Architecture

On mobile:

Bottom Navigation

- Dashboard
- Roadmap
- AI
- Research
- Profile

Secondary navigation should collapse into expandable menus.

The Personalized Roadmap should always remain one tap away.

---

# Breadcrumb Structure

Example

```text
Dashboard

>

My Roadmap

>

Appeal Research

>

Ineffective Assistance

>

Related Cases
```

Users should always understand where they are within the application.

---

# Search Architecture

Global search should return:

- Legal Terms
- Roadmaps
- Cases
- Statutes
- Saved Notes
- AI Conversations

Filters

- State
- Topic
- Court
- Date
- Saved Items

---

# Accessibility Architecture

Every page should include:

- Skip navigation links
- Keyboard navigation
- Visible focus states
- High contrast
- Screen reader support
- Plain-language headings
- Logical heading hierarchy (H1 → H2 → H3)
- Reduced motion support

---

# Error States

Every error page should answer:

- What happened?
- Why did it happen?
- What can I do next?

Example

Unable to Generate Roadmap

↓

Explain the issue

↓

Offer retry

↓

Provide manual resources

↓

Contact support

---

# Scalability

The architecture should support future additions without restructuring the application.

Planned future modules include:

- Family Portal
- Institutional Dashboard
- Law School Clinic Portal
- Voice Assistant
- Document Upload & OCR
- State-Specific Research Libraries
- Multi-Language Support
- Analytics Dashboard
- Facility Administration

---

# Information Architecture Principles

The application's structure should always prioritize:

- Clarity over complexity
- Guidance over search
- Education over automation
- Accessibility over feature density
- User confidence over technical sophistication

Every screen should move the user one step closer to understanding their legal issue.

---

# Architecture Summary

CaseCompass AI is organized around a guided educational journey rather than a traditional search experience. Instead of asking users to navigate a complex legal system on their own, the platform provides a structured pathway from initial questions to personalized research roadmaps, ensuring every page has a clear purpose, every interaction has a logical next step, and every feature contributes to helping users understand where to begin.