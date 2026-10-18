import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import type { ComponentType } from 'react'
import MinhaAgenda from '~/pages/MinhaAgenda'
import Clients from '~/pages/Clients'
import Services from '~/pages/Services'
import Commissions from '~/pages/MinhasComissoes'
import Promotions from '~/pages/Promotions'
import More from '~/pages/More'
import { validateStaffSearch } from '~/lib/staffRoutes'
const pages: Record<string, ComponentType> = {
  agenda: MinhaAgenda, clientes: Clients, servicos: Services,
  comissoes: Commissions, promocoes: Promotions, mais: More,
}
export const Route = createFileRoute('/profissional/$section')({
  validateSearch: validateStaffSearch,
  beforeLoad: ({ params, location }) => {
    const search = location.search as Record<string, unknown>
    if (params.section === 'clientes' && search.q) {
      throw redirect({ to: '/profissional/$section', params, search: { ...search, q: undefined } as never, replace: true })
    }
  },
  component: () => {
    const { section } = Route.useParams()
    const Page = pages[section]
    if (!Page) throw notFound()
    return <Page />
  },
})
