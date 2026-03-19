import { render } from '@testing-library/react';
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
    const view = render(
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

    expect(view.getByLabelText('Suggested responses')).toBeInTheDocument();
    expect(view.getByText('Possible thoughts')).toBeInTheDocument();
    const thoughtButton = view.getByRole('button', { name: /Ask Lyra about the distortion/i });
    expect(thoughtButton).toBeInTheDocument();
    thoughtButton.click();
    expect(view.getByRole('textbox', { name: 'Message input' })).toBeInTheDocument();
  });

  it('shows expanded detail when a suggestion is selected', () => {
    const onSelect = vi.fn();
    const view = render(
      <CampaignResponseSuggestions
        suggestions={suggestions}
        selectedSuggestion={suggestions[0]}
        onSelect={onSelect}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(view.getByText(/A careful, in-character question/i)).toBeInTheDocument();
    expect(view.getByText(/Lyra, can you tell if this is some kind of space-time distortion/i)).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('confirms through the normal send callback only when explicitly asked', () => {
    const onConfirm = vi.fn();
    const view = render(
      <CampaignResponseSuggestions
        suggestions={suggestions}
        selectedSuggestion={suggestions[1]}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    view.getByRole('button', { name: /Send thought/i }).click();
    expect(onConfirm).toHaveBeenCalledWith(suggestions[1]);
  });

  it('cancel backs out without sending', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const view = render(
      <CampaignResponseSuggestions
        suggestions={suggestions}
        selectedSuggestion={suggestions[0]}
        onSelect={vi.fn()}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    view.getByRole('button', { name: /Back/i }).click();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});