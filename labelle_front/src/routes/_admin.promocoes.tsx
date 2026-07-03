import { createFileRoute } from '@tanstack/react-router'
import PromotionsPage from '~/pages/Promotions'

export const Route = createFileRoute('/_admin/promocoes')({
  component: PromotionsPage,
})
