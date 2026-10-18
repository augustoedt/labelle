import { createFileRoute, redirect } from '@tanstack/react-router'
import ClientApp from '~/pages/ClientApp'

const tabs = ['home', 'catalogo', 'historico', 'fidelidade']
const sections = ['inicio', 'servicos', 'profissionais', 'sobre', 'contato']

export const Route = createFileRoute('/app')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === 'string' && tabs.includes(search.tab) ? search.tab : 'home',
    category: typeof search.category === 'string' ? search.category : undefined,
    q: typeof search.q === 'string' ? search.q.slice(0, 100) : undefined,
    section: typeof search.section === 'string' && sections.includes(search.section) ? search.section : undefined,
  }),
  beforeLoad: ({ location }) => {
    const search = location.search as Record<string, unknown>
    const tab = typeof search.tab === 'string' && tabs.includes(search.tab) ? search.tab : 'home'
    const category = typeof search.category === 'string' && /^[\w-]{1,80}$/.test(search.category) ? search.category : undefined
    const q = typeof search.q === 'string' ? search.q.slice(0, 100) : undefined
    const section = typeof search.section === 'string' && sections.includes(search.section) ? search.section : undefined
    const target = tab === 'catalogo' ? '/cliente/catalogo'
      : tab === 'historico' ? '/cliente/agendamentos'
      : tab === 'fidelidade' ? '/cliente/fidelidade'
      : '/cliente'
    throw redirect({
      to: target as never,
      search: (tab === 'catalogo' ? { category, q } : {}) as never,
      hash: (tab === 'home' && section ? section : '') as never,
      replace: true,
    })
  },
  component: ClientApp,
})
