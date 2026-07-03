import { createFileRoute } from '@tanstack/react-router'
import ProductsPage from '~/pages/Products'

export const Route = createFileRoute('/_admin/produtos')({
  component: ProductsPage,
})
