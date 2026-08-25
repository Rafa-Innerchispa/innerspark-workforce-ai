import { render, screen } from '@testing-library/react'
import MobileCheckin from './page'

describe('Mobile Checkin UI', () => {
  it('renders the secure remote check-in experience', () => {
    render(<MobileCheckin />)
    expect(screen.getByRole('heading', { name: /Marcación remota/i })).toBeInTheDocument()
    expect(screen.getByText(/hora validada por el servidor/i)).toBeInTheDocument()
    expect(screen.getByText(/no afirma detectar Fake-GPS/i)).toBeInTheDocument()
  })
})
