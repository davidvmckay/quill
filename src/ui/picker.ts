import DropdownIcon from '../assets/icons/dropdown.svg';

let optionsCounter = 0;

class Picker {
  select: HTMLSelectElement;
  container: HTMLElement;
  label: HTMLElement;
  options: HTMLElement;
  private search = '';
  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor(select: HTMLSelectElement) {
    this.select = select;
    this.container = document.createElement('span');
    this.buildPicker();
    this.select.style.display = 'none';
    this.select.parentNode?.insertBefore(this.container, this.select);

    this.label.addEventListener('mousedown', (event) => {
      event.preventDefault();
      this.label.focus();
      this.togglePicker();
    });
    this.label.addEventListener('keydown', (event) => {
      if (this.select.disabled) return;
      switch (event.key) {
        case 'Enter':
        case ' ':
          this.togglePicker();
          if (this.isOpen())
            this.focusItem(this.selectedItem() || this.items()[0]);
          break;
        case 'ArrowDown':
        case 'ArrowUp':
        case 'Home':
        case 'End': {
          this.open();
          const items = this.items();
          this.focusItem(
            items[
              event.key === 'ArrowUp' || event.key === 'End'
                ? items.length - 1
                : 0
            ],
          );
          break;
        }
        case 'Escape':
          this.escape();
          break;
        case 'Tab':
          this.close();
          return;
        default:
          return;
      }
      event.preventDefault();
    });
    this.container.addEventListener('focusout', (event) => {
      if (!this.container.contains(event.relatedTarget as Node | null))
        this.close();
    });
    this.select.addEventListener('change', this.update.bind(this));
  }

  private isOpen() {
    return this.container.classList.contains('ql-expanded');
  }

  private items() {
    return Array.from(
      this.options.querySelectorAll<HTMLElement>(
        '.ql-picker-item:not([aria-disabled="true"])',
      ),
    );
  }

  private selectedItem() {
    return this.options.querySelector<HTMLElement>(
      '.ql-selected:not([aria-disabled="true"])',
    );
  }

  private focusItem(item?: HTMLElement | null) {
    this.items().forEach((option) => {
      option.tabIndex = option === item ? 0 : -1;
    });
    item?.focus();
  }

  private open() {
    if (this.select.disabled) return;
    this.container.classList.add('ql-expanded');
    this.label.setAttribute('aria-expanded', 'true');
    this.options.setAttribute('aria-hidden', 'false');
  }

  togglePicker() {
    if (this.isOpen()) this.close();
    else this.open();
  }

