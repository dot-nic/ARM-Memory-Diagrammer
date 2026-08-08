import { DiagramState } from '../models/DiagramState';
import { MemoryComponent, DecoderComponent, Pin } from '../models/types';

export class PropertiesPanel {
  private state: DiagramState;
  private panelEl: HTMLElement;
  private contentEl: HTMLElement;
  private currentSelection: string[] = [];

  constructor(state: DiagramState) {
    this.state = state;
    
    this.panelEl = document.getElementById('properties-sidebar')!;
    this.contentEl = document.getElementById('properties-content')!;
    
    this.state.subscribe(this.onStateChange.bind(this));
  }

  private onStateChange() {
    const selectedComponentIds = this.state.getSelectedComponentIds();
    const selectedConnectionIds = this.state.getSelectedConnectionIds();
    
    const allSelected = [...selectedComponentIds, ...selectedConnectionIds];
    
    const changed = this.currentSelection.length !== allSelected.length || 
                    !this.currentSelection.every((id, i) => id === allSelected[i]);
                    
    if (changed) {
      this.currentSelection = [...allSelected];
      this.render();
    }
  }

  private render() {
    if (this.currentSelection.length === 0) {
      this.panelEl.classList.add('hidden');
      return;
    }

    const selectedConnections = this.state.getConnections().filter(c => this.currentSelection.includes(c.id));
    const selectedComponents = this.state.getComponents().filter(c => this.currentSelection.includes(c.id));
    
    if (selectedConnections.length === 0 && selectedComponents.length === 0) {
      this.panelEl.classList.add('hidden');
      return;
    }

    this.panelEl.classList.remove('hidden');
    this.contentEl.innerHTML = ''; // Clear previous content

    const selectedMemories = selectedComponents.filter(c => c.type === 'memory') as MemoryComponent[];
    const selectedDecoders = selectedComponents.filter(c => c.type === 'decoder') as DecoderComponent[];
    const selectedSources = selectedComponents.filter(c => c.type === 'source');

    if (selectedComponents.length > 0) {
      this.renderComponentGeneralProps(selectedComponents);
    }
    
    if (selectedConnections.length > 0) {
      this.renderConnectionProps(selectedConnections);
    }
    if (selectedMemories.length > 0) {
      this.renderMemoryProps(selectedMemories);
    }
    if (selectedDecoders.length > 0) {
      this.renderDecoderProps(selectedDecoders);
    }
    if (selectedSources.length > 0) {
      this.renderSourceProps(selectedSources);
    }
    
    if (selectedComponents.length > 0) {
      this.renderControlPins(selectedComponents);
    }
  }

  private customColor: string | null = localStorage.getItem('arm_diagram_custom_color') || null;

  private readonly PRESET_COLORS = [
    '#3b82f6', // Azul
    '#ef4444', // Rojo
    '#10b981', // Verde
    '#eab308', // Amarillo
    '#a855f7', // Púrpura
    '#f97316', // Naranja
    '#06b6d4', // Cían
    '#f8fafc'  // Blanco / Claro
  ];

