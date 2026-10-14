import { describe, expect, test } from 'vitest';
import Picker from '../../../src/ui/picker.js';

describe('Picker', () => {
  const setup = () => {
    const container = document.body.appendChild(document.createElement('div'));
    container.innerHTML =
      '<select><option selected>0</option><option value="1">1</option></select>';
    const pickerSelectorInstance = new Picker(
      container.firstChild as HTMLSelectElement,
    );
    const pickerSelector = container.querySelector('.ql-picker') as HTMLElement;
    return { container, pickerSelectorInstance, pickerSelector };
  };

  test('initialization', () => {
    const { container } = setup();
    expect(container.querySelector('.ql-picker')).toBeTruthy();
    expect(container.querySelector('.ql-active')).toBeFalsy();
    expect(
      container.querySelector('.ql-picker-item.ql-selected')?.outerHTML,
    ).toEqualHTML(
      '<span tabindex="-1" role="option" aria-label="0" aria-selected="true" class="ql-picker-item ql-selected" data-label="0"></span>',
    );
    expect(
      container.querySelector('.ql-picker-item:not(.ql-selected)')?.outerHTML,
    ).toEqualHTML(
      '<span tabindex="-1" role="option" aria-label="1" aria-selected="false" class="ql-picker-item" data-value="1" data-label="1"></span>',
    );
  });

  test('escape charcters', () => {
    const { container } = setup();
    const select = document.createElement('select');
    const option = document.createElement('option');
    container.appendChild(select);
    select.appendChild(option);
    let value = '"Helvetica Neue", \'Helvetica\', sans-serif';
    option.value = value;
    value = value.replace(/"/g, '\\"');
    expect(select.querySelector(`option[value="${value}"]`)).toEqual(option);
  });

  test('exposes a named listbox and selected value', () => {
    const { pickerSelectorInstance: picker } = setup();
    expect(picker.label.getAttribute('aria-haspopup')).toBe('listbox');
    expect(picker.label.getAttribute('aria-label')).toBe('Formatting: 0');
    expect(picker.options.getAttribute('role')).toBe('listbox');
    expect(picker.options.getAttribute('aria-label')).toBe('Formatting');
  });

  test('arrow keys and Home/End move focus without selecting', () => {
    const { pickerSelectorInstance: picker } = setup();
    const key = (element: HTMLElement, value: string) => {
      const event = new KeyboardEvent('keydown', {
        key: value,
        cancelable: true,
      });
      element.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    };
    const [first, last] = Array.from(picker.options.children) as HTMLElement[];
    key(picker.label, 'ArrowDown');
    expect(document.activeElement).toBe(first);
    key(first, 'End');
    expect(document.activeElement).toBe(last);
    expect(picker.select.selectedIndex).toBe(0);
    key(last, 'ArrowUp');
    expect(document.activeElement).toBe(first);
    key(first, 'ArrowDown');
    key(last, 'Home');
    expect(document.activeElement).toBe(first);
    key(first, 'End');
    key(last, 'Enter');
    expect(picker.select.value).toBe('1');
    expect(last.getAttribute('aria-selected')).toBe('true');
    expect(first.getAttribute('aria-selected')).toBe('false');
    expect(picker.label.getAttribute('aria-label')).toBe('Formatting: 1');
    expect(document.activeElement).toBe(picker.label);
    expect(picker.label.getAttribute('aria-expanded')).toBe('false');
  });

  test('Space opens the menu and Escape restores focus', () => {
    const { pickerSelectorInstance: picker } = setup();
    picker.label.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', cancelable: true }),
    );
    expect(picker.label.getAttribute('aria-expanded')).toBe('true');
    const item = document.activeElement as HTMLElement;
    item.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }),
    );
    expect(document.activeElement).toBe(picker.label);
    expect(picker.label.getAttribute('aria-expanded')).toBe('false');
    expect(
      Array.from(picker.options.children).every(
        (option) => (option as HTMLElement).tabIndex === -1,
      ),
    ).toBe(true);
  });

  test('Tab closes the menu without preventing native focus traversal', () => {
    const { pickerSelectorInstance: picker } = setup();
    picker.label.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown' }),
    );
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      cancelable: true,
    });
    document.activeElement?.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(picker.label.getAttribute('aria-expanded')).toBe('false');
  });

  test('labels generated header options and preserves a native label', () => {
    const container = document.body.appendChild(document.createElement('div'));
    container.innerHTML =
      '<label for="heading">Choose heading</label><select id="heading" class="ql-header"><option selected></option><option value="1"></option><option value="2"></option></select>';
    const picker = new Picker(container.querySelector('select')!);
    expect(container.querySelectorAll('#heading')).toHaveLength(1);
    expect(picker.options.getAttribute('aria-label')).toBe('Choose heading');
    expect(
      Array.from(picker.options.children, (item) =>
        item.getAttribute('aria-label'),
      ),
    ).toEqual(['Normal text', 'Heading 1', 'Heading 2']);
  });

  test('keyboard navigation skips disabled options', () => {
    const container = document.body.appendChild(document.createElement('div'));
    container.innerHTML =
      '<select aria-label="Size"><option selected>Small</option><option disabled>Medium</option><option>Large</option></select>';
    const picker = new Picker(container.querySelector('select')!);
    picker.label.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown' }),
    );
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown' }),
    );
    expect(document.activeElement).toBe(picker.options.children[2]);
  });

  test('typeahead focuses a matching option', () => {
    const container = document.body.appendChild(document.createElement('div'));
    container.innerHTML =
      '<select><option selected>Small</option><option>Medium</option><option>Large</option></select>';
    const picker = new Picker(container.querySelector('select')!);
    picker.label.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown' }),
    );
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'l', cancelable: true }),
    );
    expect(document.activeElement).toBe(picker.options.children[2]);
  });

  test('label is initialized with the correct aria attributes', () => {
    const { pickerSelector } = setup();
    expect(
      pickerSelector
        .querySelector('.ql-picker-label')
        ?.getAttribute('aria-expanded'),
    ).toEqual('false');
    const optionsId = pickerSelector.querySelector('.ql-picker-options')?.id;
    expect(
      pickerSelector
        .querySelector('.ql-picker-label')
        ?.getAttribute('aria-controls'),
    ).toEqual(optionsId);
  });

  test('options container is initialized with the correct aria attributes', () => {
    const { pickerSelector } = setup();
    expect(
      pickerSelector
        .querySelector('.ql-picker-options')
        ?.getAttribute('aria-hidden'),
    ).toEqual('true');

    const ariaControlsLabel = pickerSelector
      .querySelector('.ql-picker-label')
      ?.getAttribute('aria-controls');
    expect(pickerSelector.querySelector('.ql-picker-options')?.id).toEqual(
      ariaControlsLabel,
    );
    expect(
      (pickerSelector.querySelector('.ql-picker-options') as HTMLSelectElement)
        .tabIndex,
    ).toEqual(-1);
  });

  test('aria attributes toggle correctly when the picker is opened via enter key', () => {
    const { pickerSelector } = setup();
    const pickerLabel = pickerSelector.querySelector('.ql-picker-label');
    pickerLabel?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(pickerLabel?.getAttribute('aria-expanded')).toEqual('true');
    expect(
      pickerSelector
        .querySelector('.ql-picker-options')
        ?.getAttribute('aria-hidden'),
    ).toEqual('false');
  });

  test('aria attributes toggle correctly when the picker is opened via mousedown', () => {
    const { pickerSelector } = setup();
    const pickerLabel = pickerSelector.querySelector('.ql-picker-label');
    pickerLabel?.dispatchEvent(
      new Event('mousedown', {
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(pickerLabel?.getAttribute('aria-expanded')).toEqual('true');
    expect(
      pickerSelector
        .querySelector('.ql-picker-options')
        ?.getAttribute('aria-hidden'),
    ).toEqual('false');
  });

  test('aria attributes toggle correctly when an item is selected via click', () => {
    const { pickerSelector } = setup();
    const pickerLabel = pickerSelector.querySelector(
      '.ql-picker-label',
    ) as HTMLElement;
    pickerLabel.click();

    const pickerItem = pickerSelector.querySelector(
      '.ql-picker-item',
    ) as HTMLElement;
    pickerItem.click();

    expect(pickerLabel.getAttribute('aria-expanded')).toEqual('false');
    expect(
      pickerSelector
        .querySelector('.ql-picker-options')
        ?.getAttribute('aria-hidden'),
    ).toEqual('true');
  });

  test('aria attributes toggle correctly when an item is selected via enter', () => {
    const { pickerSelector } = setup();
    const pickerLabel = pickerSelector.querySelector(
      '.ql-picker-label',
    ) as HTMLElement;
    pickerLabel.click();
    const pickerItem = pickerSelector.querySelector(
      '.ql-picker-item',
    ) as HTMLElement;
    pickerItem.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(pickerLabel?.getAttribute('aria-expanded')).toEqual('false');
    expect(
      pickerSelector
        .querySelector('.ql-picker-options')
        ?.getAttribute('aria-hidden'),
    ).toEqual('true');
  });

  test('aria attributes toggle correctly when the picker is closed via clicking on the label again', () => {
    const { pickerSelector } = setup();
    const pickerLabel = pickerSelector.querySelector(
      '.ql-picker-label',
    ) as HTMLElement;
    pickerLabel.click();
    pickerLabel.click();
    expect(pickerLabel.getAttribute('aria-expanded')).toEqual('false');
    expect(
      pickerSelector
        .querySelector('.ql-picker-options')
        ?.getAttribute('aria-hidden'),
    ).toEqual('true');
  });

  test('aria attributes toggle correctly when the picker is closed via escaping out of it', () => {
    const { pickerSelector } = setup();
    const pickerLabel = pickerSelector.querySelector(
      '.ql-picker-label',
    ) as HTMLElement;
    pickerLabel.click();
    pickerLabel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(pickerLabel.getAttribute('aria-expanded')).toEqual('false');
    expect(
      pickerSelector
        .querySelector('.ql-picker-options')
        ?.getAttribute('aria-hidden'),
    ).toEqual('true');
  });
});
