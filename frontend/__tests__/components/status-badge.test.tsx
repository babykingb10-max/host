import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/ui/status-badge';

describe('StatusBadge', () => {
  it('renders the human-readable label for RUNNING', () => {
    render(<StatusBadge status="RUNNING" />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('renders the human-readable label for FAILED', () => {
    render(<StatusBadge status="FAILED" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('always renders an icon alongside the text (never color-only)', () => {
    const { container } = render(<StatusBadge status="CRASHED" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('Crashed')).toBeInTheDocument();
  });
});
