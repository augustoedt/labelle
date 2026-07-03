import { createFileRoute } from '@tanstack/react-router'
import MinhasComissoesPage from '~/pages/MinhasComissoes'

export const Route = createFileRoute('/_professional/minhas-comissoes')({
  component: MinhasComissoesPage,
})
