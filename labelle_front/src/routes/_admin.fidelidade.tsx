import { createFileRoute } from '@tanstack/react-router'
import LoyaltyPage from '~/pages/Loyalty'

export const Route = createFileRoute('/_admin/fidelidade')({
  component: LoyaltyPage,
})
