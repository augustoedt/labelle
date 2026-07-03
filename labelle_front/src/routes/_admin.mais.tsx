import { createFileRoute } from '@tanstack/react-router'
import MorePage from '~/pages/More'

export const Route = createFileRoute('/_admin/mais')({
  component: MorePage,
})
