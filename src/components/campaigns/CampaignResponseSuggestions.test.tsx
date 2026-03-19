import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CampaignResponseSuggestions from './CampaignResponseSuggestions';
import type { CampaignResponseSuggestion } from '@/lib/campaign-response-suggestions';

const suggestions: CampaignResponseSuggestion[] = [
  {
    id: 'question-1',
    label: 'Ask Lyra about the distortion',
    message: 'Lyra, can you tell if this is some kind of space-time distortion?',
    detail: 'A careful, in-character question that keeps the focus on understanding the anomaly first.',
    intent: 'question',
    confidence: 'high',
  },
  {
    id: 'action-1',
    label: 'Test the edge of the field',
    message: 'I extend one hand toward the edge of the shimmer and watch for a reaction.',
    detail: 'A measured action that probes the scene without escalating into combat.',
    intent: 'action',
    confidence: 'medium',
  },
];

describe('CampaignResponseSuggestions', () => {
  it('renders suggestion options in a lightweight thought-bubble panel', () => {
    render(
      <div>
        <CampaignResponseSuggestions
          suggestions={suggestions}
          selectedSuggestion={null}
          onSelect={vi.fn()}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />
        <textarea aria-label="Message input" />
      </div>,
    );

    expect(screen.getByLabelText('Suggested responses')).toBeInTheDocument();
    expect(screen.getByText('Possible thoughts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ask Lyra about the distortion/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Message input' })).toBeInTheDocument();
  });

  it('shows expanded detail when a suggestion is selected', () => {
    const onSelect = vi.fn();
    render(
      <CampaignResponseSuggestions
        suggestions={suggestions}
        selectedSuggestion={suggestions[0]}
        onSelect={onSelect}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText(/A careful, in-character question/i)).toBeInTheDocument();
    expect(screen.getByText(/Lyra, can you tell if this is some kind of space-time distortion/i)).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('confirms through the normal send callback only when explicitly asked', () => {
    const onConfirm = vi.fn();
    render(
      <CampaignResponseSuggestions
        suggestions={suggestions}
        selectedSuggestion={suggestions[1]}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Send thought/i }));
    expect(onConfirm).toHaveBeenCalledWith(suggestions[1]);
  });

  it('cancel backs out without sending', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <CampaignResponseSuggestions
        suggestions={suggestions}
        selectedSuggestion={suggestions[0]}
        onSelect={vi.fn()}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
