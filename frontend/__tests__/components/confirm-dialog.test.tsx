import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ConfirmDialog open={false} title="Delete?" description="..." onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('calls onConfirm when confirmed with no typed-name requirement', () => {
    const onConfirm = jest.fn();
    render(<ConfirmDialog open title="Delete project?" description="..." onConfirm={onConfirm} onCancel={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('keeps the confirm button disabled until the required name is typed exactly', () => {
    const onConfirm = jest.fn();
    render(
      <ConfirmDialog
        open
        title="Delete project?"
        description="This cannot be undone."
        requireTypedName="my-project"
        confirmLabel="Delete Project"
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );

    const confirmButton = screen.getByRole('button', { name: 'Delete Project' });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('my-project'), { target: { value: 'wrong-name' } });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('my-project'), { target: { value: 'my-project' } });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = jest.fn();
    render(<ConfirmDialog open title="Delete?" description="..." onConfirm={jest.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