  private renderColorPicker(title: string, currentColor: string, onChange: (color: string) => void): HTMLElement {
    const colorGroup = document.createElement('div');
    colorGroup.className = 'prop-group';

    // Auto-populate custom color
    if (currentColor && !this.PRESET_COLORS.includes(currentColor) && !this.customColor) {
      this.customColor = currentColor;
    }

    const presetsHtml = this.PRESET_COLORS.map(color => {
      const isActive = currentColor === color.toLowerCase();
      return `<button type="button" class="color-swatch ${isActive ? 'active' : ''}" data-color="${color}" style="background-color: ${color};" title="Color predeterminado (${color})"></button>`;
    }).join('');

    let customSwatchHtml = '';
    if (this.customColor) {
      const isCustomActive = currentColor === this.customColor.toLowerCase();
      customSwatchHtml = `
        <div class="custom-swatch-divider"></div>
        <button type="button" class="color-swatch custom-saved-swatch ${isCustomActive ? 'active' : ''}" data-color="${this.customColor}" style="background-color: ${this.customColor};" title="Color personalizado guardado (${this.customColor})"></button>
      `;
    }

    const inputId = 'prop-custom-input-' + Math.random().toString(36).substr(2, 9);
    
    colorGroup.innerHTML = `
      <label>${title}</label>
      <div class="color-picker-container">
        <div class="color-swatches-grid">
          ${presetsHtml}
          ${customSwatchHtml}
          <button type="button" class="color-swatch custom-picker-btn btn-open-picker" title="Elegir nuevo color personalizado">
            <span class="picker-plus">+</span>
          </button>
          <input type="color" id="${inputId}" class="hidden-color-input" value="${this.customColor || currentColor || '#3b82f6'}" />
        </div>
      </div>
    `;

    const customInput = colorGroup.querySelector(`#${inputId}`) as HTMLInputElement;
    const openPickerBtn = colorGroup.querySelector('.btn-open-picker') as HTMLButtonElement;

    const swatches = colorGroup.querySelectorAll('.color-swatch[data-color]');
    swatches.forEach(swatch => {
      swatch.addEventListener('click', (e) => {
        const btn = e.currentTarget as HTMLButtonElement;
        const color = btn.dataset.color;
        if (color) onChange(color);
      });
    });

    openPickerBtn.addEventListener('click', () => {
      customInput.click();
    });

    customInput.addEventListener('change', () => {
      const newCustomColor = customInput.value;
      this.customColor = newCustomColor;
      localStorage.setItem('arm_diagram_custom_color', newCustomColor);
      onChange(newCustomColor);
    });

    return colorGroup;
  }

  private renderComponentGeneralProps(comps: any[]) {
    this.addSectionTitle(`Componentes (${comps.length})`);
    
    const first = comps[0];
    const sameColor = comps.every(c => c.color === first.color) ? (first.color || '') : '';
    const colorPicker = this.renderColorPicker('Color de Borde', sameColor, (color) => {
      comps.forEach((c, idx) => {
        this.state.updateComponentBaseProps(c.id, undefined, undefined, color, idx < comps.length - 1);
      });
      this.state.commit();
    });
    this.contentEl.appendChild(colorPicker);
    
    this.addSeparator();
  }

  private addSectionTitle(title: string) {
    const sectionTitle = document.createElement('h3');
    sectionTitle.style.fontSize = '0.85rem';
    sectionTitle.style.textTransform = 'uppercase';
    sectionTitle.style.letterSpacing = '0.05em';
    sectionTitle.style.marginBottom = '16px';
    sectionTitle.style.color = 'var(--text-secondary)';
    sectionTitle.textContent = title;
    this.contentEl.appendChild(sectionTitle);
  }

  private addSeparator() {
    const sep = document.createElement('hr');
    sep.style.borderColor = 'var(--border-color)';
    sep.style.margin = '20px 0';
    this.contentEl.appendChild(sep);
  }

  private renderConnectionProps(conns: any[]) {
    this.addSectionTitle(`Buses Seleccionados (${conns.length})`);

    const first = conns[0];
    const sameLabel = conns.every(c => c.label === first.label) ? (first.label || '') : '';
    const sameWidth = conns.every(c => c.busWidth === first.busWidth) ? (first.busWidth || '') : '';
    const sameColor = conns.every(c => (c.color || '#3b82f6').toLowerCase() === (first.color || '#3b82f6').toLowerCase()) ? (first.color || '#3b82f6').toLowerCase() : '';

    const group = document.createElement('div');
    group.className = 'prop-group';
    group.innerHTML = `
      <label>Etiqueta (Bus)</label>
      <input type="text" id="prop-conn-label" class="prop-input" value="${sameLabel}" placeholder="${sameLabel === '' && conns.length > 1 ? '(Varios)' : 'Ej. D[0..15]'}" />
    `;
    this.contentEl.appendChild(group);

    const widthGroup = document.createElement('div');
    widthGroup.className = 'prop-group';
    widthGroup.innerHTML = `
      <label>Ancho (bits)</label>
      <input type="number" id="prop-conn-width" class="prop-input" value="${sameWidth}" min="1" placeholder="${sameWidth === '' && conns.length > 1 ? '(Varios)' : 'Ej. 16'}" />
    `;
    this.contentEl.appendChild(widthGroup);

    const labelInput = group.querySelector('#prop-conn-label') as HTMLInputElement;
    const widthInput = widthGroup.querySelector('#prop-conn-width') as HTMLInputElement;

    labelInput.addEventListener('change', () => {
      // If we change label, it overwrites all
      conns.forEach((c, idx) => {
        this.state.updateConnectionProps(c.id, labelInput.value, c.busWidth, c.color, idx < conns.length - 1);
      });
      this.state.commit();
    });
    
    widthInput.addEventListener('change', () => {
      const widthVal = parseInt(widthInput.value, 10);
      conns.forEach((c, idx) => {
        this.state.updateConnectionProps(c.id, c.label, isNaN(widthVal) ? undefined : widthVal, c.color, idx < conns.length - 1);
      });
      this.state.commit();
    });

    const colorPicker = this.renderColorPicker('Color del Bus', sameColor || '#3b82f6', (color) => {
      conns.forEach((c, idx) => {
        this.state.updateConnectionProps(c.id, c.label, c.busWidth, color, idx < conns.length - 1);
      });
      this.state.commit();
    });
    this.contentEl.appendChild(colorPicker);
    
    this.addSeparator();
  }

