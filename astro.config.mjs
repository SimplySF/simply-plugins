import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import { remarkBaseLinks } from './plugins/remark-base-links.mjs';

const base = '/simply';

export default defineConfig({
  site: 'https://simplysf.github.io',
  base,
  markdown: {
    remarkPlugins: [remarkBaseLinks(base)],
  },
  integrations: [
    starlight({
      title: 'Simply',
      description: 'Salesforce CLI plugins by SimplySF — including simply-cicd for CI/CD pipelines.',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/SimplySF/simply' }],
      editLink: {
        baseUrl: 'https://github.com/SimplySF/simply/edit/main/site/',
      },
      sidebar: [
        { label: 'Get Started', slug: 'getting-started' },
        {
          label: 'simply-cicd',
          items: [
            { label: 'Overview', slug: 'cicd' },
            { label: 'Concepts', items: [{ autogenerate: { directory: 'cicd/concepts' } }] },
            { label: 'Guides', items: [{ autogenerate: { directory: 'cicd/guides' } }] },
            { label: 'Command Reference', items: [{ autogenerate: { directory: 'cicd/reference' } }] },
          ],
        },
        { label: 'Other Plugins', items: [{ autogenerate: { directory: 'plugins' } }] },
      ],
    }),
  ],
});
