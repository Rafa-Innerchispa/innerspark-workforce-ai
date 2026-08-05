import { render, screen } from '@testing-library/react'
import MobileCheckin from './page'

describe('Mobile Checkin UI', () => {
  it('renders the title', () => {
    render(<MobileCheckin />)
    const heading = screen.getByText(/FEMAR Mobile Check-in/i)
    expect(heading).toBeInTheDocument()
  })
})
