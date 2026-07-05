import { createFileRoute } from '@tanstack/react-router'
import RemindersPage from '~/pages/Reminders'

export const Route = createFileRoute('/_admin/lembretes')({
  component: RemindersPage,
})
