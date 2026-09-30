import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/Badge.jsx';

describe('StatusBadge', () => {
  it('shows a readable label and success tone for delivered', () => {
    render(<StatusBadge status="delivered" />);
    const el = screen.getByText('Delivered');
    expect(el.className).toContain('green');
  });
  it('uses red for failed and amber for refunded', () => {
    render(<><StatusBadge status="failed" /><StatusBadge status="refunded" /></>);
    expect(screen.getByText('Failed').className).toContain('red');
    expect(screen.getByText('Refunded').className).toContain('amber');
  });
  it('renders a dash for a missing status', () => {
    render(<StatusBadge status={undefined} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
