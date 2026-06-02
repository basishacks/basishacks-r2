---
layout: home

hero:
  name: basishacks
  text: Hackathon Platform Documentation
  tagline: Complete technical documentation for the BIBS-C Network Hackathon (Season 2, 2025–26) platform
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Architecture
      link: /architecture/overview
    - theme: alt
      text: API Reference
      link: /backend/api-reference

features:
  - title: Full-Stack Nuxt 3
    details: Vue 3 frontend with Nitro backend, TypeScript throughout, and SQLite/Cloudflare D1 database layer.
  - title: Multi-Auth System
    details: Magic code email login, Microsoft OAuth2, and custom DevConnect OAuth2 integration with PKCE support.
  - title: Hackathon Management
    details: Team creation, project submission, peer voting (12-star distribution), judge scoring with weighted rubrics, and automated ranking.
  - title: Developer Portal
    details: OAuth2 application management with client secrets, redirect URIs, scope permissions, and a URL generator for integration testing.
  - title: Microsoft Graph Integration
    details: Meeting creation, Teams chat messaging, webhook subscriptions, and a DeepSeek-powered chatbot with tool calling.
  - title: Cloudflare Deployment
    details: Production deployment on Cloudflare Pages with D1 database, GitHub Actions CI/CD, and environment-based configuration.
---
