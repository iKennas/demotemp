import { isAxiosError } from 'axios'

export function apiErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data
    if (data?.errors) {
      return Object.values(data.errors).flat().join(' ')
    }
    if (data?.message) return data.message
  }
  return 'Something went wrong. Please try again.'
}
