import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'basishacks',
  description: 'Documentation for the BIBS-C Network Hackathon platform',
  lang: 'en-US',
  appearance: 'dark',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    siteTitle: 'basishacks docs',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Architecture', link: '/architecture/overview' },
      { text: 'Frontend', link: '/frontend/components' },
      { text: 'Backend', link: '/backend/api-reference' },
      { text: 'Shared', link: '/shared/schemas' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Project Overview', link: '/guide/project-overview' },
            { text: 'Environment Setup', link: '/guide/environment-setup' },
          ],
        },
      ],
      '/architecture/': [
        {
          text: 'Architecture',
          items: [
            { text: 'Overview', link: '/architecture/overview' },
            { text: 'Runtime Architecture', link: '/architecture/runtime' },
            { text: 'Database', link: '/architecture/database' },
            { text: 'Authentication & Authorization', link: '/architecture/auth' },
            { text: 'OAuth2 System', link: '/architecture/oauth2' },
          ],
        },
      ],
      '/frontend/': [
        {
          text: 'Frontend',
          items: [
            { text: 'Components', link: '/frontend/components' },
            { text: 'Pages', link: '/frontend/pages' },
            { text: 'Layouts', link: '/frontend/layouts' },
            { text: 'Composables & Utilities', link: '/frontend/composables' },
          ],
        },
      ],
      '/backend/': [
        {
          text: 'Backend',
          items: [
            { text: 'API Reference', link: '/backend/api-reference' },
            { text: 'Server Utilities', link: '/backend/server-utilities' },
            { text: 'Plugins & Middleware', link: '/backend/plugins-middleware' },
          ],
        },
      ],
      '/shared/': [
        {
          text: 'Shared Code',
          items: [
            { text: 'Zod Schemas', link: '/shared/schemas' },
            { text: 'Type Definitions', link: '/shared/types' },
            { text: 'Rubric System', link: '/shared/rubric' },
            { text: 'Permissions', link: '/shared/permissions' },
            { text: 'OAuth2 Scopes', link: '/shared/oauth2-scopes' },
          ],
        },
      ],
      '/deployment/': [
        {
          text: 'Deployment & Operations',
          items: [
            { text: 'Cloudflare Deployment', link: '/deployment/cloudflare' },
            { text: 'Security', link: '/deployment/security' },
            { text: 'Rate Limiting', link: '/deployment/rate-limiting' },
          ],
        },
      ],
    },
    search: {
      provider: 'local',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com' },
    ],
    footer: {
      message: 'BIBS-C Network Hackathon Documentation',
      copyright: 'Copyright © 2025-2026 BISZ Developers\' Club & BINJ Hack Club',
    },
    outline: {
      level: [2, 3],
      label: 'On this page',
    },
    editLink: {
      pattern: 'https://github.com/edit/main/documentation/:path',
      text: 'Edit this page',
    },
  },
  markdown: {
    lineNumbers: true,
  },
})