  private renderSourceProps(comps: any[]) {
    this.addSectionTitle(`Fuentes Seleccionadas (${comps.length})`);
    
    const first = comps[0];
    const sameTitle = comps.every(c => c.title === first.title) ? first.title : '';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'prop-group';
    titleGroup.innerHTML = `
      <label>Nombre del Bus</label>
      <input type="text" class="prop-input title-input" value="${sameTitle}" placeholder="${sameTitle === '' ? '(Varios)' : 'Ej. A, B'}" />
    `;
    this.contentEl.appendChild(titleGroup);

    const titleInput = titleGroup.querySelector('.title-input') as HTMLInputElement;

    titleInput.addEventListener('change', () => {
      comps.forEach((c, idx) => {
        this.state.updateSourceProps(c.id, titleInput.value || 'A', idx < comps.length - 1);
      });
      this.state.commit();
    });
    
    this.addSeparator();
  }

  private renderMemoryProps(comps: MemoryComponent[]) {
    this.addSectionTitle(`Memorias Seleccionadas (${comps.length})`);
    
    const first = comps[0];
    const sameWords = comps.every(c => c.wordsStr === first.wordsStr) ? first.wordsStr : '';
    const sameBits = comps.every(c => c.bits === first.bits) ? first.bits : '';

    const wordsGroup = document.createElement('div');
    wordsGroup.className = 'prop-group';
    wordsGroup.innerHTML = `
      <label>Words (ej. 1K, 2M)</label>
      <input type="text" class="prop-input mem-words" value="${sameWords}" placeholder="${sameWords === '' ? 'Varios' : ''}" />
    `;
    this.contentEl.appendChild(wordsGroup);

    const bitsGroup = document.createElement('div');
    bitsGroup.className = 'prop-group';
    bitsGroup.innerHTML = `
      <label>Ancho de Bus (Bits)</label>
      <input type="number" class="prop-input mem-bits" value="${sameBits}" placeholder="${sameBits === '' ? 'Varios' : ''}" />
    `;
    this.contentEl.appendChild(bitsGroup);

    const wordsInput = wordsGroup.querySelector('.mem-words') as HTMLInputElement;
    const bitsInput = bitsGroup.querySelector('.mem-bits') as HTMLInputElement;

    const update = () => {
      comps.forEach((c, idx) => {
        const words = wordsInput.value !== '' ? wordsInput.value : c.wordsStr;
        const bits = isNaN(parseInt(bitsInput.value, 10)) ? c.bits : parseInt(bitsInput.value, 10);
        this.state.updateMemoryProps(c.id, words, bits, idx < comps.length - 1);
      });
      this.state.commit();
    };

    wordsInput.addEventListener('change', update);
    bitsInput.addEventListener('change', update);
    
    this.addSeparator();
  }