  private name() {
    const labelledBy = this.select.getAttribute('aria-labelledby');
    const labelledText = labelledBy
      ?.split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent || '')
      .join(' ')
      .trim();
    const nativeLabel = Array.from(
      this.select.labels || [],
      (label) => label.textContent || '',
    )
      .join(' ')
      .trim();
    return (
      labelledText ||
      this.select.getAttribute('aria-label') ||
      nativeLabel ||
      Array.from(this.select.classList)
        .find((name) => name.startsWith('ql-'))
        ?.slice(3) ||
      'Formatting'
    );
  }

  private optionName(option: HTMLOptionElement) {
    const explicit =
      option.getAttribute('aria-label') || option.textContent?.trim();
    if (explicit) return explicit;
    const value = option.value;
    if (this.select.classList.contains('ql-header'))
      return value ? `Heading ${value}` : 'Normal text';
    if (this.select.classList.contains('ql-align')) return value || 'Left';
    if (this.select.classList.contains('ql-size')) return value || 'Normal';
    if (this.select.classList.contains('ql-font'))
      return value || 'Default font';
    return value || 'Default';
  }

  buildItem(option: HTMLOptionElement) {
    const item = document.createElement('span');
    item.tabIndex = -1;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', 'false');
    item.setAttribute('aria-label', this.optionName(option));
    if (option.disabled) item.setAttribute('aria-disabled', 'true');
    item.classList.add('ql-picker-item');
    const value = option.getAttribute('value');
    if (value) item.setAttribute('data-value', value);
    if (option.textContent) item.setAttribute('data-label', option.textContent);
    item.addEventListener('click', () => {
      if (!option.disabled && !this.select.disabled)
        this.selectItem(item, true);
    });
    item.addEventListener('keydown', (event) => {
      const items = this.items();
      const index = items.indexOf(item);
      switch (event.key) {
        case 'Enter':
        case ' ':
          if (!option.disabled && !this.select.disabled)
            this.selectItem(item, true);
          this.label.focus();
          break;
        case 'ArrowDown':
          this.focusItem(items[Math.min(index + 1, items.length - 1)]);
          break;
        case 'ArrowUp':
          this.focusItem(items[Math.max(index - 1, 0)]);
          break;
        case 'Home':
          this.focusItem(items[0]);
          break;
        case 'End':
          this.focusItem(items[items.length - 1]);
          break;
        case 'Escape':
          this.escape();
          break;
        case 'Tab':
          this.close();
          return;
        default: {
          if (
            event.key.length !== 1 ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey
          )
            return;
          clearTimeout(this.searchTimer);
          this.search += event.key.toLowerCase();
          const ordered = [
            ...items.slice(index + 1),
            ...items.slice(0, index + 1),
          ];
          this.focusItem(
            ordered.find((candidate) =>
              candidate
                .getAttribute('aria-label')
                ?.toLowerCase()
                .startsWith(this.search),
            ) || item,
          );
          this.searchTimer = setTimeout(() => {
            this.search = '';
          }, 500);
        }
      }
      event.preventDefault();
    });
    return item;
  }

  buildLabel() {
    const label = document.createElement('span');
    label.classList.add('ql-picker-label');
    label.innerHTML = DropdownIcon;
    label.tabIndex = this.select.disabled ? -1 : 0;
    label.setAttribute('role', 'button');
    label.setAttribute('aria-haspopup', 'listbox');
    label.setAttribute('aria-expanded', 'false');
    label.setAttribute('aria-label', this.name());
    const description = this.select.getAttribute('aria-describedby');
    if (description) label.setAttribute('aria-describedby', description);
    if (this.select.disabled) label.setAttribute('aria-disabled', 'true');
    this.container.appendChild(label);
    return label;
  }

  buildOptions() {
    this.options = document.createElement('span');
    this.options.classList.add('ql-picker-options');
    this.options.setAttribute('role', 'listbox');
    this.options.setAttribute('aria-label', this.name());
    this.options.setAttribute('aria-hidden', 'true');
    this.options.id = `ql-picker-options-${optionsCounter}`;
    optionsCounter += 1;
    this.label.setAttribute('aria-controls', this.options.id);
    this.container.appendChild(this.options);
    Array.from(this.select.options).forEach((option) => {
      const item = this.buildItem(option);
      this.options.appendChild(item);
      if (option.selected) this.selectItem(item);
    });
  }

  buildPicker() {
    Array.from(this.select.attributes).forEach((item) => {
      // Keep the native select's id unique and apply naming to the interactive trigger.
      if (
        ![
          'id',
          'role',
          'aria-label',
          'aria-labelledby',
          'aria-describedby',
        ].includes(item.name)
      )
        this.container.setAttribute(item.name, item.value);
    });
    this.container.classList.add('ql-picker');
    this.label = this.buildLabel();
    this.buildOptions();
  }

  escape() {
    this.close();
    this.label.focus();
  }

  close() {
    this.container.classList.remove('ql-expanded');
    this.label.setAttribute('aria-expanded', 'false');
    this.options.setAttribute('aria-hidden', 'true');
    this.items().forEach((item) => {
      item.tabIndex = -1;
    });
    clearTimeout(this.searchTimer);
    this.search = '';
  }

  selectItem(item: HTMLElement | null, trigger = false) {
    const selected = this.options.querySelector<HTMLElement>('.ql-selected');
    const changed = selected !== item;
    selected?.classList.remove('ql-selected');
    selected?.setAttribute('aria-selected', 'false');
    item?.classList.add('ql-selected');
    item?.setAttribute('aria-selected', 'true');
    this.select.selectedIndex = item
      ? Array.from(this.options.children).indexOf(item)
      : -1;
    for (const attribute of ['data-value', 'data-label']) {
      const value = item?.getAttribute(attribute);
      if (value != null) this.label.setAttribute(attribute, value);
      else this.label.removeAttribute(attribute);
    }
    const selectedName = item?.getAttribute('aria-label');
    this.label.setAttribute(
      'aria-label',
      selectedName ? `${this.name()}: ${selectedName}` : this.name(),
    );
    if (trigger) {
      if (changed) this.select.dispatchEvent(new Event('change'));
      this.close();
    }
  }

  update() {
    const item = this.options.children[this.select.selectedIndex] as
      | HTMLElement
      | undefined;
    this.selectItem(item || null);
    const option = this.select.options[this.select.selectedIndex];
    this.label.classList.toggle(
      'ql-active',
      option != null &&
        option !== this.select.querySelector('option[selected]'),
    );
  }
}

export default Picker;
