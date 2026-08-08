import { createFileRoute, redirect } from '@tanstack/react-router'
import ProductsPage from '~/pages/Products'

export const Route = createFileRoute('/_staff/produtos')({
  beforeLoad: ({ context }) => {
    if (context.user?.role !== 'admin') {
      throw redirect({ to: '/minha-agenda' })
    }
  },
  component: ProductsPage,
})