  private renderDecoderProps(comps: DecoderComponent[]) {
    this.addSectionTitle(`Decodificadores Seleccionados (${comps.length})`);
    
    const first = comps[0];
    const sameInputs = comps.every(c => c.inputs === first.inputs) ? first.inputs : '';
    const sameOutputs = comps.every(c => c.outputs === first.outputs) ? first.outputs : '';

    const inputsGroup = document.createElement('div');
    inputsGroup.className = 'prop-group';
    inputsGroup.innerHTML = `
      <label>Entradas (Inputs)</label>
      <input type="number" class="prop-input dec-inputs" value="${sameInputs}" placeholder="${sameInputs === '' ? 'Varios' : ''}" min="1" max="10" />
    `;
    this.contentEl.appendChild(inputsGroup);

    const outputsGroup = document.createElement('div');
    outputsGroup.className = 'prop-group';
    outputsGroup.innerHTML = `
      <label>Salidas (Outputs)</label>
      <input type="number" class="prop-input dec-outputs" value="${sameOutputs}" placeholder="${sameOutputs === '' ? 'Varios' : ''}" min="1" max="1024" />
    `;
    this.contentEl.appendChild(outputsGroup);

    const inputsInput = inputsGroup.querySelector('.dec-inputs') as HTMLInputElement;
    const outputsInput = outputsGroup.querySelector('.dec-outputs') as HTMLInputElement;

    const update = () => {
      comps.forEach((c, idx) => {
        const inputs = isNaN(parseInt(inputsInput.value, 10)) ? c.inputs : parseInt(inputsInput.value, 10);
        const outputs = isNaN(parseInt(outputsInput.value, 10)) ? c.outputs : parseInt(outputsInput.value, 10);
        this.state.updateDecoderProps(c.id, inputs, outputs, idx < comps.length - 1);
      });
      this.state.commit();
    };

    inputsInput.addEventListener('change', update);
    outputsInput.addEventListener('change', update);
    
    this.addSeparator();
  }

  private renderControlPins(comps: any[]) {
    // Gather all unique control pin names across all selected components
    const allControlPins = new Map<string, { activeLow: boolean, mixed: boolean }>();
    
    comps.forEach(c => {
      const controlPins = c.pins.filter((p: Pin) => p.type === 'control');
      controlPins.forEach((p: Pin) => {
        if (!allControlPins.has(p.name)) {
          allControlPins.set(p.name, { activeLow: p.activeLow, mixed: false });
        } else {
          const existing = allControlPins.get(p.name)!;
          if (existing.activeLow !== p.activeLow) {
            existing.mixed = true;
          }
        }
      });
    });

    if (allControlPins.size === 0) return;

    this.addSectionTitle('Lógica de Control (Burbujas)');

    const group = document.createElement('div');
    group.className = 'prop-group';

    allControlPins.forEach((state, pinName) => {
      // Create a unique id that doesn't conflict
      const safeId = 'toggle-' + pinName.replace(/\W/g, '') + '-' + Math.random().toString(36).substr(2,5);
      const row = document.createElement('div');
      row.className = 'toggle-row';
      
      // If mixed, show indeterminate? Just show false.
      const isChecked = !state.mixed && state.activeLow;
      
      row.innerHTML = `
        <span class="toggle-label">${pinName} ${state.mixed ? '(Mixto)' : '(Active Low)'}</span>
        <label class="toggle-switch">
          <input type="checkbox" id="${safeId}" ${isChecked ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      `;
      group.appendChild(row);

      // Add listener to the document fragment before appending? No, append first.
    });

    this.contentEl.appendChild(group);

    allControlPins.forEach((_state, pinName) => {
      const safeId = Array.from(group.querySelectorAll('input[type="checkbox"]'))
        .find(input => input.closest('.toggle-row')?.textContent?.includes(pinName))?.id;
        
      if (safeId) {
        const checkbox = document.getElementById(safeId) as HTMLInputElement;
        checkbox.addEventListener('change', () => {
          comps.forEach((c, idx) => {
            this.state.setComponentPinActiveLowByName(c.id, pinName, checkbox.checked, idx < comps.length - 1);
          });
          this.state.commit();
        });
      }
    });
  }
}
