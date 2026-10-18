import { createFileRoute, redirect } from '@tanstack/react-router'
import AppLayout from '~/components/layout/AppLayout'
import { roleHome, validateStaffSearch } from '~/lib/staffRoutes'

const adminOnly = new Set(['produtos', 'profissionais', 'financeiro', 'relatorios', 'fidelidade', 'lembretes', 'configuracoes'])
const professionalNames: Record<string, string> = { 'minha-agenda': 'agenda', 'minhas-comissoes': 'comissoes' }
const adminNames: Record<string, string> = { 'minha-agenda': 'agenda', 'minhas-comissoes': 'agenda' }

export const Route = createFileRoute('/_staff')({
  beforeLoad: ({ context, location }) => {
    const oldSection = location.pathname.split('/').filter(Boolean)[0]
    if (!context.user) {
      const safe = validateStaffSearch(location.search as Record<string, unknown>)
      if (oldSection === 'clientes') delete safe.q
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(safe)) params.set(key, String(value))
      const returnTo = `${location.pathname}${params.size ? `?${params}` : ''}`
      throw redirect({ to: '/login', search: { returnTo } as never })
    }
    if (!['admin', 'profissional'].includes(context.user.role)) throw redirect({ to: '/' })
    if (!oldSection) return
    const section = context.user.role === 'admin' ? (adminNames[oldSection] || oldSection) : (professionalNames[oldSection] || oldSection)
    const allowed = context.user.role === 'admin'
      ? new Set(['agenda', 'clientes', 'servicos', 'produtos', 'profissionais', 'financeiro', 'relatorios', 'promocoes', 'fidelidade', 'lembretes', 'configuracoes', 'mais'])
      : new Set(['agenda', 'clientes', 'servicos', 'comissoes', 'promocoes', 'mais'])
    if (!allowed.has(section) || (context.user.role === 'profissional' && adminOnly.has(oldSection))) throw redirect({ to: roleHome(context.user.role) as never })
    const search = validateStaffSearch(location.search as Record<string, unknown>)
    if (section === 'clientes') delete search.q
    throw redirect({ to: `${context.user.role === 'admin' ? '/admin' : '/profissional'}/${section}` as never, search: search as never })
  },
  component: AppLayout,
})
