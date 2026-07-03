import { createFileRoute } from '@tanstack/react-router'
import FinancePage from '~/pages/Finance'

export const Route = createFileRoute('/_admin/financeiro')({
  component: FinancePage,
})
