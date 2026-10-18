import { createFileRoute } from '@tanstack/react-router'
import ClientApp from '~/pages/ClientApp'

// The public website remains canonical at / even for authenticated staff.
export const Route = createFileRoute('/')({ component: ClientApp })
