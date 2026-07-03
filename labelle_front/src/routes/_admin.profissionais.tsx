import { createFileRoute } from '@tanstack/react-router'
import ProfessionalsPage from '~/pages/Professionals'

export const Route = createFileRoute('/_admin/profissionais')({
  component: ProfessionalsPage,
})
